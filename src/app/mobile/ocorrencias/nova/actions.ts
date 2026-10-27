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

export type OcorrenciaActionState = {
  success: boolean;
  message: string;
  status: string | null;
};

type RpcResult = {
  ocorrencia_id?: number;
  rota_cliente_id?: number;
  tipo?: string;
  status?: string;
  requer_reagendamento?: boolean;
};

const TIPOS_VALIDOS = new Set([
  "CLIENTE_AUSENTE",
  "RECUSA",
  "ENDERECO_INCORRETO",
  "OUTRO",
]);

export async function registrarOcorrencia(
  _previousState: OcorrenciaActionState,
  formData: FormData,
): Promise<OcorrenciaActionState> {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return {
      success: false,
      message: "Sessão inválida. Entre novamente no sistema.",
      status: null,
    };
  }

  const autorizado =
    usuario.configuracao.permitirOcorrenciaMobile &&
    (
      usuario.isPlatformAdmin ||
      temPermissao(
        usuario.permissoes,
        PERMISSOES.OCORRENCIA_REGISTRAR,
      )
    );

  if (!autorizado) {
    return {
      success: false,
      message: "Você não possui permissão para registrar ocorrências.",
      status: null,
    };
  }

  const rotaClienteId = Number(
    formData.get(
      "rota_cliente_id",
    ),
  );

  const tipo = String(
    formData.get("tipo") ?? "",
  )
    .trim()
    .toUpperCase();

  const descricao = String(
    formData.get(
      "descricao",
    ) ?? "",
  ).trim();

  const requerReagendamento =
    formData.get(
      "requer_reagendamento",
    ) === "on";

  if (
    !Number.isInteger(
      rotaClienteId,
    ) ||
    rotaClienteId <= 0
  ) {
    return {
      success: false,
      message: "Parada da rota inválida.",
      status: null,
    };
  }

  if (
    !TIPOS_VALIDOS.has(
      tipo,
    )
  ) {
    return {
      success: false,
      message: "Selecione o tipo da ocorrência.",
      status: null,
    };
  }

  if (
    tipo === "OUTRO" &&
    descricao.length < 3
  ) {
    return {
      success: false,
      message: "Descreva a ocorrência antes de continuar.",
      status: null,
    };
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "registrar_ocorrencia_rota",
    {
      p_empresa_id:
        usuario.empresa.id,
      p_rota_cliente_id:
        rotaClienteId,
      p_tipo:
        tipo,
      p_descricao:
        descricao || null,
      p_requer_reagendamento:
        requerReagendamento,
    },
  );

  if (error) {
    console.error(
      "Erro registrar ocorrência:",
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
        "Não foi possível registrar a ocorrência.",
      status: null,
    };
  }

  const resultado =
    data as RpcResult;

  revalidatePath(
    "/mobile",
  );

  revalidatePath(
    "/mobile/rota",
  );

  revalidatePath(
    "/mobile/ocorrencias/nova",
  );

  revalidatePath(
    "/admin/rotas",
  );

  return {
    success: true,
    message:
      "Ocorrência registrada com sucesso.",
    status:
      resultado?.status ??
      null,
  };
}
