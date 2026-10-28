export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

import NovoClienteModalTrigger from "./NovoClienteModalTrigger";

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
  }>;
};

export default async function ClientesPage({
  searchParams,
}: PageProps) {
  const usuario = await getCurrentUserProfile();
  if (!usuario) redirect("/");

  const filtros = await searchParams;
  const supabase = await createClient();

  const [clientesResult, contratosResult, parcelasResult] =
    await Promise.all([
      supabase
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
        .order("nome"),

      supabase
        .from("contratos")
        .select(`id, cliente_id, status`)
        .eq("empresa_id", usuario.empresa.id),

      supabase
        .from("parcelas")
        .select(`
          cliente_id,
          vencimento,
          valor,
          valor_pago,
          status
        `)
        .eq("empresa_id", usuario.empresa.id),
    ]);

  const hoje = dateTodayFortaleza();

  const contratosPorCliente = new Map<number, number>();
  for (const item of contratosResult.data ?? []) {
    const clienteId = Number(item.cliente_id);
    contratosPorCliente.set(
      clienteId,
      (contratosPorCliente.get(clienteId) ?? 0) + 1,
    );
  }

  const financeiroPorCliente = new Map<
    number,
    { abertas: number; vencidas: number; valorVencido: number }
  >();

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

  const todos = (clientesResult.data ?? []).map((cliente) => {
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

  const busca = (filtros.q ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR");

  const clientes = todos.filter((cliente) => {
    if (
      busca &&
      !String(cliente.nome).toLocaleLowerCase("pt-BR").includes(busca) &&
      !String(cliente.codigo).toLocaleLowerCase("pt-BR").includes(busca) &&
      !String(cliente.telefone ?? "").toLocaleLowerCase("pt-BR").includes(busca)
    ) {
      return false;
    }

    if (filtros.status === "ativo" && !cliente.ativo) return false;
    if (filtros.status === "inativo" && cliente.ativo) return false;

    if (
      filtros.cidade &&
      String(cliente.cidade ?? "") !== filtros.cidade
    ) {
      return false;
    }

    if (filtros.credito === "atraso" && cliente.vencidas <= 0) return false;
    if (filtros.credito === "emdia" && cliente.vencidas > 0) return false;
    if (filtros.credito === "semcontrato" && cliente.contratos > 0) return false;

    return true;
  });

  const ativos = clientes.filter((c) => c.ativo).length;
  const inativos = clientes.length - ativos;
  const comAtraso = clientes.filter((c) => c.vencidas > 0).length;
  const valorAtrasado = clientes.reduce(
    (total, c) => total + c.valorVencido,
    0,
  );

  const cidades = Array.from(
    new Set(
      todos
        .map((c) => String(c.cidade ?? ""))
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const activeCount = Object.values(filtros).filter(
    (value) => typeof value === "string" && value.trim(),
  ).length;

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto max-w-[1180px]">
        <ModuleHeader
          eyebrow="Comercial"
          title="Clientes"
          actions={
            <NovoClienteModalTrigger />
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
                {clientes.length}
              </p>
            </div>
          }
        >
          <KpiGrid>
            <Kpi label="Clientes" value={clientes.length} />
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

        <section className="mt-7">
          {clientes.length === 0 ? (
            <EmptyState
              title="Nenhum cliente encontrado"
              text="Ajuste os filtros ou cadastre um novo cliente."
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {clientes.map((cliente) => (
                <Link
                  key={cliente.id}
                  href={`/admin/clientes/${cliente.id}`}
                  className="group block h-full"
                >
                  <article className="card-premium flex h-full min-h-[292px] flex-col rounded-[28px] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#b28735]">
                          {cliente.codigo}
                        </p>

                        <h3 className="mt-1 truncate text-[18px] font-black">
                          {cliente.nome}
                        </h3>

                        <p className="mt-1 text-[9px] text-slate-400">
                          {cliente.telefone || "Sem telefone"}
                        </p>
                      </div>

                      <StatusBadge
                        tone={cliente.ativo ? "green" : "slate"}
                      >
                        {cliente.ativo ? "Ativo" : "Inativo"}
                      </StatusBadge>
                    </div>

                    <div className="mt-4 rounded-[17px] bg-[#f5f8f5] p-4">
                      <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">
                        Endereço
                      </p>

                      <p className="mt-1 text-[10px] font-bold text-slate-600">
                        {cliente.logradouro
                          ? `${cliente.logradouro}${cliente.numero ? `, ${cliente.numero}` : ""}${cliente.bairro ? ` - ${cliente.bairro}` : ""}`
                          : "Endereço não informado"}
                      </p>

                      <p className="mt-1 text-[8px] text-slate-400">
                        {[cliente.cidade, cliente.uf].filter(Boolean).join(" / ")}
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-2">
                      <MiniMetric label="Contratos" value={cliente.contratos} />
                      <MiniMetric label="Abertas" value={cliente.abertas} />
                      <MiniMetric
                        label="Vencidas"
                        value={cliente.vencidas}
                        tone={cliente.vencidas > 0 ? "amber" : "green"}
                      />
                      <MiniMetric
                        label="Em atraso"
                        value={formatMoney(cliente.valorVencido)}
                        tone={cliente.valorVencido > 0 ? "amber" : "green"}
                      />
                    </div>

                    <div className="mt-auto pt-4">
                      <div className="flex items-center justify-between rounded-[16px] border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-emerald-700 transition group-hover:bg-emerald-50">
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-[0.12em]">
                            Central 360°
                          </p>
                          <p className="mt-1 text-[10px] font-bold text-slate-500">
                            Cadastro, crédito, financeiro, entregas e histórico
                          </p>
                        </div>

                        <span className="text-[18px] font-black transition group-hover:translate-x-1">
                          →
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}