export const instant = false;

import Link from "next/link";

import {
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
} from "lucide-react";

import {
  redirect,
} from "next/navigation";

import {
  Hero,
  Kpi,
  KpiGrid,
  ModuleHeader,
  StatusBadge,
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

import PermissoesEntregadorForm, {
  type PermissaoTela,
} from "./PermissoesEntregadorForm";

const PROIBIDAS_ENTREGADOR =
  new Set<string>([
    PERMISSOES.EMPRESA_CONFIGURAR,
    PERMISSOES.PERMISSOES_GERENCIAR,
    PERMISSOES.USUARIOS_GERENCIAR,
  ]);

type PerfilResumo = {
  id: number;
  codigo: string;
  nome: string;
  total: number;
  liberadas: number;
};

export default async function PermissoesPage() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const podeGerenciar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.PERMISSOES_GERENCIAR,
    );

  if (!podeGerenciar) {
    redirect("/admin");
  }

  const supabase =
    await createClient();

  const [
    perfisResult,
    catalogoResult,
    perfilPermissoesResult,
    membrosResult,
    overridesResult,
  ] = await Promise.all([
    supabase
      .from("perfis")
      .select(`
        id,
        codigo,
        nome,
        ativo
      `)
      .eq("ativo", true)
      .order("id"),

    supabase
      .from("permissoes")
      .select(`
        id,
        codigo,
        nome,
        modulo,
        descricao,
        sensivel,
        ativo
      `)
      .eq("ativo", true)
      .order("modulo")
      .order("nome"),

    supabase
      .from("perfil_permissoes")
      .select(`
        perfil_id,
        permissao_id,
        permitido
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      ),

    supabase
      .from("empresa_usuarios")
      .select(`
        usuario_id,
        perfil_id,
        ativo,
        usuarios!inner (
          id,
          nome,
          email,
          ativo
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
      )
      .eq("ativo", true),

    supabase
      .from("usuario_permissoes")
      .select(`
        usuario_id,
        permissao_id,
        permitido
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      ),
  ]);

  if (
    perfisResult.error ||
    catalogoResult.error ||
    perfilPermissoesResult.error
  ) {
    throw new Error(
      "Não foi possível carregar a matriz de permissões.",
    );
  }

  const perfis =
    perfisResult.data ?? [];

  const catalogo =
    catalogoResult.data ?? [];

  const perfilEntregador =
    perfis.find(
      (perfil) =>
        perfil.codigo === "ENTREGADOR",
    );

  if (!perfilEntregador) {
    throw new Error(
      "Perfil ENTREGADOR não encontrado.",
    );
  }

  const permitidoPorPerfil =
    new Map<number, Set<string>>();

  for (const perfil of perfis) {
    permitidoPorPerfil.set(
      Number(perfil.id),
      new Set(),
    );
  }

  for (
    const item of
      perfilPermissoesResult.data ?? []
  ) {
    if (!item.permitido) {
      continue;
    }

    const perfilId =
      Number(item.perfil_id);

    if (
      !permitidoPorPerfil.has(
        perfilId,
      )
    ) {
      permitidoPorPerfil.set(
        perfilId,
        new Set(),
      );
    }

    permitidoPorPerfil
      .get(perfilId)!
      .add(
        String(
          item.permissao_id,
        ),
      );
  }

  const perfisResumo:
    PerfilResumo[] =
    perfis.map(
      (perfil) => ({
        id:
          Number(perfil.id),
        codigo:
          String(perfil.codigo),
        nome:
          String(perfil.nome),
        total:
          catalogo.length,
        liberadas:
          permitidoPorPerfil.get(
            Number(perfil.id),
          )?.size ?? 0,
      }),
    );

  const perfilEntregadorMap =
    new Map<string, boolean>();

  for (
    const item of
      perfilPermissoesResult.data ?? []
  ) {
    if (
      Number(item.perfil_id) ===
      Number(perfilEntregador.id)
    ) {
      perfilEntregadorMap.set(
        String(item.permissao_id),
        Boolean(item.permitido),
      );
    }
  }

  const permissoesTela:
    PermissaoTela[] =
    catalogo.map(
      (permissao) => {
        let bloqueado =
          false;

        let motivoBloqueio:
          string | null =
          null;

        if (
          PROIBIDAS_ENTREGADOR.has(
            String(permissao.codigo),
          )
        ) {
          bloqueado =
            true;

          motivoBloqueio =
            "Reservado aos perfis administrativos.";
        }

        if (
          usuario.configuracao
            .modoControleCarga !==
            "VOLUME" &&
          (
            permissao.codigo ===
              PERMISSOES.CARGA_BIPAR_VOLUME ||
            permissao.codigo ===
              PERMISSOES.ENTREGA_BIPAR_VOLUME
          )
        ) {
          bloqueado =
            true;

          motivoBloqueio =
            "Indisponível porque a empresa opera por QUANTIDADE.";
        }

        if (
          !usuario.configuracao
            .permitirPagamentoMobile &&
          permissao.codigo ===
            PERMISSOES.PAGAMENTO_REGISTRAR
        ) {
          bloqueado =
            true;

          motivoBloqueio =
            "Recebimentos mobile estão desativados nas configurações da empresa.";
        }

        if (
          !usuario.configuracao
            .permitirOcorrenciaMobile &&
          permissao.codigo ===
            PERMISSOES.OCORRENCIA_REGISTRAR
        ) {
          bloqueado =
            true;

          motivoBloqueio =
            "Ocorrências mobile estão desativadas nas configurações da empresa.";
        }

        const configurado =
          perfilEntregadorMap.get(
            String(permissao.id),
          ) ?? false;

        return {
          id:
            String(permissao.id),
          codigo:
            String(permissao.codigo),
          nome:
            String(permissao.nome),
          modulo:
            String(permissao.modulo),
          descricao:
            permissao.descricao
              ? String(permissao.descricao)
              : null,
          sensivel:
            Boolean(permissao.sensivel),
          permitido:
            configurado &&
            !bloqueado,
          bloqueado,
          motivoBloqueio,
        };
      },
    );

  const entregadores =
    (
      membrosResult.data ?? []
    )
      .map(
        (membro) => {
          const perfilRaw =
            membro.perfis;

          const perfil =
            Array.isArray(
              perfilRaw,
            )
              ? perfilRaw[0]
              : perfilRaw;

          const usuarioRaw =
            membro.usuarios;

          const pessoa =
            Array.isArray(
              usuarioRaw,
            )
              ? usuarioRaw[0]
              : usuarioRaw;

          if (
            !perfil ||
            perfil.codigo !==
              "ENTREGADOR" ||
            !pessoa
          ) {
            return null;
          }

          return {
            id:
              String(pessoa.id),
            nome:
              String(pessoa.nome),
            email:
              pessoa.email
                ? String(pessoa.email)
                : null,
          };
        },
      )
      .filter(
        (
          item,
        ): item is {
          id: string;
          nome: string;
          email: string | null;
        } =>
          item !== null,
      );

  const overridesPorUsuario =
    new Map<
      string,
      {
        liberadas: number;
        bloqueadas: number;
      }
    >();

  for (
    const override of
      overridesResult.data ?? []
  ) {
    const id =
      String(
        override.usuario_id,
      );

    const atual =
      overridesPorUsuario.get(
        id,
      ) ?? {
        liberadas: 0,
        bloqueadas: 0,
      };

    if (override.permitido) {
      atual.liberadas += 1;
    } else {
      atual.bloqueadas += 1;
    }

    overridesPorUsuario.set(
      id,
      atual,
    );
  }

  const quantidadeLiberada =
    permissoesTela.filter(
      (item) =>
        item.permitido,
    ).length;

  const quantidadeBloqueada =
    permissoesTela.filter(
      (item) =>
        item.bloqueado,
    ).length;

  const totalOverrides =
    Array.from(
      overridesPorUsuario.values(),
    ).reduce(
      (total, item) =>
        total +
        item.liberadas +
        item.bloqueadas,
      0,
    );

  const bipagemCargaPerfil =
    permissoesTela.find(
      (item) =>
        item.codigo ===
        PERMISSOES.CARGA_BIPAR_VOLUME,
    )?.permitido ?? false;

  const bipagemEntregaPerfil =
    permissoesTela.find(
      (item) =>
        item.codigo ===
        PERMISSOES.ENTREGA_BIPAR_VOLUME,
    )?.permitido ?? false;

  const exigeBipagemSemPerfil =
    usuario.configuracao
      .modoControleCarga ===
      "VOLUME" &&
    (
      (
        usuario.configuracao
          .exigirBipagemCarga &&
        !bipagemCargaPerfil
      ) ||
      (
        usuario.configuracao
          .exigirBipagemEntrega &&
        !bipagemEntregaPerfil
      )
    );

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto max-w-[1180px]">
        <ModuleHeader
          eyebrow="Segurança"
          title="Permissões e acessos"
          actions={
            <Link
              href="/admin/usuarios"
              className="rounded-[14px] border border-emerald-100 bg-white px-4 py-3 text-[12px] font-extrabold text-emerald-800"
            >
              Usuários
            </Link>
          }
        />

        <Hero
          eyebrow="Controle de acesso"
          title="Quem pode fazer o quê."
          description={`A matriz abaixo pertence somente à ${usuario.empresa.nomeFantasia}. O perfil define o padrão e cada entregador pode possuir exceções individuais.`}
        >
          <KpiGrid>
            <Kpi
              label="Permissões"
              value={catalogo.length}
            />

            <Kpi
              label="Entregador ativas"
              value={quantidadeLiberada}
              highlight={
                quantidadeLiberada > 0
              }
            />

            <Kpi
              label="Bloqueios superiores"
              value={quantidadeBloqueada}
            />

            <Kpi
              label="Entregadores"
              value={entregadores.length}
            />

            <Kpi
              label="Exceções individuais"
              value={totalOverrides}
              warning={
                totalOverrides > 0
              }
            />
          </KpiGrid>
        </Hero>

        {exigeBipagemSemPerfil ? (
          <div className="mt-6 rounded-[24px] border border-amber-200 bg-[#fff9eb] p-5">
            <div className="flex items-start gap-3">
              <LockKeyhole
                size={20}
                className="mt-0.5 shrink-0 text-amber-700"
              />

              <div>
                <p className="text-[13px] font-black text-amber-900">
                  A empresa exige bipagem, mas o perfil padrão não possui todas as bipagens liberadas.
                </p>

                <p className="mt-1 text-[12px] leading-5 text-amber-700">
                  Entregadores com exceção individual continuam funcionando, mas novos entregadores herdarão o perfil padrão. Revise as permissões de bipagem abaixo.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <section className="mt-7">
          <div className="mb-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
              Perfis da empresa
            </p>

            <h2 className="mt-1 text-[24px] font-black tracking-[-0.04em]">
              Matriz de segurança
            </h2>

            <p className="mt-1 text-[12px] text-slate-500">
              Administrador, Gestor, Estoque e Financeiro aparecem para auditoria. O Entregador é configurável nesta tela.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {perfisResumo.map(
              (perfil) => {
                const entregador =
                  perfil.codigo ===
                  "ENTREGADOR";

                return (
                  <div
                    key={perfil.id}
                    className={`card-premium rounded-[22px] p-4 ${
                      entregador
                        ? "ring-1 ring-emerald-200"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-[13px] ${
                        entregador
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-50 text-slate-500"
                      }`}>
                        {entregador ? (
                          <SlidersHorizontal
                            size={18}
                          />
                        ) : (
                          <ShieldCheck
                            size={18}
                          />
                        )}
                      </div>

                      <StatusBadge
                        tone={
                          entregador
                            ? "green"
                            : "slate"
                        }
                      >
                        {entregador
                          ? "EDITÁVEL"
                          : "PROTEGIDO"}
                      </StatusBadge>
                    </div>

                    <p className="mt-4 text-[15px] font-black">
                      {perfil.nome}
                    </p>

                    <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                      {perfil.codigo}
                    </p>

                    <div className="mt-4 rounded-[15px] bg-[#f5f8f5] p-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                        Liberadas
                      </p>

                      <p className="mt-1 text-[20px] font-black text-emerald-700">
                        {perfil.liberadas}
                        <span className="text-[11px] text-slate-400">
                          /{perfil.total}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
                Perfil padrão
              </p>

              <h2 className="mt-1 text-[24px] font-black tracking-[-0.04em]">
                Permissões do Entregador
              </h2>

              <p className="mt-1 text-[12px] text-slate-500">
                Estas permissões são herdadas automaticamente por todos os entregadores da empresa.
              </p>
            </div>

            <div className="rounded-full bg-emerald-50 px-4 py-2 text-[11px] font-black text-emerald-700">
              {quantidadeLiberada} ativa(s)
            </div>
          </div>

          <PermissoesEntregadorForm
            empresaNome={
              usuario.empresa.nomeFantasia
            }
            modoControleCarga={
              usuario.configuracao
                .modoControleCarga
            }
            permissoes={permissoesTela}
          />
        </section>

        <section className="mt-9">
          <div className="mb-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
              Exceções individuais
            </p>

            <h2 className="mt-1 text-[24px] font-black tracking-[-0.04em]">
              Entregadores
            </h2>

            <p className="mt-1 text-[12px] text-slate-500">
              HERDAR usa o perfil acima. LIBERAR ou BLOQUEAR afeta somente o colaborador escolhido.
            </p>
          </div>

          {entregadores.length === 0 ? (
            <div className="card-premium rounded-[24px] p-6 text-[13px] font-bold text-slate-400">
              Nenhum entregador ativo nesta empresa.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {entregadores.map(
                (entregador) => {
                  const overrides =
                    overridesPorUsuario.get(
                      entregador.id,
                    ) ?? {
                      liberadas: 0,
                      bloqueadas: 0,
                    };

                  const total =
                    overrides.liberadas +
                    overrides.bloqueadas;

                  return (
                    <Link
                      key={entregador.id}
                      href={`/admin/usuarios/${entregador.id}/permissoes`}
                      className="card-premium group rounded-[24px] p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700">
                            <UserCog
                              size={19}
                            />
                          </div>

                          <div>
                            <p className="text-[15px] font-black">
                              {entregador.nome}
                            </p>

                            <p className="mt-1 text-[11px] text-slate-400">
                              {entregador.email ??
                                "Sem e-mail"}
                            </p>
                          </div>
                        </div>

                        <span className="text-[20px] font-black text-emerald-700 transition group-hover:translate-x-1">
                          →
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <Mini
                          label="Exceções"
                          value={total}
                        />

                        <Mini
                          label="Liberadas"
                          value={overrides.liberadas}
                          green
                        />

                        <Mini
                          label="Bloqueadas"
                          value={overrides.bloqueadas}
                        />
                      </div>
                    </Link>
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

function Mini({
  label,
  value,
  green = false,
}: {
  label: string;
  value: number;
  green?: boolean;
}) {
  return (
    <div className="rounded-[14px] bg-[#f5f8f5] p-3 text-center">
      <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>

      <p className={`mt-1 text-[16px] font-black ${
        green
          ? "text-emerald-700"
          : "text-slate-700"
      }`}>
        {value}
      </p>
    </div>
  );
}
