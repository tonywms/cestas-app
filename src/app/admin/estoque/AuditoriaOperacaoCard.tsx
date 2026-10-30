"use client";

import { ArrowRight, X } from "lucide-react";
import { useEffect, useState } from "react";

type MovimentoVisual = {
  id: number;
  tipoCestaId: number;
  cargaId: number | null;
  usuarioId: string | null;
  tipoMovimento: string;
  quantidade: number;
  referencia: string | null;
  observacao: string | null;
  createdAt: string;
  cestaNome: string;
  cestaCodigo: string;
  cargaCodigo: string | null;
  responsavelNome: string;
  entregadorNome: string | null;
  clienteNome: string | null;
  clienteCodigo: string | null;
  origem: string;
  destino: string;
  destinoGrupo: "CENTRAL" | "CARGA" | "CLIENTE" | "OUTRO";
  titulo: string;
  natureza: "ENTRADA" | "SAIDA" | "RETORNO" | "TRANSFERENCIA";
  registrosTecnicos?: string[];
  registrosTecnicosIds?: number[];
};

function formatarDataHora(valor: string) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;

  return data.toLocaleString("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarTipoMovimento(tipo: string) {
  switch (tipo) {
    case "SAIDA_CENTRAL_CARGA":
      return "Saída do central para carga";
    case "ENTRADA_CARGA":
      return "Entrada na carga do entregador";
    case "SAIDA_CARGA_ENTREGA":
      return "Saída para entrega ao cliente";
    case "RETORNO_CARGA_CENTRAL":
      return "Retorno da carga ao central";
    case "AVARIA_CARGA":
      return "Avaria na carga";
    default:
      return tipo.replaceAll("_", " ");
  }
}

function rotuloOperacao(item: MovimentoVisual) {
  switch (item.tipoMovimento) {
    case "SAIDA_CENTRAL_CARGA":
      return "Carga para entregador";
    case "ENTRADA_CARGA":
      return "Entrada na carga";
    case "SAIDA_CARGA_ENTREGA":
      return "Entrega ao cliente";
    case "RETORNO_CARGA_CENTRAL":
      return "Retorno ao central";
    case "AVARIA_CARGA":
      return "Avaria";
    default:
      return formatarTipoMovimento(item.tipoMovimento);
  }
}

const visualNatureza = {
  ENTRADA: {
    faixa: "bg-[#1f8a4b]",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    valor: "text-[#14743d]",
    sinal: "+",
  },
  RETORNO: {
    faixa: "bg-[#2f6fd1]",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    valor: "text-[#1f57b8]",
    sinal: "+",
  },
  SAIDA: {
    faixa: "bg-[#d99a2b]",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    valor: "text-[#a15f00]",
    sinal: "−",
  },
  TRANSFERENCIA: {
    faixa: "bg-[#8a968b]",
    badge: "border-slate-200 bg-slate-100 text-slate-600",
    valor: "text-[#44524a]",
    sinal: "",
  },
};

function Dado({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-[14px] bg-[#f6f9f6] px-3.5 py-3">
      <p className="text-[9px] font-extrabold uppercase tracking-[0.11em] text-[#8a968b]">
        {label}
      </p>
      <p className="mt-1 break-words text-[12px] font-bold leading-5 text-[#1c2a20]">
        {valor}
      </p>
    </div>
  );
}

export default function AuditoriaOperacaoCard({ item }: { item: MovimentoVisual }) {
  const [aberto, setAberto] = useState(false);
  const visual = visualNatureza[item.natureza];

  useEffect(() => {
    if (!aberto) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAberto(false);
    }

    document.addEventListener("keydown", onKeyDown);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflowAnterior;
    };
  }, [aberto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="group relative min-h-[210px] w-full overflow-hidden rounded-[22px] border border-white bg-white text-left shadow-[0_0_0_1px_rgba(17,63,33,0.05),0_14px_34px_-26px_rgba(12,77,39,0.4)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(17,63,33,0.09),0_18px_38px_-22px_rgba(12,77,39,0.48)]"
      >
        <span className={`absolute inset-y-0 left-0 w-1 ${visual.faixa}`} aria-hidden />

        <div className="flex items-start justify-between gap-3 border-b border-[#eef2ee] px-4 py-3.5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[8px] font-extrabold ${visual.badge}`}>
                {rotuloOperacao(item)}
              </span>
              <span className="text-[9px] font-semibold text-[#7d897f]">
                {formatarDataHora(item.createdAt)}
              </span>
            </div>

            <h4 className="mt-2 line-clamp-2 text-[13px] font-extrabold leading-[1.25] tracking-[-0.02em] text-[#0f1d13]">
              {item.titulo}
            </h4>
          </div>

          <div className="shrink-0 rounded-[13px] bg-[#f3f9f5] px-3 py-2 text-right">
            <p className="text-[7px] font-extrabold uppercase tracking-[0.1em] text-[#8a968b]">Qtd.</p>
            <p className={`text-[19px] font-extrabold leading-none tabular-nums ${visual.valor}`}>
              {visual.sinal}{item.quantidade}
            </p>
          </div>
        </div>

        <div className="px-4 py-3.5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="min-w-0 rounded-[13px] bg-[#f6f9f6] px-3 py-2.5">
              <p className="text-[7px] font-extrabold uppercase tracking-[0.1em] text-[#8a968b]">De</p>
              <p className="mt-1 truncate text-[9px] font-bold text-[#1c2a20]" title={item.origem}>
                {item.origem}
              </p>
            </div>

            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e3f5e9] text-[#14743d]">
              <ArrowRight size={13} />
            </span>

            <div className="min-w-0 rounded-[13px] bg-[#e9f7ee] px-3 py-2.5 ring-1 ring-inset ring-[#bfe5cb]">
              <p className="text-[7px] font-extrabold uppercase tracking-[0.1em] text-[#8a968b]">Para</p>
              <p className="mt-1 truncate text-[9px] font-bold text-[#0f5a30]" title={item.destino}>
                {item.destino}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[7px] font-extrabold uppercase tracking-[0.1em] text-[#9aa49b]">Responsável</p>
              <p className="mt-0.5 truncate text-[10px] font-extrabold text-[#17231a]">
                {item.responsavelNome}
              </p>
              <p className="mt-0.5 truncate text-[8px] font-semibold text-[#7d897f]">
                {item.clienteNome
                  ? `${item.clienteNome}${item.clienteCodigo ? ` · ${item.clienteCodigo}` : ""}`
                  : item.entregadorNome ?? item.cestaNome}
              </p>
            </div>

            <div className="max-w-[46%] shrink-0 text-right">
              <p className="truncate text-[8px] font-bold text-[#57645a]" title={item.cestaNome}>
                {item.cestaNome}
              </p>
              <p className="mt-0.5 truncate text-[7px] font-semibold text-[#9aa49b]">
                {item.cargaCodigo ?? item.referencia ?? item.cestaCodigo}
              </p>
            </div>
          </div>

          <div className="mt-3 border-t border-[#eef2ee] pt-2.5 text-[8px] font-extrabold text-[#14743d]">
            Clique para ver todos os detalhes
          </div>
        </div>
      </button>

      {aberto ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#102018]/55 p-4 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setAberto(false);
          }}
        >
          <div className="max-h-[88vh] w-full max-w-[720px] overflow-y-auto rounded-[28px] bg-white shadow-[0_30px_100px_rgba(0,0,0,0.28)]">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#edf2ed] bg-white/95 px-6 py-5 backdrop-blur">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[8px] font-extrabold ${visual.badge}`}>
                    {rotuloOperacao(item)}
                  </span>
                  <span className="text-[10px] font-semibold text-[#7d897f]">
                    {formatarDataHora(item.createdAt)}
                  </span>
                </div>
                <h3 className="mt-2 text-[20px] font-extrabold tracking-[-0.035em] text-[#0f1d13]">
                  {item.titulo}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setAberto(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#f3f7f4] text-[#44524a] transition hover:bg-[#e8efe9]"
                aria-label="Fechar detalhes"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <Dado label="Origem" valor={item.origem} />
                <Dado label="Destino" valor={item.destino} />
                <Dado label="Responsável" valor={item.responsavelNome} />
                <Dado label="Entregador" valor={item.entregadorNome ?? "Não se aplica"} />
                <Dado label="Cesta" valor={`${item.cestaNome} · ${item.cestaCodigo}`} />
                <Dado label="Quantidade" valor={`${visual.sinal}${item.quantidade}`} />
                <Dado label="Carga" valor={item.cargaCodigo ?? "Não se aplica"} />
                <Dado label="Referência" valor={item.referencia ?? "Não se aplica"} />
                {item.clienteNome ? (
                  <Dado
                    label="Cliente"
                    valor={`${item.clienteNome}${item.clienteCodigo ? ` · ${item.clienteCodigo}` : ""}`}
                  />
                ) : null}
              </div>

              <div className="mt-4 rounded-[16px] bg-[#f8faf8] px-4 py-4">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.11em] text-[#8a968b]">Detalhe operacional</p>
                <p className="mt-2 text-[12px] font-semibold leading-5 text-[#44524a]">
                  {item.observacao ?? item.titulo}
                </p>
              </div>

              {item.registrosTecnicos?.length ? (
                <div className="mt-4 rounded-[16px] border border-[#e5ece6] px-4 py-4">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.11em] text-[#8a968b]">Auditoria técnica</p>
                  <div className="mt-3 space-y-2">
                    {item.registrosTecnicos.map((registro, index) => (
                      <div
                        key={`${registro}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-[12px] bg-[#f3f7f4] px-3 py-2.5"
                      >
                        <span className="text-[11px] font-bold text-[#44524a]">
                          {formatarTipoMovimento(registro)}
                        </span>
                        {item.registrosTecnicosIds?.[index] ? (
                          <span className="text-[10px] font-semibold text-[#8a968b]">
                            #{item.registrosTecnicosIds[index]}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
