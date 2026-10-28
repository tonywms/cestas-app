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

export type RecebimentoAdminState = {
  success: boolean;
  message: string;
  saldoAntes: number | null;
  saldoDepois: number | null;
  status: string | null;
};

function parseValor(
  value:
    FormDataEntryValue | null,
) {
  const texto =
    String(
      value ??
        "",
    ).trim();

  if (!texto) {
    return NaN;
  }

  const normalizado =
    texto.includes(",")
      ? texto
          .replaceAll(
            ".",
            "",
          )
          .replace(
            ",",
            ".",
          )
      : texto;

  return Number(
    normalizado,
  );
}

export async function registrarRecebimentoAdmin(
  _previousState:
    RecebimentoAdminState,
  formData:
    FormData,
): Promise<RecebimentoAdminState> {
  const usuario =
    await getCurrentUserProfile();

  const falha = (
    message: string,
  ): RecebimentoAdminState => ({
    success:
      false,
    message,
    saldoAntes:
      null,
    saldoDepois:
      null,
    status:
      null,
  });

  if (!usuario) {
    return falha(
      "Sessão inválida. Entre novamente no sistema.",
    );
  }

  const autorizado =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo ===
      "ADMINISTRADOR" ||
    usuario.perfilCodigo ===
      "GESTOR" ||
    usuario.perfilCodigo ===
      "FINANCEIRO" ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.PAGAMENTO_REGISTRAR,
    );

  if (!autorizado) {
    return falha(
      "Você não possui permissão para registrar recebimentos.",
    );
  }

  const parcelaId =
    Number(
      formData.get(
        "parcela_id",
      ),
    );

  const clienteId =
    Number(
      formData.get(
        "cliente_id",
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
      ) ??
        "",
    )
      .trim()
      .toUpperCase();

  const observacao =
    String(
      formData.get(
        "observacao",
      ) ??
        "",
    ).trim();

  if (
    !Number.isInteger(
      parcelaId,
    ) ||
    parcelaId <=
      0 ||
    !Number.isInteger(
      clienteId,
    ) ||
    clienteId <=
      0
  ) {
    return falha(
      "Cliente ou parcela inválida.",
    );
  }

  if (
    !Number.isFinite(
      valor,
    ) ||
    valor <=
      0
  ) {
    return falha(
      "Informe um valor recebido válido.",
    );
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
    return falha(
      "Forma de pagamento inválida.",
    );
  }

  const supabase =
    await createClient();

  const {
    data:
      parcela,
    error:
      parcelaError,
  } =
    await supabase
      .from("parcelas")
      .select(`
        id,
        cliente_id,
        empresa_id,
        valor,
        valor_pago,
        status
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
    return falha(
      "Parcela não encontrada nesta empresa.",
    );
  }

  const saldo =
    Math.max(
      0,
      Number(
        parcela.valor ??
          0,
      ) -
        Number(
          parcela.valor_pago ??
            0,
        ),
    );

  if (
    saldo <=
    0
  ) {
    return falha(
      "Esta parcela já está quitada.",
    );
  }

  if (
    valor >
    saldo +
      0.009
  ) {
    return falha(
      `O valor informado é maior que o saldo da parcela (R$ ${saldo.toFixed(2).replace(".", ",")}).`,
    );
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
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
          observacao ||
          null,
      },
    );

  if (error) {
    console.error(
      "Erro registrar pagamento administrativo:",
      error,
    );

    return falha(
      error.message ||
        "Não foi possível registrar o recebimento.",
    );
  }

  const resultado =
    data as {
      saldo_antes?:
        number;
      saldo_depois?:
        number;
      status?:
        string;
    };

  revalidatePath(
    "/admin/financeiro",
  );

  revalidatePath(
    "/admin/credito",
  );

  revalidatePath(
    "/admin/dashboard",
  );

  revalidatePath(
    `/admin/clientes/${clienteId}`,
  );

  revalidatePath(
    `/admin/financeiro/receber/${parcelaId}`,
  );

  revalidatePath(
    "/mobile/recebimentos",
  );

  revalidatePath(
    `/mobile/recebimentos/${clienteId}`,
  );

  return {
    success:
      true,

    message:
      "Recebimento registrado. Financeiro e crédito foram atualizados.",

    saldoAntes:
      resultado.saldo_antes ??
      saldo,

    saldoDepois:
      resultado.saldo_depois ??
      Math.max(
        0,
        saldo -
          valor,
      ),

    status:
      resultado.status ??
      null,
  };
}
