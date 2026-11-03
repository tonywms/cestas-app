export const instant = false;

import {
  ArrowLeft,
  FileSpreadsheet,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";

import ImportarClientesClient from "./ImportarClientesClient";

export default async function ImportarClientesPage() {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const podeGerenciar =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo === "ADMINISTRADOR" ||
    usuario.perfilCodigo === "GESTOR";

  if (!podeGerenciar) {
    redirect("/admin/clientes");
  }

  return (
    <main className="app-premium min-h-screen px-4 py-6 text-[#142018] md:px-6 md:py-8">
      <div className="mx-auto w-full">
        <header className="glass flex items-center justify-between gap-4 rounded-[28px] px-5 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/clientes"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-[#176f3c]"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#b07a12]">
                Comercial
              </p>
              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Importar clientes
              </h1>
            </div>
          </div>

          <span className="hidden items-center gap-2 rounded-full bg-emerald-50 px-4 py-2.5 text-[9px] font-black text-[#176f3c] md:flex">
            <ShieldCheck size={14} />
            Ambiente da empresa
          </span>
        </header>

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[32px] px-6 py-7 text-white">
          <div className="relative z-10 max-w-[720px]">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
              <FileSpreadsheet size={15} />
              Integração via Excel
            </div>

            <h2 className="mt-3 text-[30px] font-black tracking-[-0.05em]">
              Traga a carteira do ERP.
            </h2>

            <p className="mt-3 max-w-[680px] text-[11px] leading-6 text-white/70">
              Analise a planilha antes de gravar. Campos obrigatórios ausentes, código de referência repetido, CPF/CNPJ duplicado e dados inválidos são apontados linha a linha.
            </p>
          </div>
        </section>

        <ImportarClientesClient />
      </div>
    </main>
  );
}

