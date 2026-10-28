"use client";

import Link from "next/link";

import {
  BadgeDollarSign,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  Save,
  Truck,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";

import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  criarColaborador,
} from "./actions";

const initialState = {
  success:
    false,
  message:
    "",
  usuarioId:
    null as string | null,
};

export default function NovoEntregadorForm({
  empresaNome,
  usuariosAtivos,
  limiteUsuarios,
}: {
  empresaNome: string;
  usuariosAtivos: number;
  limiteUsuarios: number;
}) {
  const [
    state,
    formAction,
    pending,
  ] =
    useActionState(
      criarColaborador,
      initialState,
    );

  const [
    mostrarSenha,
    setMostrarSenha,
  ] =
    useState(
      false,
    );

  const [
    perfilCodigo,
    setPerfilCodigo,
  ] =
    useState<
      "ENTREGADOR" |
      "FINANCEIRO"
    >(
      "ENTREGADOR",
    );

  const [
    modalResultado,
    setModalResultado,
  ] =
    useState(
      false,
    );

  useEffect(
    () => {
      if (
        state.message
      ) {
        setModalResultado(
          true,
        );
      }
    },
    [
      state,
    ],
  );

  const disponiveis =
    Math.max(
      0,
      limiteUsuarios -
        usuariosAtivos,
    );

  return (
    <>
      <form
        action={
          formAction
        }
        className="space-y-5"
      >
        <input
          type="hidden"
          name="perfil_codigo"
          value={
            perfilCodigo
          }
        />

        <section className="card-premium rounded-[30px] p-6 md:p-7">
          <div className="flex items-start gap-4">
            <div className="icon-emerald flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px]">
              <UsersRound
                size={22}
              />
            </div>

            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
                Perfil de acesso
              </p>

              <h2 className="mt-1 text-[22px] font-black tracking-[-0.035em]">
                Qual será a função?
              </h2>

              <p className="mt-1 text-[12px] leading-5 text-slate-500">
                Administradores não são criados por esta tela.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                setPerfilCodigo(
                  "ENTREGADOR",
                )
              }
              className={`rounded-[22px] border p-5 text-left transition ${
                perfilCodigo ===
                "ENTREGADOR"
                  ? "border-emerald-300 bg-emerald-50 shadow-[0_12px_30px_rgba(23,111,60,0.10)]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-emerald-100 text-emerald-700">
                  <Truck
                    size={20}
                  />
                </div>

                <div>
                  <p className="text-[15px] font-black">
                    Entregador
                  </p>

                  <p className="mt-1 text-[11px] text-slate-500">
                    Mobile, carga, rota, entrega e ocorrência.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setPerfilCodigo(
                  "FINANCEIRO",
                )
              }
              className={`rounded-[22px] border p-5 text-left transition ${
                perfilCodigo ===
                "FINANCEIRO"
                  ? "border-[#f4b13f] bg-[#fff9ea] shadow-[0_12px_30px_rgba(180,120,20,0.10)]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#fff0c7] text-[#a46600]">
                  <BadgeDollarSign
                    size={21}
                  />
                </div>

                <div>
                  <p className="text-[15px] font-black">
                    Financeiro
                  </p>

                  <p className="mt-1 text-[11px] text-slate-500">
                    Financeiro, crédito e recebimentos administrativos.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </section>

        <section className="card-premium rounded-[30px] p-6 md:p-7">
          <div className="grid gap-4 md:grid-cols-2">
            <Campo
              label="Nome do colaborador"
              name="nome"
              placeholder="Ex.: Joaquim Silva"
              icon={
                <UserRound
                  size={18}
                />
              }
              required
            />

            <Campo
              label="E-mail"
              name="email"
              type="email"
              placeholder="joaquim@email.com"
              icon={
                <Mail
                  size={18}
                />
              }
              required
            />

            <Campo
              label="Telefone"
              name="telefone"
              placeholder="(85) 99999-9999"
              icon={
                <Phone
                  size={18}
                />
              }
            />

            <div>
              <label className="text-[11px] font-extrabold text-slate-600">
                Senha inicial
              </label>

              <div className="mt-2 flex h-[56px] items-center rounded-[17px] border border-slate-200 bg-white px-4 transition focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-50">
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
                  minLength={
                    8
                  }
                  required
                  placeholder="Mínimo 8 caracteres"
                  className="h-full min-w-0 flex-1 bg-transparent px-3 text-[14px] font-semibold outline-none"
                />

                <button
                  type="button"
                  onClick={() =>
                    setMostrarSenha(
                      (
                        valor,
                      ) =>
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

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-[20px] bg-[#eff8f2] px-5 py-4">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#166c3b]">
                Empresa
              </p>

              <p className="mt-2 text-[14px] font-black text-[#17492d]">
                {
                  empresaNome
                }
              </p>

              <p className="mt-1 text-[11px] leading-5 text-[#668774]">
                O colaborador ficará vinculado somente a esta empresa.
              </p>
            </div>

            <div
              className={`rounded-[20px] px-5 py-4 ${
                disponiveis >
                0
                  ? "bg-slate-50"
                  : "bg-red-50"
              }`}
            >
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                Licenças de usuário
              </p>

              <div className="mt-2 flex items-end gap-2">
                <span className="text-[24px] font-black">
                  {
                    usuariosAtivos
                  }
                </span>

                <span className="pb-1 text-[12px] font-bold text-slate-400">
                  de{" "}
                  {
                    limiteUsuarios
                  } usadas
                </span>
              </div>

              <p
                className={`mt-1 text-[11px] font-bold ${
                  disponiveis >
                  0
                    ? "text-emerald-700"
                    : "text-red-600"
                }`}
              >
                {
                  disponiveis
                } licença(s) disponível(is)
              </p>
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={
            pending ||
            disponiveis ===
              0
          }
          className="flex h-[58px] w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#19864b,#0f6336)] text-[14px] font-black text-white shadow-[0_15px_30px_rgba(25,134,75,0.20)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save
            size={18}
          />

          {pending
            ? "Criando colaborador..."
            : `Cadastrar ${perfilCodigo === "ENTREGADOR" ? "entregador" : "financeiro"}`}
        </button>
      </form>

      {modalResultado &&
        state.message && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">
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

              <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                {state.success
                  ? "Cadastro concluído"
                  : "Cadastro não concluído"}
              </p>

              <h3 className="mt-2 text-[22px] font-black">
                {state.success
                  ? "Colaborador cadastrado"
                  : "Verifique os dados"}
              </h3>

              <p className="mt-3 text-[13px] leading-6 text-slate-500">
                {
                  state.message
                }
              </p>

              {state.success &&
              state.usuarioId ? (
                <div className="mt-6 space-y-2">
                  {perfilCodigo ===
                  "ENTREGADOR" ? (
                    <Link
                      href={`/admin/usuarios/${state.usuarioId}/permissoes`}
                      className="flex h-[52px] w-full items-center justify-center rounded-[16px] bg-[#176f3c] text-[13px] font-black text-white"
                    >
                      Configurar permissões individuais
                    </Link>
                  ) : null}

                  <Link
                    href="/admin/usuarios"
                    className="flex h-[50px] w-full items-center justify-center rounded-[16px] border border-slate-200 text-[12px] font-black text-slate-600"
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
                  className="mt-6 h-[52px] w-full rounded-[16px] bg-[#176f3c] text-[13px] font-black text-white"
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
  icon:
    React.ReactNode;
  required?:
    boolean;
  type?:
    string;
}) {
  return (
    <div>
      <label className="text-[11px] font-extrabold text-slate-600">
        {
          label
        }
      </label>

      <div className="mt-2 flex h-[56px] items-center rounded-[17px] border border-slate-200 bg-white px-4 transition focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-50">
        <div className="shrink-0 text-emerald-700">
          {
            icon
          }
        </div>

        <input
          name={
            name
          }
          type={
            type
          }
          required={
            required
          }
          placeholder={
            placeholder
          }
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-[14px] font-semibold outline-none"
        />
      </div>
    </div>
  );
}
