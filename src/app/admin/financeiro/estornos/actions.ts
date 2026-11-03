"use server";

/* V71_FINANCEIRO_LEAST_PRIVILEGE */

import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export async function estornarMovimentoFinanceiro(
  _estadoAnterior: {
    success: boolean;
    message: string;
    estornoId: number | null;
  },
  formData: FormData,
) {
  const usuario = await getCurrentUserProfile();

  if (!usuario || !usuario.ativo) {
    return {
      success: false,
      message: "Sessão inválida.",
      estornoId: null,
    };
  }

  const autorizado =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.FINANCEIRO_ESTORNAR,
    );

  if (!autorizado) {
    return {
      success: false,
      message: "Usuário sem permissão para realizar estornos.",
      estornoId: null,
    };
  }

  const tipoOrigem = String(formData.get("tipo_origem") ?? "").trim();
  const origemId = Number(formData.get("origem_id"));
  const motivo = String(formData.get("motivo") ?? "").trim();
  const chaveOperacao = String(
    formData.get("chave_operacao") ?? "",
  ).trim();

  if (
    !["PAGAMENTO_PARCELA", "RECEBIMENTO_CLIENTE"].includes(tipoOrigem) ||
    !Number.isInteger(origemId) ||
    origemId <= 0
  ) {
    return {
      success: false,
      message: "Movimento financeiro inválido.",
      estornoId: null,
    };
  }

  if (motivo.length < 10) {
    return {
      success: false,
      message: "Informe um motivo com pelo menos 10 caracteres.",
      estornoId: null,
    };
  }

  if (!/^[0-9a-f-]{36}$/i.test(chaveOperacao)) {
    return {
      success: false,
      message: "Chave de segurança inválida. Atualize a tela.",
      estornoId: null,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "estornar_movimento_financeiro_v70",
    {
      p_empresa_id: usuario.empresa.id,
      p_tipo_origem: tipoOrigem,
      p_origem_id: origemId,
      p_motivo: motivo,
      p_chave_operacao: chaveOperacao,
    },
  );

  if (error) {
    return {
      success: false,
      message:
        error.message ||
        "Não foi possível concluir o estorno financeiro.",
      estornoId: null,
    };
  }

  const resultado = (data ?? {}) as {
    estorno_id?: number;
    valor?: number;
  };

  revalidatePath("/admin/financeiro");
  revalidatePath("/admin/financeiro/estornos");
  revalidatePath("/admin/financeiro/consistencia");
  revalidatePath("/admin/financeiro/fechamento");
  revalidatePath("/admin/relatorios/financeiro");
  revalidatePath("/admin/credito");
  revalidatePath("/mobile/recebimentos");

  return {
    success: true,
    message: "Estorno registrado com auditoria e carteira recalculada.",
    estornoId: Number(resultado.estorno_id ?? 0) || null,
  };
}
