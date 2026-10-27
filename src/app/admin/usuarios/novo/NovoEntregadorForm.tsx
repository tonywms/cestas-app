"use client";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
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
  criarEntregador,
} from "./actions";

const initialState = {
  success: false,
  message: "",
  usuarioId: null as string | null,
};

export default function NovoEntregadorForm({
  empresaNome,
}: {
  empresaNome: string;
}) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    criarEntregador,
    initialState,
  );

  const [
    mostrarSenha,
    setMostrarSenha,
  ] = useState(false);

  const [
    modalResultado,
    setModalResultado,
  ] = useState(false);

  useEffect(() => {
    if (state.message) {
      setModalResultado(true);
    }
  }, [state]);

  return (
    <>
      <form
        action={formAction}
        className="space-y-4"
      >
        <section className="rounded-[30px] border border-black/[0.04] bg-white p-6 shadow-[0_18px_55px_rgba(17,63,33,0.06)] md:p-7">
          <div className="grid gap-4 md:grid-cols-2">

            <Campo
              label="Nome do colaborador"
              name="nome"
              placeholder="Ex.: Joaquim Silva"
              icon={
                <UserRound size={18} />
              }
              required
            />

            <Campo
              label="E-mail"
              name="email"
              type="email"
              placeholder="joaquim@email.com"
              icon={
                <Mail size={18} />
              }
              required
            />

            <Campo
              label="Telefone"
              name="telefone"
              placeholder="(85) 99999-9999"
              icon={
                <Phone size={18} />
              }
            />

            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                Senha inicial
              </label>

              <div className="mt-2 flex h-[54px] items-center rounded-[17px] border border-slate-200 bg-white px-4 transition focus-within:border-emerald-400">
                <LockKeyhole
                  size={18}
                  className="shrink-0 text-emerald-700"
                />

                <input
                  name="senha"
                  type={
                    mostrarSenha
                      ? "text"
                      : "password"
                  }
                  minLength={8}
                  required
                  placeholder="Mínimo 8 caracteres"
                  className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold outline-none"
                />

                <button
                  type="button"
                  onClick={() =>
                    setMostrarSenha(
                      (valor) =>
                        !valor,
                    )
                  }
                  className="text-slate-400"
                >
                  {mostrarSenha ? (
                    <EyeOff
                      size={18}
                    />
                  ) : (
                    <Eye
                      size={18}
                    />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[18px] bg-[#eff8f2] px-5 py-4">
            <p className="text-[11px] font-black text-[#166c3b]">
              Empresa: {empresaNome}
            </p>

            <p className="mt-1 text-[10px] leading-5 text-[#668774]">
              Este colaborador será cadastrado
              automaticamente com o perfil{" "}
              <strong>
                ENTREGADOR
              </strong>{" "}
              e só ficará vinculado a esta empresa.
            </p>
          </div>
        </section>

        <button
          type="submit"
          disabled={pending}
          className="flex h-[54px] w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#19864b,#0f6336)] text-sm font-black text-white shadow-[0_15px_30px_rgba(25,134,75,0.20)] disabled:opacity-60"
        >
          <Save size={18} />

          {pending
            ? "Criando colaborador..."
            : "Cadastrar entregador"}
        </button>
      </form>

      {modalResultado &&
        state.message && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[5px]">
            <div className="w-full max-w-[430px] rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.25)]">

              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                  state.success
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {state.success ? (
                  <CheckCircle2
                    size={32}
                  />
                ) : (
                  <XCircle
                    size={32}
                  />
                )}
              </div>

              <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                {state.success
                  ? "Cadastro concluído"
                  : "Falha no cadastro"}
              </p>

              <h3 className="mt-2 text-xl font-black">
                {state.success
                  ? "Entregador cadastrado"
                  : "Não foi possível cadastrar"}
              </h3>

              <p className="mt-3 text-xs leading-6 text-slate-500">
                {state.message}
              </p>

              {state.success &&
              state.usuarioId ? (
                <div className="mt-6 space-y-2">
                  <Link
                    href={`/admin/usuarios/${state.usuarioId}/permissoes`}
                    className="flex h-[50px] w-full items-center justify-center rounded-[16px] bg-[#176f3c] text-xs font-black text-white"
                  >
                    Configurar permissões individuais
                  </Link>

                  <Link
                    href="/admin/usuarios"
                    className="flex h-[50px] w-full items-center justify-center rounded-[16px] border border-slate-200 text-xs font-black text-slate-600"
                  >
                    Voltar para colaboradores
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setModalResultado(
                      false,
                    )
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

function Campo({
  label,
  name,
  placeholder,
  icon,
  required = false,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder: string;
  icon: React.ReactNode;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </label>

      <div className="mt-2 flex h-[54px] items-center rounded-[17px] border border-slate-200 bg-white px-4 transition focus-within:border-emerald-400">
        <div className="shrink-0 text-emerald-700">
          {icon}
        </div>

        <input
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold outline-none"
        />
      </div>
    </div>
  );
}