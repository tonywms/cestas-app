"use client";

import {
  CheckCircle2,
  MapPin,
  PackageCheck,
  Save,
  UserRound,
  XCircle,
} from "lucide-react";

import Link from "next/link";

import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  registrarEntrega,
} from "./actions";

const initialState = {
  success: false,
  message: "",
  saldoAnterior:
    null as number | null,
  saldoAtual:
    null as number | null,
};

type Cliente = {
  id: number;
  codigo: string;
  nome: string;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
};

type ItemCarga = {
  tipoCestaId: number;
  nome: string;
  codigo: string;
  saldo: number;
};

export default function EntregaForm({
  cargaId,
  cargaCodigo,
  clientes,
  itens,
  rotaClienteId,
  clienteSelecionado,
}: {
  cargaId: number;
  cargaCodigo: string;
  clientes: Cliente[];
  itens: ItemCarga[];

  rotaClienteId:
    number | null;

  clienteSelecionado:
    Cliente | null;
}) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    registrarEntrega,
    initialState,
  );

  const [
    modal,
    setModal,
  ] = useState(false);

  useEffect(() => {
    if (state.message) {
      setModal(true);
    }
  }, [state]);

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

        {rotaClienteId && (
          <input
            type="hidden"
            name="rota_cliente_id"
            value={
              rotaClienteId
            }
          />
        )}

        {/* CARGA */}
        <div className="rounded-[26px] bg-white p-5 shadow-sm">

          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">
            Carga atual
          </p>

          <h2 className="mt-2 text-lg font-black">
            {cargaCodigo}
          </h2>

        </div>

        {/* CLIENTE DA ROTA */}
        {clienteSelecionado ? (
          <div className="rounded-[26px] border border-emerald-100 bg-white p-5 shadow-sm">

            <input
              type="hidden"
              name="cliente_id"
              value={
                clienteSelecionado.id
              }
            />

            <div className="flex items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-emerald-50 text-emerald-700">

                <UserRound
                  size={21}
                />

              </div>

              <div className="min-w-0 flex-1">

                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-700">
                  Cliente da rota
                </p>

                <h3 className="mt-1 text-base font-black">
                  {
                    clienteSelecionado.nome
                  }
                </h3>

                <p className="mt-1 text-[9px] font-bold text-slate-400">
                  {
                    clienteSelecionado.codigo
                  }
                </p>

                <div className="mt-3 flex items-start gap-2 text-[10px] leading-4 text-slate-500">

                  <MapPin
                    size={13}
                    className="mt-0.5 shrink-0"
                  />

                  <span>
                    {clienteSelecionado.logradouro ??
                      "Endereço não informado"}

                    {clienteSelecionado.numero
                      ? `, ${clienteSelecionado.numero}`
                      : ""}

                    {clienteSelecionado.bairro
                      ? ` - ${clienteSelecionado.bairro}`
                      : ""}
                  </span>

                </div>

              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[8px] font-black text-emerald-700">
                ROTA
              </span>

            </div>

          </div>
        ) : (
          <div className="rounded-[26px] bg-white p-5 shadow-sm">

            <label className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
              Cliente
            </label>

            <div className="relative mt-2">

              <UserRound
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700"
              />

              <select
                name="cliente_id"
                required
                className="h-[54px] w-full appearance-none rounded-[16px] border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold outline-none"
              >

                <option value="">
                  Selecione o cliente
                </option>

                {clientes.map(
                  (cliente) => (
                    <option
                      key={
                        cliente.id
                      }
                      value={
                        cliente.id
                      }
                    >
                      {cliente.nome} - {cliente.codigo}
                    </option>
                  ),
                )}

              </select>

            </div>

          </div>
        )}

        {/* ENTREGA */}
        <div className="rounded-[26px] bg-white p-5 shadow-sm">

          <label className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
            Tipo de cesta
          </label>

          <div className="relative mt-2">

            <PackageCheck
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700"
            />

            <select
              name="tipo_cesta_id"
              required
              className="h-[54px] w-full appearance-none rounded-[16px] border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold outline-none"
            >

              <option value="">
                Selecione
              </option>

              {itens.map(
                (item) => (
                  <option
                    key={
                      item.tipoCestaId
                    }
                    value={
                      item.tipoCestaId
                    }
                  >
                    {item.nome} - saldo {item.saldo}
                  </option>
                ),
              )}

            </select>

          </div>

          <label className="mt-5 block text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
            Quantidade entregue
          </label>

          <input
            type="number"
            name="quantidade"
            min={1}
            step={1}
            defaultValue={1}
            required
            className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-emerald-500"
          />

          <label className="mt-5 block text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
            Observação
          </label>

          <input
            name="observacao"
            placeholder="Opcional"
            className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-emerald-500"
          />

        </div>

        <button
          type="submit"
          disabled={pending}
          className="flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#176f3c] text-sm font-black text-white shadow-[0_12px_30px_rgba(23,111,60,0.18)] disabled:opacity-60"
        >
          <Save
            size={18}
          />

          {pending
            ? "Registrando..."
            : "Confirmar entrega"}
        </button>

      </form>

      {/* MODAL */}
      {modal &&
        state.message && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">

            <div className="w-full max-w-[410px] rounded-[30px] bg-white p-7 text-center">

              {state.success ? (
                <CheckCircle2
                  size={42}
                  className="mx-auto text-emerald-600"
                />
              ) : (
                <XCircle
                  size={42}
                  className="mx-auto text-red-600"
                />
              )}

              <p className="mt-5 text-[9px] font-black uppercase tracking-[0.17em] text-slate-400">
                {state.success
                  ? "Operação concluída"
                  : "Falha na operação"}
              </p>

              <h3 className="mt-2 text-xl font-black">
                {state.success
                  ? "Entrega concluída"
                  : "Erro na entrega"}
              </h3>

              <p className="mt-3 text-xs leading-6 text-slate-500">
                {state.message}
              </p>

              {state.success &&
                state.saldoAnterior !==
                  null &&
                state.saldoAtual !==
                  null && (
                  <div className="mt-5 grid grid-cols-2 gap-3">

                    <div className="rounded-[18px] bg-slate-50 p-4">

                      <p className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">
                        Antes
                      </p>

                      <p className="mt-2 text-2xl font-black">
                        {
                          state.saldoAnterior
                        }
                      </p>

                    </div>

                    <div className="rounded-[18px] bg-emerald-50 p-4">

                      <p className="text-[8px] font-black uppercase tracking-[0.1em] text-emerald-600">
                        Agora
                      </p>

                      <p className="mt-2 text-2xl font-black text-emerald-700">
                        {
                          state.saldoAtual
                        }
                      </p>

                    </div>

                  </div>
                )}

              {state.success ? (
                <Link
                  href={
                    rotaClienteId
                      ? "/mobile/rota"
                      : "/mobile/carga"
                  }
                  className="mt-6 flex h-[50px] items-center justify-center rounded-[16px] bg-[#176f3c] text-xs font-black text-white"
                >
                  {rotaClienteId
                    ? "Continuar rota"
                    : "Ver Minha Carga"}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setModal(false)
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