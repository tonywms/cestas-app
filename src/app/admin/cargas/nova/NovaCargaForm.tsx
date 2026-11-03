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
  useRef,
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
  cargaAtiva: {
    id: number;
    codigo: string;
    status: string;
  } | null;
  cargasDisponiveis: { id: number; codigo: string; status: string }[];
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

  const [
    entregadorId,
    setEntregadorId,
  ] =
    useState("");

  const [
    quantidade,
    setQuantidade,
  ] = useState("");

  const [operacao, setOperacao] = useState<"CRIAR" | "REABASTECER">("CRIAR");
  const [cargaDestinoId, setCargaDestinoId] = useState("");

  const ultimaMensagemRef =
    useRef(
      state.message,
    );

  useEffect(
    () => {
      if (
        state.message &&
        state.message !==
          ultimaMensagemRef.current
      ) {
        setModal(true);
      }

      ultimaMensagemRef.current =
        state.message;
    },
    [
      state.message,
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

  const entregadorSelecionado =
    useMemo(
      () =>
        entregadores.find(
          (
            item,
          ) =>
            item.id ===
            entregadorId,
        ) ??
        null,
      [
        entregadores,
        entregadorId,
      ],
    );

  const cargaAtiva = entregadorSelecionado?.cargaAtiva ?? null;
  const cargasDisponiveis = entregadorSelecionado?.cargasDisponiveis ?? [];
  const destinoValido = cargasDisponiveis.some(c => String(c.id) === cargaDestinoId);
  const operacaoValida = operacao === "CRIAR" || destinoValido;

  const quantidadeNumero =
    Number(
      quantidade,
    );

  const quantidadeValida =
    Number.isInteger(
      quantidadeNumero,
    ) &&
    quantidadeNumero > 0 &&
    !!tipoSelecionado &&
    quantidadeNumero <=
      tipoSelecionado.saldo;

  const formularioPronto =
    !!entregadorSelecionado &&
    !!tipoSelecionado &&
    quantidadeValida &&
    operacaoValida;

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
              Registre uma entrada antes de criar ou reabastecer uma carga.
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
              value={
                entregadorId
              }
              onChange={(
                event,
              ) =>
                (setEntregadorId(event.target.value), setCargaDestinoId(""))
              }
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
                    {entregador.nome}
                    {entregador.cargaAtiva
                      ? ` — ${entregador.cargaAtiva.codigo} ativa`
                      : ""}
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
                  event.target.value,
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

          <div className="md:col-span-2 space-y-3 rounded-[20px] border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-800">Operação obrigatória — escolha o destino do estoque</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => { setOperacao("CRIAR"); setCargaDestinoId(""); }}
                aria-pressed={operacao === "CRIAR"}
                className={`rounded-[16px] border p-4 text-left ${operacao === "CRIAR" ? "border-emerald-600 bg-white shadow-sm" : "border-slate-200 bg-white/60"}`}>
                <span className="block text-[12px] font-black">Criar nova carga</span>
                <span className="mt-1 block text-[10px] text-slate-500">Novo número e histórico independentes.</span>
              </button>
              <button type="button" onClick={() => { setOperacao("REABASTECER"); setCargaDestinoId(""); }}
                aria-pressed={operacao === "REABASTECER"}
                className={`rounded-[16px] border p-4 text-left ${operacao === "REABASTECER" ? "border-emerald-600 bg-white shadow-sm" : "border-slate-200 bg-white/60"}`}>
                <span className="block text-[12px] font-black">Reabastecer carga existente</span>
                <span className="mt-1 block text-[10px] text-slate-500">Escolher a carga específica antes da movimentação.</span>
              </button>
            </div>
            <input type="hidden" name="operacao_carga" value={operacao} />
            {operacao === "REABASTECER" && (
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-emerald-800">Carga de destino</label>
                <select name="carga_destino_id" value={cargaDestinoId} required
                  onChange={e => setCargaDestinoId(e.target.value)}
                  className="mt-2 h-[50px] w-full rounded-[15px] border border-emerald-200 bg-white px-3 text-[11px] font-bold">
                  <option value="">Selecione a carga em aberto</option>
                  {cargasDisponiveis.map(c => <option key={c.id} value={c.id}>{`Carga nº ${c.id} — ${c.codigo} (${c.status})`}</option>)}
                </select>
                {cargasDisponiveis.length === 0 && <p className="mt-2 text-[10px] text-amber-800">Este entregador não possui carga ativa para reabastecimento.</p>}
              </div>
            )}
            {operacao === "CRIAR" && cargaAtiva && (
              <div role="status" className="rounded-[15px] border border-emerald-200 bg-white p-3 text-[10px] leading-5 text-emerald-900">
                <strong>Nova carga independente.</strong> A carga anterior {cargaAtiva.codigo} nao sera alterada. O entregador escolhera no mobile qual carga utilizar.
              </div>
            )}
          </div>

          {operacao === "REABASTECER" && cargaAtiva && (
            <div className="md:col-span-2 rounded-[18px] border border-sky-200 bg-sky-50 p-4">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-sky-700">
                    Carga ativa encontrada
                  </p>

                  <p className="mt-1 text-[14px] font-black text-sky-950">
                    {cargaAtiva.codigo}
                  </p>

                  <p className="mt-1 text-[9px] leading-5 text-sky-800/70">
                    A quantidade informada só será adicionada à carga escolhida acima, após confirmar a operação.
                  </p>
                </div>

                <Link
                  href={`/admin/cargas/${cargaAtiva.id}`}
                  className="flex h-[42px] shrink-0 items-center justify-center rounded-[13px] border border-sky-200 bg-white px-4 text-[9px] font-black text-sky-800"
                >
                  Abrir carga atual
                </Link>

              </div>

            </div>
          )}

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
                      {tipoSelecionado.nome}
                    </p>
                  </div>

                </div>

                <p className="text-[27px] font-black text-[#176f3c]">
                  {tipoSelecionado.saldo}
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
              value={
                quantidade
              }
              onChange={(
                event,
              ) =>
                setQuantidade(
                  event.target.value,
                )
              }
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

        {!formularioPronto && (
          <p className="mt-5 text-center text-[9px] font-bold text-slate-400">
            Selecione entregador, tipo de cesta e informe uma quantidade válida para continuar.
          </p>
        )}

        <button
          type="submit"
          disabled={
            pending ||
            entregadores.length ===
              0 ||
            !possuiSaldo ||
            !formularioPronto
          }
          className="mt-3 flex h-[56px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#176f3c] text-[11px] font-black text-white shadow-[0_14px_30px_rgba(23,111,60,0.18)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save
            size={18}
          />

          {pending
            ? operacao === "REABASTECER" ? "Reabastecendo carga..." : "Criando carga..."
            : operacao === "REABASTECER"
              ? `Confirmar reabastecimento da carga nº ${cargasDisponiveis.find(c => String(c.id) === cargaDestinoId)?.id ?? "—"}`
              : "Criar nova carga independente"}
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
                  ? state.operacao ===
                      "REABASTECIDA"
                    ? "Reabastecimento concluído"
                    : "Transferência concluída"
                  : "Operação não concluída"}
              </p>

              <h3 className="mt-2 text-[20px] font-black">
                {state.success
                  ? state.operacao ===
                      "REABASTECIDA"
                    ? "Carga reabastecida"
                    : "Carga criada"
                  : state.errorTitle ??
                    "Não foi possível concluir"}
              </h3>

              <p className="mt-3 text-[11px] leading-5 text-slate-500">
                {state.message}
              </p>

              {state.success ? (
                <div className="mt-6 space-y-2">

                  {state.cargaId ? (
                    <Link
                      href={`/admin/cargas/${state.cargaId}`}
                      className="flex h-[50px] items-center justify-center rounded-[16px] bg-[#176f3c] text-xs font-black text-white shadow-[0_12px_24px_rgba(23,111,60,0.18)]"
                    >
                      {state.operacao ===
                      "REABASTECIDA"
                        ? "Abrir carga reabastecida"
                        : "Abrir carga criada"}
                    </Link>
                  ) : (
                    <Link
                      href="/admin/cargas"
                      className="flex h-[50px] items-center justify-center rounded-[16px] bg-[#176f3c] text-xs font-black text-white"
                    >
                      Ver cargas
                    </Link>
                  )}

                  <Link
                    href="/admin/cargas"
                    className="flex h-[50px] items-center justify-center rounded-[16px] border border-[#dbe7de] bg-white text-xs font-black text-[#176f3c]"
                  >
                    Ver todas as cargas
                  </Link>

                  <button
                    type="button"
                    onClick={() => setModal(false)}
                    className="flex h-[50px] w-full items-center justify-center rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 text-[11px] font-black text-[#176f3c] shadow-[0_8px_18px_rgba(23,111,60,0.08)] transition hover:border-emerald-300 hover:bg-emerald-100 active:scale-[0.99]"
                  >
                    {state.operacao ===
                    "REABASTECIDA"
                      ? "Adicionar mais saldo"
                      : "Criar outra carga"}
                  </button>

                </div>
              ) : (
                <div className="mt-6 space-y-2">

                  {state.nextHref &&
                    state.nextLabel && (
                      <Link
                        href={state.nextHref}
                        className="flex h-[50px] w-full items-center justify-center rounded-[16px] bg-[#176f3c] px-4 text-xs font-black text-white shadow-[0_12px_24px_rgba(23,111,60,0.18)]"
                      >
                        {state.nextLabel}
                      </Link>
                    )}

                  <button
                    type="button"
                    onClick={() =>
                      setModal(
                        false,
                      )
                    }
                    className={`h-[48px] w-full rounded-[15px] text-[11px] font-black ${
                      state.nextHref
                        ? "border border-slate-200 bg-white text-slate-500"
                        : "bg-[#176f3c] text-white"
                    }`}
                  >
                    {state.nextHref
                      ? "Fechar aviso"
                      : "Entendi"}
                  </button>

                </div>
              )}

            </div>

          </div>
        )}
    </>
  );
}
