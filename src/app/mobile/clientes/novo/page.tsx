export const instant = false;

import {
  ArrowLeft,
  UserPlus,
} from "lucide-react";

import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  getCurrentUserProfile,
} from "@/lib/auth/get-current-user";

import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";

import NovoClienteMobileForm from "./NovoClienteMobileForm";

export default async function NovoClienteMobilePage() {
  const usuario =
    await getCurrentUserProfile();

  if (
    !usuario ||
    !usuario.ativo
  ) {
    redirect("/");
  }

  const permitido =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CLIENTE_MOBILE_CADASTRAR,
    );

  if (!permitido) {
    redirect(
      "/mobile/sem-acesso",
    );
  }

  return (
    <main className="app-premium min-h-dvh text-[#142018]">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f7faf7]/95 pb-10 shadow-[0_0_60px_rgba(17,63,33,0.12)]">
        <header className="hero-premium grain relative overflow-hidden px-5 pb-8 pt-5 text-white">
          <div className="relative z-10 flex items-center justify-between">
            <Link
              href="/mobile/clientes"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/10"
            >
              <ArrowLeft
                size={19}
              />
            </Link>

            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
                Cadastro em campo
              </p>

              <h1 className="mt-1 text-lg font-black">
                Novo cliente
              </h1>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/10">
              <UserPlus
                size={19}
              />
            </div>
          </div>

          <div className="relative z-10 mt-7">
            <h2 className="text-[29px] font-black tracking-[-0.05em]">
              Encontrou um cliente?
            </h2>

            <p className="mt-3 text-[11px] leading-5 text-white/65">
              Cadastre agora e ele já ficará disponível para venda, gestão, histórico e próximas visitas.
            </p>
          </div>
        </header>

        <section className="px-5 py-5">
          <NovoClienteMobileForm />
        </section>
      </div>
    </main>
  );
}
