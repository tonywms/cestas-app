"use client";

import {
  ChevronDown,
  ChevronUp,
  Clock3,
  Eye,
  FileJson2,
  Route,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";

export type AuditoriaItem = {
  id: number;
  dataHora: string;
  dataIso: string;
  usuario: string;
  usuarioEmail: string;
  entidade: string;
  entidadeLabel: string;
  entidadeId: string;
  acao: string;
  acaoLabel: string;
  resumo: string;
  detalhes: Array<{
    label: string;
    valor: string;
  }>;
  dados: Record<string, unknown>;
};

type Ordem = "DESC" | "ASC";

function classeEntidade(entidade: string) {
  const valor = entidade.toUpperCase();

  if (valor.includes("CREDITO") || valor.includes("FINANCE")) {
    return "bg-amber-50 text-amber-700";
  }

  if (valor.includes("CLIENTE")) {
    return "bg-blue-50 text-blue-700";
  }

  if (valor.includes("CARGA") || valor.includes("ROTA")) {
    return "bg-emerald-50 text-emerald-700";
  }

  return "bg-slate-100 text-slate-600";
}

function jsonBonito(valor: Record<string, unknown>) {
  try {
    return JSON.stringify(valor, null, 2);
  } catch {
    return "{}";
  }
}

export default function AuditoriaCardsClient({
  eventos,
  mostrarTecnico,
}: {
  eventos: AuditoriaItem[];
  mostrarTecnico: boolean;
}) {
  const [limite, setLimite] = useState(50);
  const [ordem, setOrdem] = useState<Ordem>("DESC");
  const [selecionado, setSelecionado] = useState<AuditoriaItem | null>(null);
  const [tecnicoAberto, setTecnicoAberto] = useState(false);

  const ordenados = useMemo(() => {
    return [...eventos].sort((a, b) => {
      const da = new Date(a.dataIso).getTime();
      const db = new Date(b.dataIso).getTime();
      return ordem === "DESC" ? db - da : da - db;
    });
  }, [eventos, ordem]);

  const exibidos = useMemo(
    () => ordenados.slice(0, limite),
    [ordenados, limite],
  );

  useEffect(() => {
    if (!selecionado) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const overflow = body.style.overflow;
    const position = body.style.position;
    const top = body.style.top;
    const width = body.style.width;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelecionado(null);
        setTecnicoAberto(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      body.style.overflow = overflow;
      body.style.position = position;
      body.style.top = top;
      body.style.width = width;
      window.scrollTo(0, scrollY);
    };
  }, [selecionado]);

  function fechar() {
    setSelecionado(null);
    setTecnicoAberto(false);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
            Livro de auditoria
          </p>
          <p className="mt-1 text-[9px] text-slate-500">
            Uma linha por acontecimento. Exibindo {Math.min(limite, eventos.length)} de {eventos.length}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOrdem((atual) => (atual === "DESC" ? "ASC" : "DESC"))}
          className="flex h-10 items-center gap-2 rounded-[13px] border border-slate-200 bg-white px-4 text-[8px] font-black text-slate-600"
        >
          {ordem === "DESC" ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          {ordem === "DESC" ? "Mais recentes primeiro" : "Mais antigos primeiro"}
        </button>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-left">
            <thead className="bg-[#f6f9f6]">
              <tr>
                {[
                  "Data / hora",
                  "ID",
                  "Rotina",
                  "Operação",
                  "Responsável",
                  "Referência",
                  "Descrição",
                  "",
                ].map((titulo) => (
                  <th
                    key={titulo}
                    className="px-4 py-3 text-[7px] font-black uppercase tracking-[0.12em] text-slate-400"
                  >
                    {titulo}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {exibidos.map((evento) => (
                <tr
                  key={evento.id}
                  className="border-t border-slate-100 bg-white align-top hover:bg-[#fbfdfb]"
                >
                  <td className="whitespace-nowrap px-4 py-4 text-[8px] font-semibold text-slate-500">
                    {evento.dataHora}
                  </td>

                  <td className="px-4 py-4 text-[8px] font-black text-slate-500">
                    #{evento.id}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-[6px] font-black uppercase ${classeEntidade(
                        evento.entidade,
                      )}`}
                    >
                      {evento.entidadeLabel}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <p className="max-w-[220px] text-[9px] font-black">
                      {evento.acaoLabel}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <UserRound size={13} className="text-emerald-700" />
                      <span className="max-w-[160px] truncate text-[8px] font-black">
                        {evento.usuario}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <p className="max-w-[170px] truncate text-[8px] font-semibold text-slate-500">
                      {evento.entidadeId ? `#${evento.entidadeId}` : "—"}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <p className="max-w-[330px] text-[8px] leading-4 text-slate-500">
                      {evento.resumo}
                    </p>
                  </td>

                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelecionado(evento);
                        setTecnicoAberto(false);
                      }}
                      className="inline-flex h-9 items-center gap-2 rounded-[12px] border border-emerald-100 bg-emerald-50 px-3 text-[7px] font-black text-emerald-800"
                    >
                      <Eye size={13} />
                      Detalhes
                    </button>
                  </td>
                </tr>
              ))}

              {exibidos.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-14 text-center text-[10px] text-slate-400"
                  >
                    Nenhum evento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {limite < ordenados.length && (
        <button
          type="button"
          onClick={() => setLimite((valor) => valor + 50)}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-emerald-100 bg-emerald-50 text-[9px] font-black text-emerald-800"
        >
          <ChevronDown size={15} />
          Carregar mais 50 eventos
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
              if (event.target === event.currentTarget) fechar();
            }}
          >
            <div className="max-h-[90vh] w-full max-w-[820px] overflow-y-auto rounded-[28px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
                      Evento #{selecionado.id}
                    </p>

                    <span
                      className={`rounded-full px-2 py-1 text-[6px] font-black uppercase ${classeEntidade(
                        selecionado.entidade,
                      )}`}
                    >
                      {selecionado.entidadeLabel}
                    </span>
                  </div>

                  <h3 className="mt-2 text-[20px] font-black tracking-[-0.04em]">
                    {selecionado.acaoLabel}
                  </h3>

                  <p className="mt-2 max-w-[600px] text-[9px] leading-5 text-slate-500">
                    {selecionado.resumo}
                  </p>

                  <p className="mt-1 flex items-center gap-1.5 text-[8px] text-slate-400">
                    <Clock3 size={12} />
                    {selecionado.dataHora}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fechar}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-slate-100 text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Info
                    icon={<UserRound size={15} />}
                    label="Responsável"
                    valor={selecionado.usuario}
                  />

                  <Info
                    icon={<Route size={15} />}
                    label="Rotina"
                    valor={selecionado.entidadeLabel}
                  />

                  <Info
                    icon={<FileJson2 size={15} />}
                    label="Referência"
                    valor={selecionado.entidadeId ? `#${selecionado.entidadeId}` : "—"}
                  />
                </div>

                {selecionado.detalhes.length > 0 && (
                  <div className="mt-5">
                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#b07a12]">
                      Informações da operação
                    </p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {selecionado.detalhes.map((item) => (
                        <div
                          key={`${item.label}-${item.valor}`}
                          className="rounded-[18px] border border-slate-100 bg-[#f7faf7] p-4"
                        >
                          <p className="text-[6px] font-black uppercase tracking-[0.12em] text-slate-400">
                            {item.label}
                          </p>
                          <p className="mt-1 break-words text-[10px] font-black">
                            {item.valor}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mostrarTecnico && (
                  <div className="mt-5 rounded-[20px] border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setTecnicoAberto((valor) => !valor)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <ShieldCheck size={17} className="text-slate-500" />
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                            Super Admin
                          </p>
                          <p className="mt-0.5 text-[10px] font-black">
                            Detalhes técnicos
                          </p>
                        </div>
                      </div>

                      <ChevronDown
                        size={16}
                        className={`text-slate-400 transition ${
                          tecnicoAberto ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {tecnicoAberto && (
                      <div className="border-t border-slate-100 p-5">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <Info
                            icon={<Route size={15} />}
                            label="Ação técnica"
                            valor={selecionado.acao}
                          />
                          <Info
                            icon={<Route size={15} />}
                            label="Entidade técnica"
                            valor={selecionado.entidade}
                          />
                          <Info
                            icon={<FileJson2 size={15} />}
                            label="Entidade ID"
                            valor={selecionado.entidadeId || "—"}
                          />
                          <Info
                            icon={<UserRound size={15} />}
                            label="Usuário"
                            valor={selecionado.usuarioEmail || selecionado.usuario}
                          />
                        </div>

                        <pre className="mt-4 max-h-[420px] overflow-auto rounded-[18px] bg-[#0f1d14] p-5 text-[9px] leading-5 text-emerald-100">
                          {jsonBonito(selecionado.dados)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
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
