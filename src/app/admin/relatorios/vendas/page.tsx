export const instant = false;

import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  Filter,
  PackageCheck,
  Search,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{
    de?: string;
    ate?: string;
    tipo?: string;
    entregador?: string;
    busca?: string;
  }>;
};

type VendaRow = {
  id: number;
  codigo: string;
  entrega_id: number;
  cliente_id: number;
  entregador_id: string;
  tipo_venda: string;
  valor_total: number | string;
  valor_entrada: number | string;
  forma_pagamento: string | null;
  contrato_id: number | null;
  status: string;
  created_at: string;
};

function hojeFortaleza() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function diasAtras(dias: number) {
  const data = new Date(`${hojeFortaleza()}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() - dias);
  return data.toISOString().slice(0, 10);
}

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function dataHora(valor: string) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(data);
}

function labelTipo(tipo: string) {
  return tipo === "CREDIARIO" ? "Crediário" : "À vista";
}

function labelForma(forma: string | null) {
  if (!forma) return "—";

  const mapa: Record<string, string> = {
    DINHEIRO: "Dinheiro",
    PIX: "PIX",
    CARTAO: "Cartão",
    TRANSFERENCIA: "Transferência",
    OUTRO: "Outro",
  };

  return mapa[forma] ?? forma.replaceAll("_", " ");
}

export default async function RelatorioVendasPage({ searchParams }: PageProps) {
  const usuario = await getCurrentUserProfile();

  if (!usuario || !usuario.ativo) {
    redirect("/");
  }

  if (usuario.perfilCodigo === "ENTREGADOR") {
    redirect("/mobile");
  }

  const params = await searchParams;
  const de = /^\d{4}-\d{2}-\d{2}$/.test(params.de ?? "")
    ? String(params.de)
    : diasAtras(29);
  const ate = /^\d{4}-\d{2}-\d{2}$/.test(params.ate ?? "")
    ? String(params.ate)
    : hojeFortaleza();
  const tipo = ["TODOS", "AVISTA", "CREDIARIO"].includes(
    String(params.tipo ?? "TODOS").toUpperCase(),
  )
    ? String(params.tipo ?? "TODOS").toUpperCase()
    : "TODOS";
  const entregadorFiltro = String(params.entregador ?? "").trim();
  const busca = String(params.busca ?? "").trim().toLowerCase();

  const supabase = await createClient();

  let vendasQuery = supabase
    .from("vendas")
    .select(`
      id,
      codigo,
      entrega_id,
      cliente_id,
      entregador_id,
      tipo_venda,
      valor_total,
      valor_entrada,
      forma_pagamento,
      contrato_id,
      status,
      created_at
    `)
    .eq("empresa_id", usuario.empresa.id)
    .gte("created_at", `${de}T00:00:00-03:00`)
    .lte("created_at", `${ate}T23:59:59-03:00`)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (tipo !== "TODOS") {
    vendasQuery = vendasQuery.eq("tipo_venda", tipo);
  }

  if (entregadorFiltro) {
    vendasQuery = vendasQuery.eq("entregador_id", entregadorFiltro);
  }

  const [vendasResult, entregadoresResult] = await Promise.all([
    vendasQuery,
    supabase
      .from("empresa_usuarios")
      .select(`
        usuario_id,
        ativo,
        usuarios:usuario_id (
          id,
          nome
        ),
        perfis:perfil_id (
          codigo
        )
      `)
      .eq("empresa_id", usuario.empresa.id)
      .eq("ativo", true),
  ]);

  if (vendasResult.error) {
    console.error("Erro ao carregar relatório de vendas:", vendasResult.error);
  }

  const vendasRaw = (vendasResult.data ?? []) as VendaRow[];
  const clienteIds = Array.from(new Set(vendasRaw.map((item) => Number(item.cliente_id))));
  const entregaIds = Array.from(new Set(vendasRaw.map((item) => Number(item.entrega_id))));

  const [clientesResult, entregasResult] = await Promise.all([
    clienteIds.length > 0
      ? supabase
          .from("clientes")
          .select("id, codigo, nome, bairro, cidade")
          .eq("empresa_id", usuario.empresa.id)
          .in("id", clienteIds)
      : Promise.resolve({ data: [], error: null }),
    entregaIds.length > 0
      ? supabase
          .from("entregas")
          .select("id, carga_id, status, entregue_at")
          .eq("empresa_id", usuario.empresa.id)
          .in("id", entregaIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const clientesMap = new Map(
    (clientesResult.data ?? []).map((item) => [Number(item.id), item]),
  );
  const entregasMap = new Map(
    (entregasResult.data ?? []).map((item) => [Number(item.id), item]),
  );

  const entregadores = (entregadoresResult.data ?? [])
    .filter((item: any) => {
      const perfil = Array.isArray(item.perfis) ? item.perfis[0] : item.perfis;
      return perfil?.codigo === "ENTREGADOR";
    })
    .map((item: any) => {
      const dados = Array.isArray(item.usuarios) ? item.usuarios[0] : item.usuarios;
      return {
        id: String(item.usuario_id),
        nome: String(dados?.nome ?? "Entregador"),
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const entregadoresMap = new Map(entregadores.map((item) => [item.id, item.nome]));

  const vendas = vendasRaw.filter((venda) => {
    if (!busca) return true;

    const cliente = clientesMap.get(Number(venda.cliente_id));
    const entregador = entregadoresMap.get(String(venda.entregador_id));
    const texto = [
      venda.codigo,
      cliente?.codigo,
      cliente?.nome,
      cliente?.bairro,
      cliente?.cidade,
      entregador,
      venda.forma_pagamento,
      venda.tipo_venda,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return texto.includes(busca);
  });

  const totalVendas = vendas.length;
  const valorVendido = vendas.reduce((total, item) => total + Number(item.valor_total ?? 0), 0);
  const vendasVista = vendas.filter((item) => item.tipo_venda === "AVISTA");
  const vendasCrediario = vendas.filter((item) => item.tipo_venda === "CREDIARIO");
  const valorVista = vendasVista.reduce((total, item) => total + Number(item.valor_total ?? 0), 0);
  const valorCrediario = vendasCrediario.reduce((total, item) => total + Number(item.valor_total ?? 0), 0);
  const ticketMedio = totalVendas > 0 ? valorVendido / totalVendas : 0;

  return (
    <main className="app-premium min-h-screen px-4 py-6 text-[#142018] md:px-6 md:py-8">
      <div className="mx-auto max-w-[1280px]">
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

          <Link
            href="/admin/dashboard"
            className="flex h-11 items-center gap-2 rounded-[14px] border border-emerald-100 bg-white px-4 text-[9px] font-black text-[#176f3c]"
          >
            <CircleDollarSign size={15} />
            Dashboard
          </Link>
        </header>

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.035]" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
              <ShoppingBag size={16} />
              Resultado comercial
            </div>

            <h2 className="mt-4 text-[32px] font-black tracking-[-0.055em]">
              Venda em campo, gestão no escritório<span className="text-[#f4b13f]">.</span>
            </h2>

            <p className="mt-3 max-w-2xl text-[11px] leading-6 text-white/65">
              Consolidação das vendas registradas pelos entregadores entre {de.split("-").reverse().join("/")} e {ate.split("-").reverse().join("/")}.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Kpi label="Vendas" valor={String(totalVendas)} />
              <Kpi label="Valor vendido" valor={moeda(valorVendido)} />
              <Kpi label="À vista" valor={moeda(valorVista)} />
              <Kpi label="Crediário" valor={moeda(valorCrediario)} />
              <Kpi label="Ticket médio" valor={moeda(ticketMedio)} />
            </div>
          </div>
        </section>

        <form className="mt-5 rounded-[28px] border border-black/[0.04] bg-white p-5 shadow-[0_18px_55px_rgba(17,63,33,0.05)]">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
            <Filter size={14} />
            Filtros
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="block">
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">De</span>
              <input name="de" type="date" defaultValue={de} className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 px-3 text-[10px] font-semibold outline-none focus:border-emerald-400" />
            </label>

            <label className="block">
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">Até</span>
              <input name="ate" type="date" defaultValue={ate} className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 px-3 text-[10px] font-semibold outline-none focus:border-emerald-400" />
            </label>

            <label className="block">
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">Tipo</span>
              <select name="tipo" defaultValue={tipo} className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[10px] font-semibold outline-none focus:border-emerald-400">
                <option value="TODOS">Todas</option>
                <option value="AVISTA">À vista</option>
                <option value="CREDIARIO">Crediário</option>
              </select>
            </label>

            <label className="block">
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">Entregador</span>
              <select name="entregador" defaultValue={entregadorFiltro} className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[10px] font-semibold outline-none focus:border-emerald-400">
                <option value="">Todos</option>
                {entregadores.map((item) => (
                  <option key={item.id} value={item.id}>{item.nome}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">Busca</span>
              <div className="relative mt-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input name="busca" defaultValue={params.busca ?? ""} placeholder="Cliente, venda, bairro..." className="h-11 w-full rounded-[14px] border border-slate-200 pl-9 pr-3 text-[10px] font-semibold outline-none focus:border-emerald-400" />
              </div>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" className="flex h-11 items-center gap-2 rounded-[14px] bg-[#176f3c] px-5 text-[9px] font-black text-white">
              <Filter size={14} />
              Aplicar filtros
            </button>
            <Link href="/admin/vendas" className="flex h-11 items-center rounded-[14px] border border-slate-200 bg-white px-5 text-[9px] font-black text-slate-500">
              Limpar
            </Link>
          </div>
        </form>

        <section className="mt-5 rounded-[30px] border border-black/[0.04] bg-white p-5 shadow-[0_18px_55px_rgba(17,63,33,0.05)] md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">Movimento comercial</p>
              <h3 className="mt-1 text-[21px] font-black tracking-[-0.04em]">Vendas registradas</h3>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-2 text-[8px] font-black text-emerald-700">{totalVendas} registro(s)</span>
          </div>

          {vendas.length === 0 ? (
            <div className="mt-5 rounded-[22px] bg-[#f6f9f6] p-12 text-center">
              <ShoppingBag size={30} className="mx-auto text-slate-300" />
              <p className="mt-3 text-[12px] font-black">Nenhuma venda encontrada</p>
              <p className="mt-2 text-[9px] text-slate-400">As próximas vendas registradas pelo mobile aparecerão automaticamente aqui.</p>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[980px] border-separate border-spacing-y-2 text-left">
                <thead>
                  <tr className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                    <th className="px-3 py-2">Venda</th>
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Entregador</th>
                    <th className="px-3 py-2">Carga</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Pagamento</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                    <th className="px-3 py-2">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.map((venda) => {
                    const cliente = clientesMap.get(Number(venda.cliente_id));
                    const entrega = entregasMap.get(Number(venda.entrega_id));
                    const entregador = entregadoresMap.get(String(venda.entregador_id)) ?? "Entregador";

                    return (
                      <tr key={venda.id} className="bg-[#fbfdfb] text-[10px] font-semibold text-slate-600">
                        <td className="rounded-l-[16px] px-3 py-3">
                          <p className="font-black text-[#142018]">{venda.codigo}</p>
                          <p className="mt-1 text-[8px] text-slate-400">Entrega #{venda.entrega_id}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-black text-[#142018]">{cliente?.nome ?? "Cliente"}</p>
                          <p className="mt-1 text-[8px] text-slate-400">{cliente?.codigo ?? ""}</p>
                        </td>
                        <td className="px-3 py-3">{entregador}</td>
                        <td className="px-3 py-3">{entrega?.carga_id ? `#${entrega.carga_id}` : "—"}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-[7px] font-black uppercase ${venda.tipo_venda === "CREDIARIO" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                            {labelTipo(venda.tipo_venda)}
                          </span>
                        </td>
                        <td className="px-3 py-3">{labelForma(venda.forma_pagamento)}</td>
                        <td className="px-3 py-3 text-right font-black text-[#142018]">{moeda(Number(venda.valor_total ?? 0))}</td>
                        <td className="rounded-r-[16px] px-3 py-3">{dataHora(venda.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          <MiniCard icon={<Banknote size={18} />} label="Vendas à vista" valor={String(vendasVista.length)} detalhe={moeda(valorVista)} />
          <MiniCard icon={<CreditCard size={18} />} label="Vendas no crediário" valor={String(vendasCrediario.length)} detalhe={moeda(valorCrediario)} />
          <MiniCard icon={<PackageCheck size={18} />} label="Ticket médio" valor={moeda(ticketMedio)} detalhe={`${totalVendas} venda(s) no período`} />
        </section>
      </div>
    </main>
  );
}

function Kpi({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-[19px] border border-white/10 bg-white/[0.07] px-4 py-3.5 backdrop-blur">
      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/45">{label}</p>
      <p className="mt-1.5 text-[18px] font-black text-white md:text-[22px]">{valor}</p>
    </div>
  );
}

function MiniCard({ icon, label, valor, detalhe }: { icon: React.ReactNode; label: string; valor: string; detalhe: string }) {
  return (
    <div className="card-premium rounded-[24px] p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-emerald-50 text-emerald-700">{icon}</div>
      <p className="mt-4 text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-[20px] font-black text-[#142018]">{valor}</p>
      <p className="mt-1 text-[9px] text-slate-400">{detalhe}</p>
    </div>
  );
}
