"use client";

import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Landmark,
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
  registrarVendaCampo,
  vendaCampoInitialState,
} from "./actions";

type ItemVenda = {
  nome: string;
  quantidade: number;
  valorUnitario: number;
  subtotal: number;
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

export default function VendaCampoForm({
  entregaId,
  clienteNome,
  clienteCodigo,
  valorTotal,
  itens,
  primeiroVencimento,
}: {
  entregaId: number;
  clienteNome: string;
  clienteCodigo: string;
  valorTotal: number;
  itens: ItemVenda[];
  primeiroVencimento: string;
}) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    registrarVendaCampo,
    vendaCampoInitialState,
  );

  const [
    tipoVenda,
    setTipoVenda,
  ] = useState<
    "AVISTA" | "CREDIARIO"
  >("AVISTA");

  const [
    entrada,
    setEntrada,
  ] = useState("0");

  const [
    modal,
    setModal,
  ] = useState(false);

  useEffect(() => {
    if (state.message) {
      setModal(true);
    }
  }, [state]);

  const entradaNumero =
    useMemo(
      () => {
        const valor =
          Number(
            entrada
              .replaceAll(".", "")
              .replace(",", "."),
          );

        return Number.isFinite(valor)
          ? valor
          : 0;
      },
      [entrada],
    );

  const financiado =
    Math.max(
      0,
      valorTotal -
        entradaNumero,
    );

  return (
    <>
      <form
        action={formAction}
        className="space-y-4"
      >
        <input
          type="hidden"
          name="entrega_id"
          value={entregaId}
        />

        <input
          type="hidden"
          name="tipo_venda"
          value={tipoVenda}
        />

        <section className="rounded-[26px] border border-emerald-100 bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.06)]">
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-700">
            Cliente
          </p>

          <h2 className="mt-1 text-[18px] font-black">
            {clienteNome}
          </h2>

          <p className="mt-1 text-[9px] font-bold text-slate-400">
            {clienteCodigo}
          </p>
        </section>

        <section className="rounded-[26px] bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#b07a12]">
                Venda da entrega
              </p>

              <h3 className="mt-1 text-[18px] font-black">
                {moeda(
                  valorTotal,
                )}
              </h3>
            </div>

            <ReceiptText
              size={22}
              className="text-[#176f3c]"
            />
          </div>

          <div className="mt-4 space-y-2">
            {itens.map(
              (
                item,
                index,
              ) => (
                <div
                  key={`${item.nome}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-[16px] bg-[#f6f9f6] px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-black">
                      {item.nome}
                    </p>

                    <p className="mt-1 text-[8px] text-slate-400">
                      {item.quantidade} x {moeda(item.valorUnitario)}
                    </p>
                  </div>

                  <p className="shrink-0 text-[11px] font-black text-[#176f3c]">
                    {moeda(
                      item.subtotal,
                    )}
                  </p>
                </div>
              ),
            )}
          </div>
        </section>

        <section className="rounded-[26px] bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)]">
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
            Como foi a venda?
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                setTipoVenda(
                  "AVISTA",
                )
              }
              className={`rounded-[18px] border p-4 text-left transition ${
                tipoVenda ===
                "AVISTA"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              <Banknote
                size={19}
              />

              <p className="mt-3 text-[11px] font-black">
                À vista
              </p>

              <p className="mt-1 text-[8px] leading-4 opacity-70">
                PIX, dinheiro ou cartão.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setTipoVenda(
                  "CREDIARIO",
                )
              }
              className={`rounded-[18px] border p-4 text-left transition ${
                tipoVenda ===
                "CREDIARIO"
                  ? "border-amber-400 bg-amber-50 text-amber-800"
                  : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              <WalletCards
                size={19}
              />

              <p className="mt-3 text-[11px] font-black">
                Crediário
              </p>

              <p className="mt-1 text-[8px] leading-4 opacity-70">
                Entrada + parcelas.
              </p>
            </button>
          </div>
        </section>

        {tipoVenda ===
        "AVISTA" ? (
          <section className="rounded-[26px] bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)]">
            <label className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
              Forma de pagamento
            </label>

            <select
              name="forma_pagamento"
              defaultValue="PIX"
              required
              className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 bg-white px-4 text-[11px] font-black outline-none focus:border-emerald-400"
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

            <div className="mt-4 rounded-[18px] bg-emerald-50 p-4">
              <p className="text-[8px] font-black uppercase tracking-[0.13em] text-emerald-700">
                Valor recebido
              </p>

              <p className="mt-1 text-[22px] font-black text-emerald-800">
                {moeda(
                  valorTotal,
                )}
              </p>
            </div>
          </section>
        ) : (
          <section className="rounded-[26px] border border-amber-100 bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)]">
            <div className="flex items-center gap-2">
              <Landmark
                size={18}
                className="text-amber-700"
              />

              <h3 className="text-[14px] font-black">
                Condições do crediário
              </h3>
            </div>

            <label className="mt-5 block text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
              Entrada
            </label>

            <input
              name="valor_entrada"
              inputMode="decimal"
              value={entrada}
              onChange={(
                event,
              ) =>
                setEntrada(
                  event.target
                    .value,
                )
              }
              placeholder="0,00"
              className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 px-4 text-[12px] font-black outline-none focus:border-amber-400"
            />

            <label className="mt-4 block text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
              Forma da entrada
            </label>

            <select
              name="forma_pagamento"
              defaultValue="PIX"
              className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 bg-white px-4 text-[11px] font-black outline-none focus:border-amber-400"
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

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Parcelas
                </label>

                <input
                  type="number"
                  name="quantidade_parcelas"
                  min={1}
                  max={120}
                  defaultValue={4}
                  required
                  className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 px-4 text-[12px] font-black outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                  1º vencimento
                </label>

                <input
                  type="date"
                  name="primeiro_vencimento"
                  defaultValue={
                    primeiroVencimento
                  }
                  required
                  className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 px-3 text-[10px] font-black outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Resumo
                label="Entrada"
                valor={moeda(
                  entradaNumero,
                )}
              />

              <Resumo
                label="A financiar"
                valor={moeda(
                  financiado,
                )}
                destaque
              />
            </div>

            <p className="mt-3 text-[8px] leading-4 text-slate-400">
              O sistema validará automaticamente atrasos e bloqueios de crédito antes de gerar o contrato.
            </p>
          </section>
        )}

        <section className="rounded-[26px] bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)]">
          <label className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
            Observação
          </label>

          <input
            name="observacao"
            placeholder="Opcional"
            className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 px-4 text-[11px] font-semibold outline-none focus:border-emerald-500"
          />
        </section>

        <button
          type="submit"
          disabled={
            pending ||
            (
              tipoVenda ===
                "CREDIARIO" &&
              financiado <= 0
            )
          }
          className="flex h-[58px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#176f3c] text-[11px] font-black text-white shadow-[0_14px_30px_rgba(23,111,60,0.18)] disabled:opacity-40"
        >
          <Save
            size={18}
          />

          {pending
            ? "Registrando venda..."
            : tipoVenda ===
                "AVISTA"
              ? "Confirmar venda à vista"
              : "Gerar crediário"}
        </button>
      </form>

      {modal &&
        state.message && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">
            <div className="w-full max-w-[400px] rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.28)]">
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

              <p className="mt-5 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
                {state.success
                  ? "Venda registrada"
                  : "Venda não concluída"}
              </p>

              <h3 className="mt-2 text-[21px] font-black">
                {state.success
                  ? state.codigo ??
                    "Venda confirmada"
                  : "Verifique os dados"}
              </h3>

              <p className="mt-3 text-[10px] leading-5 text-slate-500">
                {state.message}
              </p>

              {state.success &&
                state.valorTotal !==
                  null && (
                  <div className="mt-5 rounded-[18px] bg-emerald-50 p-4">
                    <p className="text-[8px] font-black uppercase tracking-[0.13em] text-emerald-700">
                      Valor da venda
                    </p>

                    <p className="mt-1 text-[23px] font-black text-emerald-800">
                      {moeda(
                        state.valorTotal,
                      )}
                    </p>

                    {state.contratoCodigo && (
                      <p className="mt-2 text-[9px] font-bold text-emerald-700">
                        Contrato {state.contratoCodigo}
                      </p>
                    )}
                  </div>
                )}

              {state.success ? (
                <Link
                  href="/mobile/rota"
                  className="mt-6 flex h-[50px] w-full items-center justify-center rounded-[16px] bg-[#176f3c] text-[10px] font-black text-white"
                >
                  Continuar minha rota
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setModal(
                      false,
                    )
                  }
                  className="mt-6 h-[50px] w-full rounded-[16px] bg-[#176f3c] text-[10px] font-black text-white"
                >
                  Entendi
                </button>
              )}
            </div>
          </div>
        )}
    </>
  );
}

function Resumo({
  label,
  valor,
  destaque = false,
}: {
  label: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-[16px] p-3 ${
        destaque
          ? "bg-amber-50"
          : "bg-[#f6f9f6]"
      }`}
    >
      <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-[15px] font-black ${
          destaque
            ? "text-amber-800"
            : ""
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
