// CESTAS_V105_5_1_SESSAO: prefetch desabilitado para sessao SSR
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConectividadeMobile } from "@/lib/mobile/use-conectividade";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { escolherCargaMobile } from "./actions";

export type CargaOperacionalResumo = {
  id: number;
  codigo: string;
  status: "ABERTA" | "EM_ROTA";
  dataCarga: string | null;
  conferenciaPendente: boolean;
  fechamentoPendente: boolean; // V95_STATUS_FECHAMENTO_POR_CARGA
  carregadas: number | null;
  entregues: number | null;
  retornadas: number | null;
  avariadas: number | null;
};

type Props = {
  cargas: CargaOperacionalResumo[];
  cargaAtualId: number | null;
  rotaEmAndamento: { codigo: string; cargaId: number } | null;
  saldosDisponiveis: boolean;
};

type Filtro = "TODAS" | "RECEBIDAS" | "A_RECEBER";
type Ordenacao = "PRIORIDADE" | "RECENTES" | "ANTIGAS" | "MAIOR_SALDO";
const LOTE = 15;

function dataBR(valor: string | null): string {
  if (!valor) return "Data não informada";
  const partes = valor.split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : valor;
}

function saldo(carga: CargaOperacionalResumo): number | null {
  const { carregadas, entregues, retornadas, avariadas } = carga;
  if (carregadas == null || entregues == null || retornadas == null || avariadas == null) return null;
  return Math.max(0, carregadas - entregues - retornadas - avariadas);
}

function correspondeAoFiltro(carga: CargaOperacionalResumo, filtro: Filtro, termo: string): boolean {
  if (filtro === "RECEBIDAS" && carga.conferenciaPendente) return false;
  if (filtro === "A_RECEBER" && !carga.conferenciaPendente) return false;
  return termo.length === 0 || `${carga.id} ${carga.codigo}`.toLocaleLowerCase("pt-BR").includes(termo);
}

// V102_CONECTIVIDADE_SELETOR_SEGURO: protecao de UX. A autorizacao da troca continua exclusivamente no servidor.
function BotaoEscolherCarga({ id, conferenciaPendente, conectado }: {
  id: number;
  conferenciaPendente: boolean;
  conectado: boolean;
}) {
  const { pending } = useFormStatus();
  const desabilitado = !conectado || pending;
  return (
    <button
      type="submit"
      disabled={desabilitado}
      aria-disabled={desabilitado}
      aria-busy={pending}
      className="mt-3 w-full rounded-xl bg-[#116b38] px-4 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
    >
      {!conectado
        ? "Sem conexão para trocar de carga"
        : pending
          ? "Selecionando carga..."
          : conferenciaPendente
            ? `Selecionar e receber carga nº ${id}`
            : `Usar carga nº ${id}`}
    </button>
  );
}

export default function SeletorCargasClient({ cargas, cargaAtualId, rotaEmAndamento, saldosDisponiveis }: Props) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("TODAS");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("PRIORIDADE");
  const [limite, setLimite] = useState(LOTE);
  // V102_2_HEARTBEAT_REAL: nao depender apenas de navigator.onLine; verificar resposta REAL do Supabase.
  const { conectado, verificando, marcarIndisponivel, revalidar } = useConectividadeMobile();
  // V103_RECONCILIACAO_POS_REDE: reconsultar dados do servidor uma unica vez
  // por queda real, sem armazenar saldos locais ou reenviar transacoes.
  const router = useRouter();
  const [reconciliando, iniciarReconciliacao] = useTransition();
  const houveQueda = useRef(false);
  useEffect(() => {
    // A verificacao inicial nao equivale a uma queda confirmada.
    if (!conectado) {
      if (!verificando) houveQueda.current = true;
      return;
    }
    if (!houveQueda.current) return;
    houveQueda.current = false;
    iniciarReconciliacao(() => {
      router.refresh();
    });
  }, [conectado, verificando, router]);
  const operacoesLiberadas = conectado && !reconciliando;

  const quantidadeRecebidas = cargas.filter((c) => !c.conferenciaPendente).length;
  const aguardandoBipagem = cargas.filter((c) => c.conferenciaPendente).length;
  const atual = cargas.find((c) => c.id === cargaAtualId) ?? null;

  // V98_FILTROS_RESULTADOS_COERENTES: mesma regra para a carga selecionada e a lista.
  const termoBusca = busca.trim().toLocaleLowerCase("pt-BR");
  const atualNoFiltro = atual !== null && correspondeAoFiltro(atual, filtro, termoBusca);
  const nomeFiltro = filtro === "TODAS" ? "Todas" : filtro === "RECEBIDAS" ? "Recebidas" : "A receber";

  const filtradas = useMemo(() => {
    const resultado = cargas.filter((c) => correspondeAoFiltro(c, filtro, termoBusca));
    // V100_ORDENACAO_OPERACIONAL: apenas apresentação; a carga escolhida e a ação do servidor não mudam.
    return resultado.filter((c) => c.id !== cargaAtualId).sort((a, b) => {
      if (ordenacao === "RECENTES") return b.id - a.id;
      if (ordenacao === "ANTIGAS") return a.id - b.id;
      if (ordenacao === "MAIOR_SALDO") {
        const sa = saldo(a);
        const sb = saldo(b);
        if (sa === null && sb !== null) return 1;
        if (sb === null && sa !== null) return -1;
        if (sa !== null && sb !== null && sa !== sb) return sb - sa;
        return b.id - a.id;
      }
      // Fechamento, rota em andamento, recebimento pendente e demais cargas abertas.
      const prioridade = (c: CargaOperacionalResumo) => c.conferenciaPendente ? 0 : (saldo(c) ?? 0) > 0 ? 1 : 2;
      const diferenca = prioridade(a) - prioridade(b);
      return diferenca || b.id - a.id;
    });
  }, [termoBusca, filtro, cargas, cargaAtualId, ordenacao]);
  const totalNoFiltro = filtradas.length + (atualNoFiltro ? 1 : 0);

  const exibidas = filtradas.slice(0, limite);

  return (
    <div className="space-y-4" onClickCapture={(event) => {
      // Mesmo links de outras telas nao devem iniciar navegacao sem acesso ao servidor.
      if (!operacoesLiberadas && event.target instanceof Element && event.target.closest("a[href]")) event.preventDefault();
    }}>
      {!conectado && (
        <div role="alert" aria-live="assertive" className="fixed inset-x-3 bottom-4 z-[90] mx-auto max-w-[460px] rounded-2xl border border-amber-400 bg-amber-50 px-4 py-3 text-amber-950 shadow-[0_12px_40px_rgba(88,57,0,0.22)]">
          <p className="text-xs font-black">{verificando ? "Verificando conexão com o servidor..." : "Sem conexão com o Supabase"}</p>
          <p className="mt-1 text-[11px] leading-relaxed">{verificando ? "Confirmando disponibilidade antes de liberar operações." : "Operações e filtros bloqueados. Os saldos exibidos são da última consulta e podem estar desatualizados. Não atualize a página enquanto estiver sem internet."}</p>
          <button type="button" onClick={revalidar} disabled={verificando} className="mt-2 rounded-lg border border-amber-500 bg-white px-3 py-1.5 text-[11px] font-bold text-amber-950 disabled:opacity-50">
            {verificando ? "Aguardando verificação" : "Verificar conexão novamente"}
          </button>
        </div>
      )}
      {reconciliando && (
        <div role="status" aria-live="polite" className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-[11px] font-semibold text-sky-900">
          Conexão restabelecida. Atualizando as cargas e os saldos no servidor...
        </div>
      )}

      {/* V105.5.8: filtros por recebimento fisico. */}
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Filtrar cargas por recebimento">
        {([
          ["TODAS", "Todas", cargas.length],
          ["RECEBIDAS", "Recebidas", quantidadeRecebidas],
          ["A_RECEBER", "A receber", aguardandoBipagem],
        ] as const).map(([tipo, rotulo, valor]) => (
          <button
            key={tipo}
            type="button"
            disabled={!operacoesLiberadas}
            aria-pressed={filtro === tipo}
            aria-controls="lista-outras-cargas"
            onClick={() => { setFiltro(tipo); setLimite(LOTE); }}
            className={`min-w-0 rounded-2xl border px-2 py-3 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${filtro === tipo ? "border-emerald-500 bg-emerald-50 shadow-sm ring-1 ring-emerald-400" : "border-emerald-100 bg-white"}`}
          >
            <p className="text-xl font-black tabular-nums text-emerald-900">{valor}</p>
            <p className="mt-1 text-[10px] font-extrabold text-slate-600">{rotulo}</p>
          </button>
        ))}
      </div>

      {/* V93: pendencias de recebimento visiveis antes de iniciar uma operacao. */}
      {aguardandoBipagem > 0 && (
        <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
          <strong>{aguardandoBipagem} carga(s) aguardando recebimento.</strong> Você pode conferir qualquer carga atribuída ao seu usuário, mesmo com uma rota em andamento.
        </div>
      )}


      {atual && (
        <section aria-label="Carga em uso" className="overflow-hidden rounded-[24px] border-2 border-emerald-300 bg-white shadow-[0_12px_30px_rgba(9,87,48,0.10)]">
          <div className="flex items-center justify-between gap-2 bg-emerald-50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-800">Seu estoque selecionado</p>
            <span className="rounded-full bg-emerald-700 px-3 py-1 text-[10px] font-black text-white">Em uso</span>
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[20px] font-black tracking-tight text-slate-900">Carga nº {atual.id}</h2>
                <p className="mt-1 break-all text-[10px] font-medium text-slate-500">{atual.codigo}</p>
              </div>
              <div className="shrink-0 rounded-[18px] bg-emerald-50 px-4 py-3 text-center">
                <p className="text-[27px] font-black leading-none tabular-nums text-emerald-900">
                  {saldosDisponiveis ? (saldo(atual) ?? "—") : "—"}
                </p>
                <p className="mt-1 text-[9px] font-extrabold text-emerald-800">cestas em posse</p>
              </div>
            </div>
            <p className={`mt-3 rounded-xl px-3 py-2 text-[11px] font-semibold leading-5 ${atual.conferenciaPendente ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}>
              {atual.conferenciaPendente
                ? "Falta conferir os volumes recebidos do CD."
                : "Recebimento do CD confirmado. As cestas permanecem no seu estoque móvel."}
            </p>
            {!atualNoFiltro && (
              <p className="mt-2 text-[10px] text-slate-500">Esta carga continua em uso, mesmo fora do filtro atual.</p>
            )}
            <Link
              prefetch={false}
              href={atual.conferenciaPendente ? `/mobile/carga/receber?cargaId=${atual.id}` : "/mobile/carga"}
              className="mt-4 flex min-h-[50px] w-full items-center justify-center rounded-[15px] bg-emerald-800 px-4 py-3 text-center text-[13px] font-black text-white"
            >
              {atual.conferenciaPendente ? "Conferir recebimento do CD" : "Abrir estoque desta carga"}
            </Link>
            <p className="mt-2 text-center text-[10px] text-slate-500">Abrir uma carga não devolve cestas nem encerra a operação.</p>
          </div>
        </section>
      )}

      <div className="rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
        <label htmlFor="busca-carga" className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
          Localizar carga por número ou código
        </label>
        <input
          id="busca-carga"
          disabled={!operacoesLiberadas}
          value={busca}
          onChange={(event) => { setBusca(event.target.value); setLimite(LOTE); }}
          type="search"
          autoComplete="off"
          placeholder="Ex.: 24 ou CG-20261103"
          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <p className="mt-2 text-[10px] text-slate-500">Toque nos indicadores acima para filtrar por situação.</p>
      </div>

      <div role="status" aria-live="polite" className="flex items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
        <p className="text-[11px] text-emerald-900">
          <strong>{totalNoFiltro}</strong> {totalNoFiltro === 1 ? "carga encontrada" : "cargas encontradas"} · {nomeFiltro}
        </p>
        {(filtro !== "TODAS" || termoBusca.length > 0) && (
          <button type="button" onClick={() => { setFiltro("TODAS"); setBusca(""); setLimite(LOTE); }} className="shrink-0 text-[11px] font-extrabold text-emerald-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
            Limpar filtro
          </button>
        )}
      </div>

      {/* V100_ORDENACAO_OPERACIONAL: ordenar sem aumentar a altura da tela. */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="min-w-0">
          <h2 className="text-sm font-black text-slate-800">{atual ? "Outras cargas" : "Cargas disponíveis"}</h2>
          <p className="text-[10px] font-semibold tabular-nums text-slate-500">{filtradas.length} encontrada(s)</p>
        </div>
        {filtradas.length > 0 && (
          <>
            <label htmlFor="ordenar-cargas" className="sr-only">Ordenar cargas</label>
            <select
              id="ordenar-cargas"
              disabled={!operacoesLiberadas}
              aria-label="Ordenar outras cargas"
              value={ordenacao}
              onChange={(event) => { setOrdenacao(event.target.value as Ordenacao); setLimite(LOTE); }}
              className="w-[158px] min-w-0 rounded-xl border border-emerald-100 bg-white px-2 py-2.5 text-[11px] font-semibold text-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <option value="PRIORIDADE">Prioridade operacional</option>
              <option value="RECENTES">Mais recentes</option>
              <option value="ANTIGAS">Mais antigas</option>
              <option value="MAIOR_SALDO">Maior saldo</option>
            </select>
          </>
        )}
      </div>

      {filtradas.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-600">
          {cargas.length === 0
            ? "Nenhuma carga disponível."
            : atualNoFiltro && totalNoFiltro === 1
              ? "A carga que corresponde ao filtro já está exibida acima, em operação."
              : filtro === "EM_ROTA" && termoBusca.length === 0
                ? "Nenhuma outra carga está com rota em andamento."
                : filtro === "A_FECHAR" && termoBusca.length === 0
                  ? "Nenhuma outra carga está aguardando fechamento."
                  : "Nenhuma outra carga corresponde à busca ou ao filtro selecionado."}
        </div>
      )}

      <div id="lista-outras-cargas" className="space-y-3">
        {exibidas.map((carga) => {
          const selecionada = carga.id === cargaAtualId;
          const saldoAtual = saldosDisponiveis ? saldo(carga) : null;
          return (
            <form
              key={carga.id}
              action={escolherCargaMobile}
              onSubmit={(event) => {
                if (!operacoesLiberadas || !navigator.onLine) {
                  event.preventDefault();
                  marcarIndisponivel();
                }
              }}
              className={`rounded-2xl border p-4 shadow-sm ${selecionada ? "border-emerald-400 bg-emerald-50" : "border-emerald-100 bg-white"}`}
            >
              <input type="hidden" name="carga_id" value={carga.id} />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-black text-slate-900">Carga nº {carga.id}</p>
                  <p className="mt-1 break-all text-[11px] font-medium text-slate-600">{carga.codigo}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                    {carga.fechamentoPendente ? "Rota concluída" : carga.status === "EM_ROTA" ? "Em rota" : "Aberta"}
                  </span>
                  {selecionada && <span className="text-[10px] font-extrabold text-emerald-700">EM OPERAÇÃO</span>}
                  {carga.fechamentoPendente && !carga.conferenciaPendente && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-900">
                      Fechamento pendente
                    </span>
                  )}
                  {carga.conferenciaPendente ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-900">Recebimento pendente</span>
                  ) : (
                    <span className="text-[10px] font-semibold text-emerald-700">Recebimento confirmado</span>
                  )}
                </div>
              </div>
              {/* V99_CARDS_COMPACTOS_EXPANSIVEIS: saldo visivel; detalhes sob demanda. */}
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2">
                <span className="text-[10px] font-bold text-emerald-900">Saldo desta carga</span>
                <span className="text-sm font-black tabular-nums text-emerald-900">
                  {saldoAtual == null ? "—" : `${saldoAtual} ${saldoAtual === 1 ? "cesta" : "cestas"}`}
                </span>
              </div>
              <details className="group mt-2 rounded-xl border border-slate-200 bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-[11px] font-bold text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
                  <span>Ver detalhes da carga</span>
                  <span aria-hidden="true" className="text-base leading-none text-emerald-800 transition-transform group-open:rotate-180">⌄</span>
                </summary>
                <div className="border-t border-slate-100 px-3 pb-3 pt-2">
                  <p className="text-[10px] text-slate-500">Data da carga: {dataBR(carga.dataCarga)}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2 text-center">
                {([
                  ["CARGA", carga.carregadas],
                  ["ENTREGUE", carga.entregues],
                  ["SALDO", saldoAtual],
                ] as const).map(([rotulo, valor]) => (
                  <div key={rotulo} className="py-1">
                    <p className="text-base font-black tabular-nums text-slate-900">{valor ?? "—"}</p>
                    <p className="text-[9px] font-bold tracking-wide text-slate-500">{rotulo}</p>
                  </div>
                ))}
                  </div>
                </div>
              </details>
              {selecionada ? (
                <Link prefetch={false} href={carga.conferenciaPendente ? `/mobile/carga/receber?cargaId=${carga.id}` : "/mobile/carga"} className="mt-3 block rounded-xl bg-emerald-800 px-4 py-3 text-center text-xs font-black text-white">
                  {carga.conferenciaPendente ? `Receber volumes da carga nº ${carga.id}` : `Continuar com a carga nº ${carga.id}`}
                </Link>
              ) : (
                <BotaoEscolherCarga
                  id={carga.id}
                  conferenciaPendente={carga.conferenciaPendente}
                  conectado={operacoesLiberadas}
                />
              )}
              {carga.conferenciaPendente && (
                <div className="mt-3 space-y-2">
                  <Link prefetch={false}
                    href={`/mobile/carga/receber?cargaId=${carga.id}`}
                    className="block rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-3 text-center text-[11px] font-black text-emerald-900"
                  >
                    Receber volumes da carga nº {carga.id} sem trocar de rota
                  </Link>
                  <p className="text-[10px] leading-relaxed text-amber-800">
                    A conferência desta carga é independente de qualquer rota. A bipagem só confirma volumes atribuídos a você.
                  </p>
                </div>
              )}
            </form>
          );
        })}
      </div>

      {limite < filtradas.length && (
        <button
          type="button"
          onClick={() => setLimite((valor) => valor + LOTE)}
          className="w-full rounded-xl border border-emerald-600 bg-white px-4 py-3 text-sm font-bold text-emerald-800"
        >
          Carregar mais ({filtradas.length - limite} restantes)
        </button>
      )}


    </div>
  );
}
