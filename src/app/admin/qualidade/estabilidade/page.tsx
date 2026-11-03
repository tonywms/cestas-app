export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Clock3,
  Flame,
  Gauge,
  History,
  Layers3,
  RefreshCcw,
  ShieldCheck,
  TimerReset,
  TrendingDown,
  TriangleAlert,
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

/* V79_PAINEL_EXECUTIVO_ESTABILIDADE */

type EventoAuditoria = {
  entidade_id: string | null;
  acao: string | null;
  dados: unknown;
  created_at: string | null;
};

type Incidente = {
  id: string;
  titulo: string;
  modulo: string;
  severidade: string;
  abertoEm: string | null;
  primeiraAnaliseEm: string | null;
  resolvidoEm: string | null;
  reaberturas: number;
  status: "ABERTO" | "EM_ANALISE" | "RESOLVIDO";
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

function moduloRotulo(valor: string) {
  const mapa: Record<string, string> = {
    ESTOQUE: "Estoque",
    CARGAS: "Cargas",
    VENDAS: "Vendas",
    CLIENTES: "Clientes",
    ROTAS: "Rotas",
    FINANCEIRO: "Financeiro",
    CREDITO: "Crédito",
    PERMISSOES: "Permissões",
    MOBILE: "Mobile",
    AUTENTICACAO: "Autenticação",
    INTEGRACOES: "Integrações",
    OUTROS: "Outros",
  };

  return mapa[valor] ?? (valor || "Outros");
}

function severidadeRotulo(valor: string) {
  if (valor === "CRITICA") return "Crítica";
  if (valor === "ALTA") return "Alta";
  if (valor === "MEDIA") return "Média";
  return "Baixa";
}

function duracaoMinutos(inicio: string | null, fim: string | null) {
  const a = dataValida(inicio);
  const b = dataValida(fim);
  if (!a || !b) return null;

  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

function formatarDuracao(minutos: number | null) {
  if (minutos === null || !Number.isFinite(minutos)) return "—";
  if (minutos < 60) return `${minutos} min`;

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  if (horas < 24) {
    return resto > 0 ? `${horas}h ${resto}min` : `${horas}h`;
  }

  const dias = Math.floor(horas / 24);
  const horasRestantes = horas % 24;

  return horasRestantes > 0
    ? `${dias}d ${horasRestantes}h`
    : `${dias}d`;
}

function media(valores: number[]) {
  if (valores.length === 0) return null;
  return Math.round(
    valores.reduce((total, atual) => total + atual, 0) / valores.length,
  );
}

function inicioJanela(dias: number) {
  return Date.now() - dias * 24 * 60 * 60 * 1000;
}

function estaNaJanela(valor: string | null, dias: number) {
  const data = dataValida(valor);
  return Boolean(data && data.getTime() >= inicioJanela(dias));
}

export default async function EstabilidadePage() {
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

  const { data, error } = await supabase
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
    .limit(5000);

  const eventos = (data ?? []) as EventoAuditoria[];
  const mapa = new Map<string, Incidente>();

  for (const evento of eventos) {
    const id = texto(evento.entidade_id);
    if (!id) continue;

    const dados = objeto(evento.dados);
    const atual = mapa.get(id);

    if (evento.acao === "INCIDENTE_ABERTO") {
      mapa.set(id, {
        id,
        titulo: texto(dados.titulo) || "Incidente sem título",
        modulo: texto(dados.modulo) || "OUTROS",
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
  const atuaisAbertos = incidentes.filter(
    (item) => item.status !== "RESOLVIDO",
  );
  const atuaisCriticos = atuaisAbertos.filter(
    (item) => item.severidade === "CRITICA",
  );

  const janelas = [1, 7, 30].map((dias) => {
    const abertos = incidentes.filter((item) =>
      estaNaJanela(item.abertoEm, dias),
    );

    const resolvidos = incidentes.filter(
      (item) =>
        item.status === "RESOLVIDO" &&
        estaNaJanela(item.resolvidoEm, dias),
    );

    const criticos = abertos.filter(
      (item) => item.severidade === "CRITICA",
    );

    const reabertos = abertos.filter((item) => item.reaberturas > 0);

    return {
      dias,
      abertos: abertos.length,
      resolvidos: resolvidos.length,
      criticos: criticos.length,
      reabertos: reabertos.length,
    };
  });

  const ultimos30 = incidentes.filter((item) =>
    estaNaJanela(item.abertoEm, 30),
  );

  const temposAnalise = ultimos30
    .map((item) => duracaoMinutos(item.abertoEm, item.primeiraAnaliseEm))
    .filter((item): item is number => item !== null);

  const temposResolucao = ultimos30
    .map((item) => duracaoMinutos(item.abertoEm, item.resolvidoEm))
    .filter((item): item is number => item !== null);

  const mediaAnalise = media(temposAnalise);
  const mediaResolucao = media(temposResolucao);

  const reincidentes = ultimos30.filter((item) => item.reaberturas > 0);
  const taxaReabertura =
    ultimos30.length > 0
      ? Math.round((reincidentes.length / ultimos30.length) * 100)
      : 0;

  const porModulo = new Map<string, number>();
  for (const item of ultimos30) {
    porModulo.set(item.modulo, (porModulo.get(item.modulo) ?? 0) + 1);
  }

  const rankingModulos = Array.from(porModulo.entries())
    .map(([modulo, quantidade]) => ({ modulo, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade || a.modulo.localeCompare(b.modulo))
    .slice(0, 8);

  const maxModulo = Math.max(
    1,
    ...rankingModulos.map((item) => item.quantidade),
  );

  const recentes = [...ultimos30]
    .sort(
      (a, b) =>
        (dataValida(b.abertoEm)?.getTime() ?? 0) -
        (dataValida(a.abertoEm)?.getTime() ?? 0),
    )
    .slice(0, 10);

  const estado =
    error || atuaisCriticos.length > 0
      ? {
          titulo: error
            ? "Leitura de estabilidade com atenção"
            : "Estabilidade em estado crítico",
          descricao: error
            ? "A trilha da operação assistida não pôde ser lida integralmente."
            : "Existe incidente crítico em aberto. O painel executivo mantém a estabilidade em estado crítico até a resolução.",
          classe:
            "border-red-200 bg-[linear-gradient(135deg,#fff1f2,#ffffff)] text-red-950",
          badge: "CRÍTICO",
        }
      : atuaisAbertos.length > 0
        ? {
            titulo: "Estabilidade em atenção",
            descricao:
              "Existem incidentes operacionais em aberto. A operação segue acompanhada até o encerramento.",
            classe:
              "border-amber-200 bg-[linear-gradient(135deg,#fff8e7,#ffffff)] text-amber-950",
            badge: "ATENÇÃO",
          }
        : {
            titulo: "Estabilidade operacional saudável",
            descricao:
              "Não existem incidentes em aberto. O histórico permanece disponível para análise de tendência e reincidência.",
            classe:
              "border-emerald-200 bg-[linear-gradient(135deg,#ecfdf3,#ffffff)] text-emerald-950",
            badge: "SAUDÁVEL",
          };

  const leituraEm = dataHora(new Date().toISOString());

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto w-full max-w-[1600px]">
        <ModuleHeader
          eyebrow="Pós-go-live"
          title="Estabilidade operacional"
          backHref="/admin/qualidade"
          actions={
            <>
              {/* V80_ESTABILIZACAO_LINK */}
              <HeaderLink href="/admin/qualidade/estabilizacao">
                Termo de estabilização
              </HeaderLink>
              <HeaderLink href="/admin/qualidade/operacao-assistida">
                Operação assistida
              </HeaderLink>
              <HeaderLink href="/admin/qualidade/producao">
                Saúde da produção
              </HeaderLink>
              <HeaderLink
                href="/admin/qualidade/estabilidade"
                variant="primary"
              >
                Atualizar indicadores
              </HeaderLink>
            </>
          }
        />

        <Hero
          eyebrow="Visão executiva"
          title="Transforme incidentes em indicadores de estabilidade."
          description="A V79 consolida a trilha da operação assistida em volume de incidentes, criticidade, reincidência, tempo até análise, tempo até resolução e módulos mais afetados."
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
              label="Estado atual"
              value={estado.badge}
              subtitle="Consolidação dos incidentes atuais"
              warning={estado.badge !== "SAUDÁVEL"}
            />
            <Kpi
              label="Abertos agora"
              value={atuaisAbertos.length}
              subtitle="Ainda exigem acompanhamento"
              warning={atuaisAbertos.length > 0}
            />
            <Kpi
              label="Críticos agora"
              value={atuaisCriticos.length}
              subtitle="Impacto imediato"
              warning={atuaisCriticos.length > 0}
            />
            <Kpi
              label="Tempo até análise"
              value={formatarDuracao(mediaAnalise)}
              subtitle="Média dos últimos 30 dias"
            />
            <Kpi
              label="Tempo até resolução"
              value={formatarDuracao(mediaResolucao)}
              subtitle="Média dos últimos 30 dias"
            />
            <Kpi
              label="Reabertura"
              value={`${taxaReabertura}%`}
              subtitle="Incidentes reincidentes em 30 dias"
              warning={taxaReabertura > 0}
            />
          </KpiGrid>
        </Hero>

        <section
          className={`mt-5 rounded-[28px] border p-5 shadow-sm md:p-6 ${estado.classe}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white shadow-sm">
                {estado.badge === "CRÍTICO" ? (
                  <Flame size={24} />
                ) : estado.badge === "ATENÇÃO" ? (
                  <TriangleAlert size={24} />
                ) : (
                  <BadgeCheck size={24} />
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
              {incidentes.length} incidente(s) na trilha
            </span>
          </div>
        </section>

        <section className="mt-5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#b28735]">
              Tendência
            </p>
            <h2 className="mt-1 text-[23px] font-extrabold tracking-[-0.04em]">
              Leitura por janela de tempo
            </h2>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            {janelas.map((janela) => (
              <article
                key={janela.dias}
                className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                      Janela
                    </p>
                    <h3 className="mt-1 text-[22px] font-extrabold text-slate-950">
                      {janela.dias === 1
                        ? "Últimas 24 horas"
                        : `Últimos ${janela.dias} dias`}
                    </h3>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-slate-50 text-slate-600">
                    <BarChart3 size={20} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <MiniKpi label="Abertos" value={janela.abertos} />
                  <MiniKpi label="Resolvidos" value={janela.resolvidos} />
                  <MiniKpi label="Críticos" value={janela.criticos} />
                  <MiniKpi label="Reabertos" value={janela.reabertos} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#b28735]">
                  Módulos
                </p>
                <h2 className="mt-1 text-[21px] font-extrabold tracking-[-0.03em]">
                  Mais afetados em 30 dias
                </h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-sky-50 text-sky-700">
                <Layers3 size={20} />
              </div>
            </div>

            {rankingModulos.length > 0 ? (
              <div className="mt-5 space-y-4">
                {rankingModulos.map((item) => (
                  <div key={item.modulo}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-extrabold text-slate-700">
                        {moduloRotulo(item.modulo)}
                      </p>
                      <p className="text-[10px] font-extrabold text-slate-500">
                        {item.quantidade}
                      </p>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#137a3d]"
                        style={{
                          width: `${Math.max(
                            8,
                            Math.round(
                              (item.quantidade / maxModulo) * 100,
                            ),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-5 text-[11px] text-slate-500">
                Ainda não existem incidentes suficientes para montar o ranking.
              </div>
            )}
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#b28735]">
                  Histórico recente
                </p>
                <h2 className="mt-1 text-[21px] font-extrabold tracking-[-0.03em]">
                  Últimos incidentes registrados
                </h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-emerald-700">
                <History size={20} />
              </div>
            </div>

            {recentes.length > 0 ? (
              <div className="mt-5 overflow-hidden rounded-[18px] border border-slate-200">
                {recentes.map((item, index) => (
                  <div
                    key={item.id}
                    className={`grid gap-3 px-4 py-4 md:grid-cols-[1fr_150px_120px] ${
                      index > 0 ? "border-t border-slate-100" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase ${
                            item.status === "RESOLVIDO"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.status === "EM_ANALISE"
                                ? "bg-sky-100 text-sky-800"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.status === "RESOLVIDO"
                            ? "Resolvido"
                            : item.status === "EM_ANALISE"
                              ? "Em análise"
                              : "Aberto"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[8px] font-extrabold uppercase text-slate-600">
                          {severidadeRotulo(item.severidade)}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-[11px] font-extrabold text-slate-800">
                        {item.titulo}
                      </p>
                      <p className="mt-1 text-[9px] text-slate-400">
                        {dataHora(item.abertoEm)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                        Módulo
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-slate-600">
                        {moduloRotulo(item.modulo)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
                        Reaberturas
                      </p>
                      <p className="mt-1 text-[10px] font-extrabold text-slate-700">
                        {item.reaberturas}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-5 text-[11px] text-slate-500">
                Nenhum incidente registrado nos últimos 30 dias.
              </div>
            )}
          </article>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <ResumoCard
            icon={<Clock3 size={19} />}
            titulo="Tempo até análise"
            valor={formatarDuracao(mediaAnalise)}
            descricao="Média entre a abertura e o primeiro início de análise, considerando incidentes dos últimos 30 dias."
          />
          <ResumoCard
            icon={<TimerReset size={19} />}
            titulo="Tempo até resolução"
            valor={formatarDuracao(mediaResolucao)}
            descricao="Média entre a abertura e a resolução atual dos incidentes encerrados nos últimos 30 dias."
          />
          <ResumoCard
            icon={<RefreshCcw size={19} />}
            titulo="Taxa de reabertura"
            valor={`${taxaReabertura}%`}
            descricao="Percentual de incidentes abertos nos últimos 30 dias que precisaram ser reabertos ao menos uma vez."
          />
        </section>

        <section className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-white text-slate-700 shadow-sm">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                Proteção do processo
              </p>
              <h3 className="mt-1 text-[18px] font-extrabold text-slate-950">
                A V79 é exclusivamente analítica.
              </h3>
              <p className="mt-2 text-[12px] leading-6 text-slate-500">
                Nenhum evento é criado por esta tela. Os indicadores são
                derivados da trilha já existente da operação assistida.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <Link
            href="/admin/qualidade/operacao-assistida"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[14px] border border-slate-200 bg-white px-4 text-[11px] font-extrabold text-slate-700"
          >
            <Activity size={15} />
            Operação assistida
          </Link>
          <Link
            href="/admin/qualidade"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[14px] bg-[#137a3d] px-4 text-[11px] font-extrabold text-white"
          >
            <History size={15} />
            Central de certificações
          </Link>
        </div>
      </div>
    </main>
  );
}

function MiniKpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[14px] bg-slate-50 p-3">
      <p className="text-[8px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-[18px] font-extrabold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function ResumoCard({
  icon,
  titulo,
  valor,
  descricao,
}: {
  icon: React.ReactNode;
  titulo: string;
  valor: string;
  descricao: string;
}) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-emerald-700">
        {icon}
      </div>
      <p className="mt-4 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
        {titulo}
      </p>
      <p className="mt-1 text-[24px] font-extrabold tracking-[-0.04em] text-slate-950">
        {valor}
      </p>
      <p className="mt-2 text-[11px] leading-5 text-slate-500">
        {descricao}
      </p>
    </article>
  );
}
