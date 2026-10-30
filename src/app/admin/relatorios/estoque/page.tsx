export const instant = false;

import {
  ArrowLeft,
  Boxes,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  PackageCheck,
  RotateCcw,
  Search,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import RelatorioExportActions from "../RelatorioExportActions";

type PageProps = {
  searchParams: Promise<{
    de?: string;
    ate?: string;
    movimento?: string;
    tipo?: string;
    busca?: string;
    pagina?: string;
  }>;
};

type Movimento = {
  id: number;
  tipo_cesta_id: number;
  carga_id: number | null;
  usuario_id: string | null;
  tipo_movimento: string;
  quantidade: number;
  referencia: string | null;
  observacao: string | null;
  created_at: string;
};

const POR_PAGINA = 50;

function dataIsoLocal(data: Date) {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatarDataHora(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(new Date(valor));
}

function rotuloMovimento(tipo: string) {
  const mapa: Record<string, string> = {
    ENTRADA_CENTRAL: "Entrada no central",
    AJUSTE_CENTRAL_ENTRADA: "Ajuste central entrada",
    AJUSTE_CENTRAL_SAIDA: "Ajuste central saída",
    SAIDA_CENTRAL_CARGA: "Carga para entregador",
    ENTRADA_CARGA: "Entrada no estoque móvel",
    SAIDA_CARGA_ENTREGA: "Entrega ao cliente",
    RETORNO_CARGA_CENTRAL: "Retorno ao central",
    AVARIA_CARGA: "Avaria",
  };

  return mapa[tipo] ?? tipo.replaceAll("_", " ");
}

function sinalMovimento(tipo: string) {
  if (
    tipo === "SAIDA_CENTRAL_CARGA" ||
    tipo === "SAIDA_CARGA_ENTREGA" ||
    tipo === "AJUSTE_CENTRAL_SAIDA" ||
    tipo === "AVARIA_CARGA"
  ) {
    return -1;
  }
  return 1;
}

function classeMovimento(tipo: string) {
  if (tipo === "SAIDA_CARGA_ENTREGA") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (tipo === "RETORNO_CARGA_CENTRAL") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (tipo === "AVARIA_CARGA") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (tipo.includes("ENTRADA")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function criarHref(
  params: Awaited<PageProps["searchParams"]>,
  pagina: number,
) {
  const qs = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    if (valor && chave !== "pagina") {
      qs.set(chave, valor);
    }
  }
  qs.set("pagina", String(pagina));
  return `/admin/relatorios/estoque?${qs.toString()}`;
}

export default async function RelatorioEstoquePage({
  searchParams,
}: PageProps) {
  const usuario = await getCurrentUserProfile();
  if (!usuario) redirect("/");

  const params = await searchParams;
  const hoje = new Date();
  const inicioPadrao = new Date();
  inicioPadrao.setDate(hoje.getDate() - 29);

  const de = params.de || dataIsoLocal(inicioPadrao);
  const ate = params.ate || dataIsoLocal(hoje);
  const movimento = params.movimento || "TODOS";
  const tipoFiltro = params.tipo || "TODOS";
  const busca = (params.busca || "").trim().toLowerCase();
  const pagina = Math.max(1, Number(params.pagina || 1) || 1);

  const supabase = await createClient();

  const [tiposResult, saldosResult, usuariosResult] = await Promise.all([
    supabase
      .from("tipos_cesta")
      .select("id, codigo, nome")
      .eq("empresa_id", usuario.empresa.id)
      .order("nome"),
    supabase
      .from("estoque_central_saldos")
      .select("tipo_cesta_id, quantidade")
      .eq("empresa_id", usuario.empresa.id),
    supabase
      .from("usuarios")
      .select("id, nome"),
  ]);

  const tipos = tiposResult.data ?? [];
  const tiposMap = new Map(
    tipos.map((item) => [
      Number(item.id),
      { nome: String(item.nome), codigo: String(item.codigo ?? "") },
    ]),
  );
  const usuariosMap = new Map(
    (usuariosResult.data ?? []).map((item) => [
      String(item.id),
      String(item.nome),
    ]),
  );

  let query = supabase
    .from("movimentacoes_estoque")
    .select(
      "id, tipo_cesta_id, carga_id, usuario_id, tipo_movimento, quantidade, referencia, observacao, created_at",
    )
    .eq("empresa_id", usuario.empresa.id)
    .gte("created_at", `${de}T00:00:00-03:00`)
    .lte("created_at", `${ate}T23:59:59.999-03:00`)
    .order("created_at", { ascending: false });

  if (movimento !== "TODOS") {
    query = query.eq("tipo_movimento", movimento);
  }

  if (tipoFiltro !== "TODOS") {
    query = query.eq("tipo_cesta_id", Number(tipoFiltro));
  }

  const movimentosResult = await query.limit(5000);
  let movimentos = (movimentosResult.data ?? []) as Movimento[];

  if (busca) {
    movimentos = movimentos.filter((item) => {
      const tipo = tiposMap.get(Number(item.tipo_cesta_id));
      const responsavel = item.usuario_id
        ? usuariosMap.get(item.usuario_id) ?? ""
        : "";

      const texto = [
        item.referencia,
        item.carga_id ? `carga ${item.carga_id}` : "",
        item.observacao,
        tipo?.nome,
        tipo?.codigo,
        responsavel,
        rotuloMovimento(item.tipo_movimento),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return texto.includes(busca);
    });
  }

  const saldoCentral = (saldosResult.data ?? []).reduce(
    (total, item) => total + Math.max(0, Number(item.quantidade ?? 0)),
    0,
  );

  const soma = (tiposMovimento: string[]) =>
    movimentos
      .filter((item) => tiposMovimento.includes(item.tipo_movimento))
      .reduce((total, item) => total + Number(item.quantidade ?? 0), 0);

  const entradasCentral = soma([
    "ENTRADA_CENTRAL",
    "AJUSTE_CENTRAL_ENTRADA",
    "RETORNO_CARGA_CENTRAL",
  ]);
  const saidasCentral = soma([
    "SAIDA_CENTRAL_CARGA",
    "AJUSTE_CENTRAL_SAIDA",
  ]);
  const carregadoPeriodo = soma(["SAIDA_CENTRAL_CARGA"]);
  const entregueCliente = soma(["SAIDA_CARGA_ENTREGA"]);
  const retornado = soma(["RETORNO_CARGA_CENTRAL"]);
  const avariado = soma(["AVARIA_CARGA"]);

  const totalPaginas = Math.max(1, Math.ceil(movimentos.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * POR_PAGINA;
  const movimentosPagina = movimentos.slice(inicio, inicio + POR_PAGINA);

  const linhasExportacao = movimentos.map((item) => {
    const tipo = tiposMap.get(Number(item.tipo_cesta_id));
    const responsavel = item.usuario_id
      ? usuariosMap.get(item.usuario_id) ?? "—"
      : "—";
    const sinal = sinalMovimento(item.tipo_movimento);

    return {
      data: formatarDataHora(item.created_at),
      movimento: rotuloMovimento(item.tipo_movimento),
      cesta: tipo?.nome ?? "Tipo de cesta",
      codigoCesta: tipo?.codigo ?? "",
      carga: item.carga_id ? `#${item.carga_id}` : "",
      referencia: item.referencia ?? "",
      responsavel,
      quantidade: sinal * Number(item.quantidade ?? 0),
      observacao: item.observacao ?? "",
    };
  });

  const periodoLabel = `${new Intl.DateTimeFormat("pt-BR").format(
    new Date(`${de}T12:00:00`),
  )} a ${new Intl.DateTimeFormat("pt-BR").format(
    new Date(`${ate}T12:00:00`),
  )}`;

  return (
    <main className="app-premium min-h-screen px-4 py-6 text-[#142018] md:px-6 md:py-8">
      <div className="mx-auto max-w-[1240px]">
        <header className="glass flex items-center justify-between gap-4 rounded-[28px] px-5 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/relatorios"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-[#176f3c]"
            >
              <ArrowLeft size={19} />
            </Link>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#b07a12]">
                Estoque
              </p>
              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Estoque e movimentações
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <RelatorioExportActions
              nomeArquivo={`estoque_movimentacoes_${de}_${ate}`}
              titulo="Relatório de estoque e movimentações"
              subtitulo={`Período: ${periodoLabel}`}
              colunas={[
                { chave: "data", titulo: "Data" },
                { chave: "movimento", titulo: "Movimento" },
                { chave: "cesta", titulo: "Cesta" },
                { chave: "codigoCesta", titulo: "Código" },
                { chave: "carga", titulo: "Carga" },
                { chave: "referencia", titulo: "Referência" },
                { chave: "responsavel", titulo: "Responsável" },
                { chave: "quantidade", titulo: "Qtd." },
                { chave: "observacao", titulo: "Observação" },
              ]}
              linhas={linhasExportacao}
              resumo={[
                { label: "Saldo central", valor: saldoCentral },
                { label: "Carregado no período", valor: carregadoPeriodo },
                { label: "Entregue ao cliente", valor: entregueCliente },
                { label: "Retornado", valor: retornado },
                { label: "Avariado", valor: avariado },
              ]}
            />

            <Link
              href="/admin/estoque"
              className="flex h-10 items-center gap-2 rounded-[13px] border border-emerald-100 bg-white px-4 text-[9px] font-black text-[#176f3c]"
            >
              <Boxes size={15} />
              Estoque operacional
            </Link>
          </div>
        </header>

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.035]" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
              <PackageCheck size={16} />
              Fluxo físico
            </div>
            <h2 className="mt-4 text-[32px] font-black tracking-[-0.055em]">
              Cada cesta deixa um rastro
              <span className="text-[#f4b13f]">.</span>
            </h2>
            <p className="mt-3 max-w-3xl text-[11px] leading-6 text-white/65">
              Consolidação das movimentações entre {periodoLabel}. O saldo central é a posição atual da empresa.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-6">
              <Kpi label="Saldo central" valor={saldoCentral} />
              <Kpi label="Entradas central" valor={entradasCentral} />
              <Kpi label="Saídas central" valor={saidasCentral} />
              <Kpi label="Entregues" valor={entregueCliente} />
              <Kpi label="Retornados" valor={retornado} />
              <Kpi label="Avariados" valor={avariado} />
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-3">
          <ResumoCard
            icon={<Truck size={17} />}
            label="Carregado no período"
            valor={String(carregadoPeriodo)}
            detalhe="Saída do estoque central para cargas."
          />
          <ResumoCard
            icon={<ChevronRight size={17} />}
            label="Entregue ao cliente"
            valor={String(entregueCliente)}
            detalhe="Baixas realizadas no estoque móvel."
          />
          <ResumoCard
            icon={<RotateCcw size={17} />}
            label="Retorno x avaria"
            valor={`${retornado} / ${avariado}`}
            detalhe="Retornado ao central / baixado como avaria."
          />
        </section>

        <section className="card-premium mt-5 rounded-[30px] p-5">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
            <Filter size={15} />
            Filtros
          </div>

          <form className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1.1fr_1.1fr_1.1fr_auto]">
            <label className="block">
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                De
              </span>
              <input
                name="de"
                type="date"
                defaultValue={de}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 px-3 text-[10px] font-semibold outline-none focus:border-emerald-400"
              />
            </label>

            <label className="block">
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Até
              </span>
              <input
                name="ate"
                type="date"
                defaultValue={ate}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 px-3 text-[10px] font-semibold outline-none focus:border-emerald-400"
              />
            </label>

            <label className="block">
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Movimento
              </span>
              <select
                name="movimento"
                defaultValue={movimento}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[10px] font-semibold outline-none focus:border-emerald-400"
              >
                <option value="TODOS">Todos</option>
                <option value="ENTRADA_CENTRAL">Entrada no central</option>
                <option value="AJUSTE_CENTRAL_ENTRADA">Ajuste entrada</option>
                <option value="AJUSTE_CENTRAL_SAIDA">Ajuste saída</option>
                <option value="SAIDA_CENTRAL_CARGA">Carga para entregador</option>
                <option value="ENTRADA_CARGA">Entrada estoque móvel</option>
                <option value="SAIDA_CARGA_ENTREGA">Entrega ao cliente</option>
                <option value="RETORNO_CARGA_CENTRAL">Retorno ao central</option>
                <option value="AVARIA_CARGA">Avaria</option>
              </select>
            </label>

            <label className="block">
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Tipo de cesta
              </span>
              <select
                name="tipo"
                defaultValue={tipoFiltro}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[10px] font-semibold outline-none focus:border-emerald-400"
              >
                <option value="TODOS">Todas</option>
                {tipos.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Busca
              </span>
              <div className="relative mt-1">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  name="busca"
                  defaultValue={params.busca ?? ""}
                  placeholder="Carga, referência, usuário..."
                  className="h-11 w-full rounded-[14px] border border-slate-200 pl-10 pr-3 text-[10px] font-semibold outline-none focus:border-emerald-400"
                />
              </div>
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
                href="/admin/relatorios/estoque"
                className="flex h-11 items-center rounded-[14px] border border-slate-200 bg-white px-4 text-[9px] font-black text-slate-500"
              >
                Limpar
              </Link>
            </div>
          </form>
        </section>

        <section className="card-premium mt-5 rounded-[30px] p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
                Histórico operacional
              </p>
              <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                Movimentações registradas
              </h3>
              <p className="mt-1 text-[9px] text-slate-400">
                {movimentosPagina.length} registro(s) nesta página • {movimentos.length} encontrado(s) no filtro atual.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-2 text-[8px] font-black text-emerald-700">
              Página {paginaAtual} de {totalPaginas}
            </span>
          </div>

          <div className="mt-5 overflow-x-auto rounded-[20px] border border-slate-100">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead className="bg-[#f6f9f6]">
                <tr>
                  {["Data", "Movimento", "Cesta", "Carga / referência", "Responsável", "Qtd."].map(
                    (titulo) => (
                      <th
                        key={titulo}
                        className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.12em] text-slate-400"
                      >
                        {titulo}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {movimentosPagina.map((item) => {
                  const tipo = tiposMap.get(Number(item.tipo_cesta_id));
                  const responsavel = item.usuario_id
                    ? usuariosMap.get(item.usuario_id) ?? "—"
                    : "—";
                  const sinal = sinalMovimento(item.tipo_movimento);

                  return (
                    <tr key={item.id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-4 text-[9px] font-semibold text-slate-600">
                        {formatarDataHora(item.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[7px] font-black uppercase ${classeMovimento(
                            item.tipo_movimento,
                          )}`}
                        >
                          {rotuloMovimento(item.tipo_movimento)}
                        </span>
                        {item.observacao && (
                          <p className="mt-2 max-w-xs text-[8px] leading-4 text-slate-400">
                            {item.observacao}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-[9px] font-black">{tipo?.nome ?? "Tipo de cesta"}</p>
                        <p className="mt-1 text-[8px] text-slate-400">{tipo?.codigo ?? ""}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-[9px] font-black">
                          {item.carga_id ? `Carga #${item.carga_id}` : "—"}
                        </p>
                        <p className="mt-1 text-[8px] text-slate-400">{item.referencia ?? "—"}</p>
                      </td>
                      <td className="px-4 py-4 text-[9px] font-black">{responsavel}</td>
                      <td className="px-4 py-4 text-right">
                        <span className="inline-flex min-w-[46px] justify-center rounded-[12px] bg-[#f6f9f6] px-3 py-2 text-[11px] font-black">
                          {sinal * Number(item.quantidade ?? 0)}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {movimentosPagina.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center text-[10px] text-slate-400">
                      Nenhuma movimentação encontrada para os filtros informados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div className="mt-5 flex items-center justify-between gap-3">
              {paginaAtual > 1 ? (
                <Link
                  href={criarHref(params, paginaAtual - 1)}
                  className="flex h-10 items-center gap-2 rounded-[13px] border border-slate-200 bg-white px-4 text-[9px] font-black"
                >
                  <ChevronLeft size={15} />
                  Anterior
                </Link>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2 text-[9px] font-black text-slate-500">
                <CalendarDays size={14} />
                50 registros por página
              </div>

              {paginaAtual < totalPaginas ? (
                <Link
                  href={criarHref(params, paginaAtual + 1)}
                  className="flex h-10 items-center gap-2 rounded-[13px] bg-[#176f3c] px-4 text-[9px] font-black text-white"
                >
                  Próxima
                  <ChevronRight size={15} />
                </Link>
              ) : (
                <span />
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Kpi({
  label,
  valor,
}: {
  label: string;
  valor: number;
}) {
  return (
    <div className="rounded-[19px] border border-white/10 bg-white/[0.07] px-4 py-3.5 backdrop-blur">
      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>
      <p className="mt-1.5 text-[22px] font-black text-white">{valor}</p>
    </div>
  );
}

function ResumoCard({
  icon,
  label,
  valor,
  detalhe,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
  detalhe: string;
}) {
  return (
    <div className="card-premium rounded-[24px] p-5">
      <div className="flex items-center gap-2 text-emerald-700">{icon}</div>
      <p className="mt-4 text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-[23px] font-black tracking-[-0.04em]">{valor}</p>
      <p className="mt-1 text-[8px] leading-4 text-slate-400">{detalhe}</p>
    </div>
  );
}
