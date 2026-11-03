"use server";

import {
  randomUUID,
} from "crypto";

import {
  revalidatePath,
} from "next/cache";

import {
  getCurrentUserProfile,
} from "@/lib/auth/get-current-user";

import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";

import {
  createClient,
} from "@/lib/supabase/server";

export type CriarCargaState = {
  success: boolean;
  message: string;
  cargaId: number | null;
  operacao?: "CRIADA" | "REABASTECIDA" | null;
  cargaCodigo?: string | null;
  errorTitle?: string | null;
  nextHref?: string | null;
  nextLabel?: string | null;
};

type ContextoErroCarga = {
  modo: "CRIAR" | "REABASTECER";
  cargaId?: number | null;
};

function traduzirErroCarga(
  mensagemOriginal: string | null | undefined,
  contexto: ContextoErroCarga,
): Pick<
  CriarCargaState,
  "message" | "errorTitle" | "nextHref" | "nextLabel"
> {
  const original =
    String(
      mensagemOriginal ?? "",
    ).trim();

  const mensagem =
    original.toLocaleLowerCase(
      "pt-BR",
    );

  if (
    mensagem.includes(
      "estoque central insuficiente",
    )
  ) {
    const numeros =
      original.match(
        /disponível:\s*(\d+).*solicitado:\s*(\d+)/i,
      );

    return {
      errorTitle:
        "Estoque insuficiente",
      message:
        numeros
          ? `Não há saldo suficiente no estoque central. Disponível: ${numeros[1]} cesta(s); solicitado: ${numeros[2]}. Registre uma entrada ou reduza a quantidade.`
          : "Não há saldo suficiente no estoque central. Registre uma entrada ou reduza a quantidade e tente novamente.",
      nextHref:
        "/admin/estoque",
      nextLabel:
        "Corrigir estoque central",
    };
  }

  if (
    mensagem.includes(
      "já possui uma carga em aberto",
    )
  ) {
    return {
      errorTitle:
        "Carga ativa encontrada",
      message:
        "Este entregador já possui uma carga ativa. Atualize a operação e use o reabastecimento da carga existente em vez de criar outra carga.",
      nextHref:
        contexto.cargaId
          ? `/admin/cargas/${contexto.cargaId}`
          : "/admin/cargas",
      nextLabel:
        contexto.cargaId
          ? "Abrir carga ativa"
          : "Ver cargas ativas",
    };
  }

  if (
    mensagem.includes(
      "carga ativa não encontrada",
    )
  ) {
    return {
      errorTitle:
        "Carga foi alterada",
      message:
        "A carga ativa foi encerrada ou alterada enquanto esta tela estava aberta. Volte para a gestão de cargas, confira a situação atual e tente novamente.",
      nextHref:
        "/admin/cargas",
      nextLabel:
        "Atualizar situação das cargas",
    };
  }

  if (
    mensagem.includes(
      "sessão inválida",
    ) ||
    mensagem.includes(
      "sessao invalida",
    )
  ) {
    return {
      errorTitle:
        "Sessão encerrada",
      message:
        "Sua sessão não está mais válida. Entre novamente no sistema antes de repetir a operação.",
      nextHref:
        "/",
      nextLabel:
        "Entrar novamente",
    };
  }

  if (
    mensagem.includes(
      "permissão",
    ) ||
    mensagem.includes(
      "permissao",
    )
  ) {
    return {
      errorTitle:
        "Acesso não permitido",
      message:
        "Seu usuário não possui a permissão necessária para movimentar esta carga ou o estoque central. Confira seu perfil de acesso com o administrador.",
      nextHref:
        "/admin/acesso",
      nextLabel:
        "Ver meu acesso",
    };
  }

  if (
    mensagem.includes(
      "tipo de cesta inválido",
    ) ||
    mensagem.includes(
      "tipo de cesta invalido",
    )
  ) {
    return {
      errorTitle:
        "Tipo de cesta indisponível",
      message:
        "O tipo de cesta selecionado não está mais disponível para esta empresa. Confira o cadastro e selecione uma cesta ativa.",
      nextHref:
        "/admin/cestas",
      nextLabel:
        "Ver tipos de cesta",
    };
  }

  if (
    contexto.modo ===
      "REABASTECER"
  ) {
    return {
      errorTitle:
        "Reabastecimento não concluído",
      message:
        "Não foi possível reabastecer a carga agora. Nenhuma movimentação foi confirmada. Abra a carga atual, confira a situação e tente novamente.",
      nextHref:
        contexto.cargaId
          ? `/admin/cargas/${contexto.cargaId}`
          : "/admin/cargas",
      nextLabel:
        contexto.cargaId
          ? "Abrir carga atual"
          : "Ver cargas",
    };
  }

  return {
    errorTitle:
      "Operação não concluída",
    message:
      "Não foi possível concluir a transferência de estoque. Nenhuma carga foi confirmada. Volte para a gestão de cargas, confira a situação e tente novamente.",
    nextHref:
      "/admin/cargas",
    nextLabel:
      "Voltar para cargas",
  };
}

export async function criarCarga(
  _previousState:
    CriarCargaState,
  formData:
    FormData,
): Promise<CriarCargaState> {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return {
      success: false,
      cargaId: null,
      ...traduzirErroCarga(
        "Sessão inválida.",
        {
          modo: "CRIAR",
        },
      ),
    };
  }

  const podeGerenciar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CARGA_GERENCIAR,
    );

  const podeMovimentar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ESTOQUE_MOVIMENTAR,
    );

  if (!podeGerenciar) {
    return {
      success: false,
      cargaId: null,
      ...traduzirErroCarga(
        "Você não possui permissão para criar cargas.",
        {
          modo: "CRIAR",
        },
      ),
    };
  }

  if (!podeMovimentar) {
    return {
      success: false,
      cargaId: null,
      ...traduzirErroCarga(
        "Seu perfil não possui permissão para retirar saldo do estoque central.",
        {
          modo: "CRIAR",
        },
      ),
    };
  }

  const entregadorId =
    String(
      formData.get(
        "entregador_id",
      ) ?? "",
    );

  const tipoCestaId =
    Number(
      formData.get(
        "tipo_cesta_id",
      ),
    );

  const quantidade =
    Number(
      formData.get(
        "quantidade",
      ),
    );

  const observacao =
    String(
      formData.get(
        "observacao",
      ) ?? "",
    ).trim();

  if (!entregadorId) {
    return {
      success: false,
      message:
        "Selecione o entregador.",
      cargaId: null,
    };
  }

  if (
    !Number.isInteger(
      tipoCestaId,
    ) ||
    tipoCestaId <= 0
  ) {
    return {
      success: false,
      message:
        "Selecione o tipo de cesta.",
      cargaId: null,
    };
  }

  if (
    !Number.isInteger(
      quantidade,
    ) ||
    quantidade <= 0
  ) {
    return {
      success: false,
      message:
        "Informe uma quantidade válida.",
      cargaId: null,
    };
  }

  const operacaoSolicitada = String(formData.get("operacao_carga") ?? "").trim();
  const cargaDestinoId = Number(formData.get("carga_destino_id") ?? 0);
  if (operacaoSolicitada !== "CRIAR" && operacaoSolicitada !== "REABASTECER") {
    return { success: false, cargaId: null, errorTitle: "Escolha a operação", message: "Selecione explicitamente Criar nova carga ou Reabastecer carga existente." };
  }
  if (operacaoSolicitada === "REABASTECER" && (!Number.isSafeInteger(cargaDestinoId) || cargaDestinoId <= 0)) {
    return { success: false, cargaId: null, errorTitle: "Selecione a carga", message: "Escolha a carga de destino antes de confirmar o reabastecimento." };
  }

  const supabase =
    await createClient();

  const {
    data: cargaAtiva,
    error: cargaAtivaError,
  } = await supabase
    .from("cargas")
    .select("id, codigo, status")
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "entregador_id",
      entregadorId,
    )
    .in(
      "status",
      [
        "ABERTA",
        "EM_ROTA",
      ],
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    )
    .limit(1)
    .maybeSingle();

  if (cargaAtivaError) {
    console.error(
      "Erro ao consultar carga ativa do entregador:",
      cargaAtivaError.message,
    );

    return {
      success: false,
      cargaId: null,
      errorTitle:
        "Não foi possível verificar a carga",
      message:
        "Não conseguimos confirmar a situação atual deste entregador. Volte para a gestão de cargas, atualize a tela e tente novamente.",
      nextHref:
        "/admin/cargas",
      nextLabel:
        "Ver cargas do entregador",
    };
  }

  // Criar uma nova carga nao depende da existencia de outras cargas.
  // O destino so e selecionado para REABASTECER.

  if (operacaoSolicitada === "REABASTECER") {
    // Validação no servidor: o formulário não decide a carga por conta própria.
    // O banco/RPC valida novamente tenant, status, permissões e estoque.
    const { data: destino, error: destinoError } = await supabase
      .from("cargas")
      .select("id, codigo, status, entregador_id")
      .eq("empresa_id", usuario.empresa.id)
      .eq("entregador_id", entregadorId)
      .eq("id", cargaDestinoId)
      .in("status", ["ABERTA", "EM_ROTA"])
      .maybeSingle();
    if (destinoError || !destino) {
      return {
        success: false, cargaId: null,
        errorTitle: "Carga de destino inválida",
        message: "A carga selecionada não está ativa ou não pertence a este entregador/empresa. Atualize a tela antes de tentar novamente.",
      };
    }
    const cargaAtiva = destino;
    const {
      data: reabastecimentoData,
      error: reabastecimentoError,
    } = await supabase.rpc(
      "reabastecer_carga_com_estoque",
      {
        p_empresa_id:
          usuario.empresa.id,

        p_carga_id:
          Number(
            cargaAtiva.id,
          ),

        p_tipo_cesta_id:
          tipoCestaId,

        p_quantidade:
          quantidade,

        p_observacao:
          observacao || null,
      },
    );

    if (
      reabastecimentoError
    ) {
      console.error(
        "Erro ao reabastecer carga ativa:",
        reabastecimentoError.message,
        reabastecimentoError.code,
        reabastecimentoError.details,
      );

      const cargaId =
        Number(
          cargaAtiva.id,
        );

      return {
        success: false,
        cargaId,
        ...traduzirErroCarga(
          reabastecimentoError.message,
          {
            modo:
              "REABASTECER",
            cargaId,
          },
        ),
      };
    }

    const resultado =
      Array.isArray(
        reabastecimentoData,
      )
        ? reabastecimentoData[0]
        : reabastecimentoData;

    revalidatePath(
      "/admin/estoque",
    );

    revalidatePath(
      "/admin/cargas",
    );

    revalidatePath(
      "/admin/cargas/nova",
    );

    revalidatePath(
      `/admin/cargas/${cargaAtiva.id}`,
    );

    revalidatePath(
      "/admin/volumes",
    );

    revalidatePath(
      "/admin/volumes/etiquetas",
    );

    revalidatePath(
      "/mobile",
    );

    revalidatePath(
      "/mobile/carga",
    );

    revalidatePath(
      "/mobile/carga/receber",
    );

    return {
      success: true,
      message:
        `Carga ${String(
          cargaAtiva.codigo,
        )} reabastecida com ${quantidade} cesta(s). Saldo central restante: ${Number(
          resultado
            ?.saldo_central ??
            0,
        )}.`,
      cargaId:
        Number(
          cargaAtiva.id,
        ),
      operacao:
        "REABASTECIDA",
      cargaCodigo:
        String(
          cargaAtiva.codigo,
        ),
    };
  }

  const agora =
    new Date();

  const dataCodigo =
    agora
      .toISOString()
      .slice(0, 10)
      .replaceAll(
        "-",
        "",
      );

  const codigo =
    `CG-${dataCodigo}-${randomUUID()
      .slice(
        0,
        6,
      )
      .toUpperCase()}`;

  const {
    data,
    error,
  } = await supabase.rpc(
    "criar_carga_com_estoque",
    {
      p_empresa_id:
        usuario.empresa.id,

      p_codigo:
        codigo,

      p_entregador_id:
        entregadorId,

      p_tipo_cesta_id:
        tipoCestaId,

      p_quantidade:
        quantidade,

      p_observacao:
        observacao || null,
    },
  );

  if (error) {
    console.error(
      "Erro criar carga com estoque:",
      error.message,
      error.code,
      error.details,
    );

    return {
      success: false,
      cargaId: null,
      ...traduzirErroCarga(
        error.message,
        {
          modo: "CRIAR",
        },
      ),
    };
  }

  const resultado =
    Array.isArray(data)
      ? data[0]
      : data;

  revalidatePath(
    "/admin/estoque",
  );

  revalidatePath(
    "/admin/cargas",
  );

  revalidatePath(
    "/admin/cargas/nova",
  );

  revalidatePath(
    "/mobile",
  );

  revalidatePath(
    "/mobile/carga",
  );

  return {
    success: true,
    message:
      `Carga ${codigo} criada com ${quantidade} cesta(s). Saldo central restante: ${Number(
        resultado
          ?.saldo_central ??
          0,
      )}.`,
    cargaId:
      Number(
        resultado
          ?.carga_id ??
          0,
      ) ||
      null,
    operacao:
      "CRIADA",
    cargaCodigo:
      codigo,
  };
}
