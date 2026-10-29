"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export type CriarRotaActionState = {
  success: boolean;
  message: string;
  rotaId: number | null;
};

export async function criarRota(
  _previousState: CriarRotaActionState,
  formData: FormData,
): Promise<CriarRotaActionState> {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    return {
      success: false,
      message: "Sessão inválida. Entre novamente no sistema.",
      rotaId: null,
    };
  }

  const podeGerenciar =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo === "ADMINISTRADOR" ||
    usuario.perfilCodigo === "GESTOR" ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ROTA_GERENCIAR,
    );

  if (!podeGerenciar) {
    return {
      success: false,
      message: "Você não possui permissão para gerenciar rotas.",
      rotaId: null,
    };
  }

  const entregadorId = String(
    formData.get("entregador_id") ?? "",
  ).trim();

  const dataRota = String(
    formData.get("data_rota") ?? "",
  ).trim();

  const observacao = String(
    formData.get("observacao") ?? "",
  ).trim();

  const clienteIds = Array.from(
    new Set(
      formData
        .getAll("clientes")
        .map((item) => Number(item))
        .filter(
          (id) =>
            Number.isInteger(id) &&
            id > 0,
        ),
    ),
  );

  if (!entregadorId) {
    return {
      success: false,
      message: "Selecione o entregador.",
      rotaId: null,
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataRota)) {
    return {
      success: false,
      message: "Informe uma data válida para a rota.",
      rotaId: null,
    };
  }

  if (clienteIds.length === 0) {
    return {
      success: false,
      message: "Selecione pelo menos um cliente.",
      rotaId: null,
    };
  }

  const supabase = await createClient();

  const {
    data: vinculo,
    error: vinculoError,
  } = await supabase
    .from("empresa_usuarios")
    .select(`
      usuario_id,
      ativo,
      perfis!inner (
        codigo
      )
    `)
    .eq("empresa_id", usuario.empresa.id)
    .eq("usuario_id", entregadorId)
    .eq("ativo", true)
    .maybeSingle();

  const perfilRaw = vinculo?.perfis;
  const perfil = Array.isArray(perfilRaw)
    ? perfilRaw[0]
    : perfilRaw;

  if (
    vinculoError ||
    !vinculo ||
    !perfil ||
    perfil.codigo !== "ENTREGADOR"
  ) {
    return {
      success: false,
      message: "Entregador inválido para esta empresa.",
      rotaId: null,
    };
  }

  const {
    data: rotaAberta,
    error: rotaAbertaError,
  } = await supabase
    .from("rotas")
    .select(`
      id,
      codigo
    `)
    .eq("empresa_id", usuario.empresa.id)
    .eq("entregador_id", entregadorId)
    .in("status", ["PLANEJADA", "EM_ROTA"])
    .limit(1)
    .maybeSingle();

  if (rotaAbertaError) {
    console.error(
      "Erro ao verificar rota aberta:",
      rotaAbertaError,
    );

    return {
      success: false,
      message: "Não foi possível verificar as rotas do entregador.",
      rotaId: null,
    };
  }

  if (rotaAberta) {
    return {
      success: false,
      message: `O entregador já possui a rota ${rotaAberta.codigo} em aberto.`,
      rotaId: null,
    };
  }

  const {
    data: clientes,
    error: clientesError,
  } = await supabase
    .from("clientes")
    .select(`
      id,
      nome,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      cep
    `)
    .eq("empresa_id", usuario.empresa.id)
    .eq("ativo", true)
    .in("id", clienteIds);

  if (
    clientesError ||
    !clientes ||
    clientes.length !== clienteIds.length
  ) {
    console.error(
      "Erro ao validar clientes da rota:",
      clientesError,
    );

    return {
      success: false,
      message: "Um ou mais clientes selecionados são inválidos.",
      rotaId: null,
    };
  }

  const codigo =
    `RT-${dataRota.replaceAll("-", "")}-${randomUUID()
      .slice(0, 6)
      .toUpperCase()}`;

  const {
    data: rota,
    error: rotaError,
  } = await supabase
    .from("rotas")
    .insert({
      empresa_id: usuario.empresa.id,
      codigo,
      entregador_id: entregadorId,
      data_rota: dataRota,
      status: "PLANEJADA",
      observacao: observacao || null,
      origem: "ADMIN",
      carga_id: null,
      criada_por: usuario.id,
    })
    .select(`
      id,
      codigo
    `)
    .single();

  if (rotaError || !rota) {
    console.error(
      "Erro ao criar rota:",
      rotaError,
    );

    return {
      success: false,
      message: "Não foi possível criar a rota.",
      rotaId: null,
    };
  }

  const ordenados = clienteIds
    .map((clienteId) => {
      const sequenciaInformada = Number(
        formData.get(`sequencia_${clienteId}`),
      );

      return {
        clienteId,
        sequencia:
          Number.isInteger(sequenciaInformada) &&
          sequenciaInformada > 0
            ? sequenciaInformada
            : 999999,
      };
    })
    .sort(
      (a, b) =>
        a.sequencia - b.sequencia,
    );

  const clientesPorId =
    new Map(
      clientes.map(
        (
          cliente,
        ) => [
          Number(
            cliente.id,
          ),
          cliente,
        ],
      ),
    );

  const itens = ordenados.map(
    (
      item,
      index,
    ) => {
      const cliente =
        clientesPorId.get(
          item.clienteId,
        );

      return {
        empresa_id:
          usuario.empresa.id,
        rota_id:
          rota.id,
        cliente_id:
          item.clienteId,
        sequencia:
          index + 1,
        status:
          "PENDENTE",

        /*
         * Snapshot do endereço.
         * A rota preserva exatamente o local
         * planejado mesmo que o cadastro do
         * cliente seja alterado depois.
         */
        endereco_logradouro:
          cliente?.logradouro ??
          null,
        endereco_numero:
          cliente?.numero ??
          null,
        endereco_complemento:
          cliente?.complemento ??
          null,
        endereco_bairro:
          cliente?.bairro ??
          null,
        endereco_cidade:
          cliente?.cidade ??
          null,
        endereco_uf:
          cliente?.uf ??
          null,
        endereco_cep:
          cliente?.cep ??
          null,
      };
    },
  );

  const {
    error: itensError,
  } = await supabase
    .from("rota_clientes")
    .insert(itens);

  if (itensError) {
    console.error(
      "Erro ao criar clientes da rota:",
      itensError,
    );

    await supabase
      .from("rotas")
      .delete()
      .eq("empresa_id", usuario.empresa.id)
      .eq("id", rota.id);

    return {
      success: false,
      message: "A rota foi cancelada porque os clientes não puderam ser adicionados.",
      rotaId: null,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/rotas");
  revalidatePath("/admin/rotas/nova");
  revalidatePath("/mobile");
  revalidatePath("/mobile/rota");

  return {
    success: true,
    message: `Rota ${rota.codigo} criada com ${itens.length} cliente(s).`,
    rotaId: rota.id,
  };
}