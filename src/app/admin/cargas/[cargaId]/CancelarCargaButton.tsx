"use client";

import { AlertTriangle, Ban, CheckCircle2, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  cancelarCarga,
  cancelarCargaInitialState,
} from "./actions";

export default function CancelarCargaButton({
  cargaId,
  codigo,
  bloqueado = false,
  motivoBloqueio = "",
}: {
  cargaId: number;
  codigo: string;
  bloqueado?: boolean;
  motivoBloqueio?: string;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState(
    cancelarCarga,
    cancelarCargaInitialState,
  );

  useEffect(() => {
    if (!state.success) return;

    const timer = window.setTimeout(() => {
      setAberto(false);
      router.refresh();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [state.success, router]);

  if (bloqueado) {
    return (
      <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white text-slate-400 shadow-sm">
            <Ban size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-600">
              Cancelamento indisponível
            </p>
            <p className="mt-1 text-[9px] leading-5 text-slate-400">
              {motivoBloqueio || "Esta carga já iniciou seu ciclo operacional e deve ser encerrada pelo fluxo normal."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex h-[48px] w-full items-center justify-center gap-2 rounded-[15px] border border-red-200 bg-red-50 px-5 text-[9px] font-black text-red-700 transition hover:bg-red-100"
      >
        <Ban size={15} />
        Cancelar carga
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-[460px] overflow-hidden rounded-[28px] bg-white shadow-[0_35px_90px_rgba(0,0,0,0.25)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-red-50 text-red-600">
                  <AlertTriangle size={21} />
                </div>

                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-red-500">
                    Operação irreversível
                  </p>
                  <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em] text-[#142018]">
                    Cancelar {codigo}?
                  </h3>
                  <p className="mt-2 text-[9px] leading-5 text-slate-500">
                    O estoque restante será devolvido automaticamente ao central e os volumes físicos ficarão como CANCELADO, preservando o histórico da carga.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAberto(false)}
                disabled={pending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <form action={formAction} className="p-6">
              <input type="hidden" name="carga_id" value={cargaId} />

              <label className="block">
                <span className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Motivo do cancelamento
                </span>
                <textarea
                  name="motivo"
                  maxLength={500}
                  rows={4}
                  placeholder="Ex.: carga criada para o entregador errado, operação cancelada pelo gestor..."
                  className="mt-2 w-full resize-none rounded-[16px] border border-slate-200 bg-white p-4 text-[10px] font-semibold text-slate-700 outline-none transition focus:border-red-300"
                />
              </label>

              {state.message && (
                <div
                  className={`mt-4 flex items-start gap-3 rounded-[16px] border p-4 ${
                    state.success
                      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                      : "border-red-100 bg-red-50 text-red-700"
                  }`}
                >
                  {state.success ? (
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                  )}
                  <p className="text-[9px] font-bold leading-5">{state.message}</p>
                </div>
              )}

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  disabled={pending}
                  className="h-[48px] rounded-[15px] border border-slate-200 bg-white text-[9px] font-black text-slate-500 disabled:opacity-50"
                >
                  Voltar
                </button>

                <button
                  type="submit"
                  disabled={pending || state.success}
                  className="flex h-[48px] items-center justify-center gap-2 rounded-[15px] bg-red-600 px-4 text-[9px] font-black text-white shadow-[0_12px_28px_rgba(220,38,38,0.20)] disabled:opacity-50"
                >
                  <Ban size={15} />
                  {pending ? "Cancelando..." : "Confirmar cancelamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
