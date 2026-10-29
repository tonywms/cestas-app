"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

export type CancelarCargaState = {
  success: boolean;
  message: string;
};

export const cancelarCargaInitialState: CancelarCargaState = {
  success: false,
  message: "",
};

export async function cancelarCarga(
  _previousState: CancelarCargaState,
  formData: FormData,
): Promise<CancelarCargaState> {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    return {
      success: false,
      message: "Sessão inválida. Entre novamente no sistema.",
    };
  }

  const cargaId = Number(formData.get("carga_id"));
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!Number.isInteger(cargaId) || cargaId <= 0) {
    return {
      success: false,
      message: "Carga inválida.",
    };
  }

  if (motivo.length > 500) {
    return {
      success: false,
      message: "O motivo deve possuir no máximo 500 caracteres.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "cancelar_carga_estoque",
    {
      p_empresa_id: usuario.empresa.id,
      p_carga_id: cargaId,
      p_motivo: motivo || null,
    },
  );

  if (error) {
    console.error("Erro ao cancelar carga:", error);

    return {
      success: false,
      message: error.message || "Não foi possível cancelar a carga.",
    };
  }

  const resultado = Array.isArray(data) ? data[0] : data;
  const totalDevolvido = Number(resultado?.total_devolvido ?? 0);

  revalidatePath("/admin/cargas");
  revalidatePath(`/admin/cargas/${cargaId}`);
  revalidatePath("/admin/estoque");
  revalidatePath("/admin/volumes");
  revalidatePath("/admin/volumes/etiquetas");
  revalidatePath("/mobile");
  revalidatePath("/mobile/carga");
  revalidatePath("/mobile/rota");

  return {
    success: true,
    message: `Carga cancelada com segurança. ${totalDevolvido} cesta(s) devolvida(s) ao estoque central.`,
  };
}
