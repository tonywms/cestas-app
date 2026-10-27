export const instant = false;

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  CircleCheck,
  History,
  PackageCheck,
  PackagePlus,
  ShieldCheck,
  Truck,
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
  createClient,
} from "@/lib/supabase/server";

import EstoqueMovimentoForm from "./EstoqueMovimentoForm";

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
      dateStyle:
        "short",

      timeStyle:
        "short",

      timeZone:
        "America/Fortaleza",
    },
  ).format(data);
}

function rotuloMovimento(
  tipo: string,
) {
  const mapa:
    Record<string, string> = {
      ENTRADA_CENTRAL:
        "Entrada no central",

      AJUSTE_CENTRAL_ENTRADA:
        "Ajuste positivo",

      AJUSTE_CENTRAL_SAIDA:
        "Ajuste negativo",

      SAIDA_CENTRAL_CARGA:
        "Saída para carga",

      ENTRADA_CARGA:
        "Entrada na carga",

      SAIDA_CARGA_ENTREGA:
        "Entrega ao cliente",

      RETORNO_CARGA_CENTRAL:
        "Retorno ao central",

      AVARIA_CARGA:
        "Avaria",
    };

  return (
    mapa[tipo] ??
    tipo
  );
}

function movimentoEntrada(
  tipo: string,
) {
  return [
    "ENTRADA_CENTRAL",
    "AJUSTE_CENTRAL_ENTRADA",
    "RETORNO_CARGA_CENTRAL",
  ].includes(
    tipo,
  );
}

export default async function EstoquePage() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const podeVisualizar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ESTOQUE_VISUALIZAR,
    );

  if (!podeVisualizar) {
    redirect("/admin");
  }

  const podeMovimentar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ESTOQUE_MOVIMENTAR,
    );

  const podeAjustar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ESTOQUE_AJUSTAR,
    );

  const supabase =
    await createClient();

  const [
    tiposResult,
    saldosResult,
    movimentosResult,
    cargasAtivasResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "tipos_cesta",
        )
        .select(`
          id,
          codigo,
          nome,
          ativo
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
          "estoque_central_saldos",
        )
        .select(`
          tipo_cesta_id,
          quantidade,
          estoque_minimo,
          updated_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        ),

      supabase
        .from(
          "movimentacoes_estoque",
        )
        .select(`
          id,
          tipo_cesta_id,
          carga_id,
          usuario_id,
          tipo_movimento,
          quantidade,
          referencia,
          observacao,
          created_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .in(
          "tipo_movimento",
          [
            "ENTRADA_CENTRAL",
            "AJUSTE_CENTRAL_ENTRADA",
            "AJUSTE_CENTRAL_SAIDA",
            "SAIDA_CENTRAL_CARGA",
            "RETORNO_CARGA_CENTRAL",
            "AVARIA_CARGA",
          ],
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        )
        .limit(20),

      supabase
        .from("cargas")
        .select(
          "id",
          {
            count:
              "exact",
            head:
              true,
          },
        )
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .in(
          "status",
          [
            "ABERTA",
            "EM_ROTA",
          ],
        ),
    ]);

  const tipos =
    tiposResult.data ??
    [];

  const saldos =
    saldosResult.data ??
    [];

  const movimentos =
    movimentosResult.data ??
    [];

  const saldosMap =
    new Map(
      saldos.map(
        (
          item,
        ) => [
          item.tipo_cesta_id,
          item,
        ],
      ),
    );

  const tiposMap =
    new Map(
      tipos.map(
        (
          item,
        ) => [
          item.id,
          item,
        ],
      ),
    );

  const estoque =
    tipos.map(
      (
        tipo,
      ) => {
        const saldo =
          saldosMap.get(
            tipo.id,
          );

        return {
          id:
            tipo.id,

          codigo:
            tipo.codigo,

          nome:
            tipo.nome,

          saldo:
            Number(
              saldo?.quantidade ??
              0,
            ),

          estoqueMinimo:
            Number(
              saldo
                ?.estoque_minimo ??
              0,
            ),

          updatedAt:
            saldo?.updated_at ??
            null,
        };
      },
    );

  const totalCentral =
    estoque.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.saldo,
      0,
    );

  const semEstoque =
    estoque.filter(
      (
        item,
      ) =>
        item.saldo ===
        0,
    ).length;

  const abaixoMinimo =
    estoque.filter(
      (
        item,
      ) =>
        item.estoqueMinimo >
          0 &&
        item.saldo >
          0 &&
        item.saldo <=
          item.estoqueMinimo,
    ).length;

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
                Estoque
              </p>

              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Estoque central
              </h1>
            </div>

          </div>

          <div className="flex items-center gap-2">

            <Link
              href="/admin/cestas"
              className="hidden h-11 items-center gap-2 rounded-[14px] border border-emerald-100 bg-white px-4 text-[9px] font-black text-[#176f3c] md:flex"
            >
              <PackageCheck
                size={15}
              />

              Tipos de cesta
            </Link>

            <Link
              href="/admin/cargas"
              className="flex h-11 items-center gap-2 rounded-[14px] bg-[#176f3c] px-4 text-[9px] font-black text-white"
            >
              <Truck
                size={15}
              />

              Cargas
            </Link>

          </div>

        </header>

        {/* HERO */}

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">

          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.035]" />

          <div className="relative z-10">

            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
              <Boxes
                size={15}
              />

              Controle físico
            </div>

            <h2 className="mt-4 text-[32px] font-black tracking-[-0.055em]">
              Estoque sob controle
              <span className="text-[#f4b13f]">
                .
              </span>
            </h2>

            <p className="mt-3 max-w-2xl text-[11px] leading-6 text-white/65">
              Entradas, ajustes, cargas, retornos e avarias agora compartilham o mesmo saldo físico central.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">

              <HeroKpi
                label="Saldo central"
                valor={
                  totalCentral
                }
              />

              <HeroKpi
                label="Tipos ativos"
                valor={
                  estoque.length
                }
              />

              <HeroKpi
                label="Sem estoque"
                valor={
                  semEstoque
                }
                alerta={
                  semEstoque >
                  0
                }
              />

              <HeroKpi
                label="Cargas abertas"
                valor={
                  cargasAtivasResult.count ??
                  0
                }
              />

            </div>

          </div>

        </section>

        {/* ALERTA */}

        {(semEstoque >
          0 ||
          abaixoMinimo >
            0) && (
          <div className="mt-5 flex items-start gap-3 rounded-[22px] border border-amber-200 bg-amber-50 p-4">

            <AlertTriangle
              size={19}
              className="mt-0.5 shrink-0 text-amber-700"
            />

            <div>
              <p className="text-[10px] font-black text-amber-900">
                Atenção ao abastecimento
              </p>

              <p className="mt-1 text-[9px] leading-5 text-amber-800/70">
                {semEstoque} tipo(s) estão sem saldo e {abaixoMinimo} tipo(s) atingiram o estoque mínimo.
              </p>
            </div>

          </div>
        )}

        {/* SALDOS */}

        <section className="mt-6">

          <div className="flex items-end justify-between gap-4">

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                Posição atual
              </p>

              <h3 className="mt-1 text-[22px] font-black tracking-[-0.04em]">
                Saldo por tipo de cesta
              </h3>
            </div>

            <span className="rounded-full border border-emerald-100 bg-white px-3 py-2 text-[8px] font-black uppercase text-[#176f3c]">
              {estoque.length} tipo(s)
            </span>

          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">

            {estoque.map(
              (
                item,
              ) => {
                const critico =
                  item.saldo ===
                  0;

                const baixo =
                  !critico &&
                  item.estoqueMinimo >
                    0 &&
                  item.saldo <=
                    item.estoqueMinimo;

                return (
                  <article
                    key={
                      item.id
                    }
                    className={`relative overflow-hidden rounded-[26px] border p-5 shadow-[0_18px_45px_-32px_rgba(17,63,33,0.18)] ${
                      critico
                        ? "border-red-200 bg-[linear-gradient(145deg,#fff5f5,#ffffff)]"
                        : baixo
                          ? "border-amber-200 bg-[linear-gradient(145deg,#fffaf0,#ffffff)]"
                          : "border-emerald-200 bg-[linear-gradient(145deg,#f1fbf5,#ffffff)]"
                    }`}
                  >

                    <div className={`absolute inset-x-0 top-0 h-[3px] ${
                      critico
                        ? "bg-red-500"
                        : baixo
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`} />

                    <div className="flex items-start justify-between gap-4">

                      <div className="flex items-start gap-3">

                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${
                          critico
                            ? "bg-red-100 text-red-700"
                            : baixo
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                        }`}>
                          <Boxes
                            size={20}
                          />
                        </div>

                        <div>
                          <p className="text-[12px] font-black">
                            {
                              item.nome
                            }
                          </p>

                          <p className="mt-1 text-[8px] font-black uppercase tracking-[0.13em] text-slate-400">
                            {
                              item.codigo
                            }
                          </p>
                        </div>

                      </div>

                      <span className={`rounded-full px-3 py-1.5 text-[7px] font-black uppercase ${
                        critico
                          ? "bg-red-100 text-red-700"
                          : baixo
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {critico
                          ? "Sem estoque"
                          : baixo
                            ? "Atenção"
                            : "Disponível"}
                      </span>

                    </div>

                    <div className="mt-5 flex items-end justify-between">

                      <div>
                        <p className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-400">
                          Saldo físico
                        </p>

                        <p className="mt-1 text-[34px] font-black tracking-[-0.055em]">
                          {
                            item.saldo
                          }
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-400">
                          Mínimo
                        </p>

                        <p className="mt-1 text-[16px] font-black">
                          {
                            item.estoqueMinimo
                          }
                        </p>
                      </div>

                    </div>

                    {item.updatedAt && (
                      <p className="mt-4 text-[8px] text-slate-400">
                        Atualizado em {formatarDataHora(item.updatedAt)}
                      </p>
                    )}

                  </article>
                );
              },
            )}

          </div>

        </section>

        {/* MOVIMENTAÇÃO + EXTRATO */}

        <section className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">

          <div className="card-premium rounded-[30px] p-6">

            <div className="flex items-start gap-3">

              <div className="icon-emerald flex h-12 w-12 items-center justify-center rounded-[16px]">
                <PackagePlus
                  size={21}
                />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                  Movimentação
                </p>

                <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                  Entrada e ajuste
                </h3>

                <p className="mt-1 text-[9px] text-slate-400">
                  Toda alteração gera movimento rastreável.
                </p>
              </div>

            </div>

            <div className="mt-5">

              {podeMovimentar ||
              podeAjustar ? (
                <EstoqueMovimentoForm
                  tipos={
                    estoque
                  }
                  podeAjustar={
                    podeAjustar
                  }
                />
              ) : (
                <div className="rounded-[20px] bg-slate-50 p-6 text-center">
                  <ShieldCheck
                    size={25}
                    className="mx-auto text-slate-400"
                  />

                  <p className="mt-3 text-[11px] font-black">
                    Somente visualização
                  </p>

                  <p className="mt-1 text-[9px] text-slate-400">
                    Seu perfil não pode movimentar este estoque.
                  </p>
                </div>
              )}

            </div>

          </div>

          <div className="card-premium rounded-[30px] p-6">

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

                  <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                    Últimas movimentações
                  </h3>
                </div>

              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-2 text-[8px] font-black text-[#176f3c]">
                {movimentos.length}
              </span>

            </div>

            <div className="mt-5 space-y-3">

              {movimentos.length ===
              0 ? (
                <div className="rounded-[20px] bg-[#f6f9f6] p-8 text-center">

                  <History
                    size={25}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-[11px] font-black">
                    Sem movimentações
                  </p>

                  <p className="mt-1 text-[9px] text-slate-400">
                    O extrato começará na primeira movimentação.
                  </p>

                </div>
              ) : (
                movimentos.map(
                  (
                    movimento,
                  ) => {
                    const tipo =
                      tiposMap.get(
                        movimento.tipo_cesta_id,
                      );

                    const entrada =
                      movimentoEntrada(
                        movimento.tipo_movimento,
                      );

                    return (
                      <div
                        key={
                          movimento.id
                        }
                        className="rounded-[19px] border border-slate-100 bg-[#fbfdfb] p-4"
                      >

                        <div className="flex items-start justify-between gap-4">

                          <div className="min-w-0">

                            <p className="text-[10px] font-black">
                              {rotuloMovimento(
                                movimento.tipo_movimento,
                              )}
                            </p>

                            <p className="mt-1 truncate text-[8px] font-semibold text-slate-400">
                              {tipo?.nome ??
                                "Tipo de cesta"}
                              {movimento.referencia
                                ? ` • ${movimento.referencia}`
                                : ""}
                            </p>
                          </div>

                          <p className={`shrink-0 text-[15px] font-black ${
                            entrada
                              ? "text-emerald-700"
                              : movimento.tipo_movimento ===
                                "AVARIA_CARGA"
                                ? "text-amber-700"
                                : "text-red-600"
                          }`}>
                            {entrada
                              ? "+"
                              : "-"}
                            {
                              movimento.quantidade
                            }
                          </p>

                        </div>

                        <div className="mt-2 flex items-center justify-between gap-4">

                          <p className="truncate text-[8px] text-slate-400">
                            {movimento.observacao ??
                              "Sem observação"}
                          </p>

                          <p className="shrink-0 text-[8px] font-semibold text-slate-400">
                            {formatarDataHora(
                              movimento.created_at,
                            )}
                          </p>

                        </div>

                      </div>
                    );
                  },
                )
              )}

            </div>

          </div>

        </section>

        {/* AÇÕES */}

        <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">

          <Atalho
            href="/admin/cargas/nova"
            titulo="Criar nova carga"
            descricao="Baixa automática do estoque central."
            icon={
              <Truck
                size={19}
              />
            }
          />

          <Atalho
            href="/admin/cargas"
            titulo="Ver cargas"
            descricao="Acompanhe estoque móvel e status."
            icon={
              <Boxes
                size={19}
              />
            }
          />

          <Atalho
            href="/admin/cestas"
            titulo="Tipos de cesta"
            descricao="Cadastre produtos do catálogo."
            icon={
              <PackageCheck
                size={19}
              />
            }
          />

          <Atalho
            href="/admin/volumes"
            titulo="Volumes rastreáveis"
            descricao="Gerencie códigos físicos quando a empresa operar por volume."
            icon={
              <ShieldCheck
                size={19}
              />
            }
          />

        </section>

      </div>

    </main>
  );
}

function HeroKpi({
  label,
  valor,
  alerta = false,
}: {
  label: string;
  valor: number;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-[19px] border border-white/10 bg-white/[0.07] px-4 py-3.5 backdrop-blur">

      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>

      <p className={`mt-1.5 text-[22px] font-black ${
        alerta
          ? "text-[#ffd67d]"
          : "text-white"
      }`}>
        {valor}
      </p>

    </div>
  );
}

function Atalho({
  href,
  titulo,
  descricao,
  icon,
}: {
  href: string;
  titulo: string;
  descricao: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="card-premium group flex items-center gap-4 rounded-[24px] p-5"
    >
      <div className="icon-emerald flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black">
          {titulo}
        </p>

        <p className="mt-1 text-[9px] leading-4 text-slate-400">
          {descricao}
        </p>
      </div>

      <ArrowRight
        size={16}
        className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600"
      />
    </Link>
  );
}
