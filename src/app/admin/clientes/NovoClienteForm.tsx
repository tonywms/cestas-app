"use client";

import {
  CheckCircle2,
  Save,
  UserPlus,
  XCircle,
} from "lucide-react";

import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  criarCliente,
} from "./actions";

const initialState = {
  success: false,
  message: "",
};

export default function NovoClienteForm() {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    criarCliente,
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
        className="rounded-[30px] bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-emerald-700">
            <UserPlus size={21} />
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">
              Cadastro
            </p>

            <h2 className="text-lg font-black">
              Novo cliente
            </h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">

          <Campo
            name="codigo"
            label="Código"
            placeholder="Automático se vazio"
          />

          <Campo
            name="nome"
            label="Nome"
            placeholder="Ex.: Maria Silva"
            required
          />

          <Campo
            name="cpf_cnpj"
            label="CPF / CNPJ"
            placeholder="Opcional"
          />

          <Campo
            name="telefone"
            label="Telefone"
            placeholder="(85) 99999-9999"
          />

          <Campo
            name="logradouro"
            label="Endereço"
            placeholder="Rua / Avenida"
          />

          <Campo
            name="numero"
            label="Número"
            placeholder="123"
          />

          <Campo
            name="bairro"
            label="Bairro"
            placeholder="Bairro"
          />

          <Campo
            name="cidade"
            label="Cidade"
            placeholder="Fortaleza"
          />

          <Campo
            name="uf"
            label="UF"
            placeholder="CE"
          />

          <Campo
            name="cep"
            label="CEP"
            placeholder="00000-000"
          />

        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-6 flex h-[54px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#176f3c] text-sm font-black text-white disabled:opacity-60"
        >
          <Save size={18} />

          {pending
            ? "Cadastrando..."
            : "Cadastrar cliente"}
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
                  ? "Cliente cadastrado"
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
  required = false,
}: {
  name: string;
  label: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </label>

      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="mt-2 h-[52px] w-full rounded-[16px] border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-emerald-500"
      />
    </div>
  );
}