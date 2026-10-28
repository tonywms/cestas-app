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
  success:
    false,
  message:
    "",
};

export default function NovoTipoCestaForm() {
  const [
    state,
    formAction,
    pending,
  ] =
    useActionState(
      criarTipoCesta,
      initialState,
    );

  const [
    modal,
    setModal,
  ] =
    useState(
      false,
    );

  useEffect(
    () => {
      if (
        state.message
      ) {
        setModal(
          true,
        );
      }
    },
    [
      state,
    ],
  );

  return (
    <>
      <form
        action={
          formAction
        }
        className="card-premium rounded-[30px] p-6"
      >
        <div className="flex items-start gap-3">
          <div className="icon-emerald flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px]">
            <PackagePlus
              size={21}
            />
          </div>

          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
              Cadastro
            </p>

            <h2 className="mt-1 text-[22px] font-black tracking-[-0.035em]">
              Novo tipo de cesta
            </h2>

            <p className="mt-1 text-[12px] text-slate-500">
              O código identifica o produto dentro da empresa e não pode ser duplicado.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Campo
            name="codigo"
            label="Código"
            placeholder="Ex.: BASICA01"
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
          disabled={
            pending
          }
          className="mt-6 flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#1f8a4c,#0d5d31)] text-[13px] font-black text-white shadow-[0_16px_30px_rgba(23,111,60,0.22)] disabled:opacity-60"
        >
          <Save
            size={18}
          />

          {pending
            ? "Salvando..."
            : "Cadastrar cesta"}
        </button>
      </form>

      {modal &&
        state.message && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">
            <div className="w-full max-w-[410px] rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.28)]">
              {state.success ? (
                <CheckCircle2
                  size={40}
                  className="mx-auto text-emerald-600"
                />
              ) : (
                <XCircle
                  size={40}
                  className="mx-auto text-red-600"
                />
              )}

              <h3 className="mt-4 text-[21px] font-black">
                {state.success
                  ? "Cesta cadastrada"
                  : "Cadastro não concluído"}
              </h3>

              <p className="mt-3 text-[13px] leading-6 text-slate-500">
                {
                  state.message
                }
              </p>

              <button
                type="button"
                onClick={() =>
                  setModal(
                    false,
                  )
                }
                className="mt-6 h-[50px] w-full rounded-[16px] bg-[#176f3c] text-[12px] font-black text-white"
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
  name:
    string;
  label:
    string;
  placeholder:
    string;
}) {
  return (
    <div>
      <label className="text-[11px] font-extrabold text-slate-600">
        {
          label
        }
      </label>

      <input
        name={
          name
        }
        placeholder={
          placeholder
        }
        required={
          name !==
          "descricao"
        }
        className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-[14px] font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
      />
    </div>
  );
}
