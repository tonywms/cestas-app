"use client";

import {
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  MapPin,
  Phone,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";

export type Cliente360Item = {
  id: number;
  codigo: string;
  nome: string;
  telefone: string;
  documento: string;
  endereco: string;
  ativo: boolean;
  criadoEm: string;
  vendas: number;
  valorComprado: number;
  entregas: number;
  contratosAtivos: number;
  carteiraAberta: number;
  vencido: number;
  parcelasVencidas: number;
  ultimaVenda: string;
  situacaoFinanceira: "REGULAR" | "INADIMPLENTE";
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

export default function ClientesCardsClient({
  clientes,
}: {
  clientes: Cliente360Item[];
}) {
  const [limite, setLimite] = useState(24);
  const [selecionado, setSelecionado] = useState<Cliente360Item | null>(null);

  const exibidos = useMemo(() => clientes.slice(0, limite), [clientes, limite]);

  useEffect(() => {
    if (!selecionado) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const originalOverflow = body.style.overflow;
    const originalPosition = body.style.position;
    const originalTop = body.style.top;
    const originalWidth = body.style.width;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    const fecharEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelecionado(null);
      }
    };

    window.addEventListener("keydown", fecharEsc);

    return () => {
      window.removeEventListener("keydown", fecharEsc);
      body.style.overflow = originalOverflow;
      body.style.position = originalPosition;
      body.style.top = originalTop;
      body.style.width = originalWidth;
      window.scrollTo(0, scrollY);
    };
  }, [selecionado]);

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {exibidos.map((cliente) => (
          <button
            key={cliente.id}
            type="button"
            onClick={() => setSelecionado(cliente)}
            className="rounded-[20px] border border-slate-100 bg-[#fbfdfb] p-4 text-left transition hover:border-emerald-200 hover:bg-white hover:shadow-[0_10px_30px_rgba(17,63,33,0.06)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-black">{cliente.nome}</p>
                <p className="mt-1 text-[7px] text-slate-400">
                  {cliente.codigo} {cliente.telefone ? `• ${cliente.telefone}` : ""}
                </p>
              </div>

              <span
                className={
                  cliente.situacaoFinanceira === "INADIMPLENTE"
                    ? "rounded-full bg-red-50 px-2 py-1 text-[6px] font-black uppercase text-red-700"
                    : "rounded-full bg-emerald-50 px-2 py-1 text-[6px] font-black uppercase text-emerald-700"
                }
              >
                {cliente.situacaoFinanceira === "INADIMPLENTE"
                  ? "Inadimplente"
                  : "Regular"}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-1.5">
              <Mini label="Vendas" valor={cliente.vendas} />
              <Mini label="Entregas" valor={cliente.entregas} />
              <Mini label="Contratos" valor={cliente.contratosAtivos} />
              <Mini label="Vencidas" valor={cliente.parcelasVencidas} />
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <div>
                <p className="text-[6px] font-black uppercase text-slate-400">
                  Comprado
                </p>
                <p className="mt-1 text-[9px] font-black">
                  {moeda(cliente.valorComprado)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[6px] font-black uppercase text-slate-400">
                  Em aberto
                </p>
                <p
                  className={
                    cliente.vencido > 0
                      ? "mt-1 text-[9px] font-black text-red-700"
                      : "mt-1 text-[9px] font-black"
                  }
                >
                  {moeda(cliente.carteiraAberta)}
                </p>
              </div>
            </div>

            <div className="mt-3 text-right text-[7px] font-black text-[#176f3c]">
              Ver visão 360º
            </div>
          </button>
        ))}
      </div>

      {limite < clientes.length && (
        <button
          type="button"
          onClick={() => setLimite((valor) => valor + 24)}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-emerald-100 bg-emerald-50 text-[9px] font-black text-emerald-800"
        >
          <ChevronDown size={15} />
          Carregar mais 24
        </button>
      )}

      {selecionado &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[500] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelecionado(null);
              }
            }}
          >
            <div className="max-h-[90vh] w-full max-w-[820px] overflow-y-auto rounded-[28px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
                    Visão 360º do cliente
                  </p>
                  <h3 className="mt-1 text-[22px] font-black tracking-[-0.04em]">
                    {selecionado.nome}
                  </h3>
                  <p className="mt-1 text-[8px] text-slate-400">
                    {selecionado.codigo}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelecionado(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-slate-100 text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Info icon={<Phone size={15} />} label="Telefone" valor={selecionado.telefone || "—"} />
                  <Info icon={<UserRound size={15} />} label="Documento" valor={selecionado.documento || "—"} />
                  <Info icon={<MapPin size={15} />} label="Endereço" valor={selecionado.endereco || "—"} />
                  <Info icon={<CalendarDays size={15} />} label="Cliente desde" valor={selecionado.criadoEm} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Indicador icon={<ShoppingBag size={15} />} label="Vendas" valor={String(selecionado.vendas)} />
                  <Indicador icon={<CircleDollarSign size={15} />} label="Valor comprado" valor={moeda(selecionado.valorComprado)} />
                  <Indicador icon={<CreditCard size={15} />} label="Carteira aberta" valor={moeda(selecionado.carteiraAberta)} />
                  <Indicador icon={<CreditCard size={15} />} label="Vencido" valor={moeda(selecionado.vencido)} alerta={selecionado.vencido > 0} />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Info icon={<ShoppingBag size={15} />} label="Entregas" valor={String(selecionado.entregas)} />
                  <Info icon={<CreditCard size={15} />} label="Contratos ativos" valor={String(selecionado.contratosAtivos)} />
                  <Info icon={<CalendarDays size={15} />} label="Última venda" valor={selecionado.ultimaVenda || "—"} />
                </div>

                <div
                  className={
                    selecionado.vencido > 0
                      ? "mt-5 rounded-[20px] border border-red-100 bg-red-50 p-5"
                      : "mt-5 rounded-[20px] border border-emerald-100 bg-emerald-50 p-5"
                  }
                >
                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Situação financeira
                  </p>
                  <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p
                        className={
                          selecionado.vencido > 0
                            ? "text-[18px] font-black text-red-700"
                            : "text-[18px] font-black text-emerald-700"
                        }
                      >
                        {selecionado.vencido > 0 ? "Cliente inadimplente" : "Cliente regular"}
                      </p>
                      <p className="mt-1 text-[8px] text-slate-500">
                        {selecionado.parcelasVencidas} parcela(s) vencida(s).
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[7px] font-black uppercase text-slate-400">
                        Total vencido
                      </p>
                      <p className="mt-1 text-[16px] font-black">
                        {moeda(selecionado.vencido)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function Mini({ label, valor }: { label: string; valor: string | number }) {
  return (
    <div className="rounded-[11px] bg-[#f4f7f4] px-2 py-2">
      <p className="text-[5px] font-black uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-[9px] font-black">{valor}</p>
    </div>
  );
}

function Info({
  icon,
  label,
  valor,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="rounded-[18px] bg-[#f6f9f6] p-4">
      <div className="text-emerald-700">{icon}</div>
      <p className="mt-3 text-[6px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-[9px] font-black">{valor}</p>
    </div>
  );
}

function Indicador({
  icon,
  label,
  valor,
  alerta = false,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <div className={alerta ? "rounded-[18px] border border-red-100 bg-red-50 p-4" : "rounded-[18px] border border-slate-100 bg-white p-4"}>
      <div className={alerta ? "text-red-600" : "text-emerald-700"}>{icon}</div>
      <p className="mt-3 text-[6px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className={alerta ? "mt-1 text-[15px] font-black text-red-700" : "mt-1 text-[15px] font-black"}>
        {valor}
      </p>
    </div>
  );
}
