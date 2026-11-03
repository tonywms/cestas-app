export const instant = false;

import {
  BadgeCheck,
  ClipboardCheck,
  Route,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { redirect } from "next/navigation";

import {
  HeaderLink,
  Hero,
  Kpi,
  KpiGrid,
  ModuleHeader,
} from "@/components/admin/PremiumModuleUi";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";

import HomologacaoOperacionalClient from "./HomologacaoOperacionalClient";

/* V75_HOMOLOGACAO_OPERACIONAL_ASSISTIDA */

export default async function HomologacaoOperacionalPage() {
  const usuario = await getCurrentUserProfile();

  if (!usuario || !usuario.ativo) {
    redirect("/");
  }

  const podeHomologar =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo === "ADMINISTRADOR" ||
    usuario.perfilCodigo === "GESTOR";

  if (!podeHomologar) {
    redirect("/admin");
  }

  const executadoEm = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto w-full">
        <ModuleHeader
          eyebrow="Qualidade e governança"
          title="Homologação operacional final"
          backHref="/admin/qualidade/liberacao"
          actions={
            <>
              <HeaderLink href="/admin/qualidade/liberacao">
                Gate de liberação
              </HeaderLink>
              <HeaderLink href="/admin/qualidade" variant="primary">
                Central de certificações
              </HeaderLink>
            </>
          }
        />

        <Hero
          eyebrow="Validação ponta a ponta"
          title="Teste a operação real antes do go-live."
          description="Execute o fluxo com um usuário-chave e valide cada etapa somente depois de confirmar o comportamento esperado. Este roteiro organiza a homologação e não altera estoque, crédito, financeiro ou permissões por conta própria."
          badge={
            <div className="rounded-[18px] border border-white/15 bg-white/[0.08] px-4 py-3 text-right">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/60">
                Rodada iniciada em
              </p>
              <p className="mt-1 text-[14px] font-extrabold text-white">
                {executadoEm}
              </p>
            </div>
          }
        >
          <KpiGrid>
            <Kpi label="Etapas" value="7 passos" subtitle="Fluxo operacional completo" />
            <Kpi label="Carga" value="Receber e conferir" subtitle="Estoque móvel e volumes" />
            <Kpi label="Rota" value="Atender e vender" subtitle="Venda, cobrança e entrega" />
            <Kpi label="Retorno" value="Fechar jornada" subtitle="Saldo, retorno e avaria" />
            <Kpi label="Financeiro" value="Conciliar" subtitle="Prestação de contas" />
            <Kpi label="Segurança" value="Validar acessos" subtitle="Perfis e permissões" />
          </KpiGrid>
        </Hero>

        <section className="mt-5 rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-[980px]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-emerald-50 text-emerald-700">
                  <ClipboardCheck size={23} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#b28735]">
                    Como homologar
                  </p>
                  <h2 className="mt-1 break-words text-[24px] font-extrabold tracking-[-0.04em] text-[#0f1d13]">
                    Siga a sequência e valide somente o que foi realmente testado
                  </h2>
                </div>
              </div>
              <p className="mt-4 max-w-[900px] text-[14px] leading-6 text-slate-500">
                O objetivo é reduzir falso positivo: cada etapa possui ação sugerida, critério de sucesso e uma confirmação manual. Se algo falhar, deixe a etapa pendente, corrija o módulo responsável e repita o teste.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-[12px] font-extrabold text-emerald-800">
              <Sparkles size={16} />
              Roteiro assistido
            </div>
          </div>
        </section>

        <HomologacaoOperacionalClient
          empresaId={String(usuario.empresa.id)}
          usuarioNome={usuario.nome ?? "Usuário responsável"}
        />

        <section className="mt-5 grid items-stretch gap-4 xl:grid-cols-2">
          <article className="flex h-full min-h-[190px] flex-col rounded-[26px] border border-emerald-100 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-emerald-50 text-emerald-700">
                <BadgeCheck size={23} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#b28735]">
                  Critério de aceite
                </p>
                <h2 className="mt-1 break-words text-[21px] font-extrabold leading-tight tracking-[-0.03em] text-slate-950">
                  Só conclua quando as sete etapas tiverem sido verificadas no fluxo real.
                </h2>
                <p className="mt-3 break-words text-[13px] leading-6 text-slate-500">
                  A homologação manual complementa as certificações automáticas; ela não substitui os diagnósticos de estoque, crédito, financeiro e segurança.
                </p>
              </div>
            </div>
          </article>

          <article className="flex h-full min-h-[190px] flex-col rounded-[26px] border border-slate-200 bg-slate-50 p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white text-slate-700 shadow-sm">
                <ShieldCheck size={23} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
                  Proteção da rodada
                </p>
                <h2 className="mt-1 break-words text-[21px] font-extrabold leading-tight tracking-[-0.03em] text-slate-950">
                  O checklist não executa correções nem movimentações automaticamente.
                </h2>
                <p className="mt-3 break-words text-[13px] leading-6 text-slate-500">
                  As ações reais continuam acontecendo nas telas operacionais correspondentes, preservando as regras e a rastreabilidade do sistema.
                </p>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
