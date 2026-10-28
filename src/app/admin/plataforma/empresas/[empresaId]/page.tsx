export const instant = false;

import {
  Building2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

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

import EmpresaPlataformaForm from "./EmpresaPlataformaForm";

export default async function EmpresaPlataformaPage({
  params,
}: {
  params:
    Promise<{
      empresaId:
        string;
    }>;
}) {
  await requirePlatformAdminAal2();

  const {
    empresaId,
  } =
    await params;

  const admin =
    createAdminClient();

  const [
    empresaResult,
    configResult,
    usuariosResult,
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
        .eq(
          "id",
          empresaId,
        )
        .maybeSingle(),

      admin
        .from(
          "empresa_configuracoes",
        )
        .select(`
          modo_controle_carga,
          exigir_bipagem_carga,
          exigir_bipagem_entrega,
          permitir_pagamento_mobile,
          permitir_ocorrencia_mobile
        `)
        .eq(
          "empresa_id",
          empresaId,
        )
        .maybeSingle(),

      admin
        .from(
          "empresa_usuarios",
        )
        .select(`
          usuario_id,
          ativo,
          usuarios!inner (
            nome,
            email,
            ativo
          ),
          perfis!inner (
            codigo,
            nome
          )
        `)
        .eq(
          "empresa_id",
          empresaId,
        )
        .order(
          "created_at",
        ),
    ]);

  const empresa =
    empresaResult.data;

  if (!empresa) {
    notFound();
  }

  const config =
    configResult.data ?? {
      modo_controle_carga:
        "QUANTIDADE",
      exigir_bipagem_carga:
        false,
      exigir_bipagem_entrega:
        false,
      permitir_pagamento_mobile:
        true,
      permitir_ocorrencia_mobile:
        true,
    };

  const membros =
    usuariosResult.data ??
    [];

  const ativos =
    membros.filter(
      (
        membro,
      ) => {
        const raw =
          membro.usuarios;

        const pessoa =
          Array.isArray(
            raw,
          )
            ? raw[0]
            : raw;

        return (
          membro.ativo &&
          pessoa?.ativo
        );
      },
    ).length;

  const limite =
    Number(
      empresa.limite_usuarios ??
        0,
    );

  const disponiveis =
    Math.max(
      0,
      limite -
        ativos,
    );

  const ativa =
    Boolean(
      empresa.ativo,
    ) &&
    empresa.status ===
      "ATIVA";

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto max-w-[1100px]">
        <ModuleHeader
          eyebrow="Plataforma"
          title="Detalhe da empresa"
          backHref="/admin/plataforma"
        />

        <Hero
          eyebrow={
            String(
              empresa.codigo,
            )
          }
          title={
            String(
              empresa.nome_fantasia,
            )
          }
          description="Contrato, licenças e comportamento operacional deste tenant."
        >
          <KpiGrid>
            <Kpi
              label="Status"
              value={
                ativa
                  ? "ATIVA"
                  : "SUSPENSA"
              }
              warning={
                !ativa
              }
            />

            <Kpi
              label="Usuários ativos"
              value={
                ativos
              }
            />

            <Kpi
              label="Limite contratado"
              value={
                limite
              }
            />

            <Kpi
              label="Disponíveis"
              value={
                disponiveis
              }
              highlight={
                disponiveis >
                0
              }
            />

            <Kpi
              label="Controle"
              value={
                String(
                  config.modo_controle_carga,
                )
              }
            />
          </KpiGrid>
        </Hero>

        <section className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="card-premium rounded-[22px] p-5">
            <div className="flex items-start gap-3">
              <Building2
                size={20}
                className="mt-0.5 text-emerald-700"
              />

              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                  Empresa
                </p>

                <p className="mt-1 text-[14px] font-black">
                  {
                    empresa.nome_fantasia
                  }
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                  {
                    empresa.cnpj ??
                    "CNPJ não informado"
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="card-premium rounded-[22px] p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={20}
                className="mt-0.5 text-emerald-700"
              />

              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                  Isolamento
                </p>

                <p className="mt-1 text-[14px] font-black">
                  Tenant próprio
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                  Dados operacionais vinculados exclusivamente ao empresa_id.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6">
          <EmpresaPlataformaForm
            empresa={{
              id:
                String(
                  empresa.id,
                ),
              codigo:
                String(
                  empresa.codigo,
                ),
              nomeFantasia:
                String(
                  empresa.nome_fantasia,
                ),
              razaoSocial:
                empresa.razao_social
                  ? String(
                      empresa.razao_social,
                    )
                  : "",
              cnpj:
                empresa.cnpj
                  ? String(
                      empresa.cnpj,
                    )
                  : "",
              status:
                String(
                  empresa.status,
                ),
              limiteUsuarios:
                limite,
            }}
            configuracao={{
              modo:
                config.modo_controle_carga ===
                "VOLUME"
                  ? "VOLUME"
                  : "QUANTIDADE",
              bipagemCarga:
                Boolean(
                  config.exigir_bipagem_carga,
                ),
              bipagemEntrega:
                Boolean(
                  config.exigir_bipagem_entrega,
                ),
              pagamentoMobile:
                Boolean(
                  config.permitir_pagamento_mobile,
                ),
              ocorrenciaMobile:
                Boolean(
                  config.permitir_ocorrencia_mobile,
                ),
            }}
          />
        </div>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
                Licenças
              </p>

              <h2 className="mt-1 text-[22px] font-black">
                Usuários vinculados
              </h2>
            </div>

            <StatusBadge tone="green">
              {ativos}/{limite}
            </StatusBadge>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {membros.map(
              (
                membro,
                index,
              ) => {
                const usuarioRaw =
                  membro.usuarios;

                const pessoa =
                  Array.isArray(
                    usuarioRaw,
                  )
                    ? usuarioRaw[0]
                    : usuarioRaw;

                const perfilRaw =
                  membro.perfis;

                const perfil =
                  Array.isArray(
                    perfilRaw,
                  )
                    ? perfilRaw[0]
                    : perfilRaw;

                return (
                  <div
                    key={`${membro.usuario_id}-${index}`}
                    className="card-premium rounded-[22px] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-emerald-50 text-emerald-700">
                        <UsersRound
                          size={18}
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-black">
                          {
                            pessoa?.nome ??
                            "Usuário"
                          }
                        </p>

                        <p className="mt-1 truncate text-[11px] text-slate-400">
                          {
                            pessoa?.email ??
                            "Sem e-mail"
                          }
                        </p>

                        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700">
                          {
                            perfil?.nome ??
                            "Perfil"
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
