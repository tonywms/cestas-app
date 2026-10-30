export const instant = false;

import {
  ArrowLeft,
  CircleDollarSign,
  Filter,
  Search,
  ShoppingBag,
  UserCheck,
  UsersRound,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import RelatorioExportActions from "../RelatorioExportActions";
import ClientesCardsClient, { type Cliente360Item } from "./ClientesCardsClient";

type PageProps = {
  searchParams: Promise<{
    status?: string;
    financeiro?: string;
    busca?: string;
  }>;
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function dataBR(valor: string | null | undefined) {
  if (!valor) return "—";
  const data = new Date(valor);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(data);
}

export default async function RelatorioClientesPage({ searchParams }: PageProps) {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const params = await searchParams;
  const statusFiltro = params.status || "TODOS";
  const financeiroFiltro = params.financeiro || "TODOS";
  const busca = (params.busca || "").trim().toLowerCase();

  const supabase = await createClient();

  const [clientesResult, vendasResult, entregasResult, contratosResult, parcelasResult] =
    await Promise.all([
      supabase
        .from("clientes")
        .select("id, codigo, nome, cpf_cnpj, telefone, logradouro, numero, bairro, cidade, uf, ativo, created_at")
        .eq("empresa_id", usuario.empresa.id)
        .order("nome"),

      supabase
        .from("vendas")
        .select("id, cliente_id, valor_total, status, created_at")
        .eq("empresa_id", usuario.empresa.id)
        .limit(10000),

      supabase
        .from("entregas")
        .select("id, cliente_id, status, entregue_at, created_at")
        .eq("empresa_id", usuario.empresa.id)
        .limit(10000),

      supabase
        .from("contratos")
        .select("id, cliente_id, status, valor_total, created_at")
        .eq("empresa_id", usuario.empresa.id)
        .limit(10000),

      supabase
        .from("parcelas")
        .select("id, cliente_id, vencimento, valor, valor_pago, status")
        .eq("empresa_id", usuario.empresa.id)
        .limit(20000),
    ]);

  const clientes = clientesResult.data ?? [];
  const vendas = vendasResult.data ?? [];
  const entregas = entregasResult.data ?? [];
  const contratos = contratosResult.data ?? [];
  const parcelas = parcelasResult.data ?? [];

  const hojeIso = new Date().toISOString().slice(0, 10);

  const vendasPorCliente = new Map<number, { qtd: number; valor: number; ultima: string }>();
  for (const venda of vendas) {
    const clienteId = Number(venda.cliente_id);
    const atual = vendasPorCliente.get(clienteId) ?? { qtd: 0, valor: 0, ultima: "" };
    atual.qtd += 1;
    atual.valor += Number(venda.valor_total ?? 0);
    const criado = String(venda.created_at ?? "");
    if (criado > atual.ultima) atual.ultima = criado;
    vendasPorCliente.set(clienteId, atual);
  }

  const entregasPorCliente = new Map<number, number>();
  for (const entrega of entregas) {
    if (String(entrega.status) !== "CONCLUIDA") continue;
    const clienteId = Number(entrega.cliente_id);
    entregasPorCliente.set(clienteId, (entregasPorCliente.get(clienteId) ?? 0) + 1);
  }

  const contratosAtivosPorCliente = new Map<number, number>();
  for (const contrato of contratos) {
    if (String(contrato.status) !== "ATIVO") continue;
    const clienteId = Number(contrato.cliente_id);
    contratosAtivosPorCliente.set(
      clienteId,
      (contratosAtivosPorCliente.get(clienteId) ?? 0) + 1,
    );
  }

  const financeiroPorCliente = new Map<
    number,
    { aberto: number; vencido: number; vencidas: number }
  >();

  for (const parcela of parcelas) {
    if (String(parcela.status) !== "ABERTA") continue;

    const clienteId = Number(parcela.cliente_id);
    const atual = financeiroPorCliente.get(clienteId) ?? {
      aberto: 0,
      vencido: 0,
      vencidas: 0,
    };

    const saldo = Math.max(
      0,
      Number(parcela.valor ?? 0) - Number(parcela.valor_pago ?? 0),
    );

    atual.aberto += saldo;

    if (String(parcela.vencimento) < hojeIso) {
      atual.vencido += saldo;
      atual.vencidas += 1;
    }

    financeiroPorCliente.set(clienteId, atual);
  }

  let dados: Cliente360Item[] = clientes.map((cliente) => {
    const id = Number(cliente.id);
    const venda = vendasPorCliente.get(id) ?? { qtd: 0, valor: 0, ultima: "" };
    const financeiro = financeiroPorCliente.get(id) ?? {
      aberto: 0,
      vencido: 0,
      vencidas: 0,
    };

    const endereco = [
      cliente.logradouro,
      cliente.numero,
      cliente.bairro,
      cliente.cidade,
      cliente.uf,
    ]
      .filter(Boolean)
      .join(", ");

    return {
      id,
      codigo: String(cliente.codigo ?? ""),
      nome: String(cliente.nome ?? "Cliente"),
      telefone: String(cliente.telefone ?? ""),
      documento: String(cliente.cpf_cnpj ?? ""),
      endereco,
      ativo: Boolean(cliente.ativo),
      criadoEm: dataBR(String(cliente.created_at ?? "")),
      vendas: venda.qtd,
      valorComprado: venda.valor,
      entregas: entregasPorCliente.get(id) ?? 0,
      contratosAtivos: contratosAtivosPorCliente.get(id) ?? 0,
      carteiraAberta: financeiro.aberto,
      vencido: financeiro.vencido,
      parcelasVencidas: financeiro.vencidas,
      ultimaVenda: venda.ultima ? dataBR(venda.ultima) : "—",
      situacaoFinanceira: financeiro.vencido > 0 ? "INADIMPLENTE" : "REGULAR",
    };
  });

  if (statusFiltro !== "TODOS") {
    dados = dados.filter((cliente) =>
      statusFiltro === "ATIVO" ? cliente.ativo : !cliente.ativo,
    );
  }

  if (financeiroFiltro !== "TODOS") {
    dados = dados.filter(
      (cliente) => cliente.situacaoFinanceira === financeiroFiltro,
    );
  }

  if (busca) {
    dados = dados.filter((cliente) =>
      [
        cliente.nome,
        cliente.codigo,
        cliente.telefone,
        cliente.documento,
        cliente.endereco,
      ]
        .join(" ")
        .toLowerCase()
        .includes(busca),
    );
  }

  const totalClientes = clientes.length;
  const ativos = clientes.filter((cliente) => Boolean(cliente.ativo)).length;
  const inativos = totalClientes - ativos;
  const comCompras = Array.from(vendasPorCliente.values()).filter((item) => item.qtd > 0).length;
  const inadimplentes = Array.from(financeiroPorCliente.values()).filter((item) => item.vencido > 0).length;
  const valorComprado = Array.from(vendasPorCliente.values()).reduce(
    (total, item) => total + item.valor,
    0,
  );
  const ticketCliente = comCompras > 0 ? valorComprado / comCompras : 0;

  const linhasExportacao = dados.map((cliente) => ({
    codigo: cliente.codigo,
    cliente: cliente.nome,
    telefone: cliente.telefone,
    status: cliente.ativo ? "Ativo" : "Inativo",
    vendas: cliente.vendas,
    valorComprado: cliente.valorComprado,
    entregas: cliente.entregas,
    contratosAtivos: cliente.contratosAtivos,
    carteiraAberta: cliente.carteiraAberta,
    vencido: cliente.vencido,
    situacao: cliente.situacaoFinanceira === "INADIMPLENTE" ? "Inadimplente" : "Regular",
    ultimaVenda: cliente.ultimaVenda,
  }));

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
                Clientes
              </p>
              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Visão 360º
              </h1>
            </div>
          </div>

          <RelatorioExportActions
            nomeArquivo="clientes_visao_360"
            titulo="Relatório de clientes — visão 360º"
            subtitulo="Base consolidada de clientes, compras, entregas e posição financeira."
            colunas={[
              { chave: "codigo", titulo: "Código" },
              { chave: "cliente", titulo: "Cliente" },
              { chave: "telefone", titulo: "Telefone" },
              { chave: "status", titulo: "Status" },
              { chave: "vendas", titulo: "Vendas" },
              { chave: "valorComprado", titulo: "Valor comprado" },
              { chave: "entregas", titulo: "Entregas" },
              { chave: "contratosAtivos", titulo: "Contratos ativos" },
              { chave: "carteiraAberta", titulo: "Carteira aberta" },
              { chave: "vencido", titulo: "Vencido" },
              { chave: "situacao", titulo: "Situação" },
              { chave: "ultimaVenda", titulo: "Última venda" },
            ]}
            linhas={linhasExportacao}
            resumo={[
              { label: "Clientes", valor: totalClientes },
              { label: "Ativos", valor: ativos },
              { label: "Inativos", valor: inativos },
              { label: "Com compras", valor: comCompras },
              { label: "Inadimplentes", valor: inadimplentes },
              { label: "Ticket por cliente", valor: moeda(ticketCliente) },
            ]}
          />
        </header>

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.035]" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
              <UsersRound size={16} />
              Base comercial
            </div>

            <h2 className="mt-4 text-[32px] font-black tracking-[-0.055em]">
              Cada cliente em uma única visão
              <span className="text-[#f4b13f]">.</span>
            </h2>

            <p className="mt-3 max-w-3xl text-[11px] leading-6 text-white/65">
              Compras, entregas, crediário e situação financeira consolidados por cliente.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-6">
              <Kpi label="Clientes" valor={String(totalClientes)} />
              <Kpi label="Ativos" valor={String(ativos)} />
              <Kpi label="Inativos" valor={String(inativos)} />
              <Kpi label="Com compras" valor={String(comCompras)} />
              <Kpi label="Inadimplentes" valor={String(inadimplentes)} alerta={inadimplentes > 0} />
              <Kpi label="Ticket/cliente" valor={moeda(ticketCliente)} />
            </div>
          </div>
        </section>

        <section className="card-premium mt-5 rounded-[30px] p-5">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
            <Filter size={15} />
            Filtros
          </div>

          <form className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.2fr_1.8fr_auto]">
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
                <option value="ATIVO">Ativos</option>
                <option value="INATIVO">Inativos</option>
              </select>
            </label>

            <label>
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Financeiro
              </span>
              <select
                name="financeiro"
                defaultValue={financeiroFiltro}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[10px] font-semibold"
              >
                <option value="TODOS">Todos</option>
                <option value="REGULAR">Regulares</option>
                <option value="INADIMPLENTE">Inadimplentes</option>
              </select>
            </label>

            <label>
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
                  placeholder="Nome, código, telefone, documento..."
                  className="h-11 w-full rounded-[14px] border border-slate-200 pl-10 pr-3 text-[10px] font-semibold"
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
                href="/admin/relatorios/clientes"
                className="flex h-11 items-center rounded-[14px] border border-slate-200 bg-white px-4 text-[9px] font-black text-slate-500"
              >
                Limpar
              </Link>
            </div>
          </form>
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-4">
          <Resumo icon={<UserCheck size={17} />} label="Clientes ativos" valor={String(ativos)} />
          <Resumo icon={<ShoppingBag size={17} />} label="Com compras" valor={String(comCompras)} />
          <Resumo icon={<UserX size={17} />} label="Inadimplentes" valor={String(inadimplentes)} alerta={inadimplentes > 0} />
          <Resumo icon={<CircleDollarSign size={17} />} label="Valor comprado" valor={moeda(valorComprado)} />
        </section>

        <section className="card-premium mt-5 rounded-[30px] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
                Clientes
              </p>
              <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                Base consolidada
              </h3>
              <p className="mt-1 text-[8px] text-slate-400">
                {dados.length} cliente(s) encontrado(s). Clique para abrir a visão completa.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <ClientesCardsClient clientes={dados} />
          </div>
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
    <div className={alerta ? "rounded-[19px] border border-amber-400/40 bg-amber-400/[0.10] px-4 py-3.5" : "rounded-[19px] border border-white/10 bg-white/[0.07] px-4 py-3.5"}>
      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>
      <p className={alerta ? "mt-1.5 text-[18px] font-black text-amber-300" : "mt-1.5 text-[18px] font-black text-white"}>
        {valor}
      </p>
    </div>
  );
}

function Resumo({
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
    <div className={alerta ? "card-premium rounded-[24px] border border-red-100 p-5" : "card-premium rounded-[24px] p-5"}>
      <div className={alerta ? "text-red-600" : "text-emerald-700"}>{icon}</div>
      <p className="mt-4 text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className={alerta ? "mt-2 text-[22px] font-black text-red-700" : "mt-2 text-[22px] font-black"}>
        {valor}
      </p>
    </div>
  );
}
