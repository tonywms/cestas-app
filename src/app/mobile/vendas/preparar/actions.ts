"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

function parseValor(
  value: FormDataEntryValue | null,
) {
  const texto = String(
    value ?? "",
  ).trim();

  if (!texto) {
    return 0;
  }

  const normalizado =
    texto.includes(",")
      ? texto
          .replaceAll(".", "")
          .replace(",", ".")
      : texto;

  return Number(normalizado);
}

export async function prepararVendaCampo(
  _previousState: {
    success: boolean;
    message: string;
  },
  formData: FormData,
): Promise<{
  success: boolean;
  message: string;
}> {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return {
      success: false,
      message:
        "Sessão inválida. Entre novamente.",
    };
  }

  const podePagamento =
    usuario.configuracao
      .permitirPagamentoMobile &&
    (
      usuario.isPlatformAdmin ||
      temPermissao(
        usuario.permissoes,
        PERMISSOES.PAGAMENTO_REGISTRAR,
      )
    );

  const podeEntrega =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ENTREGA_REALIZAR,
    );

  if (
    !podePagamento ||
    !podeEntrega
  ) {
    return {
      success: false,
      message:
        "Você não possui permissão para esta operação.",
    };
  }

  const rotaClienteId =
    Number(
      formData.get(
        "rota_cliente_id",
      ),
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

  const tipoVenda =
    String(
      formData.get(
        "tipo_venda",
      ) ?? "",
    )
      .trim()
      .toUpperCase();

  const formaPagamento =
    String(
      formData.get(
        "forma_pagamento",
      ) ?? "",
    )
      .trim()
      .toUpperCase();

  const valorEntrada =
    parseValor(
      formData.get(
        "valor_entrada",
      ),
    );

  const quantidadeParcelas =
    Number(
      formData.get(
        "quantidade_parcelas",
      ) ?? 0,
    );

  const primeiroVencimento =
    String(
      formData.get(
        "primeiro_vencimento",
      ) ?? "",
    ).trim();

  const observacao =
    String(
      formData.get(
        "observacao",
      ) ?? "",
    ).trim();

  if (
    !Number.isInteger(
      rotaClienteId,
    ) ||
    rotaClienteId <= 0 ||
    !Number.isInteger(
      tipoCestaId,
    ) ||
    tipoCestaId <= 0 ||
    !Number.isInteger(
      quantidade,
    ) ||
    quantidade <= 0
  ) {
    return {
      success: false,
      message:
        "Atendimento, cesta ou quantidade inválida.",
    };
  }

  if (
    ![
      "AVISTA",
      "SALDO_ABERTO",
      "CREDIARIO",
    ].includes(
      tipoVenda,
    )
  ) {
    return {
      success: false,
      message:
        "Selecione o tipo de venda.",
    };
  }

  if (
    !Number.isFinite(
      valorEntrada,
    ) ||
    valorEntrada < 0
  ) {
    return {
      success: false,
      message:
        "Valor recebido inválido.",
    };
  }

  const vencimento =
    tipoVenda ===
    "AVISTA"
      ? null
      : /^\d{4}-\d{2}-\d{2}$/.test(
            primeiroVencimento,
          )
        ? primeiroVencimento
        : null;

  if (
    tipoVenda !==
      "AVISTA" &&
    !vencimento
  ) {
    return {
      success: false,
      message:
        "Informe a próxima data de cobrança.",
    };
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "mobile_preparar_venda_rota",
      {
        p_empresa_id:
          usuario.empresa.id,
        p_rota_cliente_id:
          rotaClienteId,
        p_tipo_cesta_id:
          tipoCestaId,
        p_quantidade:
          quantidade,
        p_tipo_venda:
          tipoVenda,
        p_forma_pagamento:
          formaPagamento ||
          null,
        p_valor_entrada:
          valorEntrada,
        p_quantidade_parcelas:
          tipoVenda ===
          "CREDIARIO"
            ? quantidadeParcelas
            : null,
        p_primeiro_vencimento:
          vencimento,
        p_observacao:
          observacao ||
          null,
      },
    );

  if (error) {
    console.error(
      "Erro ao preparar venda antes da entrega:",
      error,
    );

    return {
      success: false,
      message:
        error.message ||
        "Não foi possível salvar a operação.",
    };
  }

  const resultado =
    (
      data ??
      {}
    ) as {
      fluxo_id?: number;
    };

  const fluxoId =
    Number(
      resultado.fluxo_id,
    );

  if (
    !Number.isInteger(
      fluxoId,
    ) ||
    fluxoId <= 0
  ) {
    return {
      success: false,
      message:
        "A operação foi salva, mas não foi possível localizar a próxima etapa.",
    };
  }

  [
    "/mobile",
    "/mobile/rota",
    "/mobile/carga",
    "/mobile/vendas/preparar",
  ].forEach(
    (path) =>
      revalidatePath(
        path,
      ),
  );

  redirect(
    `/mobile/vendas/finalizar?fluxoId=${fluxoId}`,
  );
}
