"use client";

import {
  ArrowLeft,
  Barcode,
  Check,
  Printer,
  Search,
} from "lucide-react";

import Link from "next/link";

import {
  QRCodeSVG,
} from "qrcode.react";

import {
  useMemo,
  useState,
} from "react";

type VolumeEtiqueta = {
  id: number;
  codigoVolume: string;
  status: string;
  cargaId: number | null;
  tipoNome: string;
  tipoCodigo: string;
};

export default function EtiquetasVolumesClient({
  empresaNome,
  volumes,
}: {
  empresaNome: string;
  volumes: VolumeEtiqueta[];
}) {
  const [
    filtro,
    setFiltro,
  ] =
    useState("");

  const [
    somenteDisponiveis,
    setSomenteDisponiveis,
  ] =
    useState(true);

  const [
    selecionados,
    setSelecionados,
  ] =
    useState<Set<number>>(
      new Set(),
    );

  const filtrados =
    useMemo(
      () => {
        const termo =
          filtro
            .trim()
            .toLowerCase();

        return volumes.filter(
          (volume) => {
            if (
              somenteDisponiveis &&
              volume.status !==
                "DISPONIVEL"
            ) {
              return false;
            }

            if (!termo) {
              return true;
            }

            return (
              volume.codigoVolume
                .toLowerCase()
                .includes(
                  termo,
                ) ||
              volume.tipoNome
                .toLowerCase()
                .includes(
                  termo,
                ) ||
              volume.tipoCodigo
                .toLowerCase()
                .includes(
                  termo,
                )
            );
          },
        );
      },
      [
        volumes,
        filtro,
        somenteDisponiveis,
      ],
    );

  const etiquetas =
    useMemo(
      () =>
        selecionados.size >
        0
          ? filtrados.filter(
              (volume) =>
                selecionados.has(
                  volume.id,
                ),
            )
          : filtrados,
      [
        filtrados,
        selecionados,
      ],
    );

  function alternar(
    id: number,
  ) {
    setSelecionados(
      (atual) => {
        const proximo =
          new Set(
            atual,
          );

        if (
          proximo.has(
            id,
          )
        ) {
          proximo.delete(
            id,
          );
        } else {
          proximo.add(
            id,
          );
        }

        return proximo;
      },
    );
  }

  function selecionarTodos() {
    setSelecionados(
      new Set(
        filtrados.map(
          (volume) =>
            volume.id,
        ),
      ),
    );
  }

  function limparSelecao() {
    setSelecionados(
      new Set(),
    );
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
              href="/admin/volumes"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-[#176f3c]"
            >
              <ArrowLeft
                size={19}
              />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#b07a12]">
                Rastreabilidade
              </p>

              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Etiquetas QR
              </h1>
            </div>

          </div>

          <button
            type="button"
            onClick={() =>
              window.print()
            }
            disabled={
              etiquetas.length ===
              0
            }
            className="flex h-11 items-center gap-2 rounded-[14px] bg-[#176f3c] px-5 text-[10px] font-black text-white disabled:opacity-40"
          >
            <Printer
              size={16}
            />

            Imprimir {etiquetas.length}
          </button>

        </header>

        <section className="no-print mt-5 overflow-hidden rounded-[32px] bg-[linear-gradient(145deg,#0d5c32,#1a8448)] p-7 text-white">

          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
            <Barcode
              size={16}
            />
            Identificação física
          </div>

          <h2 className="mt-4 text-[30px] font-black tracking-[-0.055em]">
            Imprima e cole
            <span className="text-[#f4b13f]">
              .
            </span>
          </h2>

          <p className="mt-2 max-w-2xl text-[10px] leading-5 text-white/65">
            O QR contém exatamente o código que o aplicativo espera receber na bipagem.
          </p>

        </section>

        <section className="no-print mt-5 rounded-[26px] bg-white p-5 shadow-[0_18px_55px_rgba(17,63,33,0.05)]">

          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">

            <div className="relative">

              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={
                  filtro
                }
                onChange={(event) =>
                  setFiltro(
                    event.target.value,
                  )
                }
                placeholder="Buscar código ou cesta..."
                className="h-[48px] w-full rounded-[15px] border border-slate-200 pl-11 pr-4 text-[11px] font-semibold outline-none focus:border-emerald-400"
              />

            </div>

            <label className="flex h-[48px] cursor-pointer items-center gap-2 rounded-[15px] border border-slate-200 px-4 text-[9px] font-black">

              <input
                type="checkbox"
                checked={
                  somenteDisponiveis
                }
                onChange={(event) =>
                  setSomenteDisponiveis(
                    event.target.checked,
                  )
                }
              />

              Somente disponíveis
            </label>

            <button
              type="button"
              onClick={
                selecionarTodos
              }
              className="h-[48px] rounded-[15px] border border-emerald-100 bg-emerald-50 px-4 text-[9px] font-black text-emerald-800"
            >
              Selecionar todos
            </button>

            <button
              type="button"
              onClick={
                limparSelecao
              }
              className="h-[48px] rounded-[15px] border border-slate-200 bg-white px-4 text-[9px] font-black text-slate-500"
            >
              Limpar
            </button>

          </div>

          <p className="mt-3 text-[9px] text-slate-400">
            {filtrados.length} volume(s) encontrados •{" "}
            {selecionados.size > 0
              ? `${selecionados.size} selecionado(s)`
              : "nenhuma seleção = imprime todos os filtrados"}
          </p>

        </section>

        {filtrados.length ===
        0 ? (
          <section className="mt-5 rounded-[28px] bg-white p-12 text-center shadow-sm">

            <Barcode
              size={30}
              className="mx-auto text-slate-300"
            />

            <p className="mt-3 text-[12px] font-black">
              Nenhuma etiqueta encontrada
            </p>

          </section>
        ) : (
          <section className="labels-grid mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {etiquetas.map(
              (
                volume,
              ) => (
                <article
                  key={
                    volume.id
                  }
                  className="volume-label relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(17,63,33,0.06)]"
                >

                  <button
                    type="button"
                    onClick={() =>
                      alternar(
                        volume.id,
                      )
                    }
                    className={`no-print absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border ${
                      selecionados.has(
                        volume.id,
                      )
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-200 bg-white text-transparent"
                    }`}
                  >
                    <Check
                      size={15}
                    />
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
                    </div>

                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[6px] font-black uppercase text-emerald-700">
                      {volume.status}
                    </span>

                  </div>

                  <div className="mt-5 flex justify-center rounded-[18px] bg-white p-2">
                    <QRCodeSVG
                      value={
                        volume.codigoVolume
                      }
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
              ),
            )}

          </section>
        )}

      </div>

    </main>
  );
}
