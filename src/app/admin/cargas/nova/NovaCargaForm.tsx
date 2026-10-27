"use client";

import {
  CheckCircle2,
  Save,
  Truck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  criarCarga,
} from "../actions";

const initialState = {
  success: false,
  message: "",
  cargaId: null as number | null,
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
  ] = useActionState(
    criarCarga,
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

  if (
    tiposCesta.length === 0
  ) {
    return (
      <div className="rounded-[28px] bg-white p-7 text-center shadow-sm">
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
      <form
        action={formAction}
        className="rounded-[28px] bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">

          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
              Entregador
            </label>

            <select
              name="entregador_id"
              required
              className="mt-2 h-[52px] w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm font-semibold outline-none"
            >
              <option value="">
                Selecione
              </option>

              {entregadores.map(
                (entregador) => (
                  <option
                    key={
                      entregador.id
                    }
                    value={
                      entregador.id
                    }
                  >
                    {entregador.nome}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
              Tipo de cesta
            </label>

            <select
              name="tipo_cesta_id"
              required
              className="mt-2 h-[52px] w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm font-semibold outline-none"
            >
              <option value="">
                Selecione
              </option>

              {tiposCesta.map(
                (tipo) => (
                  <option
                    key={tipo.id}
                    value={tipo.id}
                  >
                    {tipo.nome} - {tipo.codigo}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
              Quantidade
            </label>

            <input
              type="number"
              name="quantidade"
              min={1}
              step={1}
              required
              placeholder="Ex.: 10"
              className="mt-2 h-[52px] w-full rounded-[16px] border border-slate-200 px-4 text-sm font-semibold outline-none"
            />
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
              Observação
            </label>

            <input
              name="observacao"
              placeholder="Opcional"
              className="mt-2 h-[52px] w-full rounded-[16px] border border-slate-200 px-4 text-sm font-semibold outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={
            pending ||
            entregadores.length ===
              0
          }
          className="mt-6 flex h-[54px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#176f3c] text-sm font-black text-white disabled:opacity-50"
        >
          <Save size={18} />

          {pending
            ? "Criando carga..."
            : "Criar carga"}
        </button>
      </form>

      {modal &&
        state.message && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-[420px] rounded-[28px] bg-white p-7 text-center">

              {state.success ? (
                <CheckCircle2
                  size={38}
                  className="mx-auto text-emerald-600"
                />
              ) : (
                <XCircle
                  size={38}
                  className="mx-auto text-red-600"
                />
              )}

              <h3 className="mt-4 text-lg font-black">
                {state.success
                  ? "Carga criada"
                  : "Erro na carga"}
              </h3>

              <p className="mt-3 text-xs leading-6 text-slate-500">
                {state.message}
              </p>

              {state.success ? (
                <div className="mt-6 space-y-2">
                  <Link
                    href="/admin/cargas"
                    className="flex h-[48px] items-center justify-center rounded-[15px] bg-[#176f3c] text-xs font-black text-white"
                  >
                    Ver cargas
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      setModal(false)
                    }
                    className="h-[48px] w-full rounded-[15px] border border-slate-200 text-xs font-black"
                  >
                    Continuar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setModal(false)
                  }
                  className="mt-6 h-[48px] w-full rounded-[15px] bg-[#176f3c] text-xs font-black text-white"
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