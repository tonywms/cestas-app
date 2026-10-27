export const instant = false;

import {
  ArrowLeft,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";

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

  if (!podeGerenciar) {
    redirect("/admin");
  }

  return (
    <main className="min-h-screen bg-[#f3f7f4] px-4 py-6 text-[#142019] md:px-6 md:py-8">
      <div className="mx-auto max-w-[900px]">

        <header className="flex items-center gap-4 rounded-[26px] bg-white px-5 py-4 shadow-sm">
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
              Novo colaborador
            </h1>
          </div>
        </header>

        <section className="mt-5 rounded-[32px] bg-[linear-gradient(135deg,#176f3c,#0d5a30)] p-7 text-white shadow-[0_22px_55px_rgba(17,86,46,0.17)]">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
                <UserPlus size={15} />

                Gestão de equipe
              </div>

              <h2 className="mt-4 text-[30px] font-black leading-[1.05] tracking-[-0.05em]">
                Cadastrar entregador.
              </h2>

              <p className="mt-3 max-w-xl text-xs leading-6 text-white/65">
                O colaborador será criado no
                Supabase Auth e vinculado
                exclusivamente à{" "}
                <strong>
                  {usuario.empresa.nomeFantasia}
                </strong>
                .
              </p>
            </div>

            <div className="hidden h-14 w-14 items-center justify-center rounded-[18px] bg-white/10 md:flex">
              <ShieldCheck size={27} />
            </div>
          </div>
        </section>

        <div className="mt-5">
          <NovoEntregadorForm
            empresaNome={
              usuario.empresa.nomeFantasia
            }
          />
        </div>
      </div>
    </main>
  );
}