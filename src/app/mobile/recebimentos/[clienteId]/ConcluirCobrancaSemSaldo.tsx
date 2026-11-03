"use client";

import {
  CheckCircle2,
  CircleDollarSign,
  X,
} from "lucide-react";
import {
  useActionState,
  useState,
} from "react";

import {
  concluirCobrancaSemSaldo,
} from "./actions";

const initialState = {
  success: false,
  message: "",
};

export default function ConcluirCobrancaSemSaldo({
  rotaClienteId,
  clienteNome,
}: {
  rotaClienteId: number;
  clienteNome: string;
}) {
  const [aberto, setAberto] =
    useState(false);

  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    concluirCobrancaSemSaldo,
    initialState,
  );

  return (
    <>
      {/* V66_COBRANCA_SEM_SALDO_UI */}
      <button
        type="button"
        onClick={() =>
          setAberto(true)
        }
        className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-[17px] border border-amber-300 bg-amber-50 px-4 text-[11px] font-black text-amber-800 shadow-[0_10px_24px_rgba(180,110,10,0.10)] transition active:scale-[0.985]"
      >
        <CheckCircle2
          size={17}
        />
        Concluir cobrança sem recebimento
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#10261a]/60 p-4 backdrop-blur-[4px]">
          <div className="w-full max-w-[430px] overflow-hidden rounded-[30px] bg-white shadow-[0_30px_90px_rgba(7,33,18,0.34)]">
            <div className="border-b border-slate-100 px-5 pb-5 pt-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-amber-100 text-amber-700">
                    <CircleDollarSign
                      size={22}
                    />
                  </div>

                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-amber-600">
                      Conciliação da rota
                    </p>
                    <h2 className="mt-1 text-[21px] font-black tracking-[-0.04em] text-[#142018]">
                      Saldo já quitado?
                    </h2>
                    <p className="mt-2 text-[10px] leading-5 text-slate-500">
                      Use esta opção somente quando a cobrança já tiver sido quitada por outro recebimento antes desta visita.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setAberto(false)
                  }
                  disabled={pending}
                  aria-label="Fechar"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-slate-50 text-slate-400 disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-[20px] bg-[#f6f9f6] p-4">
                <p className="text-[7px] font-black uppercase tracking-[0.13em] text-slate-400">
                  Cliente
                </p>
                <p className="mt-1 text-[13px] font-black text-slate-800">
                  {clienteNome}
                </p>
              </div>

              <div className="rounded-[20px] border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-[9px] font-black text-emerald-800">
                  Nenhum pagamento será criado
                </p>
                <p className="mt-1 text-[9px] leading-5 text-emerald-700/75">
                  O servidor confirma novamente que o cliente está sem saldo. Só então a parada é concluída e registrada na auditoria. Estoque e financeiro permanecem inalterados.
                </p>
              </div>

              {state.message && (
                <div className="rounded-[17px] border border-red-100 bg-red-50 px-4 py-3 text-[10px] font-bold leading-5 text-red-700">
                  {state.message}
                </div>
              )}

              <form
                action={formAction}
                className="space-y-2.5"
              >
                <input
                  type="hidden"
                  name="rota_cliente_id"
                  value={rotaClienteId}
                />

                <button
                  type="submit"
                  disabled={pending}
                  className="flex h-[54px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#176f3c] px-4 text-[12px] font-black text-white shadow-[0_14px_30px_rgba(23,111,60,0.24)] transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2
                    size={17}
                  />
                  {pending
                    ? "Conferindo saldo..."
                    : "Confirmar e concluir parada"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setAberto(false)
                  }
                  disabled={pending}
                  className="flex h-[48px] w-full items-center justify-center rounded-[15px] border border-slate-200 bg-white text-[10px] font-black text-slate-500 disabled:opacity-50"
                >
                  Voltar
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
