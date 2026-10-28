export const instant = false;

import Link from "next/link";

import {
  Boxes,
  PackageCheck,
  ScanLine,
} from "lucide-react";

import {
  redirect,
} from "next/navigation";

import {
  EmptyState,
  Hero,
  Kpi,
  KpiGrid,
  ModuleHeader,
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

import NovoTipoCestaForm from "./NovoTipoCestaForm";
import TipoCestaCard from "./TipoCestaCard";

export default async function CestasPage() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const autorizado =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CESTAS_GERENCIAR,
    );

  if (!autorizado) {
    redirect("/admin");
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
        .from(
          "tipos_cesta",
        )
        .select(`
          id,
          codigo,
          nome,
          descricao,
          valor_venda,
          ativo
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .order(
          "ativo",
          {
            ascending:
              false,
          },
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
          quantidade
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        ),

      supabase
        .from(
          "cesta_volumes",
        )
        .select(`
          tipo_cesta_id,
          status
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .in(
          "status",
          [
            "DISPONIVEL",
            "EM_CARGA",
          ],
        ),
    ]);

  const saldoPorTipo =
    new Map<
      number,
      number
    >();

  for (
    const item of
      saldosResult.data ??
      []
  ) {
    saldoPorTipo.set(
      Number(
        item.tipo_cesta_id,
      ),
      Number(
        item.quantidade ??
          0,
      ),
    );
  }

  const volumesPorTipo =
    new Map<
      number,
      number
    >();

  for (
    const item of
      volumesResult.data ??
      []
  ) {
    const tipoId =
      Number(
        item.tipo_cesta_id,
      );

    volumesPorTipo.set(
      tipoId,
      (
        volumesPorTipo.get(
          tipoId,
        ) ??
        0
      ) +
        1,
    );
  }

  const tipos =
    (
      tiposResult.data ??
      []
    ).map(
      (
        tipo,
      ) => ({
        id:
          Number(
            tipo.id,
          ),

        codigo:
          String(
            tipo.codigo,
          ),

        nome:
          String(
            tipo.nome,
          ),

        descricao:
          tipo.descricao
            ? String(
                tipo.descricao,
              )
            : null,

        valorVenda:
          Number(
            tipo.valor_venda ??
              0,
          ),

        ativo:
          Boolean(
            tipo.ativo,
          ),

        saldoCentral:
          saldoPorTipo.get(
            Number(
              tipo.id,
            ),
          ) ??
          0,

        volumesAtivos:
          volumesPorTipo.get(
            Number(
              tipo.id,
            ),
          ) ??
          0,
      }),
    );

  const ativos =
    tipos.filter(
      (
        tipo,
      ) =>
        tipo.ativo,
    ).length;

  const inativos =
    tipos.length -
    ativos;

  const saldoTotal =
    tipos.reduce(
      (
        total,
        tipo,
      ) =>
        total +
        tipo.saldoCentral,
      0,
    );

  const volumesAtivos =
    tipos.reduce(
      (
        total,
        tipo,
      ) =>
        total +
        tipo.volumesAtivos,
      0,
    );

  const modoVolume =
    usuario.configuracao
      .modoControleCarga ===
    "VOLUME";

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto max-w-[1180px]">
        <ModuleHeader
          eyebrow="Catálogo"
          title="Tipos de cesta"
          actions={
            <div className="flex gap-2">
              <Link
                href="/admin/estoque"
                className="flex items-center gap-2 rounded-[14px] border border-emerald-100 bg-white px-4 py-3 text-[12px] font-extrabold text-emerald-800"
              >
                <Boxes
                  size={16}
                />
                Estoque
              </Link>

              {modoVolume ? (
                <Link
                  href="/admin/volumes"
                  className="flex items-center gap-2 rounded-[14px] bg-[#176f3c] px-4 py-3 text-[12px] font-extrabold text-white"
                >
                  <ScanLine
                    size={16}
                  />
                  Volumes
                </Link>
              ) : null}
            </div>
          }
        />

        <Hero
          eyebrow="Catálogo comercial"
          title="O que a empresa vende e movimenta."
          description="Cadastre, precifique, edite e controle quais tipos de cesta podem participar de estoque, cargas e entregas."
        >
          <KpiGrid>
            <Kpi
              label="Tipos cadastrados"
              value={
                tipos.length
              }
            />

            <Kpi
              label="Ativos"
              value={
                ativos
              }
              highlight={
                ativos >
                0
              }
            />

            <Kpi
              label="Inativos"
              value={
                inativos
              }
            />

            <Kpi
              label="Saldo central"
              value={
                saldoTotal
              }
            />

            {modoVolume ? (
              <Kpi
                label="Volumes ativos"
                value={
                  volumesAtivos
                }
              />
            ) : null}
          </KpiGrid>
        </Hero>

        <section className="mt-6">
          <NovoTipoCestaForm />
        </section>

        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
                Catálogo da empresa
              </p>

              <h2 className="mt-1 text-[24px] font-black tracking-[-0.04em]">
                Cestas cadastradas
              </h2>

              <p className="mt-1 text-[12px] text-slate-500">
                Uma cesta com saldo físico não pode ser inativada até a operação ser zerada.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[11px] font-black text-emerald-700 shadow-sm">
              <PackageCheck
                size={15}
              />
              {
                tipos.length
              } tipo(s)
            </div>
          </div>

          {tipos.length ===
          0 ? (
            <EmptyState
              title="Nenhum tipo de cesta cadastrado"
              text="Cadastre a primeira cesta acima para começar a movimentar estoque."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {tipos.map(
                (
                  tipo,
                ) => (
                  <TipoCestaCard
                    key={
                      tipo.id
                    }
                    tipo={
                      tipo
                    }
                  />
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
