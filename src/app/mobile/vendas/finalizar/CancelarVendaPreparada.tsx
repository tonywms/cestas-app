"use client";

import {
  AlertTriangle,
  RotateCcw,
  X,
} from "lucide-react";
import {
  useActionState,
  useState,
} from "react";

import {
  cancelarVendaPreparada,
} from "./actions";

const initialState = {
  success: false,
  message: "",
};

function moeda(valor: number) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    },
  ).format(valor);
}

export default function CancelarVendaPreparada({
  fluxoId,
  clienteNome,
  valorTotal,
}: {
  fluxoId: number;
  clienteNome: string;
  valorTotal: number;
}) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [state, formAction, pending] = useActionState(
    cancelarVendaPreparada,
    initialState,
  );

  const motivoValido =
    motivo.trim().length >= 8;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[17px] border border-amber-300 bg-amber-50 px-4 text-[11px] font-black text-amber-800 transition hover:bg-amber-100 active:scale-[0.99]"
      >
        <RotateCcw size={16} />
        Corrigir venda preparada
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#102319]/60 p-5 backdrop-blur-sm">
          <div className="w-full max-w-[430px] overflow-hidden rounded-[28px] bg-white shadow-[0_28px_90px_rgba(8,31,18,0.35)]">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-amber-100 text-amber-700">
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-amber-600">
                      Correção antes da entrega
                    </p>
                    <h3 className="mt-1 text-[21px] font-black tracking-[-0.04em] text-[#142018]">
                      Corrigir venda preparada?
                    </h3>
                    <p className="mt-2 text-[10px] leading-5 text-slate-500">
                      Use esta opção somente antes da confirmação física. O rascunho será cancelado e você voltará ao formulário para corrigir os dados.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  disabled={pending}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 disabled:opacity-50"
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <form action={formAction} className="space-y-4 p-5">
              <input
                type="hidden"
                name="fluxo_id"
                value={fluxoId}
              />

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[16px] bg-[#f6f9f6] p-3.5">
                  <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">
                    Cliente
                  </p>
                  <p className="mt-1 truncate text-[11px] font-black text-slate-800">
                    {clienteNome}
                  </p>
                </div>
                <div className="rounded-[16px] bg-amber-50 p-3.5">
                  <p className="text-[7px] font-black uppercase tracking-[0.12em] text-amber-600">
                    Venda preparada
                  </p>
                  <p className="mt-1 text-[13px] font-black text-amber-800">
                    {moeda(valorTotal)}
                  </p>
                </div>
              </div>

              <div className="rounded-[18px] border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-[10px] font-black text-emerald-800">
                  Nenhum efeito será revertido
                </p>
                <p className="mt-1 text-[9px] leading-5 text-emerald-800/80">
                  Esta etapa ainda não movimentou cesta, volume, entrega nem financeiro. O sistema cancela apenas a intenção preparada e preserva a auditoria.
                </p>
              </div>

              <div>
                <label className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Motivo da correção
                </label>
                <textarea
                  name="motivo"
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  minLength={8}
                  maxLength={500}
                  required
                  placeholder="Ex.: quantidade informada incorretamente; preciso revisar a condição da venda."
                  className="mt-2 min-h-[110px] w-full resize-none rounded-[18px] border border-amber-200 bg-white p-4 text-[11px] font-semibold text-slate-800 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                />
                <div className="mt-2 flex items-center justify-between gap-3 text-[8px] font-bold">
                  <span className={motivoValido ? "text-emerald-700" : "text-slate-400"}>
                    {motivoValido
                      ? "Justificativa pronta para auditoria."
                      : "Informe pelo menos 8 caracteres."}
                  </span>
                  <span className="text-slate-400">
                    {motivo.length}/500
                  </span>
                </div>
              </div>

              {state.message && !state.success && (
                <div className="rounded-[16px] border border-rose-200 bg-rose-50 p-3 text-[9px] font-bold leading-5 text-rose-700">
                  {state.message}
                </div>
              )}

              <button
                type="submit"
                disabled={!motivoValido || pending}
                className="flex h-[54px] w-full items-center justify-center gap-2 rounded-[17px] bg-amber-500 px-4 text-[11px] font-black text-white shadow-[0_12px_28px_rgba(245,158,11,0.22)] transition hover:bg-amber-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <RotateCcw size={16} />
                {pending
                  ? "Cancelando rascunho..."
                  : "Cancelar rascunho e voltar para editar"}
              </button>

              <button
                type="button"
                onClick={() => setAberto(false)}
                disabled={pending}
                className="flex h-[50px] w-full items-center justify-center rounded-[16px] border border-slate-200 bg-white px-4 text-[11px] font-black text-slate-500 disabled:opacity-50"
              >
                Manter venda e continuar
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
