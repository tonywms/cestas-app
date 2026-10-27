"use client";

import {
  Check,
  CheckCircle2,
  MapPin,
  Route,
  Save,
  Truck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  criarRota,
} from "../actions";

const initialState = {
  success: false,
  message: "",
  rotaId: null as number | null,
};

type Entregador = {
  id: string;
  nome: string;
  email: string | null;
};

type Cliente = {
  id: number;
  codigo: string;
  nome: string;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
};

export default function NovaRotaForm({
  entregadores,
  clientes,
  dataInicial,
}: {
  entregadores: Entregador[];
  clientes: Cliente[];
  dataInicial: string;
}) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    criarRota,
    initialState,
  );

  const [
    selecionados,
    setSelecionados,
  ] = useState<number[]>([]);

  const [
    modal,
    setModal,
  ] = useState(false);

  useEffect(() => {
    if (state.message) {
      setModal(true);
    }
  }, [state]);

  function alternarCliente(
    clienteId: number,
  ) {
    setSelecionados(
      (atual) => {
        if (
          atual.includes(clienteId)
        ) {
          return atual.filter(
            (id) =>
              id !== clienteId,
          );
        }

        return [
          ...atual,
          clienteId,
        ];
      },
    );
  }

  function mover(
    clienteId: number,
    direcao: -1 | 1,
  ) {
    setSelecionados(
      (atual) => {
        const indice =
          atual.indexOf(clienteId);

        if (indice < 0) {
          return atual;
        }

        const novoIndice =
          indice + direcao;

        if (
          novoIndice < 0 ||
          novoIndice >=
            atual.length
        ) {
          return atual;
        }

        const novo = [
          ...atual,
        ];

        [
          novo[indice],
          novo[novoIndice],
        ] = [
          novo[novoIndice],
          novo[indice],
        ];

        return novo;
      },
    );
  }

  return (
    <>
      <form
        action={formAction}
        className="space-y-5"
      >
        <section className="rounded-[28px] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-emerald-700">
              <Truck size={21} />
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">
                Operação
              </p>

              <h2 className="text-lg font-black">
                Responsável pela rota
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-500">
                Entregador
              </label>

              <select
                name="entregador_id"
                required
                defaultValue=""
                className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-emerald-500"
              >
                <option value="">
                  Selecione
                </option>

                {entregadores.map(
                  (entregador) => (
                    <option
                      key={entregador.id}
                      value={entregador.id}
                    >
                      {entregador.nome}
                    </option>
                  ),
                )}
              </select>

              {entregadores.length ===
                0 && (
                <p className="mt-2 text-[10px] font-bold text-amber-700">
                  Nenhum ENTREGADOR ativo encontrado nesta empresa.
                </p>
              )}
            </div>

            <div>
              <label className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-500">
                Data da rota
              </label>

              <input
                type="date"
                name="data_rota"
                defaultValue={
                  dataInicial
                }
                required
                className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-500">
              Observação
            </label>

            <input
              name="observacao"
              placeholder="Opcional"
              className="mt-2 h-[54px] w-full rounded-[16px] border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-emerald-500"
            />
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">
                Clientes
              </p>

              <h2 className="mt-1 text-lg font-black">
                Sequência de atendimento
              </h2>

              <p className="mt-1 text-[10px] text-slate-400">
                A ordem de seleção define a sequência da rota.
              </p>
            </div>

            <span className="rounded-full bg-emerald-50 px-4 py-2 text-[9px] font-black text-emerald-700">
              {selecionados.length} selecionado(s)
            </span>
          </div>

          {clientes.length === 0 ? (
            <div className="mt-5 rounded-[20px] bg-slate-50 p-6 text-center">
              <p className="text-sm font-black">
                Nenhum cliente ativo
              </p>

              <p className="mt-2 text-[10px] leading-5 text-slate-400">
                Cadastre clientes antes de montar a rota.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {clientes.map(
                (cliente) => {
                  const ativo =
                    selecionados.includes(
                      cliente.id,
                    );

                  const ordem =
                    selecionados.indexOf(
                      cliente.id,
                    ) + 1;

                  return (
                    <div
                      key={cliente.id}
                      className={`rounded-[20px] border p-4 transition ${
                        ativo
                          ? "border-emerald-200 bg-[#f3fbf6]"
                          : "border-slate-100 bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <button
                          type="button"
                          onClick={() =>
                            alternarCliente(
                              cliente.id,
                            )
                          }
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border transition ${
                            ativo
                              ? "border-[#176f3c] bg-[#176f3c] text-white"
                              : "border-slate-200 bg-white text-slate-300"
                          }`}
                        >
                          {ativo ? (
                            <Check
                              size={18}
                              strokeWidth={
                                3
                              }
                            />
                          ) : (
                            <span className="h-3 w-3 rounded-full border-2 border-current" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            alternarCliente(
                              cliente.id,
                            )
                          }
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="text-sm font-black">
                            {cliente.nome}
                          </p>

                          <p className="mt-1 text-[9px] font-bold text-slate-400">
                            {cliente.codigo}
                          </p>

                          <div className="mt-2 flex items-start gap-2 text-[10px] leading-4 text-slate-500">
                            <MapPin
                              size={13}
                              className="mt-0.5 shrink-0"
                            />

                            <span>
                              {cliente.logradouro ??
                                "Endereço não informado"}

                              {cliente.numero
                                ? `, ${cliente.numero}`
                                : ""}

                              {cliente.bairro
                                ? ` - ${cliente.bairro}`
                                : ""}
                            </span>
                          </div>
                        </button>

                        {ativo && (
                          <div className="flex shrink-0 flex-col items-center gap-2">
                            <div className="flex h-9 min-w-9 items-center justify-center rounded-[12px] bg-emerald-50 px-3 text-xs font-black text-emerald-700">
                              {ordem}
                            </div>

                            <div className="flex gap-1">
                              <button
                                type="button"
                                disabled={
                                  ordem ===
                                  1
                                }
                                onClick={() =>
                                  mover(
                                    cliente.id,
                                    -1,
                                  )
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black disabled:opacity-30"
                                title="Subir"
                              >
                                ↑
                              </button>

                              <button
                                type="button"
                                disabled={
                                  ordem ===
                                  selecionados.length
                                }
                                onClick={() =>
                                  mover(
                                    cliente.id,
                                    1,
                                  )
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black disabled:opacity-30"
                                title="Descer"
                              >
                                ↓
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {ativo && (
                        <>
                          <input
                            type="hidden"
                            name="clientes"
                            value={
                              cliente.id
                            }
                          />

                          <input
                            type="hidden"
                            name={`sequencia_${cliente.id}`}
                            value={
                              ordem
                            }
                          />
                        </>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          )}
        </section>

        <button
          type="submit"
          disabled={
            pending ||
            entregadores.length ===
              0 ||
            selecionados.length ===
              0
          }
          className="flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#176f3c] text-sm font-black text-white shadow-[0_14px_30px_rgba(23,111,60,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save size={18} />

          {pending
            ? "Criando rota..."
            : "Criar rota"}
        </button>
      </form>

      {modal &&
        state.message && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[5px]">
            <div className="w-full max-w-[420px] rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.25)]">
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
                  ? "Planejamento concluído"
                  : "Falha na operação"}
              </p>

              <h3 className="mt-2 text-xl font-black">
                {state.success
                  ? "Rota criada"
                  : "Não foi possível criar"}
              </h3>

              <p className="mt-3 text-xs leading-6 text-slate-500">
                {state.message}
              </p>

              {state.success ? (
                <div className="mt-6 space-y-2">
                  <Link
                    href="/admin/rotas"
                    className="flex h-[50px] items-center justify-center gap-2 rounded-[16px] bg-[#176f3c] text-xs font-black text-white"
                  >
                    <Route size={17} />
                    Ver rotas
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setModal(false)
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
