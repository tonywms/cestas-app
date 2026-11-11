"use client";

import RegistrarLocalizacaoEventoV120 from "@/components/mobile/RegistrarLocalizacaoEventoV120";
// V64_RECEBIMENTO_IDEMPOTENTE

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
  recebimentoId:
    null as number | null,
  valorRecebido:
    null as number | null,
  formaPagamento:
    null as string | null,
  saldoAntes:
    null as number | null,
  saldoDepois:
    null as number | null,
  parcelasAfetadas: 0,
  parcelasQuitadas: 0,
  parcelasParciais: 0,
  proximaVisita:
    null as string | null,
  cobrancaRotaConcluida:
    false,
  idempotente: false,
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
  modalidade:
    "PARCELADO" |
    "SALDO_ABERTO";
  proximaVisita:
    string | null;
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

function dataBR(
  data:
    string | null,
) {
  if (!data) {
    return "—";
  }

  const [
    ano,
    mes,
    dia,
  ] =
    data.split("-");

  if (
    !ano ||
    !mes ||
    !dia
  ) {
    return data;
  }

  return `${dia}/${mes}/${ano}`;
}

function formaLabel(
  forma:
    string | null,
) {
  if (
    forma ===
    "DINHEIRO"
  ) {
    return "Dinheiro";
  }

  if (
    forma ===
    "CARTAO"
  ) {
    return "Cartão";
  }

  if (
    forma ===
    "TRANSFERENCIA"
  ) {
    return "Transferência";
  }

  if (
    forma ===
    "OUTRO"
  ) {
    return "Outro";
  }

  return "PIX";
}

export default function RecebimentoForm({
  clienteId,
  parcelas,
  rotaClienteId = null,
  chaveOperacaoInicial,
}: {
  clienteId:
    number;

  parcelas:
    Parcela[];

  rotaClienteId?:
    number | null;

  chaveOperacaoInicial:
    string;
}) {
  const [
    state,
    formAction,
    pending,
  ] =
    useActionState(
      registrarRecebimento,
      initialState,
    );

  const saldoTotal =
    useMemo(
      () =>
        parcelas.reduce(
          (
            total,
            item,
          ) =>
            total +
            Math.max(
              0,
              item.saldo,
            ),
          0,
        ),
      [
        parcelas,
      ],
    );

  const cobrancaMaisAntiga =
    parcelas[0] ??
    null;

  const vencidas =
    parcelas.filter(
      (
        item,
      ) =>
        item.vencida,
    ).length;

  const [
    valor,
    setValor,
  ] =
    useState("");

  const [
    modal,
    setModal,
  ] =
    useState(
      false,
    );

  const valorNumero =
    Number(
      String(
        valor,
      )
        .replace(",", "."),
    );

  const valorValido =
    Number.isFinite(
      valorNumero,
    ) &&
    valorNumero > 0 &&
    valorNumero <=
      saldoTotal;

  const saldoDepoisPreview =
    valorValido
      ? Math.max(
          0,
          saldoTotal -
            valorNumero,
        )
      : saldoTotal;

  const sugestoes =
    [
      50,
      100,
      saldoTotal,
    ]
      .filter(
        (
          item,
          index,
          lista,
        ) =>
          item > 0 &&
          item <=
            saldoTotal &&
          lista.indexOf(
            item,
          ) ===
            index,
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
    parcelas.length ===
    0
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

        <input
          type="hidden"
          name="rota_cliente_id"
          value={
            rotaClienteId ??
            ""
          }
        />

        <input
          type="hidden"
          name="chave_operacao"
          value={
            chaveOperacaoInicial
          }
        />

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
                Carteira do cliente
              </p>

              <h2 className="mt-1 text-[18px] font-black tracking-[-0.035em]">
                {moeda(
                  saldoTotal,
                )} em aberto
              </h2>

              <p className="mt-1 text-[9px] leading-4 text-slate-500">
                Informe quanto o cliente pagou. O sistema aplica automaticamente nas cobranças mais antigas.
              </p>

            </div>

          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">

            <MicroInfo
              icon={
                <ReceiptText
                  size={12}
                />
              }
              label="Abertas"
              valor={
                String(
                  parcelas.length,
                )
              }
              alerta={
                vencidas >
                0
              }
            />

            <MicroInfo
              icon={
                <CalendarDays
                  size={12}
                />
              }
              label="Próxima"
              valor={
                cobrancaMaisAntiga
                  ? dataBR(
                      cobrancaMaisAntiga.vencimento,
                    )
                  : "—"
              }
              alerta={
                Boolean(
                  cobrancaMaisAntiga
                    ?.vencida,
                )
              }
            />

            <MicroInfo
              icon={
                <Coins
                  size={12}
                />
              }
              label="Saldo"
              valor={
                moeda(
                  saldoTotal,
                )
              }
            />

          </div>

          {cobrancaMaisAntiga && (
            <div className="mt-3 rounded-[16px] border border-slate-100 bg-white/90 px-3.5 py-3">

              <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">
                Aplicação automática
              </p>

              <p className="mt-1 text-[10px] font-black text-slate-700">
                {cobrancaMaisAntiga.modalidade ===
                "SALDO_ABERTO"
                  ? `${cobrancaMaisAntiga.contratoCodigo} • saldo flexível`
                  : `${cobrancaMaisAntiga.contratoCodigo} • parcela ${cobrancaMaisAntiga.numero}`}
              </p>

              <p className="mt-1 text-[8px] leading-4 text-slate-400">
                Primeiro saldo: {moeda(cobrancaMaisAntiga.saldo)}. Se o valor recebido ultrapassar este saldo, o restante será aplicado na próxima cobrança.
              </p>

            </div>
          )}

        </section>

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
                Recebimento
              </p>

              <h2 className="mt-1 text-[18px] font-black tracking-[-0.035em]">
                Quanto recebeu?
              </h2>

            </div>

          </div>

          <label className="mt-5 block text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
            Valor recebido nesta visita
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
                saldoTotal
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
              placeholder="Ex.: 50,00"
              required
              className="h-[56px] w-full rounded-[17px] border border-slate-200 bg-white pl-11 pr-4 text-[15px] font-black outline-none focus:border-emerald-400"
            />

          </div>

          <div className="mt-2 flex flex-wrap gap-2">

            {sugestoes.map(
              (
                sugestao,
              ) => (
                <button
                  key={
                    sugestao
                  }
                  type="button"
                  onClick={() =>
                    setValor(
                      sugestao.toFixed(
                        2,
                      ),
                    )
                  }
                  className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-[9px] font-black text-emerald-700"
                >
                  {sugestao ===
                  saldoTotal
                    ? `Quitar ${moeda(sugestao)}`
                    : moeda(sugestao)}
                </button>
              ),
            )}

          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">

            <div className="rounded-[16px] bg-slate-50 p-3">

              <p className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
                Saldo antes
              </p>

              <p className="mt-1 text-[14px] font-black">
                {moeda(
                  saldoTotal,
                )}
              </p>

            </div>

            <div className="rounded-[16px] bg-emerald-50 p-3">

              <p className="text-[7px] font-black uppercase tracking-[0.1em] text-emerald-600">
                Saldo após receber
              </p>

              <p className="mt-1 text-[14px] font-black text-emerald-700">
                {moeda(
                  saldoDepoisPreview,
                )}
              </p>

            </div>

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
              pending ||
              !valorValido
            }
            className="mt-5 flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#1f8a4c,#0d5d31)] text-[13px] font-black text-white shadow-[0_16px_30px_rgba(23,111,60,0.30)] transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40"
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
                  ? "Recebimento confirmado"
                  : "Recebimento não concluído"}

              </p>

              <h3 className="mt-2 text-[21px] font-black tracking-[-0.035em]">

                {state.success
                  ? state.saldoDepois ===
                    0
                    ? "Dívida quitada"
                    : "Saldo atualizado"
                  : "Verifique o recebimento"}

              </h3>

              <p className="mt-3 text-[11px] leading-5 text-slate-500">
                {
                  state.message
                }
              </p>


              {state.success && state.recebimentoId && (
                <RegistrarLocalizacaoEventoV120 tipo="COBRANCA" eventoId={state.recebimentoId} />
              )}

              {state.success && (
                <div className="mt-5 space-y-3 text-left">

                  <div className="rounded-[20px] border border-emerald-100 bg-emerald-50 p-4">

                    <div className="flex items-center justify-between gap-3">

                      <div>

                        <p className="text-[7px] font-black uppercase tracking-[0.12em] text-emerald-600">
                          Recebido
                        </p>

                        <p className="mt-1 text-[20px] font-black text-emerald-800">
                          {moeda(
                            state.valorRecebido ??
                            0,
                          )}
                        </p>

                      </div>

                      <div className="text-right">

                        <p className="text-[7px] font-black uppercase tracking-[0.12em] text-emerald-600">
                          Forma
                        </p>

                        <p className="mt-1 text-[11px] font-black text-emerald-800">
                          {formaLabel(
                            state.formaPagamento,
                          )}
                        </p>

                      </div>

                    </div>

                    {state.recebimentoId && (
                      <p className="mt-3 border-t border-emerald-100 pt-3 text-[8px] font-black text-emerald-700/70">
                        Comprovante REC-{String(
                          state.recebimentoId,
                        ).padStart(
                          6,
                          "0",
                        )}
                      </p>
                    )}

                  </div>

                  {state.saldoAntes !==
                    null &&
                    state.saldoDepois !==
                    null && (
                    <div className="grid grid-cols-2 gap-3">

                      <div className="rounded-[18px] border border-slate-100 bg-white p-4">

                        <p className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
                          Saldo antes
                        </p>

                        <p className="mt-2 text-[17px] font-black">
                          {moeda(
                            state.saldoAntes,
                          )}
                        </p>

                      </div>

                      <div className="rounded-[18px] border border-emerald-100 bg-emerald-50 p-4">

                        <p className="text-[8px] font-black uppercase tracking-[0.12em] text-emerald-600">
                          Saldo agora
                        </p>

                        <p className="mt-2 text-[17px] font-black text-emerald-700">
                          {moeda(
                            state.saldoDepois,
                          )}
                        </p>

                      </div>

                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">

                    <MicroInfo
                      icon={
                        <ReceiptText
                          size={12}
                        />
                      }
                      label="Afetadas"
                      valor={
                        String(
                          state.parcelasAfetadas,
                        )
                      }
                    />

                    <MicroInfo
                      icon={
                        <CheckCircle2
                          size={12}
                        />
                      }
                      label="Quitadas"
                      valor={
                        String(
                          state.parcelasQuitadas,
                        )
                      }
                    />

                    <MicroInfo
                      icon={
                        <Coins
                          size={12}
                        />
                      }
                      label="Parciais"
                      valor={
                        String(
                          state.parcelasParciais,
                        )
                      }
                    />

                  </div>

                  {state.proximaVisita && (
                    <div className="rounded-[18px] border border-sky-100 bg-sky-50 p-4">

                      <p className="text-[8px] font-black uppercase tracking-[0.12em] text-sky-700">
                        Próxima visita sugerida
                      </p>

                      <p className="mt-1 text-[16px] font-black text-sky-900">
                        {dataBR(
                          state.proximaVisita,
                        )}
                      </p>

                    </div>
                  )}

                </div>
              )}

              {state.success ? (
                <Link
                  href={
                    rotaClienteId
                      ? "/mobile/rota"
                      : "/mobile/recebimentos"
                  }
                  className="mt-6 flex h-[52px] items-center justify-center rounded-[16px] bg-[#176f3c] text-xs font-black text-white"
                >
                  {rotaClienteId
                    ? "Continuar minha rota"
                    : "Continuar recebimentos"}
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
                  Corrigir valor
                </button>
              )}

            </div>

          </div>

        </div>
      )}

    </>
  );
}

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
