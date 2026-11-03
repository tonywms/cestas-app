import * as XLSX from "@e965/xlsx";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

function podeGerenciarClientes(
  usuario: Awaited<ReturnType<typeof getCurrentUserProfile>>,
) {
  if (!usuario) return false;

  return (
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo === "ADMINISTRADOR" ||
    usuario.perfilCodigo === "GESTOR"
  );
}

function formatarDataHora(valor: unknown) {
  if (!valor) return "";

  const data = new Date(String(valor));

  if (Number.isNaN(data.getTime())) {
    return String(valor);
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

export async function GET() {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    return Response.json(
      { message: "Sessão inválida." },
      { status: 401 },
    );
  }

  if (!podeGerenciarClientes(usuario)) {
    return Response.json(
      { message: "Você não possui permissão para exportar clientes." },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const clientes: Array<Record<string, unknown>> = [];
  const tamanhoPagina = 1000;

  for (let inicio = 0; ; inicio += tamanhoPagina) {
    const {
      data,
      error,
    } = await supabase
      .from("clientes")
      .select(`
        codigo,
        nome,
        cpf_cnpj,
        telefone,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        cep,
        ativo,
        created_at,
        updated_at
      `)
      .eq("empresa_id", usuario.empresa.id)
      .order("nome")
      .range(inicio, inicio + tamanhoPagina - 1);

    if (error) {
      console.error(
        "Erro ao exportar clientes:",
        error,
      );

      return Response.json(
        {
          message: "Não foi possível consultar os clientes para exportação.",
        },
        { status: 500 },
      );
    }

    clientes.push(...(data ?? []));

    if ((data ?? []).length < tamanhoPagina) break;
  }

  const linhas = clientes.map((cliente) => ({
    NOME: String(cliente.nome ?? ""),
    TELEFONE: String(cliente.telefone ?? ""),
    ENDERECO: String(cliente.logradouro ?? ""),
    NUMERO: String(cliente.numero ?? ""),
    BAIRRO: String(cliente.bairro ?? ""),
    CPF_CNPJ: String(cliente.cpf_cnpj ?? ""),
    COMPLEMENTO: String(cliente.complemento ?? ""),
    CIDADE: String(cliente.cidade ?? ""),
    UF: String(cliente.uf ?? ""),
    CEP: String(cliente.cep ?? ""),
    CODIGO_REFERENCIA: String(cliente.codigo ?? ""),
    ATIVO: cliente.ativo ? "SIM" : "NAO",
    CADASTRADO_EM: formatarDataHora(cliente.created_at),
    ATUALIZADO_EM: formatarDataHora(cliente.updated_at),
  }));

  const worksheet = XLSX.utils.json_to_sheet(linhas, {
    header: [
      "NOME",
      "TELEFONE",
      "ENDERECO",
      "NUMERO",
      "BAIRRO",
      "CPF_CNPJ",
      "COMPLEMENTO",
      "CIDADE",
      "UF",
      "CEP",
      "CODIGO_REFERENCIA",
      "ATIVO",
      "CADASTRADO_EM",
      "ATUALIZADO_EM",
    ],
  });

  worksheet["!cols"] = [
    { wch: 32 },
    { wch: 20 },
    { wch: 34 },
    { wch: 12 },
    { wch: 22 },
    { wch: 20 },
    { wch: 24 },
    { wch: 22 },
    { wch: 8 },
    { wch: 14 },
    { wch: 22 },
    { wch: 10 },
    { wch: 20 },
    { wch: 20 },
  ];

  worksheet["!autofilter"] = {
    ref: `A1:N${Math.max(1, linhas.length + 1)}`,
  };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "CLIENTES",
  );

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  });

  const bytes = new Uint8Array(buffer);
  const dataArquivo = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
  }).format(new Date());

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        `attachment; filename="clientes_cestas_app_${dataArquivo}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
