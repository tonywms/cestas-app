"use client";

// CESTAS_V105_5_1_SESSAO: impedir logout involuntario por toque acidental.
import { useState } from "react";
import { LogOut } from "lucide-react";

type LogoutButtonProps = { mobile?: boolean };

export default function LogoutButton({ mobile = false }: LogoutButtonProps) {
  const [confirmar, setConfirmar] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmar(true)}
        title="Sair da conta"
        aria-label="Sair da conta"
        className={mobile
          ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-white/10 bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
          : "flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-red-50 text-red-600 transition hover:bg-red-100 active:scale-95"}
      >
        <LogOut size={18} strokeWidth={2.2} />
      </button>
      {confirmar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="confirmar-saida-cestas" className="w-full max-w-sm rounded-[24px] bg-white p-6 text-slate-900 shadow-2xl">
            <h2 id="confirmar-saida-cestas" className="text-lg font-black">Encerrar sua sessao?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Voce so sera desconectado se confirmar esta acao.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" autoFocus onClick={() => setConfirmar(false)} className="min-h-12 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-800">Continuar conectado</button>
              <form method="post" action="/auth/signout" className="w-full">
                <button type="submit" className="min-h-12 w-full rounded-xl bg-red-600 px-3 text-xs font-bold text-white">Sim, sair</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
