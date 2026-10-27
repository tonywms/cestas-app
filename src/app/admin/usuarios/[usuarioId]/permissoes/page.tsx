export const instant = false;

import {
  ArrowLeft,
  Building2,
  KeyRound,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

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
  params: Promise<{
    usuarioId: string;
  }>;
}) {
  const {
    usuarioId,
  } = await params;

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
  } = await supabase
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
      .from(
        "perfil_permissoes",
      )
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
      .from(
        "usuario_permissoes",
      )
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
      perfilPermissoesResult.data ??
      []
  ) {
    perfilMap.set(
      item.permissao_id,
      item.permitido,
    );
  }

  const overrideMap =
    new Map<string, boolean>();

  for (
    const item of
      usuarioPermissoesResult.data ??
      []
  ) {
    overrideMap.set(
      item.permissao_id,
      item.permitido,
    );
  }

  const permissoes:
    PermissaoUsuarioTela[] =
    catalogo.map(
      (permissao) => {
        let bloqueado =
          PROIBIDAS.has(
            permissao.codigo,
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
          bloqueado = true;
          motivo =
            "Empresa opera por QUANTIDADE.";
        }

        if (
          !atual.configuracao
            .permitirPagamentoMobile &&
          permissao.codigo ===
            PERMISSOES.PAGAMENTO_REGISTRAR
        ) {
          bloqueado = true;
          motivo =
            "Pagamento mobile desativado pela empresa.";
        }

        if (
          !atual.configuracao
            .permitirOcorrenciaMobile &&
          permissao.codigo ===
            PERMISSOES.OCORRENCIA_REGISTRAR
        ) {
          bloqueado = true;
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
            permissao.id,
          )
        ) {
          override =
            overrideMap.get(
              permissao.id,
            )
              ? "LIBERAR"
              : "BLOQUEAR";
        }

        return {
          id: permissao.id,
          codigo:
            permissao.codigo,
          nome:
            permissao.nome,
          modulo:
            permissao.modulo,

          perfilPermitido:
            perfilMap.get(
              permissao.id,
            ) ?? false,

          override,

          bloqueado,
          motivoBloqueio:
            motivo,
        };
      },
    );

  return (
    <main className="min-h-screen bg-[#f3f7f4] px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-[1080px]">

        <header className="flex items-center justify-between rounded-[26px] bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/usuarios"
              className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">
                Cestas APP
              </p>

              <h1 className="text-base font-black">
                Permissão individual
              </h1>
            </div>
          </div>

          <Building2
            size={20}
            className="text-emerald-700"
          />
        </header>

        <section className="mt-5 rounded-[30px] bg-[linear-gradient(135deg,#176f3c,#0d5a30)] p-7 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[19px] bg-white/10">
              <UserRound
                size={26}
              />
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200">
                Entregador
              </p>

              <h2 className="mt-1 text-2xl font-black">
                {
                  colaborador.nome
                }
              </h2>

              <p className="mt-1 text-xs text-white/60">
                {
                  colaborador.email ??
                  "Sem e-mail"
                }
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 rounded-[18px] bg-white/[0.08] px-4 py-3 text-[10px] text-white/70">
            <KeyRound
              size={15}
            />

            HERDAR usa o padrão do perfil. LIBERAR ou BLOQUEAR cria uma exceção somente para este colaborador.
          </div>
        </section>

        <div className="mt-5">
          <PermissoesUsuarioForm
            usuarioId={
              usuarioId
            }
            usuarioNome={
              colaborador.nome
            }
            permissoes={
              permissoes
            }
          />
        </div>
      </div>
    </main>
  );
}