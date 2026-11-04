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
  // Verifica persistencia da escolha antes de enviar o entregador para a carga.
  const { data: cargaConfirmada, error: confirmacaoErro } = await supabase.rpc(
    "mobile_obter_carga_escolhida",
    { p_empresa_id: usuario.empresa.id },
  );
  if (confirmacaoErro || Number(cargaConfirmada) !== cargaId) {
    redirect("/mobile/carga/selecionar?erro=" + encodeURIComponent(
      "Nao foi possivel confirmar a troca de carga. Tente novamente ou confira sua conexao.",
    ));
  }
  for (const path of ["/mobile", "/mobile/carga/selecionar", "/mobile/carga", "/mobile/carga/receber", "/mobile/carga/fechar", "/mobile/rota"]) {
    revalidatePath(path);
  }
  // V92: recebimento inteligente, sem repetir bipagem ja concluida.
  if (
    usuario.configuracao.modoControleCarga === "VOLUME" &&
    usuario.configuracao.exigirBipagemCarga
  ) {
    const [cargaResult, volumesResult, bipagensResult] = await Promise.all([
      supabase.from("cargas").select("recebida_at")
        .eq("empresa_id", usuario.empresa.id)
        .eq("entregador_id", usuario.id)
        .eq("id", cargaId).maybeSingle(),
      supabase.from("cesta_volumes").select("id", { count: "exact", head: true })
        .eq("empresa_id", usuario.empresa.id).eq("carga_id", cargaId),
      supabase.from("carga_volume_bipagens").select("volume_id", { count: "exact", head: true })
        .eq("empresa_id", usuario.empresa.id).eq("carga_id", cargaId),
    ]);
    if (cargaResult.error || !cargaResult.data || volumesResult.error || bipagensResult.error) {
      redirect("/mobile/carga/selecionar?erro=" + encodeURIComponent(
        "Não foi possível conferir o recebimento da carga selecionada. Tente novamente.",
      ));
    }
    const esperados = volumesResult.count ?? 0;
    const conferidos = bipagensResult.count ?? 0;
    if (!cargaResult.data.recebida_at || esperados === 0 || conferidos < esperados) {
      redirect("/mobile/carga/receber");
    }
  }
  redirect("/mobile/carga");
}
