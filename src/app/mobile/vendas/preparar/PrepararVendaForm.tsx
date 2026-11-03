"use client";

import {
  Banknote,
  Landmark,
  Save,
  WalletCards,
} from "lucide-react";
import {
  useActionState,
  useMemo,
  useState,
} from "react";

import {
  prepararVendaCampo,
} from "./actions";

type OpcaoCesta = {
  id: number;
  codigo: string;
  nome: string;
  valorVenda: number;
  saldo: number;
};

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

export default function PrepararVendaForm({
  rotaClienteId,
  opcoes,
  primeiroVencimento,
  proximaEtapa,
}: {
  rotaClienteId: number;
  opcoes: OpcaoCesta[];
  primeiroVencimento: string;
  proximaEtapa:
    | "BIPAGEM"
    | "CONFIRMACAO";
}) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    prepararVendaCampo,
    initialState,
  );

  const [
    tipoId,
    setTipoId,
  ] = useState(
    String(
      opcoes[0]?.id ??
        "",
    ),
  );

  const [
    quantidade,
    setQuantidade,
  ] = useState(1);

  const [
    tipoVenda,
    setTipoVenda,
  ] = useState<
    "AVISTA" |
    "SALDO_ABERTO" |
    "CREDIARIO"
  >("AVISTA");

  const [
    entrada,
    setEntrada,
  ] = useState("0");

  const opcao =
    useMemo(
      () =>
        opcoes.find(
          (item) =>
            String(
              item.id,
            ) ===
            tipoId,
        ) ??
        opcoes[0],
      [
        opcoes,
        tipoId,
      ],
    );

  const valorTotal =
    (
      opcao
        ?.valorVenda ??
      0
    ) *
    quantidade;

  const entradaNumero =
    useMemo(
      () => {
        const texto =
          entrada.trim();

        if (!texto) {
          return 0;
        }

        const valor =
          Number(
            texto.includes(",")
              ? texto
                  .replaceAll(
                    ".",
                    "",
                  )
                  .replace(
                    ",",
                    ".",
                  )
              : texto,
          );

        return Number.isFinite(
          valor,
        )
          ? valor
          : 0;
      },
      [
        entrada,
      ],
    );

  const saldo =
    Math.max(
      0,
      valorTotal -
        (
          tipoVenda ===
          "AVISTA"
            ? valorTotal
            : entradaNumero
        ),
    );

  return (
    <form
      action={formAction}
      className="space-y-4"
    >
      <input
        type="hidden"
        name="rota_cliente_id"
        value={rotaClienteId}
      />

      <input
        type="hidden"
        name="tipo_venda"
        value={tipoVenda}
      />

      <section className="rounded-[26px] bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)]">
        <label className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
          Tipo de cesta
        </label>

        <select
          name="tipo_cesta_id"
          value={tipoId}
          onChange={(
            event,
          ) => {
            setTipoId(
              event.target
                .value,
            );
            setQuantidade(
              1,
            );
          }}
          required
          className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 bg-white px-4 text-[11px] font-black outline-none focus:border-emerald-400"
        >
          {opcoes.map(
            (item) => (
              <option
                key={
                  item.id
                }
                value={
                  item.id
                }
              >
                {item.nome} • {moeda(item.valorVenda)} • saldo {item.saldo}
              </option>
            ),
          )}
        </select>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div>
            <label className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
              Quantidade
            </label>
            <input
              type="number"
              name="quantidade"
              min={1}
              max={
                opcao?.saldo ??
                1
              }
              value={
                quantidade
              }
              onChange={(
                event,
              ) =>
                setQuantidade(
                  Math.max(
                    1,
                    Math.min(
                      Number(
                        event
                          .target
                          .value,
                      ) ||
                        1,
                      opcao
                        ?.saldo ??
                        1,
                    ),
                  ),
                )
              }
              required
              className="mt-2 h-[52px] w-full rounded-[15px] border border-slate-200 px-4 text-[12px] font-black outline-none focus:border-emerald-400"
            />
          </div>

          <div className="rounded-[16px] bg-emerald-50 p-3.5">
            <p className="text-[7px] font-black uppercase tracking-[0.1em] text-emerald-700">
              Valor da venda
            </p>
            <p className="mt-2 text-[17px] font-black text-emerald-800">
              {moeda(
                valorTotal,
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[26px] bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)]">
        <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
          Como será a venda?
        </p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() =>
              setTipoVenda(
                "AVISTA",
              )
            }
            className={`rounded-[18px] border p-3 text-left transition ${
              tipoVenda ===
              "AVISTA"
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <Banknote
              size={18}
            />
            <p className="mt-3 text-[10px] font-black">
              À vista
            </p>
            <p className="mt-1 text-[7px] leading-4 opacity-70">
              Recebe tudo.
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setTipoVenda(
                "SALDO_ABERTO",
              )
            }
            className={`rounded-[18px] border p-3 text-left transition ${
              tipoVenda ===
              "SALDO_ABERTO"
                ? "border-sky-400 bg-sky-50 text-sky-800"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <WalletCards
              size={18}
            />
            <p className="mt-3 text-[9px] font-black">
              Saldo aberto
            </p>
            <p className="mt-1 text-[7px] leading-4 opacity-70">
              Pagamentos livres.
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setTipoVenda(
                "CREDIARIO",
              )
            }
            className={`rounded-[18px] border p-3 text-left transition ${
              tipoVenda ===
              "CREDIARIO"
                ? "border-amber-400 bg-amber-50 text-amber-800"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <Landmark
              size={18}
            />
            <p className="mt-3 text-[9px] font-black">
              Parcelado
            </p>
            <p className="mt-1 text-[7px] leading-4 opacity-70">
              Parcelas fixas.
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
              Recebimento combinado
            </p>
            <p className="mt-1 text-[22px] font-black text-emerald-800">
              {moeda(
                valorTotal,
              )}
            </p>
          </div>
        </section>
      ) : (
        <section
          className={`rounded-[26px] border bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)] ${
            tipoVenda ===
            "SALDO_ABERTO"
              ? "border-sky-100"
              : "border-amber-100"
          }`}
        >
          <h3 className="text-[14px] font-black">
            {tipoVenda ===
            "SALDO_ABERTO"
              ? "Condições do saldo em aberto"
              : "Condições do parcelado"}
          </h3>

          <label className="mt-5 block text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
            Recebido agora
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
            className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 px-4 text-[12px] font-black outline-none focus:border-sky-400"
          />

          <label className="mt-4 block text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
            Forma do valor recebido
          </label>
          <select
            name="forma_pagamento"
            defaultValue="PIX"
            className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 bg-white px-4 text-[11px] font-black outline-none focus:border-sky-400"
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

          {tipoVenda ===
            "CREDIARIO" && (
            <div className="mt-4">
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
          )}

          <label className="mt-4 block text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
            {tipoVenda ===
            "SALDO_ABERTO"
              ? "Próxima visita sugerida"
              : "1º vencimento"}
          </label>
          <input
            type="date"
            name="primeiro_vencimento"
            defaultValue={
              primeiroVencimento
            }
            required
            className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 px-4 text-[10px] font-black outline-none focus:border-sky-400"
          />

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Resumo
              label="Recebido agora"
              valor={moeda(
                entradaNumero,
              )}
            />
            <Resumo
              label="Saldo depois"
              valor={moeda(
                saldo,
              )}
              destaque
            />
          </div>
        </section>
      )}

      <section className="rounded-[26px] bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)]">
        <label className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
          Observação
        </label>
        <input
          name="observacao"
          placeholder="Opcional"
          className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 px-4 text-[11px] font-semibold outline-none focus:border-emerald-400"
        />
      </section>

      {state.message && (
        <div className="rounded-[18px] border border-red-200 bg-red-50 p-4 text-[10px] font-bold leading-5 text-red-700">
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={
          pending ||
          !opcao ||
          valorTotal <= 0
        }
        className="flex h-[58px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#176f3c] text-[11px] font-black text-white shadow-[0_14px_30px_rgba(23,111,60,0.18)] disabled:opacity-40"
      >
        <Save
          size={18}
        />
        {pending
          ? "Salvando operação..."
          : proximaEtapa ===
              "BIPAGEM"
            ? "Salvar e ir para bipagem"
            : "Salvar e confirmar entrega"}
      </button>
    </form>
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
          ? "bg-sky-50"
          : "bg-[#f6f9f6]"
      }`}
    >
      <p className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-[15px] font-black ${
          destaque
            ? "text-sky-800"
            : ""
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
