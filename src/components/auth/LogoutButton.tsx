"use client";

// CESTAS_V105_5_3_PREMIUM_MODAL: confirmacao de saida em padrao premium, com portal e protecao contra logout acidental.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LogOut, ShieldCheck, X } from "lucide-react";

type LogoutButtonProps = { mobile?: boolean };

export default function LogoutButton({ mobile = false }: LogoutButtonProps) {
  const [confirmar, setConfirmar] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!confirmar) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmar(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirmar]);

  const modal = confirmar && mounted
    ? createPortal(
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-[rgba(6,16,10,0.62)] p-4 backdrop-blur-[6px]"
          role="presentation"
          onClick={() => setConfirmar(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmar-saida-cestas"
            aria-describedby="confirmar-saida-cestas-descricao"
            className="relative w-full max-w-[390px] overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#f4fbf6_100%)] text-slate-900 shadow-[0_36px_110px_rgba(8,44,21,0.30)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#137b3f_0%,#2ab861_100%)]" />
            <button
              type="button"
              onClick={() => setConfirmar(false)}
              aria-label="Fechar confirmacao de saida"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700 active:scale-95"
            >
              <X size={18} strokeWidth={2.2} />
            </button>

            <div className="p-6 pt-7 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[radial-gradient(circle_at_top,#39c36c_0%,#137b3f_100%)] text-white shadow-[0_16px_28px_rgba(19,123,63,0.28)]">
                  <ShieldCheck size={24} strokeWidth={2.1} />
                </div>
                <div className="min-w-0 flex-1 pr-8">
                  <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.24em] text-emerald-700">
                    Ambiente seguro
                  </span>
                  <h2 id="confirmar-saida-cestas" className="mt-3 text-[28px] font-black leading-[1.05] tracking-[-0.03em] text-slate-900">
                    Encerrar sessão?
                  </h2>
                </div>
              </div>

              <p id="confirmar-saida-cestas-descricao" className="mt-4 text-[15px] leading-7 text-slate-600">
                Sua operação será preservada. O sistema só encerrará seu acesso se você confirmar esta ação.
              </p>

              <div className="mt-5 rounded-[22px] border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="font-extrabold uppercase tracking-[0.18em] text-[11px] text-emerald-700">Cestas APP</div>
                <div className="mt-1 text-[13px] leading-6 text-emerald-900/85">Use <strong>Continuar conectado</strong> para voltar imediatamente à operação ou <strong>Sim, sair</strong> para desconectar com segurança.</div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setConfirmar(false)}
                  className="min-h-[56px] rounded-[18px] border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-800 shadow-[0_12px_24px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]"
                >
                  Continuar conectado
                </button>
                <form method="post" action="/auth/signout" className="w-full">
                  <button
                    type="submit"
                    className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(180deg,#ff4d5f_0%,#de1028_100%)] px-4 text-sm font-extrabold text-white shadow-[0_18px_34px_rgba(222,16,40,0.28)] transition hover:brightness-[1.03] active:scale-[0.99]"
                  >
                    <LogOut size={16} strokeWidth={2.3} />
                    <span>Sim, sair</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

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
      {modal}
    </>
  );
}
