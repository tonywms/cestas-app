export const instant = false;

import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CircleCheckBig,
  CreditCard,
  MapPin,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
  UserRound,
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

import RecebimentoForm from "./RecebimentoForm";

type PageProps = {
  params:
    Promise<{
      clienteId:
        string;
    }>;
};

function moeda(
  valor: number,
) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style:
        "currency",
      currency:
        "BRL",
    },
  ).format(valor);
}

function hojeFortaleza() {
  return new Intl.DateTimeFormat(
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
  ).format(new Date());
}

export default async function ClienteRecebimentosPage({
  params,
}: PageProps) {
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

  const {
    clienteId:
      clienteIdTexto,
  } = await params;

  const clienteId =
    Number(
      clienteIdTexto,
    );

  if (
    !Number.isInteger(
      clienteId,
    ) ||
    clienteId <= 0
  ) {
    redirect(
      "/mobile/recebimentos",
    );
  }

  const supabase =
    await createClient();

  const [
    clienteResult,
    parcelasResult,
    configResult,
    liberacaoResult,
  ] = await Promise.all([
    supabase
      .from("clientes")
      .select(`
        id,
        codigo,
        nome,
        telefone,
        logradouro,
        numero,
        bairro,
        cidade,
        uf
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "id",
        clienteId,
      )
      .eq(
        "ativo",
        true,
      )
      .maybeSingle(),

    supabase
      .from("parcelas")
      .select(`
        id,
        contrato_id,
        numero,
        vencimento,
        valor,
        valor_pago,
        status
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "cliente_id",
        clienteId,
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
        motivo,
        valido_ate
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "cliente_id",
        clienteId,
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
      )
      .limit(1)
      .maybeSingle(),
  ]);

  if (
    clienteResult.error ||
    !clienteResult.data
  ) {
    redirect(
      "/mobile/recebimentos",
    );
  }

  if (
    parcelasResult.error
  ) {
    console.error(
      "Erro parcelas cliente:",
      parcelasResult.error,
    );
  }

  const cliente =
    clienteResult.data;

  const parcelasRaw =
    parcelasResult.data ??
    [];

  const contratoIds =
    Array.from(
      new Set(
        parcelasRaw.map(
          (item) =>
            item.contrato_id,
        ),
      ),
    );

  const {
    data: contratos,
  } =
    contratoIds.length >
    0
      ? await supabase
          .from(
            "contratos",
          )
          .select(`
            id,
            codigo
          `)
          .eq(
            "empresa_id",
            usuario.empresa.id,
          )
          .in(
            "id",
            contratoIds,
          )
      : {
          data: [],
        };

  const contratosMap =
    new Map(
      (
        contratos ??
        []
      ).map(
        (
          contrato,
        ) => [
          contrato.id,
          contrato.codigo,
        ],
      ),
    );

  const hoje =
    hojeFortaleza();

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

  const limiteAtraso =
    dataLimiteAtraso(
      hoje,
      politica.diasTolerancia,
    );

  const parcelas =
    parcelasRaw.map(
      (
        item,
      ) => {
        const valor =
          Number(
            item.valor,
          );

        const valorPago =
          Number(
            item.valor_pago,
          );

        return {
          id:
            item.id,

          numero:
            item.numero,

          contratoCodigo:
            contratosMap.get(
              item.contrato_id,
            ) ??
            `Contrato ${item.contrato_id}`,

          vencimento:
            item.vencimento,

          valor,

          valorPago,

          saldo:
            valor -
            valorPago,

          status:
            item.status,

          vencida:
            item.vencimento <
            limiteAtraso,
        };
      },
    );

  const saldo =
    parcelas.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.saldo,
      0,
    );

  const vencidas =
    parcelas.filter(
      (item) =>
        item.vencida,
    ).length;

  const liberacao =
    liberacaoResult.data
      ? {
          id:
            liberacaoResult.data
              .id,

          motivo:
            liberacaoResult.data
              .motivo,

          validoAte:
            liberacaoResult.data
              .valido_ate,
        }
      : null;

  const avaliacao =
    avaliarCredito({
      qtdAtrasos:
        vencidas,

      politica,

      liberacaoAtiva:
        liberacao,
    });

  const situacao =
    avaliacao.statusEfetivo;

  const endereco =
    [
      cliente.logradouro,
      cliente.numero,
    ]
      .filter(
        Boolean,
      )
      .join(
        ", ",
      );

  return (
    <main className="app-premium min-h-dvh text-[#142018]">

      <div className="mx-auto min-h-dvh w-full max-w-[480px] overflow-hidden bg-[#f7faf7]/90 shadow-[0_0_70px_rgba(17,63,33,0.14)]">

        {/* HERO - MESMO PADRÃO DA ROTA */}

        <header className="hero-premium grain relative overflow-hidden px-5 pb-7 pt-5 text-white">

          <div className="pointer-events-none absolute -right-20 -top-20 h-[210px] w-[210px] rounded-full border-[30px] border-white/[0.035]" />

          <div className="relative z-10 flex items-center justify-between">

            <Link
              href="/mobile/recebimentos"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.08]"
            >
              <ArrowLeft
                size={19}
              />
            </Link>

            <div className="text-center">

              <p className="text-[8px] font-black uppercase tracking-[0.24em] text-emerald-200">
                Financeiro
              </p>

              <h1 className="mt-1 text-lg font-black">
                Receber
              </h1>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.08]">

              <CreditCard
                size={19}
              />

            </div>

          </div>

          <div className="relative z-10 mt-7">

            <div className="flex items-start justify-between gap-4">

              <div>

                <div className="flex items-center gap-2">

                  <UserRound
                    size={14}
                    className="text-[#f4b13f]"
                  />

                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200">
                    {
                      cliente.codigo
                    }
                  </p>

                </div>

                <h2 className="mt-3 text-[30px] font-black leading-none tracking-[-0.05em]">
                  {
                    cliente.nome
                  }
                </h2>

                <div className="mt-3 flex items-center gap-2 text-white/55">

                  <MapPin
                    size={13}
                  />

                  <span className="max-w-[280px] truncate text-[10px] font-semibold">

                    {endereco ||
                      "Endereço não informado"}

                    {cliente.bairro
                      ? ` - ${cliente.bairro}`
                      : ""}

                  </span>

                </div>

              </div>

              <CreditoBadge
                situacao={
                  situacao
                }
              />

            </div>

            {/* SALDO PRINCIPAL */}

            <div className="mt-7 rounded-[22px] border border-white/10 bg-white/[0.07] p-4 backdrop-blur-xl">

              <div className="flex items-end justify-between">

                <div>

                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/45">
                    Saldo em aberto
                  </p>

                  <p className="mt-1 text-[11px] font-bold text-white/80">
                    Valor disponível para recebimento
                  </p>

                </div>

                <p className="text-[25px] font-black tracking-[-0.05em]">
                  {moeda(
                    saldo,
                  )}
                </p>

              </div>

              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-black/10">

                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#f4b13f,#ffe8a8)]"
                  style={{
                    width:
                      saldo >
                      0
                        ? "100%"
                        : "0%",
                  }}
                />

              </div>

            </div>

            <div className="mt-3 grid grid-cols-3 gap-2.5">

              <HeroMini
                label="Parcelas"
                valor={
                  String(
                    parcelas.length,
                  )
                }
              />

              <HeroMini
                label="Vencidas"
                valor={
                  String(
                    vencidas,
                  )
                }
                alerta={
                  vencidas >
                  0
                }
              />

              <HeroMini
                label="Situação"
                valor={
                  situacao ===
                  "BLOQUEADO"
                    ? "Bloqueado"
                    : situacao ===
                        "ALERTA"
                      ? "Alerta"
                      : "Liberado"
                }
              />

            </div>

          </div>

        </header>

        {/* CONTEÚDO */}

        <div className="px-5 pb-10 pt-5">

          <CreditoSituacao
            situacao={
              situacao
            }
            vencidas={
              vencidas
            }
            liberacao={
              liberacao
            }
          />

          <div className="mb-4 mt-6 flex items-end justify-between">

            <div>

              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#b8770d]">
                Cobrança
              </p>

              <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                Registrar recebimento
              </h3>

            </div>

            <span className="rounded-full border border-emerald-100 bg-white px-3 py-2 text-[8px] font-black uppercase text-[#176f3c] shadow-sm">

              {
                parcelas.length
              }{" "}

              aberta
              {parcelas.length ===
              1
                ? ""
                : "s"}

            </span>

          </div>

          {parcelas.length >
          0 ? (
            <RecebimentoForm
              clienteId={
                cliente.id
              }
              parcelas={
                parcelas
              }
            />
          ) : (
            <div className="relative overflow-hidden rounded-[28px] border border-emerald-200 bg-[linear-gradient(145deg,#f0fbf4,#ffffff)] p-7 text-center shadow-[0_18px_40px_-28px_rgba(16,185,129,0.55)]">

              <CircleCheckBig
                size={34}
                className="mx-auto text-emerald-600"
              />

              <h3 className="mt-4 text-[18px] font-black">
                Cliente sem parcelas em aberto
              </h3>

              <p className="mt-2 text-[10px] leading-5 text-slate-400">
                Todos os compromissos financeiros disponíveis estão quitados.
              </p>

            </div>
          )}

          <Link
            href="/mobile/recebimentos"
            className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-[17px] border border-emerald-100 bg-white text-xs font-black text-[#176f3c]"
          >

            <ArrowLeft
              size={16}
            />

            Voltar aos recebimentos

          </Link>

        </div>

      </div>

    </main>
  );
}

/* =========================================================
   SITUAÇÃO DE CRÉDITO - MESMO PADRÃO DO RESULTADO DA ROTA
========================================================= */

function CreditoSituacao({
  situacao,
  vencidas,
  liberacao,
}: {
  situacao:
    | "LIBERADO"
    | "ALERTA"
    | "BLOQUEADO"
    | "LIBERADO_EXCECAO";

  vencidas:
    number;

  liberacao: {
    id: number;
    motivo: string;
    validoAte: string;
  } | null;
}) {
  if (
    situacao ===
    "LIBERADO_EXCECAO" &&
    liberacao
  ) {
    return (
      <div className="relative overflow-hidden rounded-[26px] border border-sky-200 bg-[linear-gradient(135deg,#f2f9ff,#ffffff)] p-5 shadow-[0_20px_50px_-30px_rgba(14,165,233,0.28)]">

        <div className="relative flex items-start gap-4">

          <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[17px] bg-sky-500 text-white">

            <ShieldCheck
              size={23}
            />

          </div>

          <div>

            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-sky-700">
              Liberação gerencial
            </p>

            <h3 className="mt-2 text-[18px] font-black">
              Crédito liberado por exceção
            </h3>

            <p className="mt-2 text-[10px] leading-5 text-slate-500">
              {liberacao.motivo}
            </p>

            <p className="mt-2 text-[9px] font-black text-sky-700">
              Válido até{" "}
              {new Intl.DateTimeFormat(
                "pt-BR",
                {
                  dateStyle:
                    "short",

                  timeStyle:
                    "short",

                  timeZone:
                    "America/Fortaleza",
                },
              ).format(
                new Date(
                  liberacao.validoAte,
                ),
              )}
            </p>

          </div>

        </div>

      </div>
    );
  }

  if (
    situacao ===
    "BLOQUEADO"
  ) {
    return (
      <div className="relative overflow-hidden rounded-[26px] border border-red-200 bg-[linear-gradient(135deg,#fff5f5,#ffffff)] p-5 shadow-[0_20px_50px_-30px_rgba(220,38,38,0.28)]">

        <div className="relative flex items-start gap-4">

          <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[17px] bg-red-500 text-white">

            <ShieldAlert
              size={23}
            />

          </div>

          <div>

            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-red-600">
              Situação de crédito
            </p>

            <h3 className="mt-2 text-[18px] font-black">
              Crédito bloqueado
            </h3>

            <p className="mt-2 text-[10px] leading-5 text-slate-500">
              O cliente possui {vencidas} parcelas vencidas. Recebimentos continuam permitidos.
            </p>

          </div>

        </div>

      </div>
    );
  }

  if (
    situacao ===
    "ALERTA"
  ) {
    return (
      <div className="relative overflow-hidden rounded-[26px] border border-amber-200 bg-[linear-gradient(135deg,#fff9eb,#ffffff)] p-5 shadow-[0_20px_50px_-30px_rgba(180,120,10,0.30)]">

        <div className="relative flex items-start gap-4">

          <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[17px] bg-amber-500 text-white">

            <AlertTriangle
              size={23}
            />

          </div>

          <div>

            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-amber-700">
              Situação de crédito
            </p>

            <h3 className="mt-2 text-[18px] font-black">
              Crédito com alerta
            </h3>

            <p className="mt-2 text-[10px] leading-5 text-slate-500">
              Existe 1 parcela vencida para este cliente.
            </p>

          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-emerald-200 bg-[linear-gradient(135deg,#ecfdf3,#ffffff)] p-5 shadow-[0_20px_50px_-30px_rgba(16,185,129,0.45)]">

      <div className="relative flex items-start gap-4">

        <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[17px] bg-[#178548] text-white">

          <CalendarClock
            size={23}
          />

        </div>

        <div>

          <p className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-600">
            Situação de crédito
          </p>

          <h3 className="mt-2 text-[18px] font-black">
            Crédito liberado
          </h3>

          <p className="mt-2 text-[10px] leading-5 text-slate-500">
            Nenhuma parcela vencida neste momento.
          </p>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   KPI
========================================================= */

function HeroMini({
  label,
  valor,
  alerta = false,
}: {
  label:
    string;

  valor:
    string;

  alerta?:
    boolean;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.07] px-3 py-3 backdrop-blur-xl">

      <p className="text-[7px] font-black uppercase tracking-[0.13em] text-white/45">
        {label}
      </p>

      <p
        className={`mt-1 truncate text-[11px] font-black ${
          alerta
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
   BADGE
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
      <span className="rounded-full bg-red-100 px-3 py-1.5 text-[8px] font-black uppercase text-red-700">
        Bloqueado
      </span>
    );
  }

  if (
    situacao ===
    "ALERTA"
  ) {
    return (
      <span className="rounded-full bg-[#f4b13f] px-3 py-1.5 text-[8px] font-black uppercase text-[#4d3100]">
        Alerta
      </span>
    );
  }

  if (
    situacao ===
    "LIBERADO_EXCECAO"
  ) {
    return (
      <span className="rounded-full bg-sky-100 px-3 py-1.5 text-[8px] font-black uppercase text-sky-700">
        Exceção
      </span>
    );
  }

  return (
    <span className="rounded-full bg-white px-3 py-1.5 text-[8px] font-black uppercase text-[#176f3c]">
      Liberado
    </span>
  );
}
