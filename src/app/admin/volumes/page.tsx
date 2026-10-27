export const instant = false;

import {
  AlertTriangle,
  ArrowLeft,
  Barcode,
  Boxes,
  PackageCheck,
  Printer,
  ShieldCheck,
  Truck,
} from "lucide-react";

import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getCurrentUserProfile,
} from "@/lib/auth/get-current-user";

import {
  createClient,
} from "@/lib/supabase/server";

import GerarVolumesForm, {
  type TipoCestaVolume,
} from "./GerarVolumesForm";

function formatarDataHora(
  valor: string,
) {
  const data =
    new Date(valor);

  if (
    Number.isNaN(
      data.getTime(),
    )
  ) {
    return valor;
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Fortaleza",
    },
  ).format(data);
}

function statusVisual(
  status: string,
) {
  switch (status) {
    case "DISPONIVEL":
      return {
        label: "Disponível",
        className:
          "bg-emerald-100 text-emerald-700",
      };

    case "EM_CARGA":
      return {
        label: "Em carga",
        className:
          "bg-blue-100 text-blue-700",
      };

    case "ENTREGUE":
      return {
        label: "Entregue",
        className:
          "bg-slate-100 text-slate-700",
      };

    case "RETORNADO":
      return {
        label: "Retornado",
        className:
          "bg-violet-100 text-violet-700",
      };

    case "AVARIADO":
      return {
        label: "Avariado",
        className:
          "bg-amber-100 text-amber-700",
      };

    default:
      return {
        label: status,
        className:
          "bg-slate-100 text-slate-500",
      };
  }
}

export default async function VolumesPage() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const supabase =
    await createClient();

  const [
    tiposResult,
    saldosResult,
    volumesResult,
  ] =
    await Promise.all([
      supabase
        .from("tipos_cesta")
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
        .order("nome"),

      supabase
        .from(
          "estoque_central_saldos",
        )
        .select(`
          tipo_cesta_id,
          quantidade
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        ),

      supabase
        .from("cesta_volumes")
        .select(`
          id,
          tipo_cesta_id,
          codigo_volume,
          status,
          carga_id,
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
        .limit(250),
    ]);

  const tipos =
    tiposResult.data ?? [];

  const saldos =
    saldosResult.data ?? [];

  const volumes =
    volumesResult.data ?? [];

  const saldoPorTipo =
    new Map<number, number>(
      saldos.map(
        (item) => [
          Number(
            item.tipo_cesta_id,
          ),
          Math.max(
            0,
            Number(
              item.quantidade ??
              0,
            ),
          ),
        ],
      ),
    );

  const disponiveisPorTipo =
    new Map<number, number>();

  for (
    const volume of
    volumes
  ) {
    if (
      volume.status !==
      "DISPONIVEL"
    ) {
      continue;
    }

    const tipoId =
      Number(
        volume.tipo_cesta_id,
      );

    disponiveisPorTipo.set(
      tipoId,
      (
        disponiveisPorTipo.get(
          tipoId,
        ) ?? 0
      ) + 1,
    );
  }

  const tiposComControle:
    TipoCestaVolume[] =
    tipos.map(
      (tipo) => {
        const saldoCentral =
          saldoPorTipo.get(
            tipo.id,
          ) ?? 0;

        const volumesDisponiveis =
          disponiveisPorTipo.get(
            tipo.id,
          ) ?? 0;

        return {
          id: tipo.id,
          codigo:
            tipo.codigo,
          nome:
            tipo.nome,
          saldoCentral,
          volumesDisponiveis,
          faltamIdentificar:
            Math.max(
              0,
              saldoCentral -
                volumesDisponiveis,
            ),
        };
      },
    );

  const saldoCentralTotal =
    tiposComControle.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.saldoCentral,
      0,
    );

  const disponiveis =
    volumes.filter(
      (item) =>
        item.status ===
        "DISPONIVEL",
    ).length;

  const emCarga =
    volumes.filter(
      (item) =>
        item.status ===
        "EM_CARGA",
    ).length;

  const entregues =
    volumes.filter(
      (item) =>
        item.status ===
        "ENTREGUE",
    ).length;

  const totalVolumes =
    volumes.length;

  const totalSemIdentificacao =
    tiposComControle.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.faltamIdentificar,
      0,
    );

  const existeDivergencia =
    tiposComControle.some(
      (item) =>
        item.saldoCentral !==
        item.volumesDisponiveis,
    );

  const modoVolume =
    usuario.configuracao
      .modoControleCarga ===
    "VOLUME";

  return (
    <main className="app-premium min-h-screen px-4 py-6 text-[#142018] md:px-6 md:py-8">

      <div className="mx-auto max-w-[1180px]">

        <header className="glass flex items-center justify-between gap-4 rounded-[28px] px-5 py-4">

          <div className="flex items-center gap-4">

            <Link
              href="/admin/estoque"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-[#176f3c]"
            >
              <ArrowLeft
                size={19}
              />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#b07a12]">
                Rastreabilidade
              </p>

              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Volumes
              </h1>
            </div>

          </div>

          <div className="flex items-center gap-2">

            {modoVolume &&
              totalVolumes >
                0 && (
                <Link
                  href="/admin/volumes/etiquetas"
                  className="flex h-11 items-center gap-2 rounded-[14px] border border-emerald-100 bg-white px-4 text-[9px] font-black text-[#176f3c]"
                >
                  <Printer
                    size={15}
                  />

                  Etiquetas
                </Link>
              )}

            <Link
              href="/admin/configuracoes"
              className="flex h-11 items-center gap-2 rounded-[14px] border border-emerald-100 bg-white px-4 text-[9px] font-black text-[#176f3c]"
            >
              <ShieldCheck
                size={15}
              />

              Configuração
            </Link>

          </div>

        </header>

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">

          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.035]" />

          <div className="relative z-10">

            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
              <Barcode
                size={16}
              />

              Identificação individual
            </div>

            <h2 className="mt-4 text-[32px] font-black tracking-[-0.055em]">
              Uma cesta, um volume
              <span className="text-[#f4b13f]">
                .
              </span>
            </h2>

            <p className="mt-3 max-w-2xl text-[11px] leading-6 text-white/65">
              O estoque físico e os códigos disponíveis permanecem reconciliados para evitar volumes sem cesta ou cestas sem identificação.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">

              <Kpi
                label="Saldo central"
                valor={
                  saldoCentralTotal
                }
              />

              <Kpi
                label="Disponíveis"
                valor={
                  disponiveis
                }
              />

              <Kpi
                label="Em carga"
                valor={
                  emCarga
                }
              />

              <Kpi
                label="Entregues"
                valor={
                  entregues
                }
              />

            </div>

          </div>

        </section>

        {!modoVolume ? (
          <section className="mt-5 rounded-[30px] border border-amber-200 bg-[linear-gradient(145deg,#fffaf0,#ffffff)] p-7">

            <div className="flex items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-amber-100 text-amber-700">
                <ShieldCheck
                  size={21}
                />
              </div>

              <div className="flex-1">

                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-700">
                  Empresa em QUANTIDADE
                </p>

                <h3 className="mt-2 text-[21px] font-black tracking-[-0.04em]">
                  Bipagem de volume está desativada
                </h3>

                <p className="mt-2 max-w-2xl text-[10px] leading-5 text-slate-500">
                  A empresa {usuario.empresa.nomeFantasia} trabalha atualmente com saldo numérico. Nenhum volume individual será exigido.
                </p>

                <Link
                  href="/admin/configuracoes"
                  className="mt-5 inline-flex h-[48px] items-center justify-center rounded-[15px] bg-[#176f3c] px-5 text-[10px] font-black text-white"
                >
                  Abrir configurações da empresa
                </Link>

              </div>

            </div>

          </section>
        ) : (
          <>
            {existeDivergencia && (
              <section className="mt-5 flex items-start gap-4 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white text-amber-600 shadow-sm">
                  <AlertTriangle
                    size={18}
                  />
                </div>

                <div>
                  <p className="text-[10px] font-black text-amber-900">
                    Existem cestas sem identificação individual
                  </p>

                  <p className="mt-1 text-[9px] leading-5 text-amber-700">
                    Faltam gerar{" "}
                    <strong>
                      {
                        totalSemIdentificacao
                      }
                    </strong>{" "}
                    volume(s) para que o saldo central fique totalmente rastreável.
                  </p>
                </div>

              </section>
            )}

            <section className="mt-6 grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">

              <GerarVolumesForm
                tipos={
                  tiposComControle
                }
              />

              <div className="card-premium rounded-[30px] p-6">

                <div className="flex items-start justify-between gap-4">

                  <div className="flex items-start gap-3">

                    <div className="icon-emerald flex h-12 w-12 items-center justify-center rounded-[16px]">
                      <Barcode
                        size={21}
                      />
                    </div>

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                        Identificadores
                      </p>

                      <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                        Últimos volumes
                      </h3>
                    </div>

                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-2 text-[8px] font-black text-[#176f3c]">
                    {totalVolumes}
                  </span>

                </div>

                <div className="mt-5 space-y-3">

                  {volumes.length ===
                  0 ? (
                    <div className="rounded-[20px] bg-[#f6f9f6] p-10 text-center">

                      <Barcode
                        size={28}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-3 text-[11px] font-black">
                        Nenhum volume gerado
                      </p>

                      <p className="mt-1 text-[9px] text-slate-400">
                        Gere os primeiros identificadores físicos ao lado.
                      </p>

                    </div>
                  ) : (
                    volumes
                      .slice(
                        0,
                        15,
                      )
                      .map(
                        (
                          volume,
                        ) => {
                          const tipo =
                            tipos.find(
                              (
                                item,
                              ) =>
                                item.id ===
                                volume.tipo_cesta_id,
                            );

                          const visual =
                            statusVisual(
                              volume.status,
                            );

                          return (
                            <article
                              key={
                                volume.id
                              }
                              className="rounded-[19px] border border-slate-100 bg-[#fbfdfb] p-4"
                            >

                              <div className="flex items-start gap-3">

                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-emerald-50 text-emerald-700">
                                  <Barcode
                                    size={18}
                                  />
                                </div>

                                <div className="min-w-0 flex-1">

                                  <div className="flex items-start justify-between gap-3">

                                    <div className="min-w-0">

                                      <p className="truncate text-[10px] font-black">
                                        {
                                          volume.codigo_volume
                                        }
                                      </p>

                                      <p className="mt-1 truncate text-[8px] font-semibold text-slate-400">
                                        {tipo?.nome ??
                                          "Tipo de cesta"}
                                        {volume.carga_id
                                          ? ` • Carga #${volume.carga_id}`
                                          : ""}
                                      </p>

                                    </div>

                                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[7px] font-black uppercase ${visual.className}`}>
                                      {
                                        visual.label
                                      }
                                    </span>

                                  </div>

                                  <p className="mt-2 text-[8px] text-slate-400">
                                    Criado em {formatarDataHora(volume.created_at)}
                                  </p>

                                </div>

                              </div>

                            </article>
                          );
                        },
                      )
                  )}

                </div>

                {totalVolumes >
                  0 && (
                  <Link
                    href="/admin/volumes/etiquetas"
                    className="mt-5 flex h-[50px] w-full items-center justify-center gap-2 rounded-[16px] border border-emerald-100 bg-emerald-50 text-[10px] font-black text-emerald-800"
                  >
                    <Printer
                      size={16}
                    />
                    Abrir etiquetas QR
                  </Link>
                )}

              </div>

            </section>
          </>
        )}

        <section className="mt-6 grid gap-3 md:grid-cols-3">

          <Link
            href="/admin/estoque"
            className="card-premium flex items-center gap-4 rounded-[24px] p-5"
          >
            <div className="icon-emerald flex h-11 w-11 items-center justify-center rounded-[14px]">
              <Boxes
                size={19}
              />
            </div>

            <div>
              <p className="text-[11px] font-black">
                Estoque central
              </p>
              <p className="mt-1 text-[9px] text-slate-400">
                Saldos físicos da empresa.
              </p>
            </div>
          </Link>

          <Link
            href="/admin/cargas"
            className="card-premium flex items-center gap-4 rounded-[24px] p-5"
          >
            <div className="icon-emerald flex h-11 w-11 items-center justify-center rounded-[14px]">
              <Truck
                size={19}
              />
            </div>

            <div>
              <p className="text-[11px] font-black">
                Cargas
              </p>
              <p className="mt-1 text-[9px] text-slate-400">
                Volumes vinculados aos entregadores.
              </p>
            </div>
          </Link>

          <Link
            href="/admin/cestas"
            className="card-premium flex items-center gap-4 rounded-[24px] p-5"
          >
            <div className="icon-emerald flex h-11 w-11 items-center justify-center rounded-[14px]">
              <PackageCheck
                size={19}
              />
            </div>

            <div>
              <p className="text-[11px] font-black">
                Tipos de cesta
              </p>
              <p className="mt-1 text-[9px] text-slate-400">
                Catálogo dos produtos.
              </p>
            </div>
          </Link>

        </section>

      </div>

    </main>
  );
}

function Kpi({
  label,
  valor,
}: {
  label: string;
  valor: number;
}) {
  return (
    <div className="rounded-[19px] border border-white/10 bg-white/[0.07] px-4 py-3.5 backdrop-blur">

      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>

      <p className="mt-1.5 text-[22px] font-black text-white">
        {valor}
      </p>

    </div>
  );
}
