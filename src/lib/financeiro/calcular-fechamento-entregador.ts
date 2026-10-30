import "server-only";

import { createClient } from "@/lib/supabase/server";

export type FechamentoCalculado = {
  carregado: number;
  entregueCarga: number;
  retornado: number;
  avariado: number;
  saldoCarga: number;
  entregas: number;
  vendas: number;
  vendaTotal: number;
  crediarioPrazo: number;
  recebido: number;
  dinheiro: number;
  pix: number;
  cartao: number;
  transferencia: number;
  outro: number;
};

function numero(valor: unknown) {
  const convertido = Number(valor ?? 0);
  return Number.isFinite(convertido) ? convertido : 0;
}

function somarForma(
  resumo: FechamentoCalculado,
  forma: unknown,
  valor: unknown,
) {
  const valorNumero = numero(valor);
  const formaTexto = String(forma ?? "OUTRO").toUpperCase();

  resumo.recebido += valorNumero;

  if (formaTexto === "DINHEIRO") resumo.dinheiro += valorNumero;
  else if (formaTexto === "PIX") resumo.pix += valorNumero;
  else if (formaTexto === "CARTAO") resumo.cartao += valorNumero;
  else if (formaTexto === "TRANSFERENCIA") resumo.transferencia += valorNumero;
  else resumo.outro += valorNumero;
}

export async function calcularFechamentoEntregador({
  empresaId,
  entregadorId,
  dataInicio,
  dataFim,
}: {
  empresaId: string;
  entregadorId: string;
  dataInicio: string;
  dataFim: string;
}): Promise<FechamentoCalculado> {
  const supabase = await createClient();

  const inicioPeriodo = `${dataInicio}T00:00:00-03:00`;
  const fimPeriodo = `${dataFim}T23:59:59.999-03:00`;

  const [
    cargasResult,
    entregasResult,
    vendasResult,
    vendaRecebimentosResult,
    pagamentosResult,
  ] = await Promise.all([
    supabase
      .from("cargas")
      .select("id")
      .eq("empresa_id", empresaId)
      .eq("entregador_id", entregadorId)
      .gte("data_carga", dataInicio)
      .lte("data_carga", dataFim),

    supabase
      .from("entregas")
      .select("id")
      .eq("empresa_id", empresaId)
      .eq("entregador_id", entregadorId)
      .gte("entregue_at", inicioPeriodo)
      .lte("entregue_at", fimPeriodo),

    supabase
      .from("vendas")
      .select("id, tipo_venda, valor_total, valor_entrada")
      .eq("empresa_id", empresaId)
      .eq("entregador_id", entregadorId)
      .gte("created_at", inicioPeriodo)
      .lte("created_at", fimPeriodo),

    supabase
      .from("venda_recebimentos")
      .select("id, valor, forma_pagamento")
      .eq("empresa_id", empresaId)
      .eq("recebido_por", entregadorId)
      .gte("created_at", inicioPeriodo)
      .lte("created_at", fimPeriodo),

    supabase
      .from("pagamentos")
      .select("id, valor, forma_pagamento")
      .eq("empresa_id", empresaId)
      .eq("recebido_por", entregadorId)
      .gte("created_at", inicioPeriodo)
      .lte("created_at", fimPeriodo),
  ]);

  const cargaIds = (cargasResult.data ?? []).map((item) => Number(item.id));

  const cargaItensResult =
    cargaIds.length > 0
      ? await supabase
          .from("carga_itens")
          .select(
            "quantidade_carregada, quantidade_entregue, quantidade_retornada, quantidade_avariada",
          )
          .eq("empresa_id", empresaId)
          .in("carga_id", cargaIds)
      : {
          data: [] as Array<{
            quantidade_carregada: number | null;
            quantidade_entregue: number | null;
            quantidade_retornada: number | null;
            quantidade_avariada: number | null;
          }>,
        };

  const resumo: FechamentoCalculado = {
    carregado: 0,
    entregueCarga: 0,
    retornado: 0,
    avariado: 0,
    saldoCarga: 0,
    entregas: (entregasResult.data ?? []).length,
    vendas: 0,
    vendaTotal: 0,
    crediarioPrazo: 0,
    recebido: 0,
    dinheiro: 0,
    pix: 0,
    cartao: 0,
    transferencia: 0,
    outro: 0,
  };

  for (const item of cargaItensResult.data ?? []) {
    resumo.carregado += numero(item.quantidade_carregada);
    resumo.entregueCarga += numero(item.quantidade_entregue);
    resumo.retornado += numero(item.quantidade_retornada);
    resumo.avariado += numero(item.quantidade_avariada);
  }

  resumo.saldoCarga = Math.max(
    0,
    resumo.carregado -
      resumo.entregueCarga -
      resumo.retornado -
      resumo.avariado,
  );

  for (const venda of vendasResult.data ?? []) {
    const total = numero(venda.valor_total);
    const entrada = numero(venda.valor_entrada);
    const tipo = String(venda.tipo_venda ?? "").toUpperCase();

    resumo.vendas += 1;
    resumo.vendaTotal += total;

    if (tipo === "CREDIARIO") {
      resumo.crediarioPrazo += Math.max(0, total - entrada);
    }
  }

  for (const recebimento of vendaRecebimentosResult.data ?? []) {
    somarForma(resumo, recebimento.forma_pagamento, recebimento.valor);
  }

  for (const pagamento of pagamentosResult.data ?? []) {
    somarForma(resumo, pagamento.forma_pagamento, pagamento.valor);
  }

  return resumo;
}
