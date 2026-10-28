export const instant = false;

import Link from "next/link";

import {
  Boxes,
  PackageCheck,
  ScanLine,
  Settings2,
  ShieldCheck,
  UsersRound,
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

import ConfiguracoesEmpresaForm from "./ConfiguracoesEmpresaForm";

export default async function ConfiguracoesEmpresaPage() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const podeConfigurar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.EMPRESA_CONFIGURAR,
    );

  if (!podeConfigurar) {
    redirect("/admin");
  }

  const modoVolume =
    usuario.configuracao
      .modoControleCarga ===
    "VOLUME";

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto max-w-[1100px]">
        <ModuleHeader
          eyebrow="Empresa"
          title="Configurações operacionais"
        />

        <Hero
          eyebrow="Operação por fornecedor"
          title={`Como ${usuario.empresa.nomeFantasia} trabalha.`}
          description="Estas regras são isoladas por empresa e alteram diretamente carga, entrega, bipagem, recebimentos e ocorrências do aplicativo."
        >
          <KpiGrid>
            <Kpi
              label="Controle da carga"
              value={
                usuario.configuracao
                  .modoControleCarga
              }
              highlight={
                modoVolume
              }
            />

            <Kpi
              label="Bipagem na carga"
              value={
                usuario.configuracao
                  .exigirBipagemCarga
                  ? "Obrigatória"
                  : "Não exigida"
              }
            />

            <Kpi
              label="Bipagem na entrega"
              value={
                usuario.configuracao
                  .exigirBipagemEntrega
                  ? "Obrigatória"
                  : "Não exigida"
              }
            />

            <Kpi
              label="Recebimento mobile"
              value={
                usuario.configuracao
                  .permitirPagamentoMobile
                  ? "Ativo"
                  : "Desativado"
              }
            />

            <Kpi
              label="Ocorrência mobile"
              value={
                usuario.configuracao
                  .permitirOcorrenciaMobile
                  ? "Ativa"
                  : "Desativada"
              }
            />
          </KpiGrid>
        </Hero>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Atalho
            href="/admin/cestas"
            icon={
              <PackageCheck
                size={20}
              />
            }
            titulo="Tipos de cesta"
            texto="Catálogo, preço e disponibilidade."
          />

          <Atalho
            href="/admin/estoque"
            icon={
              <Boxes
                size={20}
              />
            }
            titulo="Estoque"
            texto="Saldo central e movimentações."
          />

          {modoVolume ? (
            <Atalho
              href="/admin/volumes"
              icon={
                <ScanLine
                  size={20}
                />
              }
              titulo="Volumes / QR"
              texto="Rastreabilidade individual."
            />
          ) : (
            <Atalho
              href="/admin/cargas"
              icon={
                <ScanLine
                  size={20}
                />
              }
              titulo="Cargas"
              texto="Operação por quantidade."
            />
          )}

          <Atalho
            href="/admin/permissoes"
            icon={
              <UsersRound
                size={20}
              />
            }
            titulo="Permissões"
            texto="O que o entregador pode fazer."
          />
        </section>

        <section className="mt-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="icon-emerald flex h-11 w-11 items-center justify-center rounded-[15px]">
              <Settings2
                size={20}
              />
            </div>

            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
                Regras da empresa
              </p>

              <h2 className="mt-1 text-[22px] font-black tracking-[-0.035em]">
                Comportamento operacional
              </h2>

              <p className="mt-1 text-[12px] text-slate-500">
                Alterações aqui afetam somente {usuario.empresa.nomeFantasia}.
              </p>
            </div>
          </div>

          <ConfiguracoesEmpresaForm
            empresaNome={
              usuario.empresa
                .nomeFantasia
            }
            configuracao={
              usuario.configuracao
            }
          />
        </section>

        <div className="mt-6 flex items-start gap-3 rounded-[22px] border border-emerald-100 bg-white/80 p-4 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700">
            <ShieldCheck
              size={20}
            />
          </div>

          <div>
            <p className="text-[13px] font-extrabold">
              Configuração isolada por empresa
            </p>

            <p className="mt-1 text-[12px] leading-5 text-slate-500">
              Nenhuma alteração desta tela é compartilhada com outro fornecedor cadastrado no Cestas APP.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Atalho({
  href,
  icon,
  titulo,
  texto,
}: {
  href: string;
  icon:
    React.ReactNode;
  titulo: string;
  texto: string;
}) {
  return (
    <Link
      href={
        href
      }
      className="card-premium group rounded-[22px] p-4"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700">
        {
          icon
        }
      </div>

      <p className="mt-4 text-[14px] font-black">
        {
          titulo
        }
      </p>

      <p className="mt-1 text-[11px] leading-5 text-slate-500">
        {
          texto
        }
      </p>

      <p className="mt-3 text-[11px] font-black text-emerald-700 transition group-hover:translate-x-1">
        Abrir →
      </p>
    </Link>
  );
}
