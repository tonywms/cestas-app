export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

import ClientesToolbarActions from "./ClientesToolbarActions";

import {
  ApplyButton,
  EmptyState,
  Field,
  Hero,
  Kpi,
  KpiGrid,
  MiniMetric,
  ModuleHeader,
  QuickLink,
  SmartFilters,
  StatusBadge,
  dateTodayFortaleza,
  formatMoney,
  inputClass,
} from "@/components/admin/PremiumModuleUi";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    cidade?: string;
    credito?: string;
    pagina?: string;
  }>;
};

export default async function ClientesPage({
  searchParams,
}: PageProps) {
  const usuario = await getCurrentUserProfile();
  if (!usuario) redirect("/");

  const filtros = await searchParams;
  const supabase = await createClient();

  // V54_CARTEIRA_ESCALAVEL_SERVER_SIDE
  const hoje = dateTodayFortaleza();
  const CLIENTES_POR_PAGINA = 25;
  const paginaSolicitada = Math.max(
    1,
    Number.parseInt(String(filtros.pagina ?? "1"), 10) || 1,
  );

  const busca = String(filtros.q ?? "").trim();
  const buscaPostgrest = busca
    .replace(/[%,()"'\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const filtroBusca = buscaPostgrest
    ? `nome.ilike.%${buscaPostgrest}%,codigo.ilike.%${buscaPostgrest}%,telefone.ilike.%${buscaPostgrest}%`
    : "";

  type ClienteBase = {
    id: number | string;
    codigo: string;
    nome: string;
    cpf_cnpj: string | null;
    telefone: string | null;
    logradouro: string | null;
    numero: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
    ativo: boolean;
    created_at: string | null;
  };

  type ClienteLeve = {
    id: number | string;
    nome: string;
    ativo: boolean;
  };

  type ParcelaResumo = {
    cliente_id: number | string;
    vencimento: string;
    valor: number | string | null;
    valor_pago: number | string | null;
    status: string | null;
  };

  const aplicarFiltrosBasicos = <T extends {
    or: (filters: string) => T;
    eq: (column: string, value: string | boolean) => T;
  }>(query: T) => {
    let atual = query;

    if (filtroBusca) {
      atual = atual.or(filtroBusca);
    }

    if (filtros.status === "ativo") {
      atual = atual.eq("ativo", true);
    } else if (filtros.status === "inativo") {
      atual = atual.eq("ativo", false);
    }

    if (filtros.cidade) {
      atual = atual.eq("cidade", String(filtros.cidade));
    }

    return atual;
  };

  const carregarCidades = async () => {
    const valores = new Set<string>();
    const LOTE = 1000;

    for (let inicio = 0; ; inicio += LOTE) {
      const { data, error } = await supabase
        .from("clientes")
        .select("cidade")
        .eq("empresa_id", usuario.empresa.id)
        .not("cidade", "is", null)
        .order("cidade")
        .range(inicio, inicio + LOTE - 1);

      if (error) break;

      const linhas = data ?? [];
      for (const item of linhas) {
        const cidade = String(item.cidade ?? "").trim();
        if (cidade) valores.add(cidade);
      }

      if (linhas.length < LOTE) break;
    }

    return Array.from(valores).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  };

  const carregarParcelasVencidas = async () => {
    const linhas: ParcelaResumo[] = [];
    const LOTE = 1000;

    for (let inicio = 0; ; inicio += LOTE) {
      const { data, error } = await supabase
        .from("parcelas")
        .select("cliente_id, vencimento, valor, valor_pago, status")
        .eq("empresa_id", usuario.empresa.id)
        .lt("vencimento", hoje)
        .range(inicio, inicio + LOTE - 1);

      if (error) break;

      const lote = (data ?? []) as ParcelaResumo[];
      linhas.push(...lote);

      if (lote.length < LOTE) break;
    }

    return linhas.filter((item) => {
      const valor = Number(item.valor ?? 0);
      const pago = Number(item.valor_pago ?? 0);
      return Math.max(0, valor - pago) > 0;
    });
  };

  const carregarClientesComContrato = async () => {
    const ids = new Set<number>();
    const LOTE = 1000;

    for (let inicio = 0; ; inicio += LOTE) {
      const { data, error } = await supabase
        .from("contratos")
        .select("cliente_id")
        .eq("empresa_id", usuario.empresa.id)
        .range(inicio, inicio + LOTE - 1);

      if (error) break;

      const lote = data ?? [];
      for (const item of lote) {
        ids.add(Number(item.cliente_id));
      }

      if (lote.length < LOTE) break;
    }

    return ids;
  };

  const [cidades, parcelasVencidas] = await Promise.all([
    carregarCidades(),
    carregarParcelasVencidas(),
  ]);

  const saldoVencidoPorCliente = new Map<number, number>();
  for (const item of parcelasVencidas) {
    const clienteId = Number(item.cliente_id);
    const saldo = Math.max(
      0,
      Number(item.valor ?? 0) - Number(item.valor_pago ?? 0),
    );

    saldoVencidoPorCliente.set(
      clienteId,
      (saldoVencidoPorCliente.get(clienteId) ?? 0) + saldo,
    );
  }

  const clientesComAtraso = new Set(
    Array.from(saldoVencidoPorCliente.keys()),
  );

  const clientesComContrato =
    filtros.credito === "semcontrato"
      ? await carregarClientesComContrato()
      : new Set<number>();

  const carregarClientesLeves = async () => {
    const acumulados: ClienteLeve[] = [];
    const LOTE = 1000;

    for (let inicio = 0; ; inicio += LOTE) {
      let query = supabase
        .from("clientes")
        .select("id, nome, ativo")
        .eq("empresa_id", usuario.empresa.id)
        .order("nome")
        .range(inicio, inicio + LOTE - 1);

      query = aplicarFiltrosBasicos(query);

      const { data, error } = await query;
      if (error) break;

      const lote = (data ?? []) as ClienteLeve[];
      acumulados.push(...lote);

      if (lote.length < LOTE) break;
    }

    return acumulados;
  };

  let totalClientesFiltrados = 0;
  let ativos = 0;
  let inativos = 0;
  let comAtraso = 0;
  let valorAtrasado = 0;
  let paginaAtual = paginaSolicitada;
  let totalPaginas = 1;
  let inicioPagina = 0;
  let fimPagina = 0;
  let clientesBasePagina: ClienteBase[] = [];

  const filtroFinanceiroAtivo =
    filtros.credito === "atraso" ||
    filtros.credito === "emdia" ||
    filtros.credito === "semcontrato";

  if (filtroFinanceiroAtivo) {
    const leves = await carregarClientesLeves();

    const filtrados = leves.filter((cliente) => {
      const id = Number(cliente.id);

      if (filtros.credito === "atraso") {
        return clientesComAtraso.has(id);
      }

      if (filtros.credito === "emdia") {
        return !clientesComAtraso.has(id);
      }

      if (filtros.credito === "semcontrato") {
        return !clientesComContrato.has(id);
      }

      return true;
    });

    totalClientesFiltrados = filtrados.length;
    ativos = filtrados.filter((cliente) => cliente.ativo).length;
    inativos = totalClientesFiltrados - ativos;

    const idsFiltrados = new Set(
      filtrados.map((cliente) => Number(cliente.id)),
    );

    for (const [clienteId, saldo] of saldoVencidoPorCliente.entries()) {
      if (idsFiltrados.has(clienteId)) {
        comAtraso += 1;
        valorAtrasado += saldo;
      }
    }

    totalPaginas = Math.max(
      1,
      Math.ceil(totalClientesFiltrados / CLIENTES_POR_PAGINA),
    );
    paginaAtual = Math.min(paginaSolicitada, totalPaginas);
    inicioPagina = (paginaAtual - 1) * CLIENTES_POR_PAGINA;
    fimPagina = Math.min(
      inicioPagina + CLIENTES_POR_PAGINA,
      totalClientesFiltrados,
    );

    const idsPagina = filtrados
      .slice(inicioPagina, fimPagina)
      .map((cliente) => Number(cliente.id));

    if (idsPagina.length > 0) {
      const { data } = await supabase
        .from("clientes")
        .select(`
          id,
          codigo,
          nome,
          cpf_cnpj,
          telefone,
          logradouro,
          numero,
          bairro,
          cidade,
          uf,
          ativo,
          created_at
        `)
        .eq("empresa_id", usuario.empresa.id)
        .in("id", idsPagina);

      const porId = new Map(
        ((data ?? []) as ClienteBase[]).map((cliente) => [
          Number(cliente.id),
          cliente,
        ]),
      );

      clientesBasePagina = idsPagina
        .map((id) => porId.get(id))
        .filter((cliente): cliente is ClienteBase => Boolean(cliente));
    }
  } else {
    let totalQuery = supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", usuario.empresa.id);

    totalQuery = aplicarFiltrosBasicos(totalQuery);

    const { count } = await totalQuery;
    totalClientesFiltrados = count ?? 0;

    totalPaginas = Math.max(
      1,
      Math.ceil(totalClientesFiltrados / CLIENTES_POR_PAGINA),
    );
    paginaAtual = Math.min(paginaSolicitada, totalPaginas);
    inicioPagina = (paginaAtual - 1) * CLIENTES_POR_PAGINA;
    fimPagina = Math.min(
      inicioPagina + CLIENTES_POR_PAGINA,
      totalClientesFiltrados,
    );

    let pageQuery = supabase
      .from("clientes")
      .select(`
        id,
        codigo,
        nome,
        cpf_cnpj,
        telefone,
        logradouro,
        numero,
        bairro,
        cidade,
        uf,
        ativo,
        created_at
      `)
      .eq("empresa_id", usuario.empresa.id)
      .order("nome")
      .range(
        inicioPagina,
        Math.max(inicioPagina, fimPagina - 1),
      );

    pageQuery = aplicarFiltrosBasicos(pageQuery);

    const [{ data: pageData }, ativosResult, inativosResult] =
      await Promise.all([
        pageQuery,
        (async () => {
          let query = supabase
            .from("clientes")
            .select("id", { count: "exact", head: true })
            .eq("empresa_id", usuario.empresa.id)
            .eq("ativo", true);

          query = aplicarFiltrosBasicos(query);
          return query;
        })(),
        (async () => {
          let query = supabase
            .from("clientes")
            .select("id", { count: "exact", head: true })
            .eq("empresa_id", usuario.empresa.id)
            .eq("ativo", false);

          query = aplicarFiltrosBasicos(query);
          return query;
        })(),
      ]);

    clientesBasePagina = (pageData ?? []) as ClienteBase[];
    ativos = ativosResult.count ?? 0;
    inativos = inativosResult.count ?? 0;

    const idsAtraso = Array.from(clientesComAtraso);
    const idsBasicosComAtraso = new Set<number>();
    const TAMANHO_LOTE_IDS = 250;

    for (
      let inicio = 0;
      inicio < idsAtraso.length;
      inicio += TAMANHO_LOTE_IDS
    ) {
      const loteIds = idsAtraso.slice(
        inicio,
        inicio + TAMANHO_LOTE_IDS,
      );

      let query = supabase
        .from("clientes")
        .select("id")
        .eq("empresa_id", usuario.empresa.id)
        .in("id", loteIds);

      query = aplicarFiltrosBasicos(query);

      const { data } = await query;
      for (const cliente of data ?? []) {
        idsBasicosComAtraso.add(Number(cliente.id));
      }
    }

    comAtraso = idsBasicosComAtraso.size;
    for (const clienteId of idsBasicosComAtraso) {
      valorAtrasado += saldoVencidoPorCliente.get(clienteId) ?? 0;
    }
  }

  const idsPagina = clientesBasePagina.map((cliente) =>
    Number(cliente.id),
  );

  const contratosPorCliente = new Map<number, number>();
  const financeiroPorCliente = new Map<
    number,
    { abertas: number; vencidas: number; valorVencido: number }
  >();

  if (idsPagina.length > 0) {
    const [contratosResult, parcelasResult] = await Promise.all([
      supabase
        .from("contratos")
        .select("cliente_id")
        .eq("empresa_id", usuario.empresa.id)
        .in("cliente_id", idsPagina),

      supabase
        .from("parcelas")
        .select("cliente_id, vencimento, valor, valor_pago, status")
        .eq("empresa_id", usuario.empresa.id)
        .in("cliente_id", idsPagina),
    ]);

    for (const item of contratosResult.data ?? []) {
      const clienteId = Number(item.cliente_id);
      contratosPorCliente.set(
        clienteId,
        (contratosPorCliente.get(clienteId) ?? 0) + 1,
      );
    }

    for (const item of parcelasResult.data ?? []) {
      const clienteId = Number(item.cliente_id);
      const valor = Number(item.valor ?? 0);
      const pago = Number(item.valor_pago ?? 0);
      const saldo = Math.max(0, valor - pago);

      const atual =
        financeiroPorCliente.get(clienteId) ?? {
          abertas: 0,
          vencidas: 0,
          valorVencido: 0,
        };

      if (saldo > 0) {
        atual.abertas += 1;

        if (String(item.vencimento) < hoje) {
          atual.vencidas += 1;
          atual.valorVencido += saldo;
        }
      }

      financeiroPorCliente.set(clienteId, atual);
    }
  }

  const clientes = clientesBasePagina.map((cliente) => {
    const fin =
      financeiroPorCliente.get(Number(cliente.id)) ?? {
        abertas: 0,
        vencidas: 0,
        valorVencido: 0,
      };

    return {
      ...cliente,
      contratos: contratosPorCliente.get(Number(cliente.id)) ?? 0,
      ...fin,
    };
  });

  const clientesPagina = clientes;

  const activeCount = [
    filtros.q,
    filtros.status,
    filtros.cidade,
    filtros.credito,
  ].filter(
    (value) => typeof value === "string" && value.trim(),
  ).length;

  const hrefPagina = (pagina: number) => {
    const params = new URLSearchParams();
    if (filtros.q) params.set("q", String(filtros.q));
    if (filtros.status) params.set("status", String(filtros.status));
    if (filtros.cidade) params.set("cidade", String(filtros.cidade));
    if (filtros.credito) params.set("credito", String(filtros.credito));
    if (pagina > 1) params.set("pagina", String(pagina));
    const query = params.toString();
    return query ? `/admin/clientes?${query}` : "/admin/clientes";
  };
  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto w-full">
        <ModuleHeader
          eyebrow="Comercial"
          title="Clientes"
          actions={
            <ClientesToolbarActions />
          }
        />

        <Hero
          eyebrow="Carteira de clientes"
          title="Clientes da empresa"
          description="Consulte cadastro, endereço, contratos e situação financeira sem precisar abrir várias telas."
          badge={
            <div className="rounded-[18px] border border-white/10 bg-white/[0.07] px-4 py-3 text-right">
              <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/45">
                Exibidos
              </p>
              <p className="mt-1 text-[22px] font-black">
                {totalClientesFiltrados}
              </p>
            </div>
          }
        >
          <KpiGrid>
            <Kpi label="Clientes" value={totalClientesFiltrados} />
            <Kpi label="Ativos" value={ativos} />
            <Kpi label="Inativos" value={inativos} />
            <Kpi
              label="Com atraso"
              value={comAtraso}
              warning={comAtraso > 0}
            />
            <Kpi
              label="Valor vencido"
              value={formatMoney(valorAtrasado)}
              warning={valorAtrasado > 0}
            />
          </KpiGrid>
        </Hero>

        <SmartFilters
          resetHref="/admin/clientes"
          activeCount={activeCount}
          quick={
            <div className="flex flex-wrap gap-2">
              <QuickLink
                href="/admin/clientes"
                active={!filtros.status && !filtros.credito}
              >
                Todos
              </QuickLink>

              <QuickLink
                href="/admin/clientes?status=ativo"
                active={filtros.status === "ativo"}
              >
                Ativos
              </QuickLink>

              <QuickLink
                href="/admin/clientes?status=inativo"
                active={filtros.status === "inativo"}
              >
                Inativos
              </QuickLink>

              <QuickLink
                href="/admin/clientes?credito=atraso"
                active={filtros.credito === "atraso"}
                tone="gold"
              >
                Com atraso
              </QuickLink>
            </div>
          }
        >
          <form
            method="get"
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
          >
            <Field label="Buscar" className="xl:col-span-2">
              <input
                name="q"
                defaultValue={filtros.q ?? ""}
                placeholder="Nome, código ou telefone"
                className={inputClass}
              />
            </Field>

            <Field label="Cidade">
              <select
                name="cidade"
                defaultValue={filtros.cidade ?? ""}
                className={inputClass}
              >
                <option value="">Todas</option>
                {cidades.map((cidade) => (
                  <option key={cidade} value={cidade}>
                    {cidade}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Situação financeira">
              <select
                name="credito"
                defaultValue={filtros.credito ?? ""}
                className={inputClass}
              >
                <option value="">Todas</option>
                <option value="emdia">Em dia</option>
                <option value="atraso">Com atraso</option>
                <option value="semcontrato">Sem contrato</option>
              </select>
            </Field>

            <div className="md:col-span-2 xl:col-span-4">
              <ApplyButton />
            </div>
          </form>
        </SmartFilters>

        {/* V53_7_CLIENTES_CARTEIRA_HIERARQUICA */}
        <section className="mt-4">
          {totalClientesFiltrados === 0 ? (
            <EmptyState
              title="Nenhum cliente encontrado"
              text="Ajuste os filtros ou cadastre um novo cliente."
            />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b07a12]">
                    Carteira de clientes
                  </p>
                  <p className="mt-1 text-[12px] font-semibold text-slate-500">
                    Exibindo {inicioPagina + 1}–{fimPagina} de {totalClientesFiltrados} cliente(s)
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                    Leitura rápida: somente pendências financeiras recebem destaque.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-2 text-[9px] font-black text-amber-700">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    Atraso = atenção
                  </span>
                  <span className="rounded-full border border-emerald-100 bg-white px-3 py-2 text-[9px] font-black text-emerald-700">
                    25 por página
                  </span>
                </div>
              </div>

              <div className="hidden overflow-hidden rounded-[20px] border border-slate-200 bg-white xl:block">
                <div className="grid grid-cols-[minmax(260px,1.2fr)_minmax(300px,1.35fr)_minmax(360px,1.45fr)_115px_96px] items-center gap-4 border-b border-slate-200 bg-[#f4f8f5] px-4 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                  <div>Cliente</div>
                  <div>Localização</div>
                  <div>Financeiro</div>
                  <div>Situação</div>
                  <div className="text-right">Ação</div>
                </div>

                <div className="divide-y divide-slate-100">
                  {clientesPagina.map((cliente, index) => {
                    const possuiAtraso =
                      cliente.vencidas > 0 || cliente.valorVencido > 0;

                    return (
                      <Link
                        key={cliente.id}
                        href={`/admin/clientes/${cliente.id}`}
                        className={`grid min-h-[82px] grid-cols-[minmax(260px,1.2fr)_minmax(300px,1.35fr)_minmax(360px,1.45fr)_115px_96px] items-center gap-4 border-l-[3px] px-4 py-2.5 ${
                          possuiAtraso
                            ? "border-l-amber-400 bg-amber-50/35 hover:bg-amber-50/65"
                            : index % 2 === 0
                              ? "border-l-transparent bg-white hover:bg-emerald-50/45"
                              : "border-l-transparent bg-[#fbfdfb] hover:bg-emerald-50/55"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-black text-[#142018]">
                            {cliente.nome}
                          </p>
                          <div className="mt-1 flex min-w-0 items-center gap-2 text-[9px]">
                            <span className="shrink-0 font-black uppercase tracking-[0.1em] text-[#b28735]">
                              {cliente.codigo}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="truncate font-semibold text-slate-500">
                              {cliente.telefone || "Sem telefone"}
                            </span>
                          </div>
                        </div>

                        <div className="min-w-0 border-l border-slate-100 pl-4">
                          <p className="truncate text-[11px] font-bold text-slate-700">
                            {cliente.logradouro
                              ? `${cliente.logradouro}${cliente.numero ? `, ${cliente.numero}` : ""}${cliente.bairro ? ` - ${cliente.bairro}` : ""}`
                              : "Endereço não informado"}
                          </p>
                          <p className="mt-1 truncate text-[9px] font-medium text-slate-400">
                            {[cliente.cidade, cliente.uf].filter(Boolean).join(" / ") || "Cidade não informada"}
                          </p>
                        </div>

                        <div className="min-w-0 border-l border-slate-100 pl-4">
                          <div className={`grid grid-cols-[.75fr_.75fr_.75fr_1.35fr] divide-x rounded-[14px] border px-1 py-2 ${
                            possuiAtraso
                              ? "divide-amber-100 border-amber-200 bg-amber-50"
                              : "divide-slate-200 border-slate-100 bg-[#f7f9f7]"
                          }`}>
                            <div className="px-2">
                              <p className="text-[7px] font-black uppercase tracking-[0.08em] text-slate-400">Contratos</p>
                              <p className="mt-1 text-[12px] font-black text-slate-700">{cliente.contratos}</p>
                            </div>
                            <div className="px-2">
                              <p className="text-[7px] font-black uppercase tracking-[0.08em] text-slate-400">Abertas</p>
                              <p className="mt-1 text-[12px] font-black text-slate-700">{cliente.abertas}</p>
                            </div>
                            <div className="px-2">
                              <p className="text-[7px] font-black uppercase tracking-[0.08em] text-slate-400">Vencidas</p>
                              <p className={`mt-1 text-[12px] font-black ${cliente.vencidas > 0 ? "text-amber-700" : "text-slate-700"}`}>
                                {cliente.vencidas}
                              </p>
                            </div>
                            <div className="min-w-0 px-2">
                              <p className={`text-[7px] font-black uppercase tracking-[0.08em] ${possuiAtraso ? "text-amber-600" : "text-slate-400"}`}>
                                Em atraso
                              </p>
                              <p className={`mt-1 truncate text-[12px] font-black ${possuiAtraso ? "text-amber-800" : "text-emerald-700"}`}>
                                {formatMoney(cliente.valorVencido)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="border-l border-slate-100 pl-4">
                          <StatusBadge tone={possuiAtraso ? "amber" : cliente.ativo ? "green" : "slate"}>
                            {possuiAtraso ? "Atenção" : cliente.ativo ? "Ativo" : "Inativo"}
                          </StatusBadge>
                          {possuiAtraso ? (
                            <p className="mt-1.5 text-[8px] font-bold leading-3 text-amber-700">
                              Pendência financeira
                            </p>
                          ) : null}
                        </div>

                        <div className="text-right">
                          <span className="inline-flex h-9 items-center rounded-[11px] border border-emerald-100 bg-emerald-50 px-3 text-[10px] font-black text-emerald-700">
                            Abrir →
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2 xl:hidden">
                {clientesPagina.map((cliente) => {
                  const possuiAtraso =
                    cliente.vencidas > 0 || cliente.valorVencido > 0;

                  return (
                    <Link key={cliente.id} href={`/admin/clientes/${cliente.id}`} className="block">
                      <article className={`rounded-[18px] border-l-[3px] bg-white p-3.5 ${
                        possuiAtraso
                          ? "border border-amber-200 border-l-amber-400"
                          : "border border-slate-100 border-l-emerald-200"
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-[14px] font-black text-[#142018]">{cliente.nome}</h3>
                            <p className="mt-1 truncate text-[9px] font-semibold text-slate-500">
                              {cliente.codigo} • {cliente.telefone || "Sem telefone"}
                            </p>
                          </div>
                          <StatusBadge tone={possuiAtraso ? "amber" : cliente.ativo ? "green" : "slate"}>
                            {possuiAtraso ? "Atenção" : cliente.ativo ? "Ativo" : "Inativo"}
                          </StatusBadge>
                        </div>

                        <p className="mt-2 truncate text-[10px] font-semibold text-slate-600">
                          {cliente.logradouro
                            ? `${cliente.logradouro}${cliente.numero ? `, ${cliente.numero}` : ""}${cliente.bairro ? ` - ${cliente.bairro}` : ""}`
                            : "Endereço não informado"}
                        </p>

                        <div className={`mt-2 grid grid-cols-4 divide-x rounded-[12px] px-1 py-2 ${
                          possuiAtraso ? "divide-amber-100 bg-amber-50" : "divide-slate-100 bg-[#f7f9f7]"
                        }`}>
                          <div className="px-2">
                            <p className="text-[6px] font-black uppercase text-slate-400">Contratos</p>
                            <p className="mt-0.5 text-[11px] font-black">{cliente.contratos}</p>
                          </div>
                          <div className="px-2">
                            <p className="text-[6px] font-black uppercase text-slate-400">Abertas</p>
                            <p className="mt-0.5 text-[11px] font-black">{cliente.abertas}</p>
                          </div>
                          <div className="px-2">
                            <p className="text-[6px] font-black uppercase text-slate-400">Vencidas</p>
                            <p className={`mt-0.5 text-[11px] font-black ${cliente.vencidas > 0 ? "text-amber-700" : ""}`}>
                              {cliente.vencidas}
                            </p>
                          </div>
                          <div className="min-w-0 px-2">
                            <p className="text-[6px] font-black uppercase text-slate-400">Atraso</p>
                            <p className={`mt-0.5 truncate text-[11px] font-black ${possuiAtraso ? "text-amber-800" : "text-emerald-700"}`}>
                              {formatMoney(cliente.valorVencido)}
                            </p>
                          </div>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                <p className="text-[10px] font-bold text-slate-500">
                  Página {paginaAtual} de {totalPaginas}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {paginaAtual > 1 ? (
                    <>
                      <Link href={hrefPagina(1)} className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-600">
                        Primeira
                      </Link>
                      <Link href={hrefPagina(paginaAtual - 1)} className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-600">
                        ← Anterior
                      </Link>
                    </>
                  ) : null}

                  {paginaAtual < totalPaginas ? (
                    <>
                      <Link href={hrefPagina(paginaAtual + 1)} className="rounded-[10px] bg-[#176f3c] px-3 py-2 text-[10px] font-black text-white">
                        Próxima →
                      </Link>
                      <Link href={hrefPagina(totalPaginas)} className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-600">
                        Última
                      </Link>
                    </>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
