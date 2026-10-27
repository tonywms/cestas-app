export const instant = false;

import {
  ArrowLeft,
  Building2,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
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

  return (
    <main className="min-h-screen bg-[#f3f7f4] px-4 py-6 text-[#142019] md:px-6 md:py-8">
      <div className="mx-auto max-w-[1080px]">

        <div className="flex items-center justify-between gap-4 rounded-[26px] border border-black/[0.04] bg-white px-5 py-4 shadow-[0_12px_40px_rgba(17,63,33,0.05)]">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#edf7f0] text-[#14743d] transition hover:bg-[#dff1e5]"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#1b7b46]">
                Cestas APP
              </p>

              <h1 className="mt-0.5 text-base font-black tracking-[-0.025em]">
                Configurações da empresa
              </h1>
            </div>
          </div>

          <div className="hidden items-center gap-3 rounded-full bg-[#f2f8f4] px-4 py-2.5 md:flex">
            <Building2
              size={17}
              className="text-[#14743d]"
            />

            <div>
              <p className="max-w-[250px] truncate text-[11px] font-black">
                {
                  usuario.empresa
                    .nomeFantasia
                }
              </p>

              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {usuario.perfilNome}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#176f3c_0%,#0d5a30_100%)] p-6 text-white shadow-[0_22px_55px_rgba(17,86,46,0.17)] md:p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
                <Settings2 size={14} />

                Operação por fornecedor
              </div>

              <h2 className="mt-4 max-w-2xl text-[28px] font-black leading-[1.05] tracking-[-0.05em] md:text-[34px]">
                Defina como{" "}
                {
                  usuario.empresa
                    .nomeFantasia
                }{" "}
                trabalha.
              </h2>

              <p className="mt-3 max-w-2xl text-[12px] leading-6 text-white/65">
                As configurações desta tela são isoladas
                por empresa e determinam comportamentos
                do aplicativo dos entregadores.
              </p>
            </div>

            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-white/10 md:flex">
              <ShieldCheck size={27} />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <StatusTag
              titulo="Empresa"
              valor={
                usuario.empresa.codigo
              }
            />

            <StatusTag
              titulo="Carga"
              valor={
                usuario.configuracao
                  .modoControleCarga
              }
            />

            <StatusTag
              titulo="Status"
              valor={
                usuario.empresa.status
              }
            />
          </div>
        </div>

        <div className="mt-5">
          <ConfiguracoesEmpresaForm
            empresaNome={
              usuario.empresa
                .nomeFantasia
            }
            configuracao={
              usuario.configuracao
            }
          />
        </div>
      </div>
    </main>
  );
}

function StatusTag({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 backdrop-blur">
      <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-white/45">
        {titulo}
      </span>

      <span className="ml-2 text-[10px] font-black uppercase">
        {valor}
      </span>
    </div>
  );
}