export const instant = false;

import {
  ArrowLeft,
  LockKeyhole,
  ShieldAlert,
} from "lucide-react";

import Link from "next/link";

export default function SemAcessoPage() {
  return (
    <main className="min-h-screen bg-[#edf5ef] px-4 py-6 text-[#132018]">
      <div className="mx-auto max-w-[480px]">

        <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(145deg,#176f3c,#0c552e)] p-7 text-white shadow-[0_24px_60px_rgba(15,85,45,0.20)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-[19px] bg-white/10">
            <ShieldAlert size={27} />
          </div>

          <p className="mt-6 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
            Controle de acesso
          </p>

          <h1 className="mt-2 text-[29px] font-black leading-[1.05] tracking-[-0.05em]">
            Função não autorizada.
          </h1>

          <p className="mt-4 text-[12px] leading-6 text-white/65">
            Seu perfil ou uma regra individual não permite
            acessar esta função.
          </p>
        </section>

        <section className="mt-5 rounded-[28px] border border-black/[0.04] bg-white p-7 text-center shadow-[0_16px_45px_rgba(17,63,33,0.06)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <LockKeyhole size={28} />
          </div>

          <h2 className="mt-5 text-lg font-black">
            Acesso bloqueado
          </h2>

          <p className="mx-auto mt-2 max-w-[320px] text-[11px] leading-5 text-slate-400">
            Caso precise utilizar esta função, solicite
            ao administrador da empresa a liberação da
            permissão correspondente.
          </p>

          <Link
            href="/mobile"
            className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#176f3c] text-xs font-black text-white shadow-[0_12px_28px_rgba(23,111,60,0.18)]"
          >
            <ArrowLeft size={17} />

            Voltar para o início
          </Link>
        </section>

      </div>
    </main>
  );
}