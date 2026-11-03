"use client";

import {
  BadgeCheck,
  ClipboardCheck,
  History,
  LockKeyhole,
  RefreshCcw,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  encerrarOperacaoAssistida,
  reabrirOperacaoAssistida,
} from "./actions";

/* V80_TERMO_ESTABILIZACAO_CLIENT */

type Props = {
  encerrada: boolean;
  podeEncerrar: boolean;
  leituraDisponivel: boolean;
  goLiveLiberado: boolean;
  incidentes: number;
  abertos: number;
  resolvidos: number;
  reaberturas: number;
  criticosHistoricos: number;
  mediaAnalise: number | null;
  mediaResolucao: number | null;
};

function tempo(minutos: number | null) {
  if (minutos === null) return "—";
  if (minutos < 60) return `${minutos} min`;

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto > 0 ? `${horas}h ${resto}min` : `${horas}h`;
}

export default function EncerramentoAssistidoClient({
  encerrada,
  podeEncerrar,
  leituraDisponivel,
  goLiveLiberado,
  incidentes,
  abertos,
  resolvidos,
  reaberturas,
  criticosHistoricos,
  mediaAnalise,
  mediaResolucao,
}: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<"ENCERRAR" | "REABRIR" | null>(
    null,
  );
  const [textoLivre, setTextoLivre] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [pending, startTransition] = useTransition();

  function confirmar() {
    if (!modal || pending) return;

    setErro("");
    setMensagem("");

    startTransition(async () => {
      const resultado =
        modal === "ENCERRAR"
          ? await encerrarOperacaoAssistida({
              observacao: textoLivre,
            })
          : await reabrirOperacaoAssistida({
              motivo: textoLivre,
            });

      if (!resultado.success) {
        setErro(resultado.message);
        return;
      }

      setMensagem(resultado.message);
      setTextoLivre("");
      setModal(null);
      router.refresh();
    });
  }

  const motivoBloqueio = !leituraDisponivel
    ? "A leitura da trilha de governança está indisponível."
    : !goLiveLiberado
      ? "O go-live atual não está liberado."
      : abertos > 0
        ? `Existem ${abertos} incidente(s) em aberto.`
        : "";

  return (
    <section className="mt-5 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
        <div className="p-5 md:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-emerald-50 text-emerald-700">
              {encerrada ? (
                <BadgeCheck size={23} />
              ) : (
                <ClipboardCheck size={23} />
              )}
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#b28735]">
                Decisão de estabilização
              </p>
              <h2 className="mt-1 text-[22px] font-extrabold tracking-[-0.03em] text-slate-950">
                {encerrada
                  ? "Operação assistida formalmente encerrada"
                  : "Encerrar operação assistida"}
              </h2>
              <p className="mt-2 max-w-[760px] text-[12px] leading-6 text-slate-500">
                O registro preserva o snapshot dos indicadores e a
                responsabilidade pela decisão.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <Mini label="Incidentes" value={String(incidentes)} />
            <Mini label="Resolvidos" value={String(resolvidos)} />
            <Mini label="Reaberturas" value={String(reaberturas)} />
            <Mini
              label="Críticos históricos"
              value={String(criticosHistoricos)}
            />
            <Mini label="Até análise" value={tempo(mediaAnalise)} />
            <Mini label="Até resolução" value={tempo(mediaResolucao)} />
          </div>

          {motivoBloqueio && !encerrada ? (
            <div className="mt-5 rounded-[16px] border border-amber-200 bg-amber-50 p-4 text-[11px] font-semibold leading-5 text-amber-900">
              {motivoBloqueio}
            </div>
          ) : null}

          {mensagem ? (
            <div className="mt-5 rounded-[16px] border border-emerald-200 bg-emerald-50 p-4 text-[11px] font-semibold text-emerald-800">
              {mensagem}
            </div>
          ) : null}

          {encerrada ? (
            <button
              type="button"
              onClick={() => {
                setErro("");
                setMensagem("");
                setTextoLivre("");
                setModal("REABRIR");
              }}
              className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-amber-600 px-5 text-[12px] font-extrabold text-white"
            >
              <RefreshCcw size={17} />
              Reabrir operação assistida
            </button>
          ) : (
            <button
              type="button"
              disabled={!podeEncerrar || pending}
              onClick={() => {
                setErro("");
                setMensagem("");
                setTextoLivre("");
                setModal("ENCERRAR");
              }}
              className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#137a3d] px-5 text-[12px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <BadgeCheck size={17} />
              Formalizar estabilização
            </button>
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50 p-5 md:p-6 lg:border-l lg:border-t-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-white text-slate-700 shadow-sm">
            <LockKeyhole size={20} />
          </div>
          <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
            Regra de encerramento
          </p>
          <h3 className="mt-1 text-[19px] font-extrabold tracking-[-0.03em] text-slate-950">
            Zero incidente aberto.
          </h3>
          <p className="mt-3 text-[12px] leading-6 text-slate-500">
            A decisão é bloqueada automaticamente enquanto existir qualquer
            incidente aberto ou em análise. O go-live também precisa permanecer
            liberado.
          </p>
        </div>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#132219]/60 p-4 backdrop-blur-[4px]">
          <div className="w-full max-w-[560px] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_100px_rgba(0,0,0,0.30)]">
            <div
              className={`px-6 py-5 text-white ${
                modal === "ENCERRAR"
                  ? "bg-[#176f3c]"
                  : "bg-amber-600"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/70">
                    Termo de estabilização
                  </p>
                  <h3 className="mt-1 text-[22px] font-extrabold tracking-[-0.03em]">
                    {modal === "ENCERRAR"
                      ? "Encerrar operação assistida?"
                      : "Reabrir operação assistida?"}
                  </h3>
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
                <Mini
                  label="Incidentes abertos"
                  value={String(abertos)}
                />
                <Mini
                  label="Resolvidos"
                  value={String(resolvidos)}
                />
              </div>

              <div className="mt-4">
                <label className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  {modal === "ENCERRAR"
                    ? "Observação do encerramento"
                    : "Motivo da reabertura"}
                </label>
                <textarea
                  value={textoLivre}
                  onChange={(event) =>
                    setTextoLivre(event.target.value.slice(0, 1500))
                  }
                  placeholder={
                    modal === "ENCERRAR"
                      ? "Opcional. Ex.: operação estabilizada após acompanhamento assistido e incidentes encerrados."
                      : "Obrigatório. Explique por que o acompanhamento precisa ser retomado."
                  }
                  className="mt-2 min-h-[120px] w-full resize-none rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] leading-5 outline-none focus:border-emerald-300 focus:bg-white"
                />
                <div className="mt-1 text-right text-[9px] font-semibold text-slate-400">
                  {textoLivre.length}/1500
                </div>
              </div>

              <div className="mt-4 rounded-[16px] border border-slate-200 bg-slate-50 p-4 text-[11px] leading-5 text-slate-600">
                Esta ação registra somente governança em auditoria_eventos. Não
                altera estoque, vendas, crédito, rotas ou financeiro.
              </div>

              {erro ? (
                <div className="mt-3 rounded-[14px] border border-red-200 bg-red-50 p-3 text-[11px] font-semibold text-red-700">
                  {erro}
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  disabled={pending}
                  className="min-h-[50px] rounded-[15px] border border-slate-200 bg-white px-4 text-[11px] font-extrabold text-slate-600 disabled:opacity-50"
                >
                  Voltar e revisar
                </button>

                <button
                  type="button"
                  onClick={confirmar}
                  disabled={
                    pending ||
                    (modal === "REABRIR" &&
                      textoLivre.trim().length < 5)
                  }
                  className={`flex min-h-[50px] items-center justify-center gap-2 rounded-[15px] px-4 text-[11px] font-extrabold text-white disabled:opacity-50 ${
                    modal === "ENCERRAR"
                      ? "bg-[#137a3d]"
                      : "bg-amber-600"
                  }`}
                >
                  {modal === "ENCERRAR" ? (
                    <BadgeCheck size={16} />
                  ) : (
                    <History size={16} />
                  )}
                  {pending
                    ? "Registrando..."
                    : modal === "ENCERRAR"
                      ? "Confirmar encerramento"
                      : "Confirmar reabertura"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-slate-50 p-3">
      <p className="text-[8px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-[15px] font-extrabold text-slate-900">
        {value}
      </p>
    </div>
  );
}
