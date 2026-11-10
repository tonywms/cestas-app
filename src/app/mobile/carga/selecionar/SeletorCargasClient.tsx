"use client";

import { useEffect, useMemo, useState } from "react";
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

type Filtro = "TODAS" | "ABERTA" | "EM_ROTA" | "A_FECHAR";
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
  if (filtro === "ABERTA" && carga.status !== "ABERTA") return false;
  if (filtro === "EM_ROTA" && (carga.status !== "EM_ROTA" || carga.fechamentoPendente)) return false;
  if (filtro === "A_FECHAR" && !carga.fechamentoPendente) return false;
  return termo.length === 0 || `${carga.id} ${carga.codigo}`.toLocaleLowerCase("pt-BR").includes(termo);
}

// V102_CONECTIVIDADE_SELETOR_SEGURO: protecao de UX. A autorizacao da troca continua exclusivamente no servidor.
function BotaoEscolherCarga({ id, rotaBloqueada, conferenciaPendente, conectado }: {
  id: number;
  rotaBloqueada: boolean;
  conferenciaPendente: boolean;
  conectado: boolean;
}) {
  const { pending } = useFormStatus();
  const desabilitado = rotaBloqueada || !conectado || pending;
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
        : rotaBloqueada
          ? "Concluir rota atual para trocar"
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
  // Estado inicial estavel para SSR/hidratacao; atualizado no cliente.
  const [conectado, setConectado] = useState(true);
  useEffect(() => {
    const atualizar = () => setConectado(navigator.onLine);
    atualizar();
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    return () => {
      window.removeEventListener("online", atualizar);
      window.removeEventListener("offline", atualizar);
    };
  }, []);

  const quantidadeAbertas = cargas.filter((c) => c.status === "ABERTA").length;
  // V96_UX_SELETOR_LIMPO: contabiliza estados operacionais reais.
  const quantidadeEmRota = cargas.filter(c=>c.status==='EM_ROTA' && !c.fechamentoPendente).length;
  const quantidadeFechamento = cargas.filter(c=>c.fechamentoPendente).length;
  const aguardandoBipagem = cargas.filter((c) => c.conferenciaPendente).length;
  const atual = cargas.find((c) => c.id === cargaAtualId) ?? null;

  // V98_FILTROS_RESULTADOS_COERENTES: mesma regra para a carga selecionada e a lista.
  const termoBusca = busca.trim().toLocaleLowerCase("pt-BR");
  const atualNoFiltro = atual !== null && correspondeAoFiltro(atual, filtro, termoBusca);
  const nomeFiltro = filtro === "TODAS" ? "Todas" : filtro === "ABERTA" ? "Abertas" : filtro === "EM_ROTA" ? "Em rota" : "A fechar";

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
      const prioridade = (c: CargaOperacionalResumo) => c.fechamentoPendente ? 0 : c.status === "EM_ROTA" ? 1 : c.conferenciaPendente ? 2 : 3;
      const diferenca = prioridade(a) - prioridade(b);
      return diferenca || b.id - a.id;
    });
  }, [termoBusca, filtro, cargas, cargaAtualId, ordenacao]);
  const totalNoFiltro = filtradas.length + (atualNoFiltro ? 1 : 0);

  const exibidas = filtradas.slice(0, limite);
  const bloqueioRota = rotaEmAndamento && rotaEmAndamento.cargaId !== cargaAtualId;

  return (
    <div className="space-y-4">
      {!conectado && (
        <div role="alert" aria-live="assertive" className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm">
          <p className="text-xs font-black">Sem conexão com a internet</p>
          <p className="mt-1 text-[11px] leading-relaxed">Você pode consultar as informações já exibidas, mas não é possível trocar de carga até restabelecer a conexão. Os saldos podem estar desatualizados.</p>
        </div>
      )}
      {/* V97_FILTROS_POR_INDICADORES: indicadores funcionam como filtros, sem uma segunda barra de botoes. */}
      <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Filtrar cargas por situação">
        {([
          ["TODAS", "TOTAL", cargas.length],
          ["ABERTA", "ABERTAS", quantidadeAbertas],
          ["EM_ROTA", "EM ROTA", quantidadeEmRota],
          ["A_FECHAR", "A FECHAR", quantidadeFechamento],
        ] as const).map(([tipo, rotulo, valor]) => (
          <button
            key={tipo}
            type="button"
            aria-pressed={filtro === tipo}
            aria-controls="lista-outras-cargas"
            aria-label={`Filtrar por ${rotulo.toLowerCase()}, ${valor} carga(s)`}
            onClick={() => { setFiltro(tipo); setLimite(LOTE); }}
            className={`min-w-0 rounded-xl border px-1 py-2.5 text-center shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${filtro === tipo ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-500" : "border-emerald-100 bg-white hover:bg-emerald-50"}`}
          >
            <p className="text-lg font-black tabular-nums text-emerald-800">{valor}</p>
            <p className="mt-1 text-[8px] font-extrabold tracking-wide text-slate-600">{rotulo}</p>
          </button>
        ))}
      </div>

      {/* V93: pendencias de recebimento visiveis antes de iniciar uma operacao. */}
      {aguardandoBipagem > 0 && (
        <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
          <strong>{aguardandoBipagem} carga(s) aguardando recebimento.</strong> Ao escolher uma delas, o aplicativo abre a conferência física antes da jornada.
        </div>
      )}

      {atual && (
        <section aria-label="Carga selecionada" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700">Carga em operação</p>
              <p className="text-base font-black text-emerald-950">Carga nº {atual.id}</p>
              <p className="break-all text-[11px] text-emerald-800">{atual.codigo}</p>
            </div>
            <span className="rounded-full bg-emerald-700 px-2.5 py-1 text-[10px] font-bold text-white">Selecionada</span>
          </div>
          {!atualNoFiltro && (
            <p className="mt-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[10px] leading-relaxed text-emerald-900">
              Esta carga permanece visível por estar em operação, mas não corresponde ao filtro ou à busca.
            </p>
          )}
          {atual.fechamentoPendente && !atual.conferenciaPendente && (
            <p role="status" className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-[11px] font-semibold text-amber-950">Rota finalizada · fechamento pendente</p>
          )}
          <Link href={atual.conferenciaPendente ? "/mobile/carga/receber" : atual.fechamentoPendente ? "/mobile/carga/fechar" : "/mobile/carga"}
            className="mt-3 block rounded-xl bg-emerald-800 px-4 py-3 text-center text-xs font-black text-white">
            {atual.conferenciaPendente ? "Receber volumes" : atual.fechamentoPendente ? "Revisar fechamento" : "Continuar nesta carga"}
          </Link>
        </section>
      )}

      {rotaEmAndamento && (
        <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
          <strong>Rota ativa ou planejada:</strong> {rotaEmAndamento.codigo} (carga nº {rotaEmAndamento.cargaId}).
          {bloqueioRota ? " O banco pode impedir a troca até a rota ser encerrada." : " Para trocar de carga, conclua a rota vinculada quando necessário."}
        </div>
      )}

      <div className="rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
        <label htmlFor="busca-carga" className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
          Localizar carga por número ou código
        </label>
        <input
          id="busca-carga"
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
          const rotaEmOutraCarga = rotaEmAndamento && rotaEmAndamento.cargaId !== carga.id;
          const saldoAtual = saldosDisponiveis ? saldo(carga) : null;
          return (
            <form
              key={carga.id}
              action={escolherCargaMobile}
              onSubmit={(event) => {
                if (!conectado || !navigator.onLine) {
                  event.preventDefault();
                  setConectado(false);
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
                <Link href={carga.conferenciaPendente ? "/mobile/carga/receber" : "/mobile/carga"} className="mt-3 block rounded-xl bg-emerald-800 px-4 py-3 text-center text-xs font-black text-white">
                  {carga.conferenciaPendente ? `Receber volumes da carga nº ${carga.id}` : `Continuar com a carga nº ${carga.id}`}
                </Link>
              ) : (
                <BotaoEscolherCarga
                  id={carga.id}
                  rotaBloqueada={Boolean(rotaEmOutraCarga)}
                  conferenciaPendente={carga.conferenciaPendente}
                  conectado={conectado}
                />
              )}
              {carga.conferenciaPendente && !rotaEmOutraCarga && (
                <p className="mt-2 text-[10px] leading-relaxed text-amber-800">
                  Conferência física obrigatória: os volumes precisam ser bipados antes de iniciar a jornada.
                </p>
              )}
              {rotaEmOutraCarga && (
                <p className="mt-2 text-[10px] leading-relaxed text-amber-800">
                  Há uma rota ativa/planejada vinculada à carga nº {rotaEmAndamento.cargaId}. Finalize-a antes de escolher esta carga.
                </p>
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
