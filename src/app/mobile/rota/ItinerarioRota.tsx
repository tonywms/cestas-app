"use client";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  MapPin,
  Navigation,
  PackageCheck,
  Search,
  WalletCards,
  X,
} from "lucide-react";

import Link from "next/link";

import {
  useMemo,
  useState,
} from "react";

export type ItinerarioRotaItem = {
  id: number;
  sequencia: number;
  clienteId: number;
  nome: string;
  codigo: string;
  telefone: string;
  bairro: string;
  endereco: string;
  mapaHref: string | null;
  processado: boolean;
  categoria:
    | "ENTREGA"
    | "FINANCEIRO"
    | "COBRANCA"
    | "ATENDIMENTO"
    | "CONCLUIDO";
  situacao: string;
  statusOriginal: string;
  acaoLabel: string | null;
  acaoHref: string | null;
};

type Filtro =
  | "PENDENTES"
  | "PRIORIDADE"
  | "VENDAS"
  | "COBRANCAS"
  | "CONCLUIDOS"
  | "TODOS";

const POR_PAGINA = 12;

function normalizar(
  valor: string,
) {
  return valor
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLocaleLowerCase(
      "pt-BR",
    )
    .trim();
}

function prioridade(
  item: ItinerarioRotaItem,
) {
  if (
    item.categoria ===
    "ENTREGA"
  ) {
    return 1;
  }

  if (
    item.categoria ===
    "FINANCEIRO"
  ) {
    return 2;
  }

  if (
    item.categoria ===
    "COBRANCA" &&
    !item.processado
  ) {
    return 3;
  }

  if (!item.processado) {
    return 4;
  }

  return 9;
}

function visual(
  item: ItinerarioRotaItem,
) {
  if (item.processado) {
    return {
      borda:
        "border-emerald-100",
      barra:
        "bg-emerald-400",
      badge:
        "bg-emerald-50 text-emerald-700",
      icone:
        "bg-emerald-50 text-emerald-700",
    };
  }

  if (
    item.categoria ===
    "ENTREGA"
  ) {
    return {
      borda:
        "border-sky-200",
      barra:
        "bg-sky-500",
      badge:
        "bg-sky-50 text-sky-700",
      icone:
        "bg-sky-50 text-sky-700",
    };
  }

  if (
    item.categoria ===
    "FINANCEIRO" ||
    item.categoria ===
    "COBRANCA"
  ) {
    return {
      borda:
        "border-amber-200",
      barra:
        "bg-amber-400",
      badge:
        "bg-amber-50 text-amber-700",
      icone:
        "bg-amber-50 text-amber-700",
    };
  }

  return {
    borda:
      "border-slate-200",
    barra:
      "bg-[#176f3c]",
    badge:
      "bg-slate-100 text-slate-600",
    icone:
      "bg-emerald-50 text-[#176f3c]",
  };
}

function CategoriaIcon({
  item,
}: {
  item: ItinerarioRotaItem;
}) {
  if (item.processado) {
    return (
      <CheckCircle2
        size={17}
      />
    );
  }

  if (
    item.categoria ===
    "ENTREGA"
  ) {
    return (
      <PackageCheck
        size={17}
      />
    );
  }

  if (
    item.categoria ===
      "FINANCEIRO" ||
    item.categoria ===
      "COBRANCA"
  ) {
    return (
      <WalletCards
        size={17}
      />
    );
  }

  return (
    <MapPin
      size={17}
    />
  );
}

export default function ItinerarioRota({
  itens,
  totalRota,
  finalizada,
}: {
  itens:
    ItinerarioRotaItem[];
  totalRota:
    number;
  finalizada:
    boolean;
}) {
  const [busca, setBusca] =
    useState("");

  const [filtro, setFiltro] =
    useState<Filtro>(
      finalizada
        ? "TODOS"
        : "PENDENTES",
    );

  const [pagina, setPagina] =
    useState(1);

  const contagens =
    useMemo(
      () => ({
        pendentes:
          itens.filter(
            (item) =>
              !item.processado,
          ).length,
        vendas:
          itens.filter(
            (item) =>
              !item.processado &&
              (
                item.categoria ===
                  "ENTREGA" ||
                item.categoria ===
                  "FINANCEIRO"
              ),
          ).length,
        cobrancas:
          itens.filter(
            (item) =>
              !item.processado &&
              item.categoria ===
                "COBRANCA",
          ).length,
        concluidos:
          itens.filter(
            (item) =>
              item.processado,
          ).length,
      }),
      [itens],
    );

  const filtrados =
    useMemo(
      () => {
        const termo =
          normalizar(
            busca,
          );

        let lista =
          itens.filter(
            (item) => {
              if (!termo) {
                return true;
              }

              return normalizar(
                [
                  item.nome,
                  item.codigo,
                  item.bairro,
                  item.telefone,
                  item.endereco,
                  String(
                    item.sequencia,
                  ),
                ].join(" "),
              ).includes(
                termo,
              );
            },
          );

        if (
          filtro ===
          "PENDENTES"
        ) {
          lista =
            lista.filter(
              (item) =>
                !item.processado,
            );
        } else if (
          filtro ===
          "PRIORIDADE"
        ) {
          lista =
            lista
              .filter(
                (item) =>
                  !item.processado,
              )
              .sort(
                (a, b) =>
                  prioridade(a) -
                    prioridade(b) ||
                  a.sequencia -
                    b.sequencia,
              );
        } else if (
          filtro ===
          "VENDAS"
        ) {
          lista =
            lista.filter(
              (item) =>
                !item.processado &&
                (
                  item.categoria ===
                    "ENTREGA" ||
                  item.categoria ===
                    "FINANCEIRO"
                ),
            );
        } else if (
          filtro ===
          "COBRANCAS"
        ) {
          lista =
            lista.filter(
              (item) =>
                item.categoria ===
                  "COBRANCA" &&
                !item.processado,
            );
        } else if (
          filtro ===
          "CONCLUIDOS"
        ) {
          lista =
            lista.filter(
              (item) =>
                item.processado,
            );
        }

        if (
          filtro !==
          "PRIORIDADE"
        ) {
          lista =
            [...lista].sort(
              (a, b) =>
                a.sequencia -
                b.sequencia,
            );
        }

        return lista;
      },
      [
        busca,
        filtro,
        itens,
      ],
    );

  const totalPaginas =
    Math.max(
      1,
      Math.ceil(
        filtrados.length /
          POR_PAGINA,
      ),
    );

  const paginaSegura =
    Math.min(
      pagina,
      totalPaginas,
    );

  const paginaItens =
    filtrados.slice(
      (paginaSegura - 1) *
        POR_PAGINA,
      paginaSegura *
        POR_PAGINA,
    );

  function trocarFiltro(
    proximo: Filtro,
  ) {
    setFiltro(
      proximo,
    );
    setPagina(1);
  }

  function atualizarBusca(
    valor: string,
  ) {
    setBusca(
      valor,
    );
    setPagina(1);
  }

  const filtros: Array<{
    id: Filtro;
    label: string;
    count?: number;
  }> = [
    {
      id: "PENDENTES",
      label: "Pendentes",
      count:
        contagens.pendentes,
    },
    {
      id: "PRIORIDADE",
      label: "Prioridade",
    },
    {
      id: "VENDAS",
      label: "Vendas",
      count:
        contagens.vendas,
    },
    {
      id: "COBRANCAS",
      label: "Cobranças",
      count:
        contagens.cobrancas,
    },
    {
      id: "CONCLUIDOS",
      label: "Concluídos",
      count:
        contagens.concluidos,
    },
    {
      id: "TODOS",
      label: "Todos",
      count:
        itens.length,
    },
  ];

  return (
    <div className="space-y-2.5">

      <div className="flex items-end justify-between gap-3">

        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
            Itinerário
          </p>

          <h3 className="mt-0.5 text-[18px] font-black tracking-[-0.04em]">
            Sequência operacional
          </h3>
        </div>

        <div className="text-right">
          <p className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
            Rota
          </p>
          <p className="mt-0.5 text-[12px] font-black text-[#176f3c]">
            {totalRota} parada
            {totalRota === 1
              ? ""
              : "s"}
          </p>
        </div>

      </div>

      {itens.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-emerald-200 bg-emerald-50/40 p-6 text-center">
          <MapPin
            size={24}
            className="mx-auto text-[#176f3c]"
          />
          <p className="mt-2 text-[13px] font-black">
            Nenhum cliente na rota
          </p>
        </div>
      ) : (
        <>
          <div className="sticky top-2 z-30 rounded-[18px] border border-slate-200/80 bg-white/95 p-2.5 shadow-[0_12px_34px_rgba(17,63,33,0.12)] backdrop-blur-xl">

            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={busca}
                onChange={(event) =>
                  atualizarBusca(
                    event.target.value,
                  )
                }
                placeholder="Buscar nome, código, bairro ou telefone"
                className="h-[42px] w-full rounded-[14px] border border-slate-200 bg-[#f8faf8] pl-9 pr-9 text-[10.5px] font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
              />

              {busca && (
                <button
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() =>
                    atualizarBusca(
                      "",
                    )
                  }
                  className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                >
                  <X
                    size={14}
                  />
                </button>
              )}
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {filtros.map(
                (item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      trocarFiltro(
                        item.id,
                      )
                    }
                    className={`flex h-[34px] min-w-0 items-center justify-center gap-1 rounded-[11px] px-1.5 text-[7.5px] font-black transition active:scale-[0.97] ${
                      filtro === item.id
                        ? "bg-[#176f3c] text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <span className="truncate">
                      {item.label}
                    </span>
                    {item.count !==
                      undefined && (
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[6.5px] ${
                          filtro === item.id
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                ),
              )}
            </div>

          </div>

          <div className="flex items-center justify-between px-1">
            <p className="text-[9px] font-black text-slate-500">
              {filtrados.length} resultado
              {filtrados.length === 1
                ? ""
                : "s"}
            </p>

            <p className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">
              {filtro === "PENDENTES"
                ? "ordem da rota"
                : filtro === "PRIORIDADE"
                  ? "mais urgente primeiro"
                  : "filtro ativo"}
            </p>
          </div>

          {paginaItens.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-slate-200 bg-white p-6 text-center">
              <Search
                size={22}
                className="mx-auto text-slate-300"
              />
              <p className="mt-2 text-[12px] font-black">
                Nenhum cliente encontrado
              </p>
              <button
                type="button"
                onClick={() => {
                  atualizarBusca("");
                  trocarFiltro(
                    finalizada
                      ? "TODOS"
                      : "PENDENTES",
                  );
                }}
                className="mt-3 text-[9px] font-black text-[#176f3c]"
              >
                Limpar busca e filtros
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {paginaItens.map(
                (item) => {
                  const estilo =
                    visual(
                      item,
                    );

                  return (
                    <article
                      key={item.id}
                      className={`relative overflow-hidden rounded-[18px] border bg-white px-3 py-2.5 shadow-[0_10px_24px_rgba(17,63,33,0.07)] ${estilo.borda}`}
                    >
                      <div
                        className={`absolute bottom-0 left-0 top-0 w-[3px] ${estilo.barra}`}
                      />

                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] font-black ${estilo.icone}`}
                        >
                          {item.processado ? (
                            <CategoriaIcon
                              item={item}
                            />
                          ) : (
                            <span className="text-[12px]">
                              {item.sequencia}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="truncate text-[12px] font-black tracking-[-0.02em]">
                                {item.nome}
                              </h4>
                              <p className="mt-0.5 truncate text-[7px] font-black uppercase tracking-[0.11em] text-slate-400">
                                {item.codigo}
                                {item.bairro
                                  ? ` • ${item.bairro}`
                                  : ""}
                              </p>
                            </div>

                            <span
                              className={`max-w-[122px] shrink-0 truncate rounded-full px-2 py-1 text-[7px] font-black uppercase ${estilo.badge}`}
                            >
                              {item.situacao}
                            </span>
                          </div>

                          <p className="mt-1.5 truncate text-[8.5px] font-semibold text-slate-500">
                            {item.endereco}
                          </p>
                        </div>
                      </div>

                      {!item.processado &&
                        !finalizada && (
                        <div className="mt-2.5 flex gap-2 pl-[48px]">
                          {item.acaoHref &&
                            item.acaoLabel && (
                            <Link
                              href={item.acaoHref}
                              className="flex h-[38px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-[#176f3c] px-3 text-[8.5px] font-black text-white shadow-sm transition active:scale-[0.98]"
                            >
                              {item.categoria ===
                              "COBRANCA" ? (
                                <CircleDollarSign
                                  size={14}
                                />
                              ) : item.categoria ===
                                "ENTREGA" ? (
                                <PackageCheck
                                  size={14}
                                />
                              ) : (
                                <WalletCards
                                  size={14}
                                />
                              )}
                              {item.acaoLabel}
                              <ChevronRight
                                size={13}
                              />
                            </Link>
                          )}

                          {item.mapaHref && (
                            <a
                              href={item.mapaHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Abrir mapa de ${item.nome}`}
                              className="flex h-[38px] w-[42px] shrink-0 items-center justify-center rounded-[12px] border border-emerald-200 bg-emerald-50 text-[#176f3c] transition active:scale-95"
                            >
                              <Navigation
                                size={15}
                              />
                            </a>
                          )}
                        </div>
                      )}

                      {item.processado && (
                        <div className="mt-2 flex items-center justify-between pl-[48px]">
                          <span className="flex items-center gap-1 text-[8px] font-black text-emerald-700">
                            <CheckCircle2
                              size={12}
                            />
                            Processado
                          </span>

                          {item.mapaHref &&
                            filtro ===
                              "TODOS" && (
                            <a
                              href={item.mapaHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[8px] font-black text-slate-400"
                            >
                              Ver endereço
                            </a>
                          )}
                        </div>
                      )}
                    </article>
                  );
                },
              )}
            </div>
          )}

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-white p-2.5 shadow-sm">
              <button
                type="button"
                disabled={
                  paginaSegura <= 1
                }
                onClick={() =>
                  setPagina(
                    Math.max(
                      1,
                      paginaSegura - 1,
                    ),
                  )
                }
                className="flex h-[38px] items-center gap-1 rounded-[12px] border border-slate-200 px-3 text-[8px] font-black text-slate-600 disabled:opacity-30"
              >
                <ChevronLeft
                  size={13}
                />
                Anterior
              </button>

              <div className="text-center">
                <p className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">
                  Página
                </p>
                <p className="mt-0.5 text-[11px] font-black">
                  {paginaSegura}/{totalPaginas}
                </p>
              </div>

              <button
                type="button"
                disabled={
                  paginaSegura >=
                  totalPaginas
                }
                onClick={() =>
                  setPagina(
                    Math.min(
                      totalPaginas,
                      paginaSegura + 1,
                    ),
                  )
                }
                className="flex h-[38px] items-center gap-1 rounded-[12px] bg-[#176f3c] px-3 text-[8px] font-black text-white disabled:opacity-30"
              >
                Próxima
                <ChevronRight
                  size={13}
                />
              </button>
            </div>
          )}
        </>
      )}

    </div>
  );
}
