"use client";

import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Save,
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
  fecharCarga,
  type FecharCargaState,
} from "./actions";

type Item = {
  id: number;
  nome: string;
  codigo: string;
  saldo: number;
};

const initialState:
  FecharCargaState = {
    success: false,
    message: "",
    totalRetornado: 0,
    totalAvariado: 0,
  };

export default function FecharCargaForm({
  cargaId,
  itens,
}: {
  cargaId: number;
  itens: Item[];
}) {
  const [
    state,
    formAction,
    pending,
  ] =
    useActionState(
      fecharCarga,
      initialState,
    );

  const [
    modal,
    setModal,
  ] =
    useState(false);

  const [
    valores,
    setValores,
  ] =
    useState<
      Record<
        number,
        {
          retorno: number;
          avaria: number;
        }
      >
    >(
      Object.fromEntries(
        itens.map(
          (
            item,
          ) => [
            item.id,
            {
              retorno:
                item.saldo,

              avaria:
                0,
            },
          ],
        ),
      ),
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

  const totalRetorno =
    useMemo(
      () =>
        Object.values(
          valores,
        ).reduce(
          (
            total,
            item,
          ) =>
            total +
            item.retorno,
          0,
        ),
      [
        valores,
      ],
    );

  const totalAvaria =
    useMemo(
      () =>
        Object.values(
          valores,
        ).reduce(
          (
            total,
            item,
          ) =>
            total +
            item.avaria,
          0,
        ),
      [
        valores,
      ],
    );

  const valido =
    itens.every(
      (
        item,
      ) => {
        const atual =
          valores[
            item.id
          ];

        return (
          atual &&
          atual.retorno >=
            0 &&
          atual.avaria >=
            0 &&
          atual.retorno +
            atual.avaria ===
            item.saldo
        );
      },
    );

  function alterarAvaria(
    item:
      Item,
    valor:
      number,
  ) {
    const avaria =
      Math.min(
        item.saldo,
        Math.max(
          0,
          Number.isFinite(
            valor,
          )
            ? valor
            : 0,
        ),
      );

    setValores(
      (
        atual,
      ) => ({
        ...atual,

        [item.id]: {
          avaria,

          retorno:
            item.saldo -
            avaria,
        },
      }),
    );
  }

  function alterarRetorno(
    item:
      Item,
    valor:
      number,
  ) {
    const retorno =
      Math.min(
        item.saldo,
        Math.max(
          0,
          Number.isFinite(
            valor,
          )
            ? valor
            : 0,
        ),
      );

    setValores(
      (
        atual,
      ) => ({
        ...atual,

        [item.id]: {
          retorno,

          avaria:
            item.saldo -
            retorno,
        },
      }),
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

        <input
          type="hidden"
          name="carga_id"
          value={
            cargaId
          }
        />

        {itens.map(
          (
            item,
          ) => {
            const atual =
              valores[
                item.id
              ];

            return (
              <section
                key={
                  item.id
                }
                className="rounded-[24px] border border-black/[0.04] bg-white p-5 shadow-[0_16px_40px_rgba(17,63,33,0.06)]"
              >

                <div className="flex items-start justify-between gap-4">

                  <div>
                    <p className="text-[12px] font-black">
                      {
                        item.nome
                      }
                    </p>

                    <p className="mt-1 text-[8px] font-black uppercase tracking-[0.13em] text-slate-400">
                      {
                        item.codigo
                      }
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[8px] font-black text-emerald-700">
                    Saldo {item.saldo}
                  </span>

                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">

                  <div>
                    <label className="text-[8px] font-black uppercase tracking-[0.13em] text-slate-400">
                      Retorno ao central
                    </label>

                    <input
                      name={`retorno_${item.id}`}
                      type="number"
                      min={0}
                      max={
                        item.saldo
                      }
                      step={1}
                      value={
                        atual?.retorno ??
                        0
                      }
                      onChange={(
                        event,
                      ) =>
                        alterarRetorno(
                          item,
                          Number(
                            event
                              .target
                              .value,
                          ),
                        )
                      }
                      className="mt-2 h-[52px] w-full rounded-[16px] border border-emerald-200 bg-emerald-50/50 px-4 text-[13px] font-black outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[8px] font-black uppercase tracking-[0.13em] text-slate-400">
                      Avaria
                    </label>

                    <input
                      name={`avaria_${item.id}`}
                      type="number"
                      min={0}
                      max={
                        item.saldo
                      }
                      step={1}
                      value={
                        atual?.avaria ??
                        0
                      }
                      onChange={(
                        event,
                      ) =>
                        alterarAvaria(
                          item,
                          Number(
                            event
                              .target
                              .value,
                          ),
                        )
                      }
                      className="mt-2 h-[52px] w-full rounded-[16px] border border-amber-200 bg-amber-50/50 px-4 text-[13px] font-black outline-none"
                    />
                  </div>

                </div>

                <div className="mt-3 rounded-[15px] bg-[#f6f9f6] px-4 py-3">

                  <p className="text-[8px] leading-4 text-slate-500">
                    Todo saldo precisa ser classificado. Retorno volta ao estoque central; avaria é baixada e permanece no histórico.
                  </p>

                </div>

              </section>
            );
          },
        )}

        <div className="grid grid-cols-2 gap-3">

          <div className="rounded-[20px] bg-emerald-50 p-4">

            <RotateCcw
              size={18}
              className="text-emerald-700"
            />

            <p className="mt-3 text-[24px] font-black text-[#176f3c]">
              {
                totalRetorno
              }
            </p>

            <p className="mt-1 text-[8px] font-black uppercase tracking-[0.13em] text-emerald-700/60">
              Retorno
            </p>

          </div>

          <div className="rounded-[20px] bg-amber-50 p-4">

            <AlertTriangle
              size={18}
              className="text-amber-700"
            />

            <p className="mt-3 text-[24px] font-black text-amber-700">
              {
                totalAvaria
              }
            </p>

            <p className="mt-1 text-[8px] font-black uppercase tracking-[0.13em] text-amber-700/60">
              Avaria
            </p>

          </div>

        </div>

        <button
          type="submit"
          disabled={
            pending ||
            !valido
          }
          className="flex h-[56px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#176f3c] text-[11px] font-black text-white shadow-[0_14px_30px_rgba(23,111,60,0.18)] disabled:opacity-40"
        >
          <Save
            size={17}
          />

          {pending
            ? "Finalizando carga..."
            : "Confirmar fechamento"}
        </button>

      </form>

      {modal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">

          <div className="w-full max-w-[390px] rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.28)]">

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
                ? "Fechamento concluído"
                : "Carga não finalizada"}
            </p>

            <h3 className="mt-2 text-[20px] font-black">
              {state.success
                ? "Carga finalizada"
                : "Verifique a operação"}
            </h3>

            <p className="mt-3 text-[11px] leading-5 text-slate-500">
              {
                state.message
              }
            </p>

            {state.success && (
              <div className="mt-5 grid grid-cols-2 gap-3">

                <div className="rounded-[17px] bg-emerald-50 p-4">
                  <p className="text-[7px] font-black uppercase tracking-[0.13em] text-emerald-600">
                    Retorno
                  </p>

                  <p className="mt-1 text-[20px] font-black text-[#176f3c]">
                    {
                      state
                        .totalRetornado
                    }
                  </p>
                </div>

                <div className="rounded-[17px] bg-amber-50 p-4">
                  <p className="text-[7px] font-black uppercase tracking-[0.13em] text-amber-600">
                    Avaria
                  </p>

                  <p className="mt-1 text-[20px] font-black text-amber-700">
                    {
                      state
                        .totalAvariado
                    }
                  </p>
                </div>

              </div>
            )}

            {state.success ? (
              <Link
                href="/mobile/carga"
                className="mt-6 flex h-[50px] w-full items-center justify-center rounded-[16px] bg-[#176f3c] text-xs font-black text-white"
              >
                Voltar à Minha Carga
              </Link>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setModal(
                    false,
                  )
                }
                className="mt-6 h-[50px] w-full rounded-[16px] bg-[#176f3c] text-xs font-black text-white"
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
