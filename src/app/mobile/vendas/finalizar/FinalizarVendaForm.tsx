"use client";

import {
  Barcode,
  CheckCircle2,
  PackageCheck,
  ScanLine,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  concluirVendaCampo,
} from "./actions";

const initialState = {
  success: false,
  message: "",
};

export default function FinalizarVendaForm({
  fluxoId,
  quantidade,
  exigeScanner,
  modoControle,
}: {
  fluxoId: number;
  quantidade: number;
  exigeScanner: boolean;
  modoControle: string;
}) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    concluirVendaCampo,
    initialState,
  );

  const [
    codigo,
    setCodigo,
  ] = useState("");

  const [
    codigos,
    setCodigos,
  ] = useState<
    string[]
  >([]);

  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );

  useEffect(
    () => {
      if (
        exigeScanner
      ) {
        inputRef.current
          ?.focus();
      }
    },
    [
      exigeScanner,
    ],
  );

  function adicionarCodigo() {
    const normalizado =
      codigo
        .trim()
        .toUpperCase();

    if (!normalizado) {
      inputRef.current
        ?.focus();
      return;
    }

    if (
      codigos.includes(
        normalizado,
      )
    ) {
      setCodigo("");
      inputRef.current
        ?.focus();
      return;
    }

    if (
      codigos.length >=
      quantidade
    ) {
      return;
    }

    setCodigos(
      (atual) => [
        ...atual,
        normalizado,
      ],
    );

    setCodigo("");

    window.setTimeout(
      () =>
        inputRef.current
          ?.focus(),
      50,
    );
  }

  const pronto =
    exigeScanner
      ? codigos.length ===
        quantidade
      : true;

  return (
    <form
      action={formAction}
      className="space-y-4"
    >
      <input
        type="hidden"
        name="fluxo_id"
        value={fluxoId}
      />

      {exigeScanner ? (
        <section className="rounded-[26px] border border-emerald-100 bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-700">
                Bipagem obrigatória
              </p>
              <h3 className="mt-1 text-[17px] font-black">
                Volumes da venda
              </h3>
              <p className="mt-1 text-[8px] text-slate-400">
                Bipe exatamente {quantidade} volume(s).
              </p>
            </div>

            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[8px] font-black text-emerald-700">
              {codigos.length}/{quantidade}
            </span>
          </div>

          <div className="relative mt-4">
            <ScanLine
              size={20}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#176f3c]"
            />

            <input
              ref={inputRef}
              value={codigo}
              onChange={(
                event,
              ) =>
                setCodigo(
                  event.target
                    .value,
                )
              }
              onKeyDown={(
                event,
              ) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  event.preventDefault();
                  adicionarCodigo();
                }
              }}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="Bipe o QR da cesta"
              className="h-[60px] w-full rounded-[18px] border-2 border-emerald-100 bg-white pl-12 pr-4 font-mono text-[11px] font-black uppercase outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
            />
          </div>

          <button
            type="button"
            onClick={
              adicionarCodigo
            }
            className="mt-3 flex h-[48px] w-full items-center justify-center gap-2 rounded-[15px] border border-emerald-100 bg-emerald-50 text-[9px] font-black text-emerald-800"
          >
            <Barcode
              size={15}
            />
            Adicionar volume
          </button>

          {codigos.length ===
          0 ? (
            <div className="mt-4 rounded-[17px] bg-[#f6f9f6] p-5 text-center">
              <ScanLine
                size={23}
                className="mx-auto text-slate-300"
              />
              <p className="mt-2 text-[9px] font-black text-slate-500">
                Nenhum volume bipado
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {codigos.map(
                (
                  item,
                  index,
                ) => (
                  <div
                    key={
                      item
                    }
                    className="flex items-center gap-3 rounded-[16px] bg-[#f5faf6] px-3 py-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-emerald-100 text-emerald-700">
                      <CheckCircle2
                        size={17}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">
                        Volume {index + 1}
                      </p>
                      <p className="mt-1 truncate font-mono text-[9px] font-black">
                        {item}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setCodigos(
                          (atual) =>
                            atual.filter(
                              (
                                atualCodigo,
                              ) =>
                                atualCodigo !==
                                item,
                            ),
                        )
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-white text-red-500 shadow-sm"
                    >
                      <Trash2
                        size={15}
                      />
                    </button>

                    <input
                      type="hidden"
                      name="codigos_volume"
                      value={item}
                    />
                  </div>
                ),
              )}
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-[26px] border border-emerald-100 bg-white p-5 text-center shadow-[0_14px_36px_rgba(17,63,33,0.05)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-emerald-50 text-emerald-700">
            <PackageCheck
              size={25}
            />
          </div>

          <h3 className="mt-4 text-[17px] font-black">
            Confirmar entrega física
          </h3>

          <p className="mt-2 text-[9px] leading-5 text-slate-500">
            {modoControle ===
            "VOLUME"
              ? `O sistema baixará ${quantidade} volume(s) do estoque móvel, preservando o rastreio de origem.`
              : `O sistema baixará ${quantidade} cesta(s) do saldo móvel.`}
          </p>
        </section>
      )}

      {state.message && (
        <div className="rounded-[18px] border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <XCircle
              size={18}
              className="mt-0.5 shrink-0 text-red-600"
            />
            <p className="text-[10px] font-bold leading-5 text-red-700">
              {state.message}
            </p>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={
          pending ||
          !pronto
        }
        className="flex h-[58px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#176f3c] text-[11px] font-black text-white shadow-[0_14px_30px_rgba(23,111,60,0.18)] disabled:opacity-40"
      >
        <PackageCheck
          size={18}
        />
        {pending
          ? "Finalizando operação..."
          : exigeScanner
            ? "Confirmar bipagem e finalizar"
            : "Confirmar entrega e finalizar"}
      </button>

      {exigeScanner &&
        codigos.length !==
          quantidade && (
          <p className="text-center text-[8px] font-bold text-slate-400">
            O botão será liberado quando todos os volumes desta venda forem bipados.
          </p>
        )}
    </form>
  );
}
