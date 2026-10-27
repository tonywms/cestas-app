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

type ActionState = {
  success: boolean;
  message: string;
  saldoAntes: number | null;
  saldoDepois: number | null;
  status: string | null;
};

function parseValor(
  value: FormDataEntryValue | null,
) {
  const texto = String(
    value ?? "",
  ).trim();

  if (!texto) {
    return NaN;
  }

  const normalizado =
    texto.includes(",")
      ? texto
          .replaceAll(".", "")
          .replace(",", ".")
      : texto;

  return Number(
    normalizado,
  );
}

export async function registrarRecebimento(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return {
      success: false,
      message:
        "Sessão inválida.",
      saldoAntes: null,
      saldoDepois: null,
      status: null,
    };
  }

  const autorizado =
    usuario.configuracao
      .permitirPagamentoMobile &&
    (
      usuario.isPlatformAdmin ||
      temPermissao(
        usuario.permissoes,
        PERMISSOES.PAGAMENTO_REGISTRAR,
      )
    );

  if (!autorizado) {
    return {
      success: false,
      message:
        "Você não possui permissão para registrar pagamentos.",
      saldoAntes: null,
      saldoDepois: null,
      status: null,
    };
  }

  const clienteId =
    Number(
      formData.get(
        "cliente_id",
      ),
    );

  const parcelaId =
    Number(
      formData.get(
        "parcela_id",
      ),
    );

  const valor =
    parseValor(
      formData.get(
        "valor",
      ),
    );

  const forma =
    String(
      formData.get(
        "forma_pagamento",
      ) ?? "",
    )
      .trim()
      .toUpperCase();

  const observacao =
    String(
      formData.get(
        "observacao",
      ) ?? "",
    ).trim();

  if (
    !Number.isInteger(
      clienteId,
    ) ||
    clienteId <= 0 ||
    !Number.isInteger(
      parcelaId,
    ) ||
    parcelaId <= 0
  ) {
    return {
      success: false,
      message:
        "Cliente ou parcela inválida.",
      saldoAntes: null,
      saldoDepois: null,
      status: null,
    };
  }

  if (
    !Number.isFinite(
      valor,
    ) ||
    valor <= 0
  ) {
    return {
      success: false,
      message:
        "Informe o valor recebido.",
      saldoAntes: null,
      saldoDepois: null,
      status: null,
    };
  }

  const formas =
    new Set([
      "DINHEIRO",
      "PIX",
      "CARTAO",
      "TRANSFERENCIA",
      "OUTRO",
    ]);

  if (
    !formas.has(
      forma,
    )
  ) {
    return {
      success: false,
      message:
        "Forma de pagamento inválida.",
      saldoAntes: null,
      saldoDepois: null,
      status: null,
    };
  }

  const supabase =
    await createClient();

  const {
    data: parcela,
    error: parcelaError,
  } = await supabase
    .from("parcelas")
    .select(`
      id,
      cliente_id,
      empresa_id
    `)
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "id",
      parcelaId,
    )
    .eq(
      "cliente_id",
      clienteId,
    )
    .maybeSingle();

  if (
    parcelaError ||
    !parcela
  ) {
    return {
      success: false,
      message:
        "Parcela inválida para este cliente.",
      saldoAntes: null,
      saldoDepois: null,
      status: null,
    };
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "registrar_pagamento_parcela",
    {
      p_empresa_id:
        usuario.empresa.id,

      p_parcela_id:
        parcelaId,

      p_valor:
        valor,

      p_forma_pagamento:
        forma,

      p_observacao:
        observacao || null,
    },
  );

  if (error) {
    console.error(
      "Erro registrar pagamento:",
      {
        message:
          error.message,
        code:
          error.code,
        details:
          error.details,
        hint:
          error.hint,
      },
    );

    return {
      success: false,
      message:
        error.message ||
        "Não foi possível registrar o pagamento.",
      saldoAntes: null,
      saldoDepois: null,
      status: null,
    };
  }

  const resultado =
    data as {
      saldo_antes?: number;
      saldo_depois?: number;
      status?: string;
    };

  revalidatePath(
    "/mobile",
  );

  revalidatePath(
    "/mobile/recebimentos",
  );

  revalidatePath(
    `/mobile/recebimentos/${clienteId}`,
  );

  revalidatePath(
    "/admin/financeiro",
  );

  return {
    success: true,
    message:
      "Recebimento registrado e parcela atualizada.",
    saldoAntes:
      resultado.saldo_antes ??
      null,
    saldoDepois:
      resultado.saldo_depois ??
      null,
    status:
      resultado.status ??
      null,
  };
}
