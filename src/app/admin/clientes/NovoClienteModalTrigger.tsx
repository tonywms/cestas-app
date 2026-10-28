"use client";

import { X, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import NovoClienteForm from "./NovoClienteForm";

export default function NovoClienteModalTrigger() {
  const router = useRouter();

  const [aberto, setAberto] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    if (!aberto) {
      return;
    }

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const fecharComEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAberto(false);
      }
    };

    window.addEventListener("keydown", fecharComEsc);

    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", fecharComEsc);
    };
  }, [aberto]);

  const modal =
    montado && aberto
      ? createPortal(
          <div
            className="fixed inset-0 z-[2147483000] flex items-start justify-center overflow-y-auto bg-[#07150d]/65 p-4 pb-10 pt-8 backdrop-blur-[7px] md:items-center md:py-8"
            role="dialog"
            aria-modal="true"
            aria-label="Cadastrar novo cliente"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setAberto(false);
              }
            }}
          >
            <div className="relative w-full max-w-[780px] overflow-hidden rounded-[30px] border border-white/60 bg-[#f7faf7] shadow-[0_35px_120px_rgba(5,35,18,0.42)]">
              <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-emerald-100 bg-white/95 px-5 py-4 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-emerald-50 text-[#176f3c]">
                    <UserPlus size={20} />
                  </div>

                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                      Comercial
                    </p>
                    <h2 className="mt-0.5 text-[17px] font-black tracking-[-0.03em]">
                      Novo cliente
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  aria-label="Fechar cadastro"
                  className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 active:scale-95"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="p-4 md:p-5">
                <NovoClienteForm
                  onSuccess={() => {
                    setAberto(false);
                    router.refresh();
                  }}
                />
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
        onClick={() => setAberto(true)}
        className="rounded-[14px] bg-[#176f3c] px-4 py-3 text-[9px] font-black text-white shadow-[0_8px_18px_rgba(23,111,60,0.20)] transition hover:bg-[#105f32] active:scale-[0.98]"
      >
        + Novo cliente
      </button>

      {modal}
    </>
  );
}
