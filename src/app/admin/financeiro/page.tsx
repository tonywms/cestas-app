export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

import ContratoForm from "./ContratoForm";

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
  SectionHeader,
  dateTodayFortaleza,
  formatDate,
  formatMoney,
  inputClass,
} from "@/components/admin/PremiumModuleUi";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    faixa?: string;
    status?: string;
    cliente?: string;
    de?: string;
    ate?: string;
  }>;
};

export default async function FinanceiroPage({
  searchParams,
}: PageProps) {
  const usuario = await getCurrentUserProfile();

  if (!usuario) redirect("/");

  const filtros = await searchParams;
  const supabase = await createClient();

  const [
    parcelasResult,
    clientesResult,
    contratosResult,
    pagamentosResult,
    vendaRecebimentosResult,
    usuariosResult,
  ] = await Promise.all([
    supabase
      .from("parcelas")
      .select(`
        id,
        contrato_id,
        cliente_id,
        numero,
        vencimento,
        valor,
        valor_pago,
        status,
        paga_at
      `)
      .eq("empresa_id", usuario.empresa.id)
      .order("vencimento", { ascending: true }),

    supabase
      .from("clientes")
      .select(`id, codigo, nome`)
      .eq("empresa_id", usuario.empresa.id)
      .order("nome"),

    supabase
      .from("contratos")
      .select(`id, codigo`)
      .eq("empresa_id", usuario.empresa.id),

    supabase
      .from("pagamentos")
      .select(`
        id,
        parcela_id,
        cliente_id,
        recebido_por,
        valor,
        forma_pagamento,
        observacao,
        created_at
      `)
      .eq("empresa_id", usuario.empresa.id)
      .order("created_at", { ascending: false })
      .limit(100),

    supabase
      .from("venda_recebimentos")
      .select(`
        id,
        venda_id,
        cliente_id,
        recebido_por,
        tipo,
        valor,
        forma_pagamento,
        observacao,
        created_at
      `)
      .eq("empresa_id", usuario.empresa.id)
      .order("created_at", { ascending: false })
      .limit(100),

    supabase
      .from("usuarios")
      .select(`id, nome`)
      .eq("ativo", true),
  ]);

  const clientesMap = new Map(
    (clientesResult.data ?? []).map((item) => [
      Number(item.id),
      {
        codigo: String(item.codigo),
        nome: String(item.nome),
      },
    ]),
  );

  const contratosMap = new Map(
    (contratosResult.data ?? []).map((item) => [
      Number(item.id),
      String(item.codigo),
    ]),
  );

  const parcelasMap = new Map(
    (parcelasResult.data ?? []).map((item) => [
      Number(item.id),
      {
        contratoId: Number(item.contrato_id),
        clienteId: Number(item.cliente_id),
      },
    ]),
  );

  const usuariosMap = new Map(
    (usuariosResult.data ?? []).map((item) => [
      String(item.id),
      String(item.nome),
    ]),
  );

  const hoje = dateTodayFortaleza();

  const primeiraData =
    new Date(
      `${hoje}T12:00:00Z`,
    );

  primeiraData.setUTCDate(
    primeiraData.getUTCDate() +
      30,
  );

  const primeiroVencimento =
    primeiraData
      .toISOString()
      .slice(
        0,
        10,
      );

  const clienteSelecionadoId =
    filtros.cliente &&
    Number.isInteger(
      Number(
        filtros.cliente,
      ),
    )
      ? Number(
          filtros.cliente,
        )
      : null;

  const busca = (filtros.q ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR");

  const entradasVendas = (vendaRecebimentosResult.data ?? [])
    .map((recebimento) => {
      const cliente = clientesMap.get(Number(recebimento.cliente_id));

      return {
        ...recebimento,
        valorNumero: Number(recebimento.valor ?? 0),
        clienteNome: cliente?.nome ?? "Cliente",
        clienteCodigo: cliente?.codigo ?? "—",
      };
    })
    .filter((recebimento) => {
      if (
        String(recebimento.tipo ?? "").toUpperCase() !== "ENTRADA" ||
        recebimento.valorNumero <= 0
      ) {
        return false;
      }

      if (
        filtros.cliente &&
        String(recebimento.cliente_id) !== filtros.cliente
      ) {
        return false;
      }

      if (
        busca &&
        !recebimento.clienteNome
          .toLocaleLowerCase("pt-BR")
          .includes(busca)
      ) {
        return false;
      }

      return true;
    });

  const pagamentosFiltrados = (pagamentosResult.data ?? [])
    .filter((pagamento) => {
      if (
        filtros.cliente &&
        String(pagamento.cliente_id) !== filtros.cliente
      ) {
        return false;
      }

      if (busca) {
        const cliente = clientesMap.get(Number(pagamento.cliente_id));
        const parcela = parcelasMap.get(Number(pagamento.parcela_id));
        const contratoCodigo =
          parcela
            ? contratosMap.get(parcela.contratoId) ?? ""
            : "";

        if (
          !String(cliente?.nome ?? "")
            .toLocaleLowerCase("pt-BR")
            .includes(busca) &&
          !String(contratoCodigo)
            .toLocaleLowerCase("pt-BR")
            .includes(busca)
        ) {
          return false;
        }
      }

      return true;
    });

  const parcelas = (parcelasResult.data ?? [])
    .map((parcela) => {
      const valor = Number(parcela.valor ?? 0);
      const pago = Number(parcela.valor_pago ?? 0);
      const saldo = Math.max(0, valor - pago);
      const vencimento = String(parcela.vencimento);
      const cliente = clientesMap.get(Number(parcela.cliente_id));

      return {
        ...parcela,
        valorNumero: valor,
        pagoNumero: pago,
        saldo,
        vencida: saldo > 0 && vencimento < hoje,
        clienteNome: cliente?.nome ?? "Cliente",
        clienteCodigo: cliente?.codigo ?? "—",
        contratoCodigo:
          contratosMap.get(Number(parcela.contrato_id)) ?? "—",
      };
    })
    .filter((parcela) => {
      if (
        busca &&
        !parcela.clienteNome
          .toLocaleLowerCase("pt-BR")
          .includes(busca) &&
        !parcela.contratoCodigo
          .toLocaleLowerCase("pt-BR")
          .includes(busca)
      ) {
        return false;
      }

      if (
        filtros.cliente &&
        String(parcela.cliente_id) !== filtros.cliente
      ) {
        return false;
      }

      if (
        filtros.status &&
        parcela.status !== filtros.status
      ) {
        return false;
      }

      if (
        filtros.faixa === "vencidas" &&
        !parcela.vencida
      ) {
        return false;
      }

      if (
        filtros.faixa === "hoje" &&
        String(parcela.vencimento) !== hoje
      ) {
        return false;
      }

      if (filtros.faixa === "7") {
        const limite = new Date(`${hoje}T12:00:00Z`);
        limite.setUTCDate(limite.getUTCDate() + 7);
        const limiteTexto = limite.toISOString().slice(0, 10);

        if (
          String(parcela.vencimento) < hoje ||
          String(parcela.vencimento) > limiteTexto
        ) {
          return false;
        }
      }

      if (filtros.de && String(parcela.vencimento) < filtros.de) {
        return false;
      }

      if (filtros.ate && String(parcela.vencimento) > filtros.ate) {
        return false;
      }

      return true;
    });

  const aReceber = parcelas.reduce(
    (sum, item) => sum + item.saldo,
    0,
  );

  const vencido = parcelas
    .filter((item) => item.vencida)
    .reduce((sum, item) => sum + item.saldo, 0);

  const recebidoParcelas = parcelas.reduce(
    (sum, item) => sum + item.pagoNumero,
    0,
  );

  const entradasRecebidas = entradasVendas.reduce(
    (sum, item) => sum + item.valorNumero,
    0,
  );

  const recebidoTotal =
    recebidoParcelas +
    entradasRecebidas;

  const movimentosRecebimento = [
    ...pagamentosFiltrados.map((pagamento) => {
      const cliente = clientesMap.get(Number(pagamento.cliente_id));

      return {
        key: `pagamento-${pagamento.id}`,
        origem: "Pagamento de parcela",
        clienteNome: cliente?.nome ?? "Cliente",
        valor: Number(pagamento.valor ?? 0),
        formaPagamento: String(pagamento.forma_pagamento ?? "OUTRO"),
        recebidoPor: String(pagamento.recebido_por ?? ""),
        createdAt: String(pagamento.created_at),
        observacao: pagamento.observacao ? String(pagamento.observacao) : null,
      };
    }),
    ...entradasVendas.map((recebimento) => ({
      key: `entrada-${recebimento.id}`,
      origem: "Entrada da venda",
      clienteNome: recebimento.clienteNome,
      valor: recebimento.valorNumero,
      formaPagamento: String(recebimento.forma_pagamento ?? "OUTRO"),
      recebidoPor: String(recebimento.recebido_por ?? ""),
      createdAt: String(recebimento.created_at),
      observacao:
        recebimento.observacao
          ? String(recebimento.observacao)
          : `Venda nº ${recebimento.venda_id}`,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    )
    .slice(0, 12);

  const vencidas = parcelas.filter((item) => item.vencida).length;
  const abertas = parcelas.filter((item) => item.saldo > 0).length;

  const activeCount = Object.values(filtros).filter(
    (value) => typeof value === "string" && value.trim(),
  ).length;

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto w-full">
        <ModuleHeader
          eyebrow="Financeiro"
          title="Parcelas e recebimentos"
          actions={
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-[14px] bg-[linear-gradient(135deg,#1f8a4b,#0c4d27)] px-5 py-3 text-[13px] font-extrabold text-white shadow-[0_14px_26px_-12px_rgba(17,92,48,0.7)]">
                + Novo crediário
              </summary>

              <div className="absolute right-0 z-40 mt-3 w-[min(720px,calc(100vw-40px))] rounded-[30px] bg-[#f3f8f4] p-3 shadow-2xl ring-1 ring-black/5">
                <ContratoForm
                  clientes={
                    (
                      clientesResult.data ??
                      []
                    ).map(
                      (
                        cliente,
                      ) => ({
                        id:
                          Number(
                            cliente.id,
                          ),
                        codigo:
                          String(
                            cliente.codigo,
                          ),
                        nome:
                          String(
                            cliente.nome,
                          ),
                      }),
                    )
                  }
                  primeiroVencimento={
                    primeiroVencimento
                  }
                  clienteSelecionadoId={
                    clienteSelecionadoId
                  }
                />
              </div>
            </details>
          }
        />

        {/* V108 — Prestação de contas do entregador e conciliação no CD */}
        <Link href="/admin/financeiro/prestacoes" className="mt-4 flex min-h-[92px] items-center justify-between gap-4 rounded-[22px] border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">Fechamento financeiro do CD</p>
            <p className="mt-1 text-[16px] font-black text-emerald-950">Prestação de contas dos entregadores</p>
            <p className="mt-1 text-[12px] text-emerald-800">Conferir dinheiro, PIX e cartão e configurar quem recebe cada pagamento.</p>
          </div>
          <span className="shrink-0 rounded-full bg-white px-4 py-2 text-[11px] font-black text-emerald-800">Abrir</span>
        </Link>

        {/* V70_FINANCEIRO_GOVERNANCA */}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Link
            href="/admin/financeiro/consistencia"
            className="group flex min-h-[92px] min-w-0 items-center justify-between gap-4 rounded-[22px] border border-emerald-100 bg-white px-5 py-4 shadow-[0_12px_30px_rgba(18,63,34,0.05)] transition hover:border-emerald-200 hover:bg-emerald-50/35"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#b07a12]">
                Qualidade financeira
              </p>
              <p className="mt-1 break-words text-[16px] font-black text-[#163b24]">
                Certificação QA
              </p>
              <p className="mt-1 break-words text-[12px] leading-5 text-slate-500">
                Parcelas, pagamentos, contratos, fechamento e consistência.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700">
              Abrir
            </span>
          </Link>

          <Link
            href="/admin/financeiro/estornos"
            className="group flex min-h-[92px] min-w-0 items-center justify-between gap-4 rounded-[22px] border border-amber-100 bg-white px-5 py-4 shadow-[0_12px_30px_rgba(18,63,34,0.05)] transition hover:border-amber-200 hover:bg-amber-50/35"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#b07a12]">
                Governança
              </p>
              <p className="mt-1 break-words text-[16px] font-black text-[#163b24]">
                Estornos auditáveis
              </p>
              <p className="mt-1 break-words text-[12px] leading-5 text-slate-500">
                Corrija recebimentos sem apagar o histórico original.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-amber-50 px-3 py-2 text-[11px] font-black text-amber-800">
              Abrir
            </span>
          </Link>
        </div>

        <Hero
          eyebrow="Contas a receber"
          title="Visão financeira"
          description="Veja rapidamente o que está aberto, vencido, parcialmente pago e recebido."
        >
          <KpiGrid>
            <Kpi label="Parcelas" value={parcelas.length} />
            <Kpi label="Abertas" value={abertas} />
            <Kpi label="A receber" value={formatMoney(aReceber)} highlight />
            <Kpi
              label="Vencido"
              value={formatMoney(vencido)}
              warning={vencido > 0}
            />
            <Kpi
              label="Vencidas"
              value={vencidas}
              warning={vencidas > 0}
            />
            <Kpi
              label="Entrada em vendas"
              value={formatMoney(entradasRecebidas)}
            />
            <Kpi
              label="Pago em parcelas"
              value={formatMoney(recebidoParcelas)}
            />
            <Kpi
              label="Recebido total"
              value={formatMoney(recebidoTotal)}
            />
          </KpiGrid>
        </Hero>

        <SmartFilters
          resetHref="/admin/financeiro"
          activeCount={activeCount}
          quick={
            <div className="flex flex-wrap gap-2">
              <QuickLink href="/admin/financeiro" active={!filtros.faixa}>
                Todas
              </QuickLink>

              <QuickLink
                href="/admin/financeiro?faixa=vencidas"
                active={filtros.faixa === "vencidas"}
                tone="gold"
              >
                Vencidas
              </QuickLink>

              <QuickLink
                href="/admin/financeiro?faixa=hoje"
                active={filtros.faixa === "hoje"}
              >
                Vencem hoje
              </QuickLink>

              <QuickLink
                href="/admin/financeiro?faixa=7"
                active={filtros.faixa === "7"}
              >
                Próximos 7 dias
              </QuickLink>

              <QuickLink
                href="/admin/financeiro?status=PARCIAL"
                active={filtros.status === "PARCIAL"}
                tone="gold"
              >
                Parciais
              </QuickLink>

              <QuickLink
                href="/admin/financeiro?status=PAGA"
                active={filtros.status === "PAGA"}
              >
                Pagas
              </QuickLink>
            </div>
          }
        >
          <form
            method="get"
            className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,.85fr)_minmax(0,1fr)_minmax(0,1fr)_220px]"
          >
            <Field label="Buscar">
              <input
                name="q"
                defaultValue={filtros.q ?? ""}
                placeholder="Cliente ou contrato"
                className={inputClass}
              />
            </Field>

            <Field label="Cliente">
              <select
                name="cliente"
                defaultValue={filtros.cliente ?? ""}
                className={inputClass}
              >
                <option value="">Todos</option>
                {(clientesResult.data ?? []).map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select
                name="status"
                defaultValue={filtros.status ?? ""}
                className={inputClass}
              >
                <option value="">Todos</option>
                <option value="ABERTA">Aberta</option>
                <option value="PARCIAL">Parcial</option>
                <option value="PAGA">Paga</option>
              </select>
            </Field>

            <Field label="Vencimento inicial">
              <input
                type="date"
                name="de"
                defaultValue={filtros.de ?? ""}
                className={inputClass}
              />
            </Field>

            <Field label="Vencimento final">
              <input
                type="date"
                name="ate"
                defaultValue={filtros.ate ?? ""}
                className={inputClass}
              />
            </Field>

            <div className="flex items-end">
              <ApplyButton />
            </div>
          </form>
        </SmartFilters>

        <section className="mt-7">
          {parcelas.length === 0 ? (
            <EmptyState
              title="Nenhuma parcela encontrada"
              text="Ajuste os filtros para visualizar outros recebíveis."
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {parcelas.map((parcela) => {
                const quitada = parcela.saldo <= 0;

                const tone =
                  quitada
                    ? "green"
                    : parcela.vencida
                      ? "red"
                      : parcela.status === "PARCIAL"
                        ? "amber"
                        : "blue";

                return (
                  <article
                    key={parcela.id}
                    className="card-premium rounded-[28px] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.13em] text-[#b28735]">
                          {parcela.contratoCodigo} • Parcela {parcela.numero}
                        </p>

                        <h3 className="mt-1 text-[17px] font-black">
                          {parcela.clienteNome}
                        </h3>

                        <p className="mt-1 text-[8px] text-slate-400">
                          {parcela.clienteCodigo}
                        </p>
                      </div>

                      <StatusBadge tone={tone}>
                        {quitada
                          ? "Paga"
                          : parcela.vencida
                            ? "Vencida"
                            : parcela.status}
                      </StatusBadge>
                    </div>

                    <div className="mt-4 rounded-[18px] bg-[#f5f8f5] p-4">
                      <p className="text-[7px] font-black uppercase tracking-[0.13em] text-slate-400">
                        Vencimento
                      </p>

                      <p
                        className={`mt-1 text-[15px] font-black ${
                          parcela.vencida ? "text-red-700" : "text-[#142018]"
                        }`}
                      >
                        {formatDate(String(parcela.vencimento))}
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <MiniMetric
                        label="Valor"
                        value={formatMoney(parcela.valorNumero)}
                      />
                      <MiniMetric
                        label="Pago"
                        value={formatMoney(parcela.pagoNumero)}
                        tone="green"
                      />
                      <MiniMetric
                        label="Saldo"
                        value={formatMoney(parcela.saldo)}
                        tone={
                          parcela.vencida
                            ? "red"
                            : parcela.saldo > 0
                              ? "amber"
                              : "green"
                        }
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                      <Link
                        href={`/admin/clientes/${parcela.cliente_id}`}
                        className="flex h-[44px] items-center rounded-[14px] border border-slate-200 bg-white px-4 text-[11px] font-extrabold text-slate-600"
                      >
                        Ver cliente
                      </Link>

                      {!quitada ? (
                        <Link
                          href={`/admin/financeiro/receber/${parcela.id}`}
                          className="flex h-[44px] flex-1 items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#1f8a4b,#0c4d27)] px-4 text-[12px] font-black text-white shadow-[0_12px_22px_rgba(23,111,60,0.18)]"
                        >
                          Registrar recebimento
                        </Link>
                      ) : (
                        <span className="flex h-[44px] flex-1 items-center justify-center rounded-[14px] bg-emerald-50 px-4 text-[11px] font-black text-emerald-700">
                          Parcela quitada
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-8">
          <SectionHeader
            eyebrow="Caixa"
            title="Últimos recebimentos"
            right={
              <span className="rounded-full bg-emerald-50 px-4 py-2 text-[11px] font-black text-emerald-700">
                {movimentosRecebimento.length} registro(s)
              </span>
            }
          />

          {movimentosRecebimento.length === 0 ? (
            <EmptyState
              title="Nenhum recebimento registrado"
              text="Os pagamentos confirmados aparecerão aqui com valor, forma, responsável, cliente e horário."
            />
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {movimentosRecebimento.map((movimento) => {
                const forma =
                  String(movimento.formaPagamento ?? "OUTRO");

                const formaLabel =
                  forma === "DINHEIRO"
                    ? "Dinheiro"
                    : forma === "PIX"
                      ? "PIX"
                      : forma === "CARTAO"
                        ? "Cartão"
                        : forma === "TRANSFERENCIA"
                          ? "Transferência"
                          : "Outro";

                const data = new Date(
                  movimento.createdAt,
                );

                const quando = Number.isNaN(data.getTime())
                  ? movimento.createdAt
                  : data.toLocaleString("pt-BR", {
                      timeZone: "America/Fortaleza",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                return (
                  <article
                    key={movimento.key}
                    className="card-premium rounded-[24px] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#b07a12]">
                          {movimento.origem}
                        </p>

                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                          {formaLabel}
                        </p>

                        <h3 className="mt-1 text-[18px] font-black text-emerald-700">
                          {formatMoney(movimento.valor)}
                        </h3>

                        <p className="mt-1 text-[12px] font-bold text-slate-600">
                          {movimento.clienteNome}
                        </p>
                      </div>

                      <StatusBadge tone="green">
                        Recebido
                      </StatusBadge>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <MiniMetric
                        label="Recebido por"
                        value={
                          usuariosMap.get(movimento.recebidoPor) ??
                          "Sistema"
                        }
                      />

                      <MiniMetric
                        label="Data / hora"
                        value={quando}
                      />
                    </div>

                    {movimento.observacao ? (
                      <p className="mt-4 rounded-[14px] bg-slate-50 px-4 py-3 text-[11px] leading-5 text-slate-500">
                        {movimento.observacao}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>          )}
        </section>
      </div>
    </main>
  );
}

