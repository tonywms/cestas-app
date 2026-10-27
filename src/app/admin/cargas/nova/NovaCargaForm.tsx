"use client";

import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Save,
  Truck,
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
  criarCarga,
  type CriarCargaState,
} from "../actions";

const initialState:
  CriarCargaState = {
    success: false,
    message: "",
    cargaId: null,
  };

type Entregador = {
  id: string;
  nome: string;
  email: string | null;
};

type TipoCesta = {
  id: number;
  codigo: string;
  nome: string;
  saldo: number;
};

export default function NovaCargaForm({
  entregadores,
  tiposCesta,
}: {
  entregadores: Entregador[];
  tiposCesta: TipoCesta[];
}) {
  const [
    state,
    formAction,
    pending,
  ] =
    useActionState(
      criarCarga,
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
    useState("");

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
        tiposCesta.find(
          (
            item,
          ) =>
            String(
              item.id,
            ) ===
            tipoId,
        ) ??
        null,
      [
        tiposCesta,
        tipoId,
      ],
    );

  const possuiSaldo =
    tiposCesta.some(
      (
        item,
      ) =>
        item.saldo >
        0,
    );

  if (
    tiposCesta.length ===
    0
  ) {
    return (
      <div className="card-premium rounded-[28px] p-7 text-center">

        <Truck
          size={34}
          className="mx-auto text-emerald-700"
        />

        <h2 className="mt-5 text-lg font-black">
          Cadastre uma cesta primeiro
        </h2>

        <p className="mt-2 text-xs text-slate-400">
          Nenhum tipo de cesta está disponível nesta empresa.
        </p>

        <Link
          href="/admin/cestas"
          className="mt-6 flex h-[50px] items-center justify-center rounded-[16px] bg-[#176f3c] text-xs font-black text-white"
        >
          Cadastrar tipo de cesta
        </Link>

      </div>
    );
  }

  return (
    <>
      {!possuiSaldo && (
        <div className="mb-4 flex items-start gap-3 rounded-[20px] border border-amber-200 bg-amber-50 p-4">

          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0 text-amber-700"
          />

          <div className="flex-1">
            <p className="text-[10px] font-black text-amber-900">
              Estoque central sem saldo
            </p>

            <p className="mt-1 text-[9px] leading-5 text-amber-800/70">
              Registre uma entrada antes de criar a próxima carga.
            </p>

            <Link
              href="/admin/estoque"
              className="mt-3 inline-flex items-center gap-2 text-[9px] font-black text-amber-900 underline"
            >
              Abrir estoque central
            </Link>
          </div>

        </div>
      )}

      <form
        action={
          formAction
        }
        className="card-premium rounded-[30px] p-6"
      >

        <div className="grid gap-4 md:grid-cols-2">

          <div>
            <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
              Entregador
            </label>

            <select
              name="entregador_id"
              required
              className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-[12px] font-bold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
            >
              <option value="">
                Selecione
              </option>

              {entregadores.map(
                (
                  entregador,
                ) => (
                  <option
                    key={
                      entregador.id
                    }
                    value={
                      entregador.id
                    }
                  >
                    {
                      entregador.nome
                    }
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
              Tipo de cesta
            </label>

            <select
              name="tipo_cesta_id"
              required
              value={
                tipoId
              }
              onChange={(
                event,
              ) =>
                setTipoId(
                  event
                    .target
                    .value,
                )
              }
              className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-[12px] font-bold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
            >
              <option value="">
                Selecione
              </option>

              {tiposCesta.map(
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
                    disabled={
                      tipo.saldo <=
                      0
                    }
                  >
                    {tipo.nome} — saldo {tipo.saldo}
                  </option>
                ),
              )}
            </select>
          </div>

          {tipoSelecionado && (
            <div className="md:col-span-2">

              <div className={`flex items-center justify-between rounded-[18px] border p-4 ${
                tipoSelecionado.saldo >
                0
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-red-200 bg-red-50"
              }`}>

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-white text-[#176f3c]">
                    <Boxes
                      size={19}
                    />
                  </div>

                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Disponível no central
                    </p>

                    <p className="mt-1 text-[11px] font-black">
                      {
                        tipoSelecionado.nome
                      }
                    </p>
                  </div>

                </div>

                <p className="text-[27px] font-black text-[#176f3c]">
                  {
                    tipoSelecionado.saldo
                  }
                </p>

              </div>

            </div>
          )}

          <div>
            <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
              Quantidade
            </label>

            <input
              type="number"
              name="quantidade"
              min={1}
              max={
                tipoSelecionado?.saldo
              }
              step={1}
              required
              placeholder="Ex.: 10"
              className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 px-4 text-[12px] font-bold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
            />
          </div>

          <div>
            <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
              Observação
            </label>

            <input
              name="observacao"
              placeholder="Opcional"
              className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 px-4 text-[12px] font-semibold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
            />
          </div>

        </div>

        <button
          type="submit"
          disabled={
            pending ||
            entregadores.length ===
              0 ||
            !possuiSaldo ||
            !tipoSelecionado ||
            tipoSelecionado.saldo <=
              0
          }
          className="mt-6 flex h-[56px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#176f3c] text-[11px] font-black text-white shadow-[0_14px_30px_rgba(23,111,60,0.18)] disabled:opacity-40"
        >
          <Save
            size={18}
          />

          {pending
            ? "Criando carga..."
            : "Criar carga e baixar estoque"}
        </button>

      </form>

      {modal &&
        state.message && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">

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
                  ? "Transferência concluída"
                  : "Carga não criada"}
              </p>

              <h3 className="mt-2 text-[20px] font-black">
                {state.success
                  ? "Carga criada"
                  : "Verifique a operação"}
              </h3>

              <p className="mt-3 text-[11px] leading-5 text-slate-500">
                {
                  state.message
                }
              </p>

              {state.success ? (
                <div className="mt-6 space-y-2">

                  <Link
                    href="/admin/cargas"
                    className="flex h-[50px] items-center justify-center rounded-[16px] bg-[#176f3c] text-xs font-black text-white"
                  >
                    Ver cargas
                  </Link>

                  <Link
                    href="/admin/estoque"
                    className="flex h-[50px] items-center justify-center rounded-[16px] border border-slate-200 text-xs font-black"
                  >
                    Ver estoque central
                  </Link>

                </div>
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
