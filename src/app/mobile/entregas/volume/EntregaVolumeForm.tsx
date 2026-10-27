"use client";

import {
  Barcode,
  CheckCircle2,
  MapPin,
  PackageCheck,
  Save,
  ScanLine,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";

import Link from "next/link";

import {
  FormEvent,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  registrarEntregaVolume,
  type EntregaVolumeState,
} from "./actions";

const initialState:
  EntregaVolumeState = {
    success: false,
    message: "",
    saldoAnterior: null,
    saldoAtual: null,
    quantidade: 0,
  };

type Cliente = {
  id: number;
  codigo: string;
  nome: string;
  endereco: string;
};

type ItemCarga = {
  tipoCestaId: number;
  nome: string;
  codigo: string;
  saldo: number;
};

type Volume = {
  codigo: string;
  tipoCestaId: number;
};

export default function EntregaVolumeForm({
  cargaId,
  cargaCodigo,
  clientes,
  itens,
  volumes,
  exigirBipagem,
  rotaClienteId,
  clienteSelecionado,
}: {
  cargaId: number;
  cargaCodigo: string;
  clientes: Cliente[];
  itens: ItemCarga[];
  volumes: Volume[];
  exigirBipagem: boolean;
  rotaClienteId: number | null;
  clienteSelecionado: Cliente | null;
}) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    registrarEntregaVolume,
    initialState,
  );

  const [
    modal,
    setModal,
  ] = useState(false);

  const [
    tipoId,
    setTipoId,
  ] = useState(
    itens[0]
      ? String(
          itens[0]
            .tipoCestaId,
        )
      : "",
  );

  const [
    codigos,
    setCodigos,
  ] = useState<string[]>([]);

  const [
    erroScanner,
    setErroScanner,
  ] = useState<string | null>(
    null,
  );

  const scannerRef =
    useRef<HTMLInputElement>(
      null,
    );

  useEffect(
    () => {
      if (
        state.message
      ) {
        setModal(true);
      }
    },
    [state],
  );

  useEffect(
    () => {
      setCodigos([]);
      setErroScanner(null);
    },
    [tipoId],
  );

  const itemSelecionado =
    itens.find(
      (item) =>
        String(
          item.tipoCestaId,
        ) === tipoId,
    ) ?? null;

  const volumesTipo =
    useMemo(
      () =>
        new Set(
          volumes
            .filter(
              (volume) =>
                String(
                  volume.tipoCestaId,
                ) === tipoId,
            )
            .map(
              (volume) =>
                volume.codigo
                  .trim()
                  .toUpperCase(),
            ),
        ),
      [volumes, tipoId],
    );

  function adicionarCodigo(
    event:
      FormEvent,
  ) {
    event.preventDefault();

    const input =
      scannerRef.current;

    const codigo =
      input?.value
        .trim()
        .toUpperCase() ?? "";

    if (!codigo) {
      return;
    }

    if (
      !volumesTipo.has(
        codigo,
      )
    ) {
      setErroScanner(
        "Volume não pertence a este tipo de cesta ou não está disponível na carga.",
      );
      input?.select();
      return;
    }

    if (
      codigos.includes(
        codigo,
      )
    ) {
      setErroScanner(
        "Esse volume já foi bipado nesta entrega.",
      );
      input?.select();
      return;
    }

    if (
      itemSelecionado &&
      codigos.length >=
        itemSelecionado.saldo
    ) {
      setErroScanner(
        "A quantidade bipada já atingiu o saldo disponível deste tipo de cesta.",
      );
      return;
    }

    setCodigos(
      (atual) => [
        ...atual,
        codigo,
      ],
    );
    setErroScanner(null);

    if (input) {
      input.value = "";
      input.focus();
    }
  }

  return (
    <>
      <form
        action={formAction}
        className="space-y-4"
      >
        <input
          type="hidden"
          name="carga_id"
          value={cargaId}
        />

        <input
          type="hidden"
          name="codigos_volume_json"
          value={JSON.stringify(
            codigos,
          )}
        />

        {rotaClienteId && (
          <input
            type="hidden"
            name="rota_cliente_id"
            value={rotaClienteId}
          />
        )}

        <div className="rounded-[24px] border border-black/[0.04] bg-white p-5 shadow-[0_16px_40px_rgba(17,63,33,0.06)]">
          <p className="text-[8px] font-black uppercase tracking-[0.17em] text-emerald-700">
            Carga atual
          </p>
          <h2 className="mt-2 text-[17px] font-black">
            {cargaCodigo}
          </h2>
        </div>

        {clienteSelecionado ? (
          <div className="rounded-[24px] border border-emerald-200 bg-[linear-gradient(145deg,#f0fbf4,#ffffff)] p-5 shadow-[0_16px_40px_rgba(17,63,33,0.06)]">
            <input
              type="hidden"
              name="cliente_id"
              value={
                clienteSelecionado.id
              }
            />

            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[#176f3c] text-white">
                <UserRound size={21} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-black uppercase tracking-[0.15em] text-emerald-700">
                  Cliente da rota
                </p>
                <h3 className="mt-1 text-[16px] font-black">
                  {clienteSelecionado.nome}
                </h3>
                <p className="mt-1 text-[8px] font-black uppercase tracking-[0.11em] text-slate-400">
                  {clienteSelecionado.codigo}
                </p>

                <div className="mt-3 flex items-start gap-2 rounded-[14px] bg-white/80 p-3 text-[9px] leading-4 text-slate-500">
                  <MapPin
                    size={13}
                    className="mt-0.5 shrink-0"
                  />
                  <span>
                    {clienteSelecionado.endereco}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] border border-black/[0.04] bg-white p-5 shadow-[0_16px_40px_rgba(17,63,33,0.06)]">
            <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
              Cliente
            </label>

            <select
              name="cliente_id"
              required
              className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-[12px] font-bold outline-none"
            >
              <option value="">
                Selecione
              </option>
              {clientes.map(
                (cliente) => (
                  <option
                    key={cliente.id}
                    value={cliente.id}
                  >
                    {cliente.nome} — {cliente.codigo}
                  </option>
                ),
              )}
            </select>
          </div>
        )}

        <div className="rounded-[24px] border border-black/[0.04] bg-white p-5 shadow-[0_16px_40px_rgba(17,63,33,0.06)]">
          <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
            Tipo de cesta
          </label>

          <div className="relative mt-2">
            <PackageCheck
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#176f3c]"
            />
            <select
              name="tipo_cesta_id"
              value={tipoId}
              onChange={(event) =>
                setTipoId(
                  event.target.value,
                )
              }
              required
              className="h-[54px] w-full rounded-[17px] border border-slate-200 bg-white pl-11 pr-4 text-[12px] font-bold outline-none"
            >
              {itens.map(
                (item) => (
                  <option
                    key={item.tipoCestaId}
                    value={item.tipoCestaId}
                  >
                    {item.nome} — saldo {item.saldo}
                  </option>
                ),
              )}
            </select>
          </div>

          {itemSelecionado && (
            <div className="mt-3 flex items-center justify-between rounded-[15px] bg-[#f5f8f5] px-4 py-3">
              <span className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
                Saldo disponível
              </span>
              <span className="text-[16px] font-black text-[#176f3c]">
                {itemSelecionado.saldo}
              </span>
            </div>
          )}
        </div>

        {exigirBipagem ? (
          <div className="rounded-[24px] border border-emerald-200 bg-[linear-gradient(145deg,#f0fbf4,#ffffff)] p-5 shadow-[0_16px_40px_rgba(17,63,33,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-700">
                  Bipagem obrigatória
                </p>
                <h3 className="mt-1 text-[16px] font-black">
                  Volumes da entrega
                </h3>
              </div>

              <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[9px] font-black text-emerald-700">
                {codigos.length}
              </span>
            </div>

            <div
              className="mt-4"
              onSubmit={adicionarCodigo}
            >
              <div className="relative">
                <Barcode
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#176f3c]"
                />
                <input
                  ref={scannerRef}
                  type="text"
                  autoComplete="off"
                  placeholder="Bipe o volume e pressione Enter"
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      adicionarCodigo(
                        event,
                      );
                    }
                  }}
                  className="h-[56px] w-full rounded-[17px] border border-emerald-200 bg-white pl-12 pr-4 text-[11px] font-black uppercase outline-none focus:ring-4 focus:ring-emerald-50"
                />
              </div>
            </div>

            {erroScanner && (
              <p className="mt-3 rounded-[14px] bg-red-50 px-3 py-2.5 text-[9px] font-semibold text-red-700">
                {erroScanner}
              </p>
            )}

            {codigos.length > 0 && (
              <div className="mt-4 space-y-2">
                {codigos.map(
                  (codigo, indice) => (
                    <div
                      key={codigo}
                      className="flex items-center gap-3 rounded-[14px] bg-white p-3"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-emerald-100 text-emerald-700">
                        <CheckCircle2 size={16} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[9px] font-black">
                          {codigo}
                        </p>
                        <p className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-slate-400">
                          Volume #{indice + 1}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setCodigos(
                            (atual) =>
                              atual.filter(
                                (item) =>
                                  item !== codigo,
                              ),
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-red-50 text-red-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ),
                )}
              </div>
            )}

            <input
              type="hidden"
              name="quantidade"
              value={codigos.length}
            />
          </div>
        ) : (
          <div className="rounded-[24px] border border-black/[0.04] bg-white p-5 shadow-[0_16px_40px_rgba(17,63,33,0.06)]">
            <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
              Quantidade entregue
            </label>
            <input
              type="number"
              name="quantidade"
              min={1}
              max={itemSelecionado?.saldo}
              defaultValue={1}
              required
              className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 px-4 text-[12px] font-bold outline-none"
            />
          </div>
        )}

        <div className="rounded-[24px] border border-black/[0.04] bg-white p-5 shadow-[0_16px_40px_rgba(17,63,33,0.06)]">
          <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
            Observação
          </label>
          <input
            name="observacao"
            placeholder="Opcional"
            className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 px-4 text-[12px] font-semibold outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={
            pending ||
            (exigirBipagem &&
              codigos.length === 0)
          }
          className="flex h-[56px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#176f3c] text-[11px] font-black text-white shadow-[0_14px_30px_rgba(23,111,60,0.18)] disabled:opacity-40"
        >
          {exigirBipagem ? (
            <ScanLine size={18} />
          ) : (
            <Save size={18} />
          )}
          {pending
            ? "Registrando..."
            : exigirBipagem
              ? `Confirmar ${codigos.length} volume(s)`
              : "Confirmar entrega"}
        </button>
      </form>

      {modal &&
        state.message && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">
            <div className="w-full max-w-[390px] rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.28)]">
              <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                state.success
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-red-100 text-red-600"
              }`}>
                {state.success ? (
                  <CheckCircle2 size={31} />
                ) : (
                  <XCircle size={31} />
                )}
              </div>

              <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                {state.success
                  ? "Entrega rastreada"
                  : "Operação não concluída"}
              </p>

              <h3 className="mt-2 text-[20px] font-black">
                {state.success
                  ? "Entrega concluída"
                  : "Verifique a entrega"}
              </h3>

              <p className="mt-3 text-[11px] leading-5 text-slate-500">
                {state.message}
              </p>

              {state.success &&
                state.saldoAnterior !== null &&
                state.saldoAtual !== null && (
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-[17px] bg-slate-50 p-4">
                    <p className="text-[7px] font-black uppercase tracking-[0.13em] text-slate-400">
                      Antes
                    </p>
                    <p className="mt-1 text-[20px] font-black">
                      {state.saldoAnterior}
                    </p>
                  </div>
                  <div className="rounded-[17px] bg-emerald-50 p-4">
                    <p className="text-[7px] font-black uppercase tracking-[0.13em] text-emerald-600">
                      Agora
                    </p>
                    <p className="mt-1 text-[20px] font-black text-[#176f3c]">
                      {state.saldoAtual}
                    </p>
                  </div>
                </div>
              )}

              {state.success ? (
                <Link
                  href="/mobile/rota"
                  className="mt-6 flex h-[50px] items-center justify-center rounded-[16px] bg-[#176f3c] text-[10px] font-black text-white"
                >
                  Continuar rota
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setModal(false)
                  }
                  className="mt-6 h-[50px] w-full rounded-[16px] bg-[#176f3c] text-[10px] font-black text-white"
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
