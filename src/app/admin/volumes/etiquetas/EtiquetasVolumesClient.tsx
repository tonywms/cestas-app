"use client";

import {
  ArrowLeft,
  Barcode,
  Check,
  Printer,
  Search,
} from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState } from "react";

type VolumeEtiqueta = {
  id: string;
  codigoVolume: string;
  status: string;
  cargaId: number | null;
  tipoNome: string;
  tipoCodigo: string;
};

type StatusFiltro =
  | "TODOS"
  | "EM_CARGA"
  | "DISPONIVEL"
  | "ENTREGUE"
  | "RETORNADO"
  | "AVARIADO"
  | "OUTROS";

const STATUS_CONHECIDOS = [
  "EM_CARGA",
  "DISPONIVEL",
  "ENTREGUE",
  "RETORNADO",
  "AVARIADO",
] as const;

const OPCOES_STATUS: StatusFiltro[] = [
  "TODOS",
  "EM_CARGA",
  "DISPONIVEL",
  "ENTREGUE",
  "RETORNADO",
  "AVARIADO",
  "OUTROS",
];

function labelStatus(status: StatusFiltro) {
  switch (status) {
    case "TODOS":
      return "Todos";
    case "EM_CARGA":
      return "Em carga";
    case "DISPONIVEL":
      return "Disponíveis";
    case "ENTREGUE":
      return "Entregues";
    case "RETORNADO":
      return "Retornados";
    case "AVARIADO":
      return "Avariados";
    case "OUTROS":
      return "Outros";
  }
}

function statusVisual(status: string) {
  switch (status) {
    case "EM_CARGA":
      return {
        label: "EM CARGA",
        className: "bg-blue-50 text-blue-700",
      };
    case "DISPONIVEL":
      return {
        label: "DISPONÍVEL",
        className: "bg-emerald-50 text-emerald-700",
      };
    case "ENTREGUE":
      return {
        label: "ENTREGUE",
        className: "bg-slate-100 text-slate-700",
      };
    case "RETORNADO":
      return {
        label: "RETORNADO",
        className: "bg-violet-50 text-violet-700",
      };
    case "AVARIADO":
      return {
        label: "AVARIADO",
        className: "bg-amber-50 text-amber-700",
      };
    default:
      return {
        label: status.replaceAll("_", " "),
        className: "bg-slate-100 text-slate-600",
      };
  }
}

export default function EtiquetasVolumesClient({
  empresaNome,
  volumes,
  statusInicial = "TODOS",
  cargaIdInicial = null,
}: {
  empresaNome: string;
  volumes: VolumeEtiqueta[];
  statusInicial?: StatusFiltro;
  cargaIdInicial?: number | null;
}) {
  const [filtro, setFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] =
    useState<StatusFiltro>(statusInicial);
  const [selecionados, setSelecionados] =
    useState<Set<string>>(new Set());

  const contagens = useMemo(() => {
    const resultado: Record<StatusFiltro, number> = {
      TODOS: volumes.length,
      EM_CARGA: 0,
      DISPONIVEL: 0,
      ENTREGUE: 0,
      RETORNADO: 0,
      AVARIADO: 0,
      OUTROS: 0,
    };

    for (const volume of volumes) {
      if (volume.status === "EM_CARGA") resultado.EM_CARGA++;
      else if (volume.status === "DISPONIVEL") resultado.DISPONIVEL++;
      else if (volume.status === "ENTREGUE") resultado.ENTREGUE++;
      else if (volume.status === "RETORNADO") resultado.RETORNADO++;
      else if (volume.status === "AVARIADO") resultado.AVARIADO++;
      else resultado.OUTROS++;
    }

    return resultado;
  }, [volumes]);

  const filtrados = useMemo(() => {
    const termo = filtro.trim().toLowerCase();

    return volumes.filter((volume) => {
      if (statusFiltro === "OUTROS") {
        if (
          STATUS_CONHECIDOS.some(
            (status) => status === volume.status,
          )
        ) {
          return false;
        }
      } else if (
        statusFiltro !== "TODOS" &&
        volume.status !== statusFiltro
      ) {
        return false;
      }

      if (!termo) return true;

      return (
        volume.codigoVolume.toLowerCase().includes(termo) ||
        volume.tipoNome.toLowerCase().includes(termo) ||
        volume.tipoCodigo.toLowerCase().includes(termo) ||
        String(volume.cargaId ?? "").includes(termo)
      );
    });
  }, [volumes, filtro, statusFiltro]);

  const etiquetas = useMemo(
    () =>
      selecionados.size > 0
        ? filtrados.filter((volume) => selecionados.has(volume.id))
        : filtrados,
    [filtrados, selecionados],
  );

  function mudarStatus(novoStatus: StatusFiltro) {
    setStatusFiltro(novoStatus);
    setSelecionados(new Set());

    const params = new URLSearchParams();

    if (novoStatus !== "TODOS") {
      params.set("status", novoStatus);
    }

    if (cargaIdInicial) {
      params.set("carga", String(cargaIdInicial));
    }

    const query = params.toString();
    const url = query
      ? `/admin/volumes/etiquetas?${query}`
      : "/admin/volumes/etiquetas";

    window.history.replaceState(null, "", url);
  }

  function alternar(id: string) {
    setSelecionados((atual) => {
      const proximo = new Set(atual);

      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);

      return proximo;
    });
  }

  function selecionarTodos() {
    setSelecionados(new Set(filtrados.map((volume) => volume.id)));
  }

  function limparSelecao() {
    setSelecionados(new Set());
  }

  return (
    <main className="min-h-screen bg-[#eef5ef] px-4 py-6 text-[#142018] md:px-6 md:py-8">
      <style>{`
        @page {
          size: A4;
          margin: 8mm;
        }

        @media print {
          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .print-shell {
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .labels-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 4mm !important;
          }

          .volume-label {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 1px solid #111 !important;
            box-shadow: none !important;
            background: #fff !important;
          }
        }
      `}</style>

      <div className="print-shell mx-auto max-w-[1180px]">
        <header className="no-print flex items-center justify-between gap-4 rounded-[28px] bg-white px-5 py-4 shadow-[0_18px_55px_rgba(17,63,33,0.06)]">
          <div className="flex items-center gap-4">
            <Link
              href={
                cargaIdInicial
                  ? `/admin/cargas/${cargaIdInicial}`
                  : "/admin/volumes"
              }
              className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-[#176f3c]"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#b07a12]">
                Rastreabilidade
              </p>
              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Etiquetas QR
              </h1>
              {cargaIdInicial && (
                <p className="mt-1 text-[8px] font-black text-blue-600">
                  Carga #{cargaIdInicial}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={etiquetas.length === 0}
            className="flex h-11 items-center gap-2 rounded-[14px] bg-[#176f3c] px-5 text-[10px] font-black text-white disabled:opacity-40"
          >
            <Printer size={16} />
            Imprimir {etiquetas.length}
          </button>
        </header>

        <section className="no-print mt-5 overflow-hidden rounded-[32px] bg-[linear-gradient(145deg,#0d5c32,#1a8448)] p-7 text-white">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
            <Barcode size={16} />
            Identificação física
          </div>

          <h2 className="mt-4 text-[30px] font-black tracking-[-0.055em]">
            Imprima e cole<span className="text-[#f4b13f]">.</span>
          </h2>

          <p className="mt-2 max-w-2xl text-[10px] leading-5 text-white/65">
            Filtre pelo status operacional, selecione os volumes desejados e imprima somente as etiquetas necessárias.
          </p>
        </section>

        {cargaIdInicial && (
          <section className="no-print mt-5 flex flex-col gap-3 rounded-[22px] border border-blue-100 bg-blue-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-blue-600">
                Impressão direcionada
              </p>
              <p className="mt-1 text-[12px] font-black text-slate-800">
                Carga #{cargaIdInicial}
              </p>
              <p className="mt-1 text-[8px] text-slate-500">
                Esta tela está mostrando somente os volumes vinculados a esta carga.
              </p>
            </div>

            <Link
              href="/admin/volumes/etiquetas"
              className="text-[8px] font-black text-blue-700 underline underline-offset-2"
            >
              Ver todas as etiquetas
            </Link>
          </section>
        )}

        <section className="no-print mt-5 rounded-[26px] bg-white p-5 shadow-[0_18px_55px_rgba(17,63,33,0.05)]">
          <div className="grid gap-3 lg:grid-cols-[1fr_230px_auto_auto]">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={filtro}
                onChange={(event) => setFiltro(event.target.value)}
                placeholder="Buscar código, cesta ou carga..."
                className="h-[48px] w-full rounded-[15px] border border-slate-200 pl-11 pr-4 text-[11px] font-semibold outline-none focus:border-emerald-400"
              />
            </div>

            <select
              value={statusFiltro}
              onChange={(event) =>
                mudarStatus(event.target.value as StatusFiltro)
              }
              className="h-[48px] rounded-[15px] border border-slate-200 bg-white px-4 text-[9px] font-black outline-none focus:border-emerald-400"
            >
              {OPCOES_STATUS.map((status) => (
                <option key={status} value={status}>
                  {labelStatus(status)} ({contagens[status]})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={selecionarTodos}
              disabled={filtrados.length === 0}
              className="h-[48px] rounded-[15px] border border-emerald-100 bg-emerald-50 px-4 text-[9px] font-black text-emerald-800 disabled:opacity-40"
            >
              Selecionar todos
            </button>

            <button
              type="button"
              onClick={limparSelecao}
              className="h-[48px] rounded-[15px] border border-slate-200 bg-white px-4 text-[9px] font-black text-slate-500"
            >
              Limpar
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {OPCOES_STATUS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => mudarStatus(status)}
                className={`rounded-full border px-3 py-2 text-[8px] font-black transition ${
                  statusFiltro === status
                    ? "border-emerald-700 bg-[#176f3c] text-white"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                {labelStatus(status)} {contagens[status]}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
                Filtro atual
              </p>
              <p className="mt-1 text-[11px] font-black text-[#176f3c]">
                {labelStatus(statusFiltro)}
              </p>
            </div>

            <p className="text-[9px] text-slate-400">
              {filtrados.length} volume(s) encontrados • {" "}
              {selecionados.size > 0
                ? `${selecionados.size} selecionado(s)`
                : "sem seleção = imprime todos os filtrados"}
            </p>
          </div>
        </section>

        {filtrados.length === 0 ? (
          <section className="mt-5 rounded-[28px] bg-white p-12 text-center shadow-sm">
            <Barcode size={30} className="mx-auto text-slate-300" />
            <p className="mt-3 text-[12px] font-black">
              Nenhuma etiqueta encontrada
            </p>
            <p className="mt-2 text-[9px] text-slate-400">
              Não existem volumes no filtro <strong>{labelStatus(statusFiltro)}</strong>.
            </p>
          </section>
        ) : (
          <section className="labels-grid mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {etiquetas.map((volume) => {
              const visual = statusVisual(volume.status);

              return (
                <article
                  key={volume.id}
                  className="volume-label relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(17,63,33,0.06)]"
                >
                  <button
                    type="button"
                    onClick={() => alternar(volume.id)}
                    className={`no-print absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border ${
                      selecionados.has(volume.id)
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-200 bg-white text-transparent"
                    }`}
                  >
                    <Check size={15} />
                  </button>

                  <div className="flex items-center justify-between gap-3 pr-8">
                    <div>
                      <p className="text-[7px] font-black uppercase tracking-[0.18em] text-emerald-700">
                        {empresaNome}
                      </p>
                      <p className="mt-1 text-[11px] font-black">
                        {volume.tipoNome}
                      </p>
                      <p className="mt-0.5 text-[8px] font-bold text-slate-400">
                        {volume.tipoCodigo}
                      </p>
                      {volume.cargaId && (
                        <p className="mt-1 text-[7px] font-black text-blue-600">
                          Carga #{volume.cargaId}
                        </p>
                      )}
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-[6px] font-black uppercase ${visual.className}`}
                    >
                      {visual.label}
                    </span>
                  </div>

                  <div className="mt-5 flex justify-center rounded-[18px] bg-white p-2">
                    <QRCodeSVG
                      value={volume.codigoVolume}
                      size={145}
                      level="M"
                      marginSize={1}
                    />
                  </div>

                  <div className="mt-4 text-center">
                    <p className="break-all font-mono text-[11px] font-black tracking-[0.04em]">
                      {volume.codigoVolume}
                    </p>
                    <p className="mt-2 text-[7px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      1 volume = 1 cesta física
                    </p>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
