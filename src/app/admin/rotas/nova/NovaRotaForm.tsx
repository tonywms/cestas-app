"use client";

import Link from "next/link";

import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  MapPin,
  Route,
  Save,
  Search,
  Trash2,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  criarRota,
} from "../actions";

const initialState = {
  success:
    false,
  message:
    "",
  rotaId:
    null as number | null,
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
  telefone: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
};

function endereco(
  cliente: Cliente,
) {
  const linha1 =
    [
      cliente.logradouro,
      cliente.numero,
    ]
      .filter(
        Boolean,
      )
      .join(
        ", ",
      );

  const linha2 =
    [
      cliente.bairro,
      cliente.cidade,
      cliente.uf,
    ]
      .filter(
        Boolean,
      )
      .join(
        " • ",
      );

  return {
    linha1:
      linha1 ||
      "Endereço não informado",
    linha2,
  };
}

export default function NovaRotaForm({
  entregadores,
  clientes,
  dataInicial,
}: {
  entregadores:
    Entregador[];
  clientes:
    Cliente[];
  dataInicial:
    string;
}) {
  const [
    state,
    formAction,
    pending,
  ] =
    useActionState(
      criarRota,
      initialState,
    );

  const [
    selecionados,
    setSelecionados,
  ] =
    useState<
      number[]
    >([]);

  const [
    busca,
    setBusca,
  ] =
    useState(
      "",
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

  const clientesMap =
    useMemo(
      () =>
        new Map(
          clientes.map(
            (
              cliente,
            ) => [
              cliente.id,
              cliente,
            ],
          ),
        ),
      [
        clientes,
      ],
    );

  const filtrados =
    useMemo(
      () => {
        const termo =
          busca
            .trim()
            .toLocaleLowerCase(
              "pt-BR",
            );

        if (
          !termo
        ) {
          return clientes;
        }

        return clientes.filter(
          (
            cliente,
          ) => {
            const texto =
              [
                cliente.nome,
                cliente.codigo,
                cliente.telefone,
                cliente.logradouro,
                cliente.bairro,
                cliente.cidade,
              ]
                .filter(
                  Boolean,
                )
                .join(
                  " ",
                )
                .toLocaleLowerCase(
                  "pt-BR",
                );

            return texto.includes(
              termo,
            );
          },
        );
      },
      [
        busca,
        clientes,
      ],
    );

  const clientesSelecionados =
    selecionados
      .map(
        (
          id,
        ) =>
          clientesMap.get(
            id,
          ),
      )
      .filter(
        (
          cliente,
        ): cliente is Cliente =>
          !!cliente,
      );

  function alternarCliente(
    clienteId: number,
  ) {
    setSelecionados(
      (
        atual,
      ) =>
        atual.includes(
          clienteId,
        )
          ? atual.filter(
              (
                id,
              ) =>
                id !==
                clienteId,
            )
          : [
              ...atual,
              clienteId,
            ],
    );
  }

  function mover(
    clienteId: number,
    direcao:
      -1 |
      1,
  ) {
    setSelecionados(
      (
        atual,
      ) => {
        const indice =
          atual.indexOf(
            clienteId,
          );

        const novoIndice =
          indice +
          direcao;

        if (
          indice <
            0 ||
          novoIndice <
            0 ||
          novoIndice >=
            atual.length
        ) {
          return atual;
        }

        const novo =
          [
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

  function selecionarVisiveis() {
    setSelecionados(
      (
        atual,
      ) => {
        const novo =
          [
            ...atual,
          ];

        for (
          const cliente of
          filtrados
        ) {
          if (
            !novo.includes(
              cliente.id,
            )
          ) {
            novo.push(
              cliente.id,
            );
          }
        }

        return novo;
      },
    );
  }

  return (
    <>
      <form
        action={
          formAction
        }
        className="space-y-5"
      >
        <section className="card-premium rounded-[30px] p-6">
          <div className="flex items-start gap-4">
            <div className="icon-emerald flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px]">
              <Truck
                size={22}
              />
            </div>

            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
                Responsável
              </p>

              <h2 className="mt-1 text-[22px] font-black tracking-[-0.035em]">
                Quem fará a rota?
              </h2>

              <p className="mt-1 text-[12px] text-slate-500">
                Selecione o entregador e a data planejada.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label>
              <span className="text-[11px] font-extrabold text-slate-600">
                Entregador
              </span>

              <select
                name="entregador_id"
                required
                defaultValue=""
                className="mt-2 h-[56px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-[14px] font-bold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
              >
                <option value="">
                  Selecione o entregador
                </option>

                {entregadores.map(
                  (
                    entregador,
                  ) => (
                    <option
                      key={
                        entregador.id
                      }
                      value={
                        entregador.id
                      }
                    >
                      {
                        entregador.nome
                      }
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span className="text-[11px] font-extrabold text-slate-600">
                Data da rota
              </span>

              <input
                type="date"
                name="data_rota"
                defaultValue={
                  dataInicial
                }
                required
                className="mt-2 h-[56px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-[14px] font-bold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-[11px] font-extrabold text-slate-600">
              Observação
            </span>

            <input
              name="observacao"
              placeholder="Ex.: rota da manhã, prioridade de atendimento..."
              className="mt-2 h-[56px] w-full rounded-[17px] border border-slate-200 bg-white px-4 text-[14px] font-semibold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
            />
          </label>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <section className="card-premium overflow-hidden rounded-[30px]">
            <div className="border-b border-slate-100 p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
                    Clientes disponíveis
                  </p>

                  <h2 className="mt-1 text-[22px] font-black tracking-[-0.035em]">
                    Adicionar paradas
                  </h2>

                  <p className="mt-1 text-[12px] text-slate-500">
                    Pesquise por nome, código, telefone ou endereço.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    selecionarVisiveis
                  }
                  className="rounded-[14px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-[11px] font-extrabold text-emerald-800"
                >
                  Selecionar visíveis
                </button>
              </div>

              <div className="relative mt-5">
                <Search
                  size={19}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700"
                />

                <input
                  value={
                    busca
                  }
                  onChange={(
                    event,
                  ) =>
                    setBusca(
                      event.target.value,
                    )
                  }
                  placeholder="Buscar cliente..."
                  className="h-[56px] w-full rounded-[17px] border border-slate-200 bg-white pl-12 pr-4 text-[14px] font-semibold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span>
                  {
                    filtrados.length
                  } cliente(s) encontrado(s)
                </span>

                <span className="text-emerald-700">
                  {
                    selecionados.length
                  } selecionado(s)
                </span>
              </div>
            </div>

            <div className="max-h-[680px] space-y-3 overflow-y-auto p-5">
              {filtrados.length ===
              0 ? (
                <div className="rounded-[22px] bg-slate-50 p-8 text-center">
                  <Search
                    size={28}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-[14px] font-extrabold">
                    Nenhum cliente encontrado
                  </p>
                </div>
              ) : (
                filtrados.map(
                  (
                    cliente,
                  ) => {
                    const ativo =
                      selecionados.includes(
                        cliente.id,
                      );

                    const local =
                      endereco(
                        cliente,
                      );

                    return (
                      <button
                        key={
                          cliente.id
                        }
                        type="button"
                        onClick={() =>
                          alternarCliente(
                            cliente.id,
                          )
                        }
                        className={`w-full rounded-[20px] border p-4 text-left transition ${
                          ativo
                            ? "border-emerald-300 bg-emerald-50/70 shadow-[0_10px_25px_rgba(23,111,60,0.08)]"
                            : "border-slate-100 bg-white hover:border-emerald-100 hover:bg-[#fbfdfb]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${
                              ativo
                                ? "bg-[#176f3c] text-white"
                                : "bg-slate-50 text-slate-400"
                            }`}
                          >
                            {ativo ? (
                              <Check
                                size={20}
                                strokeWidth={3}
                              />
                            ) : (
                              <UserRound
                                size={19}
                              />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[15px] font-black">
                                  {
                                    cliente.nome
                                  }
                                </p>

                                <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#b07a12]">
                                  {
                                    cliente.codigo
                                  }
                                </p>
                              </div>

                              {ativo && (
                                <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-emerald-700 shadow-sm">
                                  #
                                  {
                                    selecionados.indexOf(
                                      cliente.id,
                                    ) +
                                    1
                                  }
                                </span>
                              )}
                            </div>

                            <div className="mt-3 flex items-start gap-2 text-[12px] leading-5 text-slate-500">
                              <MapPin
                                size={15}
                                className="mt-0.5 shrink-0 text-emerald-700"
                              />

                              <span>
                                {
                                  local.linha1
                                }

                                {local.linha2
                                  ? ` • ${local.linha2}`
                                  : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  },
                )
              )}
            </div>
          </section>

          <section className="card-premium h-fit overflow-hidden rounded-[30px] xl:sticky xl:top-5">
            <div className="border-b border-slate-100 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
                    Sequência
                  </p>

                  <h2 className="mt-1 text-[22px] font-black tracking-[-0.035em]">
                    Ordem de atendimento
                  </h2>

                  <p className="mt-1 text-[12px] text-slate-500">
                    Esta será a ordem mostrada ao entregador.
                  </p>
                </div>

                <span className="rounded-full bg-emerald-50 px-4 py-2 text-[12px] font-black text-emerald-700">
                  {
                    selecionados.length
                  }
                </span>
              </div>
            </div>

            {clientesSelecionados.length ===
            0 ? (
              <div className="p-8 text-center">
                <Route
                  size={34}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-4 text-[15px] font-black">
                  Nenhuma parada
                </p>

                <p className="mt-2 text-[12px] leading-5 text-slate-400">
                  Selecione clientes ao lado para montar o itinerário.
                </p>
              </div>
            ) : (
              <div className="max-h-[600px] space-y-2 overflow-y-auto p-5">
                {clientesSelecionados.map(
                  (
                    cliente,
                    index,
                  ) => {
                    const local =
                      endereco(
                        cliente,
                      );

                    return (
                      <div
                        key={
                          cliente.id
                        }
                        className="rounded-[18px] border border-slate-100 bg-white p-4"
                      >
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
                            index +
                            1
                          }
                        />

                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-emerald-50 text-[14px] font-black text-emerald-700">
                            {
                              index +
                              1
                            }
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-black">
                              {
                                cliente.nome
                              }
                            </p>

                            <p className="mt-1 truncate text-[11px] text-slate-400">
                              {
                                local.linha1
                              }
                            </p>
                          </div>

                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              title="Subir"
                              disabled={
                                index ===
                                0
                              }
                              onClick={() =>
                                mover(
                                  cliente.id,
                                  -1,
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-slate-50 text-slate-600 disabled:opacity-25"
                            >
                              <ArrowUp
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              title="Descer"
                              disabled={
                                index ===
                                clientesSelecionados.length -
                                  1
                              }
                              onClick={() =>
                                mover(
                                  cliente.id,
                                  1,
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-slate-50 text-slate-600 disabled:opacity-25"
                            >
                              <ArrowDown
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              title="Remover"
                              onClick={() =>
                                alternarCliente(
                                  cliente.id,
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-red-50 text-red-500"
                            >
                              <Trash2
                                size={15}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}

            <div className="border-t border-slate-100 bg-[#fbfdfb] p-5">
              <button
                type="submit"
                disabled={
                  pending ||
                  entregadores.length ===
                    0 ||
                  selecionados.length ===
                    0
                }
                className="flex h-[58px] w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#1f8a4c,#0d5d31)] text-[14px] font-black text-white shadow-[0_16px_30px_rgba(23,111,60,0.24)] transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save
                  size={19}
                />

                {pending
                  ? "Criando rota..."
                  : `Criar rota com ${selecionados.length} parada(s)`}
              </button>
            </div>
          </section>
        </div>
      </form>

      {modal &&
        state.message && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">
            <div className="w-full max-w-[430px] rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.28)]">
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                  state.success
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-red-100 text-red-600"
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

              <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                {state.success
                  ? "Planejamento concluído"
                  : "Operação não concluída"}
              </p>

              <h3 className="mt-2 text-[23px] font-black tracking-[-0.04em]">
                {state.success
                  ? "Rota criada"
                  : "Verifique os dados"}
              </h3>

              <p className="mt-3 text-[13px] leading-6 text-slate-500">
                {
                  state.message
                }
              </p>

              {state.success &&
              state.rotaId ? (
                <div className="mt-6 space-y-2">
                  <Link
                    href={`/admin/rotas/${state.rotaId}`}
                    className="flex h-[52px] items-center justify-center gap-2 rounded-[16px] bg-[#176f3c] text-[13px] font-black text-white"
                  >
                    <Route
                      size={17}
                    />
                    Abrir rota criada
                  </Link>

                  <Link
                    href="/admin/rotas"
                    className="flex h-[48px] items-center justify-center rounded-[15px] border border-slate-200 text-[12px] font-extrabold text-slate-600"
                  >
                    Ver todas as rotas
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
