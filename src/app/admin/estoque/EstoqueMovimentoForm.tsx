"use client";

import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  PackagePlus,
  RefreshCcw,
  Save,
  XCircle,
} from "lucide-react";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  registrarMovimentoEstoque,
  type EstoqueActionState,
} from "./actions";

type TipoEstoque = {
  id: number;
  codigo: string;
  nome: string;
  saldo: number;
  estoqueMinimo: number;
};

const initialState:
  EstoqueActionState = {
    success: false,
    message: "",
    saldoAnterior: null,
    saldoAtual: null,
  };

export default function EstoqueMovimentoForm({
  tipos,
  podeAjustar,
  onSuccess,
}: {
  tipos: TipoEstoque[];
  podeAjustar: boolean;
  onSuccess?: () => void;
}) {
  const [
    state,
    formAction,
    pending,
  ] =
    useActionState(
      registrarMovimentoEstoque,
      initialState,
    );

  const [
    modal,
    setModal,
  ] =
    useState(false);

  const [
    tipoId,
    setTipoId,
  ] =
    useState(
      tipos[0]?.id
        ? String(
            tipos[0].id,
          )
        : "",
    );

  const [
    movimento,
    setMovimento,
  ] =
    useState(
      "ENTRADA_CENTRAL",
    );

  useEffect(
    () => {
      if (
        state.message
      ) {
        setModal(true);
      }
    },
    [
      state,
    ],
  );

  const tipoSelecionado =
    useMemo(
      () =>
        tipos.find(
          (
            item,
          ) =>
            String(
              item.id,
            ) === tipoId,
        ) ??
        null,
      [
        tipos,
        tipoId,
      ],
    );

  if (
    tipos.length === 0
  ) {
    return (
      <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-8 text-center">
        <PackagePlus
          size={30}
          className="mx-auto text-emerald-700"
        />

        <h3 className="mt-4 text-sm font-black">
          Nenhum tipo de cesta
        </h3>

        <p className="mt-2 text-[10px] leading-5 text-slate-400">
          Cadastre um tipo de cesta antes de movimentar o estoque.
        </p>
      </div>
    );
  }

  return (
    <>
      <form
        action={
          formAction
        }
        className="space-y-4"
      >
        <div>
          <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
            Tipo de cesta
          </label>

          <select
            name="tipo_cesta_id"
            value={tipoId}
            onChange={(
              event,
            ) =>
              setTipoId(
                event
                  .target
                  .value,
              )
            }
            required
            className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-[12px] font-bold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
          >
            {tipos.map(
              (
                tipo,
              ) => (
                <option
                  key={
                    tipo.id
                  }
                  value={
                    tipo.id
                  }
                >
                  {tipo.nome} — {tipo.codigo}
                </option>
              ),
            )}
          </select>
        </div>

        {tipoSelecionado && (
          <div className="grid grid-cols-2 gap-3">

            <div className="rounded-[17px] border border-emerald-100 bg-emerald-50/70 p-4">
              <p className="text-[7px] font-black uppercase tracking-[0.14em] text-emerald-700/60">
                Saldo atual
              </p>

              <p className="mt-1 text-[22px] font-black text-[#176f3c]">
                {
                  tipoSelecionado
                    .saldo
                }
              </p>
            </div>

            <div className="rounded-[17px] border border-slate-100 bg-[#f7f9f7] p-4">
              <p className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-400">
                Estoque mínimo
              </p>

              <p className="mt-1 text-[22px] font-black">
                {
                  tipoSelecionado
                    .estoqueMinimo
                }
              </p>
            </div>

          </div>
        )}

        <div>
          <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
            Operação
          </label>

          <select
            name="tipo_movimento"
            value={
              movimento
            }
            onChange={(
              event,
            ) =>
              setMovimento(
                event
                  .target
                  .value,
              )
            }
            className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-[12px] font-bold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
          >
            <option value="ENTRADA_CENTRAL">
              Entrada física no estoque
            </option>

            {podeAjustar && (
              <>
                <option value="AJUSTE_CENTRAL_ENTRADA">
                  Ajuste positivo
                </option>

                <option value="AJUSTE_CENTRAL_SAIDA">
                  Ajuste negativo
                </option>
              </>
            )}
          </select>
        </div>

        {movimento ===
          "AJUSTE_CENTRAL_SAIDA" && (
          <div className="flex items-start gap-3 rounded-[17px] border border-amber-200 bg-amber-50 p-4">

            <AlertTriangle
              size={17}
              className="mt-0.5 shrink-0 text-amber-700"
            />

            <p className="text-[9px] leading-4 text-amber-800">
              O ajuste negativo reduz o saldo físico central. O banco não permitirá saldo abaixo de zero.
            </p>

          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">

          <div>
            <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
              Quantidade
            </label>

            <input
              name="quantidade"
              type="number"
              min={1}
              step={1}
              required
              placeholder="Ex.: 50"
              className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-[12px] font-bold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
            />
          </div>

          <div>
            <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
              Estoque mínimo
            </label>

            <input
              name="estoque_minimo"
              type="number"
              min={0}
              step={1}
              placeholder={
                tipoSelecionado
                  ? String(
                      tipoSelecionado
                        .estoqueMinimo,
                    )
                  : "0"
              }
              disabled={
                !podeAjustar
              }
              className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-[12px] font-bold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 disabled:bg-slate-50 disabled:text-slate-300"
            />
          </div>

        </div>

        <div>
          <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
            Observação
          </label>

          <input
            name="observacao"
            placeholder="NF, inventário, motivo do ajuste..."
            className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-[12px] font-semibold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
          />
        </div>

        <button
          type="submit"
          disabled={
            pending
          }
          className="flex h-[54px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#176f3c] text-[11px] font-black text-white shadow-[0_14px_30px_rgba(23,111,60,0.18)] disabled:opacity-50"
        >
          {movimento ===
          "ENTRADA_CENTRAL" ? (
            <ArrowDownToLine
              size={17}
            />
          ) : (
            <RefreshCcw
              size={17}
            />
          )}

          {pending
            ? "Registrando..."
            : "Registrar movimentação"}
        </button>

      </form>

      {modal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">

          <div className="w-full max-w-[420px] rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.28)]">

            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
              state.success
                ? "bg-emerald-100 text-emerald-600"
                : "bg-red-100 text-red-600"
            }`}>
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
                ? "Movimentação concluída"
                : "Operação não concluída"}
            </p>

            <h3 className="mt-2 text-[20px] font-black">
              {state.success
                ? "Estoque atualizado"
                : "Verifique a movimentação"}
            </h3>

            <p className="mt-3 text-[11px] leading-5 text-slate-500">
              {state.message}
            </p>

            {state.success &&
              state.saldoAnterior !==
                null &&
              state.saldoAtual !==
                null && (
              <div className="mt-5 grid grid-cols-2 gap-3">

                <div className="rounded-[17px] bg-slate-50 p-4">
                  <p className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Antes
                  </p>

                  <p className="mt-1 text-[20px] font-black">
                    {
                      state
                        .saldoAnterior
                    }
                  </p>
                </div>

                <div className="rounded-[17px] bg-emerald-50 p-4">
                  <p className="text-[7px] font-black uppercase tracking-[0.14em] text-emerald-600">
                    Agora
                  </p>

                  <p className="mt-1 text-[20px] font-black text-[#176f3c]">
                    {
                      state
                        .saldoAtual
                    }
                  </p>
                </div>

              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setModal(
                  false,
                );

                if (
                  state.success
                ) {
                  onSuccess?.();
                }
              }}
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
