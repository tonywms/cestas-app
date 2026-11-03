"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { estornarMovimentoFinanceiro } from "./actions";

/* V70_1_ESTORNOS_DENSIDADE */
/* V71_FINANCEIRO_LEAST_PRIVILEGE */

type Movimento = {
  tipo_origem: "PAGAMENTO_PARCELA" | "RECEBIMENTO_CLIENTE";
  origem_id: number;
  cliente_id: number;
  cliente_nome: string;
  cliente_codigo: string;
  valor: number;
  forma_pagamento: string;
  recebido_por_original: string;
  recebido_por_nome: string | null;
  origem_created_at: string;
  referencia: string;
  fechamento_protegido: boolean;
};

const inicial = {
  success: false,
  message: "",
  estornoId: null as number | null,
};

function moeda(valor: unknown) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor ?? 0));
}

function dataHora(valor: string) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleString("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formaLabel(valor: string) {
  if (valor === "DINHEIRO") return "Dinheiro";
  if (valor === "PIX") return "PIX";
  if (valor === "CARTAO") return "Cartão";
  if (valor === "TRANSFERENCIA") return "Transferência";
  return "Outro";
}

function tipoLabel(valor: Movimento["tipo_origem"]) {
  return valor === "RECEBIMENTO_CLIENTE"
    ? "Recebimento do cliente"
    : "Pagamento de parcela";
}

export default function EstornoFinanceiroClient({
  movimentos,
  podeEstornar,
}: {
  movimentos: Movimento[];
  podeEstornar: boolean;
}) {
  const router = useRouter();
  const [selecionado, setSelecionado] = useState<Movimento | null>(null);
  const [motivo, setMotivo] = useState("");
  const [chave, setChave] = useState("");
  const [estado, formAction, pending] = useActionState(
    estornarMovimentoFinanceiro,
    inicial,
  );

  useEffect(() => {
    if (estado.success) {
      setSelecionado(null);
      setMotivo("");
      setChave("");
      router.refresh();
    }
  }, [estado.success, estado.estornoId, router]);

  const podeConfirmar = useMemo(
    () =>
      Boolean(
        podeEstornar &&
          selecionado &&
          !selecionado.fechamento_protegido &&
          motivo.trim().length >= 10 &&
          chave,
      ),
    [podeEstornar, selecionado, motivo, chave],
  );

  function abrir(movimento: Movimento) {
    setSelecionado(movimento);
    setMotivo("");
    setChave(
      typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "",
    );
  }

  return (
    <>
      {estado.message ? (
        <div
          className={`mb-3 flex items-start gap-3 rounded-[16px] border px-4 py-3 text-[12px] font-bold ${
            estado.success
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {estado.success ? (
            <CheckCircle2 className="mt-0.5 shrink-0" size={17} />
          ) : (
            <AlertTriangle className="mt-0.5 shrink-0" size={17} />
          )}
          <span className="min-w-0 break-words">{estado.message}</span>
        </div>
      ) : null}

      {movimentos.length === 0 ? (
        <div className="rounded-[20px] border border-emerald-100 bg-white p-6 text-center shadow-[0_10px_28px_rgba(18,63,34,0.05)]">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700">
            <ReceiptText size={20} />
          </div>
          <h3 className="mt-3 text-[17px] font-black">
            Nenhum movimento encontrado
          </h3>
          <p className="mx-auto mt-1 max-w-xl text-[12px] leading-5 text-slate-500">
            Ajuste os filtros ou aguarde novos recebimentos elegíveis para
            estorno.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {movimentos.map((movimento) => (
            <article
              key={`${movimento.tipo_origem}-${movimento.origem_id}`}
              className="flex min-w-0 flex-col rounded-[20px] border border-black/[0.05] bg-white p-4 shadow-[0_10px_28px_rgba(18,63,34,0.055)]"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[9px] font-black uppercase tracking-[0.12em] text-[#b07a12]">
                    {tipoLabel(movimento.tipo_origem)}
                  </p>
                  <h3
                    title={movimento.cliente_nome}
                    className="mt-1 truncate text-[16px] font-black tracking-[-0.02em]"
                  >
                    {movimento.cliente_nome}
                  </h3>
                  <p
                    title={`${movimento.cliente_codigo} • ${movimento.referencia}`}
                    className="mt-0.5 truncate text-[10px] font-bold text-slate-400"
                  >
                    {movimento.cliente_codigo} • {movimento.referencia}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[18px] font-black tracking-[-0.025em] text-emerald-800">
                    {moeda(movimento.valor)}
                  </p>
                  <p className="mt-0.5 text-[9px] font-black text-slate-400">
                    {formaLabel(movimento.forma_pagamento)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex min-w-0 flex-wrap gap-1.5 text-[10px] font-bold text-slate-500">
                <span className="flex min-w-0 max-w-full items-center gap-1 rounded-full bg-[#f5f8f6] px-2.5 py-1.5">
                  <UserRound size={12} className="shrink-0 text-emerald-700" />
                  <span className="truncate">
                    {movimento.recebido_por_nome ?? "Usuário"}
                  </span>
                </span>
                <span className="flex items-center gap-1 rounded-full bg-[#f5f8f6] px-2.5 py-1.5">
                  <Clock3 size={12} className="shrink-0 text-emerald-700" />
                  {dataHora(movimento.origem_created_at)}
                </span>
              </div>

              {movimento.fechamento_protegido ? (
                <div className="mt-3 flex min-w-0 items-center gap-2 rounded-[13px] border border-amber-200 bg-amber-50 px-3 py-2">
                  <LockKeyhole
                    className="shrink-0 text-amber-700"
                    size={14}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-black text-amber-900">
                      Prestação de contas protegida
                    </p>
                    <p className="truncate text-[9px] text-amber-800/70">
                      Reabra o período antes do estorno.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-[13px] border border-emerald-100 bg-emerald-50/65 px-3 py-2 text-[10px] font-bold text-emerald-800">
                  Movimento liberado para revisão do estorno.
                </div>
              )}

              <div className="mt-3">
                {movimento.fechamento_protegido ? (
                  <Link
                    href="/admin/financeiro/fechamento"
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-[13px] border border-amber-300 bg-amber-50 px-3 text-[10px] font-black text-amber-800 transition hover:bg-amber-100"
                  >
                    <LockKeyhole size={14} />
                    Abrir fechamento diário
                  </Link>
                ) : podeEstornar ? (
                  <button
                    type="button"
                    onClick={() => abrir(movimento)}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-[13px] bg-[linear-gradient(135deg,#d97706,#b45309)] px-3 text-[10px] font-black text-white shadow-[0_9px_20px_rgba(180,83,9,0.16)] transition hover:brightness-[1.04]"
                  >
                    <RotateCcw size={14} />
                    Revisar estorno
                  </button>
                ) : (
                  <div className="flex h-10 w-full items-center justify-center gap-2 rounded-[13px] border border-slate-200 bg-slate-50 px-3 text-[10px] font-black text-slate-500">
                    <ShieldCheck size={14} />
                    Somente auditoria
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {selecionado ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#071c10]/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-estorno-v70"
            className="w-full max-w-[600px] overflow-hidden rounded-[26px] bg-white shadow-[0_30px_90px_rgba(5,31,17,0.32)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#c66b0a]">
                  Confirmação financeira
                </p>
                <h2
                  id="titulo-estorno-v70"
                  className="mt-1 text-[22px] font-black tracking-[-0.04em]"
                >
                  Estornar este recebimento?
                </h2>
                <p className="mt-1.5 max-w-lg text-[11px] leading-5 text-slate-500">
                  O lançamento original será preservado. O sistema registrará
                  uma compensação auditável e recalculará a carteira.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelecionado(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X size={17} />
              </button>
            </div>

            <form action={formAction} className="p-5 sm:p-6">
              <input type="hidden" name="tipo_origem" value={selecionado.tipo_origem} />
              <input type="hidden" name="origem_id" value={selecionado.origem_id} />
              <input type="hidden" name="chave_operacao" value={chave} />

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="min-w-0 rounded-[15px] bg-[#f5f8f6] p-3.5">
                  <p className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">
                    Cliente
                  </p>
                  <p className="mt-1 truncate text-[12px] font-black">
                    {selecionado.cliente_nome}
                  </p>
                </div>
                <div className="min-w-0 rounded-[15px] bg-amber-50 p-3.5">
                  <p className="text-[8px] font-black uppercase tracking-[0.1em] text-amber-700/60">
                    Valor a estornar
                  </p>
                  <p className="mt-1 text-[17px] font-black text-amber-800">
                    {moeda(selecionado.valor)}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="motivo-estorno-v70"
                  className="text-[9px] font-black uppercase tracking-[0.11em] text-slate-500"
                >
                  Motivo obrigatório
                </label>
                <textarea
                  id="motivo-estorno-v70"
                  name="motivo"
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="Ex.: recebimento registrado com valor incorreto; operação será refeita."
                  className="mt-2 min-h-[108px] w-full resize-none rounded-[16px] border border-amber-300 bg-white px-4 py-3 text-[12px] font-semibold leading-5 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                />
                <div className="mt-1.5 flex items-center justify-between gap-3 text-[9px] font-bold">
                  <span
                    className={
                      motivo.trim().length >= 10
                        ? "text-emerald-700"
                        : "text-slate-400"
                    }
                  >
                    {motivo.trim().length >= 10
                      ? "Justificativa pronta para auditoria."
                      : "Mínimo de 10 caracteres."}
                  </span>
                  <span className="shrink-0 text-slate-400">
                    {motivo.length}/500
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-[15px] border border-emerald-100 bg-emerald-50/70 px-3.5 py-2.5 text-[10px] leading-5 text-emerald-900/75">
                Nenhum pagamento original será apagado. O estorno ficará
                vinculado à auditoria, ao responsável e ao movimento de origem.
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSelecionado(null)}
                  className="flex h-11 items-center justify-center rounded-[14px] border border-slate-200 bg-white px-4 text-[11px] font-black text-slate-600"
                >
                  Voltar e revisar
                </button>
                <button
                  type="submit"
                  disabled={!podeConfirmar || pending}
                  className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#d97706,#b45309)] px-4 text-[11px] font-black text-white shadow-[0_10px_22px_rgba(180,83,9,0.17)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <RotateCcw size={15} />
                  {pending ? "Processando..." : "Confirmar estorno"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
