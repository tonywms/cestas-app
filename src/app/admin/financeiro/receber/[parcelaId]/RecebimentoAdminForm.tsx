"use client";

import Link from "next/link";

import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Landmark,
  Save,
  Smartphone,
  WalletCards,
  XCircle,
} from "lucide-react";

import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  registrarRecebimentoAdmin,
} from "./actions";

const initialState = {
  success:
    false,
  message:
    "",
  saldoAntes:
    null as number | null,
  saldoDepois:
    null as number | null,
  status:
    null as string | null,
};

function moeda(
  valor: number,
) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style:
        "currency",
      currency:
        "BRL",
    },
  ).format(
    valor,
  );
}

const FORMAS = [
  {
    codigo:
      "DINHEIRO",
    nome:
      "Dinheiro",
    icon:
      Banknote,
  },
  {
    codigo:
      "PIX",
    nome:
      "PIX",
    icon:
      Smartphone,
  },
  {
    codigo:
      "CARTAO",
    nome:
      "Cartão",
    icon:
      CreditCard,
  },
  {
    codigo:
      "TRANSFERENCIA",
    nome:
      "Transferência",
    icon:
      Landmark,
  },
  {
    codigo:
      "OUTRO",
    nome:
      "Outro",
    icon:
      WalletCards,
  },
] as const;

export default function RecebimentoAdminForm({
  parcelaId,
  clienteId,
  saldo,
}: {
  parcelaId:
    number;
  clienteId:
    number;
  saldo:
    number;
}) {
  const [
    state,
    formAction,
    pending,
  ] =
    useActionState(
      registrarRecebimentoAdmin,
      initialState,
    );

  const [
    forma,
    setForma,
  ] =
    useState(
      "PIX",
    );

  const [
    modal,
    setModal,
  ] =
    useState(
      false,
    );

  useEffect(
    () => {
      if (
        state.message
      ) {
        setModal(
          true,
        );
      }
    },
    [
      state,
    ],
  );

  return (
    <>
      <form
        action={
          formAction
        }
        className="card-premium rounded-[30px] p-6"
      >
        <input
          type="hidden"
          name="parcela_id"
          value={
            parcelaId
          }
        />

        <input
          type="hidden"
          name="cliente_id"
          value={
            clienteId
          }
        />

        <input
          type="hidden"
          name="forma_pagamento"
          value={
            forma
          }
        />

        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
            Recebimento
          </p>

          <h2 className="mt-1 text-[24px] font-black tracking-[-0.04em]">
            Registrar pagamento
          </h2>

          <p className="mt-1 text-[12px] leading-5 text-slate-500">
            Informe quanto foi recebido e como o cliente pagou.
          </p>
        </div>

        <div className="mt-6">
          <label className="text-[11px] font-extrabold text-slate-600">
            Valor recebido
          </label>

          <div className="mt-2 flex h-[62px] items-center rounded-[18px] border border-slate-200 bg-white px-4 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-50">
            <span className="text-[16px] font-black text-emerald-700">
              R$
            </span>

            <input
              name="valor"
              type="number"
              min="0.01"
              max={
                saldo
              }
              step="0.01"
              defaultValue={
                saldo.toFixed(
                  2,
                )
              }
              required
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-[22px] font-black outline-none"
            />
          </div>

          <p className="mt-2 text-[11px] font-bold text-slate-400">
            Saldo máximo:{" "}
            {moeda(
              saldo,
            )}
          </p>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-extrabold text-slate-600">
            Forma de pagamento
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {FORMAS.map(
              (
                item,
              ) => {
                const Icon =
                  item.icon;

                const ativo =
                  forma ===
                  item.codigo;

                return (
                  <button
                    key={
                      item.codigo
                    }
                    type="button"
                    onClick={() =>
                      setForma(
                        item.codigo,
                      )
                    }
                    className={`rounded-[17px] border p-3 text-left transition ${
                      ativo
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    <Icon
                      size={19}
                    />

                    <p className="mt-2 text-[11px] font-black">
                      {
                        item.nome
                      }
                    </p>
                  </button>
                );
              },
            )}
          </div>
        </div>

        <label className="mt-6 block">
          <span className="text-[11px] font-extrabold text-slate-600">
            Observação
          </span>

          <textarea
            name="observacao"
            rows={3}
            placeholder="Ex.: recebido presencialmente, comprovante confirmado..."
            className="mt-2 w-full resize-none rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
          />
        </label>

        <button
          type="submit"
          disabled={
            pending
          }
          className="mt-6 flex h-[58px] w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#1f8a4c,#0d5d31)] text-[14px] font-black text-white shadow-[0_16px_30px_rgba(23,111,60,0.24)] disabled:opacity-50"
        >
          <Save
            size={18}
          />

          {pending
            ? "Registrando..."
            : "Confirmar recebimento"}
        </button>
      </form>

      {modal &&
        state.message && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">
            <div className="w-full max-w-[430px] rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.28)]">
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

              <h3 className="mt-5 text-[22px] font-black">
                {state.success
                  ? "Recebimento confirmado"
                  : "Recebimento não registrado"}
              </h3>

              <p className="mt-3 text-[13px] leading-6 text-slate-500">
                {
                  state.message
                }
              </p>

              {state.success ? (
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-[16px] bg-slate-50 p-3">
                    <p className="text-[10px] font-extrabold uppercase text-slate-400">
                      Saldo antes
                    </p>

                    <p className="mt-1 text-[15px] font-black">
                      {moeda(
                        state.saldoAntes ??
                          0,
                      )}
                    </p>
                  </div>

                  <div className="rounded-[16px] bg-emerald-50 p-3">
                    <p className="text-[10px] font-extrabold uppercase text-emerald-600">
                      Saldo depois
                    </p>

                    <p className="mt-1 text-[15px] font-black text-emerald-800">
                      {moeda(
                        state.saldoDepois ??
                          0,
                      )}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 space-y-2">
                {state.success ? (
                  <Link
                    href="/admin/financeiro"
                    className="flex h-[50px] items-center justify-center rounded-[16px] bg-[#176f3c] text-[13px] font-black text-white"
                  >
                    Voltar ao Financeiro
                  </Link>
                ) : null}

                <button
                  type="button"
                  onClick={() =>
                    setModal(
                      false,
                    )
                  }
                  className="h-[48px] w-full rounded-[15px] border border-slate-200 text-[12px] font-extrabold text-slate-600"
                >
                  {state.success
                    ? "Continuar nesta parcela"
                    : "Corrigir"}
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}
