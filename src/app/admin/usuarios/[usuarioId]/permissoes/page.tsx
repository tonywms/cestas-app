export const instant = false;

import {
  KeyRound,
  ShieldCheck,
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

import PermissoesUsuarioForm, {
  type PermissaoUsuarioTela,
} from "./PermissoesUsuarioForm";

const PROIBIDAS =
  new Set<string>([
    PERMISSOES.EMPRESA_CONFIGURAR,
    PERMISSOES.PERMISSOES_GERENCIAR,
    PERMISSOES.USUARIOS_GERENCIAR,
  ]);

export default async function PermissoesUsuarioPage({
  params,
}: {
  params:
    Promise<{
      usuarioId: string;
    }>;
}) {
  const {
    usuarioId,
  } =
    await params;

  const atual =
    await getCurrentUserProfile();

  if (!atual) {
    redirect("/");
  }

  const podeGerenciar =
    atual.isPlatformAdmin ||
    temPermissao(
      atual.permissoes,
      PERMISSOES.PERMISSOES_GERENCIAR,
    );

  if (!podeGerenciar) {
    redirect("/admin");
  }

  const supabase =
    await createClient();

  const {
    data: vinculo,
  } =
    await supabase
      .from("empresa_usuarios")
      .select(`
        usuario_id,
        perfil_id,
        usuarios!inner (
          id,
          nome,
          email
        ),
        perfis!inner (
          id,
          codigo,
          nome
        )
      `)
      .eq(
        "empresa_id",
        atual.empresa.id,
      )
      .eq(
        "usuario_id",
        usuarioId,
      )
      .eq(
        "ativo",
        true,
      )
      .maybeSingle();

  if (!vinculo) {
    redirect(
      "/admin/usuarios",
    );
  }

  const usuarioRaw =
    vinculo.usuarios;

  const perfilRaw =
    vinculo.perfis;

  const colaborador =
    Array.isArray(usuarioRaw)
      ? usuarioRaw[0]
      : usuarioRaw;

  const perfil =
    Array.isArray(perfilRaw)
      ? perfilRaw[0]
      : perfilRaw;

  if (
    !colaborador ||
    !perfil ||
    perfil.codigo !==
      "ENTREGADOR"
  ) {
    redirect(
      "/admin/usuarios",
    );
  }

  const [
    catalogoResult,
    perfilPermissoesResult,
    usuarioPermissoesResult,
  ] = await Promise.all([
    supabase
      .from("permissoes")
      .select(`
        id,
        codigo,
        nome,
        modulo
      `)
      .eq("ativo", true)
      .order("modulo")
      .order("nome"),

    supabase
      .from("perfil_permissoes")
      .select(`
        permissao_id,
        permitido
      `)
      .eq(
        "empresa_id",
        atual.empresa.id,
      )
      .eq(
        "perfil_id",
        perfil.id,
      ),

    supabase
      .from("usuario_permissoes")
      .select(`
        permissao_id,
        permitido
      `)
      .eq(
        "empresa_id",
        atual.empresa.id,
      )
      .eq(
        "usuario_id",
        usuarioId,
      ),
  ]);

  const catalogo =
    catalogoResult.data ?? [];

  const perfilMap =
    new Map<string, boolean>();

  for (
    const item of
      perfilPermissoesResult.data ?? []
  ) {
    perfilMap.set(
      String(item.permissao_id),
      Boolean(item.permitido),
    );
  }

  const overrideMap =
    new Map<string, boolean>();

  for (
    const item of
      usuarioPermissoesResult.data ?? []
  ) {
    overrideMap.set(
      String(item.permissao_id),
      Boolean(item.permitido),
    );
  }

  const permissoes:
    PermissaoUsuarioTela[] =
    catalogo.map(
      (permissao) => {
        let bloqueado =
          PROIBIDAS.has(
            String(permissao.codigo),
          );

        let motivo:
          string | null =
          bloqueado
            ? "Função reservada aos perfis administrativos."
            : null;

        if (
          atual.configuracao
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

          motivo =
            "Empresa opera por QUANTIDADE.";
        }

        if (
          !atual.configuracao
            .permitirPagamentoMobile &&
          permissao.codigo ===
            PERMISSOES.PAGAMENTO_REGISTRAR
        ) {
          bloqueado =
            true;

          motivo =
            "Pagamento mobile desativado pela empresa.";
        }

        if (
          !atual.configuracao
            .permitirOcorrenciaMobile &&
          permissao.codigo ===
            PERMISSOES.OCORRENCIA_REGISTRAR
        ) {
          bloqueado =
            true;

          motivo =
            "Ocorrências mobile desativadas pela empresa.";
        }

        let override:
          | "HERDAR"
          | "LIBERAR"
          | "BLOQUEAR" =
          "HERDAR";

        if (
          overrideMap.has(
            String(permissao.id),
          )
        ) {
          override =
            overrideMap.get(
              String(permissao.id),
            )
              ? "LIBERAR"
              : "BLOQUEAR";
        }

        return {
          id:
            String(permissao.id),
          codigo:
            String(permissao.codigo),
          nome:
            String(permissao.nome),
          modulo:
            String(permissao.modulo),
          perfilPermitido:
            perfilMap.get(
              String(permissao.id),
            ) ?? false,
          override,
          bloqueado,
          motivoBloqueio:
            motivo,
        };
      },
    );

  const perfilLiberadas =
    permissoes.filter(
      (item) =>
        item.perfilPermitido,
    ).length;

  const overrides =
    permissoes.filter(
      (item) =>
        item.override !==
        "HERDAR",
    );

  const liberadas =
    overrides.filter(
      (item) =>
        item.override ===
        "LIBERAR",
    ).length;

  const bloqueadas =
    overrides.filter(
      (item) =>
        item.override ===
        "BLOQUEAR",
    ).length;

  const efetivas =
    permissoes.filter(
      (item) => {
        if (item.bloqueado) {
          return false;
        }

        if (
          item.override ===
          "LIBERAR"
        ) {
          return true;
        }

        if (
          item.override ===
          "BLOQUEAR"
        ) {
          return false;
        }

        return item.perfilPermitido;
      },
    ).length;

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto max-w-[1080px]">
        <ModuleHeader
          eyebrow="Segurança"
          title="Permissão individual"
          backHref="/admin/permissoes"
        />

        <Hero
          eyebrow="Entregador"
          title={String(
            colaborador.nome,
          )}
          description={`As exceções abaixo valem somente para este colaborador. Sem exceção, ele herda o perfil ENTREGADOR da ${atual.empresa.nomeFantasia}.`}
        >
          <KpiGrid>
            <Kpi
              label="Perfil liberadas"
              value={perfilLiberadas}
            />

            <Kpi
              label="Exceções"
              value={overrides.length}
              warning={
                overrides.length > 0
              }
            />

            <Kpi
              label="Liberações individuais"
              value={liberadas}
              highlight={
                liberadas > 0
              }
            />

            <Kpi
              label="Bloqueios individuais"
              value={bloqueadas}
            />

            <Kpi
              label="Efetivas agora"
              value={efetivas}
            />
          </KpiGrid>
        </Hero>

        <section className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="card-premium rounded-[22px] p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700">
                <UserCog
                  size={19}
                />
              </div>

              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                  Colaborador
                </p>

                <p className="mt-1 text-[15px] font-black">
                  {colaborador.nome}
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                  {colaborador.email ??
                    "Sem e-mail"}
                </p>
              </div>
            </div>
          </div>

          <div className="card-premium rounded-[22px] p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#fff7e3] text-[#a66a08]">
                <KeyRound
                  size={19}
                />
              </div>

              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                  Como funciona
                </p>

                <p className="mt-1 text-[13px] font-black">
                  HERDAR → LIBERAR → BLOQUEAR
                </p>

                <p className="mt-1 text-[11px] leading-5 text-slate-400">
                  HERDAR usa o perfil padrão. LIBERAR e BLOQUEAR criam exceção individual.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6">
          <PermissoesUsuarioForm
            usuarioId={usuarioId}
            usuarioNome={String(
              colaborador.nome,
            )}
            permissoes={permissoes}
          />
        </div>

        <div className="mt-6 rounded-[22px] border border-emerald-100 bg-white/80 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck
              size={19}
              className="mt-0.5 shrink-0 text-emerald-700"
            />

            <p className="text-[12px] leading-5 text-slate-500">
              Uma exceção individual nunca pode liberar Configuração da Empresa, Gestão de Permissões ou Gestão de Usuários para um entregador.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
