"use client";

import {
  CalendarDays,
  ChevronDown,
  Filter,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  useMemo,
  useState,
} from "react";

type Entregador = {
  id: string;
  nome: string;
};

type Props = {
  entregadores: Entregador[];
};

const periodos = [
  { valor: "", label: "Tudo" },
  { valor: "hoje", label: "Hoje" },
  { valor: "7", label: "7 dias" },
  { valor: "15", label: "15 dias" },
  { valor: "30", label: "30 dias" },
] as const;

const movimentos = [
  { valor: "", label: "Todas" },
  { valor: "saldo", label: "Em posse" },
  { valor: "entrega", label: "Com entrega" },
  { valor: "retorno", label: "Com retorno" },
  { valor: "avaria", label: "Com avaria" },
] as const;

function formatarData(
  valor: string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      valor,
    )
  ) {
    return valor;
  }

  const [
    ano,
    mes,
    dia,
  ] = valor.split("-");

  return `${dia}/${mes}/${ano}`;
}

export default function CargasFiltros({
  entregadores,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [aberto, setAberto] =
    useState(false);

  const [busca, setBusca] =
    useState(
      searchParams.get("busca") ?? "",
    );

  const [entregador, setEntregador] =
    useState(
      searchParams.get("entregador") ?? "",
    );

  const [status, setStatus] =
    useState(
      searchParams.get("status") ?? "",
    );

  const [conferencia, setConferencia] =
    useState(
      searchParams.get("conferencia") ?? "",
    );

  const [de, setDe] =
    useState(
      searchParams.get("de") ?? "",
    );

  const [ate, setAte] =
    useState(
      searchParams.get("ate") ?? "",
    );

  const periodoAtivo =
    searchParams.get("periodo") ?? "";

  const movimentoAtivo =
    searchParams.get("movimento") ?? "";

  const filtrosAvancadosAtivos =
    useMemo(() => {
      const chaves = [
        "busca",
        "entregador",
        "status",
        "conferencia",
        "de",
        "ate",
      ];

      return chaves.filter(
        (
          chave,
        ) =>
          (
            searchParams.get(
              chave,
            ) ?? ""
          ).trim() !== "",
      ).length;
    }, [searchParams]);

  const filtrosTotais =
    useMemo(() => {
      return Array.from(
        searchParams.entries(),
      ).filter(
        (
          [, valor],
        ) =>
          valor.trim() !== "",
      ).length;
    }, [searchParams]);

  function navegar(
    alteracoes: Record<
      string,
      string | null
    >,
  ) {
    const params =
      new URLSearchParams(
        searchParams.toString(),
      );

    for (
      const [
        chave,
        valor,
      ] of Object.entries(
        alteracoes,
      )
    ) {
      if (
        valor === null ||
        valor === ""
      ) {
        params.delete(chave);
      } else {
        params.set(
          chave,
          valor,
        );
      }
    }

    const query =
      params.toString();

    router.push(
      query
        ? `${pathname}?${query}`
        : pathname,
    );
  }

  function aplicar() {
    navegar({
      busca:
        busca.trim() || null,
      entregador:
        entregador || null,
      status:
        status || null,
      conferencia:
        conferencia || null,
      de:
        de || null,
      ate:
        ate || null,
      periodo:
        de || ate
          ? null
          : periodoAtivo ||
            null,
    });

    setAberto(false);
  }

  function limparTudo() {
    setBusca("");
    setEntregador("");
    setStatus("");
    setConferencia("");
    setDe("");
    setAte("");
    setAberto(false);

    router.push(
      pathname,
    );
  }

  function limparAvancados() {
    setBusca("");
    setEntregador("");
    setStatus("");
    setConferencia("");
    setDe("");
    setAte("");

    navegar({
      busca: null,
      entregador: null,
      status: null,
      conferencia: null,
      de: null,
      ate: null,
    });
  }

  function remover(
    chave:
      | "busca"
      | "entregador"
      | "status"
      | "conferencia"
      | "de"
      | "ate",
  ) {
    if (
      chave === "busca"
    ) {
      setBusca("");
    }

    if (
      chave === "entregador"
    ) {
      setEntregador("");
    }

    if (
      chave === "status"
    ) {
      setStatus("");
    }

    if (
      chave === "conferencia"
    ) {
      setConferencia("");
    }

    if (
      chave === "de"
    ) {
      setDe("");
    }

    if (
      chave === "ate"
    ) {
      setAte("");
    }

    navegar({
      [chave]: null,
    });
  }

  const entregadorAtivo =
    entregadores.find(
      (
        item,
      ) =>
        item.id ===
        searchParams.get(
          "entregador",
        ),
    );

  const resumoAvancado = [
    searchParams.get(
      "busca",
    )
      ? {
          chave:
            "busca" as const,
          texto: `Busca: ${searchParams.get(
            "busca",
          )}`,
        }
      : null,

    entregadorAtivo
      ? {
          chave:
            "entregador" as const,
          texto:
            entregadorAtivo.nome,
        }
      : null,

    searchParams.get(
      "status",
    )
      ? {
          chave:
            "status" as const,
          texto:
            searchParams
              .get(
                "status",
              )!
              .replaceAll(
                "_",
                " ",
              ),
        }
      : null,

    searchParams.get(
      "conferencia",
    )
      ? {
          chave:
            "conferencia" as const,
          texto:
            searchParams.get(
              "conferencia",
            ) ===
            "completa"
              ? "Conferida"
              : "Pendente",
        }
      : null,

    searchParams.get("de")
      ? {
          chave:
            "de" as const,
          texto: `De ${formatarData(
            searchParams.get(
              "de",
            )!,
          )}`,
        }
      : null,

    searchParams.get("ate")
      ? {
          chave:
            "ate" as const,
          texto: `Até ${formatarData(
            searchParams.get(
              "ate",
            )!,
          )}`,
        }
      : null,
  ].filter(
    (
      item,
    ): item is {
      chave:
        | "busca"
        | "entregador"
        | "status"
        | "conferencia"
        | "de"
        | "ate";
      texto: string;
    } =>
      item !== null,
  );

  return (
    <section className="mt-5 overflow-hidden rounded-[28px] border border-black/[0.04] bg-white shadow-[0_16px_42px_rgba(17,63,33,0.055)]">

      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-emerald-50 text-emerald-700">
            <SlidersHorizontal
              size={17}
            />
          </div>

          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#b28735]">
              Filtros inteligentes
            </p>

            <h3 className="mt-0.5 text-[15px] font-black">
              Encontre qualquer carga rapidamente
            </h3>
          </div>

        </div>

        <div className="flex items-center gap-2">

          {filtrosTotais >
            0 && (
            <button
              type="button"
              onClick={limparTudo}
              className="hidden h-10 items-center gap-2 rounded-[13px] border border-slate-200 px-3 text-[8px] font-black text-slate-500 transition hover:bg-slate-50 sm:flex"
            >
              <RotateCcw
                size={13}
              />
              Limpar
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              setAberto(
                (
                  atual,
                ) =>
                  !atual,
              )
            }
            className={`flex h-10 items-center gap-2 rounded-[13px] border px-4 text-[8px] font-black transition ${
              aberto ||
              filtrosAvancadosAtivos >
                0
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Filter
              size={14}
            />

            Mais filtros

            {filtrosAvancadosAtivos >
              0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#176f3c] px-1.5 text-[7px] text-white">
                {
                  filtrosAvancadosAtivos
                }
              </span>
            )}

            <ChevronDown
              size={14}
              className={`transition-transform ${
                aberto
                  ? "rotate-180"
                  : ""
              }`}
            />
          </button>

        </div>

      </div>

      <div className="border-t border-slate-100 px-5 py-4">

        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">

          <div>
            <p className="mb-2 text-[7px] font-black uppercase tracking-[0.14em] text-slate-400">
              Período rápido
            </p>

            <div className="flex flex-wrap gap-2">
              {periodos.map(
                (
                  item,
                ) => (
                  <button
                    key={
                      item.valor ||
                      "tudo"
                    }
                    type="button"
                    onClick={() =>
                      navegar({
                        periodo:
                          item.valor ||
                          null,
                        de: null,
                        ate: null,
                      })
                    }
                    className={`h-9 rounded-[12px] border px-4 text-[8px] font-black transition ${
                      periodoAtivo ===
                        item.valor &&
                      !searchParams.get(
                        "de",
                      ) &&
                      !searchParams.get(
                        "ate",
                      )
                        ? "border-emerald-700 bg-[#176f3c] text-white"
                        : "border-emerald-100 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ),
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[7px] font-black uppercase tracking-[0.14em] text-slate-400 xl:text-right">
              Situação operacional
            </p>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              {movimentos.map(
                (
                  item,
                ) => (
                  <button
                    key={
                      item.valor ||
                      "todas"
                    }
                    type="button"
                    onClick={() =>
                      navegar({
                        movimento:
                          item.valor ||
                          null,
                      })
                    }
                    className={`h-9 rounded-[12px] border px-4 text-[8px] font-black transition ${
                      movimentoAtivo ===
                      item.valor
                        ? "border-[#d5a33e] bg-[#fff8e9] text-[#9a6a10]"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ),
              )}
            </div>
          </div>

        </div>

        {resumoAvancado.length >
          0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-slate-200 pt-4">

            <span className="mr-1 text-[7px] font-black uppercase tracking-[0.13em] text-slate-400">
              Filtros ativos
            </span>

            {resumoAvancado.map(
              (
                item,
              ) => (
                <button
                  key={
                    item.chave
                  }
                  type="button"
                  onClick={() =>
                    remover(
                      item.chave,
                    )
                  }
                  title="Remover filtro"
                  className="flex h-8 items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 text-[8px] font-black text-emerald-700 transition hover:bg-emerald-100"
                >
                  {item.texto}
                  <X
                    size={11}
                  />
                </button>
              ),
            )}

            <button
              type="button"
              onClick={
                limparAvancados
              }
              className="ml-auto h-8 rounded-full px-3 text-[8px] font-black text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
            >
              Limpar avançados
            </button>

          </div>
        )}

      </div>

      {aberto && (
        <div className="border-t border-slate-100 bg-[#fbfcfb] px-5 py-5">

          <div className="mb-4 flex items-center justify-between gap-4">

            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-emerald-700">
                Filtros avançados
              </p>

              <p className="mt-1 text-[9px] text-slate-400">
                Use somente quando precisar refinar a pesquisa.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setAberto(
                  false,
                )
              }
              className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50"
              aria-label="Fechar filtros avançados"
            >
              <X
                size={14}
              />
            </button>

          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">

            <label className="xl:col-span-2">
              <span className="mb-2 block text-[7px] font-black uppercase tracking-[0.13em] text-slate-400">
                Buscar
              </span>

              <div className="flex h-[46px] items-center gap-2 rounded-[14px] border border-slate-200 bg-white px-3 focus-within:border-emerald-300">
                <Search
                  size={15}
                  className="text-slate-400"
                />

                <input
                  value={busca}
                  onChange={(
                    event,
                  ) =>
                    setBusca(
                      event.target
                        .value,
                    )
                  }
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      aplicar();
                    }
                  }}
                  placeholder="Código da carga ou nome do entregador"
                  className="min-w-0 flex-1 bg-transparent text-[10px] font-bold outline-none placeholder:text-slate-300"
                />
              </div>
            </label>

            <label>
              <span className="mb-2 block text-[7px] font-black uppercase tracking-[0.13em] text-slate-400">
                Entregador
              </span>

              <select
                value={
                  entregador
                }
                onChange={(
                  event,
                ) =>
                  setEntregador(
                    event.target
                      .value,
                  )
                }
                className="h-[46px] w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[10px] font-bold outline-none focus:border-emerald-300"
              >
                <option value="">
                  Todos
                </option>

                {entregadores.map(
                  (
                    item,
                  ) => (
                    <option
                      key={
                        item.id
                      }
                      value={
                        item.id
                      }
                    >
                      {item.nome}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-[7px] font-black uppercase tracking-[0.13em] text-slate-400">
                Status
              </span>

              <select
                value={status}
                onChange={(
                  event,
                ) =>
                  setStatus(
                    event.target
                      .value,
                  )
                }
                className="h-[46px] w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[10px] font-bold outline-none focus:border-emerald-300"
              >
                <option value="">
                  Todos
                </option>
                <option value="ABERTA">
                  Aberta
                </option>
                <option value="EM_ROTA">
                  Em rota
                </option>
                <option value="FINALIZADA">
                  Finalizada
                </option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-[7px] font-black uppercase tracking-[0.13em] text-slate-400">
                Conferência
              </span>

              <select
                value={
                  conferencia
                }
                onChange={(
                  event,
                ) =>
                  setConferencia(
                    event.target
                      .value,
                  )
                }
                className="h-[46px] w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[10px] font-bold outline-none focus:border-emerald-300"
              >
                <option value="">
                  Todas
                </option>
                <option value="completa">
                  Conferida
                </option>
                <option value="pendente">
                  Pendente
                </option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-[7px] font-black uppercase tracking-[0.13em] text-slate-400">
                Data inicial
              </span>

              <div className="flex h-[46px] items-center gap-2 rounded-[14px] border border-slate-200 bg-white px-3">
                <CalendarDays
                  size={14}
                  className="text-slate-400"
                />

                <input
                  type="date"
                  value={de}
                  onChange={(
                    event,
                  ) =>
                    setDe(
                      event.target
                        .value,
                    )
                  }
                  className="min-w-0 flex-1 bg-transparent text-[10px] font-bold outline-none"
                />
              </div>
            </label>

            <label>
              <span className="mb-2 block text-[7px] font-black uppercase tracking-[0.13em] text-slate-400">
                Data final
              </span>

              <div className="flex h-[46px] items-center gap-2 rounded-[14px] border border-slate-200 bg-white px-3">
                <CalendarDays
                  size={14}
                  className="text-slate-400"
                />

                <input
                  type="date"
                  value={ate}
                  onChange={(
                    event,
                  ) =>
                    setAte(
                      event.target
                        .value,
                    )
                  }
                  className="min-w-0 flex-1 bg-transparent text-[10px] font-bold outline-none"
                />
              </div>
            </label>

            <div className="flex items-end xl:col-span-1">
              <button
                type="button"
                onClick={aplicar}
                className="flex h-[46px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#176f3c] px-4 text-[9px] font-black text-white shadow-[0_10px_22px_rgba(23,111,60,0.13)] transition hover:bg-[#126333]"
              >
                <Filter
                  size={14}
                />
                Aplicar filtros
              </button>
            </div>

          </div>

        </div>
      )}

    </section>
  );
}
