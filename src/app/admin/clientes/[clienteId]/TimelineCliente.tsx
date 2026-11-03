"use client";

import {
  AlertTriangle,
  Banknote,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clock3,
  FileText,
  History,
  PackageCheck,
  Route,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";

type TimelineItem = {
  data: string;
  tipo:
    | "CONTRATO"
    | "VENDA"
    | "PAGAMENTO"
    | "ENTREGA"
    | "ROTA"
    | "OCORRENCIA"
    | "CREDITO";
  titulo: string;
  descricao: string;
  valor?: string;
};

type Filtro =
  | "TODOS"
  | "FINANCEIRO"
  | "ENTREGAS"
  | "ROTAS"
  | "OCORRENCIAS"
  | "CREDITO";

const POR_BLOCO = 8;

function dataHora(valor: string) {
  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function normalizarDescricao(
  valor: string | null | undefined,
) {
  const texto = String(valor ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\bCarga\s*#\s*/g, "Carga nº ")
    .replace(/\bcarga\s*#\s*/g, "carga nº ")
    .replace(/\bCARGA\s*#\s*/g, "CARGA Nº ");

  return texto || "Não informado";
}

function pertenceAoFiltro(
  item: TimelineItem,
  filtro: Filtro,
) {
  if (filtro === "TODOS") return true;

  if (filtro === "FINANCEIRO") {
    return (
      item.tipo === "CONTRATO" ||
      item.tipo === "VENDA" ||
      item.tipo === "PAGAMENTO"
    );
  }

  if (filtro === "ENTREGAS") {
    return item.tipo === "ENTREGA";
  }

  if (filtro === "OCORRENCIAS") {
    return item.tipo === "OCORRENCIA";
  }

  if (filtro === "ROTAS") {
    return item.tipo === "ROTA";
  }

  if (filtro === "CREDITO") {
    return item.tipo === "CREDITO";
  }

  return true;
}

function configEvento(tipo: TimelineItem["tipo"]) {
  if (tipo === "CONTRATO") {
    return {
      icon: <FileText size={13} />,
      classe:
        "bg-sky-50 text-sky-700 border-sky-100",
      label: "Contrato",
      detalheLabel: "Condição do contrato",
    };
  }

  /* V67_TIMELINE_VENDA_CONFIG */
  if (tipo === "VENDA") {
    return {
      icon: <CircleDollarSign size={13} />,
      classe:
        "bg-emerald-50 text-emerald-700 border-emerald-100",
      label: "Venda",
      detalheLabel: "Condição da venda",
    };
  }

  if (tipo === "PAGAMENTO") {
    return {
      icon: <Banknote size={13} />,
      classe:
        "bg-emerald-50 text-emerald-700 border-emerald-100",
      label: "Pagamento",
      detalheLabel: "Forma de pagamento",
    };
  }

  if (tipo === "ENTREGA") {
    return {
      icon: <PackageCheck size={13} />,
      classe:
        "bg-[#eef7f0] text-[#176f3c] border-emerald-100",
      label: "Entrega",
      detalheLabel: "Carga / referência",
    };
  }

  /* V67_TIMELINE_ROTA_CONFIG */
  if (tipo === "ROTA") {
    return {
      icon: <Route size={13} />,
      classe:
        "bg-sky-50 text-sky-700 border-sky-100",
      label: "Rota",
      detalheLabel: "Planejamento / atendimento",
    };
  }

  if (tipo === "OCORRENCIA") {
    return {
      icon: <AlertTriangle size={13} />,
      classe:
        "bg-amber-50 text-amber-700 border-amber-100",
      label: "Ocorrência",
      detalheLabel: "Motivo da ocorrência",
    };
  }

  return {
    icon: <ShieldCheck size={13} />,
    classe:
      "bg-violet-50 text-violet-700 border-violet-100",
    label: "Crédito",
    detalheLabel: "Motivo da liberação",
  };
}

export function TimelineCliente({
  timeline,
}: {
  timeline: TimelineItem[];
}) {
  const [filtro, setFiltro] =
    useState<Filtro>("TODOS");
  const [limite, setLimite] =
    useState(POR_BLOCO);

  const contagens = useMemo(
    () => ({
      TODOS: timeline.length,
      FINANCEIRO: timeline.filter(
        (item) =>
          item.tipo === "CONTRATO" ||
          item.tipo === "VENDA" ||
          item.tipo === "PAGAMENTO",
      ).length,
      ENTREGAS: timeline.filter(
        (item) =>
          item.tipo === "ENTREGA",
      ).length,
      OCORRENCIAS: timeline.filter(
        (item) =>
          item.tipo === "OCORRENCIA",
      ).length,

      ROTAS: timeline.filter(
        (item) =>
          item.tipo === "ROTA",
      ).length,
      CREDITO: timeline.filter(
        (item) =>
          item.tipo === "CREDITO",
      ).length,
    }),
    [timeline],
  );

  const filtrados = useMemo(
    () =>
      timeline.filter((item) =>
        pertenceAoFiltro(item, filtro),
      ),
    [timeline, filtro],
  );

  const visiveis =
    filtrados.slice(0, limite);

  const trocarFiltro = (
    novoFiltro: Filtro,
  ) => {
    setFiltro(novoFiltro);
    setLimite(POR_BLOCO);
  };

  const filtros: Array<{
    valor: Filtro;
    label: string;
  }> = [
    { valor: "TODOS", label: "Todos" },
    {
      valor: "FINANCEIRO",
      label: "Financeiro",
    },
    {
      valor: "ENTREGAS",
      label: "Entregas",
    },
    {
      valor: "OCORRENCIAS",
      label: "Ocorrências",
    },

    {
      valor: "ROTAS",
      label: "Rotas",
    },
    {
      valor: "CREDITO",
      label: "Crédito",
    },
  ];

  return (
    <section className="card-premium mt-5 rounded-[24px] p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="icon-emerald flex h-10 w-10 items-center justify-center rounded-[13px]">
            <History size={17} />
          </div>

          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
              Histórico 360°
            </p>

            <h3 className="mt-1 text-[17px] font-black tracking-[-0.035em]">
              Linha do tempo do cliente
            </h3>

            <p className="mt-1 text-[9px] font-medium text-slate-400">
              Cada evento informa claramente o que cada dado representa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-50 px-3 py-2 text-[8px] font-black text-slate-500">
            {filtrados.length} evento(s)
          </span>

          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-emerald-50 text-emerald-700">
            <SlidersHorizontal size={14} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {filtros.map((item) => {
          const ativo =
            filtro === item.valor;

          return (
            <button
              key={item.valor}
              type="button"
              onClick={() =>
                trocarFiltro(item.valor)
              }
              className={`shrink-0 rounded-[10px] px-3 py-2 text-[8px] font-black ${
                ativo
                  ? "bg-[#176f3c] text-white"
                  : "border border-slate-200 bg-white text-slate-500"
              }`}
            >
              {item.label}
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[7px] ${
                  ativo
                    ? "bg-white/15 text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {contagens[item.valor]}
              </span>
            </button>
          );
        })}
      </div>

      {visiveis.length === 0 ? (
        <div className="mt-4 rounded-[16px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
          <p className="text-[10px] font-black text-slate-600">
            Nenhum evento neste filtro
          </p>
          <p className="mt-1 text-[8px] text-slate-400">
            Escolha outro tipo de histórico.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-[16px] border border-slate-100 bg-white">
          <div className="hidden grid-cols-[40px_minmax(180px,.9fr)_minmax(260px,1.45fr)_150px_110px] items-center gap-2 border-b border-slate-100 bg-[#f7faf8] px-3 py-2 md:grid">
            <div />
            <p className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
              Evento
            </p>
            <p className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
              Detalhe
            </p>
            <p className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
              Data / hora
            </p>
            <p className="text-right text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
              Valor
            </p>
          </div>

          {visiveis.map((item, index) => {
            const config =
              configEvento(item.tipo);
            const descricao =
              normalizarDescricao(
                item.descricao,
              );

            return (
              <div
                key={`${item.tipo}-${item.data}-${index}`}
                className={`grid gap-2 px-3 py-2.5 md:grid-cols-[40px_minmax(180px,.9fr)_minmax(260px,1.45fr)_150px_110px] md:items-center ${
                  index > 0
                    ? "border-t border-slate-100"
                    : ""
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-[10px] border ${config.classe}`}
                >
                  {config.icon}
                </div>

                <div className="min-w-0">
                  <p className="md:hidden text-[6px] font-black uppercase tracking-[0.08em] text-slate-400">
                    Evento
                  </p>

                  <p className="truncate text-[10px] font-black text-slate-700">
                    {item.titulo}
                  </p>

                  <p className="mt-0.5 text-[7px] font-black uppercase tracking-[0.08em] text-slate-400">
                    {config.label}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="text-[6px] font-black uppercase tracking-[0.08em] text-slate-400">
                    {config.detalheLabel}
                  </p>

                  <p
                    className="mt-0.5 break-words text-[9px] font-semibold leading-4 text-slate-600"
                    title={descricao}
                  >
                    {descricao}
                  </p>
                </div>

                <div>
                  <p className="md:hidden text-[6px] font-black uppercase tracking-[0.08em] text-slate-400">
                    Data / hora
                  </p>

                  <div className="mt-0.5 flex items-center gap-1.5 text-[8px] font-semibold text-slate-400">
                    <Clock3 size={10} />
                    {dataHora(item.data)}
                  </div>
                </div>

                <div className="text-left md:text-right">
                  <p className="md:hidden text-[6px] font-black uppercase tracking-[0.08em] text-slate-400">
                    Valor
                  </p>

                  {item.valor ? (
                    <span className="mt-0.5 inline-block text-[10px] font-black text-[#176f3c]">
                      {item.valor}
                    </span>
                  ) : (
                    <span className="mt-0.5 inline-block text-[8px] font-semibold text-slate-300">
                      —
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtrados.length > POR_BLOCO ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[8px] font-semibold text-slate-400">
            Exibindo {Math.min(limite, filtrados.length)} de {filtrados.length}
          </p>

          {limite < filtrados.length ? (
            <button
              type="button"
              onClick={() =>
                setLimite((atual) =>
                  Math.min(
                    atual + POR_BLOCO,
                    filtrados.length,
                  ),
                )
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-[#176f3c] px-3 text-[8px] font-black text-white"
            >
              Mostrar mais
              <ChevronDown size={12} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setLimite(POR_BLOCO)
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-slate-200 bg-white px-3 text-[8px] font-black text-slate-600"
            >
              Recolher
              <ChevronUp size={12} />
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
