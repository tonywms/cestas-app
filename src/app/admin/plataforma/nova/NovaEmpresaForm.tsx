"use client";

import Link from "next/link";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  Save,
  XCircle,
} from "lucide-react";

import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  criarEmpresaPlataforma,
} from "../actions";

const initialState = {
  success:
    false,
  message:
    "",
  empresaId:
    null as string | null,
};

export default function NovaEmpresaForm() {
  const [
    state,
    action,
    pending,
  ] =
    useActionState(
      criarEmpresaPlataforma,
      initialState,
    );

  const [
    modo,
    setModo,
  ] =
    useState<
      "QUANTIDADE" |
      "VOLUME"
    >(
      "QUANTIDADE",
    );

  const [
    mostrarSenha,
    setMostrarSenha,
  ] =
    useState(
      false,
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
          action
        }
        className="space-y-5"
      >
        <section className="card-premium rounded-[30px] p-6">
          <Titulo
            eyebrow="Empresa"
            titulo="Identificação do fornecedor"
            texto="Cada empresa terá banco lógico isolado por tenant_id/RLS."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Campo
              name="codigo"
              label="Código"
              placeholder="Ex.: CESTASMAIA"
            />

            <Campo
              name="nome_fantasia"
              label="Nome fantasia"
              placeholder="Ex.: Cestas Maia"
            />

            <Campo
              name="razao_social"
              label="Razão social"
              placeholder="Opcional"
              required={
                false
              }
            />

            <Campo
              name="cnpj"
              label="CNPJ"
              placeholder="Opcional"
              required={
                false
              }
            />

            <Campo
              name="limite_usuarios"
              label="Limite de usuários"
              placeholder="Ex.: 8"
              type="number"
              defaultValue="5"
            />
          </div>
        </section>

        <section className="card-premium rounded-[30px] p-6">
          <Titulo
            eyebrow="Operação"
            titulo="Modelo logístico"
            texto="Define se a empresa trabalha apenas com quantidade ou rastreabilidade individual."
          />

          <input
            type="hidden"
            name="modo_controle_carga"
            value={
              modo
            }
          />

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                setModo(
                  "QUANTIDADE",
                )
              }
              className={`rounded-[20px] border p-5 text-left ${
                modo ===
                "QUANTIDADE"
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700">
                QUANTIDADE
              </p>

              <p className="mt-2 text-[16px] font-black">
                Controle simples
              </p>

              <p className="mt-2 text-[12px] leading-5 text-slate-500">
                O entregador possui saldo numérico de cestas.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setModo(
                  "VOLUME",
                )
              }
              className={`rounded-[20px] border p-5 text-left ${
                modo ===
                "VOLUME"
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700">
                VOLUME
              </p>

              <p className="mt-2 text-[16px] font-black">
                Rastreabilidade individual
              </p>

              <p className="mt-2 text-[12px] leading-5 text-slate-500">
                Cada cesta recebe identificação individual e pode exigir bipagem.
              </p>
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Check
              name="exigir_bipagem_carga"
              label="Bipar ao receber carga"
              disabled={
                modo !==
                "VOLUME"
              }
            />

            <Check
              name="exigir_bipagem_entrega"
              label="Bipar na entrega"
              disabled={
                modo !==
                "VOLUME"
              }
            />

            <Check
              name="permitir_pagamento_mobile"
              label="Recebimento pelo entregador"
              defaultChecked
            />

            <Check
              name="permitir_ocorrencia_mobile"
              label="Ocorrências em campo"
              defaultChecked
            />
          </div>
        </section>

        <section className="card-premium rounded-[30px] p-6">
          <Titulo
            eyebrow="Primeiro acesso"
            titulo="Administrador da empresa"
            texto="Esse usuário será criado, confirmado e vinculado somente à nova empresa."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Campo
              name="admin_nome"
              label="Nome do administrador"
              placeholder="Nome completo"
            />

            <Campo
              name="admin_email"
              label="E-mail"
              placeholder="admin@empresa.com.br"
              type="email"
            />

            <label className="md:col-span-2">
              <span className="text-[11px] font-extrabold text-slate-600">
                Senha inicial
              </span>

              <div className="mt-2 flex h-[54px] items-center rounded-[17px] border border-slate-200 bg-white px-4 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-50">
                <input
                  name="admin_senha"
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
                  className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-semibold outline-none"
                />

                <button
                  type="button"
                  onClick={() =>
                    setMostrarSenha(
                      (
                        atual,
                      ) =>
                        !atual,
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
            </label>
          </div>
        </section>

        <button
          type="submit"
          disabled={
            pending
          }
          className="flex h-[60px] w-full items-center justify-center gap-2 rounded-[19px] bg-[linear-gradient(135deg,#1f8a4c,#0d5d31)] text-[14px] font-black text-white shadow-[0_16px_30px_rgba(23,111,60,0.24)] disabled:opacity-50"
        >
          <Save
            size={18}
          />

          {pending
            ? "Criando ambiente..."
            : "Criar empresa e administrador"}
        </button>
      </form>

      {modal &&
        state.message ? (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">
          <div className="w-full max-w-[440px] rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.28)]">
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

            <h3 className="mt-4 text-[22px] font-black">
              {state.success
                ? "Empresa criada"
                : "Onboarding não concluído"}
            </h3>

            <p className="mt-3 text-[13px] leading-6 text-slate-500">
              {
                state.message
              }
            </p>

            {state.success &&
            state.empresaId ? (
              <Link
                href={`/admin/plataforma/empresas/${state.empresaId}`}
                className="mt-6 flex h-[50px] items-center justify-center rounded-[16px] bg-[#176f3c] text-[12px] font-black text-white"
              >
                Abrir empresa
              </Link>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setModal(
                    false,
                  )
                }
                className="mt-6 h-[50px] w-full rounded-[16px] bg-[#176f3c] text-[12px] font-black text-white"
              >
                Corrigir
              </button>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function Titulo({
  eyebrow,
  titulo,
  texto,
}: {
  eyebrow: string;
  titulo: string;
  texto: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
        {
          eyebrow
        }
      </p>

      <h2 className="mt-1 text-[22px] font-black tracking-[-0.035em]">
        {
          titulo
        }
      </h2>

      <p className="mt-1 text-[12px] leading-5 text-slate-500">
        {
          texto
        }
      </p>
    </div>
  );
}

function Campo({
  name,
  label,
  placeholder,
  type = "text",
  required = true,
  defaultValue,
}: {
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label>
      <span className="text-[11px] font-extrabold text-slate-600">
        {
          label
        }
      </span>

      <input
        name={
          name
        }
        type={
          type
        }
        placeholder={
          placeholder
        }
        required={
          required
        }
        defaultValue={
          defaultValue
        }
        className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-[14px] font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
      />
    </label>
  );
}

function Check({
  name,
  label,
  disabled = false,
  defaultChecked = false,
}: {
  name: string;
  label: string;
  disabled?: boolean;
  defaultChecked?: boolean;
}) {
  return (
    <label className={`flex items-center justify-between rounded-[17px] border p-4 ${
      disabled
        ? "border-slate-100 bg-slate-50 opacity-50"
        : "border-slate-200 bg-white"
    }`}>
      <span className="text-[12px] font-extrabold text-slate-700">
        {
          label
        }
      </span>

      <input
        type="checkbox"
        name={
          name
        }
        disabled={
          disabled
        }
        defaultChecked={
          defaultChecked
        }
        className="h-5 w-5 accent-emerald-700"
      />
    </label>
  );
}
