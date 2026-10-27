export const instant = false;

import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CalendarClock,
  CircleDollarSign,
  FileText,
  WalletCards,
} from "lucide-react";

import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getCurrentUserProfile,
} from "@/lib/auth/get-current-user";

import {
  createClient,
} from "@/lib/supabase/server";

import ContratoForm from "./ContratoForm";

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

function dataBR(
  data: string,
) {
  const [
    ano,
    mes,
    dia,
  ] = data.split("-");

  return `${dia}/${mes}/${ano}`;
}

function primeiroVencimentoDefault() {
  const data =
    new Date();

  data.setDate(
    data.getDate() +
      30,
  );

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
  ).format(data);
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

export default async function FinanceiroPage() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const autorizado =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo ===
      "ADMINISTRADOR" ||
    usuario.perfilCodigo ===
      "GESTOR";

  if (!autorizado) {
    redirect("/admin");
  }

  const supabase =
    await createClient();

  const [
    clientesResult,
    contratosResult,
    parcelasResult,
  ] = await Promise.all([
    supabase
      .from("clientes")
      .select(`
        id,
        codigo,
        nome
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq("ativo", true)
      .order("nome"),

    supabase
      .from("contratos")
      .select(`
        id,
        codigo,
        cliente_id,
        valor_total,
        quantidade_parcelas,
        primeiro_vencimento,
        status,
        created_at
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(50),

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
      ),
  ]);

  if (
    clientesResult.error
  ) {
    console.error(
      "Erro clientes financeiro:",
      clientesResult.error,
    );
  }

  if (
    contratosResult.error
  ) {
    console.error(
      "Erro contratos financeiro:",
      contratosResult.error,
    );
  }

  if (
    parcelasResult.error
  ) {
    console.error(
      "Erro parcelas financeiro:",
      parcelasResult.error,
    );
  }

  const clientes =
    clientesResult.data ??
    [];

  const contratos =
    contratosResult.data ??
    [];

  const parcelas =
    parcelasResult.data ??
    [];

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

  const saldoAberto =
    parcelas
      .filter(
        (parcela) =>
          [
            "ABERTA",
            "PARCIAL",
          ].includes(
            parcela.status,
          ),
      )
      .reduce(
        (
          total,
          parcela,
        ) =>
          total +
          (
            Number(
              parcela.valor,
            ) -
            Number(
              parcela.valor_pago,
            )
          ),
        0,
      );

  const recebido =
    parcelas.reduce(
      (
        total,
        parcela,
      ) =>
        total +
        Number(
          parcela.valor_pago,
        ),
      0,
    );

  const vencidas =
    parcelas.filter(
      (parcela) =>
        [
          "ABERTA",
          "PARCIAL",
        ].includes(
          parcela.status,
        ) &&
        parcela.vencimento <
          hoje,
    ).length;

  const contratosAtivos =
    contratos.filter(
      (contrato) =>
        contrato.status ===
        "ATIVO",
    ).length;

  const parcelasPorContrato =
    new Map<
      number,
      {
        total:
          number;
        pagas:
          number;
        saldo:
          number;
      }
    >();

  for (
    const parcela of parcelas
  ) {
    const atual =
      parcelasPorContrato.get(
        parcela.contrato_id,
      ) ?? {
        total: 0,
        pagas: 0,
        saldo: 0,
      };

    atual.total += 1;

    if (
      parcela.status ===
      "PAGA"
    ) {
      atual.pagas += 1;
    }

    atual.saldo +=
      Number(
        parcela.valor,
      ) -
      Number(
        parcela.valor_pago,
      );

    parcelasPorContrato.set(
      parcela.contrato_id,
      atual,
    );
  }

  return (
    <main className="app-premium min-h-screen px-4 py-6 text-[#142018] md:px-6 md:py-8">
      <div className="mx-auto max-w-[1180px]">
        <header className="glass flex items-center gap-4 rounded-[28px] px-5 py-4">
          <Link
            href="/admin"
            className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-[#176f3c]"
          >
            <ArrowLeft
              size={19}
            />
          </Link>

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#b07a12]">
              Financeiro
            </p>

            <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
              Contratos e parcelas
            </h1>
          </div>
        </header>

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">
          <div className="animate-orb pointer-events-none absolute right-8 top-8 h-40 w-40 rounded-full bg-[#f4b13f]/10 blur-3xl" />

          <CircleDollarSign
            size={28}
          />

          <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-[#a8d8b7]">
            Visão financeira
          </p>

          <h2 className="mt-2 text-[31px] font-black tracking-[-0.055em]">
            Crediário sob controle
            <span className="text-gold">
              .
            </span>
          </h2>

          <p className="mt-3 max-w-xl text-[12px] leading-6 text-white/65">
            Crie contratos, acompanhe parcelas, atrasos e recebimentos da equipe em campo.
          </p>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            icon={
              <FileText
                size={19}
              />
            }
            label="Contratos ativos"
            valor={
              String(
                contratosAtivos,
              )
            }
          />

          <Kpi
            icon={
              <WalletCards
                size={19}
              />
            }
            label="Saldo em aberto"
            valor={
              moeda(
                saldoAberto,
              )
            }
          />

          <Kpi
            icon={
              <Banknote
                size={19}
              />
            }
            label="Já recebido"
            valor={
              moeda(
                recebido,
              )
            }
          />

          <Kpi
            icon={
              <AlertTriangle
                size={19}
              />
            }
            label="Parcelas vencidas"
            valor={
              String(
                vencidas,
              )
            }
            alerta={
              vencidas > 0
            }
          />
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <ContratoForm
            clientes={
              clientes
            }
            primeiroVencimento={
              primeiroVencimentoDefault()
            }
          />

          <section className="card-premium rounded-[30px] p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                  Carteira
                </p>

                <h2 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                  Contratos recentes
                </h2>
              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-2 text-[8px] font-black text-[#176f3c]">
                {contratos.length} registro(s)
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {contratos.length ===
              0 ? (
                <div className="rounded-[22px] bg-[#f6f9f6] p-7 text-center">
                  <CalendarClock
                    size={30}
                    className="mx-auto text-emerald-700"
                  />

                  <h3 className="mt-4 text-sm font-black">
                    Nenhum contrato criado
                  </h3>

                  <p className="mt-2 text-[10px] leading-5 text-slate-400">
                    Crie o primeiro crediário usando o formulário ao lado.
                  </p>
                </div>
              ) : (
                contratos.map(
                  (contrato) => {
                    const cliente =
                      clientesMap.get(
                        contrato.cliente_id,
                      );

                    const resumo =
                      parcelasPorContrato.get(
                        contrato.id,
                      ) ?? {
                        total: 0,
                        pagas: 0,
                        saldo: 0,
                      };

                    const percentual =
                      resumo.total >
                      0
                        ? Math.round(
                            (
                              resumo.pagas /
                              resumo.total
                            ) *
                              100,
                          )
                        : 0;

                    return (
                      <div
                        key={
                          contrato.id
                        }
                        className="rounded-[22px] border border-black/[0.04] bg-white p-4 shadow-[0_12px_30px_rgba(17,63,33,0.05)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#176f3c]">
                              {
                                contrato.codigo
                              }
                            </p>

                            <h3 className="mt-1 text-[14px] font-black">
                              {cliente?.nome ??
                                "Cliente"}
                            </h3>

                            <p className="mt-1 text-[9px] text-slate-400">
                              Primeiro vencimento:{" "}
                              {dataBR(
                                contrato.primeiro_vencimento,
                              )}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1.5 text-[8px] font-black ${
                              contrato.status ===
                              "QUITADO"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {
                              contrato.status
                            }
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <Mini
                            label="Valor"
                            valor={
                              moeda(
                                Number(
                                  contrato.valor_total,
                                ),
                              )
                            }
                          />

                          <Mini
                            label="Parcelas"
                            valor={`${resumo.pagas}/${resumo.total}`}
                          />

                          <Mini
                            label="Saldo"
                            valor={
                              moeda(
                                resumo.saldo,
                              )
                            }
                          />
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#176f3c]"
                            style={{
                              width:
                                `${percentual}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  },
                )
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Kpi({
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
    <div className="card-premium rounded-[24px] p-5">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-[14px] ${
          alerta
            ? "bg-amber-50 text-amber-700"
            : "icon-emerald"
        }`}
      >
        {icon}
      </div>

      <p className="mt-4 text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-[20px] font-black tracking-[-0.04em]">
        {valor}
      </p>
    </div>
  );
}

function Mini({
  label,
  valor,
}: {
  label: string;
  valor: string;
}) {
  return (
    <div className="rounded-[14px] bg-[#f6f9f6] px-3 py-2.5">
      <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-[10px] font-black">
        {valor}
      </p>
    </div>
  );
}
