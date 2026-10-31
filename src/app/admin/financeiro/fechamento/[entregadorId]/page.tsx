export const instant = false;

import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Boxes,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  History,
  LockKeyhole,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Truck,
  UnlockKeyhole,
  UserRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  calcularFechamentoEntregador,
} from "@/lib/financeiro/calcular-fechamento-entregador";
import { createClient } from "@/lib/supabase/server";
import {
  reabrirFechamento,
} from "./actions";
import ConferenciaForm from "./ConferenciaForm";

type PageProps = {
  params: Promise<{
    entregadorId: string;
  }>;
  searchParams: Promise<{
    inicio?: string;
    fim?: string;
    salvo?: string;
    reaberto?: string;
  }>;
};

type Versao = {
  id: number;
  versao: number;
  tipo: string;
  usuario_id: string | null;
  motivo: string | null;
  snapshot: Record<string, unknown>;
  created_at: string;
};

function dataValida(valor?: string) {
  return Boolean(
    valor &&
      /^\d{4}-\d{2}-\d{2}$/.test(
        valor,
      ),
  );
}

function dataBR(valor: string) {
  const [
    ano,
    mes,
    dia,
  ] =
    valor.split("-");

  return `${dia}/${mes}/${ano}`;
}

function moeda(valor: number) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style:
        "currency",
      currency:
        "BRL",
    },
  ).format(
    valor || 0,
  );
}

function dataHoraBR(
  valor?: string | null,
) {
  if (!valor) return "—";

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

function numero(
  valor: unknown,
) {
  const convertido =
    Number(
      valor ?? 0,
    );

  return Number.isFinite(
    convertido,
  )
    ? convertido
    : 0;
}

function tipoVersaoLabel(
  tipo: string,
) {
  if (
    tipo === "CRIADO"
  ) {
    return "Criado";
  }

  if (
    tipo === "REABERTO"
  ) {
    return "Reaberto";
  }

  if (
    tipo ===
    "RECONFERIDO"
  ) {
    return "Reconferido";
  }

  return "Atualizado";
}

export default async function ConferirFechamentoPage({
  params,
  searchParams,
}: PageProps) {
  const usuario =
    await getCurrentUserProfile();

  if (
    !usuario ||
    !usuario.ativo
  ) {
    redirect("/");
  }

  const autorizado =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo ===
      "ADMINISTRADOR" ||
    usuario.perfilCodigo ===
      "GESTOR" ||
    usuario.perfilCodigo ===
      "FINANCEIRO";

  if (!autorizado) {
    redirect("/admin");
  }

  const {
    entregadorId,
  } =
    await params;

  const query =
    await searchParams;

  if (
    !dataValida(
      query.inicio,
    ) ||
    !dataValida(
      query.fim,
    )
  ) {
    redirect(
      "/admin/financeiro/fechamento",
    );
  }

  let dataInicio =
    String(
      query.inicio,
    );

  let dataFim =
    String(
      query.fim,
    );

  if (
    dataInicio >
    dataFim
  ) {
    [
      dataInicio,
      dataFim,
    ] = [
      dataFim,
      dataInicio,
    ];
  }

  const supabase =
    await createClient();

  const [
    perfilResult,
    entregadorResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "perfis",
        )
        .select(
          "id",
        )
        .eq(
          "codigo",
          "ENTREGADOR",
        )
        .eq(
          "ativo",
          true,
        )
        .maybeSingle(),

      supabase
        .from(
          "usuarios",
        )
        .select(
          "id, nome, email, ativo",
        )
        .eq(
          "id",
          entregadorId,
        )
        .maybeSingle(),
    ]);

  if (
    !perfilResult.data
      ?.id ||
    !entregadorResult.data
      ?.ativo
  ) {
    redirect(
      "/admin/financeiro/fechamento",
    );
  }

  const vinculoResult =
    await supabase
      .from(
        "empresa_usuarios",
      )
      .select(
        "usuario_id",
      )
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "usuario_id",
        entregadorId,
      )
      .eq(
        "perfil_id",
        perfilResult.data.id,
      )
      .eq(
        "ativo",
        true,
      )
      .maybeSingle();

  if (
    !vinculoResult.data
  ) {
    redirect(
      "/admin/financeiro/fechamento",
    );
  }

  const calculado =
    await calcularFechamentoEntregador({
      empresaId:
        usuario.empresa.id,
      entregadorId,
      dataInicio,
      dataFim,
    });

  const fechamentoResult =
    await supabase
      .from(
        "fechamentos_entregador",
      )
      .select(
        "id, status, bloqueado, recebido_esperado, dinheiro_conferido, pix_conferido, cartao_conferido, transferencia_conferida, outro_conferido, diferenca_total, observacao, conferido_at, conferido_por, reaberto_por, reaberto_at, motivo_reabertura",
      )
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "entregador_id",
        entregadorId,
      )
      .eq(
        "data_inicio",
        dataInicio,
      )
      .eq(
        "data_fim",
        dataFim,
      )
      .maybeSingle();

  const fechamento =
    fechamentoResult.data;

  const versoesResult =
    fechamento?.id
      ? await supabase
          .from(
            "fechamentos_entregador_versoes",
          )
          .select(
            "id, versao, tipo, usuario_id, motivo, snapshot, created_at",
          )
          .eq(
            "empresa_id",
            usuario.empresa.id,
          )
          .eq(
            "fechamento_id",
            fechamento.id,
          )
          .order(
            "versao",
            {
              ascending:
                false,
            },
          )
          .limit(20)
      : {
          data:
            [] as Versao[],
        };

  const versoes =
    (
      versoesResult.data ??
      []
    ) as Versao[];

  const usuarioIds =
    Array.from(
      new Set(
        [
          fechamento
            ?.conferido_por,
          fechamento
            ?.reaberto_por,
          ...versoes.map(
            (item) =>
              item.usuario_id,
          ),
        ]
          .filter(Boolean)
          .map(
            (item) =>
              String(item),
          ),
      ),
    );

  const usuariosResult =
    usuarioIds.length > 0
      ? await supabase
          .from(
            "usuarios",
          )
          .select(
            "id, nome",
          )
          .in(
            "id",
            usuarioIds,
          )
      : {
          data: [] as Array<{
            id:
              string;
            nome:
              string;
          }>,
        };

  const usuarioMap =
    new Map(
      (
        usuariosResult.data ??
        []
      ).map(
        (item) => [
          String(
            item.id,
          ),
          String(
            item.nome,
          ),
        ],
      ),
    );

  const periodoLabel =
    dataInicio === dataFim
      ? dataBR(
          dataInicio,
        )
      : `${dataBR(
          dataInicio,
        )} a ${dataBR(
          dataFim,
        )}`;

  const bloqueado =
    fechamento
      ? fechamento
          .bloqueado !== false
      : false;

  return (
    <main className="app-premium min-h-screen px-4 py-6 text-[#142018] md:px-6 md:py-8">
      <div className="mx-auto max-w-[1120px]">
        <header className="glass flex items-center justify-between gap-4 rounded-[28px] px-5 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/admin/financeiro/fechamento?inicio=${dataInicio}&fim=${dataFim}&entregador=${entregadorId}`}
              className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-[#176f3c]"
            >
              <ArrowLeft
                size={19}
              />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#b07a12]">
                Prestação de contas
              </p>
              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                {entregadorResult
                  .data
                  .nome}
              </h1>
            </div>
          </div>

          {!fechamento ? (
            <span className="rounded-full bg-slate-100 px-4 py-2 text-[8px] font-black uppercase text-slate-500">
              Pendente
            </span>
          ) : fechamento.bloqueado === false ? (
            <span className="rounded-full bg-amber-100 px-4 py-2 text-[8px] font-black uppercase text-amber-700">
              Reaberto
            </span>
          ) : fechamento.status === "CONFERIDO" ? (
            <span className="rounded-full bg-emerald-100 px-4 py-2 text-[8px] font-black uppercase text-emerald-700">
              Conferido
            </span>
          ) : (
            <span className="rounded-full bg-red-100 px-4 py-2 text-[8px] font-black uppercase text-red-700">
              Com divergência
            </span>
          )}
        </header>

        {query.reaberto === "1" && (
          <div className="mt-4 flex items-center gap-3 rounded-[18px] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
            <UnlockKeyhole
              size={18}
            />
            <p className="text-[9px] font-black">
              Fechamento reaberto. Faça os ajustes e salve para reconferir e bloquear novamente.
            </p>
          </div>
        )}

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
              <ClipboardCheck
                size={16}
              />
              {periodoLabel}
            </div>

            <h2 className="mt-4 text-[30px] font-black tracking-[-0.05em]">
              Conferência financeira do entregador
              <span className="text-[#f4b13f]">
                .
              </span>
            </h2>

            <p className="mt-3 max-w-3xl text-[11px] leading-6 text-white/65">
              O esperado é recalculado diretamente dos registros do sistema. Fechamentos salvos ficam protegidos e só podem ser alterados após reabertura justificada.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi
                label="Recebido esperado"
                valor={moeda(
                  calculado.recebido,
                )}
              />
              <Kpi
                label="Venda total"
                valor={moeda(
                  calculado.vendaTotal,
                )}
              />
              <Kpi
                label="Crediário a prazo"
                valor={moeda(
                  calculado.crediarioPrazo,
                )}
              />
              <Kpi
                label="Saldo em carga"
                valor={String(
                  calculado.saldoCarga,
                )}
              />
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Mini
            icon={
              <Truck
                size={16}
              />
            }
            label="Carregado"
            valor={String(
              calculado.carregado,
            )}
          />
          <Mini
            icon={
              <PackageCheck
                size={16}
              />
            }
            label="Entregue"
            valor={String(
              calculado.entregueCarga,
            )}
          />
          <Mini
            icon={
              <RotateCcw
                size={16}
              />
            }
            label="Retornado"
            valor={String(
              calculado.retornado,
            )}
          />
          <Mini
            icon={
              <Boxes
                size={16}
              />
            }
            label="Avariado"
            valor={String(
              calculado.avariado,
            )}
          />
          <Mini
            icon={
              <CheckCircle2
                size={16}
              />
            }
            label="Entregas"
            valor={String(
              calculado.entregas,
            )}
          />
        </section>

        {fechamento && (
          <section className="card-premium mt-5 rounded-[26px] p-5">
            <div className="grid gap-3 md:grid-cols-3">
              <Info
                label="Última conferência"
                valor={dataHoraBR(
                  fechamento.conferido_at,
                )}
              />
              <Info
                label="Conferido por"
                valor={
                  fechamento.conferido_por
                    ? usuarioMap.get(
                        String(
                          fechamento.conferido_por,
                        ),
                      ) ??
                      "Usuário"
                    : "—"
                }
              />
              <Info
                label="Diferença registrada"
                valor={moeda(
                  numero(
                    fechamento.diferenca_total,
                  ),
                )}
                alerta={
                  Math.abs(
                    numero(
                      fechamento.diferenca_total,
                    ),
                  ) >= 0.01
                }
              />
            </div>
          </section>
        )}

        {fechamento &&
          bloqueado && (
            <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_35px_rgba(18,51,30,0.06)]">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700">
                  <LockKeyhole
                    size={19}
                  />
                </div>

                <div className="flex-1">
                  <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#b07a12]">
                    Fechamento protegido
                  </p>
                  <h3 className="mt-1 text-[18px] font-black">
                    Esta prestação não pode ser sobrescrita diretamente.
                  </h3>
                  <p className="mt-1 max-w-3xl text-[9px] leading-5 text-slate-500">
                    Para alterar qualquer valor, informe o motivo da reabertura. O estado atual ficará preservado no histórico de versões.
                  </p>

                  <form
                    action={
                      reabrirFechamento
                    }
                    className="mt-4"
                  >
                    <input
                      type="hidden"
                      name="entregador_id"
                      value={
                        entregadorId
                      }
                    />
                    <input
                      type="hidden"
                      name="data_inicio"
                      value={
                        dataInicio
                      }
                    />
                    <input
                      type="hidden"
                      name="data_fim"
                      value={
                        dataFim
                      }
                    />

                    <label className="block">
                      <span className="text-[7px] font-black uppercase tracking-[0.13em] text-slate-400">
                        Motivo da reabertura
                      </span>
                      <textarea
                        name="motivo_reabertura"
                        required
                        minLength={5}
                        maxLength={1000}
                        rows={3}
                        placeholder="Ex.: divergência identificada no extrato PIX; valor será reconferido."
                        className="mt-2 w-full resize-none rounded-[16px] border border-slate-200 bg-[#f8faf8] p-4 text-[10px] leading-5 outline-none focus:border-amber-300"
                      />
                    </label>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="submit"
                        className="flex h-11 items-center gap-2 rounded-[14px] bg-amber-500 px-5 text-[9px] font-black text-white"
                      >
                        <UnlockKeyhole
                          size={15}
                        />
                        Reabrir fechamento
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </section>
          )}

        {(!fechamento ||
          fechamento.bloqueado ===
            false) && (
          <section className="card-premium mt-5 rounded-[30px] p-5">
            <div className="mb-5">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
                Valores por forma
              </p>
              <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                {fechamento
                  ? "Reconferência"
                  : "Conferência formal"}
              </h3>

              {fechamento &&
                fechamento.bloqueado ===
                  false && (
                  <div className="mt-3 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-[8px] font-black text-amber-800">
                      Reaberto por{" "}
                      {fechamento.reaberto_por
                        ? usuarioMap.get(
                            String(
                              fechamento.reaberto_por,
                            ),
                          ) ??
                          "Usuário"
                        : "Usuário"}
                      {" • "}
                      {dataHoraBR(
                        fechamento.reaberto_at,
                      )}
                    </p>
                    <p className="mt-1 text-[8px] text-amber-700/80">
                      Motivo:{" "}
                      {fechamento.motivo_reabertura ??
                        "Não informado"}
                    </p>
                  </div>
                )}
            </div>

            <ConferenciaForm
              entregadorId={
                entregadorId
              }
              dataInicio={
                dataInicio
              }
              dataFim={
                dataFim
              }
              esperado={{
                dinheiro:
                  calculado.dinheiro,
                pix:
                  calculado.pix,
                cartao:
                  calculado.cartao,
                transferencia:
                  calculado.transferencia,
                outro:
                  calculado.outro,
                total:
                  calculado.recebido,
              }}
              inicial={
                fechamento
                  ? {
                      dinheiro:
                        Number(
                          fechamento.dinheiro_conferido ??
                            0,
                        ),
                      pix:
                        Number(
                          fechamento.pix_conferido ??
                            0,
                        ),
                      cartao:
                        Number(
                          fechamento.cartao_conferido ??
                            0,
                        ),
                      transferencia:
                        Number(
                          fechamento.transferencia_conferida ??
                            0,
                        ),
                      outro:
                        Number(
                          fechamento.outro_conferido ??
                            0,
                        ),
                      observacao:
                        String(
                          fechamento.observacao ??
                            "",
                        ),
                    }
                  : null
              }
            />
          </section>
        )}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Forma
            icon={
              <Banknote
                size={17}
              />
            }
            label="Dinheiro esperado"
            valor={
              calculado.dinheiro
            }
          />
          <Forma
            icon={
              <WalletCards
                size={17}
              />
            }
            label="PIX esperado"
            valor={
              calculado.pix
            }
          />
          <Forma
            icon={
              <CreditCard
                size={17}
              />
            }
            label="Cartão esperado"
            valor={
              calculado.cartao
            }
          />
          <Forma
            icon={
              <CircleDollarSign
                size={17}
              />
            }
            label="Transferência esperada"
            valor={
              calculado.transferencia
            }
          />
          <Forma
            icon={
              <CalendarDays
                size={17}
              />
            }
            label="Outros"
            valor={
              calculado.outro
            }
          />
        </section>

        {versoes.length > 0 && (
          <section className="card-premium mt-5 rounded-[30px] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-emerald-50 text-emerald-700">
                <History
                  size={17}
                />
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#b07a12]">
                  Trilha de versões
                </p>
                <h3 className="mt-0.5 text-[18px] font-black">
                  Histórico imutável do fechamento
                </h3>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[20px] border border-slate-100">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-center">
                  <thead className="bg-[#f6f9f6]">
                    <tr>
                      {[
                        "Versão",
                        "Evento",
                        "Status",
                        "Diferença",
                        "Usuário",
                        "Data / hora",
                        "Motivo",
                      ].map(
                        (titulo) => (
                          <th
                            key={
                              titulo
                            }
                            className="px-3 py-3 text-[7px] font-black uppercase tracking-[0.1em] text-slate-400"
                          >
                            {
                              titulo
                            }
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {versoes.map(
                      (versao) => {
                        const snapshot =
                          versao.snapshot ??
                          {};

                        const status =
                          String(
                            snapshot.status ??
                              "—",
                          );

                        const bloqueadoSnapshot =
                          snapshot.bloqueado !==
                          false;

                        return (
                          <tr
                            key={
                              versao.id
                            }
                            className="border-t border-slate-100 bg-white"
                          >
                            <td className="px-3 py-4 text-[8px] font-black">
                              v
                              {
                                versao.versao
                              }
                            </td>
                            <td className="px-3 py-4">
                              <span
                                className={
                                  versao.tipo ===
                                  "REABERTO"
                                    ? "inline-flex rounded-full bg-amber-100 px-2.5 py-1.5 text-[6px] font-black uppercase text-amber-700"
                                    : "inline-flex rounded-full bg-emerald-100 px-2.5 py-1.5 text-[6px] font-black uppercase text-emerald-700"
                                }
                              >
                                {tipoVersaoLabel(
                                  versao.tipo,
                                )}
                              </span>
                            </td>
                            <td className="px-3 py-4 text-[8px] font-black text-slate-600">
                              {!bloqueadoSnapshot
                                ? "REABERTO"
                                : status}
                            </td>
                            <td className="px-3 py-4 text-[8px] font-black tabular-nums">
                              {moeda(
                                numero(
                                  snapshot.diferenca_total,
                                ),
                              )}
                            </td>
                            <td className="px-3 py-4 text-[8px] font-bold text-slate-600">
                              {versao.usuario_id
                                ? usuarioMap.get(
                                    String(
                                      versao.usuario_id,
                                    ),
                                  ) ??
                                  "Usuário"
                                : "—"}
                            </td>
                            <td className="px-3 py-4 text-[8px] text-slate-500">
                              {dataHoraBR(
                                versao.created_at,
                              )}
                            </td>
                            <td className="max-w-[260px] px-3 py-4 text-left text-[8px] leading-4 text-slate-500">
                              {versao.motivo ??
                                "—"}
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Kpi({
  label,
  valor,
}: {
  label: string;
  valor: string;
}) {
  return (
    <div className="rounded-[19px] border border-white/10 bg-white/[0.07] px-4 py-3.5">
      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>
      <p className="mt-1.5 text-[17px] font-black text-white">
        {valor}
      </p>
    </div>
  );
}

function Mini({
  icon,
  label,
  valor,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="card-premium rounded-[22px] p-4">
      <div className="text-emerald-700">
        {icon}
      </div>
      <p className="mt-3 text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-[18px] font-black">
        {valor}
      </p>
    </div>
  );
}

function Info({
  label,
  valor,
  alerta = false,
}: {
  label: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-[18px] bg-[#f7faf7] p-4">
      <p className="text-[6px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p
        className={
          alerta
            ? "mt-1 text-[10px] font-black text-red-700"
            : "mt-1 text-[10px] font-black text-slate-800"
        }
      >
        {valor}
      </p>
    </div>
  );
}

function Forma({
  icon,
  label,
  valor,
}: {
  icon: React.ReactNode;
  label: string;
  valor: number;
}) {
  return (
    <div className="card-premium rounded-[22px] p-4">
      <div className="text-emerald-700">
        {icon}
      </div>
      <p className="mt-3 text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-[16px] font-black">
        {moeda(
          valor,
        )}
      </p>
    </div>
  );
}
