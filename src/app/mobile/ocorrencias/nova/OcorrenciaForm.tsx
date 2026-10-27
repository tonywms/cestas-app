"use client";

import {
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  MapPin,
  Save,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import Link from "next/link";

import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  registrarOcorrencia,
} from "./actions";

const initialState = {
  success: false,
  message: "",
  status: null as string | null,
};

type TipoOcorrencia =
  | "CLIENTE_AUSENTE"
  | "RECUSA"
  | "ENDERECO_INCORRETO"
  | "OUTRO";

type Cliente = {
  id: number;
  codigo: string;
  nome: string;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
};

const OPCOES: {
  codigo: TipoOcorrencia;
  titulo: string;
  descricao: string;
}[] = [
  {
    codigo:
      "CLIENTE_AUSENTE",
    titulo:
      "Cliente ausente",
    descricao:
      "Não havia ninguém disponível para receber a cesta.",
  },
  {
    codigo:
      "RECUSA",
    titulo:
      "Cliente recusou",
    descricao:
      "O cliente estava presente, mas recusou o atendimento ou a entrega.",
  },
  {
    codigo:
      "ENDERECO_INCORRETO",
    titulo:
      "Endereço incorreto",
    descricao:
      "O endereço informado não corresponde ao local correto do cliente.",
  },
  {
    codigo:
      "OUTRO",
    titulo:
      "Outra ocorrência",
    descricao:
      "Use para qualquer situação diferente das opções acima.",
  },
];

function rotuloStatus(
  status: string | null,
) {
  if (!status) {
    return "";
  }

  const mapa: Record<
    string,
    string
  > = {
    AUSENTE:
      "Cliente ausente",
    RECUSADO:
      "Entrega recusada",
    CANCELADO:
      "Parada encerrada",
  };

  return (
    mapa[status] ??
    status
      .replaceAll(
        "_",
        " ",
      )
      .toLowerCase()
      .replace(
        /^\w/,
        (c) =>
          c.toUpperCase(),
      )
  );
}

export default function OcorrenciaForm({
  rotaClienteId,
  cliente,
}: {
  rotaClienteId: number;
  cliente: Cliente;
}) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    registrarOcorrencia,
    initialState,
  );

  const [
    tipo,
    setTipo,
  ] = useState<
    TipoOcorrencia | ""
  >("");

  const [
    modal,
    setModal,
  ] = useState(false);

  useEffect(() => {
    if (state.message) {
      setModal(true);
    }
  }, [state]);

  const endereco = [
    cliente.logradouro,
    cliente.numero,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <form
        action={formAction}
        className="space-y-4"
      >
        <input
          type="hidden"
          name="rota_cliente_id"
          value={rotaClienteId}
        />

        <input
          type="hidden"
          name="tipo"
          value={tipo}
        />

        <section className="card-premium overflow-hidden rounded-[28px] p-5">
          <div className="flex items-start gap-3.5">
            <div className="icon-emerald flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px]">
              <MapPin
                size={20}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
                Cliente da rota
              </p>

              <h2 className="mt-1 truncate text-[20px] font-black tracking-[-0.035em]">
                {cliente.nome}
              </h2>

              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                {cliente.codigo}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[18px] bg-[#f4f8f5] p-3.5">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
              Endereço
            </p>

            <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-600">
              {endereco ||
                "Endereço não informado"}

              {cliente.bairro
                ? ` - ${cliente.bairro}`
                : ""}
            </p>
          </div>
        </section>

        <section className="card-premium rounded-[28px] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-amber-50 text-amber-700">
              <CircleAlert
                size={20}
              />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
                Ocorrência
              </p>

              <h2 className="mt-1 text-[19px] font-black tracking-[-0.035em]">
                O que aconteceu?
              </h2>

              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                Selecione a situação que encerra esta parada da rota.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {OPCOES.map(
              (opcao) => {
                const selecionado =
                  tipo ===
                  opcao.codigo;

                return (
                  <button
                    key={
                      opcao.codigo
                    }
                    type="button"
                    onClick={() =>
                      setTipo(
                        opcao.codigo,
                      )
                    }
                    className={`w-full rounded-[20px] border p-4 text-left transition ${
                      selecionado
                        ? "border-amber-300 bg-[#fff9eb] shadow-[0_12px_28px_rgba(180,120,10,0.09)]"
                        : "border-slate-100 bg-white hover:border-amber-100"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] ${
                          selecionado
                            ? "bg-amber-500 text-white"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {selecionado ? (
                          <CheckCircle2
                            size={16}
                          />
                        ) : (
                          <CircleAlert
                            size={15}
                          />
                        )}
                      </div>

                      <div>
                        <p className="text-[12px] font-black text-[#142018]">
                          {
                            opcao.titulo
                          }
                        </p>

                        <p className="mt-1 text-[10px] leading-4 text-slate-400">
                          {
                            opcao.descricao
                          }
                        </p>
                      </div>
                    </div>
                  </button>
                );
              },
            )}
          </div>
        </section>

        <section className="card-premium rounded-[28px] p-5">
          <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            Observação
          </label>

          <textarea
            name="descricao"
            rows={4}
            placeholder={
              tipo === "OUTRO"
                ? "Descreva obrigatoriamente o que aconteceu..."
                : "Detalhes adicionais da ocorrência..."
            }
            className="mt-2 w-full resize-none rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold leading-6 outline-none transition focus:border-amber-300"
          />

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[18px] border border-slate-100 bg-[#f8faf8] p-4">
            <input
              type="checkbox"
              name="requer_reagendamento"
              className="mt-1 h-4 w-4 accent-[#176f3c]"
            />

            <div>
              <div className="flex items-center gap-2">
                <CalendarClock
                  size={16}
                  className="text-[#176f3c]"
                />

                <p className="text-[11px] font-black">
                  Precisa reagendar
                </p>
              </div>

              <p className="mt-1 text-[9px] leading-4 text-slate-400">
                Marque para indicar que este cliente deverá voltar para uma próxima rota.
              </p>
            </div>
          </label>
        </section>

        <div className="flex items-start gap-3 rounded-[20px] border border-emerald-100 bg-emerald-50 p-4">
          <ShieldCheck
            size={18}
            className="mt-0.5 shrink-0 text-emerald-700"
          />

          <p className="text-[10px] leading-5 text-emerald-800">
            A ocorrência fica vinculada à empresa, ao entregador, ao cliente e à parada da rota.
          </p>
        </div>

        <button
          type="submit"
          disabled={
            pending ||
            !tipo
          }
          className="flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#c98b18,#a96508)] text-[13px] font-black text-white shadow-[0_16px_30px_rgba(180,120,10,0.22)] transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save
            size={18}
          />

          {pending
            ? "Registrando..."
            : "Confirmar ocorrência"}
        </button>
      </form>

      {modal &&
        state.message && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[5px]">
            <div className="w-full max-w-[410px] rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.25)]">
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                  state.success
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {state.success ? (
                  <CheckCircle2
                    size={31}
                  />
                ) : (
                  <XCircle
                    size={31}
                  />
                )}
              </div>

              <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                {state.success
                  ? "Ocorrência registrada"
                  : "Falha na operação"}
              </p>

              <h3 className="mt-2 text-xl font-black tracking-[-0.035em]">
                {state.success
                  ? rotuloStatus(
                      state.status,
                    )
                  : "Não foi possível registrar"}
              </h3>

              <p className="mt-3 text-[12px] leading-6 text-slate-500">
                {state.message}
              </p>

              {state.success ? (
                <Link
                  href="/mobile/rota"
                  className="mt-6 flex h-[50px] items-center justify-center rounded-[16px] bg-[#176f3c] text-xs font-black text-white"
                >
                  Continuar rota
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setModal(
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
