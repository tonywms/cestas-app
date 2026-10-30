"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  calcularFechamentoEntregador,
} from "@/lib/financeiro/calcular-fechamento-entregador";
import { createClient } from "@/lib/supabase/server";

function dataValida(valor: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function dinheiro(formData: FormData, nome: string) {
  const bruto = String(formData.get(nome) ?? "0")
    .trim()
    .replace(",", ".");

  const valor = Number(bruto);

  if (!Number.isFinite(valor) || valor < 0 || valor > 999999999) {
    throw new Error(`Valor inválido em ${nome}.`);
  }

  return Math.round(valor * 100) / 100;
}

function arredondar(valor: number) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export async function salvarFechamento(formData: FormData) {
  const usuario = await getCurrentUserProfile();

  if (!usuario || !usuario.ativo) {
    redirect("/");
  }

  const autorizado =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo === "ADMINISTRADOR" ||
    usuario.perfilCodigo === "GESTOR" ||
    usuario.perfilCodigo === "FINANCEIRO";

  if (!autorizado) {
    throw new Error("Usuário sem permissão para conferir prestação de contas.");
  }

  const entregadorId = String(formData.get("entregador_id") ?? "").trim();
  let dataInicio = String(formData.get("data_inicio") ?? "").trim();
  let dataFim = String(formData.get("data_fim") ?? "").trim();

  if (!entregadorId || !dataValida(dataInicio) || !dataValida(dataFim)) {
    throw new Error("Dados do fechamento inválidos.");
  }

  if (dataInicio > dataFim) {
    [dataInicio, dataFim] = [dataFim, dataInicio];
  }

  const supabase = await createClient();

  const perfilResult = await supabase
    .from("perfis")
    .select("id")
    .eq("codigo", "ENTREGADOR")
    .eq("ativo", true)
    .maybeSingle();

  if (!perfilResult.data?.id) {
    throw new Error("Perfil de entregador não encontrado.");
  }

  const vinculoResult = await supabase
    .from("empresa_usuarios")
    .select("usuario_id")
    .eq("empresa_id", usuario.empresa.id)
    .eq("usuario_id", entregadorId)
    .eq("perfil_id", perfilResult.data.id)
    .eq("ativo", true)
    .maybeSingle();

  if (!vinculoResult.data) {
    throw new Error("Entregador não pertence à empresa atual.");
  }

  const calculado = await calcularFechamentoEntregador({
    empresaId: usuario.empresa.id,
    entregadorId,
    dataInicio,
    dataFim,
  });

  const dinheiroConferido = dinheiro(formData, "dinheiro_conferido");
  const pixConferido = dinheiro(formData, "pix_conferido");
  const cartaoConferido = dinheiro(formData, "cartao_conferido");
  const transferenciaConferida = dinheiro(
    formData,
    "transferencia_conferida",
  );
  const outroConferido = dinheiro(formData, "outro_conferido");

  const totalConferido = arredondar(
    dinheiroConferido +
      pixConferido +
      cartaoConferido +
      transferenciaConferida +
      outroConferido,
  );

  const diferencaTotal = arredondar(totalConferido - calculado.recebido);
  const status =
    Math.abs(diferencaTotal) < 0.01 ? "CONFERIDO" : "COM_DIVERGENCIA";

  const observacao = String(formData.get("observacao") ?? "")
    .trim()
    .slice(0, 1500);

  const agora = new Date().toISOString();

  const payload = {
    empresa_id: usuario.empresa.id,
    entregador_id: entregadorId,
    data_inicio: dataInicio,
    data_fim: dataFim,
    status,
    quantidade_carregada: calculado.carregado,
    quantidade_entregue: calculado.entregueCarga,
    quantidade_retornada: calculado.retornado,
    quantidade_avariada: calculado.avariado,
    saldo_carga: calculado.saldoCarga,
    venda_total: calculado.vendaTotal,
    crediario_prazo: calculado.crediarioPrazo,
    recebido_esperado: calculado.recebido,
    dinheiro_esperado: calculado.dinheiro,
    pix_esperado: calculado.pix,
    cartao_esperado: calculado.cartao,
    transferencia_esperada: calculado.transferencia,
    outro_esperado: calculado.outro,
    dinheiro_conferido: dinheiroConferido,
    pix_conferido: pixConferido,
    cartao_conferido: cartaoConferido,
    transferencia_conferida: transferenciaConferida,
    outro_conferido: outroConferido,
    diferenca_total: diferencaTotal,
    observacao: observacao || null,
    conferido_por: usuario.id,
    conferido_at: agora,
    updated_at: agora,
  };

  const { data: fechamento, error } = await supabase
    .from("fechamentos_entregador")
    .upsert(payload, {
      onConflict: "empresa_id,entregador_id,data_inicio,data_fim",
    })
    .select("id")
    .single();

  if (error || !fechamento) {
    console.error("Erro ao salvar fechamento:", error);
    throw new Error("Não foi possível salvar a prestação de contas.");
  }

  const entregadorResult = await supabase
    .from("usuarios")
    .select("nome")
    .eq("id", entregadorId)
    .maybeSingle();

  const { error: auditoriaError } = await supabase
    .from("auditoria_eventos")
    .insert({
      empresa_id: usuario.empresa.id,
      usuario_id: usuario.id,
      entidade: "FECHAMENTO",
      entidade_id: String(fechamento.id),
      acao: "FECHAMENTO_ENTREGADOR_CONFERIDO",
      dados: {
        entregador: entregadorResult.data?.nome ?? "Entregador",
        data_inicio: dataInicio,
        data_fim: dataFim,
        recebido_esperado: calculado.recebido,
        total_conferido: totalConferido,
        diferenca: diferencaTotal,
        status,
      },
    });

  if (auditoriaError) {
    console.error("Falha ao registrar auditoria do fechamento:", auditoriaError);
  }

  revalidatePath("/admin/financeiro/fechamento");
  revalidatePath(`/admin/financeiro/fechamento/${entregadorId}`);

  const nomeEntregador = encodeURIComponent(
    entregadorResult.data?.nome ?? "Entregador",
  );

  redirect(
    `/admin/financeiro/fechamento?inicio=${dataInicio}&fim=${dataFim}&entregador=${entregadorId}&salvo=1&nome=${nomeEntregador}`,
  );
}
