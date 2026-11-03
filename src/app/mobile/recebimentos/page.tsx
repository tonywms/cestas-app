export const instant = false;

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Banknote,
  Coins,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  WalletCards,
  Route,
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

import {
  adicionarCobrancaNaRota,
} from "./actions";

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

function somarDiasISO(
  data: string,
  dias: number,
) {
  const [
    ano,
    mes,
    dia,
  ] = data
    .split("-")
    .map(Number);

  const valor =
    new Date(
      Date.UTC(
        ano,
        mes - 1,
        dia + dias,
      ),
    );

  return valor
    .toISOString()
    .slice(0, 10);
}

function agendaVisual(
  status:
    | "ATRASADO"
    | "HOJE"
    | "PROXIMOS_7"
    | "AGENDADO"
    | "SEM_PREVISAO",
) {
  if (
    status ===
    "ATRASADO"
  ) {
    return {
      label:
        "Atrasado",
      classe:
        "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (
    status ===
    "HOJE"
  ) {
    return {
      label:
        "Visitar hoje",
      classe:
        "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (
    status ===
    "PROXIMOS_7"
  ) {
    return {
      label:
        "Próximos 7 dias",
      classe:
        "border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  if (
    status ===
    "AGENDADO"
  ) {
    return {
      label:
        "Agendado",
      classe:
        "border-emerald-100 bg-emerald-50 text-emerald-700",
    };
  }

  return {
    label:
      "Sem previsão",
    classe:
      "border-slate-200 bg-slate-50 text-slate-500",
  };
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

type PageProps = {
  searchParams:
    Promise<{
      q?: string;
      filtro?: string;
      pagina?: string;
      historico?: string;
    }>;
};

export default async function RecebimentosPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

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
    contratosResult,
    clientesResult,
    pagamentosResult,
    configResult,
    liberacoesResult,
  ] = await Promise.all([
    supabase
      .from("parcelas")
      .select(`
        id,
        contrato_id,
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
      .from("contratos")
      .select(`
        id,
        cliente_id,
        modalidade,
        proxima_visita_sugerida,
        status
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "status",
        "ATIVO",
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
    contratosResult.error
  ) {
    console.error(
      "Erro contratos recebimentos:",
      contratosResult.error,
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

  const contratos =
    contratosResult.data ??
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

  const contratosMap =
    new Map(
      contratos.map(
        (contrato) => [
          contrato.id,
          contrato,
        ],
      ),
    );

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
        flexiveis: number;
        proximaVisita: string | null;
        proximoVencimento: string | null;
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
        flexiveis: 0,
        proximaVisita: null,
        proximoVencimento: null,
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
      !atual.proximoVencimento ||
      parcela.vencimento <
        atual.proximoVencimento
    ) {
      atual.proximoVencimento =
        parcela.vencimento;
    }

    if (
      parcela.vencimento <
      limiteAtraso
    ) {
      atual.vencidas +=
        1;
    }

    const contrato =
      contratosMap.get(
        parcela.contrato_id,
      );

    if (
      contrato?.modalidade ===
      "SALDO_ABERTO"
    ) {
      atual.flexiveis += 1;

      const sugestao =
        contrato.proxima_visita_sugerida;

      if (
        sugestao &&
        (
          !atual.proximaVisita ||
          sugestao < atual.proximaVisita
        )
      ) {
        atual.proximaVisita =
          sugestao;
      }
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
          String(a.resumo.proximaVisita ?? "9999-12-31").localeCompare(
            String(b.resumo.proximaVisita ?? "9999-12-31"),
          ) ||
          a.nome.localeCompare(
            b.nome,
          ),
      );

  const limiteSeteDias =
    somarDiasISO(
      hoje,
      7,
    );

  const clientesAgenda =
    clientesComSaldo
      .map(
        (item) => {
          const datas =
            [
              item.resumo
                .proximaVisita,
              item.resumo
                .proximoVencimento,
            ]
              .filter(
                (
                  valor,
                ): valor is string =>
                  Boolean(
                    valor,
                  ),
              )
              .sort();

          const dataAgenda =
            datas[0] ??
            null;

          const statusAgenda:
            | "ATRASADO"
            | "HOJE"
            | "PROXIMOS_7"
            | "AGENDADO"
            | "SEM_PREVISAO" =
            !dataAgenda
              ? "SEM_PREVISAO"
              : dataAgenda <
                  hoje
                ? "ATRASADO"
                : dataAgenda ===
                    hoje
                  ? "HOJE"
                  : dataAgenda <=
                      limiteSeteDias
                    ? "PROXIMOS_7"
                    : "AGENDADO";

          return {
            ...item,
            agenda: {
              data:
                dataAgenda,
              status:
                statusAgenda,
            },
          };
        },
      )
      .sort(
        (
          a,
          b,
        ) => {
          const peso = {
            ATRASADO: 0,
            HOJE: 1,
            PROXIMOS_7: 2,
            AGENDADO: 3,
            SEM_PREVISAO: 4,
          } as const;

          return (
            peso[
              a.agenda.status
            ] -
              peso[
                b.agenda.status
              ] ||
            String(
              a.agenda.data ??
                "9999-12-31",
            ).localeCompare(
              String(
                b.agenda.data ??
                  "9999-12-31",
              ),
            ) ||
            a.nome.localeCompare(
              b.nome,
            )
          );
        },
      );

  const agendaAtrasados =
    clientesAgenda.filter(
      (item) =>
        item.agenda.status ===
        "ATRASADO",
    ).length;

  const agendaHoje =
    clientesAgenda.filter(
      (item) =>
        item.agenda.status ===
        "HOJE",
    ).length;

  const agendaSeteDias =
    clientesAgenda.filter(
      (item) =>
        item.agenda.status ===
        "PROXIMOS_7",
    ).length;

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

  const busca =
    String(
      params.q ??
        "",
    )
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .toLocaleLowerCase(
        "pt-BR",
      )
      .trim();

  const filtrosValidos =
    new Set([
      "PRIORIDADE",
      "ATRASADO",
      "HOJE",
      "PROXIMOS_7",
      "AGENDADO",
    ]);

  const filtro =
    filtrosValidos.has(
      String(
        params.filtro ??
          "PRIORIDADE",
      ),
    )
      ? String(
          params.filtro ??
            "PRIORIDADE",
        )
      : "PRIORIDADE";

  const paginaSolicitada =
    Math.max(
      1,
      Number.parseInt(
        String(
          params.pagina ??
            "1",
        ),
        10,
      ) || 1,
    );

  const historicoAberto =
    params.historico ===
    "1";

  const normalizarBusca = (
    valor:
      string | null | undefined,
  ) =>
    String(
      valor ??
        "",
    )
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .toLocaleLowerCase(
        "pt-BR",
      );

  const clientesFiltrados =
    clientesAgenda.filter(
      (item) => {
        const correspondeBusca =
          !busca ||
          [
            item.nome,
            item.codigo,
            item.bairro,
            item.telefone,
          ].some(
            (valor) =>
              normalizarBusca(
                valor,
              ).includes(
                busca,
              ),
          );

        if (
          !correspondeBusca
        ) {
          return false;
        }

        if (
          filtro ===
          "PRIORIDADE"
        ) {
          return true;
        }

        return (
          item.agenda.status ===
          filtro
        );
      },
    );

  const ITENS_POR_PAGINA =
    12;

  const totalPaginas =
    Math.max(
      1,
      Math.ceil(
        clientesFiltrados.length /
          ITENS_POR_PAGINA,
      ),
    );

  const paginaAtual =
    Math.min(
      paginaSolicitada,
      totalPaginas,
    );

  const inicioPagina =
    (paginaAtual - 1) *
    ITENS_POR_PAGINA;

  const clientesPagina =
    clientesFiltrados.slice(
      inicioPagina,
      inicioPagina +
        ITENS_POR_PAGINA,
    );

  const agendaAgendados =
    clientesAgenda.filter(
      (item) =>
        item.agenda.status ===
        "AGENDADO",
    ).length;

  function montarUrl(
    alteracoes: {
      q?: string | null;
      filtro?: string | null;
      pagina?: number | null;
      historico?: boolean | null;
    } = {},
  ) {
    const query =
      new URLSearchParams();

    const qFinal =
      alteracoes.q !==
      undefined
        ? alteracoes.q
        : params.q ??
          "";

    const filtroFinal =
      alteracoes.filtro !==
      undefined
        ? alteracoes.filtro
        : filtro;

    const paginaFinal =
      alteracoes.pagina !==
      undefined
        ? alteracoes.pagina
        : paginaAtual;

    const historicoFinal =
      alteracoes.historico !==
      undefined
        ? alteracoes.historico
        : historicoAberto;

    if (
      qFinal?.trim()
    ) {
      query.set(
        "q",
        qFinal.trim(),
      );
    }

    if (
      filtroFinal &&
      filtroFinal !==
        "PRIORIDADE"
    ) {
      query.set(
        "filtro",
        filtroFinal,
      );
    }

    if (
      paginaFinal &&
      paginaFinal > 1
    ) {
      query.set(
        "pagina",
        String(
          paginaFinal,
        ),
      );
    }

    if (
      historicoFinal
    ) {
      query.set(
        "historico",
        "1",
      );
    }

    const texto =
      query.toString();

    return texto
      ? `/mobile/recebimentos?${texto}`
      : "/mobile/recebimentos";
  }

  return (
    <main className="app-premium min-h-dvh text-[#142018]">

      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f7faf7]/95 shadow-[0_0_70px_rgba(17,63,33,0.14)]">

        <header className="hero-premium grain relative overflow-hidden px-4 pb-4 pt-4 text-white">

          <div className="pointer-events-none absolute -right-14 -top-16 h-[150px] w-[150px] rounded-full border-[24px] border-white/[0.035]" />

          <div className="relative z-10 flex items-center justify-between">

            <Link
              href="/mobile"
              className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-white/10 bg-white/[0.08] transition active:scale-95"
            >
              <ArrowLeft size={18} />
            </Link>

            <div className="text-center">
              <p className="text-[7px] font-black uppercase tracking-[0.22em] text-emerald-200">
                Financeiro
              </p>
              <h1 className="mt-0.5 text-[17px] font-black tracking-[-0.03em]">
                Recebimentos
              </h1>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-white/10 bg-white/[0.08]">
              <WalletCards size={18} />
            </div>

          </div>

          <div className="relative z-10 mt-4 grid grid-cols-2 gap-2">

            <div className="rounded-[16px] border border-white/10 bg-white/[0.08] px-3 py-2.5">
              <p className="text-[7px] font-black uppercase tracking-[0.12em] text-white/50">
                Em aberto
              </p>
              <p className="mt-1 text-[18px] font-black tracking-[-0.04em]">
                {moeda(saldoTotal)}
              </p>
              <p className="mt-0.5 text-[8px] font-semibold text-white/50">
                {clientesComSaldo.length} cliente{clientesComSaldo.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="rounded-[16px] border border-white/10 bg-white/[0.08] px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[7px] font-black uppercase tracking-[0.12em] text-white/50">
                    Recebido hoje
                  </p>
                  <p className="mt-1 text-[18px] font-black tracking-[-0.04em]">
                    {moeda(recebidoHoje)}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[7px] font-black uppercase ${carteiraRegular ? "bg-emerald-100 text-emerald-700" : "bg-amber-300 text-amber-900"}`}>
                  {totalVencidas > 0 ? `${totalVencidas} venc.` : "Regular"}
                </span>
              </div>
            </div>

          </div>

        </header>

        <div className="px-4 pb-24 pt-3">

          <section className="sticky top-0 z-30 -mx-4 border-b border-slate-100 bg-[#f7faf7]/95 px-4 pb-3 pt-2 backdrop-blur-xl">

            <form
              method="get"
              action="/mobile/recebimentos"
              className="flex gap-2"
            >

              {filtro !== "PRIORIDADE" && (
                <input type="hidden" name="filtro" value={filtro} />
              )}

              <div className="relative min-w-0 flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  name="q"
                  defaultValue={params.q ?? ""}
                  placeholder="Nome, código, bairro ou telefone"
                  className="h-[46px] w-full rounded-[15px] border border-slate-200 bg-white pl-10 pr-3 text-[11px] font-bold outline-none focus:border-emerald-400"
                />
              </div>

              <button
                type="submit"
                className="flex h-[46px] w-[52px] shrink-0 items-center justify-center rounded-[15px] bg-[#176f3c] text-white shadow-[0_10px_20px_rgba(23,111,60,0.20)] active:scale-[0.97]"
                aria-label="Buscar"
              >
                <Search size={17} />
              </button>

              {busca && (
                <Link
                  href={montarUrl({ q: null, pagina: 1 })}
                  className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[15px] border border-slate-200 bg-white text-slate-500"
                  aria-label="Limpar busca"
                >
                  ×
                </Link>
              )}

            </form>

            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

              <FiltroChip
                href={montarUrl({ filtro: "PRIORIDADE", pagina: 1 })}
                ativo={filtro === "PRIORIDADE"}
                label="Prioridade"
                count={clientesAgenda.length}
              />

              <FiltroChip
                href={montarUrl({ filtro: "ATRASADO", pagina: 1 })}
                ativo={filtro === "ATRASADO"}
                label="Atrasados"
                count={agendaAtrasados}
                tom="red"
              />

              <FiltroChip
                href={montarUrl({ filtro: "HOJE", pagina: 1 })}
                ativo={filtro === "HOJE"}
                label="Hoje"
                count={agendaHoje}
                tom="amber"
              />

              <FiltroChip
                href={montarUrl({ filtro: "PROXIMOS_7", pagina: 1 })}
                ativo={filtro === "PROXIMOS_7"}
                label="7 dias"
                count={agendaSeteDias}
                tom="sky"
              />

              <FiltroChip
                href={montarUrl({ filtro: "AGENDADO", pagina: 1 })}
                ativo={filtro === "AGENDADO"}
                label="Agendados"
                count={agendaAgendados}
              />

            </div>

          </section>

          <div className="mb-2 mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[7px] font-black uppercase tracking-[0.17em] text-[#b8770d]">
                Carteira operacional
              </p>
              <h2 className="mt-0.5 text-[16px] font-black tracking-[-0.03em]">
                {clientesFiltrados.length} resultado{clientesFiltrados.length === 1 ? "" : "s"}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
                Página
              </p>
              <p className="mt-0.5 text-[11px] font-black text-slate-600">
                {paginaAtual}/{totalPaginas}
              </p>
            </div>
          </div>

          <section className="space-y-2.5">

            {clientesPagina.length === 0 ? (
              <div className="rounded-[20px] border border-slate-200 bg-white p-6 text-center shadow-sm">
                <Search size={28} className="mx-auto text-slate-300" />
                <h3 className="mt-3 text-[15px] font-black">
                  Nenhum cliente encontrado
                </h3>
                <p className="mt-1 text-[9px] leading-4 text-slate-400">
                  Altere o filtro ou procure pelo nome, código, bairro ou telefone.
                </p>
              </div>
            ) : (
              clientesPagina.map((item) => {
                const avaliacao =
                  avaliarCredito({
                    qtdAtrasos: item.resumo.vencidas,
                    politica,
                    liberacaoAtiva: liberacoesMap.get(item.id) ?? null,
                  });

                const situacao =
                  avaliacao.statusEfetivo;

                const visual =
                  agendaVisual(item.agenda.status);

                return (
                  <article
                    key={item.id}
                    className="relative overflow-hidden rounded-[20px] border border-slate-100 bg-white p-3 shadow-[0_12px_28px_rgba(17,63,33,0.07)]"
                  >

                    <div className={`absolute inset-y-0 left-0 w-[3px] ${item.agenda.status === "ATRASADO" ? "bg-red-400" : item.agenda.status === "HOJE" ? "bg-amber-400" : "bg-emerald-400"}`} />

                    <div className="flex items-start gap-3 pl-1">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-emerald-50 text-[#176f3c]">
                        <UserRound size={18} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-[13px] font-black tracking-[-0.02em]">
                              {item.nome}
                            </h3>
                            <p className="mt-0.5 truncate text-[7px] font-bold uppercase tracking-[0.11em] text-slate-400">
                              {item.codigo}{item.bairro ? ` • ${item.bairro}` : ""}
                            </p>
                          </div>
                          <p className="shrink-0 text-[14px] font-black text-[#176f3c]">
                            {moeda(item.resumo.saldo)}
                          </p>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-full border px-2 py-1 text-[6px] font-black uppercase ${visual.classe}`}>
                            {visual.label}
                          </span>
                          {item.agenda.data && (
                            <span className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[7px] font-black text-slate-500">
                              <CalendarDays size={9} />
                              {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza" }).format(new Date(`${item.agenda.data}T12:00:00`))}
                            </span>
                          )}
                          <CreditoBadge situacao={situacao} compacto />
                          <span className="rounded-full bg-slate-50 px-2 py-1 text-[7px] font-black text-slate-500">
                            {item.resumo.parcelas} aberta{item.resumo.parcelas === 1 ? "" : "s"}
                          </span>
                          {item.resumo.vencidas > 0 && (
                            <span className="rounded-full bg-red-50 px-2 py-1 text-[7px] font-black text-red-600">
                              {item.resumo.vencidas} vencida{item.resumo.vencidas === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>

                      </div>

                    </div>

                    <div className="mt-3 grid grid-cols-[1.35fr_.65fr] gap-2 pl-1">

                      <Link
                        href={`/mobile/recebimentos/${item.id}`}
                        className="flex h-[42px] items-center justify-center gap-1.5 rounded-[13px] bg-[#176f3c] px-2 text-[10px] font-black text-white shadow-[0_10px_20px_rgba(23,111,60,0.18)] active:scale-[0.985]"
                      >
                        <Banknote size={14} />
                        Receber
                      </Link>

                      <form action={adicionarCobrancaNaRota}>
                        <input type="hidden" name="cliente_id" value={item.id} />
                        <button
                          type="submit"
                          className="flex h-[42px] w-full items-center justify-center gap-1 rounded-[13px] border border-emerald-200 bg-white px-2 text-[9px] font-black text-[#176f3c] active:scale-[0.985]"
                        >
                          <Route size={14} />
                          Rota
                        </button>
                      </form>

                    </div>

                  </article>
                );
              })
            )}

          </section>

          {totalPaginas > 1 && (
            <nav className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[18px] border border-slate-100 bg-white p-2 shadow-sm">
              {paginaAtual > 1 ? (
                <Link
                  href={montarUrl({ pagina: paginaAtual - 1 })}
                  className="flex h-[40px] items-center justify-center rounded-[12px] bg-slate-50 text-[9px] font-black text-slate-600"
                >
                  ← Anterior
                </Link>
              ) : <div />}

              <span className="px-2 text-[9px] font-black text-slate-500">
                {inicioPagina + 1}–{Math.min(inicioPagina + ITENS_POR_PAGINA, clientesFiltrados.length)} de {clientesFiltrados.length}
              </span>

              {paginaAtual < totalPaginas ? (
                <Link
                  href={montarUrl({ pagina: paginaAtual + 1 })}
                  className="flex h-[40px] items-center justify-center rounded-[12px] bg-[#176f3c] text-[9px] font-black text-white"
                >
                  Próxima →
                </Link>
              ) : <div />}
            </nav>
          )}

          {pagamentos.length > 0 && (
            <section className="mt-5">

              <Link
                href={montarUrl({ historico: !historicoAberto })}
                className="flex h-[46px] items-center justify-between rounded-[15px] border border-slate-100 bg-white px-4 text-[10px] font-black text-slate-600 shadow-sm"
              >
                <span>Últimos recebimentos</span>
                <span className="text-[#176f3c]">
                  {historicoAberto ? "Ocultar" : `Ver ${pagamentos.length}`}
                </span>
              </Link>

              {historicoAberto && (
                <div className="mt-2 space-y-2">
                  {pagamentos.map((pagamento) => {
                    const cliente = clientesMap.get(pagamento.cliente_id);
                    return (
                      <div
                        key={pagamento.id}
                        className="flex items-center gap-3 rounded-[16px] border border-slate-100 bg-white px-3 py-2.5 shadow-sm"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-emerald-50 text-[#176f3c]">
                          <Coins size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[10px] font-black">
                            {cliente?.nome ?? "Cliente"}
                          </p>
                          <p className="mt-0.5 text-[7px] font-semibold text-slate-400">
                            {pagamento.forma_pagamento} • {dataLocal(pagamento.created_at)}
                          </p>
                        </div>
                        <p className="text-[12px] font-black text-[#176f3c]">
                          {moeda(Number(pagamento.valor))}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

            </section>
          )}

          <Link
            href="/mobile"
            className="mt-5 flex h-[46px] w-full items-center justify-center gap-2 rounded-[15px] border border-emerald-100 bg-white text-[10px] font-black text-[#176f3c]"
          >
            <ArrowLeft size={14} />
            Voltar ao início
          </Link>

        </div>

      </div>

    </main>
  );
}

function FiltroChip({
  href,
  ativo,
  label,
  count,
  tom = "green",
}: {
  href: string;
  ativo: boolean;
  label: string;
  count: number;
  tom?: "green" | "red" | "amber" | "sky";
}) {
  const ativoClasse =
    tom === "red"
      ? "border-red-500 bg-red-500 text-white"
      : tom === "amber"
        ? "border-amber-500 bg-amber-500 text-white"
        : tom === "sky"
          ? "border-sky-500 bg-sky-500 text-white"
          : "border-[#176f3c] bg-[#176f3c] text-white";

  return (
    <Link
      href={href}
      className={`flex h-[34px] shrink-0 items-center gap-1.5 rounded-full border px-3 text-[8px] font-black transition active:scale-[0.97] ${
        ativo
          ? ativoClasse
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 py-0.5 text-[7px] ${ativo ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
        {count}
      </span>
    </Link>
  );
}

/* =========================================================
   BADGE CRÉDITO
========================================================= */

function CreditoBadge({
  situacao,
  compacto = false,
}: {
  situacao:
    | "LIBERADO"
    | "ALERTA"
    | "BLOQUEADO"
    | "LIBERADO_EXCECAO";
  compacto?: boolean;
}) {
  if (
    situacao ===
    "BLOQUEADO"
  ) {
    return (
      <span className={`flex shrink-0 items-center gap-1 rounded-full bg-red-100 font-black uppercase text-red-700 ${compacto ? "px-2 py-1 text-[6px]" : "px-3 py-1.5 text-[8px]"}`}>

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
      <span className={`flex shrink-0 items-center gap-1 rounded-full bg-amber-100 font-black uppercase text-amber-700 ${compacto ? "px-2 py-1 text-[6px]" : "px-3 py-1.5 text-[8px]"}`}>

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
      <span className={`flex shrink-0 items-center gap-1 rounded-full bg-sky-100 font-black uppercase text-sky-700 ${compacto ? "px-2 py-1 text-[6px]" : "px-3 py-1.5 text-[8px]"}`}>

        <ShieldCheck
          size={11}
        />

        Exceção

      </span>
    );
  }

  return (
    <span className={`shrink-0 rounded-full bg-emerald-100 font-black uppercase text-emerald-700 ${compacto ? "px-2 py-1 text-[6px]" : "px-3 py-1.5 text-[8px]"}`}>
      Liberado
    </span>
  );
}