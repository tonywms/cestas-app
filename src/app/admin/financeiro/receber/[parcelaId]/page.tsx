export const instant = false;

import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  ReceiptText,
  UserRound,
} from "lucide-react";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  Hero,
  Kpi,
  KpiGrid,
  ModuleHeader,
  StatusBadge,
  formatDate,
  formatMoney,
} from "@/components/admin/PremiumModuleUi";

import {
  getCurrentUserProfile,
} from "@/lib/auth/get-current-user";

import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";

import {
  createClient,
} from "@/lib/supabase/server";

import RecebimentoAdminForm from "./RecebimentoAdminForm";

type PageProps = {
  params:
    Promise<{
      parcelaId:
        string;
    }>;
};

function dataHora(
  valor:
    string |
    null,
) {
  if (!valor) {
    return "—";
  }

  return new Date(
    valor,
  ).toLocaleString(
    "pt-BR",
    {
      timeZone:
        "America/Fortaleza",
      day:
        "2-digit",
      month:
        "2-digit",
      year:
        "numeric",
      hour:
        "2-digit",
      minute:
        "2-digit",
    },
  );
}

function formaLabel(
  forma:
    string,
) {
  switch (
    forma
  ) {
    case "DINHEIRO":
      return "Dinheiro";
    case "PIX":
      return "PIX";
    case "CARTAO":
      return "Cartão";
    case "TRANSFERENCIA":
      return "Transferência";
    default:
      return "Outro";
  }
}

export default async function ReceberParcelaPage({
  params,
}: PageProps) {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect(
      "/",
    );
  }

  const autorizado =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo ===
      "ADMINISTRADOR" ||
    usuario.perfilCodigo ===
      "GESTOR" ||
    usuario.perfilCodigo ===
      "FINANCEIRO" ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.PAGAMENTO_REGISTRAR,
    );

  if (!autorizado) {
    redirect(
      "/admin",
    );
  }

  const {
    parcelaId:
      parcelaIdTexto,
  } = await params;

  const parcelaId =
    Number(
      parcelaIdTexto,
    );

  if (
    !Number.isInteger(
      parcelaId,
    ) ||
    parcelaId <=
      0
  ) {
    notFound();
  }

  const supabase =
    await createClient();

  const {
    data:
      parcela,
    error:
      parcelaError,
  } =
    await supabase
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
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "id",
        parcelaId,
      )
      .maybeSingle();

  if (
    parcelaError ||
    !parcela
  ) {
    notFound();
  }

  const [
    clienteResult,
    contratoResult,
    pagamentosResult,
  ] =
    await Promise.all([
      supabase
        .from("clientes")
        .select(`
          id,
          codigo,
          nome,
          telefone
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "id",
          parcela.cliente_id,
        )
        .maybeSingle(),

      supabase
        .from("contratos")
        .select(`
          id,
          codigo
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "id",
          parcela.contrato_id,
        )
        .maybeSingle(),

      supabase
        .from("pagamentos")
        .select(`
          id,
          valor,
          forma_pagamento,
          recebido_por,
          observacao,
          created_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "parcela_id",
          parcelaId,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        ),
    ]);

  const recebidosPor =
    Array.from(
      new Set(
        (
          pagamentosResult.data ??
          []
        )
          .map(
            (
              pagamento,
            ) =>
              pagamento.recebido_por
                ? String(
                    pagamento.recebido_por,
                  )
                : null,
          )
          .filter(
            (
              id,
            ): id is string =>
              !!id,
          ),
      ),
    );

  const usuariosMap =
    new Map<
      string,
      string
    >();

  if (
    recebidosPor.length >
    0
  ) {
    const {
      data:
        usuarios,
    } =
      await supabase
        .from("usuarios")
        .select(`
          id,
          nome
        `)
        .in(
          "id",
          recebidosPor,
        );

    for (
      const item of
        usuarios ??
        []
    ) {
      usuariosMap.set(
        String(
          item.id,
        ),
        String(
          item.nome,
        ),
      );
    }
  }

  const valor =
    Number(
      parcela.valor ??
        0,
    );

  const pago =
    Number(
      parcela.valor_pago ??
        0,
    );

  const saldo =
    Math.max(
      0,
      valor -
        pago,
    );

  const quitada =
    saldo <=
    0;

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto max-w-[1050px]">
        <ModuleHeader
          eyebrow="Financeiro"
          title="Receber parcela"
          actions={
            <Link
              href="/admin/financeiro"
              className="flex items-center gap-2 rounded-[14px] border border-emerald-100 bg-white px-4 py-3 text-[12px] font-extrabold text-emerald-800"
            >
              <ArrowLeft
                size={16}
              />
              Voltar
            </Link>
          }
        />

        <Hero
          eyebrow={
            contratoResult.data
              ?.codigo ??
            "Contrato"
          }
          title={
            clienteResult.data
              ?.nome ??
            "Cliente"
          }
          description={`Parcela ${parcela.numero} • vencimento ${formatDate(String(parcela.vencimento))}`}
        >
          <KpiGrid>
            <Kpi
              label="Valor da parcela"
              value={
                formatMoney(
                  valor,
                )
              }
            />

            <Kpi
              label="Já recebido"
              value={
                formatMoney(
                  pago,
                )
              }
            />

            <Kpi
              label="Saldo"
              value={
                formatMoney(
                  saldo,
                )
              }
              warning={
                saldo >
                0
              }
              highlight={
                saldo <=
                0
              }
            />

            <Kpi
              label="Status"
              value={
                quitada
                  ? "Paga"
                  : String(
                      parcela.status,
                    )
              }
            />
          </KpiGrid>
        </Hero>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_.72fr]">
          <div>
            {quitada ? (
              <div className="card-premium rounded-[30px] p-7 text-center">
                <CircleDollarSign
                  size={38}
                  className="mx-auto text-emerald-600"
                />

                <h2 className="mt-4 text-[22px] font-black">
                  Parcela quitada
                </h2>

                <p className="mt-2 text-[13px] text-slate-500">
                  Não existe saldo pendente para receber.
                </p>

                <Link
                  href="/admin/financeiro"
                  className="mt-6 inline-flex rounded-[15px] bg-emerald-700 px-5 py-3 text-[12px] font-black text-white"
                >
                  Voltar ao Financeiro
                </Link>
              </div>
            ) : (
              <RecebimentoAdminForm
                parcelaId={
                  parcelaId
                }
                clienteId={
                  Number(
                    parcela.cliente_id,
                  )
                }
                saldo={
                  saldo
                }
              />
            )}
          </div>

          <div className="space-y-4">
            <div className="card-premium rounded-[26px] p-5">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#b07a12]">
                Identificação
              </p>

              <div className="mt-4 space-y-3">
                <Info
                  icon={
                    <UserRound
                      size={17}
                    />
                  }
                  label="Cliente"
                  value={`${clienteResult.data?.nome ?? "Cliente"} • ${clienteResult.data?.codigo ?? "—"}`}
                />

                <Info
                  icon={
                    <ReceiptText
                      size={17}
                    />
                  }
                  label="Contrato"
                  value={
                    contratoResult.data
                      ?.codigo ??
                    "—"
                  }
                />

                <Info
                  icon={
                    <CalendarDays
                      size={17}
                    />
                  }
                  label="Vencimento"
                  value={
                    formatDate(
                      String(
                        parcela.vencimento,
                      ),
                    )
                  }
                />
              </div>
            </div>

            <div className="card-premium rounded-[26px] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#b07a12]">
                    Histórico
                  </p>

                  <h3 className="mt-1 text-[18px] font-black">
                    Recebimentos
                  </h3>
                </div>

                <StatusBadge tone="green">
                  {
                    (
                      pagamentosResult.data ??
                      []
                    ).length
                  } registro(s)
                </StatusBadge>
              </div>

              <div className="mt-4 space-y-3">
                {(
                  pagamentosResult.data ??
                  []
                ).length ===
                0 ? (
                  <div className="rounded-[17px] bg-slate-50 p-4 text-[12px] font-bold text-slate-400">
                    Nenhum recebimento nesta parcela.
                  </div>
                ) : (
                  (
                    pagamentosResult.data ??
                    []
                  ).map(
                    (
                      pagamento,
                    ) => (
                      <div
                        key={
                          pagamento.id
                        }
                        className="rounded-[17px] border border-slate-100 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[15px] font-black text-emerald-700">
                              {formatMoney(
                                Number(
                                  pagamento.valor ??
                                    0,
                                ),
                              )}
                            </p>

                            <p className="mt-1 text-[11px] font-bold text-slate-500">
                              {formaLabel(
                                String(
                                  pagamento.forma_pagamento,
                                ),
                              )}
                            </p>
                          </div>

                          <p className="text-right text-[10px] font-bold text-slate-400">
                            {dataHora(
                              pagamento.created_at,
                            )}
                          </p>
                        </div>

                        <p className="mt-3 text-[11px] font-bold text-slate-500">
                          Recebido por{" "}
                          <strong>
                            {usuariosMap.get(
                              String(
                                pagamento.recebido_por,
                              ),
                            ) ??
                              "Sistema"}
                          </strong>
                        </p>

                        {pagamento.observacao ? (
                          <p className="mt-2 text-[11px] leading-5 text-slate-400">
                            {
                              pagamento.observacao
                            }
                          </p>
                        ) : null}
                      </div>
                    ),
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon:
    React.ReactNode;
  label:
    string;
  value:
    string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[16px] bg-[#f7f9f7] p-3">
      <div className="mt-0.5 text-emerald-700">
        {
          icon
        }
      </div>

      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
          {
            label
          }
        </p>

        <p className="mt-1 text-[12px] font-black text-slate-700">
          {
            value
          }
        </p>
      </div>
    </div>
  );
}
