"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Save,
} from "lucide-react";
import { useMemo, useState } from "react";

import { salvarFechamento } from "./actions";

type Props = {
  entregadorId: string;
  dataInicio: string;
  dataFim: string;
  esperado: {
    dinheiro: number;
    pix: number;
    cartao: number;
    transferencia: number;
    outro: number;
    total: number;
  };
  inicial?: {
    dinheiro: number;
    pix: number;
    cartao: number;
    transferencia: number;
    outro: number;
    observacao: string;
  } | null;
};

function numero(valor: string) {
  const convertido = Number(valor.replace(",", "."));
  return Number.isFinite(convertido) ? convertido : 0;
}

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function inicialValor(valorSalvo: number | undefined, esperado: number) {
  return String(
    valorSalvo === undefined
      ? esperado.toFixed(2)
      : Number(valorSalvo).toFixed(2),
  );
}

export default function ConferenciaForm({
  entregadorId,
  dataInicio,
  dataFim,
  esperado,
  inicial,
}: Props) {
  const [dinheiro, setDinheiro] = useState(
    inicialValor(inicial?.dinheiro, esperado.dinheiro),
  );
  const [pix, setPix] = useState(
    inicialValor(inicial?.pix, esperado.pix),
  );
  const [cartao, setCartao] = useState(
    inicialValor(inicial?.cartao, esperado.cartao),
  );
  const [transferencia, setTransferencia] = useState(
    inicialValor(inicial?.transferencia, esperado.transferencia),
  );
  const [outro, setOutro] = useState(
    inicialValor(inicial?.outro, esperado.outro),
  );

  const totalConferido = useMemo(
    () =>
      numero(dinheiro) +
      numero(pix) +
      numero(cartao) +
      numero(transferencia) +
      numero(outro),
    [dinheiro, pix, cartao, transferencia, outro],
  );

  const diferenca = totalConferido - esperado.total;
  const conferido = Math.abs(diferenca) < 0.01;

  return (
    <form action={salvarFechamento}>
      <input type="hidden" name="entregador_id" value={entregadorId} />
      <input type="hidden" name="data_inicio" value={dataInicio} />
      <input type="hidden" name="data_fim" value={dataFim} />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Campo
          label="Dinheiro"
          esperado={esperado.dinheiro}
          valor={dinheiro}
          onChange={setDinheiro}
          name="dinheiro_conferido"
        />
        <Campo
          label="PIX"
          esperado={esperado.pix}
          valor={pix}
          onChange={setPix}
          name="pix_conferido"
        />
        <Campo
          label="Cartão"
          esperado={esperado.cartao}
          valor={cartao}
          onChange={setCartao}
          name="cartao_conferido"
        />
        <Campo
          label="Transferência"
          esperado={esperado.transferencia}
          valor={transferencia}
          onChange={setTransferencia}
          name="transferencia_conferida"
        />
        <Campo
          label="Outros"
          esperado={esperado.outro}
          valor={outro}
          onChange={setOutro}
          name="outro_conferido"
        />
      </div>

      <div
        className={
          conferido
            ? "mt-5 rounded-[22px] border border-emerald-200 bg-emerald-50 p-5"
            : "mt-5 rounded-[22px] border border-red-200 bg-red-50 p-5"
        }
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={
                conferido
                  ? "flex h-10 w-10 items-center justify-center rounded-[13px] bg-emerald-100 text-emerald-700"
                  : "flex h-10 w-10 items-center justify-center rounded-[13px] bg-red-100 text-red-700"
              }
            >
              {conferido ? (
                <CheckCircle2 size={18} />
              ) : (
                <AlertTriangle size={18} />
              )}
            </div>

            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Resultado da conferência
              </p>
              <p
                className={
                  conferido
                    ? "mt-1 text-[17px] font-black text-emerald-800"
                    : "mt-1 text-[17px] font-black text-red-700"
                }
              >
                {conferido ? "Valores conferem" : "Existe divergência"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-right">
            <Resumo label="Esperado" valor={esperado.total} />
            <Resumo label="Conferido" valor={totalConferido} />
            <Resumo label="Diferença" valor={diferenca} destaque={!conferido} />
          </div>
        </div>
      </div>

      <label className="mt-5 block">
        <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
          Observação
        </span>
        <textarea
          name="observacao"
          defaultValue={inicial?.observacao ?? ""}
          maxLength={1500}
          rows={4}
          placeholder="Informe justificativa em caso de diferença, ocorrência ou observação da prestação de contas."
          className="mt-2 w-full resize-none rounded-[18px] border border-slate-200 bg-white p-4 text-[10px] leading-5 outline-none focus:border-emerald-300"
        />
      </label>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          className="flex h-12 items-center gap-2 rounded-[15px] bg-[#176f3c] px-5 text-[9px] font-black text-white shadow-[0_10px_25px_rgba(23,111,60,0.18)]"
        >
          <Save size={15} />
          Salvar prestação de contas
        </button>
      </div>
    </form>
  );
}

function Campo({
  label,
  esperado,
  valor,
  onChange,
  name,
}: {
  label: string;
  esperado: number;
  valor: string;
  onChange: (valor: string) => void;
  name: string;
}) {
  return (
    <label className="rounded-[20px] border border-slate-100 bg-[#f8faf8] p-4">
      <span className="text-[7px] font-black uppercase tracking-[0.13em] text-slate-400">
        {label}
      </span>
      <p className="mt-1 text-[9px] text-slate-500">
        Esperado: <strong className="text-[#176f3c]">{moeda(esperado)}</strong>
      </p>
      <input
        type="number"
        min="0"
        step="0.01"
        name={name}
        value={valor}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 h-11 w-full rounded-[13px] border border-slate-200 bg-white px-3 text-[12px] font-black outline-none focus:border-emerald-300"
      />
    </label>
  );
}

function Resumo({
  label,
  valor,
  destaque = false,
}: {
  label: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div>
      <p className="text-[6px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p
        className={
          destaque
            ? "mt-1 whitespace-nowrap text-[12px] font-black text-red-700"
            : "mt-1 whitespace-nowrap text-[12px] font-black text-slate-800"
        }
      >
        {moeda(valor)}
      </p>
    </div>
  );
}
