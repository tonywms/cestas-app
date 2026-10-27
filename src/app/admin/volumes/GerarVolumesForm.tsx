"use client";

import {
  AlertTriangle,
  Barcode,
  CheckCircle2,
  Hash,
  PackagePlus,
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
  gerarVolumes,
  type VolumesActionState,
} from "./actions";

export type TipoCestaVolume = {
  id: number;
  codigo: string;
  nome: string;
  saldoCentral: number;
  volumesDisponiveis: number;
  faltamIdentificar: number;
};

const initialState:
  VolumesActionState = {
    success: false,
    message: "",
    quantidadeCriada: 0,
  };

export default function GerarVolumesForm({
  tipos,
}: {
  tipos: TipoCestaVolume[];
}) {
  const [
    state,
    formAction,
    pending,
  ] =
    useActionState(
      gerarVolumes,
      initialState,
    );

  const [
    modal,
    setModal,
  ] =
    useState(false);

  const [
    tipoSelecionadoId,
    setTipoSelecionadoId,
  ] =
    useState<string>(
      tipos[0]?.id
        ? String(
            tipos[0].id,
          )
        : "",
    );

  useEffect(() => {
    if (state.message) {
      setModal(true);
    }
  }, [state]);

  const tipoSelecionado =
    useMemo(
      () =>
        tipos.find(
          (item) =>
            String(
              item.id,
            ) ===
            tipoSelecionadoId,
        ) ?? null,
      [
        tipos,
        tipoSelecionadoId,
      ],
    );

  const podeGerar =
    Boolean(
      tipoSelecionado &&
        tipoSelecionado
          .faltamIdentificar >
          0,
    );

  return (
    <>
      <form
        action={formAction}
        className="card-premium rounded-[30px] p-6"
      >
        <div className="flex items-start gap-3">

          <div className="icon-emerald flex h-12 w-12 items-center justify-center rounded-[16px]">
            <PackagePlus
              size={21}
            />
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
              Identificação física
            </p>

            <h2 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
              Gerar volumes
            </h2>

            <p className="mt-1 text-[9px] leading-5 text-slate-400">
              O sistema limita a geração ao saldo físico existente no estoque central.
            </p>
          </div>

        </div>

        <div className="mt-6">

          <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
            Tipo de cesta
          </label>

          <select
            name="tipo_cesta_id"
            required
            value={
              tipoSelecionadoId
            }
            onChange={(event) =>
              setTipoSelecionadoId(
                event.target.value,
              )
            }
            className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-[12px] font-bold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
          >
            <option value="">
              Selecione
            </option>

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
          <div className="mt-4 grid grid-cols-3 gap-2">

            <Resumo
              label="Saldo central"
              valor={
                tipoSelecionado
                  .saldoCentral
              }
            />

            <Resumo
              label="Identificados"
              valor={
                tipoSelecionado
                  .volumesDisponiveis
              }
            />

            <Resumo
              label="Faltam"
              valor={
                tipoSelecionado
                  .faltamIdentificar
              }
              destaque={
                tipoSelecionado
                  .faltamIdentificar >
                0
              }
            />

          </div>
        )}

        {tipoSelecionado &&
          tipoSelecionado
            .faltamIdentificar ===
            0 && (
            <div className="mt-4 flex items-start gap-3 rounded-[18px] border border-emerald-100 bg-emerald-50 px-4 py-3.5">

              <CheckCircle2
                size={17}
                className="mt-0.5 shrink-0 text-emerald-700"
              />

              <p className="text-[9px] leading-5 text-emerald-800">
                O saldo físico disponível deste tipo já possui identificação individual completa.
              </p>

            </div>
          )}

        {tipoSelecionado &&
          tipoSelecionado
            .faltamIdentificar >
            0 && (
            <div className="mt-4 flex items-start gap-3 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3.5">

              <AlertTriangle
                size={17}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <p className="text-[9px] leading-5 text-amber-800">
                Existem{" "}
                <strong>
                  {
                    tipoSelecionado
                      .faltamIdentificar
                  }
                </strong>{" "}
                cesta(s) no estoque central ainda sem código individual.
              </p>

            </div>
          )}

        <div className="mt-5 grid gap-4 md:grid-cols-2">

          <div>
            <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
              Quantidade
            </label>

            <div className="relative mt-2">

              <Barcode
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700"
              />

              <input
                name="quantidade"
                type="number"
                min={1}
                max={
                  tipoSelecionado
                    ?.faltamIdentificar ??
                  500
                }
                step={1}
                required
                disabled={
                  !podeGerar
                }
                placeholder={
                  podeGerar
                    ? `Máx. ${tipoSelecionado?.faltamIdentificar ?? 0}`
                    : "Sem pendência"
                }
                className="h-[54px] w-full rounded-[17px] border border-slate-200 bg-white pl-11 pr-4 text-[12px] font-bold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 disabled:bg-slate-50 disabled:text-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
              Prefixo
            </label>

            <div className="relative mt-2">

              <Hash
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700"
              />

              <input
                name="prefixo"
                defaultValue="VOL"
                maxLength={12}
                disabled={
                  !podeGerar
                }
                className="h-[54px] w-full rounded-[17px] border border-slate-200 bg-white pl-11 pr-4 text-[12px] font-bold uppercase outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 disabled:bg-slate-50 disabled:text-slate-300"
              />
            </div>
          </div>

        </div>

        <button
          type="submit"
          disabled={
            pending ||
            !podeGerar
          }
          className="mt-6 flex h-[55px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#176f3c] text-[11px] font-black text-white shadow-[0_14px_30px_rgba(23,111,60,0.18)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save
            size={17}
          />

          {pending
            ? "Gerando volumes..."
            : "Gerar identificadores"}
        </button>

      </form>

      {modal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">

          <div className="w-full max-w-[410px] rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.28)]">

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
                ? "Geração concluída"
                : "Operação não concluída"}
            </p>

            <h3 className="mt-2 text-[20px] font-black">
              {state.success
                ? `${state.quantidadeCriada} volume(s) criado(s)`
                : "Verifique o estoque"}
            </h3>

            <p className="mt-3 text-[11px] leading-5 text-slate-500">
              {state.message}
            </p>

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
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-[17px] border px-3 py-3 ${
        destaque
          ? "border-amber-200 bg-amber-50"
          : "border-slate-100 bg-[#f7faf8]"
      }`}
    >
      <p className="text-[7px] font-black uppercase tracking-[0.13em] text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-[18px] font-black ${
          destaque
            ? "text-amber-700"
            : "text-[#152019]"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
