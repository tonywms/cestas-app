export const instant = false;

import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import {
  ArrowLeft,
} from "lucide-react";

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

import NovoEntregadorForm from "./NovoEntregadorForm";

export default async function NovoEntregadorPage() {
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
    );

  if (
    !podeGerenciar
  ) {
    redirect(
      "/admin",
    );
  }

  const supabase =
    await createClient();

  const [
    empresaResult,
    membrosResult,
  ] =
    await Promise.all([
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

      supabase
        .from(
          "empresa_usuarios",
        )
        .select(
          "usuario_id",
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
        .eq(
          "ativo",
          true,
        ),
    ]);

  const limiteUsuarios =
    Number(
      empresaResult.data
        ?.limite_usuarios ??
        10,
    );

  const usuariosAtivos =
    membrosResult.count ??
    0;

  const disponiveis =
    Math.max(
      0,
      limiteUsuarios -
        usuariosAtivos,
    );

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto max-w-[980px]">
        <ModuleHeader
          eyebrow="Equipe"
          title="Novo colaborador"
          actions={
            <Link
              href="/admin/usuarios"
              className="flex items-center gap-2 rounded-[14px] border border-emerald-100 bg-white px-4 py-3 text-[12px] font-extrabold text-emerald-800"
            >
              <ArrowLeft
                size={16}
              />
              Voltar
            </Link>
          }
        />

        <Hero
          eyebrow="Gestão de acessos"
          title="Cadastre a pessoa certa no perfil certo."
          description="Entregadores trabalham na operação mobile. Financeiro acessa os módulos administrativos de cobrança e crédito."
        >
          <KpiGrid>
            <Kpi
              label="Usuários ativos"
              value={
                usuariosAtivos
              }
            />

            <Kpi
              label="Limite contratado"
              value={
                limiteUsuarios
              }
            />

            <Kpi
              label="Disponíveis"
              value={
                disponiveis
              }
              warning={
                disponiveis ===
                0
              }
              highlight={
                disponiveis >
                0
              }
            />
          </KpiGrid>
        </Hero>

        <div className="mt-6">
          <NovoEntregadorForm
            empresaNome={
              usuario.empresa
                .nomeFantasia
            }
            usuariosAtivos={
              usuariosAtivos
            }
            limiteUsuarios={
              limiteUsuarios
            }
          />
        </div>
      </div>
    </main>
  );
}
