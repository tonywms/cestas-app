"use client";

import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Coins,
  CreditCard,
  ReceiptText,
  Save,
  WalletCards,
  XCircle,
} from "lucide-react";

import Link from "next/link";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  registrarRecebimento,
} from "./actions";

const initialState = {
  success: false,
  message: "",
  saldoAntes:
    null as number | null,
  saldoDepois:
    null as number | null,
  status:
    null as string | null,
};

type Parcela = {
  id: number;
  numero: number;
  contratoCodigo: string;
  vencimento: string;
  valor: number;
  valorPago: number;
  saldo: number;
  status: string;
  vencida: boolean;
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
  ).format(valor);
}

function dataBR(
  data: string,
) {
  const [
    ano,
    mes,
    dia,
  ] = data.split("-");

  return `${dia}/${mes}/${ano}`;
}

export default function RecebimentoForm({
  clienteId,
  parcelas,
}: {
  clienteId:
    number;

  parcelas:
    Parcela[];
}) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    registrarRecebimento,
    initialState,
  );

  const [
    parcelaId,
    setParcelaId,
  ] = useState(
    parcelas[0]?.id ??
      0,
  );

  const parcela =
    useMemo(
      () =>
        parcelas.find(
          (
            item,
          ) =>
            item.id ===
            parcelaId,
        ) ??
        parcelas[0],
      [
        parcelaId,
        parcelas,
      ],
    );

  const [
    valor,
    setValor,
  ] = useState(
    parcela
      ? String(
          parcela.saldo.toFixed(
            2,
          ),
        )
      : "",
  );

  const [
    modal,
    setModal,
  ] = useState(
    false,
  );

  useEffect(
    () => {
      if (
        parcela
      ) {
        setValor(
          String(
            parcela.saldo.toFixed(
              2,
            ),
          ),
        );
      }
    },
    [
      parcela,
    ],
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

  if (
    !parcela
  ) {
    return null;
  }

  return (
    <>
      <form
        action={
          formAction
        }
        className="space-y-4"
      >

        <input
          type="hidden"
          name="cliente_id"
          value={
            clienteId
          }
        />

        {/* =================================================
            CARD PARCELA - ANATOMIA IGUAL AO CARD DA ROTA
        ================================================= */}

        <section className="relative overflow-hidden rounded-[28px] border border-emerald-200 bg-[linear-gradient(145deg,#f0fbf4,#ffffff)] p-5 shadow-[0_22px_55px_-32px_rgba(17,63,33,0.22)]">

          <div className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#16a05d,#8ee9b2)]" />

          <div className="flex items-start gap-4">

            <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[18px] bg-[#159653] text-white shadow-sm">

              <WalletCards
                size={23}
              />

            </div>

            <div className="min-w-0 flex-1">

              <p className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-600">
                Parcela
              </p>

              <h2 className="mt-1 text-[18px] font-black tracking-[-0.035em]">
                Selecionar cobrança
              </h2>

            </div>

          </div>

          {/* SELETOR - MESMO PAPEL DO ENDEREÇO DA ROTA */}

          <div className="mt-4 rounded-[18px] bg-[#f7f9f7]/90 p-3.5">

            <div className="flex items-center gap-2.5">

              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-white text-[#176f3c] shadow-sm">

                <ReceiptText
                  size={13}
                />

              </div>

              <select
                name="parcela_id"
                value={
                  parcelaId
                }
                onChange={(
                  event,
                ) =>
                  setParcelaId(
                    Number(
                      event.target.value,
                    ),
                  )
                }
                className="min-w-0 flex-1 bg-transparent text-[10px] font-black outline-none"
              >

                {parcelas.map(
                  (
                    item,
                  ) => (
                    <option
                      key={
                        item.id
                      }
                      value={
                        item.id
                      }
                    >
                      {item.contratoCodigo} • Parcela {item.numero} • {dataBR(item.vencimento)} • {moeda(item.saldo)}
                    </option>
                  ),
                )}

              </select>

            </div>

          </div>

          {/* MICRO INFO */}

          <div className="mt-3 grid grid-cols-3 gap-2">

            <MicroInfo
              icon={
                <CalendarDays
                  size={12}
                />
              }
              label="Vencimento"
              valor={
                dataBR(
                  parcela.vencimento,
                )
              }
              alerta={
                parcela.vencida
              }
            />

            <MicroInfo
              icon={
                <Coins
                  size={12}
                />
              }
              label="Original"
              valor={
                moeda(
                  parcela.valor,
                )
              }
            />

            <MicroInfo
              icon={
                <Banknote
                  size={12}
                />
              }
              label="Saldo"
              valor={
                moeda(
                  parcela.saldo,
                )
              }
            />

          </div>

        </section>

        {/* =================================================
            PAGAMENTO
        ================================================= */}

        <section className="relative overflow-hidden rounded-[28px] border border-black/[0.045] bg-white p-5 shadow-[0_22px_55px_-32px_rgba(17,63,33,0.22)]">

          <div className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#176f3c,#81d49e)]" />

          <div className="flex items-start gap-4">

            <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[18px] bg-[#eaf5ed] text-[#176f3c] shadow-sm">

              <CreditCard
                size={23}
              />

            </div>

            <div>

              <p className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-600">
                Pagamento
              </p>

              <h2 className="mt-1 text-[18px] font-black tracking-[-0.035em]">
                Informar recebimento
              </h2>

            </div>

          </div>

          <label className="mt-5 block text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
            Valor recebido
          </label>

          <div className="relative mt-2">

            <Banknote
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#176f3c]"
            />

            <input
              type="number"
              name="valor"
              min="0.01"
              max={
                parcela.saldo
              }
              step="0.01"
              value={
                valor
              }
              onChange={(
                event,
              ) =>
                setValor(
                  event.target.value,
                )
              }
              required
              className="h-[56px] w-full rounded-[17px] border border-slate-200 bg-white pl-11 pr-4 text-[15px] font-black outline-none focus:border-emerald-400"
            />

          </div>

          <label className="mt-5 block text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
            Forma de pagamento
          </label>

          <select
            name="forma_pagamento"
            defaultValue="PIX"
            required
            className="mt-2 h-[56px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-[12px] font-black outline-none focus:border-emerald-400"
          >

            <option value="PIX">
              PIX
            </option>

            <option value="DINHEIRO">
              Dinheiro
            </option>

            <option value="CARTAO">
              Cartão
            </option>

            <option value="TRANSFERENCIA">
              Transferência
            </option>

            <option value="OUTRO">
              Outro
            </option>

          </select>

          <label className="mt-5 block text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
            Observação
          </label>

          <input
            name="observacao"
            placeholder="Opcional"
            className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-[12px] font-semibold outline-none focus:border-emerald-400"
          />

          <button
            type="submit"
            disabled={
              pending
            }
            className="mt-5 flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#1f8a4c,#0d5d31)] text-[13px] font-black text-white shadow-[0_16px_30px_rgba(23,111,60,0.30)] transition active:scale-[0.985] disabled:opacity-50"
          >

            <Save
              size={18}
            />

            {pending
              ? "Registrando..."
              : "Confirmar recebimento"}

          </button>

        </section>

      </form>

      {/* =================================================
          MODAL
      ================================================= */}

      {modal &&
        state.message && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[5px]">

          <div className="w-full max-w-[390px] overflow-hidden rounded-[30px] bg-white shadow-[0_30px_100px_rgba(15,50,30,0.28)]">

            <div className="px-7 pb-7 pt-7 text-center">

              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                  state.success
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-red-100 text-red-600"
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
                  ? "Pagamento concluído"
                  : "Falha no pagamento"}

              </p>

              <h3 className="mt-2 text-[21px] font-black tracking-[-0.035em]">

                {state.success
                  ? state.status ===
                    "PAGA"
                    ? "Parcela quitada"
                    : "Pagamento parcial"
                  : "Não foi possível receber"}

              </h3>

              <p className="mt-3 text-[11px] leading-5 text-slate-500">
                {
                  state.message
                }
              </p>

              {state.success &&
                state.saldoAntes !==
                  null &&
                state.saldoDepois !==
                  null && (
                <div className="mt-5 grid grid-cols-2 gap-3">

                  <div className="rounded-[18px] border border-slate-100 bg-white p-4">

                    <p className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
                      Antes
                    </p>

                    <p className="mt-2 text-[18px] font-black">
                      {moeda(
                        state.saldoAntes,
                      )}
                    </p>

                  </div>

                  <div className="rounded-[18px] border border-emerald-100 bg-emerald-50 p-4">

                    <p className="text-[8px] font-black uppercase tracking-[0.12em] text-emerald-600">
                      Agora
                    </p>

                    <p className="mt-2 text-[18px] font-black text-emerald-700">
                      {moeda(
                        state.saldoDepois,
                      )}
                    </p>

                  </div>

                </div>
              )}

              {state.success ? (
                <Link
                  href="/mobile/recebimentos"
                  className="mt-6 flex h-[52px] items-center justify-center rounded-[16px] bg-[#176f3c] text-xs font-black text-white"
                >
                  Continuar recebimentos
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setModal(
                      false,
                    )
                  }
                  className="mt-6 h-[52px] w-full rounded-[16px] bg-[#176f3c] text-xs font-black text-white"
                >
                  Entendi
                </button>
              )}

            </div>

          </div>

        </div>
      )}

    </>
  );
}

/* =========================================================
   MICRO INFO
========================================================= */

function MicroInfo({
  icon,
  label,
  valor,
  alerta = false,
}: {
  icon:
    React.ReactNode;

  label:
    string;

  valor:
    string;

  alerta?:
    boolean;
}) {
  return (
    <div
      className={`rounded-[14px] border px-2.5 py-2.5 ${
        alerta
          ? "border-amber-200 bg-amber-50"
          : "border-slate-100 bg-white/90"
      }`}
    >

      <div
        className={`flex items-center gap-1 ${
          alerta
            ? "text-amber-700"
            : "text-slate-400"
        }`}
      >

        {icon}

        <p className="truncate text-[6px] font-black uppercase tracking-[0.08em]">
          {label}
        </p>

      </div>

      <p
        className={`mt-1.5 truncate text-[8px] font-black ${
          alerta
            ? "text-amber-700"
            : ""
        }`}
      >
        {valor}
      </p>

    </div>
  );
}
