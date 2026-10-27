"use client";

import {
  CheckCircle2,
  PackagePlus,
  Save,
  XCircle,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  criarTipoCesta,
} from "./actions";

const initialState = {
  success: false,
  message: "",
};

export default function NovoTipoCestaForm() {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    criarTipoCesta,
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
        className="rounded-[28px] bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-emerald-700">
            <PackagePlus
              size={21}
            />
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">
              Cadastro
            </p>

            <h2 className="text-lg font-black">
              Novo tipo de cesta
            </h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Campo
            name="codigo"
            label="Código"
            placeholder="EX.: BASICA01"
          />

          <Campo
            name="nome"
            label="Nome"
            placeholder="Ex.: Cesta Básica Padrão"
          />

          <Campo
            name="valor_venda"
            label="Valor de venda"
            placeholder="Ex.: 150,00"
          />

          <Campo
            name="descricao"
            label="Descrição"
            placeholder="Descrição opcional"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#176f3c] text-sm font-black text-white disabled:opacity-60"
        >
          <Save size={18} />

          {pending
            ? "Salvando..."
            : "Cadastrar cesta"}
        </button>
      </form>

      {modal &&
        state.message && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-[400px] rounded-[28px] bg-white p-7 text-center">

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
                  ? "Cesta cadastrada"
                  : "Erro no cadastro"}
              </h3>

              <p className="mt-3 text-xs text-slate-500">
                {state.message}
              </p>

              <button
                type="button"
                onClick={() =>
                  setModal(false)
                }
                className="mt-6 h-[48px] w-full rounded-[15px] bg-[#176f3c] text-xs font-black text-white"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
    </>
  );
}

function Campo({
  name,
  label,
  placeholder,
}: {
  name: string;
  label: string;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </label>

      <input
        name={name}
        placeholder={placeholder}
        className="mt-2 h-[52px] w-full rounded-[16px] border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-emerald-500"
      />
    </div>
  );
}