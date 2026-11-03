"use client";

import {
  BadgeCheck,
  CheckCircle2,
  Cloud,
  Rocket,
  ShieldCheck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { certificarProducao } from "./actions";

type Props = {
  pronto: boolean;
  prontoTecnicamente: boolean;
  ambienteProducao: boolean;
  jaCertificada: boolean;
  goLiveEntidadeId: string | null;
  goLiveData: string;
  homologacaoEntidadeId: string | null;
  commit: string | null;
};

export default function CertificarProducaoClient({
  pronto,
  prontoTecnicamente,
  ambienteProducao,
  jaCertificada,
  goLiveEntidadeId,
  goLiveData,
  homologacaoEntidadeId,
  commit,
}: Props) {
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [pending, startTransition] = useTransition();

  function confirmar() {
    if (!pronto || pending) return;

    setErro("");
    setMensagem("");

    startTransition(async () => {
      const resultado = await certificarProducao({
        observacao,
        goLiveEntidadeId,
      });

      if (!resultado.success) {
        setErro(resultado.message);
        return;
      }

      setMensagem(resultado.message);
      setModal(false);
      setObservacao("");
      router.refresh();
    });
  }

  const motivoBloqueio = !prontoTecnicamente
    ? "A certificação está bloqueada porque uma das evidências de governança precisa ser revisada."
    : !ambienteProducao
      ? "A leitura local está coerente, mas a certificação final só é habilitada na URL Production do Vercel."
      : "";

  return (
    <section className="mt-5 overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-sm">
      <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
        <div className="p-5 md:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-emerald-50 text-emerald-700">
              <BadgeCheck size={23} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#b28735]">
                Evidência final
              </p>
              <h2 className="mt-1 text-[22px] font-extrabold tracking-[-0.03em] text-slate-950">
                {jaCertificada
                  ? "Produção já certificada nesta liberação"
                  : "Certificar saúde da produção"}
              </h2>
              <p className="mt-2 max-w-[760px] text-[12px] leading-6 text-slate-500">
                Registra uma evidência auditável vinculada ao go-live atual.
                Nenhum dado operacional é alterado.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[18px] bg-emerald-50 p-4">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-emerald-700/60">
                Go-live
              </p>
              <p className="mt-1 text-[14px] font-extrabold text-emerald-950">
                LIBERADO
              </p>
              <p className="mt-1 text-[10px] text-emerald-800/70">
                {goLiveData}
              </p>
            </div>
            <div className="rounded-[18px] bg-emerald-50 p-4">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-emerald-700/60">
                Homologação
              </p>
              <p className="mt-1 text-[14px] font-extrabold text-emerald-950">
                7/7
              </p>
              <p className="mt-1 truncate text-[10px] text-emerald-800/70">
                {homologacaoEntidadeId || "—"}
              </p>
            </div>
            <div className="rounded-[18px] bg-emerald-50 p-4">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-emerald-700/60">
                Versão
              </p>
              <p className="mt-1 text-[14px] font-extrabold text-emerald-950">
                {commit || "LOCAL"}
              </p>
              <p className="mt-1 text-[10px] text-emerald-800/70">
                {ambienteProducao ? "Production Vercel" : "Desenvolvimento local"}
              </p>
            </div>
          </div>

          {motivoBloqueio ? (
            <div className="mt-5 rounded-[18px] border border-amber-200 bg-amber-50 p-4 text-[11px] font-semibold leading-5 text-amber-900">
              {motivoBloqueio}
            </div>
          ) : null}

          {mensagem ? (
            <div className="mt-5 rounded-[18px] border border-emerald-200 bg-emerald-50 p-4 text-[11px] font-semibold text-emerald-800">
              {mensagem}
            </div>
          ) : null}

          <button
            type="button"
            disabled={!pronto || pending}
            onClick={() => {
              setErro("");
              setMensagem("");
              setModal(true);
            }}
            className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#137a3d] px-5 text-[12px] font-extrabold text-white shadow-[0_12px_28px_rgba(19,122,61,0.18)] transition hover:bg-[#0f6934] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCircle2 size={17} />
            {jaCertificada
              ? "Registrar nova certificação"
              : "Certificar produção saudável"}
          </button>
        </div>

        <div className="border-t border-slate-100 bg-slate-50 p-5 md:p-6 lg:border-l lg:border-t-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-white text-slate-700 shadow-sm">
            <ShieldCheck size={20} />
          </div>
          <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
            Regra de segurança
          </p>
          <h3 className="mt-1 text-[19px] font-extrabold tracking-[-0.03em] text-slate-950">
            A certificação é vinculada à liberação atual.
          </h3>
          <p className="mt-3 text-[12px] leading-6 text-slate-500">
            Se uma nova homologação for iniciada, ou se surgir uma decisão
            posterior de não liberação, esta evidência permanece no histórico,
            mas deixa de representar a situação atual.
          </p>
        </div>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#132219]/60 p-4 backdrop-blur-[4px]">
          <div className="w-full max-w-[560px] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_100px_rgba(0,0,0,0.30)]">
            <div className="bg-[#176f3c] px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white/12">
                    <Rocket size={22} />
                  </div>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/70">
                      Confirmação pós-go-live
                    </p>
                    <h3 className="mt-1 text-[22px] font-extrabold tracking-[-0.03em]">
                      Certificar produção saudável?
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[16px] bg-emerald-50 p-3">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-emerald-700/60">
                    Governança
                  </p>
                  <p className="mt-1 text-[16px] font-extrabold text-emerald-950">
                    4/4 + 7/7
                  </p>
                </div>
                <div className="rounded-[16px] bg-emerald-50 p-3">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-emerald-700/60">
                    Ambiente
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[16px] font-extrabold text-emerald-950">
                    <Cloud size={15} /> Production
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  Observação da certificação
                </label>
                <textarea
                  value={observacao}
                  onChange={(event) =>
                    setObservacao(event.target.value.slice(0, 1000))
                  }
                  placeholder="Opcional. Ex.: navegação, autenticação e módulos críticos validados após o deploy."
                  className="mt-2 min-h-[110px] w-full resize-none rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] leading-5 outline-none transition focus:border-emerald-300 focus:bg-white"
                />
                <div className="mt-1 text-right text-[9px] font-semibold text-slate-400">
                  {observacao.length}/1000
                </div>
              </div>

              <div className="mt-4 rounded-[16px] border border-amber-200 bg-amber-50 p-4 text-[11px] leading-5 text-amber-900">
                Esta ação registra somente uma evidência em auditoria_eventos.
                Não executa deploy e não altera estoque, crédito, financeiro ou
                permissões.
              </div>

              {erro ? (
                <div className="mt-3 rounded-[14px] border border-red-200 bg-red-50 p-3 text-[11px] font-semibold text-red-700">
                  {erro}
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  disabled={pending}
                  className="min-h-[50px] rounded-[15px] border border-slate-200 bg-white px-4 text-[11px] font-extrabold text-slate-600 disabled:opacity-50"
                >
                  Voltar e revisar
                </button>
                <button
                  type="button"
                  onClick={confirmar}
                  disabled={pending}
                  className="flex min-h-[50px] items-center justify-center gap-2 rounded-[15px] bg-[#137a3d] px-4 text-[11px] font-extrabold text-white disabled:opacity-50"
                >
                  <BadgeCheck size={16} />
                  {pending ? "Registrando..." : "Confirmar certificação"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
