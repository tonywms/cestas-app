"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

type ActionState = {
  success: boolean;
  message: string;
};

export async function criarTipoCesta(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return {
      success: false,
      message: "Sessão inválida.",
    };
  }

  const autorizado =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CESTAS_GERENCIAR,
    );

  if (!autorizado) {
    return {
      success: false,
      message:
        "Você não possui permissão para gerenciar tipos de cesta.",
    };
  }

  const codigo = String(
    formData.get("codigo") ?? "",
  )
    .trim()
    .toUpperCase();

  const nome = String(
    formData.get("nome") ?? "",
  ).trim();

  const descricao = String(
    formData.get("descricao") ?? "",
  ).trim();

  const valorTexto = String(
    formData.get("valor_venda") ?? "0",
  )
    .replace(",", ".")
    .trim();

  const valorVenda =
    Number(valorTexto);

  if (!codigo) {
    return {
      success: false,
      message:
        "Informe o código da cesta.",
    };
  }

  if (nome.length < 3) {
    return {
      success: false,
      message:
        "Informe o nome da cesta.",
    };
  }

  if (
    !Number.isFinite(valorVenda) ||
    valorVenda < 0
  ) {
    return {
      success: false,
      message:
        "Informe um valor de venda válido.",
    };
  }

  const supabase =
    await createClient();

  const {
    data: existente,
  } = await supabase
    .from("tipos_cesta")
    .select("id")
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "codigo",
      codigo,
    )
    .maybeSingle();

  if (existente) {
    return {
      success: false,
      message:
        "Já existe uma cesta com este código nesta empresa.",
    };
  }

  const {
    error,
  } = await supabase
    .from("tipos_cesta")
    .insert({
      empresa_id:
        usuario.empresa.id,

      codigo,

      nome,

      descricao:
        descricao || null,

      valor_venda:
        valorVenda,

      ativo:
        true,
    });

  if (error) {
    console.error(
      "Erro criar tipo cesta:",
      error,
    );

    return {
      success: false,
      message:
        "Não foi possível cadastrar o tipo de cesta.",
    };
  }

  revalidatePath(
    "/admin/cestas",
  );

  revalidatePath(
    "/admin/cargas/nova",
  );

  return {
    success: true,
    message:
      `${nome} cadastrada com sucesso.`,
  };
}