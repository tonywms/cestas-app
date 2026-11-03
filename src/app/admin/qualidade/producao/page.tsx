export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  BadgeCheck,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Cloud,
  Database,
  GitCommitHorizontal,
  History,
  Rocket,
  ServerCog,
  ShieldCheck,
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

import CertificarProducaoClient from "./CertificarProducaoClient";

/* V77_CERTIFICACAO_POS_GO_LIVE */

type EventoAuditoria = {
  acao: string | null;
  dados: unknown;
  created_at: string | null;
  entidade_id: string | null;
};

type CertificacaoHistorico = {
  id: string;
  status: "SAUDAVEL";
  certificadoEm: string;
  responsavel: string;
  perfil: string;
  observacao: string | null;
  goLiveEntidadeId: string | null;
  ambiente: string;
  commit: string | null;
};

function objeto(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object"
    ? (valor as Record<string, unknown>)
    : {};
}

function texto(valor: unknown) {
  return typeof valor === "string" ? valor : "";
}

function numero(valor: unknown) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
}

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

function ambienteAtual() {
  if (process.env.VERCEL_ENV === "production") return "Produção Vercel";
  if (process.env.VERCEL_ENV === "preview") return "Preview Vercel";
  return "Desenvolvimento local";
}

export default async function SaudeProducaoPage() {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const podeAuditar =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo === "ADMINISTRADOR" ||
    usuario.perfilCodigo === "GESTOR";

  if (!podeAuditar) {
    redirect("/admin");
  }

  const supabase = await createClient();

  const [goLiveResult, homologacaoResult, certificacoesResult] =
    await Promise.all([
      supabase
        .from("auditoria_eventos")
        .select("acao,dados,created_at,entidade_id")
        .eq("empresa_id", usuario.empresa.id)
        .eq("entidade", "GO_LIVE")
        .in("acao", ["GO_LIVE_LIBERADO", "GO_LIVE_NAO_LIBERADO"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("auditoria_eventos")
        .select("acao,dados,created_at,entidade_id")
        .eq("empresa_id", usuario.empresa.id)
        .eq("entidade", "HOMOLOGACAO_OPERACIONAL")
        .in("acao", ["HOMOLOGACAO_CONCLUIDA", "HOMOLOGACAO_REINICIADA"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("auditoria_eventos")
        .select("acao,dados,created_at,entidade_id")
        .eq("empresa_id", usuario.empresa.id)
        .eq("entidade", "PRODUCAO_SAUDE")
        .eq("acao", "PRODUCAO_CERTIFICADA")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const goLiveEvento = (goLiveResult.data ?? null) as EventoAuditoria | null;
  const homologacaoEvento = (homologacaoResult.data ??
    null) as EventoAuditoria | null;

  const goLiveDados = objeto(goLiveEvento?.dados);
  const gateDados = objeto(goLiveDados.gate);

  const goLiveEntidadeId = texto(goLiveEvento?.entidade_id) || null;
  const homologacaoVinculadaId =
    texto(goLiveDados.homologacao_entidade_id) || null;

  const goLiveLiberado = goLiveEvento?.acao === "GO_LIVE_LIBERADO";

  const gateAprovado =
    numero(gateDados.frentes_verificadas) === 4 &&
    numero(gateDados.aprovadas) === 4 &&
    numero(gateDados.revisoes) === 0 &&
    numero(gateDados.bloqueadas) === 0 &&
    numero(gateDados.indisponiveis) === 0 &&
    ["estoque", "credito", "financeiro", "seguranca"].every(
      (chave) => texto(gateDados[chave]) === "APROVADO",
    );

  const homologacaoAtualConfere = Boolean(
    homologacaoEvento?.acao === "HOMOLOGACAO_CONCLUIDA" &&
      homologacaoVinculadaId &&
      homologacaoEvento?.entidade_id === homologacaoVinculadaId,
  );

  let invalidadores: Array<{
    acao: string | null;
    created_at: string | null;
  }> = [];
  let invalidadoresErro: unknown = null;

  if (goLiveEvento?.created_at) {
    const resultado = await supabase
      .from("auditoria_eventos")
      .select("acao,created_at")
      .eq("empresa_id", usuario.empresa.id)
      .in("acao", ["HOMOLOGACAO_REINICIADA", "GO_LIVE_NAO_LIBERADO"])
      .gt("created_at", goLiveEvento.created_at)
      .order("created_at", { ascending: false })
      .limit(20);

    invalidadores = resultado.data ?? [];
    invalidadoresErro = resultado.error;
  }

  const auditoriaDisponivel =
    !goLiveResult.error &&
    !homologacaoResult.error &&
    !certificacoesResult.error &&
    !invalidadoresErro;

  const semInvalidacaoPosterior = invalidadores.length === 0;

  const ambiente = ambienteAtual();
  const ambienteProducao = process.env.VERCEL_ENV === "production";
  const commit =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ||
    process.env.VERCEL_GIT_COMMIT_REF ||
    null;

  const prontoTecnicamente =
    goLiveLiberado &&
    gateAprovado &&
    homologacaoAtualConfere &&
    auditoriaDisponivel &&
    semInvalidacaoPosterior;

  const prontoCertificar = prontoTecnicamente && ambienteProducao;

  const historico: CertificacaoHistorico[] = (
    certificacoesResult.data ?? []
  ).map((evento) => {
    const dados = objeto(evento.dados);

    return {
      id: texto(evento.entidade_id) || texto(evento.created_at) || "certificacao",
      status: "SAUDAVEL" as const,
      certificadoEm:
        texto(dados.certificado_em) || texto(evento.created_at),
      responsavel:
        texto(dados.responsavel_nome) || "Responsável da certificação",
      perfil: texto(dados.responsavel_perfil) || "GESTÃO",
      observacao: texto(dados.observacao) || null,
      goLiveEntidadeId: texto(dados.go_live_entidade_id) || null,
      ambiente: texto(dados.ambiente) || "Produção",
      commit: texto(dados.commit) || null,
    };
  });

  const certificacaoAtual =
    goLiveEntidadeId
      ? historico.find(
          (item) => item.goLiveEntidadeId === goLiveEntidadeId,
        ) ?? null
      : null;

  const statusHero = !prontoTecnicamente
    ? {
        titulo: "Atenção pós-go-live",
        descricao:
          "A leitura encontrou uma condição que precisa ser revisada antes de certificar a saúde da produção.",
        classe:
          "border-amber-200 bg-[linear-gradient(135deg,#fff8e7,#ffffff)] text-amber-950",
      }
    : !ambienteProducao
      ? {
          titulo: "Pronto para validar em produção",
          descricao:
            "O go-live, a homologação e o Gate estão coerentes. Publique a V77 e execute esta certificação na URL Production do Vercel.",
          classe:
            "border-sky-200 bg-[linear-gradient(135deg,#eef8ff,#ffffff)] text-sky-950",
        }
      : certificacaoAtual
        ? {
            titulo: "Produção certificada",
            descricao:
              "A saúde desta versão de produção já foi certificada e registrada na auditoria.",
            classe:
              "border-emerald-200 bg-[linear-gradient(135deg,#ecfdf3,#ffffff)] text-emerald-950",
          }
        : {
            titulo: "Produção saudável para certificação",
            descricao:
              "Todos os controles de governança estão válidos e esta execução está no ambiente Production do Vercel.",
            classe:
              "border-emerald-200 bg-[linear-gradient(135deg,#ecfdf3,#ffffff)] text-emerald-950",
          };

  const checks = [
    {
      titulo: "Go-live executivo",
      detalhe: goLiveLiberado
        ? `Liberado em ${dataHora(texto(goLiveDados.decidido_em) || goLiveEvento?.created_at)}`
        : "Não existe liberação executiva válida como decisão atual.",
      ok: goLiveLiberado,
      icon: Rocket,
    },
    {
      titulo: "Homologação operacional",
      detalhe: homologacaoAtualConfere
        ? "Rodada 7/7 atual permanece vinculada ao go-live."
        : "A homologação atual não corresponde à rodada liberada.",
      ok: homologacaoAtualConfere,
      icon: BadgeCheck,
    },
    {
      titulo: "Gate técnico",
      detalhe: gateAprovado
        ? "Snapshot de liberação registra 4/4 frentes aprovadas."
        : "O snapshot técnico do go-live não está integralmente aprovado.",
      ok: gateAprovado,
      icon: ShieldCheck,
    },
    {
      titulo: "Auditoria e Supabase",
      detalhe: auditoriaDisponivel
        ? "Leitura auditável disponível para a empresa atual."
        : "Uma ou mais leituras da auditoria falharam.",
      ok: auditoriaDisponivel,
      icon: Database,
    },
    {
      titulo: "Integridade pós-liberação",
      detalhe: semInvalidacaoPosterior
        ? "Nenhum reinício de homologação ou não liberação posterior foi encontrado."
        : `${invalidadores.length} evento(s) posterior(es) invalidam a certificação automática.`,
      ok: semInvalidacaoPosterior,
      icon: Activity,
    },
    {
      titulo: "Ambiente executado",
      detalhe: ambienteProducao
        ? `Production Vercel${commit ? ` • commit ${commit}` : ""}`
        : `${ambiente}. A certificação final fica bloqueada fora da produção.`,
      ok: ambienteProducao,
      icon: Cloud,
    },
  ];

  const executadoEm = dataHora(new Date().toISOString());

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto w-full max-w-[1600px]">
        <ModuleHeader
          eyebrow="Qualidade e governança"
          title="Saúde da produção"
          backHref="/admin/qualidade"
          actions={
            <>
              {/* V78_OPERACAO_ASSISTIDA_LINK */}
              <HeaderLink href="/admin/qualidade/operacao-assistida">
                Operação assistida
              </HeaderLink>
              <HeaderLink href="/admin/qualidade/liberacao">
                Gate de liberação
              </HeaderLink>
              <HeaderLink
                href="/admin/qualidade/producao"
                variant="primary"
              >
                Atualizar leitura
              </HeaderLink>
            </>
          }
        />

        <Hero
          eyebrow="Certificação pós-go-live"
          title="Confirme que a versão liberada permanece saudável."
          description="A leitura cruza a decisão executiva, a homologação 7/7, o snapshot técnico 4/4, a trilha de auditoria e o ambiente em execução. A certificação não movimenta dados operacionais."
          badge={
            <div className="rounded-[18px] border border-white/15 bg-white/[0.08] px-4 py-3 text-right">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-white/60">
                Leitura executada em
              </p>
              <p className="mt-1 text-[14px] font-extrabold text-white">
                {executadoEm}
              </p>
            </div>
          }
        >
          <KpiGrid>
            <Kpi
              label="Go-live"
              value={goLiveLiberado ? "LIBERADO" : "REVISAR"}
              subtitle={
                goLiveLiberado
                  ? dataHora(texto(goLiveDados.decidido_em) || goLiveEvento?.created_at)
                  : "Sem liberação válida"
              }
              warning={!goLiveLiberado}
            />
            <Kpi
              label="Homologação"
              value={homologacaoAtualConfere ? "7/7" : "REVISAR"}
              subtitle="Rodada operacional vinculada"
              warning={!homologacaoAtualConfere}
            />
            <Kpi
              label="Gate"
              value={gateAprovado ? "4/4" : "REVISAR"}
              subtitle="Snapshot técnico da liberação"
              warning={!gateAprovado}
            />
            <Kpi
              label="Supabase"
              value={auditoriaDisponivel ? "CONECTADO" : "ATENÇÃO"}
              subtitle="Auditoria da empresa atual"
              warning={!auditoriaDisponivel}
            />
            <Kpi
              label="Ambiente"
              value={ambienteProducao ? "PRODUCTION" : "LOCAL"}
              subtitle={commit ? `Commit ${commit}` : ambiente}
              warning={!ambienteProducao}
            />
            <Kpi
              label="Certificação"
              value={certificacaoAtual ? "CERTIFICADA" : "PENDENTE"}
              subtitle={
                certificacaoAtual
                  ? dataHora(certificacaoAtual.certificadoEm)
                  : "Aguardando validação final"
              }
              warning={!certificacaoAtual}
            />
          </KpiGrid>
        </Hero>

        <section
          className={`mt-5 rounded-[28px] border p-5 shadow-sm md:p-6 ${statusHero.classe}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white shadow-sm">
                {prontoTecnicamente ? (
                  <CheckCircle2 size={24} />
                ) : (
                  <CircleAlert size={24} />
                )}
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-65">
                  Resultado pós-go-live
                </p>
                <h2 className="mt-1 text-[24px] font-extrabold tracking-[-0.04em]">
                  {statusHero.titulo}
                </h2>
                <p className="mt-2 max-w-[980px] text-[13px] leading-6 opacity-75">
                  {statusHero.descricao}
                </p>
              </div>
            </div>

            <span className="rounded-full bg-white px-4 py-2 text-[10px] font-extrabold uppercase shadow-sm">
              {checks.filter((item) => item.ok).length}/6 controles válidos
            </span>
          </div>
        </section>

        <section className="mt-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#b28735]">
                Checklist de saúde
              </p>
              <h2 className="mt-1 text-[23px] font-extrabold tracking-[-0.04em]">
                O que sustenta a certificação
              </h2>
            </div>

            <div className="text-right text-[11px] text-slate-500">
              <p>{usuario.empresa.nomeFantasia}</p>
              <p className="mt-1 font-semibold">{ambiente}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {checks.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.titulo}
                  className={`rounded-[24px] border p-5 shadow-sm ${
                    item.ok
                      ? "border-emerald-100 bg-emerald-50/55"
                      : "border-amber-200 bg-amber-50/65"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] ${
                        item.ok
                          ? "bg-white text-emerald-700"
                          : "bg-white text-amber-700"
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[16px] font-extrabold text-slate-950">
                          {item.titulo}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase ${
                            item.ok
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.ok ? "OK" : "REVISAR"}
                        </span>
                      </div>
                      <p className="mt-2 text-[12px] leading-5 text-slate-500">
                        {item.detalhe}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <CertificarProducaoClient
          pronto={prontoCertificar}
          prontoTecnicamente={prontoTecnicamente}
          ambienteProducao={ambienteProducao}
          jaCertificada={Boolean(certificacaoAtual)}
          goLiveEntidadeId={goLiveEntidadeId}
          goLiveData={dataHora(
            texto(goLiveDados.decidido_em) || goLiveEvento?.created_at,
          )}
          homologacaoEntidadeId={homologacaoVinculadaId}
          commit={commit}
        />

        <section className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-slate-50 text-slate-700">
                <History size={20} />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#b28735]">
                  Histórico
                </p>
                <h3 className="mt-1 text-[20px] font-extrabold tracking-[-0.03em]">
                  Certificações da produção
                </h3>
              </div>
            </div>

            {historico.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-[18px] border border-slate-200">
                {historico.map((item, index) => (
                  <div
                    key={item.id}
                    className={`grid gap-3 px-4 py-4 md:grid-cols-[180px_1fr_180px] ${
                      index > 0 ? "border-t border-slate-100" : ""
                    }`}
                  >
                    <div>
                      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1.5 text-[9px] font-extrabold uppercase text-emerald-800">
                        PRODUÇÃO SAUDÁVEL
                      </span>
                      <p className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                        <Clock3 size={12} />
                        {dataHora(item.certificadoEm)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-extrabold text-slate-800">
                        {item.responsavel} • {item.perfil}
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500">
                        {item.observacao || "Sem observação registrada."}
                      </p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                        Ambiente / commit
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-slate-600">
                        {item.ambiente}
                      </p>
                      {item.commit ? (
                        <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                          <GitCommitHorizontal size={11} />
                          {item.commit}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-5 text-[12px] leading-5 text-slate-500">
                Nenhuma certificação de produção foi registrada ainda.
              </div>
            )}
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-sm md:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-white text-slate-700 shadow-sm">
              <ServerCog size={20} />
            </div>
            <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
              Proteção do processo
            </p>
            <h3 className="mt-1 text-[20px] font-extrabold tracking-[-0.03em] text-slate-950">
              Certificar não altera a operação.
            </h3>
            <p className="mt-3 text-[12px] leading-6 text-slate-500">
              A V77 registra somente uma evidência de governança em
              auditoria_eventos. Ela não cria carga, não movimenta estoque,
              não altera crédito, não fecha financeiro e não muda permissões.
            </p>

            <div className="mt-5 space-y-2">
              <Link
                href="/admin/qualidade/liberacao"
                className="flex min-h-[46px] items-center justify-center rounded-[14px] border border-slate-200 bg-white px-4 text-[11px] font-extrabold text-slate-700"
              >
                Revisar Gate de liberação
              </Link>
              <Link
                href="/admin/qualidade"
                className="flex min-h-[46px] items-center justify-center rounded-[14px] bg-[#137a3d] px-4 text-[11px] font-extrabold text-white"
              >
                Voltar à Central de certificações
              </Link>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
