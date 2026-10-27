export const instant = false;

import {
  ArrowLeft,
  Clock3,
  CreditCard,
  History,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getCurrentUserProfile,
} from "@/lib/auth/get-current-user";

import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";

import {
  avaliarCredito,
  dataLimiteAtraso,
  POLITICA_CREDITO_PADRAO,
  type PoliticaCredito,
} from "@/lib/credito/avaliar-credito";

import {
  createClient,
} from "@/lib/supabase/server";

import CreditoAdminClient from "./CreditoAdminClient";

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
  ).format(
    new Date(),
  );
}

function dataHora(
  valor:
    string,
) {
  return new Intl.DateTimeFormat(
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
      valor,
    ),
  );
}

export default async function CreditoPage() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect(
      "/",
    );
  }

  const perfilGestao =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo ===
      "ADMINISTRADOR" ||
    usuario.perfilCodigo ===
      "GESTOR";

  if (!perfilGestao) {
    redirect(
      "/admin",
    );
  }

  const podeConfigurarPolitica =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo ===
      "ADMINISTRADOR";

  const podeLiberarCredito =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CREDITO_LIBERAR,
    );

  const supabase =
    await createClient();

  const [
    configResult,
    clientesResult,
    parcelasResult,
    liberacoesResult,
    auditoriaResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "empresa_configuracoes",
        )
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
        .from(
          "clientes",
        )
        .select(`
          id,
          codigo,
          nome
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "ativo",
          true,
        )
        .order(
          "nome",
        ),

      supabase
        .from(
          "parcelas",
        )
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
        ),

      supabase
        .from(
          "credito_liberacoes",
        )
        .select(`
          id,
          cliente_id,
          motivo,
          valido_ate,
          status,
          created_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "status",
          "ATIVA",
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        ),

      supabase
        .from(
          "auditoria_eventos",
        )
        .select(`
          id,
          entidade_id,
          acao,
          dados,
          created_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .in(
          "entidade",
          [
            "CREDITO",
            "CREDITO_CONFIGURACAO",
            "CLIENTE",
          ],
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        )
        .limit(
          12,
        ),
    ]);

  if (
    configResult.error
  ) {
    console.error(
      "Erro configuração crédito:",
      configResult.error,
    );
  }

  if (
    clientesResult.error
  ) {
    console.error(
      "Erro clientes crédito:",
      clientesResult.error,
    );
  }

  if (
    parcelasResult.error
  ) {
    console.error(
      "Erro parcelas crédito:",
      parcelasResult.error,
    );
  }

  if (
    liberacoesResult.error
  ) {
    console.error(
      "Erro liberações crédito:",
      liberacoesResult.error,
    );
  }

  if (
    auditoriaResult.error
  ) {
    console.error(
      "Erro auditoria crédito:",
      auditoriaResult.error,
    );
  }

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

  const hoje =
    hojeFortaleza();

  const limiteAtraso =
    dataLimiteAtraso(
      hoje,
      politica.diasTolerancia,
    );

  const parcelas =
    parcelasResult.data ??
    [];

  const liberacoes =
    liberacoesResult.data ??
    [];

  const agora =
    Date.now();

  const liberacoesAtivas =
    new Map<
      number,
      {
        id:
          number;

        motivo:
          string;

        validoAte:
          string;
      }
    >();

  for (
    const liberacao of
      liberacoes
  ) {
    if (
      liberacoesAtivas.has(
        liberacao.cliente_id,
      )
    ) {
      continue;
    }

    const validade =
      new Date(
        liberacao.valido_ate,
      ).getTime();

    if (
      Number.isFinite(
        validade,
      ) &&
      validade >
        agora
    ) {
      liberacoesAtivas.set(
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

  const clientesCredito =
    (
      clientesResult.data ??
      []
    )
      .map(
        (
          cliente,
        ) => {
          const parcelasCliente =
            parcelas.filter(
              (
                parcela,
              ) =>
                parcela.cliente_id ===
                cliente.id,
            );

          const parcelasVencidas =
            parcelasCliente.filter(
              (
                parcela,
              ) =>
                parcela.vencimento <
                limiteAtraso,
            ).length;

          const saldo =
            parcelasCliente.reduce(
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

          const liberacao =
            liberacoesAtivas.get(
              cliente.id,
            ) ??
            null;

          const avaliacao =
            avaliarCredito({
              qtdAtrasos:
                parcelasVencidas,

              politica,

              liberacaoAtiva:
                liberacao,
            });

          return {
            id:
              cliente.id,

            codigo:
              cliente.codigo,

            nome:
              cliente.nome,

            saldo,

            parcelasAbertas:
              parcelasCliente.length,

            parcelasVencidas,

            statusBase:
              avaliacao.statusBase,

            statusEfetivo:
              avaliacao.statusEfetivo,

            liberacao,
          };
        },
      )
      .sort(
        (
          a,
          b,
        ) => {
          const peso = {
            BLOQUEADO:
              4,

            LIBERADO_EXCECAO:
              3,

            ALERTA:
              2,

            LIBERADO:
              1,
          };

          return (
            peso[
              b.statusEfetivo
            ] -
              peso[
                a.statusEfetivo
              ] ||
            b.parcelasVencidas -
              a.parcelasVencidas ||
            a.nome.localeCompare(
              b.nome,
            )
          );
        },
      );

  const auditoria =
    auditoriaResult.data ??
    [];

  return (
    <main className="app-premium min-h-screen px-4 py-6 text-[#142018] md:px-6 md:py-8">

      <div className="mx-auto max-w-[1180px]">

        {/* HEADER */}

        <header className="glass flex items-center justify-between gap-4 rounded-[28px] px-5 py-4">

          <div className="flex items-center gap-4">

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
                Governança
              </p>

              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Gestão de Crédito
              </h1>

            </div>

          </div>

          <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-4 py-2.5 text-[9px] font-black text-[#176f3c] md:flex">

            <ShieldCheck
              size={15}
            />

            {
              usuario.empresa
                .nomeFantasia
            }

          </div>

        </header>

        {/* HERO */}

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">

          <div className="animate-orb pointer-events-none absolute right-8 top-8 h-40 w-40 rounded-full bg-[#f4b13f]/10 blur-3xl" />

          <div className="relative z-10">

            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">

              <CreditCard
                size={15}
              />

              Motor de decisão

            </div>

            <h2 className="mt-4 max-w-3xl text-[31px] font-black tracking-[-0.055em]">

              Crédito com regra, exceção e auditoria
              <span className="text-gold">
                .
              </span>

            </h2>

            <p className="mt-3 max-w-2xl text-[12px] leading-6 text-white/65">
              O bloqueio é aplicado antes de criar novo contrato. Exceções gerenciais possuem motivo, validade e histórico.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">

              <Tag
                label="Alerta"
                valor={`${politica.alertaQtdAtrasos}+ atraso(s)`}
              />

              <Tag
                label="Bloqueio"
                valor={`${politica.bloqueioQtdAtrasos}+ atraso(s)`}
              />

              <Tag
                label="Tolerância"
                valor={`${politica.diasTolerancia} dia(s)`}
              />

              <Tag
                label="Exceção"
                valor={
                  politica.permitirExcecao
                    ? "ATIVA"
                    : "DESATIVADA"
                }
              />

            </div>

          </div>

        </section>

        <CreditoAdminClient
          empresaNome={
            usuario.empresa
              .nomeFantasia
          }
          politica={
            politica
          }
          clientes={
            clientesCredito
          }
          podeConfigurarPolitica={
            podeConfigurarPolitica
          }
          podeLiberarCredito={
            podeLiberarCredito
          }
        />

        {/* AUDITORIA */}

        <section className="card-premium mt-5 rounded-[30px] p-6">

          <div className="flex items-start justify-between gap-4">

            <div className="flex items-start gap-3">

              <div className="icon-emerald flex h-12 w-12 items-center justify-center rounded-[16px]">

                <History
                  size={21}
                />

              </div>

              <div>

                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                  Auditoria
                </p>

                <h2 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                  Últimas decisões
                </h2>

              </div>

            </div>

            <span className="rounded-full bg-slate-50 px-3 py-2 text-[8px] font-black text-slate-500">
              {auditoria.length} evento(s)
            </span>

          </div>

          <div className="mt-5 space-y-3">

            {auditoria.length ===
            0 ? (
              <div className="rounded-[20px] bg-[#f6f9f6] p-6 text-center text-[10px] text-slate-400">
                Nenhum evento de crédito registrado ainda.
              </div>
            ) : (
              auditoria.map(
                (
                  evento,
                ) => (
                  <div
                    key={
                      evento.id
                    }
                    className="rounded-[20px] border border-black/[0.04] bg-white p-4"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <p className="text-[10px] font-black text-[#176f3c]">
                          {
                            evento.acao
                          }
                        </p>

                        <p className="mt-1 text-[8px] text-slate-400">
                          Entidade:{" "}
                          {
                            evento.entidade_id ??
                            "-"
                          }
                        </p>

                      </div>

                      <div className="flex shrink-0 items-center gap-1.5 text-[8px] font-semibold text-slate-400">

                        <Clock3
                          size={11}
                        />

                        {dataHora(
                          evento.created_at,
                        )}

                      </div>

                    </div>

                  </div>
                ),
              )
            )}

          </div>

        </section>

      </div>

    </main>
  );
}

function Tag({
  label,
  valor,
}: {
  label:
    string;

  valor:
    string;
}) {
  return (
    <div className="rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 backdrop-blur">

      <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-white/45">
        {label}
      </span>

      <span className="ml-2 text-[10px] font-black uppercase">
        {valor}
      </span>

    </div>
  );
}
