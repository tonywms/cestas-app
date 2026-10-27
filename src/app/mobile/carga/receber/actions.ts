"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export type ReceberCargaState = {
  success: boolean;
  message: string;
  codigoVolume: string | null;
  esperados: number;
  confirmados: number;
  completo: boolean;
};

const estado = (
  success: boolean,
  message: string,
  extras?: Partial<ReceberCargaState>,
): ReceberCargaState => ({
  success,
  message,
  codigoVolume: null,
  esperados: 0,
  confirmados: 0,
  completo: false,
  ...extras,
});

export async function biparVolumeCarga(
  _previousState: ReceberCargaState,
  formData: FormData,
): Promise<ReceberCargaState> {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    return estado(false, "Sessão inválida. Entre novamente.");
  }

  const autorizado =
    usuario.isPlatformAdmin ||
    (
      temPermissao(
        usuario.permissoes,
        PERMISSOES.CARGA_RECEBER,
      ) &&
      temPermissao(
        usuario.permissoes,
        PERMISSOES.CARGA_BIPAR_VOLUME,
      )
    );

  if (!autorizado) {
    return estado(
      false,
      "Você não possui permissão para receber e bipar volumes da carga.",
    );
  }

  if (
    usuario.configuracao.modoControleCarga !== "VOLUME" ||
    !usuario.configuracao.exigirBipagemCarga
  ) {
    return estado(
      false,
      "A empresa não exige bipagem no recebimento da carga.",
    );
  }

  const cargaId = Number(
    formData.get("carga_id"),
  );

  const codigoVolume = String(
    formData.get("codigo_volume") ?? "",
  )
    .trim()
    .toUpperCase();

  if (
    !Number.isInteger(cargaId) ||
    cargaId <= 0
  ) {
    return estado(false, "Carga inválida.");
  }

  if (!codigoVolume) {
    return estado(
      false,
      "Bipe ou informe o código do volume.",
    );
  }

  const supabase = await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "bipar_volume_carga",
    {
      p_empresa_id: usuario.empresa.id,
      p_carga_id: cargaId,
      p_codigo_volume: codigoVolume,
    },
  );

  if (error) {
    console.error(
      "Erro ao bipar volume da carga:",
      error.message,
      error.code,
      error.details,
    );

    return estado(
      false,
      error.message ||
        "Não foi possível confirmar este volume.",
    );
  }

  const resultado =
    (
      data ?? {}
    ) as {
      codigo_volume?: string;
      esperados?: number;
      confirmados?: number;
      completo?: boolean;
    };

  const completo =
    Boolean(
      resultado.completo,
    );

  revalidatePath(
    "/mobile/carga",
  );

  revalidatePath(
    "/mobile/carga/receber",
  );

  revalidatePath(
    "/admin/cargas",
  );

  revalidatePath(
    "/admin/volumes",
  );

  return estado(
    true,
    completo
      ? "Todos os volumes foram confirmados. Carga recebida com sucesso."
      : `Volume ${resultado.codigo_volume ?? codigoVolume} confirmado.`,
    {
      codigoVolume:
        resultado.codigo_volume ??
        codigoVolume,

      esperados:
        Number(
          resultado.esperados ?? 0,
        ),

      confirmados:
        Number(
          resultado.confirmados ?? 0,
        ),

      completo,
    },
  );
}
