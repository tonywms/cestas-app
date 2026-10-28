"use client";

import {
  CheckCircle2,
  Edit3,
  PackageCheck,
  Power,
  Save,
  X,
  XCircle,
} from "lucide-react";

import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  alternarStatusTipoCesta,
  atualizarTipoCesta,
} from "./actions";

const initialState = {
  success:
    false,
  message:
    "",
};

type Props = {
  tipo: {
    id:
      number;
    codigo:
      string;
    nome:
      string;
    descricao:
      string | null;
    valorVenda:
      number;
    ativo:
      boolean;
    saldoCentral:
      number;
    volumesAtivos:
      number;
  };
};

export default function TipoCestaCard({
  tipo,
}: Props) {
  const [
    editar,
    setEditar,
  ] =
    useState(
      false,
    );

  const [
    editState,
    editAction,
    editPending,
  ] =
    useActionState(
      atualizarTipoCesta,
      initialState,
    );

  const [
    statusState,
    statusAction,
    statusPending,
  ] =
    useActionState(
      alternarStatusTipoCesta,
      initialState,
    );

  const [
    modal,
    setModal,
  ] =
    useState<{
      success:
        boolean;
      message:
        string;
    } | null>(
      null,
    );

  useEffect(
    () => {
      if (
        editState.message
      ) {
        setModal({
          success:
            editState.success,
          message:
            editState.message,
        });

        if (
          editState.success
        ) {
          setEditar(
            false,
          );
        }
      }
    },
    [
      editState,
    ],
  );

  useEffect(
    () => {
      if (
        statusState.message
      ) {
        setModal({
          success:
            statusState.success,
          message:
            statusState.message,
        });
      }
    },
    [
      statusState,
    ],
  );

  return (
    <>
      <article className="card-premium flex h-full flex-col rounded-[28px] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] ${
              tipo.ativo
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-400"
            }`}>
              <PackageCheck
                size={22}
              />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#b07a12]">
                {
                  tipo.codigo
                }
              </p>

              <h3 className="mt-1 truncate text-[18px] font-black">
                {
                  tipo.nome
                }
              </h3>
            </div>
          </div>

          <span className={`rounded-full px-3 py-1.5 text-[10px] font-black ${
            tipo.ativo
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}>
            {tipo.ativo
              ? "ATIVA"
              : "INATIVA"}
          </span>
        </div>

        <p className="mt-4 min-h-[40px] text-[12px] leading-5 text-slate-500">
          {tipo.descricao ||
            "Sem descrição cadastrada."}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Metric
            label="Preço"
            value={
              new Intl.NumberFormat(
                "pt-BR",
                {
                  style:
                    "currency",
                  currency:
                    "BRL",
                },
              ).format(
                tipo.valorVenda,
              )
            }
          />

          <Metric
            label="Central"
            value={
              String(
                tipo.saldoCentral,
              )
            }
          />

          <Metric
            label="Volumes ativos"
            value={
              String(
                tipo.volumesAtivos,
              )
            }
          />
        </div>

        <div className="mt-auto flex gap-2 pt-5">
          <button
            type="button"
            onClick={() =>
              setEditar(
                true,
              )
            }
            className="flex h-[44px] flex-1 items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-white text-[11px] font-extrabold text-slate-600"
          >
            <Edit3
              size={15}
            />
            Editar
          </button>

          <form
            action={
              statusAction
            }
            className="flex-1"
          >
            <input
              type="hidden"
              name="tipo_id"
              value={
                tipo.id
              }
            />

            <button
              type="submit"
              disabled={
                statusPending
              }
              className={`flex h-[44px] w-full items-center justify-center gap-2 rounded-[14px] text-[11px] font-extrabold ${
                tipo.ativo
                  ? "border border-red-100 bg-red-50 text-red-600"
                  : "bg-emerald-700 text-white"
              }`}
            >
              <Power
                size={15}
              />

              {statusPending
                ? "Salvando..."
                : tipo.ativo
                  ? "Inativar"
                  : "Ativar"}
            </button>
          </form>
        </div>
      </article>

      {editar ? (
        <div className="fixed inset-0 z-[998] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">
          <form
            action={
              editAction
            }
            className="w-full max-w-[560px] rounded-[30px] bg-white p-6 shadow-[0_30px_100px_rgba(15,50,30,0.28)]"
          >
            <input
              type="hidden"
              name="tipo_id"
              value={
                tipo.id
              }
            />

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#b07a12]">
                  {
                    tipo.codigo
                  }
                </p>

                <h3 className="mt-1 text-[22px] font-black">
                  Editar cesta
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditar(
                    false,
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-slate-100 text-slate-500"
              >
                <X
                  size={18}
                />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <Campo
                label="Nome"
                name="nome"
                defaultValue={
                  tipo.nome
                }
              />

              <Campo
                label="Valor de venda"
                name="valor_venda"
                defaultValue={
                  tipo.valorVenda
                    .toFixed(
                      2,
                    )
                    .replace(
                      ".",
                      ",",
                    )
                }
              />

              <label className="block">
                <span className="text-[11px] font-extrabold text-slate-600">
                  Descrição
                </span>

                <textarea
                  name="descricao"
                  defaultValue={
                    tipo.descricao ??
                    ""
                  }
                  rows={3}
                  className="mt-2 w-full resize-none rounded-[17px] border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={
                editPending
              }
              className="mt-6 flex h-[54px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#176f3c] text-[13px] font-black text-white disabled:opacity-50"
            >
              <Save
                size={17}
              />

              {editPending
                ? "Salvando..."
                : "Salvar alterações"}
            </button>
          </form>
        </div>
      ) : null}

      {modal ? (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">
          <div className="w-full max-w-[430px] rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.28)]">
            {modal.success ? (
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
              {modal.success
                ? "Alteração concluída"
                : "Alteração bloqueada"}
            </h3>

            <p className="mt-3 text-[13px] leading-6 text-slate-500">
              {
                modal.message
              }
            </p>

            <button
              type="button"
              onClick={() =>
                setModal(
                  null,
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

function Campo({
  label,
  name,
  defaultValue,
}: {
  label:
    string;
  name:
    string;
  defaultValue:
    string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-extrabold text-slate-600">
        {
          label
        }
      </span>

      <input
        name={
          name
        }
        defaultValue={
          defaultValue
        }
        required
        className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-[14px] font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
      />
    </label>
  );
}

function Metric({
  label,
  value,
}: {
  label:
    string;
  value:
    string;
}) {
  return (
    <div className="rounded-[16px] bg-[#f5f8f5] p-3 text-center">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
        {
          label
        }
      </p>

      <p className="mt-1 text-[13px] font-black">
        {
          value
        }
      </p>
    </div>
  );
}
