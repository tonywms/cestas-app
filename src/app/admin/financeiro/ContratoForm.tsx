"use client";

import {
  CalendarDays,
  CheckCircle2,
  FilePlus2,
  Save,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";

import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  criarContrato,
} from "./actions";

const initialState = {
  success: false,
  message: "",
  contratoId: null as number | null,
  codigo: null as string | null,
};

type Cliente = {
  id: number;
  codigo: string;
  nome: string;
};

export default function ContratoForm({
  clientes,
  primeiroVencimento,
}: {
  clientes: Cliente[];
  primeiroVencimento: string;
}) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    criarContrato,
    initialState,
  );

  const [
    modal,
    setModal,
  ] = useState(false);

  useEffect(() => {
    if (state.message) {
      setModal(true);
    }
  }, [state]);

  return (
    <>
      <form
        action={formAction}
        className="card-premium rounded-[30px] p-6"
      >
        <div className="flex items-start gap-3">
          <div className="icon-emerald flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px]">
            <FilePlus2
              size={21}
            />
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
              Novo crediário
            </p>

            <h2 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
              Criar contrato
            </h2>

            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              O sistema gera as parcelas automaticamente.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
              Cliente
            </label>

            <div className="relative mt-2">
              <UserRound
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#176f3c]"
              />

              <select
                name="cliente_id"
                required
                defaultValue=""
                className="h-[54px] w-full appearance-none rounded-[17px] border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold outline-none focus:border-emerald-400"
              >
                <option value="">
                  Selecione o cliente
                </option>

                {clientes.map(
                  (cliente) => (
                    <option
                      key={
                        cliente.id
                      }
                      value={
                        cliente.id
                      }
                    >
                      {cliente.nome} - {cliente.codigo}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
              Valor total
            </label>

            <div className="relative mt-2">
              <WalletCards
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#176f3c]"
              />

              <input
                type="number"
                name="valor_total"
                min="0.01"
                step="0.01"
                required
                placeholder="150.00"
                className="h-[54px] w-full rounded-[17px] border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
              Quantidade de parcelas
            </label>

            <input
              type="number"
              name="quantidade_parcelas"
              min={1}
              max={120}
              defaultValue={4}
              required
              className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
              Primeiro vencimento
            </label>

            <div className="relative mt-2">
              <CalendarDays
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#176f3c]"
              />

              <input
                type="date"
                name="primeiro_vencimento"
                defaultValue={
                  primeiroVencimento
                }
                required
                className="h-[54px] w-full rounded-[17px] border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
              Observação
            </label>

            <input
              name="observacao"
              placeholder="Opcional"
              className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-emerald-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={
            pending ||
            clientes.length ===
              0
          }
          className="mt-5 flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#1f8a4c,#0d5d31)] text-[13px] font-black text-white shadow-[0_16px_30px_rgba(23,111,60,0.24)] transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save
            size={18}
          />

          {pending
            ? "Criando contrato..."
            : "Criar contrato e parcelas"}
        </button>
      </form>

      {modal &&
        state.message && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[5px]">
            <div className="w-full max-w-[410px] rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.25)]">
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                  state.success
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {state.success ? (
                  <CheckCircle2
                    size={31}
                  />
                ) : (
                  <XCircle
                    size={31}
                  />
                )}
              </div>

              <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                {state.success
                  ? "Contrato criado"
                  : "Falha no cadastro"}
              </p>

              <h3 className="mt-2 text-xl font-black tracking-[-0.035em]">
                {state.success
                  ? state.codigo ??
                    "Crediário criado"
                  : "Não foi possível criar"}
              </h3>

              <p className="mt-3 text-[12px] leading-6 text-slate-500">
                {state.message}
              </p>

              <button
                type="button"
                onClick={() =>
                  setModal(false)
                }
                className="mt-6 h-[50px] w-full rounded-[16px] bg-[#176f3c] text-xs font-black text-white"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
    </>
  );
}
