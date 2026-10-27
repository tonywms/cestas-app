"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

type ConfiguracaoEmpresaActionState = {
  success: boolean;
  message: string;
};

export async function atualizarConfiguracoesEmpresa(
  _previousState: ConfiguracaoEmpresaActionState,
  formData: FormData,
): Promise<ConfiguracaoEmpresaActionState> {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    return {
      success: false,
      message: "Sessão inválida. Entre novamente no sistema.",
    };
  }

  const podeConfigurar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.EMPRESA_CONFIGURAR,
    );

  if (!podeConfigurar) {
    return {
      success: false,
      message:
        "Você não possui permissão para alterar as configurações da empresa.",
    };
  }

  const modoRecebido = String(
    formData.get("modo_controle_carga") ?? "QUANTIDADE",
  ).toUpperCase();

  const modoControleCarga =
    modoRecebido === "VOLUME"
      ? "VOLUME"
      : "QUANTIDADE";

  const exigirBipagemCarga =
    modoControleCarga === "VOLUME" &&
    formData.get("exigir_bipagem_carga") === "on";

  const exigirBipagemEntrega =
    modoControleCarga === "VOLUME" &&
    formData.get("exigir_bipagem_entrega") === "on";

  const permitirPagamentoMobile =
    formData.get("permitir_pagamento_mobile") === "on";

  const permitirOcorrenciaMobile =
    formData.get("permitir_ocorrencia_mobile") === "on";

  const supabase = await createClient();

  const { error } = await supabase
    .from("empresa_configuracoes")
    .update({
      modo_controle_carga: modoControleCarga,
      exigir_bipagem_carga: exigirBipagemCarga,
      exigir_bipagem_entrega: exigirBipagemEntrega,
      permitir_pagamento_mobile: permitirPagamentoMobile,
      permitir_ocorrencia_mobile: permitirOcorrenciaMobile,
      updated_at: new Date().toISOString(),
    })
    .eq(
      "empresa_id",
      usuario.empresa.id,
    );

  if (error) {
    console.error(
      "Erro ao atualizar configurações da empresa:",
      error,
    );

    return {
      success: false,
      message:
        "Não foi possível salvar as configurações da empresa.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/acesso");
  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin/permissoes");
  revalidatePath("/mobile");
  revalidatePath("/mobile/carga");
  revalidatePath("/app");

  return {
    success: true,
    message: "Configurações atualizadas com sucesso.",
  };
}