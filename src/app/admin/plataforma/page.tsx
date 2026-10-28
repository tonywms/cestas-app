export const instant = false;

import Link from "next/link";

import {
  Activity,
  ArrowUpRight,
  Building2,
  Plus,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import {
  Hero,
  Kpi,
  KpiGrid,
  ModuleHeader,
  StatusBadge,
} from "@/components/admin/PremiumModuleUi";

import {
  requirePlatformAdminAal2,
} from "@/lib/auth/platform-security";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

export default async function PlataformaPage() {
  const usuario =
    await requirePlatformAdminAal2();

  const admin =
    createAdminClient();

  const [
    empresasResult,
    configsResult,
    vinculosResult,
  ] =
    await Promise.all([
      admin
        .from("empresas")
        .select(`
          id,
          codigo,
          nome_fantasia,
          razao_social,
          cnpj,
          status,
          ativo,
          limite_usuarios,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        ),

      admin
        .from(
          "empresa_configuracoes",
        )
        .select(`
          empresa_id,
          modo_controle_carga,
          exigir_bipagem_carga,
          exigir_bipagem_entrega,
          permitir_pagamento_mobile,
          permitir_ocorrencia_mobile
        `),

      admin
        .from(
          "empresa_usuarios",
        )
        .select(`
          empresa_id,
          usuario_id,
          ativo
        `),
    ]);

  const empresas =
    empresasResult.data ??
    [];

  const configs =
    new Map(
      (
        configsResult.data ??
        []
      ).map(
        (
          item,
        ) => [
          String(
            item.empresa_id,
          ),
          item,
        ],
      ),
    );

  const uso =
    new Map<
      string,
      number
    >();

  for (
    const vinculo of
      vinculosResult.data ??
      []
  ) {
    if (
      !vinculo.ativo
    ) {
      continue;
    }

    const id =
      String(
        vinculo.empresa_id,
      );

    uso.set(
      id,
      (
        uso.get(
          id,
        ) ??
        0
      ) +
        1,
    );
  }

  const ativas =
    empresas.filter(
      (
        empresa,
      ) =>
        empresa.ativo &&
        empresa.status ===
          "ATIVA",
    ).length;

  const suspensas =
    empresas.length -
    ativas;

  const licencas =
    empresas.reduce(
      (
        total,
        empresa,
      ) =>
        total +
        Number(
          empresa.limite_usuarios ??
            0,
        ),
      0,
    );

  const usadas =
    Array.from(
      uso.values(),
    ).reduce(
      (
        total,
        quantidade,
      ) =>
        total +
        quantidade,
      0,
    );

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto max-w-[1220px]">
        <ModuleHeader
          eyebrow="Plataforma"
          title="Empresas e contratos"
          actions={
            <div className="flex gap-2">
              <Link
                href="/admin/plataforma/auditoria"
                className="flex items-center gap-2 rounded-[14px] border border-emerald-100 bg-white px-4 py-3 text-[12px] font-black text-emerald-800"
              >
                <Activity
                  size={16}
                />
                Auditoria
              </Link>

              <Link
                href="/admin/plataforma/nova"
                className="flex items-center gap-2 rounded-[14px] bg-[#176f3c] px-4 py-3 text-[12px] font-black text-white"
              >
                <Plus
                  size={16}
                />
                Nova empresa
              </Link>
            </div>
          }
        />

        <Hero
          eyebrow="Multiempresa"
          title="Cada fornecedor no seu próprio ambiente."
          description="Gestão global da plataforma: empresas, licenças, configurações e isolamento operacional."
        >
          <KpiGrid>
            <Kpi
              label="Empresas"
              value={
                empresas.length
              }
            />

            <Kpi
              label="Ativas"
              value={
                ativas
              }
              highlight={
                ativas >
                0
              }
            />

            <Kpi
              label="Suspensas"
              value={
                suspensas
              }
              warning={
                suspensas >
                0
              }
            />

            <Kpi
              label="Licenças contratadas"
              value={
                licencas
              }
            />

            <Kpi
              label="Licenças usadas"
              value={
                usadas
              }
            />
          </KpiGrid>
        </Hero>

        <section className="mt-7">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
                Fornecedores
              </p>

              <h2 className="mt-1 text-[24px] font-black tracking-[-0.04em]">
                Ambientes cadastrados
              </h2>

              <p className="mt-1 text-[12px] text-slate-500">
                O Super Admin enxerga todas as empresas; usuários comuns continuam limitados ao próprio tenant.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[11px] font-black text-emerald-700 shadow-sm">
              <ShieldCheck
                size={15}
              />
              Super Admin
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {empresas.map(
              (
                empresa,
              ) => {
                const config =
                  configs.get(
                    String(
                      empresa.id,
                    ),
                  );

                const utilizados =
                  uso.get(
                    String(
                      empresa.id,
                    ),
                  ) ??
                  0;

                const limite =
                  Number(
                    empresa.limite_usuarios ??
                      0,
                  );

                const percentual =
                  limite >
                  0
                    ? Math.min(
                        100,
                        Math.round(
                          (
                            utilizados /
                            limite
                          ) *
                            100,
                        ),
                      )
                    : 0;

                const ativa =
                  Boolean(
                    empresa.ativo,
                  ) &&
                  empresa.status ===
                    "ATIVA";

                return (
                  <Link
                    key={
                      empresa.id
                    }
                    href={`/admin/plataforma/empresas/${empresa.id}`}
                    className="card-premium group rounded-[28px] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-emerald-50 text-emerald-700">
                          <Building2
                            size={21}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#b07a12]">
                            {
                              empresa.codigo
                            }
                          </p>

                          <h3 className="mt-1 truncate text-[18px] font-black">
                            {
                              empresa.nome_fantasia
                            }
                          </h3>
                        </div>
                      </div>

                      <StatusBadge
                        tone={
                          ativa
                            ? "green"
                            : "amber"
                        }
                      >
                        {ativa
                          ? "ATIVA"
                          : "SUSPENSA"}
                      </StatusBadge>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <Mini
                        label="Controle"
                        value={
                          String(
                            config?.modo_controle_carga ??
                              "QUANTIDADE",
                          )
                        }
                      />

                      <Mini
                        label="Usuários"
                        value={`${utilizados}/${limite}`}
                      />

                      <Mini
                        label="Disponíveis"
                        value={
                          String(
                            Math.max(
                              0,
                              limite -
                                utilizados,
                            ),
                          )
                        }
                      />
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400">
                        <span>
                          Consumo de licenças
                        </span>

                        <span>
                          {percentual}%
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{
                            width:
                              `${percentual}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-[11px] font-extrabold text-emerald-700">
                        Abrir empresa
                      </span>

                      <ArrowUpRight
                        size={17}
                        className="text-emerald-700 transition group-hover:translate-x-1 group-hover:-translate-y-1"
                      />
                    </div>
                  </Link>
                );
              },
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Mini({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[16px] bg-[#f5f8f5] p-3">
      <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
        {
          label
        }
      </p>

      <p className="mt-1 text-[13px] font-black text-slate-700">
        {
          value
        }
      </p>
    </div>
  );
}
