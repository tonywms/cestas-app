import { createClient } from "@/lib/supabase/server";

type ConsultarEstoqueParams = {
  empresaId: string;
  entregadorId: string;
  exigeConferenciaFisica: boolean;
};

export type SaldoCargaMobile = {
  id: number;
  codigo: string;
  status: "ABERTA" | "EM_ROTA";
  saldo: number;
  recebida: boolean;
};

export type EstoqueMovelConsolidado = {
  saldoTotal: number | null;
  cargas: SaldoCargaMobile[];
  recebidas: number;
  pendentes: number;
  erro: string | null;
};

const TAMANHO_PAGINA = 200;
const MAX_PAGINAS = 100;
const TAMANHO_LOTE = 80;

function quantidade(valor: unknown): number {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? Math.max(0, numero) : 0;
}

function resultadoIndisponivel(): EstoqueMovelConsolidado {
  return {
    saldoTotal: null,
    cargas: [],
    recebidas: 0,
    pendentes: 0,
    erro: "Não foi possível calcular o estoque móvel total. Atualize a tela.",
  };
}

/**
 * Leitura apenas das cargas ATIVAS do entregador da empresa autenticada.
 * Nunca faz movimentacoes, e nao transforma uma consulta parcial em saldo zero.
 * No modo com bipagem obrigatoria, a carga conta no saldo em posse apenas
 * depois de estar registrada como recebida (recebida_at).
 */
export async function getEstoqueMovelMulticargas({
  empresaId,
  entregadorId,
  exigeConferenciaFisica,
}: ConsultarEstoqueParams): Promise<EstoqueMovelConsolidado> {
  try {
    const supabase = await createClient();
    const cargas: {
      id: number;
      codigo: string;
      status: string;
      recebida_at: string | null;
    }[] = [];

    // Pagina tambem a lista de cargas; .limit(1) ocultaria o restante.
    for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {
      const inicio = pagina * TAMANHO_PAGINA;
      const { data, error } = await supabase
        .from("cargas")
        .select("id,codigo,status,recebida_at")
        .eq("empresa_id", empresaId)
        .eq("entregador_id", entregadorId)
        .in("status", ["ABERTA", "EM_ROTA"])
        .order("id", { ascending: true })
        .range(inicio, inicio + TAMANHO_PAGINA - 1);
      if (error || !data) {
        console.error("V92: falha ao consultar cargas", error?.message);
        return resultadoIndisponivel();
      }
      cargas.push(...data);
      if (data.length < TAMANHO_PAGINA) break;
      if (pagina === MAX_PAGINAS - 1) {
        console.error("V92: limite de paginacao atingido para cargas");
        return resultadoIndisponivel();
      }
    }

    if (cargas.length === 0) {
      return { saldoTotal: 0, cargas: [], recebidas: 0, pendentes: 0, erro: null };
    }

    const saldos = new Map<number, number>();
    for (const carga of cargas) saldos.set(Number(carga.id), 0);
    const ids = cargas.map((carga) => Number(carga.id));

    // Consulta itens em lotes, respeitando limite de linhas do PostgREST.
    for (let posicao = 0; posicao < ids.length; posicao += TAMANHO_LOTE) {
      const lote = ids.slice(posicao, posicao + TAMANHO_LOTE);
      for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {
        const inicio = pagina * TAMANHO_PAGINA;
        const { data, error } = await supabase
          .from("carga_itens")
          .select("carga_id,quantidade_carregada,quantidade_entregue,quantidade_retornada,quantidade_avariada")
          .eq("empresa_id", empresaId)
          .in("carga_id", lote)
          .order("id", { ascending: true })
          .range(inicio, inicio + TAMANHO_PAGINA - 1);
        if (error || !data) {
          console.error("V92: falha ao consultar carga_itens", error?.message);
          return resultadoIndisponivel();
        }
        for (const item of data) {
          const id = Number(item.carga_id);
          if (!saldos.has(id)) continue;
          const saldoItem = Math.max(
            0,
            quantidade(item.quantidade_carregada) -
              quantidade(item.quantidade_entregue) -
              quantidade(item.quantidade_retornada) -
              quantidade(item.quantidade_avariada),
          );
          saldos.set(id, (saldos.get(id) ?? 0) + saldoItem);
        }
        if (data.length < TAMANHO_PAGINA) break;
        if (pagina === MAX_PAGINAS - 1) {
          console.error("V92: limite de paginacao atingido para carga_itens");
          return resultadoIndisponivel();
        }
      }
    }

    const detalhamento: SaldoCargaMobile[] = cargas.map((carga) => ({
      id: Number(carga.id),
      codigo: String(carga.codigo ?? ""),
      status: carga.status === "EM_ROTA" ? "EM_ROTA" : "ABERTA",
      saldo: saldos.get(Number(carga.id)) ?? 0,
      recebida: !exigeConferenciaFisica || Boolean(carga.recebida_at),
    }));
    const saldoTotal = detalhamento.reduce(
      (total, carga) => total + (carga.recebida ? carga.saldo : 0),
      0,
    );
    return {
      saldoTotal,
      cargas: detalhamento.sort((a, b) => b.id - a.id),
      recebidas: detalhamento.filter((carga) => carga.recebida).length,
      pendentes: detalhamento.filter((carga) => !carga.recebida).length,
      erro: null,
    };
  } catch (error) {
    console.error("V92: falha inesperada ao calcular estoque", error);
    return resultadoIndisponivel();
  }
}
