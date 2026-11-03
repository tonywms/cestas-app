import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  lerPlanilhaClientes,
  normalizarDocumento,
  type ClientePlanilha,
} from "@/lib/clientes/importacao-planilha";
import { createClient } from "@/lib/supabase/server";

type StatusLinha =
  | "NOVO"
  | "ATUALIZAR"
  | "SEM_ALTERACAO"
  | "REVISAR"
  | "ERRO";

type ClienteExistente = {
  id: number;
  codigo: string;
  nome: string;
  cpf_cnpj: string | null;
  telefone: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  ativo: boolean;
};

type LinhaAnalise = ClientePlanilha & {
  status: StatusLinha;
  mensagens: string[];
  clienteExistenteId: number | null;
  clienteExistenteNome: string | null;
  identificadoPor: string | null;
  alteracoes: string[];
};

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

function semAcento(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizarTexto(valor: string | null | undefined) {
  return semAcento(String(valor ?? ""))
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizarTelefone(valor: string | null | undefined) {
  let digitos = String(valor ?? "").replace(/\D/g, "");

  if (digitos.length > 11 && digitos.startsWith("55")) {
    digitos = digitos.slice(2);
  }

  return digitos;
}

function nomesCompativeis(a: string, b: string) {
  const nomeA = normalizarTexto(a);
  const nomeB = normalizarTexto(b);

  if (!nomeA || !nomeB) return false;
  if (nomeA === nomeB) return true;

  const tokensA = nomeA.split(" ").filter(Boolean);
  const tokensB = nomeB.split(" ").filter(Boolean);
  const menor = tokensA.length <= tokensB.length ? tokensA : tokensB;
  const maior = tokensA.length <= tokensB.length ? tokensB : tokensA;

  return menor.every((token) => maior.includes(token));
}

function valorExibicao(valor: unknown) {
  const texto = String(valor ?? "").trim();
  return texto || "—";
}

function diferencasCliente(
  existente: ClienteExistente,
  planilha: ClientePlanilha,
) {
  const alteracoes: string[] = [];

  const comparar = (
    label: string,
    anterior: unknown,
    novo: unknown,
    opcional = false,
  ) => {
    const anteriorTexto = String(anterior ?? "").trim();
    const novoTexto = String(novo ?? "").trim();

    if (opcional && !novoTexto) return;

    if (
      normalizarTexto(anteriorTexto) !==
      normalizarTexto(novoTexto)
    ) {
      alteracoes.push(
        `${label}: ${valorExibicao(anteriorTexto)} → ${valorExibicao(novoTexto)}`,
      );
    }
  };

  comparar("Nome", existente.nome, planilha.nome);
  comparar("Telefone", existente.telefone, planilha.telefone);
  comparar("Endereço", existente.logradouro, planilha.logradouro);
  comparar("Número", existente.numero, planilha.numero);
  comparar("Bairro", existente.bairro, planilha.bairro);
  comparar("Código referência", existente.codigo, planilha.codigo, true);
  comparar("CPF/CNPJ", existente.cpf_cnpj, planilha.cpf_cnpj, true);
  comparar("Complemento", existente.complemento, planilha.complemento, true);
  comparar("Cidade", existente.cidade, planilha.cidade, true);
  comparar("UF", existente.uf, planilha.uf, true);
  comparar("CEP", existente.cep, planilha.cep, true);

  if (existente.ativo !== planilha.ativo) {
    alteracoes.push(
      `Situação: ${existente.ativo ? "ATIVO" : "INATIVO"} → ${planilha.ativo ? "ATIVO" : "INATIVO"}`,
    );
  }

  return alteracoes;
}

async function carregarClientesExistentes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  empresaId: string,
) {
  const dados: ClienteExistente[] = [];
  const tamanhoPagina = 1000;

  for (let inicio = 0; ; inicio += tamanhoPagina) {
    const { data, error } = await supabase
      .from("clientes")
      .select(`
        id,
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
        ativo
      `)
      .eq("empresa_id", empresaId)
      .order("id")
      .range(inicio, inicio + tamanhoPagina - 1);

    if (error) {
      throw new Error(
        "Não foi possível consultar os clientes atuais da empresa.",
      );
    }

    dados.push(
      ...(data ?? []).map((item) => ({
        id: Number(item.id),
        codigo: String(item.codigo ?? ""),
        nome: String(item.nome ?? ""),
        cpf_cnpj:
          item.cpf_cnpj == null ? null : String(item.cpf_cnpj),
        telefone:
          item.telefone == null ? null : String(item.telefone),
        logradouro:
          item.logradouro == null ? null : String(item.logradouro),
        numero:
          item.numero == null ? null : String(item.numero),
        complemento:
          item.complemento == null ? null : String(item.complemento),
        bairro:
          item.bairro == null ? null : String(item.bairro),
        cidade:
          item.cidade == null ? null : String(item.cidade),
        uf: item.uf == null ? null : String(item.uf),
        cep: item.cep == null ? null : String(item.cep),
        ativo: Boolean(item.ativo),
      })),
    );

    if ((data ?? []).length < tamanhoPagina) break;
  }

  return dados;
}

function mapAdicionar<T>(map: Map<string, T[]>, chave: string, valor: T) {
  if (!chave) return;
  const atual = map.get(chave) ?? [];
  atual.push(valor);
  map.set(chave, atual);
}

async function analisar(arquivo: File, empresaId: string) {
  if (arquivo.size <= 0) {
    throw new Error("Selecione uma planilha Excel para continuar.");
  }

  if (arquivo.size > 10 * 1024 * 1024) {
    throw new Error(
      "O arquivo ultrapassa 10 MB. Divida a importação em arquivos menores.",
    );
  }

  const nomeArquivo = arquivo.name.toLocaleLowerCase("pt-BR");

  if (!nomeArquivo.endsWith(".xlsx")) {
    throw new Error(
      "Use uma planilha no formato .xlsx. Baixe o modelo oficial do Cestas APP.",
    );
  }

  const buffer = await arquivo.arrayBuffer();
  const planilha = await lerPlanilhaClientes(buffer);
  const supabase = await createClient();
  const existentes = await carregarClientesExistentes(supabase, empresaId);

  const porCodigo = new Map<string, ClienteExistente>();
  const porDocumento = new Map<string, ClienteExistente[]>();
  const porTelefone = new Map<string, ClienteExistente[]>();

  for (const item of existentes) {
    if (item.codigo) {
      porCodigo.set(item.codigo.toLocaleUpperCase("pt-BR"), item);
    }

    mapAdicionar(
      porDocumento,
      normalizarDocumento(item.cpf_cnpj ?? ""),
      item,
    );

    mapAdicionar(
      porTelefone,
      normalizarTelefone(item.telefone),
      item,
    );
  }

  const contagemCodigo = new Map<string, number>();
  const contagemDocumento = new Map<string, number>();
  const contagemTelefone = new Map<string, number>();

  for (const cliente of planilha.clientes) {
    const codigo = cliente.codigo.toLocaleUpperCase("pt-BR");
    const documento = normalizarDocumento(cliente.cpf_cnpj);
    const telefone = normalizarTelefone(cliente.telefone);

    if (codigo) {
      contagemCodigo.set(codigo, (contagemCodigo.get(codigo) ?? 0) + 1);
    }
    if (documento) {
      contagemDocumento.set(
        documento,
        (contagemDocumento.get(documento) ?? 0) + 1,
      );
    }
    if (telefone) {
      contagemTelefone.set(
        telefone,
        (contagemTelefone.get(telefone) ?? 0) + 1,
      );
    }
  }

  const errosEstruturaisPorLinha = new Map<number, string[]>();

  for (const erro of planilha.errosEstruturais) {
    const lista = errosEstruturaisPorLinha.get(erro.linha) ?? [];
    lista.push(erro.mensagem);
    errosEstruturaisPorLinha.set(erro.linha, lista);
  }

  const linhas: LinhaAnalise[] = planilha.clientes.map((cliente) => {
    const mensagens = [
      ...(errosEstruturaisPorLinha.get(cliente.linha) ?? []),
    ];

    let status: StatusLinha = "NOVO";
    let clienteExistente: ClienteExistente | null = null;
    let identificadoPor: string | null = null;

    if (cliente.nome.trim().length < 3) {
      mensagens.push(
        "NOME é obrigatório e deve possuir pelo menos 3 caracteres.",
      );
      status = "ERRO";
    }

    if (!cliente.telefone.trim()) {
      mensagens.push("TELEFONE é obrigatório.");
      status = "ERRO";
    }

    if (!cliente.logradouro.trim()) {
      mensagens.push("ENDEREÇO é obrigatório.");
      status = "ERRO";
    }

    if (!cliente.numero.trim()) {
      mensagens.push("NÚMERO é obrigatório.");
      status = "ERRO";
    }

    if (!cliente.bairro.trim()) {
      mensagens.push("BAIRRO é obrigatório.");
      status = "ERRO";
    }

    if (cliente.uf && cliente.uf.length !== 2) {
      mensagens.push("UF deve possuir 2 letras, por exemplo CE.");
      status = "ERRO";
    }

    const codigo = cliente.codigo.toLocaleUpperCase("pt-BR");
    const documento = normalizarDocumento(cliente.cpf_cnpj);
    const telefone = normalizarTelefone(cliente.telefone);

    if (codigo && (contagemCodigo.get(codigo) ?? 0) > 1) {
      mensagens.push(
        "CÓDIGO_REFERÊNCIA aparece mais de uma vez nesta planilha.",
      );
      status = "ERRO";
    }

    if (documento && (contagemDocumento.get(documento) ?? 0) > 1) {
      mensagens.push("CPF/CNPJ aparece mais de uma vez nesta planilha.");
      status = "ERRO";
    }

    if (telefone && (contagemTelefone.get(telefone) ?? 0) > 1) {
      mensagens.push(
        "TELEFONE aparece mais de uma vez nesta planilha. Corrija antes de importar para evitar duplicidade.",
      );
      status = "ERRO";
    }

    if (status === "ERRO") {
      return {
        ...cliente,
        status,
        mensagens,
        clienteExistenteId: null,
        clienteExistenteNome: null,
        identificadoPor: null,
        alteracoes: [],
      };
    }

    const candidatoCodigo = codigo ? porCodigo.get(codigo) ?? null : null;
    const candidatosDocumento = documento
      ? porDocumento.get(documento) ?? []
      : [];
    const candidatosTelefone = telefone
      ? porTelefone.get(telefone) ?? []
      : [];

    const idsFortes = new Set<number>();

    if (candidatoCodigo) idsFortes.add(candidatoCodigo.id);
    for (const item of candidatosDocumento) idsFortes.add(item.id);

    if (idsFortes.size > 1) {
      mensagens.push(
        "REVISAR: o código de referência e o CPF/CNPJ apontam para clientes diferentes no sistema. Nenhuma alteração será feita.",
      );
      status = "REVISAR";
    } else if (idsFortes.size === 1) {
      const id = Array.from(idsFortes)[0];
      clienteExistente = existentes.find((item) => item.id === id) ?? null;
      identificadoPor = candidatoCodigo
        ? candidatosDocumento.length > 0
          ? "CÓDIGO_REFERÊNCIA + CPF/CNPJ"
          : "CÓDIGO_REFERÊNCIA"
        : "CPF/CNPJ";

      if (
        clienteExistente &&
        candidatosTelefone.length > 0 &&
        !candidatosTelefone.some((item) => item.id === clienteExistente?.id)
      ) {
        mensagens.push(
          "REVISAR: o telefone informado pertence a outro cliente no sistema. Nenhuma atualização será feita automaticamente.",
        );
        status = "REVISAR";
      }
    } else if (candidatosDocumento.length > 1) {
      mensagens.push(
        "REVISAR: este CPF/CNPJ está associado a mais de um cadastro. Corrija os cadastros existentes antes de importar.",
      );
      status = "REVISAR";
    } else if (candidatosTelefone.length === 1) {
      const candidato = candidatosTelefone[0];

      if (nomesCompativeis(candidato.nome, cliente.nome)) {
        clienteExistente = candidato;
        identificadoPor = "TELEFONE + NOME COMPATÍVEL";
      } else {
        mensagens.push(
          `REVISAR: o telefone ${cliente.telefone} já pertence a ${candidato.nome}, mas o nome da planilha é ${cliente.nome}. O sistema não vai criar nem atualizar automaticamente.`,
        );
        status = "REVISAR";
      }
    } else if (candidatosTelefone.length > 1) {
      mensagens.push(
        `REVISAR: o telefone ${cliente.telefone} está associado a mais de um cliente. Nenhuma alteração será feita automaticamente.`,
      );
      status = "REVISAR";
    }

    if (status === "REVISAR") {
      return {
        ...cliente,
        status,
        mensagens,
        clienteExistenteId: clienteExistente?.id ?? null,
        clienteExistenteNome: clienteExistente?.nome ?? null,
        identificadoPor,
        alteracoes: [],
      };
    }

    if (!clienteExistente) {
      mensagens.push(
        "NOVO: nenhum cliente compatível foi encontrado nesta empresa.",
      );

      return {
        ...cliente,
        status: "NOVO",
        mensagens,
        clienteExistenteId: null,
        clienteExistenteNome: null,
        identificadoPor: null,
        alteracoes: [],
      };
    }

    const alteracoes = diferencasCliente(clienteExistente, cliente);

    if (alteracoes.length === 0) {
      mensagens.push(
        `SEM ALTERAÇÃO: cliente ${clienteExistente.nome} já existe e os dados enviados estão iguais. Identificado por ${identificadoPor}.`,
      );
      status = "SEM_ALTERACAO";
    } else {
      mensagens.push(
        `ATUALIZAÇÃO DETECTADA: cliente ${clienteExistente.nome} já existe. Identificado por ${identificadoPor}.`,
      );
      mensagens.push(`Mudanças: ${alteracoes.join(" | ")}`);
      status = "ATUALIZAR";
    }

    return {
      ...cliente,
      status,
      mensagens,
      clienteExistenteId: clienteExistente.id,
      clienteExistenteNome: clienteExistente.nome,
      identificadoPor,
      alteracoes,
    };
  });

  return {
    aba: planilha.aba,
    linhas,
    existentes,
    resumo: {
      total: linhas.length,
      novos: linhas.filter((item) => item.status === "NOVO").length,
      atualizar: linhas.filter((item) => item.status === "ATUALIZAR").length,
      semAlteracao: linhas.filter(
        (item) => item.status === "SEM_ALTERACAO",
      ).length,
      revisar: linhas.filter((item) => item.status === "REVISAR").length,
      erros: linhas.filter((item) => item.status === "ERRO").length,
    },
  };
}

function codigoAutomatico(usados: Set<string>, indice: number) {
  const agora = new Date();
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  })
    .format(agora)
    .replace(/-/g, "");

  let sequencia = indice;

  while (true) {
    const codigo = `CLI${partes}${String(sequencia).padStart(4, "0")}`;

    if (!usados.has(codigo)) {
      usados.add(codigo);
      return codigo;
    }

    sequencia += 1;
  }
}

export async function POST(request: NextRequest) {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    return NextResponse.json(
      {
        ok: false,
        message: "Sessão inválida. Entre novamente no sistema.",
      },
      { status: 401 },
    );
  }

  if (!podeGerenciarClientes(usuario)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Você não possui permissão para importar clientes.",
      },
      { status: 403 },
    );
  }

  try {
    const formData = await request.formData();
    const modo = String(formData.get("modo") ?? "analisar");
    const arquivo = formData.get("arquivo");

    if (!(arquivo instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Selecione uma planilha Excel para continuar.",
        },
        { status: 400 },
      );
    }

    const analise = await analisar(arquivo, usuario.empresa.id);

    if (modo !== "importar") {
      return NextResponse.json({
        ok: true,
        modo: "analise",
        arquivo: arquivo.name,
        aba: analise.aba,
        resumo: analise.resumo,
        linhas: analise.linhas.slice(0, 200),
        previewLimitado: analise.linhas.length > 200,
      });
    }

    const novos = analise.linhas.filter((item) => item.status === "NOVO");
    const atualizacoes = analise.linhas.filter(
      (item) => item.status === "ATUALIZAR",
    );

    if (novos.length + atualizacoes.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Não existem clientes novos nem atualizações seguras para gravar. Revise as linhas indicadas.",
          resumo: analise.resumo,
        },
        { status: 422 },
      );
    }

    const supabase = await createClient();
    const usados = new Set(
      analise.existentes.map((item) =>
        item.codigo.toLocaleUpperCase("pt-BR"),
      ),
    );

    const registrosNovos = novos.map((item, index) => ({
      empresa_id: usuario.empresa.id,
      codigo: item.codigo || codigoAutomatico(usados, index + 1),
      nome: item.nome.trim(),
      cpf_cnpj: item.cpf_cnpj || null,
      telefone: item.telefone,
      logradouro: item.logradouro,
      numero: item.numero,
      complemento: item.complemento || null,
      bairro: item.bairro,
      cidade: item.cidade || null,
      uf: item.uf || null,
      cep: item.cep || null,
      ativo: item.ativo,
      updated_at: new Date().toISOString(),
    }));

    let novosImportados = 0;
    let atualizados = 0;

    const falhas: Array<{
      codigo: string;
      nome: string;
      mensagem: string;
    }> = [];

    const tamanhoLote = 200;

    for (
      let inicio = 0;
      inicio < registrosNovos.length;
      inicio += tamanhoLote
    ) {
      const lote = registrosNovos.slice(inicio, inicio + tamanhoLote);
      const { error } = await supabase.from("clientes").insert(lote);

      if (!error) {
        novosImportados += lote.length;
        continue;
      }

      console.error(
        "Erro ao importar lote de clientes; tentando linha a linha:",
        error,
      );

      for (const registro of lote) {
        const { error: linhaError } = await supabase
          .from("clientes")
          .insert(registro);

        if (linhaError) {
          console.error("Erro ao importar cliente:", linhaError);
          falhas.push({
            codigo: registro.codigo,
            nome: registro.nome,
            mensagem:
              "Não foi possível gravar este cliente. Verifique duplicidade ou dados inválidos.",
          });
        } else {
          novosImportados += 1;
        }
      }
    }

    const auditoriasAtualizacao: Array<Record<string, unknown>> = [];

    for (const item of atualizacoes) {
      if (!item.clienteExistenteId) {
        falhas.push({
          codigo: item.codigo || "SEM-CODIGO",
          nome: item.nome,
          mensagem:
            "A atualização foi detectada, mas o cliente existente não pôde ser identificado com segurança.",
        });
        continue;
      }

      const novo: Record<string, string | boolean | null> = {
        nome: item.nome.trim(),
        telefone: item.telefone,
        logradouro: item.logradouro,
        numero: item.numero,
        bairro: item.bairro,
        ativo: item.ativo,
        updated_at: new Date().toISOString(),
      };

      if (item.codigo) novo.codigo = item.codigo;
      if (item.cpf_cnpj) novo.cpf_cnpj = item.cpf_cnpj;
      if (item.complemento) novo.complemento = item.complemento;
      if (item.cidade) novo.cidade = item.cidade;
      if (item.uf) novo.uf = item.uf;
      if (item.cep) novo.cep = item.cep;

      const { error: updateError } = await supabase
        .from("clientes")
        .update(novo)
        .eq("empresa_id", usuario.empresa.id)
        .eq("id", item.clienteExistenteId);

      if (updateError) {
        console.error("Erro ao atualizar cliente pela importação:", updateError);
        falhas.push({
          codigo: item.codigo || `ID-${item.clienteExistenteId}`,
          nome: item.nome,
          mensagem:
            "O sistema detectou a atualização, mas não conseguiu gravá-la.",
        });
        continue;
      }

      atualizados += 1;

      auditoriasAtualizacao.push({
        empresa_id: usuario.empresa.id,
        usuario_id: usuario.id,
        entidade: "CLIENTE",
        entidade_id: String(item.clienteExistenteId),
        acao: "CLIENTE_ATUALIZADO_IMPORTACAO_EXCEL",
        dados: {
          arquivo: arquivo.name,
          linha: item.linha,
          identificadoPor: item.identificadoPor,
          nomeAnterior: item.clienteExistenteNome,
          nomeNovo: item.nome,
          alteracoes: item.alteracoes,
        },
      });
    }

    if (auditoriasAtualizacao.length > 0) {
      const { error: auditoriaAtualizacaoError } = await supabase
        .from("auditoria_eventos")
        .insert(auditoriasAtualizacao);

      if (auditoriaAtualizacaoError) {
        console.error(
          "Erro ao registrar auditoria das atualizações importadas:",
          auditoriaAtualizacaoError,
        );
      }
    }

    const { error: auditoriaError } = await supabase
      .from("auditoria_eventos")
      .insert({
        empresa_id: usuario.empresa.id,
        usuario_id: usuario.id,
        entidade: "CLIENTE",
        entidade_id: null,
        acao: "CLIENTES_IMPORTADOS_EXCEL_INTELIGENTE",
        dados: {
          arquivo: arquivo.name,
          totalPlanilha: analise.resumo.total,
          novosDetectados: analise.resumo.novos,
          atualizacoesDetectadas: analise.resumo.atualizar,
          semAlteracao: analise.resumo.semAlteracao,
          revisar: analise.resumo.revisar,
          erros: analise.resumo.erros,
          novosImportados,
          atualizados,
          falhas: falhas.length,
        },
      });

    if (auditoriaError) {
      console.error(
        "Erro ao registrar auditoria da importação de clientes:",
        auditoriaError,
      );
    }

    revalidatePath("/admin/clientes");
    revalidatePath("/admin/rotas");
    revalidatePath("/mobile/rota");

    return NextResponse.json({
      ok: true,
      modo: "importacao",
      message:
        `${novosImportados} cliente(s) novo(s) importado(s) e ${atualizados} cliente(s) atualizado(s).`,
      novosImportados,
      atualizados,
      semAlteracao: analise.resumo.semAlteracao,
      revisar: analise.resumo.revisar,
      errosPlanilha: analise.resumo.erros,
      falhas: falhas.slice(0, 50),
    });
  } catch (error) {
    console.error("Erro na importação de clientes:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível processar a planilha.",
      },
      { status: 400 },
    );
  }
}
