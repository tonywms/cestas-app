"use client";

import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  MapPin,
  PackageOpen,
  Route,
  Truck,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export type RotaCardItem = {
  id: number;
  codigo: string;
  data: string;
  entregador: string;
  status: string;
  statusLabel: string;
  origem: string;
  carga: string;
  observacao: string;
  inicio: string;
  fim: string;
  duracao: string;
  paradas: number;
  entregues: number;
  ausentes: number;
  pendentes: number;
  taxa: number;
  clientes: Array<{
    sequencia: number;
    cliente: string;
    codigoCliente: string;
    status: string;
    bairro: string;
    cidade: string;
    atendidoEm: string;
    observacao: string;
  }>;
};

function classeStatus(status: string) {
  if (status === "FINALIZADA") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "EM_ROTA") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "PLANEJADA") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "CANCELADA") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function classeParada(status: string) {
  if (status === "ENTREGUE") return "bg-emerald-50 text-emerald-700";
  if (status === "AUSENTE") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

export default function RotasCardsClient({ rotas }: { rotas: RotaCardItem[] }) {
  const [limite, setLimite] = useState(20);
  const [selecionada, setSelecionada] = useState<RotaCardItem | null>(null);
  const [montado, setMontado] = useState(false);

  const exibidas = useMemo(() => rotas.slice(0, limite), [rotas, limite]);
  const temMais = limite < rotas.length;

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    if (!selecionada) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;

    const bodyPosition = body.style.position;
    const bodyTop = body.style.top;
    const bodyWidth = body.style.width;
    const bodyOverflow = body.style.overflow;
    const htmlOverflow = html.style.overflow;

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelecionada(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);

      body.style.position = bodyPosition;
      body.style.top = bodyTop;
      body.style.width = bodyWidth;
      body.style.overflow = bodyOverflow;
      html.style.overflow = htmlOverflow;

      window.scrollTo(0, scrollY);
    };
  }, [selecionada]);

  const modal =
    montado && selecionada
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-label={`Detalhes da rota ${selecionada.codigo}`}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelecionada(null);
              }
            }}
          >
            <div
              className="my-auto max-h-[calc(100vh-32px)] w-full max-w-[860px] overflow-y-auto rounded-[28px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.22)]"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">Detalhes da rota</p>
                    <span className={`rounded-full border px-2.5 py-1 text-[7px] font-black uppercase ${classeStatus(selecionada.status)}`}>
                      {selecionada.statusLabel}
                    </span>
                  </div>
                  <h3 className="mt-1 text-[22px] font-black tracking-[-0.04em]">{selecionada.codigo}</h3>
                  <p className="mt-1 text-[9px] text-slate-400">{selecionada.data} • {selecionada.entregador}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelecionada(null)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Info icon={<UserRound size={15} />} label="Entregador" valor={selecionada.entregador} />
                  <Info icon={<Truck size={15} />} label="Carga" valor={selecionada.carga || "Sem carga vinculada"} />
                  <Info icon={<PackageOpen size={15} />} label="Origem" valor={selecionada.origem || "—"} />
                  <Info icon={<Clock3 size={15} />} label="Duração" valor={selecionada.duracao} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Indicador icon={<MapPin size={15} />} label="Paradas" valor={selecionada.paradas} />
                  <Indicador icon={<CheckCircle2 size={15} />} label="Entregues" valor={selecionada.entregues} />
                  <Indicador icon={<XCircle size={15} />} label="Ausentes" valor={selecionada.ausentes} />
                  <Indicador icon={<Route size={15} />} label="Pendentes" valor={selecionada.pendentes} />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Info icon={<Clock3 size={15} />} label="Início" valor={selecionada.inicio} />
                  <Info icon={<Clock3 size={15} />} label="Fim" valor={selecionada.fim} />
                  <Info icon={<CheckCircle2 size={15} />} label="Taxa de atendimento" valor={`${selecionada.taxa.toFixed(1)}%`} />
                </div>

                {selecionada.observacao && (
                  <div className="mt-4 rounded-[18px] bg-[#f6f9f6] p-4">
                    <p className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-400">Observação da rota</p>
                    <p className="mt-2 text-[9px] leading-5 text-slate-600">{selecionada.observacao}</p>
                  </div>
                )}

                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#b07a12]">Paradas</p>
                      <h4 className="mt-1 text-[16px] font-black">Clientes da rota</h4>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-2 text-[7px] font-black text-emerald-700">
                      {selecionada.clientes.length} parada(s)
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {selecionada.clientes.length === 0 ? (
                      <div className="rounded-[18px] bg-[#f6f9f6] p-8 text-center">
                        <Route size={24} className="mx-auto text-slate-300" />
                        <p className="mt-2 text-[9px] font-black">Nenhuma parada vinculada</p>
                      </div>
                    ) : (
                      selecionada.clientes.map((cliente) => (
                        <div
                          key={`${selecionada.id}-${cliente.sequencia}-${cliente.codigoCliente}`}
                          className="grid gap-3 rounded-[18px] border border-slate-100 bg-[#fbfdfb] p-4 sm:grid-cols-[52px_1fr_auto]"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-emerald-50 text-[10px] font-black text-emerald-700">
                            {cliente.sequencia}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-[9px] font-black">{cliente.cliente}</p>
                              <span className={`rounded-full px-2 py-1 text-[6px] font-black uppercase ${classeParada(cliente.status)}`}>
                                {cliente.status.replaceAll("_", " ")}
                              </span>
                            </div>

                            <p className="mt-1 text-[7px] text-slate-400">
                              {cliente.codigoCliente}
                              {cliente.bairro ? ` • ${cliente.bairro}` : ""}
                              {cliente.cidade ? ` • ${cliente.cidade}` : ""}
                            </p>

                            {cliente.observacao && (
                              <p className="mt-2 text-[7px] leading-4 text-slate-500">{cliente.observacao}</p>
                            )}
                          </div>

                          <div className="text-right text-[7px] text-slate-400">{cliente.atendidoEm}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {exibidas.map((rota) => (
          <button
            key={rota.id}
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setSelecionada(rota);
            }}
            className="group rounded-[20px] border border-slate-100 bg-[#fbfdfb] p-4 text-left transition hover:border-emerald-200 hover:bg-white hover:shadow-[0_10px_30px_rgba(17,63,33,0.06)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[10px] font-black">{rota.codigo}</span>
                  <span className={`rounded-full border px-2 py-1 text-[6px] font-black uppercase ${classeStatus(rota.status)}`}>
                    {rota.statusLabel}
                  </span>
                </div>
                <p className="mt-1 truncate text-[7px] text-slate-400">{rota.data} • {rota.entregador}</p>
                {rota.carga && <p className="mt-0.5 truncate text-[7px] font-semibold text-slate-400">{rota.carga}</p>}
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[11px] font-black text-emerald-700">{rota.entregues}/{rota.paradas}</p>
                <p className="text-[6px] font-black uppercase tracking-[0.12em] text-slate-400">atendidas</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-1.5">
              <Mini label="Paradas" valor={rota.paradas} />
              <Mini label="Entregues" valor={rota.entregues} />
              <Mini label="Ausentes" valor={rota.ausentes} />
              <Mini label="Pendentes" valor={rota.pendentes} />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <div className="flex min-w-0 items-center gap-1.5 text-[7px] text-slate-400">
                <Clock3 size={11} className="shrink-0" />
                <span className="truncate">{rota.duracao}</span>
              </div>
              <span className="text-[7px] font-black text-[#176f3c]">Ver detalhes</span>
            </div>
          </button>
        ))}
      </div>

      {temMais && (
        <button
          type="button"
          onClick={() => setLimite((atual) => atual + 20)}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-emerald-100 bg-emerald-50 text-[9px] font-black text-emerald-800"
        >
          <ChevronDown size={15} />
          Carregar mais 20
        </button>
      )}

      {rotas.length > 20 && (
        <p className="mt-3 text-center text-[7px] text-slate-400">
          Exibindo {Math.min(limite, rotas.length)} de {rotas.length} rota(s)
        </p>
      )}

      {modal}
    </>
  );
}

function Mini({ label, valor }: { label: string; valor: string | number }) {
  return (
    <div className="rounded-[11px] bg-[#f4f7f4] px-2 py-2">
      <p className="text-[5px] font-black uppercase tracking-[0.1em] text-slate-400">{label}</p>
      <p className="mt-1 text-[9px] font-black">{valor}</p>
    </div>
  );
}

function Info({ icon, label, valor }: { icon: React.ReactNode; label: string; valor: string }) {
  return (
    <div className="rounded-[18px] bg-[#f6f9f6] p-4">
      <div className="flex items-center gap-2 text-emerald-700">{icon}</div>
      <p className="mt-3 text-[6px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 break-words text-[9px] font-black">{valor}</p>
    </div>
  );
}

function Indicador({ icon, label, valor }: { icon: React.ReactNode; label: string; valor: number }) {
  return (
    <div className="rounded-[18px] border border-slate-100 bg-white p-4">
      <div className="text-emerald-700">{icon}</div>
      <p className="mt-3 text-[6px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-[18px] font-black">{valor}</p>
    </div>
  );
}
