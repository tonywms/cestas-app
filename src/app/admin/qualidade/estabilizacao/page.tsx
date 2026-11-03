export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  History,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
  TimerReset,
} from "lucide-react";

import {
  HeaderLink,
  Hero,
  Kpi,
  KpiGrid,
  ModuleHeader,
} from "@/components/admin/PremiumModuleUi";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

import EncerramentoAssistidoClient from "./EncerramentoAssistidoClient";

/* V80_TERMO_ESTABILIZACAO_POS_GO_LIVE */

type EventoAuditoria = {
  entidade_id: string | null;
  acao: string | null;
  dados: unknown;
  created_at: string | null;
};

type Incidente = {
  id: string;
  severidade: string;
  abertoEm: string | null;
  primeiraAnaliseEm: string | null;
  resolvidoEm: string | null;
  reaberturas: number;
  status: "ABERTO" | "EM_ANALISE" | "RESOLVIDO";
};

type Controle = {
  acao: "OPERACAO_ASSISTIDA_ENCERRADA" | "OPERACAO_ASSISTIDA_REABERTA";
  createdAt: string | null;
  responsavel: string;
  perfil: string;
  observacao: string | null;
  motivo: string | null;
};

function objeto(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object"
    ? (valor as Record<string, unknown>)
    : {};
}

function texto(valor: unknown) {
  return typeof valor === "string" ? valor : "";
}

function dataValida(valor: string | null | undefined) {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

function dataHora(valor: string | null | undefined) {
  const data = dataValida(valor);
  if (!data) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function duracaoMinutos(inicio: string | null, fim: string | null) {
  const a = dataValida(inicio);
  const b = dataValida(fim);

  if (!a || !b) return null;

  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

function media(valores: number[]) {
  if (valores.length === 0) return null;

  return Math.round(
    valores.reduce((total, atual) => total + atual, 0) / valores.length,
  );
}

function formatarDuracao(minutos: number | null) {
  if (minutos === null || !Number.isFinite(minutos)) return "—";
  if (minutos < 60) return `${minutos} min`;

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return resto > 0 ? `${horas}h ${resto}min` : `${horas}h`;
}

export default async function EstabilizacaoPage() {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const autorizado =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo === "ADMINISTRADOR" ||
    usuario.perfilCodigo === "GESTOR";

  if (!autorizado) {
    redirect("/admin");
  }

  const supabase = await createClient();

  const [incidentesResult, controleResult, goLiveResult] = await Promise.all([
    supabase
      .from("auditoria_eventos")
      .select("entidade_id,acao,dados,created_at")
      .eq("empresa_id", usuario.empresa.id)
      .eq("entidade", "OPERACAO_ASSISTIDA")
      .in("acao", [
        "INCIDENTE_ABERTO",
        "INCIDENTE_EM_ANALISE",
        "INCIDENTE_RESOLVIDO",
        "INCIDENTE_REABERTO",
      ])
      .order("created_at", { ascending: true })
      .limit(5000),
    supabase
      .from("auditoria_eventos")
      .select("entidade_id,acao,dados,created_at")
      .eq("empresa_id", usuario.empresa.id)
      .eq("entidade", "OPERACAO_ASSISTIDA_CONTROLE")
      .in("acao", [
        "OPERACAO_ASSISTIDA_ENCERRADA",
        "OPERACAO_ASSISTIDA_REABERTA",
      ])
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("auditoria_eventos")
      .select("entidade_id,acao,dados,created_at")
      .eq("empresa_id", usuario.empresa.id)
      .eq("entidade", "GO_LIVE")
      .in("acao", ["GO_LIVE_LIBERADO", "GO_LIVE_NAO_LIBERADO"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const eventos = (incidentesResult.data ?? []) as EventoAuditoria[];
  const mapa = new Map<string, Incidente>();

  for (const evento of eventos) {
    const id = texto(evento.entidade_id);
    if (!id) continue;

    const dados = objeto(evento.dados);
    const atual = mapa.get(id);

    if (evento.acao === "INCIDENTE_ABERTO") {
      mapa.set(id, {
        id,
        severidade: texto(dados.severidade) || "BAIXA",
        abertoEm:
          texto(dados.aberto_em) || evento.created_at || null,
        primeiraAnaliseEm: null,
        resolvidoEm: null,
        reaberturas: 0,
        status: "ABERTO",
      });
      continue;
    }

    if (!atual) continue;

    if (evento.acao === "INCIDENTE_EM_ANALISE") {
      atual.status = "EM_ANALISE";

      if (!atual.primeiraAnaliseEm) {
        atual.primeiraAnaliseEm = evento.created_at;
      }
    }

    if (evento.acao === "INCIDENTE_RESOLVIDO") {
      atual.status = "RESOLVIDO";
      atual.resolvidoEm =
        texto(dados.resolvido_em) || evento.created_at || null;
    }

    if (evento.acao === "INCIDENTE_REABERTO") {
      atual.status = "ABERTO";
      atual.reaberturas += 1;
      atual.resolvidoEm = null;
    }

    mapa.set(id, atual);
  }

  const incidentes = Array.from(mapa.values());
  const abertos = incidentes.filter(
    (item) => item.status !== "RESOLVIDO",
  );
  const criticosAbertos = abertos.filter(
    (item) => item.severidade === "CRITICA",
  );
  const resolvidos = incidentes.filter(
    (item) => item.status === "RESOLVIDO",
  );
  const reaberturas = incidentes.reduce(
    (total, item) => total + item.reaberturas,
    0,
  );
  const criticosHistoricos = incidentes.filter(
    (item) => item.severidade === "CRITICA",
  ).length;

  const temposAnalise = incidentes
    .map((item) =>
      duracaoMinutos(item.abertoEm, item.primeiraAnaliseEm),
    )
    .filter((item): item is number => item !== null);

  const temposResolucao = resolvidos
    .map((item) => duracaoMinutos(item.abertoEm, item.resolvidoEm))
    .filter((item): item is number => item !== null);

  const mediaAnalise = media(temposAnalise);
  const mediaResolucao = media(temposResolucao);

  const controles: Controle[] = (controleResult.data ?? []).map(
    (evento) => {
      const dados = objeto(evento.dados);

      return {
        acao:
          evento.acao === "OPERACAO_ASSISTIDA_REABERTA"
            ? "OPERACAO_ASSISTIDA_REABERTA"
            : "OPERACAO_ASSISTIDA_ENCERRADA",
        createdAt: evento.created_at,
        responsavel:
          texto(dados.responsavel_nome) || "Usuário responsável",
        perfil: texto(dados.responsavel_perfil) || "GESTÃO",
        observacao: texto(dados.observacao) || null,
        motivo: texto(dados.motivo) || null,
      };
    },
  );

  const ultimoControle = controles[0] ?? null;
  const encerrada =
    ultimoControle?.acao === "OPERACAO_ASSISTIDA_ENCERRADA";

  const goLive = goLiveResult.data as EventoAuditoria | null;
  const goLiveLiberado = goLive?.acao === "GO_LIVE_LIBERADO";

  const leituraDisponivel =
    !incidentesResult.error &&
    !controleResult.error &&
    !goLiveResult.error;

  const podeEncerrar =
    leituraDisponivel &&
    goLiveLiberado &&
    abertos.length === 0 &&
    !encerrada;

  const estado = encerrada
    ? {
        titulo: "Operação assistida encerrada",
        descricao:
          "O termo de estabilização está registrado. O histórico permanece disponível e a operação pode ser reaberta caso surja nova necessidade de acompanhamento.",
        classe:
          "border-emerald-200 bg-[linear-gradient(135deg,#ecfdf3,#ffffff)] text-emerald-950",
      }
    : abertos.length > 0
      ? {
          titulo: "Encerramento bloqueado",
          descricao:
            "Existem incidentes em aberto. Resolva todos os pontos antes de formalizar a estabilização da operação.",
          classe:
            "border-amber-200 bg-[linear-gradient(135deg,#fff8e7,#ffffff)] text-amber-950",
        }
      : {
          titulo: "Pronto para encerrar a operação assistida",
          descricao:
            "Não existem incidentes abertos e o go-live permanece liberado. O termo de estabilização pode ser formalizado.",
          classe:
            "border-sky-200 bg-[linear-gradient(135deg,#eef8ff,#ffffff)] text-sky-950",
        };

  const leituraEm = dataHora(new Date().toISOString());

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto w-full max-w-[1600px]">
        <ModuleHeader
          eyebrow="Pós-go-live"
          title="Termo de estabilização"
          backHref="/admin/qualidade"
          actions={
            <>
              <HeaderLink href="/admin/qualidade/estabilidade">
                Estabilidade
              </HeaderLink>
              <HeaderLink href="/admin/qualidade/operacao-assistida">
                Operação assistida
              </HeaderLink>
              <HeaderLink
                href="/admin/qualidade/estabilizacao"
                variant="primary"
              >
                Atualizar leitura
              </HeaderLink>
            </>
          }
        />

        <Hero
          eyebrow="Encerramento da operação assistida"
          title="Formalize quando a operação estiver estabilizada."
          description="A V80 cruza o go-live, os incidentes da operação assistida e os indicadores de estabilidade antes de permitir o encerramento formal do acompanhamento."
          badge={
            <div className="rounded-[18px] border border-white/15 bg-white/[0.08] px-4 py-3 text-right">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-white/60">
                Leitura executada em
              </p>
              <p className="mt-1 text-[14px] font-extrabold text-white">
                {leituraEm}
              </p>
            </div>
          }
        >
          <KpiGrid>
            <Kpi
              label="Status"
              value={encerrada ? "ENCERRADA" : "EM ACOMPANHAMENTO"}
              subtitle="Situação da operação assistida"
            />
            <Kpi
              label="Incidentes"
              value={incidentes.length}
              subtitle="Total registrado na trilha"
            />
            <Kpi
              label="Em aberto"
              value={abertos.length}
              subtitle="Precisam estar zerados"
              warning={abertos.length > 0}
            />
            <Kpi
              label="Resolvidos"
              value={resolvidos.length}
              subtitle="Ocorrências encerradas"
            />
            <Kpi
              label="Reaberturas"
              value={reaberturas}
              subtitle="Reincidências registradas"
              warning={reaberturas > 0}
            />
            <Kpi
              label="Go-live"
              value={goLiveLiberado ? "LIBERADO" : "REVISAR"}
              subtitle="Decisão executiva atual"
              warning={!goLiveLiberado}
            />
          </KpiGrid>
        </Hero>

        <section
          className={`mt-5 rounded-[28px] border p-5 shadow-sm md:p-6 ${estado.classe}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white shadow-sm">
                {encerrada ? (
                  <BadgeCheck size={24} />
                ) : abertos.length > 0 ? (
                  <CircleAlert size={24} />
                ) : (
                  <ClipboardCheck size={24} />
                )}
              </div>

              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-65">
                  Situação consolidada
                </p>
                <h2 className="mt-1 text-[24px] font-extrabold tracking-[-0.04em]">
                  {estado.titulo}
                </h2>
                <p className="mt-2 max-w-[980px] text-[13px] leading-6 opacity-75">
                  {estado.descricao}
                </p>
              </div>
            </div>

            <span className="rounded-full bg-white px-4 py-2 text-[10px] font-extrabold uppercase shadow-sm">
              {abertos.length === 0
                ? "0 incidente aberto"
                : `${abertos.length} incidente(s) aberto(s)`}
            </span>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Resumo
            icon={<Clock3 size={19} />}
            label="Tempo até análise"
            valor={formatarDuracao(mediaAnalise)}
            texto="Média entre abertura e primeira análise."
          />
          <Resumo
            icon={<TimerReset size={19} />}
            label="Tempo até resolução"
            valor={formatarDuracao(mediaResolucao)}
            texto="Média até a resolução atual dos incidentes encerrados."
          />
          <Resumo
            icon={<History size={19} />}
            label="Reaberturas"
            valor={String(reaberturas)}
            texto="Quantidade total de reincidências na trilha."
          />
          <Resumo
            icon={<ShieldCheck size={19} />}
            label="Críticos históricos"
            valor={String(criticosHistoricos)}
            texto={`${criticosAbertos.length} crítico(s) permanece(m) aberto(s).`}
          />
        </section>

        <EncerramentoAssistidoClient
          encerrada={encerrada}
          podeEncerrar={podeEncerrar}
          leituraDisponivel={leituraDisponivel}
          goLiveLiberado={goLiveLiberado}
          incidentes={incidentes.length}
          abertos={abertos.length}
          resolvidos={resolvidos.length}
          reaberturas={reaberturas}
          criticosHistoricos={criticosHistoricos}
          mediaAnalise={mediaAnalise}
          mediaResolucao={mediaResolucao}
        />

        <section className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-slate-50 text-slate-700">
                <History size={20} />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#b28735]">
                  Governança
                </p>
                <h3 className="mt-1 text-[20px] font-extrabold tracking-[-0.03em]">
                  Histórico do termo de estabilização
                </h3>
              </div>
            </div>

            {controles.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-[18px] border border-slate-200">
                {controles.map((item, index) => (
                  <div
                    key={`${item.acao}-${item.createdAt}-${index}`}
                    className={`grid gap-3 px-4 py-4 md:grid-cols-[190px_1fr_180px] ${
                      index > 0 ? "border-t border-slate-100" : ""
                    }`}
                  >
                    <div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1.5 text-[9px] font-extrabold uppercase ${
                          item.acao === "OPERACAO_ASSISTIDA_ENCERRADA"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.acao === "OPERACAO_ASSISTIDA_ENCERRADA"
                          ? "Encerrada"
                          : "Reaberta"}
                      </span>
                      <p className="mt-2 text-[9px] font-semibold text-slate-400">
                        {dataHora(item.createdAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-extrabold text-slate-700">
                        {item.responsavel} • {item.perfil}
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500">
                        {item.observacao ||
                          item.motivo ||
                          "Sem observação registrada."}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-[8px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                        Registro
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-slate-600">
                        Auditoria do pós-go-live
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-5 text-[11px] leading-5 text-slate-500">
                Nenhum encerramento ou reabertura da operação assistida foi
                formalizado ainda.
              </div>
            )}
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-sm md:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-white text-slate-700 shadow-sm">
              <LockKeyhole size={20} />
            </div>
            <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
              Proteção
            </p>
            <h3 className="mt-1 text-[20px] font-extrabold tracking-[-0.03em] text-slate-950">
              Incidente aberto impede encerramento.
            </h3>
            <p className="mt-3 text-[12px] leading-6 text-slate-500">
              O termo só pode ser registrado quando todos os incidentes estão
              resolvidos e a decisão executiva de go-live permanece liberada.
              A reabertura do acompanhamento também fica registrada.
            </p>

            <div className="mt-5 space-y-2">
              <Link
                href="/admin/qualidade/operacao-assistida"
                className="flex min-h-[46px] items-center justify-center rounded-[14px] border border-slate-200 bg-white px-4 text-[11px] font-extrabold text-slate-700"
              >
                Revisar operação assistida
              </Link>
              <Link
                href="/admin/qualidade/estabilidade"
                className="flex min-h-[46px] items-center justify-center rounded-[14px] bg-[#137a3d] px-4 text-[11px] font-extrabold text-white"
              >
                Revisar indicadores de estabilidade
              </Link>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

function Resumo({
  icon,
  label,
  valor,
  texto,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
  texto: string;
}) {
  return (
    <article className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700">
        {icon}
      </div>
      <p className="mt-3 text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-[22px] font-extrabold text-slate-950">
        {valor}
      </p>
      <p className="mt-2 text-[10px] leading-5 text-slate-500">
        {texto}
      </p>
    </article>
  );
}
