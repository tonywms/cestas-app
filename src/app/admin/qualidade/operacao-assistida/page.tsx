export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  CircleAlert,
  Clock3,
  Flame,
  Gauge,
  History,
  ShieldCheck,
  Siren,
  TriangleAlert,
  Wrench,
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

import OperacaoAssistidaClient, {
  type IncidenteOperacao,
  type ModuloIncidente,
  type SeveridadeIncidente,
  type StatusIncidente,
} from "./OperacaoAssistidaClient";

/* V78_OPERACAO_ASSISTIDA_POS_GO_LIVE */

type EventoAuditoria = {
  entidade_id: string | null;
  acao: string | null;
  dados: unknown;
  created_at: string | null;
};

function objeto(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object"
    ? (valor as Record<string, unknown>)
    : {};
}

function texto(valor: unknown) {
  return typeof valor === "string" ? valor : "";
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

function severidadeValida(valor: string): SeveridadeIncidente {
  if (valor === "CRITICA") return "CRITICA";
  if (valor === "ALTA") return "ALTA";
  if (valor === "MEDIA") return "MEDIA";
  return "BAIXA";
}

function moduloValido(valor: string): ModuloIncidente {
  const permitidos: ModuloIncidente[] = [
    "ESTOQUE",
    "CARGAS",
    "VENDAS",
    "CLIENTES",
    "ROTAS",
    "FINANCEIRO",
    "CREDITO",
    "PERMISSOES",
    "MOBILE",
    "AUTENTICACAO",
    "INTEGRACOES",
    "OUTROS",
  ];

  return permitidos.includes(valor as ModuloIncidente)
    ? (valor as ModuloIncidente)
    : "OUTROS";
}

function statusValido(valor: string): StatusIncidente {
  if (valor === "EM_ANALISE") return "EM_ANALISE";
  if (valor === "RESOLVIDO") return "RESOLVIDO";
  return "ABERTO";
}

function ordemSeveridade(severidade: SeveridadeIncidente) {
  if (severidade === "CRITICA") return 4;
  if (severidade === "ALTA") return 3;
  if (severidade === "MEDIA") return 2;
  return 1;
}

export default async function OperacaoAssistidaPage() {
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
    .limit(1000);

  const eventos = (data ?? []) as EventoAuditoria[];
  const incidentes = new Map<string, IncidenteOperacao>();

  for (const evento of eventos) {
    const id = texto(evento.entidade_id);
    if (!id) continue;

    const dados = objeto(evento.dados);
    const atual = incidentes.get(id);

    if (evento.acao === "INCIDENTE_ABERTO") {
      incidentes.set(id, {
        id,
        titulo: texto(dados.titulo) || "Incidente sem título",
        descricao: texto(dados.descricao),
        severidade: severidadeValida(texto(dados.severidade)),
        modulo: moduloValido(texto(dados.modulo)),
        responsavel: texto(dados.responsavel) || null,
        status: "ABERTO",
        abertoEm:
          texto(dados.aberto_em) || evento.created_at || new Date(0).toISOString(),
        atualizadoEm: evento.created_at,
        resolvidoEm: null,
        solucao: null,
        abertoPor: texto(dados.responsavel_nome) || "Usuário responsável",
        historico: [
          {
            acao: "INCIDENTE_ABERTO",
            data: evento.created_at,
            responsavel: texto(dados.responsavel_nome),
            detalhe: texto(dados.descricao),
          },
        ],
      });
      continue;
    }

    if (!atual) continue;

    if (evento.acao === "INCIDENTE_EM_ANALISE") {
      atual.status = "EM_ANALISE";
      atual.responsavel =
        texto(dados.responsavel) || atual.responsavel || null;
      atual.atualizadoEm = evento.created_at;
      atual.historico.push({
        acao: "INCIDENTE_EM_ANALISE",
        data: evento.created_at,
        responsavel: texto(dados.responsavel_nome),
        detalhe: texto(dados.observacao),
      });
    }

    if (evento.acao === "INCIDENTE_RESOLVIDO") {
      atual.status = "RESOLVIDO";
      atual.responsavel =
        texto(dados.responsavel) || atual.responsavel || null;
      atual.solucao = texto(dados.solucao) || null;
      atual.resolvidoEm =
        texto(dados.resolvido_em) || evento.created_at || null;
      atual.atualizadoEm = evento.created_at;
      atual.historico.push({
        acao: "INCIDENTE_RESOLVIDO",
        data: evento.created_at,
        responsavel: texto(dados.responsavel_nome),
        detalhe: texto(dados.solucao),
      });
    }

    if (evento.acao === "INCIDENTE_REABERTO") {
      atual.status = statusValido("ABERTO");
      atual.resolvidoEm = null;
      atual.solucao = null;
      atual.atualizadoEm = evento.created_at;
      atual.historico.push({
        acao: "INCIDENTE_REABERTO",
        data: evento.created_at,
        responsavel: texto(dados.responsavel_nome),
        detalhe: texto(dados.motivo),
      });
    }

    incidentes.set(id, atual);
  }

  const lista = Array.from(incidentes.values()).sort((a, b) => {
    if (a.status === "RESOLVIDO" && b.status !== "RESOLVIDO") return 1;
    if (a.status !== "RESOLVIDO" && b.status === "RESOLVIDO") return -1;

    const sev = ordemSeveridade(b.severidade) - ordemSeveridade(a.severidade);
    if (sev !== 0) return sev;

    return (
      new Date(b.atualizadoEm ?? b.abertoEm).getTime() -
      new Date(a.atualizadoEm ?? a.abertoEm).getTime()
    );
  });

  const abertos = lista.filter((item) => item.status !== "RESOLVIDO");
  const resolvidos = lista.filter((item) => item.status === "RESOLVIDO");
  const criticos = abertos.filter((item) => item.severidade === "CRITICA");
  const altos = abertos.filter((item) => item.severidade === "ALTA");
  const emAnalise = abertos.filter((item) => item.status === "EM_ANALISE");

  const estado =
    criticos.length > 0
      ? {
          titulo: "Produção em estado crítico",
          descricao:
            "Existe incidente crítico em aberto. A prioridade é conter o impacto e registrar a resolução antes de considerar a operação saudável.",
          cor: "red",
        }
      : abertos.length > 0
        ? {
            titulo: "Produção em atenção",
            descricao:
              "Existem incidentes abertos ou em análise. A operação assistida está acompanhando os pontos até a resolução.",
            cor: "amber",
          }
        : {
            titulo: "Produção saudável",
            descricao:
              "Não existem incidentes operacionais em aberto nesta trilha de operação assistida.",
            cor: "emerald",
          };

  const executadoEm = dataHora(new Date().toISOString());

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto w-full max-w-[1600px]">
        <ModuleHeader
          eyebrow="Pós-go-live"
          title="Operação assistida"
          backHref="/admin/qualidade"
          actions={
            <>
              {/* V79_ESTABILIDADE_LINK */}
              <HeaderLink href="/admin/qualidade/estabilidade">
                Estabilidade
              </HeaderLink>
              <HeaderLink href="/admin/qualidade/producao">
                Saúde da produção
              </HeaderLink>
              <HeaderLink href="/admin/qualidade/liberacao">
                Gate de liberação
              </HeaderLink>
              <HeaderLink
                href="/admin/qualidade/operacao-assistida"
                variant="primary"
              >
                Atualizar painel
              </HeaderLink>
            </>
          }
        />

        <Hero
          eyebrow="Acompanhamento operacional"
          title="Acompanhe incidentes reais depois do go-live."
          description="Registre ocorrências, classifique a severidade, identifique o módulo afetado, atribua um responsável e preserve a solução na trilha auditável da empresa."
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
              label="Estado"
              value={
                criticos.length > 0
                  ? "CRÍTICO"
                  : abertos.length > 0
                    ? "ATENÇÃO"
                    : "SAUDÁVEL"
              }
              subtitle="Situação consolidada da operação"
              warning={abertos.length > 0}
            />
            <Kpi
              label="Em aberto"
              value={abertos.length}
              subtitle="Incidentes ainda não resolvidos"
              warning={abertos.length > 0}
            />
            <Kpi
              label="Críticos"
              value={criticos.length}
              subtitle="Exigem atuação imediata"
              warning={criticos.length > 0}
            />
            <Kpi
              label="Alta severidade"
              value={altos.length}
              subtitle="Prioridade elevada"
              warning={altos.length > 0}
            />
            <Kpi
              label="Em análise"
              value={emAnalise.length}
              subtitle="Com tratamento iniciado"
              warning={emAnalise.length > 0}
            />
            <Kpi
              label="Resolvidos"
              value={resolvidos.length}
              subtitle="Histórico encerrado"
            />
          </KpiGrid>
        </Hero>

        <section
          className={`mt-5 rounded-[28px] border p-5 shadow-sm md:p-6 ${
            estado.cor === "red"
              ? "border-red-200 bg-[linear-gradient(135deg,#fff1f2,#ffffff)]"
              : estado.cor === "amber"
                ? "border-amber-200 bg-[linear-gradient(135deg,#fff8e7,#ffffff)]"
                : "border-emerald-200 bg-[linear-gradient(135deg,#ecfdf3,#ffffff)]"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white shadow-sm ${
                  estado.cor === "red"
                    ? "text-red-700"
                    : estado.cor === "amber"
                      ? "text-amber-700"
                      : "text-emerald-700"
                }`}
              >
                {estado.cor === "red" ? (
                  <Flame size={24} />
                ) : estado.cor === "amber" ? (
                  <TriangleAlert size={24} />
                ) : (
                  <BadgeCheck size={24} />
                )}
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
                  Saúde operacional
                </p>
                <h2 className="mt-1 text-[24px] font-extrabold tracking-[-0.04em] text-slate-950">
                  {estado.titulo}
                </h2>
                <p className="mt-2 max-w-[980px] text-[13px] leading-6 text-slate-500">
                  {estado.descricao}
                </p>
              </div>
            </div>

            <div className="rounded-full bg-white px-4 py-2 text-[10px] font-extrabold uppercase text-slate-700 shadow-sm">
              {error ? "Leitura com atenção" : `${lista.length} incidente(s) registrado(s)`}
            </div>
          </div>
        </section>

        {error ? (
          <section className="mt-5 rounded-[22px] border border-red-200 bg-red-50 p-5 text-[12px] leading-6 text-red-800">
            <div className="flex items-start gap-3">
              <CircleAlert size={19} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-extrabold">Falha ao ler a operação assistida.</p>
                <p className="mt-1">
                  A trilha de auditoria não pôde ser carregada. Atualize o painel
                  antes de registrar uma decisão operacional.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <OperacaoAssistidaClient incidentes={lista} />

        <section className="mt-5 grid gap-4 xl:grid-cols-3">
          <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-emerald-700">
              <ShieldCheck size={20} />
            </div>
            <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
              Governança
            </p>
            <h3 className="mt-1 text-[18px] font-extrabold text-slate-950">
              Histórico imutável por eventos
            </h3>
            <p className="mt-2 text-[12px] leading-6 text-slate-500">
              Abertura, início de análise, resolução e reabertura ficam
              registrados em auditoria_eventos.
            </p>
          </article>

          <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-sky-50 text-sky-700">
              <Gauge size={20} />
            </div>
            <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
              Critério
            </p>
            <h3 className="mt-1 text-[18px] font-extrabold text-slate-950">
              Severidade define a prioridade
            </h3>
            <p className="mt-2 text-[12px] leading-6 text-slate-500">
              Incidente crítico em aberto coloca o painel em estado crítico.
              Demais incidentes abertos mantêm a produção em atenção.
            </p>
          </article>

          <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-amber-50 text-amber-700">
              <Wrench size={20} />
            </div>
            <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
              Proteção
            </p>
            <h3 className="mt-1 text-[18px] font-extrabold text-slate-950">
              Não altera a operação
            </h3>
            <p className="mt-2 text-[12px] leading-6 text-slate-500">
              A V78 registra governança e acompanhamento. Ela não movimenta
              estoque, crédito, venda, rota ou financeiro.
            </p>
          </article>
        </section>

        <div className="mt-5 flex justify-end">
          <Link
            href="/admin/qualidade"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[14px] border border-slate-200 bg-white px-4 text-[11px] font-extrabold text-slate-700"
          >
            <History size={15} />
            Voltar à Central de certificações
          </Link>
        </div>
      </div>
    </main>
  );
}
