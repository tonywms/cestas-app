"use client";

import {
  CheckCircle2,
  MapPin,
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
  editarClienteCampo,
  type ClienteCampoState,
} from "../../actions";

type Cliente = {
  id:
    number;
  codigo:
    string;
  nome:
    string;
  cpf_cnpj:
    string | null;
  telefone:
    string | null;
  logradouro:
    string | null;
  numero:
    string | null;
  complemento:
    string | null;
  bairro:
    string | null;
  cidade:
    string | null;
  uf:
    string | null;
  cep:
    string | null;
};

const initialState:
  ClienteCampoState = {
    success: false,
    message: "",
    clienteId: null,
    codigo: null,
  };

export default function EditarClienteMobileForm({
  cliente,
}: {
  cliente:
    Cliente;
}) {
  const [
    state,
    action,
    pending,
  ] =
    useActionState(
      editarClienteCampo,
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
        <input
          type="hidden"
          name="cliente_id"
          value={
            cliente.id
          }
        />

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
            defaultValue={
              cliente.nome
            }
            required
          />

          <Campo
            label="CPF / CNPJ"
            name="cpf_cnpj"
            defaultValue={
              cliente.cpf_cnpj ??
              ""
            }
          />

          <Campo
            label="Telefone / WhatsApp"
            name="telefone"
            defaultValue={
              cliente.telefone ??
              ""
            }
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
          title="Endereço atual"
        >
          <Campo
            label="Rua / Avenida"
            name="logradouro"
            defaultValue={
              cliente.logradouro ??
              ""
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <Campo
              label="Número"
              name="numero"
              defaultValue={
                cliente.numero ??
                ""
              }
            />

            <Campo
              label="Complemento"
              name="complemento"
              defaultValue={
                cliente.complemento ??
                ""
              }
            />
          </div>

          <Campo
            label="Bairro"
            name="bairro"
            defaultValue={
              cliente.bairro ??
              ""
            }
          />

          <div className="grid grid-cols-[1fr_80px] gap-3">
            <Campo
              label="Cidade"
              name="cidade"
              defaultValue={
                cliente.cidade ??
                ""
              }
            />

            <Campo
              label="UF"
              name="uf"
              defaultValue={
                cliente.uf ??
                ""
              }
              maxLength={2}
            />
          </div>

          <Campo
            label="CEP"
            name="cep"
            defaultValue={
              cliente.cep ??
              ""
            }
          />
        </Card>

        <button
          type="submit"
          disabled={
            pending
          }
          className="flex h-[58px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#176f3c] text-[12px] font-black text-white disabled:opacity-50"
        >
          <Save
            size={18}
          />

          {pending
            ? "Salvando..."
            : "Salvar alterações"}
        </button>
      </form>

      {modal &&
        state.message ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">
          <div className="w-full max-w-[390px] rounded-[30px] bg-white p-7 text-center">
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
                ? "Cliente atualizado"
                : "Não foi possível salvar"}
            </h3>

            <p className="mt-3 text-[11px] leading-5 text-slate-500">
              {
                state.message
              }
            </p>

            {state.success ? (
              <Link
                href={`/mobile/clientes?clienteId=${cliente.id}`}
                className="mt-6 flex h-[50px] items-center justify-center rounded-[16px] bg-[#176f3c] text-[11px] font-black text-white"
              >
                Voltar aos clientes
              </Link>
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
  defaultValue,
  required = false,
  icon,
  maxLength,
}: {
  label:
    string;
  name:
    string;
  defaultValue:
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
          defaultValue={
            defaultValue
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
