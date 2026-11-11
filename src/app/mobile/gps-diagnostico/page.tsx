export const instant = false;

import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LocateFixed } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import TestarGpsV120 from "@/components/mobile/TestarGpsV120";

export default async function GpsDiagnosticoPage() {
  const usuario = await getCurrentUserProfile();
  if (!usuario || !usuario.ativo) redirect("/");
  return (
    <main className="app-premium min-h-dvh text-[#142018]">
      <div className="relative mx-auto min-h-dvh w-full max-w-[480px] overflow-hidden bg-[#f7faf7]/90 pb-16 shadow-[0_0_60px_rgba(17,63,33,0.12)]">
        <header className="hero-premium grain relative overflow-hidden px-5 pb-24 pt-5 text-white">
          <div className="relative z-10 flex items-center justify-between gap-2">
            <div className="relative h-[70px] w-[185px] shrink-0">
              <Image src="/branding/cestas-app-logo-header.svg" alt="Cestas APP" fill priority unoptimized sizes="185px" className="object-contain object-left"/>
            </div>
            <Link href="/mobile" aria-label="Voltar para início" className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/10"><ArrowLeft size={20}/></Link>
          </div>
          <p className="relative z-10 mt-3 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">Diagnóstico local · V120.1.2</p>
          <h1 className="relative z-10 mt-2 flex items-center gap-2 text-[25px] font-black tracking-[-0.04em]"><LocateFixed size={22}/> GPS do coletor</h1>
          <p className="relative z-10 mt-2 text-xs leading-5 text-white/70">Verificação independente de vendas e entregas.</p>
        </header>
        <div className="relative -mt-14 space-y-4 px-5"><TestarGpsV120/>
          <Link href="/mobile/localizacoes" className="flex min-h-12 items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 text-xs font-black text-emerald-800">Meus pontos registrados</Link>
          <Link href="/mobile" className="flex min-h-12 items-center justify-center rounded-xl bg-emerald-800 px-4 text-xs font-black text-white">Voltar ao início</Link>
        </div>
      </div>
    </main>
  );
}
