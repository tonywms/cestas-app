export const instant = false;

import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Plus,
  RotateCcw,
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

function formatarData(
  valor: string,
) {
  const [
    ano,
    mes,
    dia,
  ] = valor.split("-");

  return (
    ano &&
    mes &&
    dia
  )
    ? `${dia}/${mes}/${ano}`
    : valor;
}

export default async function CargasPage() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const supabase =
    await createClient();

  const {
    data: cargas,
  } = await supabase
    .from("cargas")
    .select(`
      id,
      codigo,
      entregador_id,
      data_carga,
      status,
      observacao,
      finalizada_at
    `)
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .order(
      "created_at",
      {
        ascending:
          false,
      },
    );

  const cargaIds =
    (
      cargas ??
      []
    ).map(
      (
        carga,
      ) =>
        carga.id,
    );

  const entregadorIds =
    Array.from(
      new Set(
        (
          cargas ??
          []
        ).map(
          (
            carga,
          ) =>
            carga.entregador_id,
        ),
      ),
    );

  const [
    usuariosResult,
    itensResult,
  ] =
    await Promise.all([
      entregadorIds.length >
      0
        ? supabase
            .from(
              "usuarios",
            )
            .select(`
              id,
              nome
            `)
            .in(
              "id",
              entregadorIds,
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),

      cargaIds.length >
      0
        ? supabase
            .from(
              "carga_itens",
            )
            .select(`
              carga_id,
              quantidade_carregada,
              quantidade_entregue,
              quantidade_retornada,
              quantidade_avariada
            `)
            .eq(
              "empresa_id",
              usuario.empresa.id,
            )
            .in(
              "carga_id",
              cargaIds,
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

  const usuariosMap =
    new Map(
      (
        usuariosResult.data ??
        []
      ).map(
        (
          item,
        ) => [
          item.id,
          item.nome,
        ],
      ),
    );

  const resumoCarga =
    new Map<
      number,
      {
        carregado: number;
        entregue: number;
        retornado: number;
        avariado: number;
      }
    >();

  for (
    const item of
      itensResult.data ??
      []
  ) {
    const atual =
      resumoCarga.get(
        item.carga_id,
      ) ?? {
        carregado:
          0,
        entregue:
          0,
        retornado:
          0,
        avariado:
          0,
      };

    atual.carregado +=
      item.quantidade_carregada;

    atual.entregue +=
      item.quantidade_entregue;

    atual.retornado +=
      item.quantidade_retornada;

    atual.avariado +=
      item.quantidade_avariada;

    resumoCarga.set(
      item.carga_id,
      atual,
    );
  }

  const abertas =
    (
      cargas ??
      []
    ).filter(
      (
        item,
      ) =>
        item.status ===
          "ABERTA" ||
        item.status ===
          "EM_ROTA",
    ).length;

  const finalizadas =
    (
      cargas ??
      []
    ).filter(
      (
        item,
      ) =>
        item.status ===
        "FINALIZADA",
    ).length;

  const totalEmPosse =
    Array.from(
      resumoCarga.values(),
    ).reduce(
      (
        total,
        item,
      ) =>
        total +
        Math.max(
          0,
          item.carregado -
            item.entregue -
            item.retornado -
            item.avariado,
        ),
      0,
    );

  return (
    <main className="app-premium min-h-screen px-4 py-6 text-[#142018] md:px-6 md:py-8">

      <div className="mx-auto max-w-[1080px]">

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
                Estoque móvel
              </p>

              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Cargas
              </h1>
            </div>

          </div>

          <Link
            href="/admin/cargas/nova"
            className="flex h-11 items-center gap-2 rounded-[14px] bg-[#176f3c] px-4 text-[9px] font-black text-white"
          >
            <Plus
              size={16}
            />

            Nova carga
          </Link>

        </header>

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">

          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.035]" />

          <div className="relative z-10">

            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
              <Truck
                size={15}
              />

              Estoque em movimento
            </div>

            <h2 className="mt-4 text-[32px] font-black tracking-[-0.055em]">
              Cargas da empresa
              <span className="text-[#f4b13f]">
                .
              </span>
            </h2>

            <p className="mt-3 text-[11px] text-white/65">
              Acompanhe o que saiu do central e permanece em posse dos entregadores.
            </p>

            <div className="mt-7 grid grid-cols-3 gap-3">

              <HeroKpi
                label="Abertas"
                valor={
                  abertas
                }
              />

              <HeroKpi
                label="Finalizadas"
                valor={
                  finalizadas
                }
              />

              <HeroKpi
                label="Em posse"
                valor={
                  totalEmPosse
                }
              />

            </div>

          </div>

        </section>

        <section className="mt-5 space-y-3">

          {(cargas ?? [])
            .length ===
          0 ? (
            <div className="card-premium rounded-[28px] p-10 text-center">

              <Truck
                size={35}
                className="mx-auto text-emerald-700"
              />

              <h3 className="mt-4 text-base font-black">
                Nenhuma carga criada
              </h3>

              <p className="mt-2 text-xs text-slate-400">
                Registre saldo no estoque central e crie a primeira carga.
              </p>

            </div>
          ) : (
            (
              cargas ??
              []
            ).map(
              (
                carga,
              ) => {
                const resumo =
                  resumoCarga.get(
                    carga.id,
                  ) ?? {
                    carregado:
                      0,
                    entregue:
                      0,
                    retornado:
                      0,
                    avariado:
                      0,
                  };

                const saldo =
                  Math.max(
                    0,
                    resumo.carregado -
                      resumo.entregue -
                      resumo.retornado -
                      resumo.avariado,
                  );

                const finalizada =
                  carga.status ===
                  "FINALIZADA";

                return (
                  <article
                    key={
                      carga.id
                    }
                    className="card-premium rounded-[25px] p-5"
                  >

                    <div className="flex items-start gap-4">

                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] ${
                        finalizada
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {finalizada ? (
                          <CheckCircle2
                            size={21}
                          />
                        ) : (
                          <Truck
                            size={21}
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-start justify-between gap-3">

                          <div>

                            <p className="font-black">
                              {
                                carga.codigo
                              }
                            </p>

                            <p className="mt-1 text-[9px] text-slate-400">
                              {usuariosMap.get(
                                carga.entregador_id,
                              ) ??
                                "Entregador"}{" "}
                              •{" "}
                              {formatarData(
                                carga.data_carga,
                              )}
                            </p>

                          </div>

                          <span className={`rounded-full px-3 py-1.5 text-[8px] font-black uppercase ${
                            finalizada
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {
                              carga.status
                            }
                          </span>

                        </div>

                        <div className="mt-4 grid grid-cols-4 gap-2">

                          <Mini
                            label="Carga"
                            valor={
                              resumo.carregado
                            }
                          />

                          <Mini
                            label="Entregue"
                            valor={
                              resumo.entregue
                            }
                          />

                          <Mini
                            label="Retorno"
                            valor={
                              resumo.retornado
                            }
                          />

                          <Mini
                            label="Saldo"
                            valor={
                              saldo
                            }
                          />

                        </div>

                        {resumo.avariado >
                          0 && (
                          <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-amber-50 px-3 py-2 text-[8px] font-black text-amber-700">
                            <RotateCcw
                              size={13}
                            />
                            {resumo.avariado} cesta(s) com avaria
                          </div>
                        )}

                      </div>

                    </div>

                  </article>
                );
              },
            )
          )}

        </section>

      </div>

    </main>
  );
}

function HeroKpi({
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

function Mini({
  label,
  valor,
}: {
  label: string;
  valor: number;
}) {
  return (
    <div className="rounded-[14px] bg-[#f6f9f6] p-3 text-center">

      <p className="text-[12px] font-black">
        {valor}
      </p>

      <p className="mt-1 text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>

    </div>
  );
}
