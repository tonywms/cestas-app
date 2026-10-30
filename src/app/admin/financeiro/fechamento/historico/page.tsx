export const instant = false;

import {
  AlertTriangle,
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  History,
  RefreshCcw,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import RelatorioExportActions from "../../../relatorios/RelatorioExportActions";

type PageProps = {
  searchParams: Promise<{
    inicio?: string;
    fim?: string;
    status?: string;
    entregador?: string;
  }>;
};

type FechamentoRow = {
  id: number;
  entregador_id: string;
  data_inicio: string;
  data_fim: string;
  status: string;
  recebido_esperado: number | null;
  dinheiro_conferido: number | null;
  pix_conferido: number | null;
  cartao_conferido: number | null;
  transferencia_conferida: number | null;
  outro_conferido: number | null;
  diferenca_total: number | null;
  observacao: string | null;
  conferido_por: string | null;
  conferido_at: string | null;
  created_at: string;
};

function hojeFortaleza() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const mapa = new Map(partes.map((parte) => [parte.type, parte.value]));

  return `${mapa.get("year")}-${mapa.get("month")}-${mapa.get("day")}`;
}

function dataValida(valor?: string) {
  return Boolean(valor && /^\d{4}-\d{2}-\d{2}$/.test(valor));
}

function dataBR(valor: string) {
  const [ano, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${ano}`;
}

function periodoBR(inicio: string, fim: string) {
  return inicio === fim ? dataBR(inicio) : `${dataBR(inicio)} a ${dataBR(fim)}`;
}

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function dataHoraBR(valor?: string | null) {
  if (!valor) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(new Date(valor));
}

function numero(valor: unknown) {
  const convertido = Number(valor ?? 0);
  return Number.isFinite(convertido) ? convertido : 0;
}

function statusLabel(status: string) {
  return status === "CONFERIDO" ? "Conferido" : "Com divergência";
}

export default async function HistoricoPrestacoesPage({
  searchParams,
}: PageProps) {
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
    redirect("/admin");
  }

  const params = await searchParams;
  const hoje = hojeFortaleza();
  const inicioPadrao = `${hoje.slice(0, 8)}01`;

  let dataInicio = dataValida(params.inicio)
    ? String(params.inicio)
    : inicioPadrao;

  let dataFim = dataValida(params.fim)
    ? String(params.fim)
    : hoje;

  if (dataInicio > dataFim) {
    [dataInicio, dataFim] = [dataFim, dataInicio];
  }

  const statusFiltro =
    params.status === "CONFERIDO" ||
    params.status === "COM_DIVERGENCIA"
      ? params.status
      : "TODOS";

  const supabase = await createClient();

  let fechamentosQuery = supabase
    .from("fechamentos_entregador")
    .select(
      "id, entregador_id, data_inicio, data_fim, status, recebido_esperado, dinheiro_conferido, pix_conferido, cartao_conferido, transferencia_conferida, outro_conferido, diferenca_total, observacao, conferido_por, conferido_at, created_at",
    )
    .eq("empresa_id", usuario.empresa.id)
    .lte("data_inicio", dataFim)
    .gte("data_fim", dataInicio)
    .order("conferido_at", { ascending: false })
    .limit(1000);

  if (statusFiltro !== "TODOS") {
    fechamentosQuery = fechamentosQuery.eq("status", statusFiltro);
  }

  const fechamentosResult = await fechamentosQuery;
  let fechamentos = (fechamentosResult.data ?? []) as FechamentoRow[];

  const entregadorIds = Array.from(
    new Set(fechamentos.map((item) => String(item.entregador_id))),
  );

  const conferidorIds = Array.from(
    new Set(
      fechamentos
        .map((item) => item.conferido_por)
        .filter(Boolean)
        .map((item) => String(item)),
    ),
  );

  const usuarioIds = Array.from(
    new Set([...entregadorIds, ...conferidorIds]),
  );

  const usuariosResult =
    usuarioIds.length > 0
      ? await supabase
          .from("usuarios")
          .select("id, nome, email")
          .in("id", usuarioIds)
      : { data: [] as Array<{ id: string; nome: string; email: string | null }> };

  const usuarioMap = new Map(
    (usuariosResult.data ?? []).map((item) => [String(item.id), item]),
  );

  const entregadoresFiltro = entregadorIds
    .map((id) => ({
      id,
      nome: usuarioMap.get(id)?.nome ?? "Entregador",
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const entregadorFiltro =
    params.entregador &&
    entregadoresFiltro.some((item) => item.id === params.entregador)
      ? params.entregador
      : "TODOS";

  if (entregadorFiltro !== "TODOS") {
    fechamentos = fechamentos.filter(
      (item) => String(item.entregador_id) === entregadorFiltro,
    );
  }

  const linhas = fechamentos.map((item) => {
    const totalConferido =
      numero(item.dinheiro_conferido) +
      numero(item.pix_conferido) +
      numero(item.cartao_conferido) +
      numero(item.transferencia_conferida) +
      numero(item.outro_conferido);

    return {
      ...item,
      entregadorNome:
        usuarioMap.get(String(item.entregador_id))?.nome ?? "Entregador",
      conferidoPorNome:
        item.conferido_por
          ? usuarioMap.get(String(item.conferido_por))?.nome ?? "Usuário"
          : "—",
      totalConferido,
    };
  });

  const totalEsperado = linhas.reduce(
    (acc, item) => acc + numero(item.recebido_esperado),
    0,
  );

  const totalConferido = linhas.reduce(
    (acc, item) => acc + item.totalConferido,
    0,
  );

  const totalDiferenca = linhas.reduce(
    (acc, item) => acc + numero(item.diferenca_total),
    0,
  );

  const conferidos = linhas.filter(
    (item) => item.status === "CONFERIDO",
  ).length;

  const divergentes = linhas.filter(
    (item) => item.status === "COM_DIVERGENCIA",
  ).length;

  const periodoFiltro = periodoBR(dataInicio, dataFim);

  const linhasExportacao = linhas.map((item) => ({
    periodo: periodoBR(item.data_inicio, item.data_fim),
    entregador: item.entregadorNome,
    status: statusLabel(item.status),
    esperado: moeda(numero(item.recebido_esperado)),
    conferido: moeda(item.totalConferido),
    diferenca: moeda(numero(item.diferenca_total)),
    conferidoPor: item.conferidoPorNome,
    conferidoEm: dataHoraBR(item.conferido_at),
    observacao: item.observacao ?? "",
  }));

  return (
    <main className="app-premium min-h-screen px-4 py-6 text-[#142018] md:px-6 md:py-8">
      <div className="mx-auto max-w-[1260px]">
        <header className="glass flex items-center justify-between gap-4 rounded-[28px] px-5 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/financeiro/fechamento"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-[#176f3c]"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#b07a12]">
                Financeiro operacional
              </p>
              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Histórico de prestações
              </h1>
            </div>
          </div>

          <RelatorioExportActions
            nomeArquivo={`historico_prestacoes_${dataInicio}_${dataFim}`}
            titulo="Histórico de prestações de contas"
            subtitulo={`${usuario.empresa.nomeFantasia} • ${periodoFiltro}`}
            colunas={[
              { chave: "periodo", titulo: "Período" },
              { chave: "entregador", titulo: "Entregador" },
              { chave: "status", titulo: "Status" },
              { chave: "esperado", titulo: "Esperado" },
              { chave: "conferido", titulo: "Conferido" },
              { chave: "diferenca", titulo: "Diferença" },
              { chave: "conferidoPor", titulo: "Conferido por" },
              { chave: "conferidoEm", titulo: "Conferido em" },
              { chave: "observacao", titulo: "Observação" },
            ]}
            linhas={linhasExportacao}
            resumo={[
              { label: "Período consultado", valor: periodoFiltro },
              { label: "Prestações", valor: linhas.length },
              { label: "Conferidas", valor: conferidos },
              { label: "Com divergência", valor: divergentes },
              { label: "Esperado", valor: moeda(totalEsperado) },
              { label: "Diferença líquida", valor: moeda(totalDiferenca) },
            ]}
          />
        </header>

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.035]" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
              <History size={16} />
              Rastreabilidade financeira
            </div>

            <h2 className="mt-4 text-[32px] font-black tracking-[-0.055em]">
              Tudo o que já foi conferido
              <span className="text-[#f4b13f]">.</span>
            </h2>

            <p className="mt-3 max-w-3xl text-[11px] leading-6 text-white/65">
              Consulte prestações antigas, identifique divergências, veja quem realizou a conferência e abra qualquer período para revisão.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi label="Prestações" valor={String(linhas.length)} />
              <Kpi label="Conferidas" valor={String(conferidos)} />
              <Kpi
                label="Divergências"
                valor={String(divergentes)}
                alerta={divergentes > 0}
              />
              <Kpi label="Esperado" valor={moeda(totalEsperado)} />
            </div>
          </div>
        </section>

        <section className="card-premium mt-5 rounded-[30px] p-5">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
            <Filter size={15} />
            Filtros
          </div>

          <form className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1.3fr_1.2fr_auto]">
            <label>
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Data inicial
              </span>
              <input
                name="inicio"
                type="date"
                defaultValue={dataInicio}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 px-3 text-[10px] font-semibold"
              />
            </label>

            <label>
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Data final
              </span>
              <input
                name="fim"
                type="date"
                defaultValue={dataFim}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 px-3 text-[10px] font-semibold"
              />
            </label>

            <label>
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Entregador
              </span>
              <select
                name="entregador"
                defaultValue={entregadorFiltro}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[10px] font-semibold"
              >
                <option value="TODOS">Todos os entregadores</option>
                {entregadoresFiltro.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Status
              </span>
              <select
                name="status"
                defaultValue={statusFiltro}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[10px] font-semibold"
              >
                <option value="TODOS">Todos</option>
                <option value="CONFERIDO">Conferidos</option>
                <option value="COM_DIVERGENCIA">Com divergência</option>
              </select>
            </label>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex h-11 items-center gap-2 rounded-[14px] bg-[#176f3c] px-4 text-[9px] font-black text-white"
              >
                <Filter size={14} />
                Aplicar
              </button>

              <Link
                href="/admin/financeiro/fechamento/historico"
                className="flex h-11 items-center gap-2 rounded-[14px] border border-slate-200 bg-white px-4 text-[9px] font-black text-slate-500"
              >
                <RefreshCcw size={14} />
                Limpar
              </Link>
            </div>
          </form>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniCard
            icon={<CheckCircle2 size={17} />}
            label="Conferidas"
            valor={String(conferidos)}
          />
          <MiniCard
            icon={<AlertTriangle size={17} />}
            label="Divergências"
            valor={String(divergentes)}
            alerta={divergentes > 0}
          />
          <MiniCard
            icon={<CalendarRange size={17} />}
            label="Total conferido"
            valor={moeda(totalConferido)}
          />
          <MiniCard
            icon={<History size={17} />}
            label="Diferença líquida"
            valor={moeda(totalDiferenca)}
            alerta={Math.abs(totalDiferenca) >= 0.01}
          />
        </section>

        <section className="card-premium mt-5 rounded-[30px] p-5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
              Histórico
            </p>
            <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
              Prestações registradas
            </h3>
            <p className="mt-1 text-[8px] text-slate-400">
              Registros salvos formalmente pelo financeiro, gestor ou administrador.
            </p>
          </div>

          <div className="mt-5 overflow-hidden rounded-[20px] border border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1220px] border-collapse text-center">
                <thead className="bg-[#f6f9f6]">
                  <tr>
                    {[
                      "Período",
                      "Entregador",
                      "Status",
                      "Esperado",
                      "Conferido",
                      "Diferença",
                      "Conferido por",
                      "Data / hora",
                      "Ação",
                    ].map((titulo) => (
                      <th
                        key={titulo}
                        className="whitespace-nowrap px-3 py-3 text-[7px] font-black uppercase tracking-[0.1em] text-slate-400"
                      >
                        {titulo}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {linhas.map((item) => {
                    const diferenca = numero(item.diferenca_total);

                    return (
                      <tr
                        key={item.id}
                        className="border-t border-slate-100 bg-white hover:bg-[#fbfdfb]"
                      >
                        <td className="whitespace-nowrap px-3 py-4 text-[8px] font-black text-slate-600">
                          {periodoBR(item.data_inicio, item.data_fim)}
                        </td>

                        <td className="px-3 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                              <UserRound size={13} />
                            </div>
                            <span className="text-[9px] font-black">
                              {item.entregadorNome}
                            </span>
                          </div>
                        </td>

                        <td className="px-3 py-4">
                          <span
                            className={
                              item.status === "CONFERIDO"
                                ? "inline-flex h-8 min-w-[100px] items-center justify-center rounded-[11px] bg-emerald-100 px-3 text-[7px] font-black uppercase text-emerald-700"
                                : "inline-flex h-8 min-w-[100px] items-center justify-center rounded-[11px] bg-red-100 px-3 text-[7px] font-black uppercase text-red-700"
                            }
                          >
                            {statusLabel(item.status)}
                          </span>
                        </td>

                        <Valor valor={numero(item.recebido_esperado)} />
                        <Valor valor={item.totalConferido} destaque />
                        <Valor
                          valor={diferenca}
                          alerta={Math.abs(diferenca) >= 0.01}
                        />

                        <td className="px-3 py-4 text-[8px] font-bold text-slate-600">
                          {item.conferidoPorNome}
                        </td>

                        <td className="px-3 py-4">
                          <div className="flex items-center justify-center gap-1.5 text-[7px] text-slate-500">
                            <Clock3 size={11} />
                            {dataHoraBR(item.conferido_at)}
                          </div>
                        </td>

                        <td className="px-3 py-4">
                          <Link
                            href={`/admin/financeiro/fechamento/${item.entregador_id}?inicio=${item.data_inicio}&fim=${item.data_fim}`}
                            className="inline-flex h-9 min-w-[88px] items-center justify-center gap-2 rounded-[12px] bg-[#176f3c] px-3 text-[7px] font-black text-white"
                          >
                            <Eye size={12} />
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    );
                  })}

                  {linhas.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-5 py-14 text-center text-[10px] text-slate-400"
                      >
                        Nenhuma prestação de contas encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-3 text-[7px] text-slate-400">
            A diferença líquida pode compensar valores positivos e negativos entre registros. Para investigar inconsistências, use o filtro “Com divergência”.
          </p>
        </section>
      </div>
    </main>
  );
}

function Kpi({
  label,
  valor,
  alerta = false,
}: {
  label: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <div
      className={
        alerta
          ? "rounded-[19px] border border-red-400/40 bg-red-400/[0.10] px-4 py-3.5"
          : "rounded-[19px] border border-white/10 bg-white/[0.07] px-4 py-3.5"
      }
    >
      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>
      <p
        className={
          alerta
            ? "mt-1.5 text-[18px] font-black text-red-200"
            : "mt-1.5 text-[18px] font-black text-white"
        }
      >
        {valor}
      </p>
    </div>
  );
}

function MiniCard({
  icon,
  label,
  valor,
  alerta = false,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <div
      className={
        alerta
          ? "rounded-[24px] border border-red-100 bg-red-50/50 p-5"
          : "card-premium rounded-[24px] p-5"
      }
    >
      <div className={alerta ? "text-red-600" : "text-emerald-700"}>
        {icon}
      </div>
      <p className="mt-4 text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p
        className={
          alerta
            ? "mt-2 text-[18px] font-black text-red-700"
            : "mt-2 text-[18px] font-black"
        }
      >
        {valor}
      </p>
    </div>
  );
}

function Valor({
  valor,
  destaque = false,
  alerta = false,
}: {
  valor: number;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <td
      className={
        alerta
          ? "whitespace-nowrap px-3 py-4 text-[9px] font-black tabular-nums text-red-700"
          : destaque
            ? "whitespace-nowrap px-3 py-4 text-[9px] font-black tabular-nums text-emerald-700"
            : "whitespace-nowrap px-3 py-4 text-[8px] font-bold tabular-nums text-slate-600"
      }
    >
      {moeda(valor)}
    </td>
  );
}
