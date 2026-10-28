"use client";

import {
  CheckCircle2,
  Save,
  XCircle,
} from "lucide-react";

import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  atualizarEmpresaPlataforma,
} from "../../actions";

const initialState = {
  success:
    false,
  message:
    "",
  empresaId:
    null as string | null,
};

type Props = {
  empresa: {
    id: string;
    codigo: string;
    nomeFantasia: string;
    razaoSocial: string;
    cnpj: string;
    status: string;
    limiteUsuarios: number;
  };
  configuracao: {
    modo:
      "QUANTIDADE" |
      "VOLUME";
    bipagemCarga:
      boolean;
    bipagemEntrega:
      boolean;
    pagamentoMobile:
      boolean;
    ocorrenciaMobile:
      boolean;
  };
};

export default function EmpresaPlataformaForm({
  empresa,
  configuracao,
}: Props) {
  const [
    state,
    action,
    pending,
  ] =
    useActionState(
      atualizarEmpresaPlataforma,
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
      configuracao.modo,
    );

  const [
    status,
    setStatus,
  ] =
    useState(
      empresa.status ===
        "SUSPENSA"
        ? "SUSPENSA"
        : "ATIVA",
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
        <input
          type="hidden"
          name="empresa_id"
          value={
            empresa.id
          }
        />

        <section className="card-premium rounded-[30px] p-6">
          <Titulo
            titulo="Contrato e identificação"
            texto="Dados comerciais e limite de usuários da empresa."
          />

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Campo
              name="nome_fantasia"
              label="Nome fantasia"
              defaultValue={
                empresa.nomeFantasia
              }
            />

            <Campo
              name="razao_social"
              label="Razão social"
              defaultValue={
                empresa.razaoSocial
              }
              required={
                false
              }
            />

            <Campo
              name="cnpj"
              label="CNPJ"
              defaultValue={
                empresa.cnpj
              }
              required={
                false
              }
            />

            <Campo
              name="limite_usuarios"
              label="Limite contratado"
              defaultValue={
                String(
                  empresa.limiteUsuarios,
                )
              }
              type="number"
            />

            <label>
              <span className="text-[11px] font-extrabold text-slate-600">
                Status da empresa
              </span>

              <select
                name="status"
                value={
                  status
                }
                onChange={(
                  event,
                ) =>
                  setStatus(
                    event.target.value,
                  )
                }
                className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-[14px] font-semibold outline-none"
              >
                <option value="ATIVA">
                  ATIVA
                </option>

                <option value="SUSPENSA">
                  SUSPENSA
                </option>
              </select>
            </label>

            {empresa.status !==
              "SUSPENSA" &&
            status ===
              "SUSPENSA" ? (
              <label className="md:col-span-2 rounded-[18px] border border-red-200 bg-red-50 p-4">
                <span className="text-[11px] font-black uppercase tracking-[0.12em] text-red-700">
                  Confirmação de suspensão
                </span>

                <p className="mt-2 text-[12px] leading-5 text-red-600">
                  Para evitar suspensão acidental, digite exatamente o código da empresa:
                  {" "}
                  <strong>
                    {
                      empresa.codigo
                    }
                  </strong>
                </p>

                <input
                  name="confirmacao_suspensao"
                  required
                  autoComplete="off"
                  placeholder={
                    empresa.codigo
                  }
                  className="mt-3 h-[52px] w-full rounded-[16px] border border-red-200 bg-white px-4 text-[14px] font-black uppercase outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                />
              </label>
            ) : null}
          </div>
        </section>

        <section className="card-premium rounded-[30px] p-6">
          <Titulo
            titulo="Operação"
            texto="Configuração que a empresa utiliza no dia a dia."
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
              className={`rounded-[18px] border p-4 text-left ${
                modo ===
                "QUANTIDADE"
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <p className="text-[11px] font-black text-emerald-700">
                QUANTIDADE
              </p>

              <p className="mt-1 text-[13px] font-bold text-slate-600">
                Saldo numérico por entregador
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setModo(
                  "VOLUME",
                )
              }
              className={`rounded-[18px] border p-4 text-left ${
                modo ===
                "VOLUME"
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <p className="text-[11px] font-black text-emerald-700">
                VOLUME
              </p>

              <p className="mt-1 text-[13px] font-bold text-slate-600">
                Rastreabilidade individual
              </p>
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Check
              name="exigir_bipagem_carga"
              label="Bipagem ao receber carga"
              defaultChecked={
                configuracao.bipagemCarga
              }
              disabled={
                modo !==
                "VOLUME"
              }
            />

            <Check
              name="exigir_bipagem_entrega"
              label="Bipagem na entrega"
              defaultChecked={
                configuracao.bipagemEntrega
              }
              disabled={
                modo !==
                "VOLUME"
              }
            />

            <Check
              name="permitir_pagamento_mobile"
              label="Recebimento mobile"
              defaultChecked={
                configuracao.pagamentoMobile
              }
            />

            <Check
              name="permitir_ocorrencia_mobile"
              label="Ocorrência mobile"
              defaultChecked={
                configuracao.ocorrenciaMobile
              }
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={
            pending
          }
          className="flex h-[58px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#176f3c] text-[13px] font-black text-white disabled:opacity-50"
        >
          <Save
            size={18}
          />

          {pending
            ? "Salvando..."
            : "Salvar empresa"}
        </button>
      </form>

      {modal &&
        state.message ? (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">
          <div className="w-full max-w-[420px] rounded-[30px] bg-white p-7 text-center">
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
                ? "Empresa atualizada"
                : "Alteração não concluída"}
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
      ) : null}
    </>
  );
}

function Titulo({
  titulo,
  texto,
}: {
  titulo: string;
  texto: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
        Plataforma
      </p>

      <h2 className="mt-1 text-[22px] font-black tracking-[-0.035em]">
        {
          titulo
        }
      </h2>

      <p className="mt-1 text-[12px] text-slate-500">
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
  defaultValue,
  type = "text",
  required = true,
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
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
        defaultValue={
          defaultValue
        }
        required={
          required
        }
        className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-[14px] font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
      />
    </label>
  );
}

function Check({
  name,
  label,
  defaultChecked,
  disabled = false,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
  disabled?: boolean;
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
        defaultChecked={
          defaultChecked
        }
        disabled={
          disabled
        }
        className="h-5 w-5 accent-emerald-700"
      />
    </label>
  );
}
