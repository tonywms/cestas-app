"use client";

import {
  CheckCircle2,
  MapPin,
  Phone,
  Save,
  ShoppingBag,
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
  criarClienteCampo,
  type ClienteCampoState,
} from "../actions";

const initialState:
  ClienteCampoState = {
    success: false,
    message: "",
    clienteId: null,
    codigo: null,
  };

export default function NovoClienteMobileForm() {
  const [
    state,
    action,
    pending,
  ] =
    useActionState(
      criarClienteCampo,
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
          action
        }
        className="space-y-4"
      >
        <Card
          icon={
            <UserRound
              size={19}
            />
          }
          title="Dados do cliente"
        >
          <Campo
            label="Nome *"
            name="nome"
            placeholder="Ex.: Maria Silva"
            required
          />

          <Campo
            label="CPF / CNPJ"
            name="cpf_cnpj"
            placeholder="Opcional"
          />

          <Campo
            label="Telefone / WhatsApp"
            name="telefone"
            placeholder="(85) 99999-9999"
            icon={
              <Phone
                size={16}
              />
            }
          />
        </Card>

        <Card
          icon={
            <MapPin
              size={19}
            />
          }
          title="Endereço"
        >
          <Campo
            label="Rua / Avenida"
            name="logradouro"
            placeholder="Ex.: Av. Santos Dumont"
          />

          <div className="grid grid-cols-2 gap-3">
            <Campo
              label="Número"
              name="numero"
              placeholder="2500"
            />

            <Campo
              label="Complemento"
              name="complemento"
              placeholder="Apto / casa"
            />
          </div>

          <Campo
            label="Bairro"
            name="bairro"
            placeholder="Ex.: Aldeota"
          />

          <div className="grid grid-cols-[1fr_80px] gap-3">
            <Campo
              label="Cidade"
              name="cidade"
              placeholder="Fortaleza"
            />

            <Campo
              label="UF"
              name="uf"
              placeholder="CE"
              maxLength={2}
            />
          </div>

          <Campo
            label="CEP"
            name="cep"
            placeholder="00000-000"
          />
        </Card>

        <button
          type="submit"
          disabled={
            pending
          }
          className="flex h-[58px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#176f3c] text-[12px] font-black text-white shadow-[0_14px_30px_rgba(23,111,60,0.22)] disabled:opacity-50"
        >
          <Save
            size={18}
          />

          {pending
            ? "Cadastrando..."
            : "Cadastrar cliente"}
        </button>
      </form>

      {modal &&
        state.message ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">
          <div className="w-full max-w-[400px] rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.28)]">
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

            <h3 className="mt-4 text-[20px] font-black">
              {state.success
                ? "Cliente cadastrado"
                : "Cadastro não concluído"}
            </h3>

            <p className="mt-3 text-[11px] leading-5 text-slate-500">
              {
                state.message
              }
            </p>

            {state.success &&
            state.clienteId ? (
              <div className="mt-6 grid gap-2">
                <Link
                  href={`/mobile/clientes?clienteId=${state.clienteId}&modo=venda`}
                  className="flex h-[50px] items-center justify-center gap-2 rounded-[16px] bg-[#176f3c] text-[11px] font-black text-white"
                >
                  <ShoppingBag
                    size={16}
                  />
                  Vender para este cliente
                </Link>

                <Link
                  href="/mobile/clientes"
                  className="flex h-[48px] items-center justify-center rounded-[16px] border border-slate-200 text-[10px] font-black text-slate-600"
                >
                  Voltar aos clientes
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setModal(
                    false,
                  )
                }
                className="mt-6 h-[50px] w-full rounded-[16px] bg-[#176f3c] text-[11px] font-black text-white"
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

function Card({
  icon,
  title,
  children,
}: {
  icon:
    React.ReactNode;
  title:
    string;
  children:
    React.ReactNode;
}) {
  return (
    <section className="rounded-[26px] bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700">
          {
            icon
          }
        </div>

        <h2 className="text-[16px] font-black">
          {
            title
          }
        </h2>
      </div>

      <div className="space-y-4">
        {
          children
        }
      </div>
    </section>
  );
}

function Campo({
  label,
  name,
  placeholder,
  required = false,
  icon,
  maxLength,
}: {
  label:
    string;
  name:
    string;
  placeholder:
    string;
  required?:
    boolean;
  icon?:
    React.ReactNode;
  maxLength?:
    number;
}) {
  return (
    <label className="block">
      <span className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
        {
          label
        }
      </span>

      <div className="relative mt-2">
        {icon ? (
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700">
            {
              icon
            }
          </div>
        ) : null}

        <input
          name={
            name
          }
          placeholder={
            placeholder
          }
          required={
            required
          }
          maxLength={
            maxLength
          }
          className={`h-[54px] w-full rounded-[16px] border border-slate-200 bg-white px-4 text-[12px] font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 ${
            icon
              ? "pl-11"
              : ""
          }`}
        />
      </div>
    </label>
  );
}
