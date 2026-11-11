"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShieldCheck, X } from "lucide-react";

type Props = {
  titulo: string;
  descricao: string;
  destinoAposFechar: string;
  valor?: string;
  identificacao?: string;
  detalhe?: string;
};

export default function ConfirmacaoFinanceiraModal({
  titulo, descricao, destinoAposFechar, valor, identificacao, detalhe,
}: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(true);
  const fecharRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fecharRef.current?.focus();
    const aoPressionar = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAberto(false);
        router.replace(destinoAposFechar, { scroll: false });
      }
    };
    document.addEventListener("keydown", aoPressionar);
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener("keydown", aoPressionar);
    };
  }, [destinoAposFechar, router]);

  function fechar() {
    setAberto(false);
    router.replace(destinoAposFechar, { scroll: false });
  }
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-[3px]">
      <div role="dialog" aria-modal="true" aria-labelledby="confirmacao-financeira-titulo"
        aria-describedby="confirmacao-financeira-descricao"
        className="relative my-auto w-full max-w-[420px] rounded-[28px] bg-white p-6 text-center shadow-[0_25px_100px_rgba(0,0,0,0.28)] sm:p-8">
        <button type="button" onClick={fechar} aria-label="Fechar confirmação"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200">
          <X size={18}/>
        </button>
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 size={42} strokeWidth={1.9}/>
        </div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
          Operação validada no CD
        </p>
        <h2 id="confirmacao-financeira-titulo" className="mt-2 text-xl font-black tracking-tight text-slate-950">
          {titulo}
        </h2>
        <p id="confirmacao-financeira-descricao" className="mt-3 text-[12px] leading-6 text-slate-600">
          {descricao}
        </p>
        {(valor || identificacao || detalhe) && (
          <div className="mt-5 space-y-2 rounded-[20px] border border-emerald-200 bg-emerald-50 p-4 text-left">
            {valor && <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Valor confirmado</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-emerald-950">{valor}</p>
            </div>}
            {identificacao && <p className="text-[11px] font-bold text-emerald-950">{identificacao}</p>}
            {detalhe && <p className="text-[10px] leading-5 text-emerald-900">{detalhe}</p>}
          </div>
        )}
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-left text-[10px] leading-5 text-slate-600">
          <ShieldCheck size={17} className="mt-0.5 shrink-0 text-emerald-700"/>
          Resultado confirmado pelo sistema e registrado no histórico. Esta mensagem não representa uma validação bancária automática.
        </div>
        <button type="button" ref={fecharRef} onClick={fechar}
          className="mt-6 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-emerald-800 px-4 text-sm font-black text-white transition hover:bg-emerald-900">
          Entendi, continuar
        </button>
      </div>
    </div>
  );
}
