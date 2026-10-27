"use server";

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

export type EstoqueActionState = {
  success: boolean;
  message: string;
  saldoAnterior: number | null;
  saldoAtual: number | null;
};

const TIPOS_MOVIMENTO = new Set([
  "ENTRADA_CENTRAL",
  "AJUSTE_CENTRAL_ENTRADA",
  "AJUSTE_CENTRAL_SAIDA",
]);

export async function registrarMovimentoEstoque(
  _previousState:
    EstoqueActionState,
  formData:
    FormData,
): Promise<EstoqueActionState> {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return {
      success: false,
      message:
        "Sessão inválida. Entre novamente no sistema.",
      saldoAnterior: null,
      saldoAtual: null,
    };
  }

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

  const tipoMovimento =
    String(
      formData.get(
        "tipo_movimento",
      ) ?? "",
    );

  const observacao =
    String(
      formData.get(
        "observacao",
      ) ?? "",
    ).trim();

  const estoqueMinimoRaw =
    String(
      formData.get(
        "estoque_minimo",
      ) ?? "",
    ).trim();

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
      saldoAnterior: null,
      saldoAtual: null,
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
        "Informe uma quantidade maior que zero.",
      saldoAnterior: null,
      saldoAtual: null,
    };
  }

  if (
    !TIPOS_MOVIMENTO.has(
      tipoMovimento,
    )
  ) {
    return {
      success: false,
      message:
        "Tipo de movimentação inválido.",
      saldoAnterior: null,
      saldoAtual: null,
    };
  }

  const ehAjuste =
    tipoMovimento ===
      "AJUSTE_CENTRAL_ENTRADA" ||
    tipoMovimento ===
      "AJUSTE_CENTRAL_SAIDA";

  const autorizado =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      ehAjuste
        ? PERMISSOES.ESTOQUE_AJUSTAR
        : PERMISSOES.ESTOQUE_MOVIMENTAR,
    );

  if (!autorizado) {
    return {
      success: false,
      message:
        ehAjuste
          ? "Você não possui permissão para ajustar o estoque."
          : "Você não possui permissão para movimentar o estoque.",
      saldoAnterior: null,
      saldoAtual: null,
    };
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "registrar_movimento_estoque_central",
    {
      p_empresa_id:
        usuario.empresa.id,

      p_tipo_cesta_id:
        tipoCestaId,

      p_tipo_movimento:
        tipoMovimento,

      p_quantidade:
        quantidade,

      p_observacao:
        observacao || null,
    },
  );

  if (error) {
    console.error(
      "Erro movimento estoque:",
      error.message,
      error.code,
      error.details,
    );

    return {
      success: false,
      message:
        error.message ||
        "Não foi possível registrar a movimentação.",
      saldoAnterior: null,
      saldoAtual: null,
    };
  }

  const resultado =
    Array.isArray(data)
      ? data[0]
      : data;

  if (
    estoqueMinimoRaw !==
      "" &&
    (
      usuario.isPlatformAdmin ||
      temPermissao(
        usuario.permissoes,
        PERMISSOES.ESTOQUE_AJUSTAR,
      )
    )
  ) {
    const estoqueMinimo =
      Number(
        estoqueMinimoRaw,
      );

    if (
      Number.isInteger(
        estoqueMinimo,
      ) &&
      estoqueMinimo >= 0
    ) {
      const {
        error:
          minimoError,
      } = await supabase
        .from(
          "estoque_central_saldos",
        )
        .update({
          estoque_minimo:
            estoqueMinimo,
        })
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "tipo_cesta_id",
          tipoCestaId,
        );

      if (minimoError) {
        console.error(
          "Erro estoque mínimo:",
          minimoError,
        );
      }
    }
  }

  revalidatePath(
    "/admin/estoque",
  );

  revalidatePath(
    "/admin/cargas",
  );

  revalidatePath(
    "/admin/cargas/nova",
  );

  return {
    success: true,
    message:
      tipoMovimento ===
      "ENTRADA_CENTRAL"
        ? `${quantidade} cesta(s) adicionada(s) ao estoque central.`
        : tipoMovimento ===
          "AJUSTE_CENTRAL_ENTRADA"
          ? `Ajuste positivo de ${quantidade} cesta(s) registrado.`
          : `Ajuste negativo de ${quantidade} cesta(s) registrado.`,

    saldoAnterior:
      Number(
        resultado
          ?.saldo_anterior ??
          0,
      ),

    saldoAtual:
      Number(
        resultado
          ?.saldo_atual ??
          0,
      ),
  };
}
