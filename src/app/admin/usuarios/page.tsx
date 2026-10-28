export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

import {
  ApplyButton,
  EmptyState,
  Field,
  Hero,
  Kpi,
  KpiGrid,
  MiniMetric,
  ModuleHeader,
  QuickLink,
  SmartFilters,
  StatusBadge,
  formatDate,
  inputClass,
} from "@/components/admin/PremiumModuleUi";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    perfil?: string;
    status?: string;
    acesso?: string;
  }>;
};

type UsuarioEmpresa = {
  usuario_id: string;
  ativo: boolean;

  usuarios:
    | {
        id: string;
        nome: string;
        email: string | null;
        telefone: string | null;
        ativo: boolean;
        ultimo_acesso: string | null;
      }
    | {
        id: string;
        nome: string;
        email: string | null;
        telefone: string | null;
        ativo: boolean;
        ultimo_acesso: string | null;
      }[];

  perfis:
    | {
        id: number;
        codigo: string;
        nome: string;
      }
    | {
        id: number;
        codigo: string;
        nome: string;
      }[];
};

function itemUnico<T>(
  valor: T | T[] | null,
): T | null {
  if (!valor) {
    return null;
  }

  return Array.isArray(valor)
    ? valor[0] ?? null
    : valor;
}

export default async function UsuariosPage({
  searchParams,
}: PageProps) {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const podeGerenciar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.USUARIOS_GERENCIAR,
    ) ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.PERMISSOES_GERENCIAR,
    );

  if (!podeGerenciar) {
    redirect("/admin");
  }

  const filtros =
    await searchParams;

  const supabase =
    await createClient();

  const [
    membrosResult,
    empresaResult,
  ] =
    await Promise.all([
      supabase
        .from("empresa_usuarios")
        .select(`
          usuario_id,
          ativo,
          usuarios!inner (
            id,
            nome,
            email,
            telefone,
            ativo,
            ultimo_acesso
          ),
          perfis!inner (
            id,
            codigo,
            nome
          )
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        ),

      supabase
        .from("empresas")
        .select(`
          limite_usuarios
        `)
        .eq(
          "id",
          usuario.empresa.id,
        )
        .maybeSingle(),
    ]);

  const data =
    membrosResult.data;

  const limiteUsuarios =
    Number(
      empresaResult.data
        ?.limite_usuarios ??
        10,
    );

  const membros =
    (
      (
        data ??
        []
      ) as unknown as UsuarioEmpresa[]
    )
      .map(
        (
          item,
        ) => ({
          ...item,
          usuario:
            itemUnico(
              item.usuarios,
            ),
          perfil:
            itemUnico(
              item.perfis,
            ),
        }),
      )
      .filter(
        (
          item,
        ) =>
          item.usuario &&
          item.perfil,
      );

  const busca =
    (
      filtros.q ??
      ""
    )
      .trim()
      .toLocaleLowerCase(
        "pt-BR",
      );

  const agora =
    Date.now();

  const filtrados =
    membros
      .filter(
        (
          item,
        ) => {
          const colaborador =
            item.usuario!;

          const perfil =
            item.perfil!;

          if (
            busca &&
            !colaborador.nome
              .toLocaleLowerCase(
                "pt-BR",
              )
              .includes(
                busca,
              ) &&
            !(
              colaborador.email ??
              ""
            )
              .toLocaleLowerCase(
                "pt-BR",
              )
              .includes(
                busca,
              )
          ) {
            return false;
          }

          if (
            filtros.perfil &&
            perfil.codigo !==
              filtros.perfil
          ) {
            return false;
          }

          const ativo =
            item.ativo &&
            colaborador.ativo;

          if (
            filtros.status ===
              "ativo" &&
            !ativo
          ) {
            return false;
          }

          if (
            filtros.status ===
              "inativo" &&
            ativo
          ) {
            return false;
          }

          if (
            filtros.acesso
          ) {
            const ultimo =
              colaborador.ultimo_acesso
                ? new Date(
                    colaborador.ultimo_acesso,
                  ).getTime()
                : null;

            if (
              filtros.acesso ===
                "nunca" &&
              ultimo !==
                null
            ) {
              return false;
            }

            if (
              filtros.acesso ===
                "7" &&
              (
                !ultimo ||
                agora -
                  ultimo >
                  7 *
                    86400000
              )
            ) {
              return false;
            }

            if (
              filtros.acesso ===
                "30" &&
              (
                !ultimo ||
                agora -
                  ultimo >
                  30 *
                    86400000
              )
            ) {
              return false;
            }
          }

          return true;
        },
      )
      .sort(
        (
          a,
          b,
        ) =>
          (
            a.usuario?.nome ??
            ""
          ).localeCompare(
            b.usuario?.nome ??
              "",
            "pt-BR",
          ),
      );

  const ativos =
    filtrados.filter(
      (
        item,
      ) =>
        item.ativo &&
        item.usuario?.ativo,
    ).length;

  const entregadores =
    filtrados.filter(
      (
        item,
      ) =>
        item.perfil
          ?.codigo ===
        "ENTREGADOR",
    ).length;

  const gestores =
    filtrados.filter(
      (
        item,
      ) =>
        item.perfil
          ?.codigo ===
          "GESTOR" ||
        item.perfil
          ?.codigo ===
          "ADMINISTRADOR",
    ).length;

  const financeiros =
    filtrados.filter(
      (
        item,
      ) =>
        item.perfil
          ?.codigo ===
        "FINANCEIRO",
    ).length;

  const usuariosAtivosEmpresa =
    membros.filter(
      (
        item,
      ) =>
        item.ativo &&
        item.usuario?.ativo,
    ).length;

  const licencasDisponiveis =
    Math.max(
      0,
      limiteUsuarios -
        usuariosAtivosEmpresa,
    );

  const semAcesso =
    filtrados.filter(
      (
        item,
      ) =>
        !item.usuario
          ?.ultimo_acesso,
    ).length;

  const perfis =
    Array.from(
      new Map(
        membros.map(
          (
            item,
          ) => [
            item.perfil!
              .codigo,
            item.perfil!,
          ],
        ),
      ).values(),
    );

  const activeCount =
    Object.values(
      filtros,
    ).filter(
      (
        value,
      ) =>
        typeof value ===
          "string" &&
        value.trim(),
    ).length;

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">

      <div className="mx-auto max-w-[1180px]">

        <ModuleHeader
          eyebrow="Segurança"
          title="Usuários e colaboradores"
          actions={
            <Link
              href="/admin/usuarios/novo"
              className="rounded-[14px] bg-[#176f3c] px-4 py-3 text-[9px] font-black text-white"
            >
              + Novo colaborador
            </Link>
          }
        />

        <Hero
          eyebrow="Gestão de equipe"
          title="Acessos da empresa"
          description="Controle equipe, perfis, permissões e consumo de licenças da empresa sem ultrapassar o limite contratado."
        >
          <KpiGrid>
            <Kpi
              label="Usuários"
              value={
                filtrados.length
              }
            />

            <Kpi
              label="Ativos"
              value={ativos}
            />

            <Kpi
              label="Entregadores"
              value={
                entregadores
              }
            />

            <Kpi
              label="Gestão"
              value={gestores}
            />

            <Kpi
              label="Financeiro"
              value={
                financeiros
              }
            />

            <Kpi
              label="Licenças"
              value={`${usuariosAtivosEmpresa}/${limiteUsuarios}`}
              warning={
                licencasDisponiveis ===
                0
              }
              highlight={
                licencasDisponiveis >
                0
              }
              subtitle={`${licencasDisponiveis} disponível(is)`}
            />

            <Kpi
              label="Nunca acessaram"
              value={semAcesso}
              warning={
                semAcesso >
                0
              }
            />
          </KpiGrid>
        </Hero>

        <SmartFilters
          resetHref="/admin/usuarios"
          activeCount={
            activeCount
          }
          quick={
            <div className="flex flex-wrap gap-2">

              <QuickLink
                href="/admin/usuarios"
                active={
                  !filtros.perfil &&
                  !filtros.status &&
                  !filtros.acesso
                }
              >
                Todos
              </QuickLink>

              <QuickLink
                href="/admin/usuarios?perfil=ENTREGADOR"
                active={
                  filtros.perfil ===
                  "ENTREGADOR"
                }
              >
                Entregadores
              </QuickLink>

              <QuickLink
                href="/admin/usuarios?perfil=FINANCEIRO"
                active={
                  filtros.perfil ===
                  "FINANCEIRO"
                }
              >
                Financeiro
              </QuickLink>

              <QuickLink
                href="/admin/usuarios?status=ativo"
                active={
                  filtros.status ===
                  "ativo"
                }
              >
                Ativos
              </QuickLink>

              <QuickLink
                href="/admin/usuarios?acesso=nunca"
                active={
                  filtros.acesso ===
                  "nunca"
                }
                tone="gold"
              >
                Nunca acessaram
              </QuickLink>

            </div>
          }
        >
          <form
            method="get"
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
          >

            <Field label="Buscar">
              <input
                name="q"
                defaultValue={
                  filtros.q ??
                  ""
                }
                placeholder="Nome ou e-mail"
                className={
                  inputClass
                }
              />
            </Field>

            <Field label="Perfil">
              <select
                name="perfil"
                defaultValue={
                  filtros.perfil ??
                  ""
                }
                className={
                  inputClass
                }
              >
                <option value="">
                  Todos
                </option>

                {perfis.map(
                  (
                    perfil,
                  ) => (
                    <option
                      key={
                        perfil.codigo
                      }
                      value={
                        perfil.codigo
                      }
                    >
                      {
                        perfil.nome
                      }
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field label="Status">
              <select
                name="status"
                defaultValue={
                  filtros.status ??
                  ""
                }
                className={
                  inputClass
                }
              >
                <option value="">
                  Todos
                </option>

                <option value="ativo">
                  Ativo
                </option>

                <option value="inativo">
                  Inativo
                </option>
              </select>
            </Field>

            <div className="flex items-end">
              <ApplyButton />
            </div>

          </form>
        </SmartFilters>

        <section className="mt-7">

          {filtrados.length ===
          0 ? (
            <EmptyState
              title="Nenhum colaborador encontrado"
              text="Ajuste os filtros ou cadastre um novo colaborador."
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">

              {filtrados.map(
                (
                  item,
                ) => {
                  const colaborador =
                    item.usuario!;

                  const perfil =
                    item.perfil!;

                  const ativo =
                    item.ativo &&
                    colaborador.ativo;

                  const podeAbrirPermissoes =
                    perfil.codigo ===
                    "ENTREGADOR";

                  const card = (
                    <article className="flex h-full min-h-[222px] flex-col rounded-[28px] border border-black/[0.04] bg-white p-5 shadow-[0_16px_42px_rgba(17,63,33,0.06)] transition hover:border-emerald-100">

                      <div className="flex items-start justify-between gap-4">

                        <div className="min-w-0">

                          <p className="text-[8px] font-black uppercase tracking-[0.13em] text-[#b28735]">
                            {
                              perfil.nome
                            }
                          </p>

                          <h3 className="mt-1 truncate text-[18px] font-black">
                            {
                              colaborador.nome
                            }
                          </h3>

                          <p className="mt-1 truncate text-[9px] text-slate-400">
                            {
                              colaborador.email ??
                              "Sem e-mail"
                            }
                          </p>

                        </div>

                        <StatusBadge
                          tone={
                            ativo
                              ? "green"
                              : "slate"
                          }
                        >
                          {ativo
                            ? "Ativo"
                            : "Inativo"}
                        </StatusBadge>

                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">

                        <MiniMetric
                          label="Perfil"
                          value={
                            perfil.codigo
                          }
                        />

                        <MiniMetric
                          label="Último acesso"
                          value={
                            colaborador.ultimo_acesso
                              ? formatDate(
                                  colaborador.ultimo_acesso,
                                )
                              : "Nunca"
                          }
                          tone={
                            colaborador.ultimo_acesso
                              ? "green"
                              : "amber"
                          }
                        />

                      </div>

                      <div className="mt-auto min-h-[34px] pt-4">
                        {podeAbrirPermissoes ? (
                          <p className="text-center text-[8px] font-black text-emerald-700">
                            Clique para configurar permissões individuais →
                          </p>
                        ) : null}
                      </div>

                    </article>
                  );

                  return podeAbrirPermissoes ? (
                    <Link
                      key={
                        item.usuario_id
                      }
                      href={`/admin/usuarios/${item.usuario_id}/permissoes`}
                      className="block h-full"
                    >
                      {card}
                    </Link>
                  ) : (
                    <div
                      key={
                        item.usuario_id
                      }
                      className="h-full"
                    >
                      {card}
                    </div>
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