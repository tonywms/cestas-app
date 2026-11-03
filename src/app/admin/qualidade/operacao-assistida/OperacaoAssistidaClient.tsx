"use client";

import {
  AlertTriangle,
  BadgeCheck,
  ChevronRight,
  CircleAlert,
  Clock3,
  Flame,
  History,
  Plus,
  Search,
  ShieldCheck,
  Siren,
  Wrench,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  abrirIncidente,
  iniciarAnalise,
  reabrirIncidente,
  resolverIncidente,
} from "./actions";

export type SeveridadeIncidente = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";

export type ModuloIncidente =
  | "ESTOQUE"
  | "CARGAS"
  | "VENDAS"
  | "CLIENTES"
  | "ROTAS"
  | "FINANCEIRO"
  | "CREDITO"
  | "PERMISSOES"
  | "MOBILE"
  | "AUTENTICACAO"
  | "INTEGRACOES"
  | "OUTROS";

export type StatusIncidente = "ABERTO" | "EM_ANALISE" | "RESOLVIDO";

export type HistoricoIncidente = {
  acao: string;
  data: string | null;
  responsavel: string;
  detalhe: string;
};

export type IncidenteOperacao = {
  id: string;
  titulo: string;
  descricao: string;
  severidade: SeveridadeIncidente;
  modulo: ModuloIncidente;
  responsavel: string | null;
  status: StatusIncidente;
  abertoEm: string;
  atualizadoEm: string | null;
  resolvidoEm: string | null;
  solucao: string | null;
  abertoPor: string;
  historico: HistoricoIncidente[];
};

type Props = {
  incidentes: IncidenteOperacao[];
};

type Modal =
  | { tipo: "NOVO" }
  | { tipo: "DETALHE"; incidente: IncidenteOperacao }
  | { tipo: "ANALISE"; incidente: IncidenteOperacao }
  | { tipo: "RESOLVER"; incidente: IncidenteOperacao }
  | { tipo: "REABRIR"; incidente: IncidenteOperacao }
  | null;

const MODULOS: Array<{ valor: ModuloIncidente; rotulo: string }> = [
  { valor: "ESTOQUE", rotulo: "Estoque" },
  { valor: "CARGAS", rotulo: "Cargas" },
  { valor: "VENDAS", rotulo: "Vendas" },
  { valor: "CLIENTES", rotulo: "Clientes" },
  { valor: "ROTAS", rotulo: "Rotas" },
  { valor: "FINANCEIRO", rotulo: "Financeiro" },
  { valor: "CREDITO", rotulo: "Crédito" },
  { valor: "PERMISSOES", rotulo: "Permissões" },
  { valor: "MOBILE", rotulo: "Mobile" },
  { valor: "AUTENTICACAO", rotulo: "Autenticação" },
  { valor: "INTEGRACOES", rotulo: "Integrações" },
  { valor: "OUTROS", rotulo: "Outros" },
];

const SEVERIDADES: Array<{
  valor: SeveridadeIncidente;
  rotulo: string;
}> = [
  { valor: "BAIXA", rotulo: "Baixa" },
  { valor: "MEDIA", rotulo: "Média" },
  { valor: "ALTA", rotulo: "Alta" },
  { valor: "CRITICA", rotulo: "Crítica" },
];

function dataHora(valor: string | null | undefined) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function moduloRotulo(modulo: ModuloIncidente) {
  return MODULOS.find((item) => item.valor === modulo)?.rotulo ?? modulo;
}

function statusRotulo(status: StatusIncidente) {
  if (status === "EM_ANALISE") return "Em análise";
  if (status === "RESOLVIDO") return "Resolvido";
  return "Aberto";
}

function severidadeRotulo(severidade: SeveridadeIncidente) {
  return (
    SEVERIDADES.find((item) => item.valor === severidade)?.rotulo ??
    severidade
  );
}

function severidadeClasse(severidade: SeveridadeIncidente) {
  if (severidade === "CRITICA")
    return "border-red-200 bg-red-50 text-red-800";
  if (severidade === "ALTA")
    return "border-orange-200 bg-orange-50 text-orange-800";
  if (severidade === "MEDIA")
    return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-sky-200 bg-sky-50 text-sky-800";
}

function statusClasse(status: StatusIncidente) {
  if (status === "RESOLVIDO")
    return "bg-emerald-100 text-emerald-800";
  if (status === "EM_ANALISE") return "bg-sky-100 text-sky-800";
  return "bg-amber-100 text-amber-800";
}

export default function OperacaoAssistidaClient({ incidentes }: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<Modal>(null);
  const [filtro, setFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("TODOS");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [pending, startTransition] = useTransition();

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [severidade, setSeveridade] =
    useState<SeveridadeIncidente>("MEDIA");
  const [modulo, setModulo] = useState<ModuloIncidente>("OUTROS");
  const [responsavel, setResponsavel] = useState("");
  const [observacao, setObservacao] = useState("");
  const [solucao, setSolucao] = useState("");
  const [motivo, setMotivo] = useState("");

  const lista = useMemo(() => {
    const busca = filtro.trim().toLowerCase();

    return incidentes.filter((item) => {
      const bateStatus =
        statusFiltro === "TODOS" || item.status === statusFiltro;

      if (!bateStatus) return false;
      if (!busca) return true;

      return [
        item.titulo,
        item.descricao,
        item.responsavel ?? "",
        moduloRotulo(item.modulo),
        severidadeRotulo(item.severidade),
      ]
        .join(" ")
        .toLowerCase()
        .includes(busca);
    });
  }, [filtro, incidentes, statusFiltro]);

  function limparCampos() {
    setTitulo("");
    setDescricao("");
    setSeveridade("MEDIA");
    setModulo("OUTROS");
    setResponsavel("");
    setObservacao("");
    setSolucao("");
    setMotivo("");
    setErro("");
  }

  function fechar() {
    setModal(null);
    limparCampos();
  }

  function sucesso(message: string) {
    setMensagem(message);
    fechar();
    router.refresh();
  }

  function executar(fn: () => Promise<{ success: boolean; message: string }>) {
    setErro("");
    setMensagem("");

    startTransition(async () => {
      const resultado = await fn();

      if (!resultado.success) {
        setErro(resultado.message);
        return;
      }

      sucesso(resultado.message);
    });
  }

  return (
    <section className="mt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#b28735]">
            Incidentes
          </p>
          <h2 className="mt-1 text-[23px] font-extrabold tracking-[-0.04em]">
            Acompanhe o que exige atuação
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            limparCampos();
            setModal({ tipo: "NOVO" });
          }}
          className="inline-flex min-h-[46px] items-center gap-2 rounded-[14px] bg-[#137a3d] px-5 text-[11px] font-extrabold text-white shadow-sm"
        >
          <Plus size={16} />
          Registrar incidente
        </button>
      </div>

      <div className="mt-4 grid gap-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px]">
        <label className="flex min-h-[44px] items-center gap-2 rounded-[14px] border border-slate-200 bg-slate-50 px-3">
          <Search size={16} className="text-slate-400" />
          <input
            value={filtro}
            onChange={(event) => setFiltro(event.target.value)}
            placeholder="Buscar por título, módulo, severidade ou responsável..."
            className="w-full bg-transparent text-[11px] outline-none placeholder:text-slate-400"
          />
        </label>

        <select
          value={statusFiltro}
          onChange={(event) => setStatusFiltro(event.target.value)}
          className="min-h-[44px] rounded-[14px] border border-slate-200 bg-slate-50 px-3 text-[11px] font-semibold outline-none"
        >
          <option value="TODOS">Todos os status</option>
          <option value="ABERTO">Abertos</option>
          <option value="EM_ANALISE">Em análise</option>
          <option value="RESOLVIDO">Resolvidos</option>
        </select>
      </div>

      {mensagem ? (
        <div className="mt-3 rounded-[16px] border border-emerald-200 bg-emerald-50 p-4 text-[11px] font-semibold text-emerald-800">
          {mensagem}
        </div>
      ) : null}

      {lista.length > 0 ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {lista.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setModal({ tipo: "DETALHE", incidente: item })}
              className="group rounded-[24px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[8px] font-extrabold uppercase ${severidadeClasse(
                        item.severidade,
                      )}`}
                    >
                      {severidadeRotulo(item.severidade)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase ${statusClasse(
                        item.status,
                      )}`}
                    >
                      {statusRotulo(item.status)}
                    </span>
                  </div>

                  <h3 className="mt-3 line-clamp-2 text-[18px] font-extrabold tracking-[-0.03em] text-slate-950">
                    {item.titulo}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-slate-500">
                    {item.descricao}
                  </p>
                </div>

                <ChevronRight
                  size={18}
                  className="mt-1 shrink-0 text-slate-300 transition group-hover:text-emerald-600"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-[14px] bg-slate-50 p-3">
                  <p className="text-[8px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                    Módulo
                  </p>
                  <p className="mt-1 text-[10px] font-extrabold text-slate-700">
                    {moduloRotulo(item.modulo)}
                  </p>
                </div>
                <div className="rounded-[14px] bg-slate-50 p-3">
                  <p className="text-[8px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                    Responsável
                  </p>
                  <p className="mt-1 truncate text-[10px] font-extrabold text-slate-700">
                    {item.responsavel || "Não atribuído"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[9px] font-semibold text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Clock3 size={12} />
                  Aberto em {dataHora(item.abertoEm)}
                </span>
                <span>{item.id}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[24px] border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[16px] bg-emerald-50 text-emerald-700">
            <ShieldCheck size={22} />
          </div>
          <h3 className="mt-3 text-[17px] font-extrabold text-slate-900">
            Nenhum incidente encontrado
          </h3>
          <p className="mt-2 text-[11px] text-slate-500">
            Ajuste os filtros ou registre uma nova ocorrência operacional.
          </p>
        </div>
      )}

      {modal ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#132219]/60 p-4 backdrop-blur-[4px]">
          <div className="max-h-[92vh] w-full max-w-[650px] overflow-y-auto rounded-[28px] bg-white shadow-[0_30px_100px_rgba(0,0,0,0.30)]">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 bg-[#176f3c] px-6 py-5 text-white">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/70">
                  Operação assistida
                </p>
                <h3 className="mt-1 text-[22px] font-extrabold tracking-[-0.03em]">
                  {modal.tipo === "NOVO"
                    ? "Registrar incidente"
                    : modal.tipo === "ANALISE"
                      ? "Iniciar análise"
                      : modal.tipo === "RESOLVER"
                        ? "Resolver incidente"
                        : modal.tipo === "REABRIR"
                          ? "Reabrir incidente"
                          : "Detalhes do incidente"}
                </h3>
              </div>
              <button
                type="button"
                onClick={fechar}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              {modal.tipo === "NOVO" ? (
                <div className="space-y-4">
                  <Campo label="Título">
                    <input
                      value={titulo}
                      onChange={(event) =>
                        setTitulo(event.target.value.slice(0, 160))
                      }
                      placeholder="Ex.: Entregador não consegue concluir carga"
                      className="campo-v78"
                    />
                  </Campo>

                  <Campo label="Descrição">
                    <textarea
                      value={descricao}
                      onChange={(event) =>
                        setDescricao(event.target.value.slice(0, 3000))
                      }
                      placeholder="Descreva o impacto, comportamento observado e contexto."
                      className="campo-v78 min-h-[120px] resize-none"
                    />
                  </Campo>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Campo label="Severidade">
                      <select
                        value={severidade}
                        onChange={(event) =>
                          setSeveridade(
                            event.target.value as SeveridadeIncidente,
                          )
                        }
                        className="campo-v78"
                      >
                        {SEVERIDADES.map((item) => (
                          <option key={item.valor} value={item.valor}>
                            {item.rotulo}
                          </option>
                        ))}
                      </select>
                    </Campo>

                    <Campo label="Módulo afetado">
                      <select
                        value={modulo}
                        onChange={(event) =>
                          setModulo(event.target.value as ModuloIncidente)
                        }
                        className="campo-v78"
                      >
                        {MODULOS.map((item) => (
                          <option key={item.valor} value={item.valor}>
                            {item.rotulo}
                          </option>
                        ))}
                      </select>
                    </Campo>
                  </div>

                  <Campo label="Responsável inicial">
                    <input
                      value={responsavel}
                      onChange={(event) =>
                        setResponsavel(event.target.value.slice(0, 120))
                      }
                      placeholder="Opcional. Ex.: Tony / Suporte / Desenvolvimento"
                      className="campo-v78"
                    />
                  </Campo>

                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      executar(() =>
                        abrirIncidente({
                          titulo,
                          descricao,
                          severidade,
                          modulo,
                          responsavel,
                        }),
                      )
                    }
                    className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[15px] bg-[#137a3d] px-4 text-[11px] font-extrabold text-white disabled:opacity-50"
                  >
                    <Siren size={16} />
                    {pending ? "Registrando..." : "Registrar incidente"}
                  </button>
                </div>
              ) : null}

              {modal.tipo === "DETALHE" ? (
                <Detalhe
                  incidente={modal.incidente}
                  onAnalise={() => {
                    limparCampos();
                    setResponsavel(modal.incidente.responsavel ?? "");
                    setModal({
                      tipo: "ANALISE",
                      incidente: modal.incidente,
                    });
                  }}
                  onResolver={() => {
                    limparCampos();
                    setResponsavel(modal.incidente.responsavel ?? "");
                    setModal({
                      tipo: "RESOLVER",
                      incidente: modal.incidente,
                    });
                  }}
                  onReabrir={() => {
                    limparCampos();
                    setModal({
                      tipo: "REABRIR",
                      incidente: modal.incidente,
                    });
                  }}
                />
              ) : null}

              {modal.tipo === "ANALISE" ? (
                <div className="space-y-4">
                  <ResumoIncidente incidente={modal.incidente} />
                  <Campo label="Responsável">
                    <input
                      value={responsavel}
                      onChange={(event) =>
                        setResponsavel(event.target.value.slice(0, 120))
                      }
                      placeholder="Quem está tratando?"
                      className="campo-v78"
                    />
                  </Campo>
                  <Campo label="Observação">
                    <textarea
                      value={observacao}
                      onChange={(event) =>
                        setObservacao(event.target.value.slice(0, 1000))
                      }
                      placeholder="Opcional. Registre a primeira análise."
                      className="campo-v78 min-h-[100px] resize-none"
                    />
                  </Campo>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      executar(() =>
                        iniciarAnalise({
                          incidenteId: modal.incidente.id,
                          responsavel,
                          observacao,
                        }),
                      )
                    }
                    className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[15px] bg-sky-700 px-4 text-[11px] font-extrabold text-white disabled:opacity-50"
                  >
                    <AlertTriangle size={16} />
                    {pending ? "Registrando..." : "Confirmar início da análise"}
                  </button>
                </div>
              ) : null}

              {modal.tipo === "RESOLVER" ? (
                <div className="space-y-4">
                  <ResumoIncidente incidente={modal.incidente} />
                  <Campo label="Responsável pela resolução">
                    <input
                      value={responsavel}
                      onChange={(event) =>
                        setResponsavel(event.target.value.slice(0, 120))
                      }
                      placeholder="Quem concluiu o tratamento?"
                      className="campo-v78"
                    />
                  </Campo>
                  <Campo label="Solução aplicada">
                    <textarea
                      value={solucao}
                      onChange={(event) =>
                        setSolucao(event.target.value.slice(0, 3000))
                      }
                      placeholder="Descreva o que foi corrigido e como a operação foi normalizada."
                      className="campo-v78 min-h-[130px] resize-none"
                    />
                  </Campo>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      executar(() =>
                        resolverIncidente({
                          incidenteId: modal.incidente.id,
                          responsavel,
                          solucao,
                        }),
                      )
                    }
                    className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[15px] bg-[#137a3d] px-4 text-[11px] font-extrabold text-white disabled:opacity-50"
                  >
                    <BadgeCheck size={16} />
                    {pending ? "Registrando..." : "Resolver incidente"}
                  </button>
                </div>
              ) : null}

              {modal.tipo === "REABRIR" ? (
                <div className="space-y-4">
                  <ResumoIncidente incidente={modal.incidente} />
                  <Campo label="Motivo da reabertura">
                    <textarea
                      value={motivo}
                      onChange={(event) =>
                        setMotivo(event.target.value.slice(0, 1000))
                      }
                      placeholder="Explique por que o incidente voltou a impactar a operação."
                      className="campo-v78 min-h-[110px] resize-none"
                    />
                  </Campo>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      executar(() =>
                        reabrirIncidente({
                          incidenteId: modal.incidente.id,
                          motivo,
                        }),
                      )
                    }
                    className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[15px] bg-amber-600 px-4 text-[11px] font-extrabold text-white disabled:opacity-50"
                  >
                    <History size={16} />
                    {pending ? "Registrando..." : "Reabrir incidente"}
                  </button>
                </div>
              ) : null}

              {erro ? (
                <div className="mt-4 rounded-[14px] border border-red-200 bg-red-50 p-3 text-[11px] font-semibold text-red-700">
                  {erro}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .campo-v78 {
          min-height: 46px;
          width: 100%;
          border: 1px solid rgb(226 232 240);
          border-radius: 14px;
          background: rgb(248 250 252);
          padding: 10px 12px;
          font-size: 12px;
          color: rgb(15 23 42);
          outline: none;
          transition: 0.2s ease;
        }

        .campo-v78:focus {
          border-color: rgb(110 231 183);
          background: white;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.08);
        }
      `}</style>
    </section>
  );
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function ResumoIncidente({ incidente }: { incidente: IncidenteOperacao }) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-[8px] font-extrabold uppercase ${severidadeClasse(
            incidente.severidade,
          )}`}
        >
          {severidadeRotulo(incidente.severidade)}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase ${statusClasse(
            incidente.status,
          )}`}
        >
          {statusRotulo(incidente.status)}
        </span>
      </div>
      <h4 className="mt-3 text-[16px] font-extrabold text-slate-950">
        {incidente.titulo}
      </h4>
      <p className="mt-2 text-[11px] leading-5 text-slate-500">
        {incidente.descricao}
      </p>
    </div>
  );
}

function Detalhe({
  incidente,
  onAnalise,
  onResolver,
  onReabrir,
}: {
  incidente: IncidenteOperacao;
  onAnalise: () => void;
  onResolver: () => void;
  onReabrir: () => void;
}) {
  return (
    <div>
      <ResumoIncidente incidente={incidente} />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Info label="Módulo" value={moduloRotulo(incidente.modulo)} />
        <Info
          label="Responsável"
          value={incidente.responsavel || "Não atribuído"}
        />
        <Info label="Aberto em" value={dataHora(incidente.abertoEm)} />
        <Info
          label="Última atualização"
          value={dataHora(incidente.atualizadoEm)}
        />
      </div>

      {incidente.solucao ? (
        <div className="mt-4 rounded-[18px] border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-emerald-700">
            Solução registrada
          </p>
          <p className="mt-2 text-[11px] leading-5 text-emerald-950">
            {incidente.solucao}
          </p>
        </div>
      ) : null}

      <div className="mt-5">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
          Linha do tempo
        </p>

        <div className="mt-3 space-y-2">
          {[...incidente.historico].reverse().map((evento, index) => (
            <div
              key={`${evento.acao}-${evento.data}-${index}`}
              className="rounded-[16px] border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-extrabold text-slate-700">
                  {evento.acao === "INCIDENTE_ABERTO"
                    ? "Incidente aberto"
                    : evento.acao === "INCIDENTE_EM_ANALISE"
                      ? "Análise iniciada"
                      : evento.acao === "INCIDENTE_RESOLVIDO"
                        ? "Incidente resolvido"
                        : "Incidente reaberto"}
                </p>
                <p className="text-[9px] font-semibold text-slate-400">
                  {dataHora(evento.data)}
                </p>
              </div>
              {evento.responsavel ? (
                <p className="mt-1 text-[9px] font-semibold text-slate-500">
                  Por {evento.responsavel}
                </p>
              ) : null}
              {evento.detalhe ? (
                <p className="mt-2 text-[10px] leading-5 text-slate-500">
                  {evento.detalhe}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {incidente.status === "ABERTO" ? (
          <button
            type="button"
            onClick={onAnalise}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] bg-sky-700 px-4 text-[11px] font-extrabold text-white"
          >
            <AlertTriangle size={16} />
            Iniciar análise
          </button>
        ) : null}

        {incidente.status !== "RESOLVIDO" ? (
          <button
            type="button"
            onClick={onResolver}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] bg-[#137a3d] px-4 text-[11px] font-extrabold text-white"
          >
            <BadgeCheck size={16} />
            Resolver incidente
          </button>
        ) : (
          <button
            type="button"
            onClick={onReabrir}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] bg-amber-600 px-4 text-[11px] font-extrabold text-white sm:col-span-2"
          >
            <History size={16} />
            Reabrir incidente
          </button>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-slate-50 p-3">
      <p className="text-[8px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-[10px] font-extrabold text-slate-700">
        {value}
      </p>
    </div>
  );
}
