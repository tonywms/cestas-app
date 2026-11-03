"use client";

import { AlertTriangle, LockKeyhole, UnlockKeyhole, X } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { reabrirFechamento } from "./actions";

// V63_4_COMPONENTE_REABERTURA_COMPLETO
type Props = {
  entregadorId: string;
  entregadorNome: string;
  dataInicio: string;
  dataFim: string;
  periodoLabel: string;
};

type ReabrirFechamentoState = {
  success: boolean;
  message: string;
  redirectTo?: string;
};

const reabrirFechamentoInitialState: ReabrirFechamentoState = {
  success: false,
  message: "",
};

export default function ReabrirFechamentoForm({
  entregadorId,
  entregadorNome,
  dataInicio,
  dataFim,
  periodoLabel,
}: Props) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [state, formAction, pending] = useActionState(
    reabrirFechamento,
    reabrirFechamentoInitialState,
  );

  const motivoValido = useMemo(
    () => motivo.trim().length >= 8 && motivo.trim().length <= 1000,
    [motivo],
  );

  useEffect(() => {
    if (!state.success || !state.redirectTo) return;

    router.replace(state.redirectTo);
    router.refresh();
  }, [state.success, state.redirectTo, router]);

  return (
    <form action={formAction} className="mt-4">
      <input type="hidden" name="entregador_id" value={entregadorId} />
      <input type="hidden" name="data_inicio" value={dataInicio} />
      <input type="hidden" name="data_fim" value={dataFim} />

      <label className="block">
        <span className="text-[7px] font-black uppercase tracking-[0.13em] text-slate-400">
          Motivo da reabertura
        </span>
        <textarea
          name="motivo_reabertura"
          required
          minLength={8}
          maxLength={1000}
          rows={3}
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          placeholder="Ex.: divergência identificada no extrato PIX; valor será reconferido."
          className="mt-2 w-full resize-none rounded-[16px] border border-slate-200 bg-[#f8faf8] p-4 text-[10px] leading-5 outline-none focus:border-amber-300"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p
            className={`text-[7px] font-bold ${
              motivo.length === 0
                ? "text-slate-400"
                : motivoValido
                  ? "text-emerald-700"
                  : "text-amber-700"
            }`}
          >
            {motivo.length === 0
              ? "Informe por que este fechamento precisa ser alterado."
              : motivoValido
                ? "Justificativa pronta para auditoria."
                : "Use pelo menos 8 caracteres."}
          </p>
          <span className="text-[7px] font-black text-slate-400">
            {motivo.length}/1000
          </span>
        </div>
      </label>

      {!state.success && state.message && (
        <div className="mt-3 flex items-start gap-2 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <p className="text-[8px] font-bold leading-5">{state.message}</p>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={!motivoValido || pending}
          onClick={() => setConfirmando(true)}
          className="flex h-11 items-center gap-2 rounded-[14px] bg-amber-500 px-5 text-[9px] font-black text-white shadow-[0_10px_24px_rgba(245,158,11,0.20)] transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <UnlockKeyhole size={15} />
          Revisar reabertura
        </button>
      </div>

      {confirmando && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0b1b12]/55 p-4 backdrop-blur-[3px]">
          <div className="w-full max-w-[480px] overflow-hidden rounded-[30px] bg-white shadow-[0_35px_100px_rgba(0,0,0,0.28)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-amber-100 text-amber-700">
                  <LockKeyhole size={21} />
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-amber-600">
                    Confirmação financeira
                  </p>
                  <h3 className="mt-1 text-[21px] font-black tracking-[-0.04em] text-[#142018]">
                    Reabrir este fechamento?
                  </h3>
                  <p className="mt-2 text-[9px] leading-5 text-slate-500">
                    A versão atual ficará preservada. Após a reabertura, qualquer ajuste deverá ser salvo novamente para reconferir e bloquear o fechamento.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConfirmando(false)}
                disabled={pending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100"
                aria-label="Fechar confirmação"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[18px] bg-[#f6f9f6] p-4">
                  <p className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Entregador
                  </p>
                  <p className="mt-1 text-[11px] font-black text-[#142018]">
                    {entregadorNome}
                  </p>
                </div>
                <div className="rounded-[18px] bg-[#f6f9f6] p-4">
                  <p className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Período
                  </p>
                  <p className="mt-1 text-[11px] font-black text-[#142018]">
                    {periodoLabel}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-[18px] border border-amber-200 bg-amber-50 p-4">
                <p className="text-[7px] font-black uppercase tracking-[0.14em] text-amber-700">
                  Motivo registrado
                </p>
                <p className="mt-2 whitespace-pre-wrap text-[9px] font-semibold leading-5 text-amber-900">
                  {motivo.trim()}
                </p>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  disabled={pending}
                  className="flex h-12 items-center justify-center rounded-[15px] border border-slate-200 bg-white text-[9px] font-black text-slate-600"
                >
                  Voltar e revisar
                </button>

                <button
                  type="submit"
                  disabled={pending}
                  className="flex h-12 items-center justify-center gap-2 rounded-[15px] bg-amber-500 px-5 text-[9px] font-black text-white shadow-[0_12px_28px_rgba(245,158,11,0.22)] disabled:opacity-60"
                >
                  <UnlockKeyhole size={15} />
                  {pending ? "Reabrindo..." : "Confirmar reabertura"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
