"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export async function escolherCargaMobile(formData: FormData): Promise<void> {
  const usuario = await getCurrentUserProfile();
  if (!usuario) redirect("/");
  if (!usuario.isPlatformAdmin && !temPermissao(usuario.permissoes, PERMISSOES.CARGA_VISUALIZAR)) {
    redirect("/mobile/sem-acesso");
  }
  const cargaId = Number(formData.get("carga_id"));
  if (!Number.isSafeInteger(cargaId) || cargaId <= 0) {
    redirect("/mobile/carga/selecionar?erro=Selecione%20uma%20carga%20valida");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("mobile_definir_carga_escolhida", {
    p_empresa_id: usuario.empresa.id,
    p_carga_id: cargaId,
  });
  if (error) {
    redirect(`/mobile/carga/selecionar?erro=${encodeURIComponent(error.message)}`);
  }
  for (const path of ["/mobile/carga", "/mobile/carga/receber", "/mobile/carga/fechar", "/mobile/rota"]) {
    revalidatePath(path);
  }
  redirect("/mobile/carga");
}
