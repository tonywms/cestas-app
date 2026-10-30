export const instant = false;

import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  Filter,
  Search,
  TrendingDown,
  UserRound,
  WalletCards,
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
    status?: string;
    busca?: string;
  }>;
};

type ParcelaRow = {
  id: number;
  contrato_id: number;
  cliente_id: number;
  numero: number;
  vencimento: string;
  valor: number;
  valor_pago: number;
  status: string;
  paga_at: string | null;
};

type ContratoRow = {
  id: number;
  cliente_id: number;
  codigo: string;
  valor_total: number;
  quantidade_parcelas: number;
  status: string;
};

type PagamentoRow = {
  id: number;
  parcela_id: number;
  cliente_id: number;
  valor: number;
  forma_pagamento: string;
  created_at: string;
};

function dataIsoLocal(data: Date) {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dataBR(valor: string) {
  const [ano, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${ano}`;
}

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function diasEntre(data: string, hojeIso: string) {
  const a = new Date(`${data}T12:00:00`);
  const b = new Date(`${hojeIso}T12:00:00`);
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function statusCalculado(parcela: ParcelaRow, hojeIso: string) {
  if (parcela.status === "PAGA") return "PAGA";
  if (parcela.status === "ABERTA" && parcela.vencimento < hojeIso) return "VENCIDA";
  if (parcela.status === "ABERTA") return "A_VENCER";
  return parcela.status;
}

function rotuloStatus(status: string) {
  const mapa: Record<string, string> = {
    PAGA: "Paga",
    ABERTA: "Aberta",
    VENCIDA: "Vencida",
    A_VENCER: "A vencer",
  };

  return mapa[status] ?? status.replaceAll("_", " ");
}

function classeStatus(status: string) {
  if (status === "PAGA") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "VENCIDA") return "border-red-200 bg-red-50 text-red-700";
  if (status === "A_VENCER") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default async function RelatorioFinanceiroPage({
  searchParams,
}: PageProps) {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const params = await searchParams;
  const hoje = new Date();
  const hojeIso = dataIsoLocal(hoje);
  const inicioPadrao = new Date();
  inicioPadrao.setDate(hoje.getDate() - 29);

  const de = params.de || dataIsoLocal(inicioPadrao);
  const ate = params.ate || hojeIso;
  const statusFiltro = params.status || "TODOS";
  const busca = (params.busca || "").trim().toLowerCase();

  const supabase = await createClient();

  const [clientesResult, parcelasResult, contratosResult, pagamentosResult] =
    await Promise.all([
      supabase
        .from("clientes")
        .select("id, codigo, nome, telefone, bairro, cidade")
        .eq("empresa_id", usuario.empresa.id),

      supabase
        .from("parcelas")
        .select(
          "id, contrato_id, cliente_id, numero, vencimento, valor, valor_pago, status, paga_at",
        )
        .eq("empresa_id", usuario.empresa.id)
        .order("vencimento", { ascending: true }),

      supabase
        .from("contratos")
        .select(
          "id, cliente_id, codigo, valor_total, quantidade_parcelas, status",
        )
        .eq("empresa_id", usuario.empresa.id),

      supabase
        .from("pagamentos")
        .select(
          "id, parcela_id, cliente_id, valor, forma_pagamento, created_at",
        )
        .eq("empresa_id", usuario.empresa.id)
        .gte("created_at", `${de}T00:00:00-03:00`)
        .lte("created_at", `${ate}T23:59:59.999-03:00`)
        .order("created_at", { ascending: false }),
    ]);

  const clientes = clientesResult.data ?? [];
  const parcelas = (parcelasResult.data ?? []) as ParcelaRow[];
  const contratos = (contratosResult.data ?? []) as ContratoRow[];
  const pagamentos = (pagamentosResult.data ?? []) as PagamentoRow[];

  const clientesMap = new Map(
    clientes.map((cliente) => [Number(cliente.id), cliente]),
  );

  const contratosMap = new Map(
    contratos.map((contrato) => [Number(contrato.id), contrato]),
  );

  const parcelasAbertas = parcelas.filter((parcela) => parcela.status === "ABERTA");
  const parcelasVencidas = parcelasAbertas.filter(
    (parcela) => parcela.vencimento < hojeIso,
  );
  const parcelasAVencer = parcelasAbertas.filter(
    (parcela) => parcela.vencimento >= hojeIso,
  );

  const carteiraAberta = parcelasAbertas.reduce(
    (total, parcela) =>
      total + Math.max(0, Number(parcela.valor) - Number(parcela.valor_pago)),
    0,
  );

  const valorVencido = parcelasVencidas.reduce(
    (total, parcela) =>
      total + Math.max(0, Number(parcela.valor) - Number(parcela.valor_pago)),
    0,
  );

  const valorAVencer = parcelasAVencer.reduce(
    (total, parcela) =>
      total + Math.max(0, Number(parcela.valor) - Number(parcela.valor_pago)),
    0,
  );

  const recebidoPeriodo = pagamentos.reduce(
    (total, pagamento) => total + Number(pagamento.valor ?? 0),
    0,
  );

  const clientesInadimplentes = new Set(
    parcelasVencidas.map((parcela) => Number(parcela.cliente_id)),
  );

  const contratosAtivos = contratos.filter(
    (contrato) => contrato.status === "ATIVO",
  ).length;

  let parcelasFiltradas = parcelas.filter(
    (parcela) => parcela.vencimento >= de && parcela.vencimento <= ate,
  );

  if (statusFiltro !== "TODOS") {
    parcelasFiltradas = parcelasFiltradas.filter(
      (parcela) => statusCalculado(parcela, hojeIso) === statusFiltro,
    );
  }

  if (busca) {
    parcelasFiltradas = parcelasFiltradas.filter((parcela) => {
      const cliente = clientesMap.get(Number(parcela.cliente_id));
      const contrato = contratosMap.get(Number(parcela.contrato_id));

      const texto = [
        cliente?.nome,
        cliente?.codigo,
        cliente?.telefone,
        cliente?.bairro,
        cliente?.cidade,
        contrato?.codigo,
        `parcela ${parcela.numero}`,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return texto.includes(busca);
    });
  }

  const aging = {
    ate7: 0,
    de8a30: 0,
    de31a60: 0,
    mais60: 0,
  };

  for (const parcela of parcelasVencidas) {
    const dias = diasEntre(parcela.vencimento, hojeIso);
    const saldo = Math.max(
      0,
      Number(parcela.valor) - Number(parcela.valor_pago),
    );

    if (dias <= 7) aging.ate7 += saldo;
    else if (dias <= 30) aging.de8a30 += saldo;
    else if (dias <= 60) aging.de31a60 += saldo;
    else aging.mais60 += saldo;
  }

  const devedoresMap = new Map<
    number,
    { clienteId: number; valor: number; parcelas: number; maiorAtraso: number }
  >();

  for (const parcela of parcelasVencidas) {
    const clienteId = Number(parcela.cliente_id);
    const atual = devedoresMap.get(clienteId) ?? {
      clienteId,
      valor: 0,
      parcelas: 0,
      maiorAtraso: 0,
    };

    atual.valor += Math.max(
      0,
      Number(parcela.valor) - Number(parcela.valor_pago),
    );
    atual.parcelas += 1;
    atual.maiorAtraso = Math.max(
      atual.maiorAtraso,
      diasEntre(parcela.vencimento, hojeIso),
    );

    devedoresMap.set(clienteId, atual);
  }

  const rankingDevedores = Array.from(devedoresMap.values())
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);

  const linhasExportacao = parcelasFiltradas.map((parcela) => {
    const cliente = clientesMap.get(Number(parcela.cliente_id));
    const contrato = contratosMap.get(Number(parcela.contrato_id));
    const calculado = statusCalculado(parcela, hojeIso);

    return {
      cliente: cliente?.nome ?? "Cliente",
      codigoCliente: cliente?.codigo ?? "",
      contrato: contrato?.codigo ?? `#${parcela.contrato_id}`,
      parcela: parcela.numero,
      vencimento: dataBR(parcela.vencimento),
      valor: Number(parcela.valor),
      pago: Number(parcela.valor_pago),
      saldo: Math.max(
        0,
        Number(parcela.valor) - Number(parcela.valor_pago),
      ),
      status: rotuloStatus(calculado),
      atraso:
        calculado === "VENCIDA"
          ? `${diasEntre(parcela.vencimento, hojeIso)} dia(s)`
          : "",
    };
  });

  const periodoLabel = `${dataBR(de)} a ${dataBR(ate)}`;

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
                Financeiro
              </p>
              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Financeiro e inadimplência
              </h1>
            </div>
          </div>

          <RelatorioExportActions
            nomeArquivo={`financeiro_inadimplencia_${de}_${ate}`}
            titulo="Relatório financeiro e inadimplência"
            subtitulo={`Vencimentos entre ${periodoLabel}`}
            colunas={[
              { chave: "cliente", titulo: "Cliente" },
              { chave: "codigoCliente", titulo: "Código cliente" },
              { chave: "contrato", titulo: "Contrato" },
              { chave: "parcela", titulo: "Parcela" },
              { chave: "vencimento", titulo: "Vencimento" },
              { chave: "valor", titulo: "Valor" },
              { chave: "pago", titulo: "Pago" },
              { chave: "saldo", titulo: "Saldo" },
              { chave: "status", titulo: "Status" },
              { chave: "atraso", titulo: "Atraso" },
            ]}
            linhas={linhasExportacao}
            resumo={[
              { label: "Carteira aberta atual", valor: moeda(carteiraAberta) },
              { label: "Vencido atual", valor: moeda(valorVencido) },
              { label: "A vencer", valor: moeda(valorAVencer) },
              { label: "Recebido no período", valor: moeda(recebidoPeriodo) },
              { label: "Clientes inadimplentes", valor: clientesInadimplentes.size },
              { label: "Contratos ativos", valor: contratosAtivos },
            ]}
          />
        </header>

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.035]" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
              <CircleDollarSign size={16} />
              Saúde da carteira
            </div>

            <h2 className="mt-4 text-[32px] font-black tracking-[-0.055em]">
              Receber bem também é vender bem
              <span className="text-[#f4b13f]">.</span>
            </h2>

            <p className="mt-3 max-w-3xl text-[11px] leading-6 text-white/65">
              A posição atual da carteira é exibida independentemente do período. O período selecionado controla os recebimentos e a lista de vencimentos abaixo.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-6">
              <Kpi label="Carteira aberta" valor={moeda(carteiraAberta)} />
              <Kpi label="Vencido" valor={moeda(valorVencido)} destaque />
              <Kpi label="A vencer" valor={moeda(valorAVencer)} />
              <Kpi label="Recebido período" valor={moeda(recebidoPeriodo)} />
              <Kpi label="Inadimplentes" valor={String(clientesInadimplentes.size)} />
              <Kpi label="Contratos ativos" valor={String(contratosAtivos)} />
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-4">
          <ResumoCard
            icon={<CalendarClock size={17} />}
            label="Vencido até 7 dias"
            valor={moeda(aging.ate7)}
            detalhe="Atraso recente"
          />
          <ResumoCard
            icon={<AlertTriangle size={17} />}
            label="Vencido 8 a 30 dias"
            valor={moeda(aging.de8a30)}
            detalhe="Faixa de atenção"
          />
          <ResumoCard
            icon={<TrendingDown size={17} />}
            label="Vencido 31 a 60 dias"
            valor={moeda(aging.de31a60)}
            detalhe="Risco elevado"
          />
          <ResumoCard
            icon={<CreditCard size={17} />}
            label="Vencido acima de 60 dias"
            valor={moeda(aging.mais60)}
            detalhe="Cobrança prioritária"
          />
        </section>

        <section className="card-premium mt-5 rounded-[30px] p-5">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
            <Filter size={15} />
            Filtros de vencimento
          </div>

          <form className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1.2fr_1.5fr_auto]">
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
                Status
              </span>
              <select
                name="status"
                defaultValue={statusFiltro}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[10px] font-semibold outline-none focus:border-emerald-400"
              >
                <option value="TODOS">Todos</option>
                <option value="VENCIDA">Vencida</option>
                <option value="A_VENCER">A vencer</option>
                <option value="PAGA">Paga</option>
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
                  placeholder="Cliente, contrato, telefone..."
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
                href="/admin/relatorios/financeiro"
                className="flex h-11 items-center rounded-[14px] border border-slate-200 bg-white px-4 text-[9px] font-black text-slate-500"
              >
                Limpar
              </Link>
            </div>
          </form>
        </section>

        <section className="card-premium mt-5 rounded-[26px] p-4">
          <div className="grid gap-4 xl:grid-cols-[240px_1fr_auto] xl:items-center">
            <div className="flex items-center gap-3">
              <div className="icon-emerald flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]">
                <UserRound size={19} />
              </div>

              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
                  Cobrança
                </p>
                <h3 className="mt-1 text-[17px] font-black tracking-[-0.04em]">
                  Maiores devedores
                </h3>
                <p className="mt-1 text-[7px] leading-4 text-slate-400">
                  Ranking atual por valor vencido.
                </p>
              </div>
            </div>

            {rankingDevedores.length === 0 ? (
              <div className="rounded-[18px] bg-emerald-50 px-4 py-4 text-center">
                <WalletCards size={20} className="mx-auto text-emerald-600" />
                <p className="mt-2 text-[9px] font-black text-emerald-800">
                  Nenhum cliente inadimplente
                </p>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {rankingDevedores.slice(0, 6).map((item, index) => {
                  const cliente = clientesMap.get(item.clienteId);

                  return (
                    <article
                      key={item.clienteId}
                      className="rounded-[18px] border border-slate-100 bg-[#fbfdfb] px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-red-50 text-[9px] font-black text-red-700">
                            {index + 1}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-[9px] font-black">
                              {cliente?.nome ?? "Cliente"}
                            </p>
                            <p className="mt-0.5 truncate text-[6px] text-slate-400">
                              {item.parcelas} parcela(s) • {item.maiorAtraso} dia(s)
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-[10px] font-black text-red-700">
                            {moeda(item.valor)}
                          </p>
                          <p className="mt-0.5 text-[5px] font-black uppercase tracking-[0.1em] text-red-400">
                            vencido
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <Link
              href="/admin/financeiro"
              className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-[14px] border border-emerald-100 bg-emerald-50 px-4 text-[8px] font-black text-emerald-800"
            >
              <CircleDollarSign size={14} />
              Abrir financeiro
            </Link>
          </div>
        </section>

        <section className="card-premium mt-5 rounded-[30px] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
                Carteira
              </p>
              <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                Parcelas no período
              </h3>
              <p className="mt-1 text-[8px] text-slate-400">
                {parcelasFiltradas.length} parcela(s) encontrada(s).
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-[20px] border border-slate-100">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead className="bg-[#f6f9f6]">
                <tr>
                  {[
                    "Cliente",
                    "Contrato",
                    "Parcela",
                    "Vencimento",
                    "Valor",
                    "Pago",
                    "Saldo",
                    "Status",
                  ].map((titulo) => (
                    <th
                      key={titulo}
                      className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.12em] text-slate-400"
                    >
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {parcelasFiltradas.slice(0, 500).map((parcela) => {
                  const cliente = clientesMap.get(Number(parcela.cliente_id));
                  const contrato = contratosMap.get(Number(parcela.contrato_id));
                  const calculado = statusCalculado(parcela, hojeIso);
                  const saldo = Math.max(
                    0,
                    Number(parcela.valor) - Number(parcela.valor_pago),
                  );

                  return (
                    <tr
                      key={parcela.id}
                      className="border-t border-slate-100 align-middle"
                    >
                      <td className="px-4 py-4">
                        <p className="text-[9px] font-black">
                          {cliente?.nome ?? "Cliente"}
                        </p>
                        <p className="mt-1 text-[8px] text-slate-400">
                          {cliente?.codigo ?? ""}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-[9px] font-semibold">
                        {contrato?.codigo ?? `#${parcela.contrato_id}`}
                      </td>

                      <td className="px-4 py-4 text-[9px] font-black">
                        {parcela.numero}
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-[9px] font-semibold">
                          {dataBR(parcela.vencimento)}
                        </p>
                        {calculado === "VENCIDA" && (
                          <p className="mt-1 text-[7px] font-black text-red-600">
                            {diasEntre(parcela.vencimento, hojeIso)} dia(s) em atraso
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 text-[9px] font-semibold">
                        {moeda(Number(parcela.valor))}
                      </td>

                      <td className="px-4 py-4 text-[9px] text-slate-500">
                        {moeda(Number(parcela.valor_pago))}
                      </td>

                      <td className="px-4 py-4 text-[9px] font-black">
                        {moeda(saldo)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[7px] font-black uppercase ${classeStatus(
                            calculado,
                          )}`}
                        >
                          {rotuloStatus(calculado)}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {parcelasFiltradas.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-14 text-center text-[10px] text-slate-400"
                    >
                      Nenhuma parcela encontrada para os filtros informados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Kpi({
  label,
  valor,
  destaque = false,
}: {
  label: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={
        destaque
          ? "rounded-[19px] border border-amber-400/40 bg-amber-400/[0.10] px-4 py-3.5 backdrop-blur"
          : "rounded-[19px] border border-white/10 bg-white/[0.07] px-4 py-3.5 backdrop-blur"
      }
    >
      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>
      <p
        className={
          destaque
            ? "mt-1.5 text-[18px] font-black text-amber-300"
            : "mt-1.5 text-[18px] font-black text-white"
        }
      >
        {valor}
      </p>
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
      <div className="text-emerald-700">{icon}</div>
      <p className="mt-4 text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-[20px] font-black tracking-[-0.04em]">{valor}</p>
      <p className="mt-1 text-[8px] text-slate-400">{detalhe}</p>
    </div>
  );
}
