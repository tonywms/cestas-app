export const instant = false;

import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Filter,
  Search,
  ShoppingBag,
  UserRound,
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
    tipo?: string;
    entregador?: string;
    busca?: string;
  }>;
};

type Venda = {
  id: number;
  entrega_id: number;
  cliente_id: number;
  entregador_id: string;
  codigo: string;
  tipo_venda: string;
  valor_total: number;
  valor_entrada: number;
  forma_pagamento: string | null;
  status: string;
  observacao: string | null;
  created_at: string;
};

function dataIsoLocal(data: Date) {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function formatarDataHora(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(new Date(valor));
}

function rotuloTipoVenda(tipo: string) {
  const normalizado = tipo.toUpperCase();
  if (normalizado.includes("CRED")) return "Crediário";
  if (normalizado.includes("VISTA")) return "À vista";
  return tipo.replaceAll("_", " ");
}

export default async function RelatorioVendasPage({
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
  const tipoFiltro = params.tipo || "TODOS";
  const entregadorFiltro = params.entregador || "TODOS";
  const busca = (params.busca || "").trim().toLowerCase();

  const supabase = await createClient();

  const [clientesResult, usuariosResult, entregasResult] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, codigo, nome, bairro, cidade")
      .eq("empresa_id", usuario.empresa.id),
    supabase.from("usuarios").select("id, nome"),
    supabase
      .from("entregas")
      .select("id, carga_id")
      .eq("empresa_id", usuario.empresa.id),
  ]);

  const clientesMap = new Map(
    (clientesResult.data ?? []).map((item) => [Number(item.id), item]),
  );
  const usuariosMap = new Map(
    (usuariosResult.data ?? []).map((item) => [
      String(item.id),
      String(item.nome),
    ]),
  );
  const entregasMap = new Map(
    (entregasResult.data ?? []).map((item) => [
      Number(item.id),
      item.carga_id ? Number(item.carga_id) : null,
    ]),
  );

  let query = supabase
    .from("vendas")
    .select(
      "id, entrega_id, cliente_id, entregador_id, codigo, tipo_venda, valor_total, valor_entrada, forma_pagamento, status, observacao, created_at",
    )
    .eq("empresa_id", usuario.empresa.id)
    .gte("created_at", `${de}T00:00:00-03:00`)
    .lte("created_at", `${ate}T23:59:59.999-03:00`)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (tipoFiltro !== "TODOS") {
    query = query.eq("tipo_venda", tipoFiltro);
  }
  if (entregadorFiltro !== "TODOS") {
    query = query.eq("entregador_id", entregadorFiltro);
  }

  const vendasResult = await query;
  let vendas = (vendasResult.data ?? []) as Venda[];

  if (busca) {
    vendas = vendas.filter((venda) => {
      const cliente = clientesMap.get(Number(venda.cliente_id));
      const entregador = usuariosMap.get(venda.entregador_id) ?? "";
      const texto = [
        venda.codigo,
        cliente?.nome,
        cliente?.codigo,
        cliente?.bairro,
        cliente?.cidade,
        entregador,
        venda.forma_pagamento,
        venda.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return texto.includes(busca);
    });
  }

  const totalVendido = vendas.reduce(
    (total, venda) => total + Number(venda.valor_total ?? 0),
    0,
  );
  const vendasVista = vendas.filter((venda) =>
    venda.tipo_venda.toUpperCase().includes("VISTA"),
  );
  const vendasCrediario = vendas.filter((venda) =>
    venda.tipo_venda.toUpperCase().includes("CRED"),
  );
  const valorVista = vendasVista.reduce(
    (total, venda) => total + Number(venda.valor_total ?? 0),
    0,
  );
  const valorCrediario = vendasCrediario.reduce(
    (total, venda) => total + Number(venda.valor_total ?? 0),
    0,
  );
  const ticketMedio = vendas.length > 0 ? totalVendido / vendas.length : 0;

  const tiposVenda = Array.from(
    new Set((vendasResult.data ?? []).map((item) => String(item.tipo_venda))),
  ).sort();

  const entregadoresMap = new Map<string, string>();

  for (const venda of vendas) {
    if (!venda.entregador_id) {
      continue;
    }

    entregadoresMap.set(
      venda.entregador_id,
      usuariosMap.get(venda.entregador_id) ?? "Entregador",
    );
  }

  const entregadores: Array<[string, string]> = Array.from(
    entregadoresMap.entries(),
  );

  const linhasExportacao = vendas.map((venda) => {
    const cliente = clientesMap.get(Number(venda.cliente_id));
    const cargaId = entregasMap.get(Number(venda.entrega_id));

    return {
      data: formatarDataHora(venda.created_at),
      venda: venda.codigo,
      cliente: cliente?.nome ?? "Cliente",
      codigoCliente: cliente?.codigo ?? "",
      bairro: cliente?.bairro ?? "",
      entregador: usuariosMap.get(venda.entregador_id) ?? "Entregador",
      carga: cargaId ? `#${cargaId}` : "",
      tipo: rotuloTipoVenda(venda.tipo_venda),
      pagamento: venda.forma_pagamento ?? "",
      valor: Number(venda.valor_total ?? 0),
      entrada: Number(venda.valor_entrada ?? 0),
      status: venda.status,
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
                Comercial
              </p>
              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Vendas e entregas
              </h1>
            </div>
          </div>

          <RelatorioExportActions
            nomeArquivo={`vendas_${de}_${ate}`}
            titulo="Relatório de vendas e entregas"
            subtitulo={`Período: ${periodoLabel}`}
            colunas={[
              { chave: "data", titulo: "Data" },
              { chave: "venda", titulo: "Venda" },
              { chave: "cliente", titulo: "Cliente" },
              { chave: "codigoCliente", titulo: "Código cliente" },
              { chave: "bairro", titulo: "Bairro" },
              { chave: "entregador", titulo: "Entregador" },
              { chave: "carga", titulo: "Carga" },
              { chave: "tipo", titulo: "Tipo" },
              { chave: "pagamento", titulo: "Pagamento" },
              { chave: "valor", titulo: "Valor" },
              { chave: "entrada", titulo: "Entrada" },
              { chave: "status", titulo: "Status" },
            ]}
            linhas={linhasExportacao}
            resumo={[
              { label: "Vendas", valor: vendas.length },
              { label: "Valor vendido", valor: moeda(totalVendido) },
              { label: "À vista", valor: moeda(valorVista) },
              { label: "Crediário", valor: moeda(valorCrediario) },
              { label: "Ticket médio", valor: moeda(ticketMedio) },
            ]}
          />
        </header>

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.035]" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
              <ShoppingBag size={16} />
              Resultado comercial
            </div>
            <h2 className="mt-4 text-[32px] font-black tracking-[-0.055em]">
              Venda em campo, gestão no escritório
              <span className="text-[#f4b13f]">.</span>
            </h2>
            <p className="mt-3 max-w-3xl text-[11px] leading-6 text-white/65">
              Consolidação das vendas registradas pelos entregadores entre {periodoLabel}.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Kpi label="Vendas" valor={String(vendas.length)} />
              <Kpi label="Valor vendido" valor={moeda(totalVendido)} />
              <Kpi label="À vista" valor={moeda(valorVista)} />
              <Kpi label="Crediário" valor={moeda(valorCrediario)} />
              <Kpi label="Ticket médio" valor={moeda(ticketMedio)} />
            </div>
          </div>
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
                Tipo
              </span>
              <select
                name="tipo"
                defaultValue={tipoFiltro}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[10px] font-semibold outline-none focus:border-emerald-400"
              >
                <option value="TODOS">Todas</option>
                {tiposVenda.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {rotuloTipoVenda(tipo)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Entregador
              </span>
              <select
                name="entregador"
                defaultValue={entregadorFiltro}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[10px] font-semibold outline-none focus:border-emerald-400"
              >
                <option value="TODOS">Todos</option>
                {entregadores.map(([id, nome]) => (
                  <option key={id} value={id}>
                    {nome}
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
                  placeholder="Cliente, venda, bairro..."
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
                href="/admin/relatorios/vendas"
                className="flex h-11 items-center rounded-[14px] border border-slate-200 bg-white px-4 text-[9px] font-black text-slate-500"
              >
                Limpar
              </Link>
            </div>
          </form>
        </section>

        <section className="card-premium mt-5 rounded-[30px] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
                Movimento comercial
              </p>
              <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                Vendas registradas
              </h3>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-2 text-[8px] font-black text-emerald-700">
              {vendas.length} registro(s)
            </span>
          </div>

          {vendas.length === 0 ? (
            <div className="mt-5 rounded-[22px] bg-[#f6f9f6] p-12 text-center">
              <ShoppingBag size={28} className="mx-auto text-slate-300" />
              <p className="mt-3 text-[11px] font-black">Nenhuma venda encontrada</p>
              <p className="mt-1 text-[9px] text-slate-400">
                As próximas vendas registradas pelo mobile aparecerão automaticamente aqui.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-[20px] border border-slate-100">
              <table className="w-full min-w-[1050px] border-collapse text-left">
                <thead className="bg-[#f6f9f6]">
                  <tr>
                    {["Data", "Venda", "Cliente", "Entregador", "Carga", "Tipo", "Pagamento", "Valor"].map(
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
                  {vendas.slice(0, 500).map((venda) => {
                    const cliente = clientesMap.get(Number(venda.cliente_id));
                    const cargaId = entregasMap.get(Number(venda.entrega_id));
                    return (
                      <tr key={venda.id} className="border-t border-slate-100">
                        <td className="px-4 py-4 text-[9px] text-slate-500">
                          {formatarDataHora(venda.created_at)}
                        </td>
                        <td className="px-4 py-4 text-[9px] font-black">{venda.codigo}</td>
                        <td className="px-4 py-4">
                          <p className="text-[9px] font-black">{cliente?.nome ?? "Cliente"}</p>
                          <p className="mt-1 text-[8px] text-slate-400">
                            {cliente?.bairro ?? cliente?.codigo ?? ""}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-[9px] font-black">
                          {usuariosMap.get(venda.entregador_id) ?? "Entregador"}
                        </td>
                        <td className="px-4 py-4 text-[9px] font-black">
                          {cargaId ? `#${cargaId}` : "—"}
                        </td>
                        <td className="px-4 py-4 text-[9px]">
                          {rotuloTipoVenda(venda.tipo_venda)}
                        </td>
                        <td className="px-4 py-4 text-[9px] text-slate-500">
                          {venda.forma_pagamento ?? "—"}
                        </td>
                        <td className="px-4 py-4 text-right text-[10px] font-black text-emerald-700">
                          {moeda(Number(venda.valor_total ?? 0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          <ResumoCard
            icon={<Banknote size={17} />}
            label="Vendas à vista"
            valor={String(vendasVista.length)}
            detalhe={moeda(valorVista)}
          />
          <ResumoCard
            icon={<CreditCard size={17} />}
            label="Vendas no crediário"
            valor={String(vendasCrediario.length)}
            detalhe={moeda(valorCrediario)}
          />
          <ResumoCard
            icon={<UserRound size={17} />}
            label="Ticket médio"
            valor={moeda(ticketMedio)}
            detalhe={`${vendas.length} venda(s) no período`}
          />
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
  valor: string;
}) {
  return (
    <div className="rounded-[19px] border border-white/10 bg-white/[0.07] px-4 py-3.5 backdrop-blur">
      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>
      <p className="mt-1.5 text-[20px] font-black text-white">{valor}</p>
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
      <p className="mt-2 text-[23px] font-black tracking-[-0.04em]">{valor}</p>
      <p className="mt-1 text-[8px] text-slate-400">{detalhe}</p>
    </div>
  );
}
