export const instant = false;

import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  Coins,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";

import Link from "next/link";
import { redirect } from "next/navigation";

import {
  PERMISSOES,
} from "@/lib/auth/permissions";

import {
  requirePermission,
} from "@/lib/auth/require-permission";

import {
  avaliarCredito,
  dataLimiteAtraso,
  POLITICA_CREDITO_PADRAO,
  type PoliticaCredito,
} from "@/lib/credito/avaliar-credito";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   FORMATADORES
========================================================= */

function moeda(valor: number) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    },
  ).format(valor);
}

function hojeFortaleza() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Fortaleza",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(new Date());
}

function dataLocal(iso: string) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      timeZone:
        "America/Fortaleza",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date(iso));
}

/* =========================================================
   PÁGINA
========================================================= */

export default async function RecebimentosPage() {
  const usuario =
    await requirePermission(
      PERMISSOES.PAGAMENTO_REGISTRAR,
    );

  if (
    !usuario.configuracao
      .permitirPagamentoMobile
  ) {
    redirect(
      "/mobile/sem-acesso",
    );
  }

  const supabase =
    await createClient();

  const [
    parcelasResult,
    clientesResult,
    pagamentosResult,
    configResult,
    liberacoesResult,
  ] = await Promise.all([
    supabase
      .from("parcelas")
      .select(`
        id,
        cliente_id,
        vencimento,
        valor,
        valor_pago,
        status
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .in(
        "status",
        [
          "ABERTA",
          "PARCIAL",
        ],
      )
      .order(
        "vencimento",
        {
          ascending: true,
        },
      ),

    supabase
      .from("clientes")
      .select(`
        id,
        codigo,
        nome,
        bairro,
        telefone
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "ativo",
        true,
      )
      .order("nome"),

    supabase
      .from("pagamentos")
      .select(`
        id,
        cliente_id,
        valor,
        forma_pagamento,
        created_at
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "recebido_por",
        usuario.id,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(8),

    supabase
      .from("empresa_configuracoes")
      .select(`
        credito_alerta_qtd_atrasos,
        credito_bloqueio_qtd_atrasos,
        credito_dias_tolerancia,
        credito_permitir_excecao,
        credito_validade_excecao_dias
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .maybeSingle(),

    supabase
      .from("credito_liberacoes")
      .select(`
        id,
        cliente_id,
        motivo,
        valido_ate
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "status",
        "ATIVA",
      )
      .gt(
        "valido_ate",
        new Date().toISOString(),
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      ),
  ]);

  if (
    parcelasResult.error
  ) {
    console.error(
      "Erro parcelas recebimentos:",
      parcelasResult.error,
    );
  }

  if (
    clientesResult.error
  ) {
    console.error(
      "Erro clientes recebimentos:",
      clientesResult.error,
    );
  }

  if (
    pagamentosResult.error
  ) {
    console.error(
      "Erro pagamentos recebimentos:",
      pagamentosResult.error,
    );
  }

  const parcelas =
    parcelasResult.data ??
    [];

  const clientes =
    clientesResult.data ??
    [];

  const pagamentos =
    pagamentosResult.data ??
    [];

  const config =
    configResult.data;

  const politica:
    PoliticaCredito = {
      alertaQtdAtrasos:
        config
          ?.credito_alerta_qtd_atrasos ??
        POLITICA_CREDITO_PADRAO
          .alertaQtdAtrasos,

      bloqueioQtdAtrasos:
        config
          ?.credito_bloqueio_qtd_atrasos ??
        POLITICA_CREDITO_PADRAO
          .bloqueioQtdAtrasos,

      diasTolerancia:
        config
          ?.credito_dias_tolerancia ??
        POLITICA_CREDITO_PADRAO
          .diasTolerancia,

      permitirExcecao:
        config
          ?.credito_permitir_excecao ??
        POLITICA_CREDITO_PADRAO
          .permitirExcecao,

      validadeExcecaoDias:
        config
          ?.credito_validade_excecao_dias ??
        POLITICA_CREDITO_PADRAO
          .validadeExcecaoDias,
    };

  const liberacoesMap =
    new Map<
      number,
      {
        id: number;
        motivo: string;
        validoAte: string;
      }
    >();

  for (
    const liberacao of
      liberacoesResult.data ??
      []
  ) {
    if (
      !liberacoesMap.has(
        liberacao.cliente_id,
      )
    ) {
      liberacoesMap.set(
        liberacao.cliente_id,
        {
          id:
            liberacao.id,

          motivo:
            liberacao.motivo,

          validoAte:
            liberacao.valido_ate,
        },
      );
    }
  }

  const clientesMap =
    new Map(
      clientes.map(
        (cliente) => [
          cliente.id,
          cliente,
        ],
      ),
    );

  const hoje =
    hojeFortaleza();

  const limiteAtraso =
    dataLimiteAtraso(
      hoje,
      politica.diasTolerancia,
    );

  const porCliente =
    new Map<
      number,
      {
        saldo: number;
        parcelas: number;
        vencidas: number;
      }
    >();

  for (
    const parcela of parcelas
  ) {
    const atual =
      porCliente.get(
        parcela.cliente_id,
      ) ?? {
        saldo: 0,
        parcelas: 0,
        vencidas: 0,
      };

    atual.saldo +=
      Number(
        parcela.valor,
      ) -
      Number(
        parcela.valor_pago,
      );

    atual.parcelas +=
      1;

    if (
      parcela.vencimento <
      limiteAtraso
    ) {
      atual.vencidas +=
        1;
    }

    porCliente.set(
      parcela.cliente_id,
      atual,
    );
  }

  const clientesComSaldo =
    clientes
      .filter(
        (cliente) =>
          porCliente.has(
            cliente.id,
          ),
      )
      .map(
        (cliente) => ({
          ...cliente,
          resumo:
            porCliente.get(
              cliente.id,
            )!,
        }),
      )
      .sort(
        (a, b) =>
          b.resumo.vencidas -
            a.resumo.vencidas ||
          a.nome.localeCompare(
            b.nome,
          ),
      );

  const saldoTotal =
    clientesComSaldo.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.resumo.saldo,
      0,
    );

  const totalVencidas =
    clientesComSaldo.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.resumo.vencidas,
      0,
    );

  const recebidoHoje =
    pagamentos
      .filter(
        (pagamento) =>
          new Intl.DateTimeFormat(
            "en-CA",
            {
              timeZone:
                "America/Fortaleza",
              year:
                "numeric",
              month:
                "2-digit",
              day:
                "2-digit",
            },
          ).format(
            new Date(
              pagamento.created_at,
            ),
          ) === hoje,
      )
      .reduce(
        (
          total,
          pagamento,
        ) =>
          total +
          Number(
            pagamento.valor,
          ),
        0,
      );

  const carteiraRegular =
    totalVencidas === 0;

  return (
    <main className="app-premium min-h-dvh text-[#142018]">

      <div className="mx-auto min-h-dvh w-full max-w-[480px] overflow-hidden bg-[#f7faf7]/90 shadow-[0_0_70px_rgba(17,63,33,0.14)]">

        {/* =================================================
            HERO - MESMA ANATOMIA DA ROTA
        ================================================= */}

        <header className="hero-premium grain relative overflow-hidden px-5 pb-7 pt-5 text-white">

          <div className="pointer-events-none absolute -right-20 -top-20 h-[210px] w-[210px] rounded-full border-[30px] border-white/[0.035]" />

          <div className="pointer-events-none absolute -bottom-20 -left-16 h-[180px] w-[180px] rounded-full bg-white/[0.035]" />

          <div className="relative z-10 flex items-center justify-between">

            <Link
              href="/mobile"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.08] backdrop-blur-xl transition active:scale-95"
            >
              <ArrowLeft
                size={19}
              />
            </Link>

            <div className="text-center">

              <p className="text-[8px] font-black uppercase tracking-[0.24em] text-emerald-200">
                Financeiro
              </p>

              <h1 className="mt-1 text-lg font-black tracking-[-0.03em]">
                Recebimentos
              </h1>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.08]">

              <WalletCards
                size={19}
              />

            </div>

          </div>

          {/* IDENTIFICAÇÃO */}

          <div className="relative z-10 mt-7">

            <div className="flex items-start justify-between gap-4">

              <div>

                <div className="flex items-center gap-2">

                  <Coins
                    size={14}
                    className="text-[#f4b13f]"
                  />

                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200">
                    Carteira em campo
                  </p>

                </div>

                <h2 className="mt-3 text-[30px] font-black leading-none tracking-[-0.05em]">

                  <span className="text-[#f4b13f]">
                    {
                      clientesComSaldo.length
                    }
                  </span>{" "}

                  cliente
                  {clientesComSaldo.length ===
                  1
                    ? ""
                    : "s"}

                </h2>

                <p className="mt-3 text-[10px] font-semibold text-white/55">
                  Com valores em aberto
                </p>

              </div>

              <span
                className={`rounded-full px-4 py-2 text-[8px] font-black uppercase tracking-[0.12em] ${
                  carteiraRegular
                    ? "bg-white text-[#176f3c]"
                    : "bg-[#f4b13f] text-[#4d3100]"
                }`}
              >
                {carteiraRegular
                  ? "Regular"
                  : "Atenção"}
              </span>

            </div>

            {/* BLOCO PRINCIPAL - EQUIVALENTE AO PROGRESSO DA ROTA */}

            <div className="mt-7 rounded-[22px] border border-white/10 bg-white/[0.07] p-4 backdrop-blur-xl">

              <div className="flex items-end justify-between gap-4">

                <div>

                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/45">
                    Saldo em aberto
                  </p>

                  <p className="mt-1 text-[11px] font-bold text-white/80">
                    Valor disponível para recebimento
                  </p>

                </div>

                <p className="text-[24px] font-black tracking-[-0.05em]">
                  {moeda(
                    saldoTotal,
                  )}
                </p>

              </div>

              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-black/10">

                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#f4b13f,#ffe8a8)]"
                  style={{
                    width:
                      saldoTotal >
                      0
                        ? "100%"
                        : "0%",
                  }}
                />

              </div>

            </div>

            {/* KPIs - MESMO PADRÃO DA ROTA */}

            <div className="mt-3 grid grid-cols-3 gap-2.5">

              <HeroKpi
                label="Clientes"
                valor={
                  String(
                    clientesComSaldo.length,
                  )
                }
              />

              <HeroKpi
                label="Vencidas"
                valor={
                  String(
                    totalVencidas,
                  )
                }
                destaque={
                  totalVencidas >
                  0
                }
              />

              <HeroKpi
                label="Recebido hoje"
                valor={
                  moeda(
                    recebidoHoje,
                  )
                }
              />

            </div>

          </div>

        </header>

        {/* =================================================
            CONTEÚDO
        ================================================= */}

        <div className="px-5 pb-10 pt-5">

          {/* RESUMO OPERACIONAL - MESMO LOCAL DO CARD
              "FINALIZADA COM OCORRÊNCIA" DA ROTA */}

          {carteiraRegular ? (
            <div className="relative mb-6 overflow-hidden rounded-[26px] border border-emerald-200 bg-[linear-gradient(135deg,#ecfdf3,#ffffff)] p-5 shadow-[0_20px_50px_-30px_rgba(16,185,129,0.45)]">

              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#f4b13f]/10" />

              <div className="relative flex items-start gap-4">

                <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[17px] bg-[#178548] text-white">

                  <CircleCheckBig
                    size={23}
                  />

                </div>

                <div>

                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-600">
                    Carteira regular
                  </p>

                  <h3 className="mt-2 text-[18px] font-black tracking-[-0.03em]">
                    Nenhuma parcela vencida
                  </h3>

                  <p className="mt-2 text-[10px] leading-5 text-slate-500">
                    Os clientes abaixo possuem cobranças abertas, mas estão dentro do vencimento.
                  </p>

                </div>

              </div>

            </div>
          ) : (
            <div className="relative mb-6 overflow-hidden rounded-[26px] border border-amber-200 bg-[linear-gradient(135deg,#fff9eb,#ffffff)] p-5 shadow-[0_20px_50px_-30px_rgba(180,120,10,0.35)]">

              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-100/60" />

              <div className="relative flex items-start gap-4">

                <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[17px] bg-amber-500 text-white">

                  <AlertTriangle
                    size={23}
                  />

                </div>

                <div>

                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-amber-700">
                    Atenção financeira
                  </p>

                  <h3 className="mt-2 text-[18px] font-black tracking-[-0.03em]">
                    Parcelas vencidas
                  </h3>

                  <p className="mt-2 text-[10px] leading-5 text-slate-500">
                    Existem {totalVencidas} parcela
                    {totalVencidas ===
                    1
                      ? ""
                      : "s"}{" "}
                    vencida
                    {totalVencidas ===
                    1
                      ? ""
                      : "s"}{" "}
                    na carteira.
                  </p>

                </div>

              </div>

            </div>
          )}

          {/* TÍTULO */}

          <div className="mb-4 flex items-end justify-between">

            <div>

              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#b8770d]">
                Carteira
              </p>

              <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                Clientes a receber
              </h3>

            </div>

            <span className="rounded-full border border-emerald-100 bg-white px-3 py-2 text-[8px] font-black uppercase text-[#176f3c] shadow-sm">

              {
                clientesComSaldo.length
              }{" "}

              cliente
              {clientesComSaldo.length ===
              1
                ? ""
                : "s"}

            </span>

          </div>

          {/* CLIENTES - CÓPIA DA ANATOMIA DO CARD DA ROTA */}

          <section className="space-y-4">

            {clientesComSaldo.length ===
            0 ? (
              <div className="relative overflow-hidden rounded-[28px] border border-emerald-200 bg-[linear-gradient(145deg,#f0fbf4,#ffffff)] p-6 text-center shadow-[0_18px_40px_-28px_rgba(16,185,129,0.55)]">

                <CircleCheckBig
                  size={34}
                  className="mx-auto text-emerald-600"
                />

                <h4 className="mt-4 text-[18px] font-black">
                  Nenhum recebimento pendente
                </h4>

                <p className="mt-2 text-[10px] leading-5 text-slate-400">
                  Não existem parcelas em aberto.
                </p>

              </div>
            ) : (
              clientesComSaldo.map(
                (
                  item,
                  index,
                ) => {
                  const avaliacao =
                    avaliarCredito({
                      qtdAtrasos:
                        item.resumo.vencidas,

                      politica,

                      liberacaoAtiva:
                        liberacoesMap.get(
                          item.id,
                        ) ??
                        null,
                    });

                  const situacao =
                    avaliacao.statusEfetivo;

                  const comAlerta =
                    avaliacao.statusBase !==
                    "LIBERADO";

                  return (
                    <article
                      key={
                        item.id
                      }
                      className={`relative overflow-hidden rounded-[28px] border p-5 shadow-[0_22px_55px_-32px_rgba(17,63,33,0.22)] ${
                        comAlerta
                          ? "border-amber-200 bg-[linear-gradient(145deg,#fffaf0,#ffffff)]"
                          : "border-emerald-200 bg-[linear-gradient(145deg,#f0fbf4,#ffffff)]"
                      }`}
                    >

                      <div
                        className={`absolute inset-x-0 top-0 h-[3px] ${
                          comAlerta
                            ? "bg-[linear-gradient(90deg,#f59e0b,#facc15)]"
                            : "bg-[linear-gradient(90deg,#16a05d,#8ee9b2)]"
                        }`}
                      />

                      {/* CABEÇALHO */}

                      <div className="flex items-start gap-4">

                        <div
                          className={`flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[18px] shadow-sm ${
                            comAlerta
                              ? "bg-amber-500 text-white"
                              : "bg-[#159653] text-white"
                          }`}
                        >
                          <UserRound
                            size={23}
                          />
                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="flex items-start justify-between gap-3">

                            <div className="min-w-0">

                              <h4 className="truncate text-[18px] font-black tracking-[-0.035em]">
                                {item.nome}
                              </h4>

                              <p className="mt-1 text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                                {
                                  item.codigo
                                }
                              </p>

                            </div>

                            <CreditoBadge
                              situacao={
                                situacao
                              }
                            />

                          </div>

                        </div>

                      </div>

                      {/* SALDO - MESMO PAPEL DO ENDEREÇO NA ROTA */}

                      <div className="mt-4 rounded-[18px] bg-[#f7f9f7]/90 p-3.5">

                        <div className="flex items-center gap-2.5">

                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-white text-[#176f3c] shadow-sm">

                            <ReceiptText
                              size={13}
                            />

                          </div>

                          <div className="min-w-0 flex-1">

                            <p className="text-[7px] font-black uppercase tracking-[0.16em] text-slate-400">
                              Saldo em aberto
                            </p>

                            <p className="mt-1 text-[14px] font-black text-[#142018]">
                              {moeda(
                                item.resumo.saldo,
                              )}
                            </p>

                          </div>

                        </div>

                      </div>

                      {/* MICRO INFO - IGUAL ROTA */}

                      <div className="mt-3 grid grid-cols-2 gap-2">

                        <div className="rounded-[14px] border border-slate-100 bg-white/90 px-3 py-2.5">

                          <p className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-400">
                            Parcelas abertas
                          </p>

                          <p className="mt-1 text-[11px] font-black">
                            {
                              item.resumo.parcelas
                            }
                          </p>

                        </div>

                        <div
                          className={`rounded-[14px] border px-3 py-2.5 ${
                            item.resumo.vencidas >
                            0
                              ? "border-amber-200 bg-amber-50"
                              : "border-slate-100 bg-white/90"
                          }`}
                        >

                          <p className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-400">
                            Vencidas
                          </p>

                          <p
                            className={`mt-1 text-[11px] font-black ${
                              item.resumo.vencidas >
                              0
                                ? "text-amber-700"
                                : ""
                            }`}
                          >
                            {
                              item.resumo.vencidas
                            }
                          </p>

                        </div>

                      </div>

                      {/* AÇÃO - IGUAL ATENDER CLIENTE */}

                      <Link
                        href={`/mobile/recebimentos/${item.id}`}
                        className="mt-5 flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#1f8a4c,#0d5d31)] text-[13px] font-black text-white shadow-[0_16px_30px_rgba(23,111,60,0.30)] transition active:scale-[0.985]"
                      >

                        <Banknote
                          size={18}
                        />

                        Abrir recebimento

                        <ChevronRight
                          size={17}
                        />

                      </Link>

                    </article>
                  );
                },
              )
            )}

          </section>

          {/* HISTÓRICO */}

          {pagamentos.length >
            0 && (
            <section className="mt-8">

              <div className="mb-4">

                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#b8770d]">
                  Histórico
                </p>

                <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                  Últimos recebimentos
                </h3>

              </div>

              <div className="space-y-3">

                {pagamentos.map(
                  (
                    pagamento,
                  ) => {
                    const cliente =
                      clientesMap.get(
                        pagamento.cliente_id,
                      );

                    return (
                      <div
                        key={
                          pagamento.id
                        }
                        className="relative overflow-hidden rounded-[22px] border border-black/[0.045] bg-white p-4 shadow-[0_12px_30px_rgba(17,63,33,0.06)]"
                      >

                        <div className="absolute inset-y-0 left-0 w-[3px] bg-[linear-gradient(180deg,#f4b13f,#176f3c)]" />

                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-emerald-50 text-[#176f3c]">

                            <Coins
                              size={17}
                            />

                          </div>

                          <div className="min-w-0 flex-1">

                            <p className="truncate text-[12px] font-black">
                              {cliente?.nome ??
                                "Cliente"}
                            </p>

                            <div className="mt-1 flex items-center gap-1.5 text-[8px] font-semibold text-slate-400">

                              <Clock3
                                size={11}
                              />

                              {
                                pagamento.forma_pagamento
                              }{" "}
                              •{" "}
                              {dataLocal(
                                pagamento.created_at,
                              )}

                            </div>

                          </div>

                          <p className="text-[15px] font-black text-[#176f3c]">
                            {moeda(
                              Number(
                                pagamento.valor,
                              ),
                            )}
                          </p>

                        </div>

                      </div>
                    );
                  },
                )}

              </div>

            </section>
          )}

          <Link
            href="/mobile"
            className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-[17px] border border-emerald-100 bg-white text-xs font-black text-[#176f3c]"
          >

            <ArrowLeft
              size={16}
            />

            Voltar ao início

          </Link>

        </div>

      </div>

    </main>
  );
}

/* =========================================================
   KPI
========================================================= */

function HeroKpi({
  label,
  valor,
  destaque = false,
}: {
  label: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.07] px-3 py-3 backdrop-blur-xl">

      <p className="text-[7px] font-black uppercase tracking-[0.13em] text-white/45">
        {label}
      </p>

      <p
        className={`mt-1 truncate text-[13px] font-black ${
          destaque
            ? "text-[#ffd67d]"
            : "text-white"
        }`}
      >
        {valor}
      </p>

    </div>
  );
}

/* =========================================================
   BADGE CRÉDITO
========================================================= */

function CreditoBadge({
  situacao,
}: {
  situacao:
    | "LIBERADO"
    | "ALERTA"
    | "BLOQUEADO"
    | "LIBERADO_EXCECAO";
}) {
  if (
    situacao ===
    "BLOQUEADO"
  ) {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-3 py-1.5 text-[8px] font-black uppercase text-red-700">

        <ShieldAlert
          size={11}
        />

        Bloqueado

      </span>
    );
  }

  if (
    situacao ===
    "ALERTA"
  ) {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-[8px] font-black uppercase text-amber-700">

        <AlertTriangle
          size={11}
        />

        Alerta

      </span>
    );
  }

  if (
    situacao ===
    "LIBERADO_EXCECAO"
  ) {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-sky-100 px-3 py-1.5 text-[8px] font-black uppercase text-sky-700">

        <ShieldCheck
          size={11}
        />

        Exceção

      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1.5 text-[8px] font-black uppercase text-emerald-700">
      Liberado
    </span>
  );
}
