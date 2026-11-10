"use client";

// V102_1_OFFLINE_SEM_LOGOUT: em falha do Supabase, nunca confundir indisponibilidade com logout.
// Nenhum dado pessoal/operacional e persistido ou exibido neste fallback.
import { useEffect, useState } from "react";

export default function MobileError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const atualizar = () => setOnline(navigator.onLine);
    atualizar();
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    // Mensagem generica para o usuario; diagnostico fica somente no console local.
    console.error("Mobile temporariamente indisponivel:", error.message);
    return () => {
      window.removeEventListener("online", atualizar);
      window.removeEventListener("offline", atualizar);
    };
  }, [error]);

  return (
    <main className="min-h-dvh bg-[#eaf2ec] px-4 py-6 text-[#142018]">
      <section className="mx-auto flex min-h-[80dvh] w-full max-w-[480px] flex-col justify-center rounded-[26px] bg-white p-6 shadow-[0_18px_45px_rgba(17,63,33,0.07)]">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[18px] bg-amber-50 text-amber-700" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a14.5 14.5 0 0 1 20 0"/><path d="M5 12a10 10 0 0 1 14 0"/><path d="M8.5 15.5a5 5 0 0 1 7 0"/><path d="m2 2 20 20"/></svg>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#178047]">Cestas APP · Estoque móvel</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">{online ? "Serviço temporariamente indisponível" : "Você está sem conexão"}</h1>
        <p role="status" aria-live="polite" className="mt-3 text-sm leading-6 text-slate-600">
          {online
            ? "Não foi possível consultar os dados com segurança. Sua sessão não foi encerrada por esta tela."
            : "A conexão caiu. Não é possível atualizar cargas ou realizar operações enquanto estiver offline."}
        </p>
        <div className="mt-5 rounded-[16px] border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
          Nenhuma movimentação de estoque foi realizada. Quando a conexão voltar, você poderá tentar novamente.
        </div>
        <button type="button" onClick={() => { if (navigator.onLine) reset(); }} disabled={!online}
          className="mt-6 min-h-12 w-full rounded-[14px] bg-[#116b38] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">
          {online ? "Tentar novamente" : "Aguardando conexão"}
        </button>
      </section>
    </main>
  );
}
