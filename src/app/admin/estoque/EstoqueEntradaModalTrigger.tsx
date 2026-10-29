"use client";

import {
  PackagePlus,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";

import EstoqueMovimentoForm from "./EstoqueMovimentoForm";

type TipoEstoque = {
  id: number;
  codigo: string;
  nome: string;
  saldo: number;
  estoqueMinimo: number;
};

export default function EstoqueEntradaModalTrigger({
  tipos,
  podeAjustar,
}: {
  tipos: TipoEstoque[];
  podeAjustar: boolean;
}) {
  const router = useRouter();

  const [
    aberto,
    setAberto,
  ] = useState(false);

  const [
    montado,
    setMontado,
  ] = useState(false);

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    if (!aberto) {
      return;
    }

    const overflowAnterior =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function fecharNoEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setAberto(false);
      }
    }

    window.addEventListener(
      "keydown",
      fecharNoEscape,
    );

    return () => {
      document.body.style.overflow =
        overflowAnterior;

      window.removeEventListener(
        "keydown",
        fecharNoEscape,
      );
    };
  }, [aberto]);

  function concluir() {
    setAberto(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setAberto(true)
        }
        className="inline-flex h-11 items-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#1f8a4b,#0c4d27)] px-5 text-[13px] font-extrabold text-white shadow-[0_14px_26px_-12px_rgba(17,92,48,0.7)] transition hover:-translate-y-0.5"
      >
        <PackagePlus
          size={16}
        />
        Entrada de estoque
      </button>

      {montado &&
        aberto &&
        createPortal(
          <div
            className="fixed inset-0 z-[900] flex items-center justify-center overflow-y-auto bg-[#07150d]/55 p-4 backdrop-blur-[7px]"
            onMouseDown={(
              event,
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setAberto(false);
              }
            }}
          >
            <section className="my-auto w-full max-w-[620px] overflow-hidden rounded-[32px] border border-white/80 bg-[#f8fbf8] shadow-[0_35px_110px_rgba(8,48,25,0.34)]">
              <header className="relative overflow-hidden bg-[linear-gradient(135deg,#17723d_0%,#0b4e29_100%)] px-6 py-6 text-white">
                <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full border-[24px] border-white/[0.05]" />

                <div className="relative z-10 flex items-start justify-between gap-5">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
                      Estoque central
                    </p>

                    <h2 className="mt-2 text-[25px] font-black tracking-[-0.04em]">
                      Entrada de cestas
                      <span className="text-[#f4b13f]">
                        .
                      </span>
                    </h2>

                    <p className="mt-2 max-w-[440px] text-[11px] leading-5 text-white/65">
                      Lance o recebimento físico da empresa. O saldo ficará disponível para criação das cargas dos entregadores.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setAberto(false)
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
                    aria-label="Fechar"
                  >
                    <X size={18} />
                  </button>
                </div>
              </header>

              <div className="max-h-[calc(100dvh-190px)] overflow-y-auto p-6">
                <div className="mb-5 rounded-[18px] border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                  <p className="text-[9px] font-bold leading-5 text-emerald-800">
                    Exemplo: compra de 50 cestas → registre uma entrada de 50 → o estoque central passa a disponibilizar esse saldo para novas cargas.
                  </p>
                </div>

                <EstoqueMovimentoForm
                  tipos={tipos}
                  podeAjustar={
                    podeAjustar
                  }
                  onSuccess={
                    concluir
                  }
                />
              </div>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
