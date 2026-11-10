"use client";

// CESTAS_V105_5_2_MODAL_SAIR: dialogo no document.body, fora do hero e dos cards.
// A confirmacao continua obrigatoria antes do POST para /auth/signout.
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LogOut } from "lucide-react";

type LogoutButtonProps = { mobile?: boolean };

export default function LogoutButton({ mobile = false }: LogoutButtonProps) {
  const [confirmar, setConfirmar] = useState(false);
  const tituloId = useId();
  const descricaoId = useId();
  const botaoSairRef = useRef<HTMLButtonElement>(null);
  const botaoCancelarRef = useRef<HTMLButtonElement>(null);
  const botaoConfirmarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirmar) return;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    botaoCancelarRef.current?.focus();

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        setConfirmar(false);
        return;
      }
      if (evento.key !== "Tab") return;
      const primeiro = botaoCancelarRef.current;
      const ultimo = botaoConfirmarRef.current;
      if (!primeiro || !ultimo) return;
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
      botaoSairRef.current?.focus();
    };
  }, [confirmar]);

  return (
    <>
      <button
        ref={botaoSairRef}
        type="button"
        onClick={() => setConfirmar(true)}
        title="Sair da conta"
        aria-label="Sair da conta"
        aria-haspopup="dialog"
        className={mobile
          ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-white/10 bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
          : "flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-red-50 text-red-600 transition hover:bg-red-100 active:scale-95"}
      >
        <LogOut size={18} strokeWidth={2.2} />
      </button>
      {confirmar && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-black/60 p-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={tituloId}
            aria-describedby={descricaoId}
            className="w-full max-w-sm rounded-[24px] bg-white p-6 text-slate-900 shadow-2xl"
          >
            <h2 id={tituloId} className="text-lg font-black">Encerrar sua sessão?</h2>
            <p id={descricaoId} className="mt-2 text-sm leading-6 text-slate-600">
              Você só será desconectado se confirmar esta ação.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                ref={botaoCancelarRef}
                type="button"
                onClick={() => setConfirmar(false)}
                className="min-h-12 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-800"
              >
                Continuar conectado
              </button>
              <form method="post" action="/auth/signout" className="w-full">
                <button
                  ref={botaoConfirmarRef}
                  type="submit"
                  className="min-h-12 w-full rounded-xl bg-red-600 px-3 text-xs font-bold text-white"
                >
                  Sim, sair
                </button>
              </form>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
