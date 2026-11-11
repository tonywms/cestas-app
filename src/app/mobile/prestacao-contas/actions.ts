"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

function decimal(form: FormData, key: string) {
  const texto = String(form.get(key) ?? "").trim();
  const valor = Number(texto.includes(",") ? texto.replaceAll(".", "").replace(",", ".") : texto);
  if (!texto || !Number.isFinite(valor) || valor < 0 || valor > 100000000) {
    throw new Error("Valor inválido: " + key);
  }
  return Math.round(valor * 100) / 100;
}
function retorno(inicio: string, fim: string, erro: string) {
  return `/mobile/prestacao-contas?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}&erro=${encodeURIComponent(erro)}`;
}

export async function enviarPrestacaoPeriodoMobile(form: FormData) {
  const usuario = await getCurrentUserProfile();
  if (!usuario || !usuario.ativo) redirect("/");
  if (!usuario.isPlatformAdmin && !temPermissao(usuario.permissoes, PERMISSOES.PAGAMENTO_REGISTRAR)) {
    redirect("/mobile/sem-acesso");
  }

  const inicio = String(form.get("inicio") ?? "").trim();
  const fim = String(form.get("fim") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) {
    redirect(retorno(inicio, fim, "Informe datas válidas."));
  }

  let dinheiro: number, pix: number, cartao: number;
  try {
    dinheiro = decimal(form, "dinheiro");
    pix = decimal(form, "pix");
    cartao = decimal(form, "cartao");
  } catch (e) {
    redirect(retorno(inicio, fim, e instanceof Error ? e.message : "Valores inválidos."));
  }

  const observacao = String(form.get("observacao") ?? "").trim();
  if (observacao.length > 1500) redirect(retorno(inicio, fim, "Observação muito longa."));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("enviar_prestacao_periodo_v109", {
    p_empresa_id: usuario.empresa.id,
    p_inicio: inicio,
    p_fim: fim,
    p_dinheiro_declarado: dinheiro,
    p_pix_declarado: pix,
    p_cartao_declarado: cartao,
    p_observacao: observacao || null,
  });
  if (error) {
    console.error("V109: erro ao enviar prestação:", error.code, error.message);
    redirect(retorno(inicio, fim, error.message || "Falha ao enviar prestação."));
  }
  const id = Number((data as { prestacao_id?: number } | null)?.prestacao_id ?? 0);
  if (!Number.isSafeInteger(id) || id <= 0) {
    redirect(retorno(inicio, fim, "O CD não confirmou o protocolo da prestação."));
  }
  revalidatePath("/mobile/prestacao-contas");
  revalidatePath("/admin/financeiro/prestacoes");
  redirect(`/mobile/prestacao-contas?inicio=${inicio}&fim=${fim}&enviada=${id}`);
}
