"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  PERMISSOES,
} from "@/lib/auth/permissions";

import {
  requirePermission,
} from "@/lib/auth/require-permission";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  getCargaAtiva,
} from "@/services/cargas/get-carga-ativa";

export type FecharCargaState = {
  success: boolean;
  message: string;
  totalRetornado: number;
  totalAvariado: number;
};

export async function fecharCarga(
  _previousState:
    FecharCargaState,
  formData:
    FormData,
): Promise<FecharCargaState> {
  const usuario =
    await requirePermission(
      PERMISSOES.CARGA_RETORNAR,
    );

  const cargaId =
    Number(
      formData.get(
        "carga_id",
      ),
    );

  if (
    !Number.isInteger(
      cargaId,
    ) ||
    cargaId <= 0
  ) {
    return {
      success: false,
      message:
        "Carga inválida.",
      totalRetornado:
        0,
      totalAvariado:
        0,
    };
  }

  const {
    carga,
    erro,
  } = await getCargaAtiva({
    entregadorId:
      usuario.id,

    empresaId:
      usuario.empresa.id,
  });

  if (
    erro ||
    !carga ||
    carga.id !==
      cargaId
  ) {
    return {
      success: false,
      message:
        "A carga ativa não foi encontrada para este usuário.",
      totalRetornado:
        0,
      totalAvariado:
        0,
    };
  }

  const itens =
    carga.carga_itens.map(
      (
        item,
      ) => ({
        carga_item_id:
          item.id,

        quantidade_retornada:
          Number(
            formData.get(
              `retorno_${item.id}`,
            ) ??
            0,
          ),

        quantidade_avariada:
          Number(
            formData.get(
              `avaria_${item.id}`,
            ) ??
            0,
          ),
      }),
    );

  for (
    const item of itens
  ) {
    if (
      !Number.isInteger(
        item.quantidade_retornada,
      ) ||
      !Number.isInteger(
        item.quantidade_avariada,
      ) ||
      item.quantidade_retornada <
        0 ||
      item.quantidade_avariada <
        0
    ) {
      return {
        success: false,
        message:
          "Existem quantidades inválidas no fechamento.",
        totalRetornado:
          0,
        totalAvariado:
          0,
      };
    }
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "finalizar_carga_estoque",
    {
      p_empresa_id:
        usuario.empresa.id,

      p_carga_id:
        carga.id,

      p_itens:
        itens,
    },
  );

  if (error) {
    console.error(
      "Erro fechar carga:",
      error.message,
      error.code,
      error.details,
    );

    return {
      success: false,
      message:
        error.message ||
        "Não foi possível finalizar a carga.",
      totalRetornado:
        0,
      totalAvariado:
        0,
    };
  }

  const resultado =
    Array.isArray(data)
      ? data[0]
      : data;

  revalidatePath(
    "/mobile",
  );

  revalidatePath(
    "/mobile/carga",
  );

  revalidatePath(
    "/mobile/carga/fechar",
  );

  revalidatePath(
    "/admin/estoque",
  );

  revalidatePath(
    "/admin/cargas",
  );

  return {
    success: true,
    message:
      "Carga finalizada. O retorno foi devolvido ao estoque central e as avarias ficaram registradas no histórico.",

    totalRetornado:
      Number(
        resultado
          ?.total_retornado ??
          0,
      ),

    totalAvariado:
      Number(
        resultado
          ?.total_avariado ??
          0,
      ),
  };
}
