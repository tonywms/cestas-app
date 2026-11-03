export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

/* V71_FINANCEIRO_LEAST_PRIVILEGE */

type Finding = {
  nivel?: string;
  titulo?: string;
  detalhe?: string;
};

type Diagnostico = {
  aprovado?: boolean;
  criticos?: number;
  atencoes?: number;
  executado_em?: string;
  summary?: {
    contratos?: number;
    parcelas?: number;
    parcelas_abertas?: number;
    parcelas_pagas?: number;
    pagamentos?: number;
    recebimentos?: number;
    estornos?: number;
    fechamentos_protegidos?: number;
    saldo_aberto?: number;
    recebido_liquido?: number;
  };
  findings?: Finding[];
};

function moeda(valor: unknown) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor ?? 0));
}

function dataHora(valor: unknown) {
  if (!valor) return "—";
  const data = new Date(String(valor));
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleString("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ConsistenciaFinanceiraPage() {
  const usuario = await getCurrentUserProfile();

  if (!usuario || !usuario.ativo) {
    redirect("/");
  }

  const autorizado =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.FINANCEIRO_AUDITAR,
    ) ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.FINANCEIRO_ESTORNAR,
    );

  if (!autorizado) {
    redirect("/admin");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "diagnostico_financeiro_qa_v70",
    { p_empresa_id: usuario.empresa.id },
  );

  if (error) {
    throw new Error(
      error.message ||
        "Não foi possível executar a certificação financeira.",
    );
  }

  const diagnostico = (data ?? {}) as Diagnostico;
  const resumo = diagnostico.summary ?? {};
  const findings = Array.isArray(diagnostico.findings)
    ? diagnostico.findings
    : [];
  const aprovado = diagnostico.aprovado === true;

  const regras = [
    {
      icon: ReceiptText,
      titulo: "Parcelas e pagamentos",
      texto:
        "Confere se o valor pago da parcela corresponde aos pagamentos líquidos válidos.",
    },
    {
      icon: CircleDollarSign,
      titulo: "Recebimentos agrupados",
      texto:
        "Valida distribuição por parcelas e igualdade entre valor recebido e alocações.",
    },
    {
      icon: WalletCards,
      titulo: "Carteira e contratos",
      texto:
        "Bloqueia contrato quitado com saldo pendente e status financeiro incompatível.",
    },
    {
      icon: FileCheck2,
      titulo: "Prestação de contas",
      texto:
        "Identifica fechamento reaberto aguardando nova conferência e protege períodos fechados.",
    },
    {
      icon: RotateCcw,
      titulo: "Estornos",
      texto:
        "Mantém o lançamento original, registra compensação auditável e impede estorno duplicado.",
    },
    {
      icon: ShieldCheck,
      titulo: "Isolamento e auditoria",
      texto:
        "Diagnóstico e estorno respeitam empresa, perfil autorizado e trilha histórica.",
    },
  ];

  return (
    <main className="app-premium min-h-screen bg-[#f4f8f5] px-4 py-5 text-[#142018] md:px-6 md:py-7">
      <div className="mx-auto w-full max-w-[1780px]">
        <header className="flex flex-col gap-4 rounded-[26px] border border-black/[0.04] bg-white px-5 py-4 shadow-[0_12px_34px_rgba(18,63,34,0.06)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/admin/financeiro"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
              aria-label="Voltar ao financeiro"
            >
              <ArrowLeft size={20} />
            </Link>

            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                Qualidade financeira
              </p>
              <h1 className="mt-1 text-[24px] font-black tracking-[-0.04em] sm:text-[30px]">
                Certificação financeira
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/financeiro/estornos"
              className="flex h-12 items-center justify-center gap-2 rounded-[16px] border border-emerald-200 bg-white px-5 text-[13px] font-black text-emerald-800 transition hover:bg-emerald-50"
            >
              <RotateCcw size={17} />
              Estornos
            </Link>
            <Link
              href="/admin/financeiro/consistencia"
              className="flex h-12 items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,#1f8a4b,#0c4d27)] px-5 text-[13px] font-black text-white shadow-[0_12px_28px_rgba(17,92,48,0.22)]"
            >
              <RefreshCw size={17} />
              Executar novamente
            </Link>
          </div>
        </header>

        <section className="relative mt-4 overflow-hidden rounded-[30px] bg-[linear-gradient(115deg,#197b43,#0c522b_62%,#083c23)] p-6 text-white shadow-[0_20px_55px_rgba(12,82,43,0.2)] md:p-8">
          <div className="absolute -right-12 -top-20 h-72 w-72 rounded-full border-[28px] border-white/[0.035]" />
          <div className="relative">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-4xl">
                <p className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.18em] text-emerald-100">
                  <BadgeCheck size={18} />
                  Certificação automática
                </p>
                <h2 className="mt-3 text-[32px] font-black tracking-[-0.05em] md:text-[42px]">
                  {aprovado
                    ? "Integridade financeira aprovada."
                    : "Atenção financeira necessária."}
                </h2>
                <p className="mt-2 max-w-3xl text-[14px] leading-6 text-emerald-50/80">
                  Conferência cruzada entre parcelas, pagamentos,
                  recebimentos, contratos, prestação de contas e estornos.
                  O diagnóstico é somente leitura.
                </p>
              </div>

              <div className="shrink-0 rounded-[18px] border border-white/10 bg-white/[0.07] px-5 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.13em] text-emerald-100/70">
                  Executado em
                </p>
                <p className="mt-1 text-[15px] font-black">
                  {dataHora(diagnostico.executado_em)}
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Críticos", diagnostico.criticos ?? 0],
                ["Atenções", diagnostico.atencoes ?? 0],
                ["Saldo em aberto", moeda(resumo.saldo_aberto)],
                ["Recebido líquido", moeda(resumo.recebido_liquido)],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="min-w-0 rounded-[20px] border border-white/10 bg-white/[0.075] px-5 py-4"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/65">
                    {label}
                  </p>
                  <p className="mt-2 break-words text-[25px] font-black tracking-[-0.03em]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Contratos", resumo.contratos ?? 0],
            ["Parcelas", resumo.parcelas ?? 0],
            ["Abertas / parciais", resumo.parcelas_abertas ?? 0],
            ["Pagas", resumo.parcelas_pagas ?? 0],
            ["Pagamentos", resumo.pagamentos ?? 0],
            ["Recebimentos", resumo.recebimentos ?? 0],
            ["Estornos", resumo.estornos ?? 0],
            ["Fechamentos protegidos", resumo.fechamentos_protegidos ?? 0],
          ].map(([label, value]) => (
            <article
              key={String(label)}
              className="min-w-0 rounded-[24px] border border-black/[0.04] bg-white p-5 shadow-[0_12px_34px_rgba(18,63,34,0.055)]"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                {label}
              </p>
              <p className="mt-2 break-words text-[25px] font-black tracking-[-0.03em]">
                {value}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-6">
          <div className="mb-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
              Regras auditadas
            </p>
            <h2 className="mt-1 text-[26px] font-black tracking-[-0.04em]">
              O que o sistema prova automaticamente
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {regras.map((regra) => {
              const Icon = regra.icon;
              return (
                <article
                  key={regra.titulo}
                  className="flex min-h-[190px] min-w-0 flex-col rounded-[26px] border border-emerald-100 bg-white p-6 shadow-[0_14px_38px_rgba(18,63,34,0.06)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-emerald-50 text-emerald-700">
                    <Icon size={21} />
                  </div>
                  <h3 className="mt-5 text-[18px] font-black tracking-[-0.025em]">
                    {regra.titulo}
                  </h3>
                  <p className="mt-2 text-[13px] leading-6 text-slate-500">
                    {regra.texto}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-black/[0.04] bg-white p-5 shadow-[0_14px_38px_rgba(18,63,34,0.06)] md:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
                Resultado
              </p>
              <h2 className="mt-1 text-[25px] font-black tracking-[-0.04em]">
                Achados de consistência
              </h2>
              <p className="mt-1 text-[13px] leading-6 text-slate-500">
                Críticos reprovam a certificação. Atenções exigem
                reconferência operacional.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-red-50 px-4 py-2 text-[11px] font-black text-red-700">
                {diagnostico.criticos ?? 0} crítico(s)
              </span>
              <span className="rounded-full bg-amber-50 px-4 py-2 text-[11px] font-black text-amber-700">
                {diagnostico.atencoes ?? 0} atenção(ões)
              </span>
            </div>
          </div>

          {findings.length === 0 ? (
            <div className="mt-5 flex items-start gap-4 rounded-[22px] border border-emerald-200 bg-emerald-50/70 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white text-emerald-700">
                <ClipboardCheck size={21} />
              </div>
              <div>
                <h3 className="text-[16px] font-black text-emerald-900">
                  Nenhuma inconsistência encontrada
                </h3>
                <p className="mt-1 text-[13px] leading-6 text-emerald-800/70">
                  Os dados financeiros auditados estão coerentes com as
                  regras vigentes.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              {findings.map((finding, index) => {
                const critico = finding.nivel === "CRITICO";
                return (
                  <article
                    key={`${finding.titulo ?? "achado"}-${index}`}
                    className={`min-w-0 rounded-[22px] border p-5 ${
                      critico
                        ? "border-red-200 bg-red-50/60"
                        : "border-amber-200 bg-amber-50/60"
                    }`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${
                            critico
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {critico ? "Crítico" : "Atenção"}
                        </span>
                        <h3 className="mt-3 break-words text-[16px] font-black">
                          {finding.titulo ?? "Verificação financeira"}
                        </h3>
                        <p className="mt-1 break-words text-[13px] leading-6 text-slate-600">
                          {finding.detalhe ?? "Revise este ponto."}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <div className="mt-6 flex items-start gap-3 rounded-[22px] border border-emerald-100 bg-emerald-50/70 px-5 py-4 text-[12px] leading-5 text-emerald-900/75">
          <ShieldCheck className="mt-0.5 shrink-0" size={18} />
          <p>
            Diagnóstico somente leitura. Nenhuma parcela, pagamento,
            recebimento, contrato ou fechamento é alterado por esta tela.
          </p>
        </div>
      </div>
    </main>
  );
}
