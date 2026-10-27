"use client";

import {
  Barcode,
  CheckCircle2,
  CircleAlert,
  ScanLine,
  ShieldCheck,
  X,
} from "lucide-react";

import Link from "next/link";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  biparVolumeCarga,
  type ReceberCargaState,
} from "./actions";

const initialState: ReceberCargaState = {
  success: false,
  message: "",
  codigoVolume: null,
  esperados: 0,
  confirmados: 0,
  completo: false,
};

type Bipagem = {
  codigo: string;
  bipadoAt: string;
};

export default function ReceberCargaForm({
  cargaId,
  cargaCodigo,
  esperadosInicial,
  confirmadosInicial,
  recebida,
  bipagens,
}: {
  cargaId: number;
  cargaCodigo: string;
  esperadosInicial: number;
  confirmadosInicial: number;
  recebida: boolean;
  bipagens: Bipagem[];
}) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    biparVolumeCarga,
    initialState,
  );

  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const [
    modalConcluido,
    setModalConcluido,
  ] = useState(
    recebida,
  );

  const esperados =
    state.esperados > 0
      ? state.esperados
      : esperadosInicial;

  const confirmados =
    state.success &&
    state.confirmados >= 0
      ? Math.max(
          confirmadosInicial,
          state.confirmados,
        )
      : confirmadosInicial;

  const percentual =
    esperados > 0
      ? Math.min(
          100,
          Math.round(
            (
              confirmados /
              esperados
            ) *
              100,
          ),
        )
      : 0;

  useEffect(() => {
    if (state.success) {
      if (inputRef.current) {
        inputRef.current.value =
          "";
      }

      if (state.completo) {
        setModalConcluido(
          true,
        );
      } else {
        window.setTimeout(
          () => {
            inputRef.current?.focus();
          },
          80,
        );
      }
    }
  }, [state]);

  useEffect(() => {
    if (
      !recebida &&
      !modalConcluido
    ) {
      inputRef.current?.focus();
    }
  }, [
    recebida,
    modalConcluido,
  ]);

  if (
    recebida ||
    modalConcluido
  ) {
    return (
      <>
        <section className="rounded-[28px] border border-emerald-200 bg-[linear-gradient(145deg,#f1fff6,#ffffff)] p-6 shadow-[0_18px_45px_rgba(17,63,33,0.07)]">

          <div className="flex items-start gap-4">

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-emerald-600 text-white shadow-[0_12px_26px_rgba(5,150,105,0.24)]">
              <CheckCircle2
                size={27}
              />
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">
                Carga confirmada
              </p>

              <h2 className="mt-2 text-[22px] font-black tracking-[-0.04em]">
                Recebimento concluído
              </h2>

              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                Todos os {esperados} volumes da carga {cargaCodigo} foram conferidos.
              </p>
            </div>

          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">

            <Resumo
              label="Esperados"
              valor={
                esperados
              }
            />

            <Resumo
              label="Confirmados"
              valor={
                esperados
              }
              ok
            />

          </div>

          <Link
            href="/mobile/carga"
            className="mt-5 flex h-[54px] w-full items-center justify-center rounded-[17px] bg-[#176f3c] text-[11px] font-black text-white"
          >
            Voltar para Minha Carga
          </Link>

        </section>
      </>
    );
  }

  return (
    <>

      <section className="overflow-hidden rounded-[28px] border border-black/[0.04] bg-white shadow-[0_18px_45px_rgba(17,63,33,0.07)]">

        <div className="border-b border-slate-100 p-5">

          <div className="flex items-start justify-between gap-4">

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#18834a]">
                Conferência física
              </p>

              <h2 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                Bipe os volumes
              </h2>
            </div>

            <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-[9px] font-black text-emerald-700">
              {confirmados}/{esperados}
            </div>

          </div>

          <div className="mt-5 rounded-[20px] bg-[#f4f8f5] p-4">

            <div className="flex items-center justify-between gap-4">

              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.13em] text-slate-400">
                  Progresso da conferência
                </p>

                <p className="mt-1 text-[12px] font-black">
                  {confirmados} de {esperados} volume(s)
                </p>
              </div>

              <p className="text-[25px] font-black text-[#176f3c]">
                {percentual}%
              </p>

            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#dfe9e1]">

              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#f7b733,#159457)] transition-all duration-300"
                style={{
                  width:
                    `${percentual}%`,
                }}
              />

            </div>

          </div>

        </div>

        <form
          action={formAction}
          className="p-5"
        >

          <input
            type="hidden"
            name="carga_id"
            value={cargaId}
          />

          <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
            Código do volume
          </label>

          <div className="relative mt-2">

            <ScanLine
              size={20}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#176f3c]"
            />

            <input
              ref={inputRef}
              type="text"
              name="codigo_volume"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              required
              disabled={pending}
              placeholder="Bipe o QR ou código de barras"
              className="h-[60px] w-full rounded-[18px] border-2 border-emerald-100 bg-white pl-12 pr-4 font-mono text-[12px] font-black uppercase outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 disabled:opacity-60"
            />

          </div>

          <p className="mt-2 text-[9px] leading-4 text-slate-400">
            Em coletores configurados como teclado, basta bipar: o código será preenchido automaticamente.
          </p>

          <button
            type="submit"
            disabled={pending}
            className="mt-4 flex h-[55px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#176f3c] text-[11px] font-black text-white shadow-[0_14px_30px_rgba(23,111,60,0.18)] disabled:opacity-50"
          >
            <Barcode
              size={17}
            />

            {pending
              ? "Validando volume..."
              : "Confirmar volume"}
          </button>

          {state.message && (
            <div
              className={`mt-4 flex items-start gap-3 rounded-[18px] border px-4 py-3.5 ${
                state.success
                  ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {state.success ? (
                <CheckCircle2
                  size={17}
                  className="mt-0.5 shrink-0"
                />
              ) : (
                <CircleAlert
                  size={17}
                  className="mt-0.5 shrink-0"
                />
              )}

              <div>
                <p className="text-[10px] font-black">
                  {state.success
                    ? "Volume confirmado"
                    : "Volume não confirmado"}
                </p>

                <p className="mt-1 text-[9px] leading-5 opacity-80">
                  {state.message}
                </p>
              </div>
            </div>
          )}

        </form>

      </section>

      <section className="mt-4 rounded-[28px] border border-black/[0.04] bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)]">

        <div className="flex items-center justify-between">

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
              Conferidos
            </p>

            <h3 className="mt-1 text-[17px] font-black">
              Volumes bipados
            </h3>
          </div>

          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[8px] font-black text-emerald-700">
            {bipagens.length}
          </span>

        </div>

        {bipagens.length ===
        0 ? (
          <div className="mt-4 rounded-[18px] bg-[#f5f8f5] p-6 text-center">

            <Barcode
              size={24}
              className="mx-auto text-slate-300"
            />

            <p className="mt-2 text-[10px] font-black">
              Nenhum volume bipado
            </p>

          </div>
        ) : (
          <div className="mt-4 space-y-2">

            {bipagens.map(
              (
                bipagem,
                index,
              ) => (
                <div
                  key={`${bipagem.codigo}-${index}`}
                  className="flex items-center gap-3 rounded-[16px] bg-[#f6faf7] px-3 py-3"
                >

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-emerald-100 text-emerald-700">
                    <CheckCircle2
                      size={17}
                    />
                  </div>

                  <div className="min-w-0 flex-1">

                    <p className="truncate font-mono text-[9px] font-black">
                      {bipagem.codigo}
                    </p>

                    <p className="mt-1 text-[8px] text-slate-400">
                      {bipagem.bipadoAt}
                    </p>

                  </div>

                </div>
              ),
            )}

          </div>
        )}

      </section>

      <div className="mt-4 flex items-start gap-3 rounded-[20px] border border-emerald-100 bg-emerald-50 px-4 py-4">

        <ShieldCheck
          size={18}
          className="mt-0.5 shrink-0 text-emerald-700"
        />

        <p className="text-[9px] leading-5 text-emerald-800">
          O sistema rejeita volume de outra carga, volume duplicado e código que não esteja reservado para este entregador.
        </p>

      </div>

      {state.completo && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">

          <div className="w-full max-w-[390px] rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.28)]">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2
                size={31}
              />
            </div>

            <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
              Conferência concluída
            </p>

            <h3 className="mt-2 text-[21px] font-black">
              Carga recebida
            </h3>

            <p className="mt-3 text-[11px] leading-5 text-slate-500">
              Os {state.esperados} volumes da carga foram confirmados.
            </p>

            <Link
              href="/mobile/carga"
              className="mt-6 flex h-[50px] w-full items-center justify-center rounded-[16px] bg-[#176f3c] text-[11px] font-black text-white"
            >
              Ver Minha Carga
            </Link>

            <button
              type="button"
              onClick={() =>
                setModalConcluido(
                  false,
                )
              }
              className="mt-2 flex h-[46px] w-full items-center justify-center gap-2 rounded-[15px] border border-slate-200 text-[10px] font-black text-slate-500"
            >
              <X
                size={15}
              />
              Fechar
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
  ok = false,
}: {
  label: string;
  valor: number;
  ok?: boolean;
}) {
  return (
    <div
      className={`rounded-[17px] p-4 ${
        ok
          ? "bg-emerald-50"
          : "bg-[#f5f8f5]"
      }`}
    >
      <p className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-[22px] font-black ${
          ok
            ? "text-emerald-700"
            : ""
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
