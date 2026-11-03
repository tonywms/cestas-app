export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  History,
  Search,
  ShieldCheck,
} from "lucide-react";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

import EstornoFinanceiroClient from "./EstornoFinanceiroClient";

/* V70_1_ESTORNOS_DENSIDADE */
/* V71_FINANCEIRO_LEAST_PRIVILEGE */

const PAGE_SIZE = 24;
const HISTORY_PAGE_SIZE = 20;

type Movimento = {
  tipo_origem: "PAGAMENTO_PARCELA" | "RECEBIMENTO_CLIENTE";
  origem_id: number;
  cliente_id: number;
  cliente_nome: string;
  cliente_codigo: string;
  valor: number;
  forma_pagamento: string;
  recebido_por_original: string;
  recebido_por_nome: string | null;
  origem_created_at: string;
  referencia: string;
  fechamento_protegido: boolean;
};

type MovimentosPayload = {
  items?: Movimento[];
  total?: number;
  offset?: number;
  limit?: number;
  summary?: {
    disponiveis?: number;
    valor_disponivel?: number;
    protegidos?: number;
    liberados?: number;
  };
};

type SearchParams = Promise<{
  pagina?: string;
  historico?: string;
  busca?: string;
  situacao?: string;
  tipo?: string;
}>;

function moeda(valor: unknown) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor ?? 0));
}

function dataHora(valor: unknown) {
  if (!valor) return "—";
  const data = new Date(String(valor));
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleString("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formaLabel(valor: string) {
  if (valor === "DINHEIRO") return "Dinheiro";
  if (valor === "PIX") return "PIX";
  if (valor === "CARTAO") return "Cartão";
  if (valor === "TRANSFERENCIA") return "Transferência";
  return "Outro";
}

function tipoLabel(valor: string) {
  return valor === "RECEBIMENTO_CLIENTE"
    ? "Recebimento do cliente"
    : "Pagamento de parcela";
}

function inteiroPagina(valor: string | undefined) {
  const numero = Number(valor ?? 1);
  return Number.isInteger(numero) && numero > 0 ? numero : 1;
}

function situacaoValida(valor: string | undefined) {
  const normalizado = String(valor ?? "TODOS").toUpperCase();
  return ["TODOS", "LIBERADOS", "PROTEGIDOS"].includes(normalizado)
    ? normalizado
    : "TODOS";
}

function tipoValido(valor: string | undefined) {
  const normalizado = String(valor ?? "TODOS").toUpperCase();
  return ["TODOS", "RECEBIMENTOS", "PAGAMENTOS"].includes(normalizado)
    ? normalizado
    : "TODOS";
}

function criarUrl(
  pagina: number,
  historico: number,
  busca: string,
  situacao: string,
  tipo: string,
) {
  const params = new URLSearchParams();
  if (pagina > 1) params.set("pagina", String(pagina));
  if (historico > 1) params.set("historico", String(historico));
  if (busca) params.set("busca", busca);
  if (situacao !== "TODOS") params.set("situacao", situacao);
  if (tipo !== "TODOS") params.set("tipo", tipo);
  const query = params.toString();
  return `/admin/financeiro/estornos${query ? `?${query}` : ""}`;
}

function paginasVisiveis(atual: number, total: number) {
  const inicio = Math.max(1, Math.min(atual - 2, total - 4));
  const fim = Math.min(total, Math.max(5, atual + 2));
  return Array.from(
    { length: Math.max(0, fim - inicio + 1) },
    (_, index) => inicio + index,
  );
}

export default async function EstornosFinanceirosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const usuario = await getCurrentUserProfile();

  if (!usuario || !usuario.ativo) {
    redirect("/");
  }

  const podeAuditar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.FINANCEIRO_AUDITAR,
    ) ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.FINANCEIRO_ESTORNAR,
    );

  const podeEstornar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.FINANCEIRO_ESTORNAR,
    );

  if (!podeAuditar) {
    redirect("/admin");
  }

  const query = await searchParams;
  const pagina = inteiroPagina(query.pagina);
  const paginaHistorico = inteiroPagina(query.historico);
  const busca = String(query.busca ?? "").trim().slice(0, 80);
  const situacao = situacaoValida(query.situacao);
  const tipo = tipoValido(query.tipo);
  const offset = (pagina - 1) * PAGE_SIZE;
  const historyFrom = (paginaHistorico - 1) * HISTORY_PAGE_SIZE;
  const historyTo = historyFrom + HISTORY_PAGE_SIZE - 1;

  const supabase = await createClient();

  const [movimentosResult, estornosResult] = await Promise.all([
    supabase.rpc("listar_movimentos_estornaveis_v70_1", {
      p_empresa_id: usuario.empresa.id,
      p_offset: offset,
      p_limite: PAGE_SIZE,
      p_busca: busca || null,
      p_situacao: situacao,
      p_tipo: tipo,
    }),
    supabase
      .from("financeiro_estornos")
      .select(
        "id, tipo_origem, origem_id, cliente_id, valor, forma_pagamento, motivo, estornado_por, created_at",
        { count: "exact" },
      )
      .eq("empresa_id", usuario.empresa.id)
      .order("created_at", { ascending: false })
      .range(historyFrom, historyTo),
  ]);

  if (movimentosResult.error) {
    throw new Error(
      movimentosResult.error.message ||
        "Não foi possível carregar os movimentos estornáveis.",
    );
  }

  const payload = (movimentosResult.data ?? {}) as MovimentosPayload;
  const movimentos = Array.isArray(payload.items) ? payload.items : [];
  const totalFiltrado = Number(payload.total ?? 0);
  const resumo = payload.summary ?? {};
  const disponiveis = Number(resumo.disponiveis ?? 0);
  const valorDisponivel = Number(resumo.valor_disponivel ?? 0);
  const protegidos = Number(resumo.protegidos ?? 0);
  const liberados = Number(resumo.liberados ?? 0);

  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / PAGE_SIZE));
  const paginaSegura = Math.min(pagina, totalPaginas);

  if (pagina !== paginaSegura && totalFiltrado > 0) {
    redirect(criarUrl(paginaSegura, paginaHistorico, busca, situacao, tipo));
  }

  const estornos = estornosResult.data ?? [];
  const totalHistorico = Number(estornosResult.count ?? 0);
  const totalPaginasHistorico = Math.max(
    1,
    Math.ceil(totalHistorico / HISTORY_PAGE_SIZE),
  );
  const paginaHistoricoSegura = Math.min(
    paginaHistorico,
    totalPaginasHistorico,
  );

  if (paginaHistorico !== paginaHistoricoSegura && totalHistorico > 0) {
    redirect(criarUrl(pagina, paginaHistoricoSegura, busca, situacao, tipo));
  }

  const clienteIds = Array.from(
    new Set(estornos.map((item) => Number(item.cliente_id)).filter(Boolean)),
  );
  const usuarioIds = Array.from(
    new Set(estornos.map((item) => String(item.estornado_por)).filter(Boolean)),
  );

  const [clientesResult, usuariosResult] = await Promise.all([
    clienteIds.length > 0
      ? supabase
          .from("clientes")
          .select("id, nome, codigo")
          .eq("empresa_id", usuario.empresa.id)
          .in("id", clienteIds)
      : Promise.resolve({ data: [] as Array<{ id: number; nome: string; codigo: string }> }),
    usuarioIds.length > 0
      ? supabase
          .from("usuarios")
          .select("id, nome")
          .in("id", usuarioIds)
      : Promise.resolve({ data: [] as Array<{ id: string; nome: string }> }),
  ]);

  const clientesMap = new Map(
    (clientesResult.data ?? []).map((item) => [
      Number(item.id),
      { nome: String(item.nome), codigo: String(item.codigo) },
    ]),
  );
  const usuariosMap = new Map(
    (usuariosResult.data ?? []).map((item) => [
      String(item.id),
      String(item.nome),
    ]),
  );

  const estornadoPagina = estornos.reduce(
    (total, item) => total + Number(item.valor ?? 0),
    0,
  );

  const filtroAtivo = Boolean(
    busca || situacao !== "TODOS" || tipo !== "TODOS",
  );

  return (
    <main className="app-premium min-h-screen bg-[#f4f8f5] px-4 py-5 text-[#142018] md:px-6 md:py-7">
      <div className="mx-auto w-full max-w-[1780px]">
        <header className="flex flex-col gap-4 rounded-[24px] border border-black/[0.04] bg-white px-5 py-4 shadow-[0_12px_34px_rgba(18,63,34,0.06)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/admin/financeiro"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-emerald-50 text-emerald-700"
              aria-label="Voltar ao financeiro"
            >
              <ArrowLeft size={19} />
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.19em] text-[#b07a12]">
                Governança financeira
              </p>
              <h1 className="mt-1 text-[22px] font-black tracking-[-0.04em] sm:text-[28px]">
                Estornos financeiros
              </h1>
            </div>
          </div>

          <Link
            href="/admin/financeiro/consistencia"
            className="flex h-11 items-center justify-center gap-2 rounded-[15px] border border-emerald-200 bg-white px-5 text-[12px] font-black text-emerald-800"
          >
            <ShieldCheck size={16} />
            Certificação QA
          </Link>
        </header>

        <section className="relative mt-4 overflow-hidden rounded-[28px] bg-[linear-gradient(115deg,#197b43,#0c522b_62%,#083c23)] p-5 text-white shadow-[0_20px_55px_rgba(12,82,43,0.2)] md:p-6">
          <div className="relative">
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-100">
              <CircleDollarSign size={17} />
              Correção com rastreabilidade
            </p>
            <div className="mt-2 flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <h2 className="text-[27px] font-black tracking-[-0.05em] md:text-[34px]">
                  Preserve o histórico. Corrija o financeiro.
                </h2>
                <p className="mt-1 max-w-4xl text-[13px] leading-5 text-emerald-50/80">
                  Lançamentos originais permanecem preservados. Estornos são
                  auditáveis, protegidos contra duplicidade e bloqueados quando
                  o período já estiver em prestação de contas fechada.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-black text-emerald-50">
                {disponiveis} movimento(s) elegível(is)
              </span>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Disponíveis", disponiveis],
                ["Valor disponível", moeda(valorDisponivel)],
                ["Liberados", liberados],
                ["Protegidos", protegidos],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="min-w-0 rounded-[17px] border border-white/10 bg-white/[0.075] px-4 py-3"
                >
                  <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100/65">
                    {label}
                  </p>
                  <p className="mt-1 truncate text-[21px] font-black">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[24px] border border-black/[0.04] bg-white p-4 shadow-[0_12px_34px_rgba(18,63,34,0.05)]">
          <form method="get" className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_210px_210px_auto] xl:items-end">
            <label className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
                Buscar movimento
              </span>
              <div className="mt-1.5 flex h-11 items-center gap-2 rounded-[14px] border border-slate-200 bg-[#f8faf9] px-3 focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-50">
                <Search size={16} className="shrink-0 text-slate-400" />
                <input
                  name="busca"
                  defaultValue={busca}
                  maxLength={80}
                  placeholder="Cliente, código, referência ou usuário"
                  className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            <label>
              <span className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
                Situação
              </span>
              <select
                name="situacao"
                defaultValue={situacao}
                className="mt-1.5 h-11 w-full rounded-[14px] border border-slate-200 bg-[#f8faf9] px-3 text-[12px] font-black outline-none focus:border-emerald-300"
              >
                <option value="TODOS">Todos</option>
                <option value="LIBERADOS">Liberados para estorno</option>
                <option value="PROTEGIDOS">Fechamento protegido</option>
              </select>
            </label>

            <label>
              <span className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
                Tipo
              </span>
              <select
                name="tipo"
                defaultValue={tipo}
                className="mt-1.5 h-11 w-full rounded-[14px] border border-slate-200 bg-[#f8faf9] px-3 text-[12px] font-black outline-none focus:border-emerald-300"
              >
                <option value="TODOS">Todos os tipos</option>
                <option value="RECEBIMENTOS">Recebimentos</option>
                <option value="PAGAMENTOS">Pagamentos de parcela</option>
              </select>
            </label>

            <div className="flex gap-2">
              {filtroAtivo ? (
                <Link
                  href="/admin/financeiro/estornos"
                  className="flex h-11 items-center justify-center rounded-[14px] border border-slate-200 bg-white px-4 text-[11px] font-black text-slate-500"
                >
                  Limpar
                </Link>
              ) : null}
              <button
                type="submit"
                className="flex h-11 flex-1 items-center justify-center rounded-[14px] bg-[#176f3c] px-5 text-[11px] font-black text-white xl:flex-none"
              >
                Aplicar filtros
              </button>
            </div>
          </form>
        </section>

        <section className="mt-5">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#b07a12]">
                Movimentos elegíveis
              </p>
              <h2 className="mt-1 text-[23px] font-black tracking-[-0.04em]">
                Revisar antes de estornar
              </h2>
            </div>
            <p className="text-[11px] font-bold text-slate-400">
              {totalFiltrado === 0
                ? "Nenhum registro encontrado"
                : `${offset + 1}–${Math.min(offset + movimentos.length, totalFiltrado)} de ${totalFiltrado}`}
            </p>
          </div>

          <EstornoFinanceiroClient
            movimentos={movimentos}
            podeEstornar={podeEstornar}
          />

          {totalPaginas > 1 ? (
            <nav
              aria-label="Paginação dos movimentos elegíveis"
              className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-black/[0.04] bg-white px-4 py-3"
            >
              <Link
                aria-disabled={pagina <= 1}
                href={criarUrl(Math.max(1, pagina - 1), paginaHistorico, busca, situacao, tipo)}
                className={`flex h-9 items-center gap-1 rounded-[12px] px-3 text-[11px] font-black ${
                  pagina <= 1
                    ? "pointer-events-none text-slate-300"
                    : "border border-slate-200 text-slate-600"
                }`}
              >
                <ChevronLeft size={15} />
                Anterior
              </Link>

              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {paginasVisiveis(pagina, totalPaginas).map((numero) => (
                  <Link
                    key={numero}
                    href={criarUrl(numero, paginaHistorico, busca, situacao, tipo)}
                    className={`flex h-9 min-w-9 items-center justify-center rounded-[11px] px-2 text-[11px] font-black ${
                      numero === pagina
                        ? "bg-[#176f3c] text-white"
                        : "border border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    {numero}
                  </Link>
                ))}
              </div>

              <Link
                aria-disabled={pagina >= totalPaginas}
                href={criarUrl(Math.min(totalPaginas, pagina + 1), paginaHistorico, busca, situacao, tipo)}
                className={`flex h-9 items-center gap-1 rounded-[12px] px-3 text-[11px] font-black ${
                  pagina >= totalPaginas
                    ? "pointer-events-none text-slate-300"
                    : "border border-slate-200 text-slate-600"
                }`}
              >
                Próxima
                <ChevronRight size={15} />
              </Link>
            </nav>
          ) : null}
        </section>

        <section className="mt-6 rounded-[24px] border border-black/[0.04] bg-white p-4 shadow-[0_12px_34px_rgba(18,63,34,0.05)] md:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-emerald-50 text-emerald-700">
                <History size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b07a12]">
                  Histórico imutável
                </p>
                <h2 className="mt-0.5 text-[20px] font-black tracking-[-0.035em]">
                  Estornos registrados
                </h2>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400">
              {totalHistorico} registro(s) • {moeda(estornadoPagina)} nesta página
            </p>
          </div>

          {estornos.length === 0 ? (
            <div className="mt-4 rounded-[16px] bg-[#f5f8f6] px-4 py-4 text-[12px] text-slate-500">
              Nenhum estorno financeiro registrado até o momento.
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-[17px] border border-slate-100">
              <div className="hidden grid-cols-[minmax(180px,1.15fr)_minmax(140px,.8fr)_130px_minmax(220px,1.5fr)_150px] gap-3 bg-[#f5f8f6] px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 xl:grid">
                <span>Cliente / movimento</span>
                <span>Responsável</span>
                <span>Valor</span>
                <span>Motivo</span>
                <span className="text-right">Data / hora</span>
              </div>

              <div className="divide-y divide-slate-100">
                {estornos.map((estorno) => {
                  const cliente = clientesMap.get(Number(estorno.cliente_id));
                  return (
                    <article
                      key={estorno.id}
                      className="grid min-w-0 gap-2 px-4 py-3 xl:grid-cols-[minmax(180px,1.15fr)_minmax(140px,.8fr)_130px_minmax(220px,1.5fr)_150px] xl:items-center xl:gap-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-black text-slate-800">
                          {cliente?.nome ?? "Cliente"}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] font-bold text-slate-400">
                          {tipoLabel(String(estorno.tipo_origem))} • {cliente?.codigo ?? "—"}
                        </p>
                      </div>
                      <p className="truncate text-[11px] font-bold text-slate-600">
                        {usuariosMap.get(String(estorno.estornado_por)) ?? "Usuário"}
                      </p>
                      <p className="text-[12px] font-black text-amber-800">
                        - {moeda(estorno.valor)}
                      </p>
                      <p
                        title={String(estorno.motivo)}
                        className="truncate text-[11px] text-slate-500"
                      >
                        {String(estorno.motivo)}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 xl:text-right">
                        {dataHora(estorno.created_at)}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {totalPaginasHistorico > 1 ? (
            <div className="mt-3 flex items-center justify-end gap-2">
              <Link
                href={criarUrl(pagina, Math.max(1, paginaHistorico - 1), busca, situacao, tipo)}
                className={`flex h-9 items-center gap-1 rounded-[11px] border px-3 text-[10px] font-black ${
                  paginaHistorico <= 1
                    ? "pointer-events-none border-slate-100 text-slate-300"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                <ChevronLeft size={14} />
                Anterior
              </Link>
              <span className="text-[10px] font-black text-slate-400">
                {paginaHistorico} / {totalPaginasHistorico}
              </span>
              <Link
                href={criarUrl(pagina, Math.min(totalPaginasHistorico, paginaHistorico + 1), busca, situacao, tipo)}
                className={`flex h-9 items-center gap-1 rounded-[11px] border px-3 text-[10px] font-black ${
                  paginaHistorico >= totalPaginasHistorico
                    ? "pointer-events-none border-slate-100 text-slate-300"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                Próxima
                <ChevronRight size={14} />
              </Link>
            </div>
          ) : null}
        </section>

        <div className="mt-5 flex items-start gap-3 rounded-[18px] border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-[11px] leading-5 text-emerald-900/75">
          <ShieldCheck className="mt-0.5 shrink-0" size={16} />
          <p>
            Entradas registradas durante a venda permanecem fora deste módulo.
            Elas pertencem ao ciclo completo da venda para impedir reversões
            parciais de estoque, entrega e contrato.
          </p>
        </div>
      </div>
    </main>
  );
}
