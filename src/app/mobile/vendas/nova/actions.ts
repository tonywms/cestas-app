"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export type VendaCampoState = {
  success: boolean;
  message: string;
  vendaId: number | null;
  codigo: string | null;
  contratoCodigo: string | null;
  valorTotal: number | null;
};

export const vendaCampoInitialState: VendaCampoState = {
  success: false,
  message: "",
  vendaId: null,
  codigo: null,
  contratoCodigo: null,
  valorTotal: null,
};

function parseValor(value: FormDataEntryValue | null) {
  const texto = String(value ?? "").trim();

  if (!texto) {
    return 0;
  }

  const normalizado = texto.includes(",")
    ? texto.replaceAll(".", "").replace(",", ".")
    : texto;

  return Number(normalizado);
}

export async function registrarVendaCampo(
  _previousState: VendaCampoState,
  formData: FormData,
): Promise<VendaCampoState> {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    return {
      ...vendaCampoInitialState,
      message: "Sessão inválida. Entre novamente.",
    };
  }

  const autorizado =
    usuario.configuracao.permitirPagamentoMobile &&
    (
      usuario.isPlatformAdmin ||
      temPermissao(
        usuario.permissoes,
        PERMISSOES.PAGAMENTO_REGISTRAR,
      )
    );

  if (!autorizado) {
    return {
      ...vendaCampoInitialState,
      message: "O financeiro mobile está desabilitado ou você não possui permissão.",
    };
  }

  const entregaId = Number(formData.get("entrega_id"));
  const tipoVenda = String(formData.get("tipo_venda") ?? "")
    .trim()
    .toUpperCase();
  const formaPagamento = String(formData.get("forma_pagamento") ?? "")
    .trim()
    .toUpperCase();
  const valorEntrada = parseValor(formData.get("valor_entrada"));
  const quantidadeParcelas = Number(
    formData.get("quantidade_parcelas") ?? 0,
  );
  const primeiroVencimento = String(
    formData.get("primeiro_vencimento") ?? "",
  ).trim();
  const observacao = String(
    formData.get("observacao") ?? "",
  ).trim();

  if (!Number.isInteger(entregaId) || entregaId <= 0) {
    return {
      ...vendaCampoInitialState,
      message: "Entrega inválida.",
    };
  }

  if (!["AVISTA", "CREDIARIO"].includes(tipoVenda)) {
    return {
      ...vendaCampoInitialState,
      message: "Selecione o tipo de venda.",
    };
  }

  if (
    tipoVenda === "AVISTA" &&
    !["DINHEIRO", "PIX", "CARTAO", "TRANSFERENCIA", "OUTRO"].includes(
      formaPagamento,
    )
  ) {
    return {
      ...vendaCampoInitialState,
      message: "Selecione a forma de pagamento.",
    };
  }

  if (tipoVenda === "CREDIARIO") {
    if (
      !Number.isInteger(quantidadeParcelas) ||
      quantidadeParcelas < 1 ||
      quantidadeParcelas > 120
    ) {
      return {
        ...vendaCampoInitialState,
        message: "Informe uma quantidade válida de parcelas.",
      };
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(primeiroVencimento)) {
      return {
        ...vendaCampoInitialState,
        message: "Informe o primeiro vencimento.",
      };
    }

    if (!Number.isFinite(valorEntrada) || valorEntrada < 0) {
      return {
        ...vendaCampoInitialState,
        message: "Informe uma entrada válida.",
      };
    }

    if (
      valorEntrada > 0 &&
      !["DINHEIRO", "PIX", "CARTAO", "TRANSFERENCIA", "OUTRO"].includes(
        formaPagamento,
      )
    ) {
      return {
        ...vendaCampoInitialState,
        message: "Selecione a forma de pagamento da entrada.",
      };
    }
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "mobile_registrar_venda_entrega",
    {
      p_empresa_id: usuario.empresa.id,
      p_entrega_id: entregaId,
      p_tipo_venda: tipoVenda,
      p_forma_pagamento: formaPagamento || null,
      p_valor_entrada:
        tipoVenda === "CREDIARIO"
          ? valorEntrada
          : 0,
      p_quantidade_parcelas:
        tipoVenda === "CREDIARIO"
          ? quantidadeParcelas
          : null,
      p_primeiro_vencimento:
        tipoVenda === "CREDIARIO"
          ? primeiroVencimento
          : null,
      p_observacao: observacao || null,
    },
  );

  if (error) {
    console.error(
      "Erro ao registrar venda em campo:",
      error.message,
      error.code,
      error.details,
      error.hint,
    );

    return {
      ...vendaCampoInitialState,
      message:
        error.message ||
        "Não foi possível registrar a venda.",
    };
  }

  const resultado = (data ?? {}) as {
    venda_id?: number;
    codigo?: string;
    valor_total?: number;
    contrato_codigo?: string | null;
  };

  [
    "/mobile",
    "/mobile/rota",
    "/mobile/carga",
    "/mobile/recebimentos",
    "/admin",
    "/admin/financeiro",
    "/admin/dashboard",
    "/admin/credito",
  ].forEach((path) => revalidatePath(path));

  return {
    success: true,
    message:
      tipoVenda === "AVISTA"
        ? "Venda à vista registrada com sucesso."
        : "Venda no crediário registrada e parcelas geradas.",
    vendaId: Number(resultado.venda_id ?? 0) || null,
    codigo: resultado.codigo ?? null,
    contratoCodigo: resultado.contrato_codigo ?? null,
    valorTotal:
      resultado.valor_total !== undefined
        ? Number(resultado.valor_total)
        : null,
  };
}
