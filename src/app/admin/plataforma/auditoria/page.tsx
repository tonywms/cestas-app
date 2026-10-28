export const instant = false;

import {
  Activity,
  Building2,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  requirePlatformAdminAal2,
} from "@/lib/auth/platform-security";

import {
  ModuleHeader,
  StatusBadge,
} from "@/components/admin/PremiumModuleUi";

function dataHora(
  valor:
    string,
) {
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
      second:
        "2-digit",
    },
  );
}

function textoAcao(
  acao:
    string,
) {
  switch (
    acao
  ) {
    case "EMPRESA_CRIADA":
      return "Empresa criada";

    case "EMPRESA_ATUALIZADA":
      return "Empresa atualizada";

    case "EMPRESA_CRIACAO_FALHOU":
      return "Falha no onboarding";

    default:
      return acao;
  }
}

export default async function PlataformaAuditoriaPage() {
  await requirePlatformAdminAal2();

  const admin =
    createAdminClient();

  const {
    data:
      eventos,
  } =
    await admin
      .from(
        "auditoria_eventos",
      )
      .select(`
        id,
        empresa_id,
        usuario_id,
        entidade_id,
        acao,
        dados,
        created_at
      `)
      .eq(
        "entidade",
        "PLATAFORMA_EMPRESA",
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        100,
      );

  const lista =
    eventos ??
    [];

  const usuarioIds =
    Array.from(
      new Set(
        lista.map(
          (
            evento,
          ) =>
            String(
              evento.usuario_id,
            ),
        ),
      ),
    );

  const empresaIds =
    Array.from(
      new Set(
        lista.map(
          (
            evento,
          ) =>
            String(
              evento.empresa_id,
            ),
        ),
      ),
    );

  const [
    usuariosResult,
    empresasResult,
  ] =
    await Promise.all([
      usuarioIds.length >
      0
        ? admin
            .from(
              "usuarios",
            )
            .select(`
              id,
              nome,
              email
            `)
            .in(
              "id",
              usuarioIds,
            )
        : Promise.resolve({
            data:
              [],
          }),

      empresaIds.length >
      0
        ? admin
            .from(
              "empresas",
            )
            .select(`
              id,
              codigo,
              nome_fantasia
            `)
            .in(
              "id",
              empresaIds,
            )
        : Promise.resolve({
            data:
              [],
          }),
    ]);

  const usuarios =
    new Map(
      (
        usuariosResult.data ??
        []
      ).map(
        (
          usuario,
        ) => [
          String(
            usuario.id,
          ),
          usuario,
        ],
      ),
    );

  const empresas =
    new Map(
      (
        empresasResult.data ??
        []
      ).map(
        (
          empresa,
        ) => [
          String(
            empresa.id,
          ),
          empresa,
        ],
      ),
    );

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto max-w-[1180px]">
        <ModuleHeader
          eyebrow="Plataforma"
          title="Auditoria administrativa"
          backHref="/admin/plataforma"
        />

        <div className="mt-5 rounded-[24px] border border-emerald-100 bg-white/80 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck
              size={20}
              className="mt-0.5 shrink-0 text-emerald-700"
            />

            <div>
              <p className="text-[13px] font-black">
                Trilhas das operações críticas
              </p>

              <p className="mt-1 text-[12px] leading-5 text-slate-500">
                Criação e alteração de empresas são registradas com usuário, data/hora, origem da requisição e informações antes/depois.
              </p>
            </div>
          </div>
        </div>

        <section className="mt-6">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
                Eventos
              </p>

              <h2 className="mt-1 text-[24px] font-black tracking-[-0.04em]">
                Últimas ações da Plataforma
              </h2>
            </div>

            <StatusBadge tone="green">
              {lista.length} evento(s)
            </StatusBadge>
          </div>

          {lista.length ===
          0 ? (
            <div className="card-premium rounded-[26px] p-8 text-center">
              <Activity
                size={28}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 text-[13px] font-bold text-slate-400">
                Nenhuma ação crítica registrada ainda.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {lista.map(
                (
                  evento,
                ) => {
                  const usuario =
                    usuarios.get(
                      String(
                        evento.usuario_id,
                      ),
                    );

                  const empresa =
                    empresas.get(
                      String(
                        evento.empresa_id,
                      ),
                    );

                  const dados =
                    (
                      evento.dados ??
                      {}
                    ) as Record<
                      string,
                      unknown
                    >;

                  const seguranca =
                    (
                      dados.seguranca ??
                      {}
                    ) as Record<
                      string,
                      unknown
                    >;

                  return (
                    <article
                      key={
                        evento.id
                      }
                      className="card-premium rounded-[24px] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#b07a12]">
                            {
                              textoAcao(
                                String(
                                  evento.acao,
                                ),
                              )
                            }
                          </p>

                          <h3 className="mt-1 text-[17px] font-black">
                            {
                              empresa?.nome_fantasia ??
                              String(
                                evento.entidade_id ??
                                "Plataforma",
                              )
                            }
                          </h3>
                        </div>

                        <StatusBadge tone="green">
                          MFA AAL2
                        </StatusBadge>
                      </div>

                      <div className="mt-4 grid gap-2 md:grid-cols-3">
                        <Info
                          icon={
                            <UserRound
                              size={16}
                            />
                          }
                          label="Executado por"
                          value={
                            usuario?.nome ??
                            "Super Admin"
                          }
                        />

                        <Info
                          icon={
                            <Building2
                              size={16}
                            />
                          }
                          label="Empresa"
                          value={
                            empresa
                              ? `${empresa.codigo} · ${empresa.nome_fantasia}`
                              : "Plataforma"
                          }
                        />

                        <Info
                          icon={
                            <Activity
                              size={16}
                            />
                          }
                          label="Data / hora"
                          value={
                            dataHora(
                              String(
                                evento.created_at,
                              ),
                            )
                          }
                        />
                      </div>

                      <div className="mt-4 grid gap-2 md:grid-cols-2">
                        <div className="rounded-[16px] bg-slate-50 p-4">
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                            IP registrado
                          </p>

                          <p className="mt-1 text-[11px] font-bold text-slate-600">
                            {
                              String(
                                seguranca.ip ??
                                "Não disponível",
                              )
                            }
                          </p>
                        </div>

                        <div className="rounded-[16px] bg-slate-50 p-4">
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                            Ação técnica
                          </p>

                          <p className="mt-1 text-[11px] font-bold text-slate-600">
                            {
                              evento.acao
                            }
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>
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
    <div className="flex items-start gap-3 rounded-[16px] bg-[#f6f9f6] p-3">
      <div className="mt-0.5 text-emerald-700">
        {
          icon
        }
      </div>

      <div className="min-w-0">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
          {
            label
          }
        </p>

        <p className="mt-1 truncate text-[11px] font-black text-slate-700">
          {
            value
          }
        </p>
      </div>
    </div>
  );
}
