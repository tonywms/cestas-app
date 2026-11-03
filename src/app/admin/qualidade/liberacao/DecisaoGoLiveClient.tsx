"use client";

import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  History,
  Rocket,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { registrarDecisaoGoLive } from "./actions";

/* V75_9_DECISAO_GO_LIVE_CLIENT */

type StatusDecisao = "LIBERADO" | "NAO_LIBERADO";

type SnapshotGate = {
  aprovadas: number;
  revisoes: number;
  bloqueadas: number;
  indisponiveis: number;
  estoque: string;
  credito: string;
  financeiro: string;
  seguranca: string;
};

type Decisao = {
  id: string;
  status: StatusDecisao;
  decididoEm: string;
  responsavel: string;
  perfil: string;
  observacao: string | null;
  homologacaoEntidadeId: string | null;
};

type Props = {
  podeDecidir: boolean;
  homologacaoEntidadeId: string | null;
  homologacaoResponsavel: string;
  homologacaoConcluidaEm: string | null;
  snapshot: SnapshotGate;
  decisaoAtual: Decisao | null;
  historico: Decisao[];
};

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

function rotulo(status: StatusDecisao) {
  return status === "LIBERADO" ? "Liberado para produção" : "Não liberado";
}

export default function DecisaoGoLiveClient({
  podeDecidir,
  homologacaoEntidadeId,
  homologacaoResponsavel,
  homologacaoConcluidaEm,
  snapshot,
  decisaoAtual,
  historico,
}: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<StatusDecisao | null>(null);
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pronto =
    podeDecidir &&
    Boolean(homologacaoEntidadeId) &&
    snapshot.aprovadas === 4 &&
    snapshot.revisoes === 0 &&
    snapshot.bloqueadas === 0 &&
    snapshot.indisponiveis === 0;

  function abrir(status: StatusDecisao) {
    setErro(null);
    setObservacao("");
    setModal(status);
  }

  function confirmar() {
    if (!modal || !homologacaoEntidadeId || pending) return;

    if (modal === "NAO_LIBERADO" && observacao.trim().length < 8) {
      setErro("Informe o motivo da não liberação com pelo menos 8 caracteres.");
      return;
    }

    setErro(null);
    startTransition(() => {
      void registrarDecisaoGoLive({
        status: modal,
        observacao,
        homologacaoEntidadeId,
        snapshot,
      }).then((resultado) => {
        if (!resultado.success) {
          setErro(resultado.message);
          return;
        }

        setModal(null);
        setObservacao("");
        router.refresh();
      }).catch(() => {
        setErro("Não foi possível registrar a decisão executiva agora.");
      });
    });
  }

  const statusAtual = decisaoAtual?.status ?? null;
  const cardTone =
    statusAtual === "LIBERADO"
      ? "border-emerald-200 bg-[linear-gradient(135deg,#ecfdf3,#ffffff)]"
      : statusAtual === "NAO_LIBERADO"
        ? "border-red-200 bg-[linear-gradient(135deg,#fff3f3,#ffffff)]"
        : "border-amber-200 bg-[linear-gradient(135deg,#fffbeb,#ffffff)]";
  const iconTone =
    statusAtual === "LIBERADO"
      ? "bg-emerald-100 text-emerald-700"
      : statusAtual === "NAO_LIBERADO"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";

  return (
    <>
      <section className={`mt-5 overflow-hidden rounded-[28px] border p-5 shadow-sm md:p-6 ${cardTone}`}>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-4">
            <div className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-[17px] ${iconTone}`}>
              {statusAtual === "LIBERADO" ? (
                <Rocket size={24} />
              ) : statusAtual === "NAO_LIBERADO" ? (
                <XCircle size={24} />
              ) : (
                <ShieldCheck size={24} />
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#b28735]">
                Decisão executiva de go-live
              </p>
              <h2 className="mt-1 break-words text-[24px] font-extrabold tracking-[-0.04em] text-slate-950">
                {statusAtual ? rotulo(statusAtual) : "Aguardando decisão final"}
              </h2>
              <p className="mt-2 max-w-[940px] text-[13px] leading-6 text-slate-600">
                {statusAtual === "LIBERADO"
                  ? "A liberação foi formalmente aprovada para esta rodada de homologação. O registro é auditável e não executa deploy automaticamente."
                  : statusAtual === "NAO_LIBERADO"
                    ? "A produção não foi liberada nesta decisão. Uma nova decisão pode ser registrada quando o motivo estiver resolvido."
                    : "As quatro certificações técnicas e a homologação operacional 7/7 estão aprovadas. Registre agora a decisão executiva desta rodada."}
              </p>
            </div>
          </div>

          <span className="shrink-0 rounded-full border border-white/80 bg-white px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-700 shadow-sm">
            {statusAtual ? rotulo(statusAtual) : "Aguardando decisão"}
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-[18px] border border-white/80 bg-white/80 p-4">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Gate técnico</p>
            <p className="mt-1 text-[17px] font-extrabold text-slate-900">4/4 aprovado</p>
          </div>
          <div className="rounded-[18px] border border-white/80 bg-white/80 p-4">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Homologação</p>
            <p className="mt-1 text-[17px] font-extrabold text-slate-900">7/7 concluída</p>
          </div>
          <div className="rounded-[18px] border border-white/80 bg-white/80 p-4">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Responsável homologação</p>
            <p className="mt-1 truncate text-[15px] font-extrabold text-slate-900">{homologacaoResponsavel}</p>
          </div>
          <div className="rounded-[18px] border border-white/80 bg-white/80 p-4">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Concluída em</p>
            <p className="mt-1 text-[15px] font-extrabold text-slate-900">{dataHora(homologacaoConcluidaEm)}</p>
          </div>
        </div>

        {decisaoAtual ? (
          <div className="mt-4 rounded-[20px] border border-white/90 bg-white/85 p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Decidido por</p>
                <p className="mt-1 text-[13px] font-extrabold text-slate-800">{decisaoAtual.responsavel}</p>
              </div>
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Data / hora</p>
                <p className="mt-1 text-[13px] font-extrabold text-slate-800">{dataHora(decisaoAtual.decididoEm)}</p>
              </div>
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Perfil</p>
                <p className="mt-1 text-[13px] font-extrabold text-slate-800">{decisaoAtual.perfil}</p>
              </div>
            </div>
            {decisaoAtual.observacao ? (
              <div className="mt-3 rounded-[15px] bg-slate-50 p-3">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Observação</p>
                <p className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-slate-700">{decisaoAtual.observacao}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {pronto ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => abrir("LIBERADO")}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-[16px] bg-[#137a3d] px-5 text-[12px] font-extrabold text-white shadow-[0_12px_28px_rgba(19,122,61,0.18)] transition hover:bg-[#0f6934]"
            >
              <BadgeCheck size={17} />
              {statusAtual ? "Registrar nova liberação" : "Liberar para produção"}
            </button>
            <button
              type="button"
              onClick={() => abrir("NAO_LIBERADO")}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-[16px] border border-red-200 bg-white px-5 text-[12px] font-extrabold text-red-700 transition hover:bg-red-50"
            >
              <AlertTriangle size={17} />
              {statusAtual ? "Registrar nova não liberação" : "Não liberar"}
            </button>
          </div>
        ) : (
          <div className="mt-5 rounded-[18px] border border-slate-200 bg-slate-50 p-4 text-[12px] font-semibold leading-5 text-slate-600">
            A decisão só é habilitada quando o Gate técnico está 4/4 aprovado e a homologação operacional atual está concluída 7/7.
          </div>
        )}
      </section>

      {historico.length > 0 ? (
        <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-slate-50 text-slate-700">
              <History size={20} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#b28735]">Governança</p>
              <h3 className="mt-1 text-[20px] font-extrabold tracking-[-0.03em] text-slate-950">Histórico de decisões de go-live</h3>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[18px] border border-slate-200">
            {historico.map((item, index) => (
              <div
                key={item.id}
                className={`grid gap-3 px-4 py-4 md:grid-cols-[180px_1fr_180px] ${index > 0 ? "border-t border-slate-100" : ""}`}
              >
                <div>
                  <span className={`inline-flex rounded-full px-3 py-1.5 text-[9px] font-extrabold uppercase ${item.status === "LIBERADO" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>
                    {rotulo(item.status)}
                  </span>
                  <p className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                    <Clock3 size={12} /> {dataHora(item.decididoEm)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-extrabold text-slate-800">{item.responsavel}</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.observacao || "Sem observação registrada."}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-400">Homologação vinculada</p>
                  <p className="mt-1 break-all text-[10px] font-semibold text-slate-600">{item.homologacaoEntidadeId || "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {modal ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#132219]/60 p-4 backdrop-blur-[4px]">
          <div className="w-full max-w-[560px] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_100px_rgba(0,0,0,0.30)]">
            <div className={`px-6 py-5 ${modal === "LIBERADO" ? "bg-[#176f3c] text-white" : "bg-[#7f1d1d] text-white"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white/12">
                    {modal === "LIBERADO" ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                  </div>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/70">Confirmação executiva</p>
                    <h3 className="mt-1 text-[22px] font-extrabold tracking-[-0.03em]">
                      {modal === "LIBERADO" ? "Liberar para produção?" : "Registrar não liberação?"}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[16px] bg-emerald-50 p-3">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-emerald-700/60">Técnico</p>
                  <p className="mt-1 text-[17px] font-extrabold text-emerald-900">4/4 aprovado</p>
                </div>
                <div className="rounded-[16px] bg-emerald-50 p-3">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-emerald-700/60">Operacional</p>
                  <p className="mt-1 text-[17px] font-extrabold text-emerald-900">7/7 concluído</p>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  {modal === "LIBERADO" ? "Observação da decisão" : "Motivo da não liberação"}
                </label>
                <textarea
                  value={observacao}
                  onChange={(event) => setObservacao(event.target.value.slice(0, 1000))}
                  placeholder={
                    modal === "LIBERADO"
                      ? "Opcional. Ex.: ambiente aprovado para início da operação assistida."
                      : "Obrigatório. Informe claramente o motivo que impede a liberação."
                  }
                  className="mt-2 min-h-[110px] w-full resize-none rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] leading-5 outline-none transition focus:border-emerald-300 focus:bg-white"
                />
                <div className="mt-1 flex justify-between text-[9px] font-semibold text-slate-400">
                  <span>{modal === "NAO_LIBERADO" ? "Mínimo 8 caracteres." : "Campo opcional."}</span>
                  <span>{observacao.length}/1000</span>
                </div>
              </div>

              <div className="mt-4 rounded-[16px] border border-amber-200 bg-amber-50 p-4 text-[11px] leading-5 text-amber-900">
                Esta ação registra a decisão executiva na auditoria. Ela não executa deploy, não altera banco operacional e não movimenta estoque ou financeiro.
              </div>

              {erro ? (
                <div className="mt-3 rounded-[14px] border border-red-200 bg-red-50 p-3 text-[11px] font-semibold text-red-700">{erro}</div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  disabled={pending}
                  className="min-h-[50px] rounded-[15px] border border-slate-200 bg-white text-[12px] font-extrabold text-slate-600 disabled:opacity-50"
                >
                  Voltar e revisar
                </button>
                <button
                  type="button"
                  onClick={confirmar}
                  disabled={pending}
                  className={`min-h-[50px] rounded-[15px] text-[12px] font-extrabold text-white disabled:opacity-50 ${modal === "LIBERADO" ? "bg-[#137a3d]" : "bg-red-700"}`}
                >
                  {pending
                    ? "Registrando..."
                    : modal === "LIBERADO"
                      ? "Confirmar liberação"
                      : "Confirmar não liberação"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
