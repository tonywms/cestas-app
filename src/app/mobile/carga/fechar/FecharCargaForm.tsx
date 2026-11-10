"use client";

// V61_AVARIA_RASTREAVEL - motivo obrigatorio, UX e dupla validacao.
// V61_3_MODAL_API_FLOW - confirmacao e resultado permanecem no cliente; fechamento via API autenticada.

import {
  AlertTriangle,
  CheckCircle2,
  Minus,
  PackageCheck,
  Plus,
  RotateCcw,
  Save,
  XCircle,
} from "lucide-react";

import Link from "next/link";
import { createPortal } from "react-dom";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type FecharCargaState,
} from "./actions";

type Item = {
  id: number;
  nome: string;
  codigo: string;
  saldo: number;
  tipoCestaId: number;
};

type VolumeEmPosse = {
  id: string;
  codigoVolume: string;
  tipoCestaId: number;
};

const initialState:
  FecharCargaState = {
    success: false,
    message: "",
    totalEmPosse: 0,
    totalRetornado: 0,
    totalAvariado: 0,
  };

export default function FecharCargaForm({
  cargaId,
  cargaCodigo,
  itens,
  modoVolume,
  volumesEmPosse,
}: {
  cargaId: number;
  cargaCodigo: string;
  itens: Item[];
  modoVolume: boolean;
  volumesEmPosse: VolumeEmPosse[];
}) {
  const [
    state,
    setState,
  ] =
    useState<FecharCargaState>(
      initialState,
    );

  const [
    pending,
    setPending,
  ] =
    useState(false);

  const [
    modal,
    setModal,
  ] =
    useState(false);

  const [
    confirmacaoAberta,
    setConfirmacaoAberta,
  ] =
    useState(false);

  const formRef =
    useRef<HTMLFormElement>(null);

  const [
    avarias,
    setAvarias,
  ] =
    useState<
      Record<
        number,
        number
      >
    >(
      Object.fromEntries(
        itens.map(
          (item) => [
            item.id,
            0,
          ],
        ),
      ),
    );

  const [
    motivoAvaria,
    setMotivoAvaria,
  ] =
    useState("");

  const [
    volumesAvariados,
    setVolumesAvariados,
  ] =
    useState<string[]>([]);

  const [
    codigoVolumeAvaria,
    setCodigoVolumeAvaria,
  ] =
    useState("");

  const [
    erroVolumeAvaria,
    setErroVolumeAvaria,
  ] =
    useState("");

  // O modal somente abre apos resposta desta tentativa de fechamento.
  // Nao reutilizar respostas de uma carga anterior ao trocar de carga.

  const totalEmPosse =
    useMemo(
      () =>
        itens.reduce(
          (
            total,
            item,
          ) =>
            total +
            item.saldo,
          0,
        ),
      [
        itens,
      ],
    );

  const totalAvaria =
    useMemo(
      () =>
        Object.values(
          avarias,
        ).reduce(
          (
            total,
            valor,
          ) =>
            total +
            valor,
          0,
        ),
      [
        avarias,
      ],
    );

  const volumesAvariadosDetalhes =
    useMemo(
      () =>
        volumesEmPosse.filter(
          (volume) =>
            volumesAvariados.includes(
              volume.id,
            ),
        ),
      [
        volumesAvariados,
        volumesEmPosse,
      ],
    );

  const identificacaoVolumeValida =
    !modoVolume ||
    volumesAvariados.length ===
      totalAvaria;

  const motivoAvariaValido =
    totalAvaria === 0 ||
    motivoAvaria.trim().length >= 8;

  const totalRetorno =
    Math.max(
      0,
      totalEmPosse -
        totalAvaria,
    );

  function alterarAvaria(
    item: Item,
    valor: number,
  ) {
    const normalizado =
      Math.min(
        item.saldo,
        Math.max(
          0,
          Number.isFinite(
            valor,
          )
            ? Math.trunc(
                valor,
              )
            : 0,
        ),
      );

    setAvarias(
      (atual) => ({
        ...atual,
        [item.id]:
          normalizado,
      }),
    );
  }

  function aplicarVolumesAvariados(
    proximosIds: string[],
  ) {
    const proximos =
      Array.from(
        new Set(
          proximosIds,
        ),
      );

    setVolumesAvariados(
      proximos,
    );

    const proximasAvarias =
      Object.fromEntries(
        itens.map(
          (item) => [
            item.id,
            volumesEmPosse.filter(
              (volume) =>
                volume.tipoCestaId ===
                  item.tipoCestaId &&
                proximos.includes(
                  volume.id,
                ),
            ).length,
          ],
        ),
      );

    setAvarias(
      proximasAvarias,
    );
  }

  function alternarVolumeAvaria(
    volumeId: string,
  ) {
    const selecionado =
      volumesAvariados.includes(
        volumeId,
      );

    aplicarVolumesAvariados(
      selecionado
        ? volumesAvariados.filter(
            (id) =>
              id !==
              volumeId,
          )
        : [
            ...volumesAvariados,
            volumeId,
          ],
    );

    setErroVolumeAvaria("");
  }

  function biparVolumeAvariado() {
    const codigo =
      codigoVolumeAvaria
        .trim()
        .toLocaleUpperCase(
          "pt-BR",
        );

    if (!codigo) {
      return;
    }

    const volume =
      volumesEmPosse.find(
        (item) =>
          item.codigoVolume
            .trim()
            .toLocaleUpperCase(
              "pt-BR",
            ) === codigo,
      );

    if (!volume) {
      setErroVolumeAvaria(
        `O volume ${codigo} não está em posse da carga nº ${cargaId} (${cargaCodigo}). Confira a etiqueta. Nenhuma avaria foi registrada.`,
      );
      return;
    }

    if (
      volumesAvariados.includes(
        volume.id,
      )
    ) {
      setErroVolumeAvaria(
        "Este volume já está marcado como avariado.",
      );
      setCodigoVolumeAvaria(
        "",
      );
      return;
    }

    aplicarVolumesAvariados([
      ...volumesAvariados,
      volume.id,
    ]);

    setCodigoVolumeAvaria(
      "",
    );
    setErroVolumeAvaria(
      "",
    );
  }

  function zerarAvarias() {
    setAvarias(
      Object.fromEntries(
        itens.map(
          (item) => [
            item.id,
            0,
          ],
        ),
      ),
    );
    setMotivoAvaria("");
    setVolumesAvariados([]);
    setCodigoVolumeAvaria("");
    setErroVolumeAvaria("");
  }

  async function executarFechamento() {
    if (
      !formRef.current ||
      pending ||
      !motivoAvariaValido ||
      !identificacaoVolumeValida
    ) {
      return;
    }

    setPending(true);

    try {
      const formData =
        new FormData(
          formRef.current,
        );

      const response =
        await fetch(
          "/api/mobile/carga/fechar",
          {
            method: "POST",
            body: formData,
          },
        );

      if (!response.ok) {
        throw new Error("Falha de comunicacao com o servidor");
      }

      const resultado =
        (await response.json()) as
          FecharCargaState;

      // A resposta positiva precisa pertencer precisamente a esta carga.
      // Uma resposta sem identificador ou de outra carga NUNCA vira sucesso.
      if (
        resultado.success &&
        resultado.cargaId !== cargaId
      ) {
        setState({
          success: false,
          message: "Não foi possível confirmar a identidade da carga finalizada. Consulte Minha Carga antes de repetir a operação.",
          totalEmPosse: 0,
          totalRetornado: 0,
          totalAvariado: 0,
        });
      } else {
        setState(resultado);
      }
      setConfirmacaoAberta(false);
      setModal(true);
    } catch (error) {
      console.error(
        "Erro ao finalizar carga pela API:",
        error,
      );

      setState({
        success: false,
        message:
          "Não foi possível finalizar a carga agora. Nenhuma movimentação foi confirmada. Tente novamente.",
        totalEmPosse,
        totalRetornado: 0,
        totalAvariado: 0,
      });
      setConfirmacaoAberta(false);
      setModal(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="sticky top-0 z-30 -mx-1 mb-3 rounded-[16px] border border-emerald-200 bg-white/95 px-4 py-3 shadow-[0_9px_25px_rgba(15,75,40,0.14)] backdrop-blur-md" aria-label="Identificação da carga em fechamento">
        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-emerald-700">Conferência da carga atual</p>
        <p className="mt-1 text-[16px] font-black text-slate-900">Carga nº {cargaId}</p>
        <p className="break-all text-[10px] font-semibold text-slate-600">{cargaCodigo}</p>
      </div>
      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();

          if (
            pending ||
            !motivoAvariaValido ||
            !identificacaoVolumeValida
          ) {
            return;
          }

          setConfirmacaoAberta(true);
        }}
        className="space-y-4"
      >

        <input
          type="hidden"
          name="carga_id"
          value={
            cargaId
          }
        />
        <input
          type="hidden"
          name="volumes_avariados"
          value={
            JSON.stringify(
              volumesAvariados,
            )
          }
        />


        <section className="rounded-[22px] border border-black/[0.04] bg-white p-4 shadow-[0_14px_36px_rgba(17,63,33,0.06)]">

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#b07a12]">
                Classificação física
              </p>
              <h2 className="mt-1 text-[16px] font-black">
                O que voltou?
              </h2>
              <p className="mt-1 text-[8px] leading-4 text-slate-400">
                Por padrão tudo retorna ao estoque. Ajuste somente se houver avaria.
              </p>
            </div>

            {totalAvaria > 0 && (
              <button
                type="button"
                onClick={
                  zerarAvarias
                }
                className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[8px] font-black text-emerald-700"
              >
                Sem avaria
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Resumo
              label="Em posse"
              valor={
                totalEmPosse
              }
              tipo="neutro"
            />
            <Resumo
              label="Retorno"
              valor={
                totalRetorno
              }
              tipo="retorno"
            />
            <Resumo
              label="Avaria"
              valor={
                totalAvaria
              }
              tipo="avaria"
            />
          </div>

        </section>

        {modoVolume &&
          totalEmPosse > 0 && (
            <section className="rounded-[20px] border border-amber-200 bg-white p-4 shadow-[0_12px_30px_rgba(120,78,12,0.06)]">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={18}
                  className="mt-0.5 shrink-0 text-amber-700"
                />
                <div>
                  <p className="text-[10px] font-black text-slate-800">
                    Identifique somente os volumes avariados
                  </p>
                  <p className="mt-1 text-[9px] leading-4 text-slate-500">
                    Bipe ou digite o código físico de cada avaria. Todo volume não marcado continuará como retorno ao estoque central.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  value={
                    codigoVolumeAvaria
                  }
                  onChange={(
                    event,
                  ) =>
                    setCodigoVolumeAvaria(
                      event.target.value,
                    )
                  }
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      event.preventDefault();
                      biparVolumeAvariado();
                    }
                  }}
                  placeholder="Bipe o volume avariado"
                  className="h-11 min-w-0 flex-1 rounded-[14px] border border-slate-200 bg-slate-50 px-3 text-[10px] font-bold uppercase outline-none transition focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={
                    biparVolumeAvariado
                  }
                  className="h-11 shrink-0 rounded-[14px] bg-amber-600 px-4 text-[9px] font-black text-white"
                >
                  Marcar
                </button>
              </div>

              {erroVolumeAvaria && (
                <p className="mt-2 text-[8px] font-bold text-red-600">
                  {erroVolumeAvaria}
                </p>
              )}

              <div className="mt-4 space-y-2">
                {volumesEmPosse.map(
                  (volume) => {
                    const marcado =
                      volumesAvariados.includes(
                        volume.id,
                      );

                    return (
                      <button
                        key={
                          volume.id
                        }
                        type="button"
                        onClick={() =>
                          alternarVolumeAvaria(
                            volume.id,
                          )
                        }
                        className={`flex w-full items-center justify-between rounded-[14px] border px-3 py-3 text-left transition ${
                          marcado
                            ? "border-amber-300 bg-amber-50"
                            : "border-emerald-100 bg-emerald-50/60"
                        }`}
                      >
                        <div>
                          <p className="text-[10px] font-black text-slate-800">
                            {volume.codigoVolume}
                          </p>
                          <p className={`mt-1 text-[7px] font-black uppercase tracking-[0.1em] ${
                            marcado
                              ? "text-amber-700"
                              : "text-emerald-700"
                          }`}>
                            {marcado
                              ? "AVARIADO — não volta ao estoque"
                              : "RETORNO — volta ao estoque central"}
                          </p>
                        </div>

                        <span className={`rounded-full px-2.5 py-1 text-[7px] font-black ${
                          marcado
                            ? "bg-amber-200 text-amber-900"
                            : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {marcado
                            ? "AVARIA"
                            : "RETORNO"}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </section>
          )}

        {itens
          .filter(
            (item) =>
              item.saldo > 0,
          )
          .map(
            (item) => {
              const avaria =
                avarias[
                  item.id
                ] ?? 0;

              const retorno =
                item.saldo -
                avaria;

              return (
                <section
                  key={
                    item.id
                  }
                  className="rounded-[20px] border border-black/[0.04] bg-white p-4 shadow-[0_12px_30px_rgba(17,63,33,0.05)]"
                >

                  <input
                    type="hidden"
                    name={`avaria_${item.id}`}
                    value={
                      avaria
                    }
                  />

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-black">
                        {item.nome}
                      </p>
                      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
                        {item.codigo}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-[8px] font-black text-slate-600">
                      {item.saldo} em posse
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
                    <div className="rounded-[16px] border border-emerald-100 bg-emerald-50 px-4 py-3">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <RotateCcw
                          size={14}
                        />
                        <p className="text-[7px] font-black uppercase tracking-[0.11em]">
                          Retorno ao central
                        </p>
                      </div>
                      <p className="mt-2 text-[20px] font-black text-[#176f3c]">
                        {retorno}
                      </p>
                    </div>

                    <div className="min-w-[132px] rounded-[16px] border border-amber-200 bg-amber-50 px-3 py-3">
                      <div className="flex items-center gap-1.5 text-amber-700">
                        <AlertTriangle
                          size={13}
                        />
                        <p className="text-[7px] font-black uppercase tracking-[0.1em]">
                          Avaria
                        </p>
                      </div>

                      {modoVolume ? (
                        <div className="mt-2">
                          <p className="text-center text-[20px] font-black text-amber-800">
                            {avaria}
                          </p>
                          <p className="mt-1 text-center text-[7px] font-bold leading-3 text-amber-700/70">
                            definido pelos volumes identificados
                          </p>
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            aria-label="Diminuir avaria"
                            onClick={() =>
                              alterarAvaria(
                                item,
                                avaria - 1,
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-amber-200 bg-white text-amber-700 disabled:opacity-30"
                            disabled={
                              avaria <= 0
                            }
                          >
                            <Minus
                              size={14}
                            />
                          </button>

                          <input
                            type="number"
                            min={0}
                            max={
                              item.saldo
                            }
                            step={1}
                            value={
                              avaria
                            }
                            onChange={(
                              event,
                            ) =>
                              alterarAvaria(
                                item,
                                Number(
                                  event.target.value,
                                ),
                              )
                            }
                            className="h-8 w-10 bg-transparent text-center text-[16px] font-black text-amber-800 outline-none"
                          />

                          <button
                            type="button"
                            aria-label="Aumentar avaria"
                            onClick={() =>
                              alterarAvaria(
                                item,
                                avaria + 1,
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-amber-200 bg-white text-amber-700 disabled:opacity-30"
                            disabled={
                              avaria >=
                              item.saldo
                            }
                          >
                            <Plus
                              size={14}
                            />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                </section>
              );
            },
          )}

        {totalAvaria > 0 && (
          <section className="rounded-[20px] border border-amber-200 bg-amber-50 p-4 shadow-[0_12px_30px_rgba(120,78,12,0.06)]">
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0 text-amber-700"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-black uppercase tracking-[0.12em] text-amber-700/70">
                  Rastreabilidade obrigatória
                </p>
                <h3 className="mt-1 text-[13px] font-black text-amber-900">
                  Informe o motivo da avaria
                </h3>
                <p className="mt-1 text-[8px] leading-4 text-amber-800/70">
                  A justificativa ficará vinculada à movimentação de estoque e à auditoria da carga.
                </p>

                <textarea
                  name="motivo_avaria"
                  value={motivoAvaria}
                  onChange={(event) =>
                    setMotivoAvaria(
                      event.target.value.slice(
                        0,
                        500,
                      ),
                    )
                  }
                  minLength={8}
                  maxLength={500}
                  required
                  rows={3}
                  placeholder="Ex.: embalagem rompida durante transporte, produto molhado..."
                  className="mt-3 w-full resize-none rounded-[15px] border border-amber-200 bg-white px-3 py-3 text-[10px] font-semibold leading-5 text-slate-700 outline-none transition focus:border-amber-400"
                />

                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className={`text-[8px] font-bold ${
                    motivoAvariaValido
                      ? "text-emerald-700"
                      : "text-amber-700"
                  }`}>
                    {motivoAvariaValido
                      ? "Justificativa pronta para auditoria."
                      : "Informe pelo menos 8 caracteres."}
                  </p>
                  <span className="text-[8px] font-black text-amber-700/60">
                    {motivoAvaria.length}/500
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {totalEmPosse === 0 && (
          <section className="rounded-[20px] border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <PackageCheck
                size={20}
                className="shrink-0 text-emerald-700"
              />
              <div>
                <p className="text-[11px] font-black text-emerald-800">
                  Nenhuma cesta em posse
                </p>
                <p className="mt-1 text-[9px] leading-4 text-emerald-700/80">
                  Toda a carga já foi entregue, retornada ou classificada. Basta confirmar o fechamento.
                </p>
              </div>
            </div>
          </section>
        )}

        <button
          type="submit"
          disabled={
            pending ||
            !motivoAvariaValido ||
            !identificacaoVolumeValida
          }
          className="flex h-[54px] w-full items-center justify-center gap-2 rounded-[17px] bg-[linear-gradient(135deg,#1f8a4c,#0d5d31)] text-[11px] font-black text-white shadow-[0_14px_30px_rgba(23,111,60,0.22)] transition active:scale-[0.985] disabled:opacity-40"
        >
          <Save
            size={17}
          />

          {pending
            ? "Finalizando carga..."
            : totalAvaria > 0 &&
                !motivoAvariaValido
              ? "Informe o motivo da avaria"
              : totalEmPosse > 0
                ? `Revisar ${totalRetorno} retorno(s), ${totalAvaria} avaria(s) antes de finalizar`
                : "Revisar e finalizar carga"}
        </button>

        <p className="px-4 text-center text-[8px] leading-4 text-slate-400">
          Retornos voltam ao estoque central. Avarias permanecem registradas no histórico e não retornam ao saldo disponível.
        </p>

      </form>

      {confirmacaoAberta && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#07150d]/60 p-4 backdrop-blur-[7px]">
          <div role="dialog" aria-modal="true" aria-label="Confirmacao operacional de fechamento de carga" className="max-h-[90dvh] w-full max-w-[390px] overflow-y-auto rounded-[30px] bg-white p-7 shadow-[0_30px_100px_rgba(15,50,30,0.30)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle size={31} />
            </div>

            <p className="mt-5 text-center text-[9px] font-black uppercase tracking-[0.2em] text-amber-700/70">
              Confirmação operacional
            </p>
            <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-center" aria-label="Carga que será finalizada">
              <p className="text-[13px] font-black text-emerald-900">Carga nº {cargaId}</p>
              <p className="break-all text-[9px] font-semibold text-emerald-800">{cargaCodigo}</p>
            </div>
            <h3 className="mt-2 text-center text-[20px] font-black">
              Finalizar esta carga?
            </h3>
            <p className="mt-3 text-center text-[11px] leading-5 text-slate-500">
              Confira os números abaixo. Depois de confirmar, retornos e avarias serão gravados definitivamente.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <ModalResumo label="Em posse" valor={totalEmPosse} />
              <ModalResumo label="Retorno" valor={totalRetorno} />
              <ModalResumo label="Avaria" valor={totalAvaria} />
            </div>

            {modoVolume &&
              volumesAvariadosDetalhes.length >
                0 && (
                <div className="mt-4 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-[8px] font-black uppercase tracking-[0.12em] text-amber-700/70">
                    Volumes avariados — não retornam ao estoque
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {volumesAvariadosDetalhes.map(
                      (volume) => (
                        <span
                          key={
                            volume.id
                          }
                          className="rounded-full bg-amber-200 px-2.5 py-1 text-[8px] font-black text-amber-900"
                        >
                          {volume.codigoVolume}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

            {totalAvaria > 0 && (
              <div className="mt-4 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-[8px] font-black uppercase tracking-[0.12em] text-amber-700/70">
                  Motivo da avaria
                </p>
                <p className="mt-2 text-[10px] font-semibold leading-5 text-amber-900">
                  {motivoAvaria.trim()}
                </p>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={executarFechamento}
                disabled={pending}
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#176f3c] text-xs font-black text-white disabled:opacity-50"
              >
                <Save size={16} />
                {pending
                  ? "Finalizando carga..."
                  : "Confirmar e finalizar carga"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setConfirmacaoAberta(false)
                }
                disabled={pending}
                className="h-[48px] w-full rounded-[16px] border border-slate-200 bg-white text-[11px] font-black text-slate-600 disabled:opacity-50"
              >
                Voltar e revisar
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {modal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">

          <div role="dialog" aria-modal="true" aria-label="Resultado do fechamento de carga" className="max-h-[90dvh] w-full max-w-[390px] overflow-y-auto rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.28)]">

            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
              state.success
                ? "bg-emerald-100 text-emerald-600"
                : "bg-red-100 text-red-600"
            }`}>
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

            <div className="mt-4 rounded-xl bg-emerald-50 px-3 py-2" aria-label="Identificação da carga no resultado">
              <p className="text-[13px] font-black text-emerald-900">Carga nº {cargaId}</p>
              <p className="mt-0.5 break-all text-[9px] font-semibold text-emerald-800">{cargaCodigo}</p>
            </div>

            <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
              {state.success
                ? "Fechamento concluído"
                : "Carga não finalizada"}
            </p>

            <h3 className="mt-2 text-[20px] font-black">
              {state.success
                ? "Carga finalizada"
                : "Resolva a pendência"}
            </h3>

            <p className="mt-3 text-[11px] leading-5 text-slate-500">
              {state.message}
            </p>

            {state.success && (
              <div className="mt-5 grid grid-cols-3 gap-2">
                <ModalResumo
                  label="Em posse"
                  valor={
                    state.totalEmPosse
                  }
                />
                <ModalResumo
                  label="Retorno"
                  valor={
                    state.totalRetornado
                  }
                />
                <ModalResumo
                  label="Avaria"
                  valor={
                    state.totalAvariado
                  }
                />
              </div>
            )}

            {state.success ? (
              <Link
                href="/mobile"
                replace
                className="mt-6 flex h-[52px] w-full items-center justify-center rounded-[16px] bg-[#176f3c] text-xs font-black text-white"
              >
                Concluir jornada
              </Link>
            ) : state.nextHref ? (
              <div className="mt-6 space-y-3">
                <Link
                  href={
                    state.nextHref
                  }
                  replace
                  className="flex h-[52px] w-full items-center justify-center rounded-[16px] bg-[#176f3c] text-xs font-black text-white"
                >
                  {state.nextLabel ??
                    "Resolver pendência"}
                </Link>

                <button
                  type="button"
                  onClick={() =>
                    setModal(false)
                  }
                  className="h-[48px] w-full rounded-[16px] border border-emerald-100 bg-white text-[11px] font-black text-[#176f3c]"
                >
                  Voltar ao fechamento
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setModal(false)
                }
                className="mt-6 h-[50px] w-full rounded-[16px] bg-[#176f3c] text-xs font-black text-white"
              >
                Corrigir conferência
              </button>
            )}

          </div>

        </div>,
        document.body,
      )}
    </>
  );
}

function Resumo({
  label,
  valor,
  tipo,
}: {
  label: string;
  valor: number;
  tipo:
    | "neutro"
    | "retorno"
    | "avaria";
}) {
  const classe =
    tipo ===
    "retorno"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : tipo ===
          "avaria"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-100 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-[14px] border px-3 py-3 ${classe}`}>
      <p className="text-[7px] font-black uppercase tracking-[0.1em] opacity-70">
        {label}
      </p>
      <p className="mt-1 text-[18px] font-black">
        {valor}
      </p>
    </div>
  );
}

function ModalResumo({
  label,
  valor,
}: {
  label: string;
  valor: number;
}) {
  return (
    <div className="rounded-[16px] bg-slate-50 p-3">
      <p className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-[18px] font-black">
        {valor}
      </p>
    </div>
  );
}