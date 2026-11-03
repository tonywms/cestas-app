export const instant = false;

/* V74_GATE_EXECUTIVO_LINK */

import Link from "next/link";
import {
  BadgeDollarSign,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Radar,
  ShieldCheck,
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

const MODULOS = [
  {
    ordem: 1,
    icon: Boxes,
    titulo: "Estoque e rastreabilidade",
    descricao:
      "Confirma se o que saiu, foi entregue, retornou ou avariou fecha com o saldo central e com os volumes físicos.",
    href: "/admin/estoque/consistencia",
    acao: "Abrir certificação de estoque",
    destaque: "Integridade física",
    passo: "1. Conferir estoque",
  },
  {
    ordem: 2,
    icon: BadgeDollarSign,
    titulo: "Crédito e carteira",
    descricao:
      "Confirma se clientes liberados, em alerta ou bloqueados seguem exatamente as regras de crédito configuradas.",
    href: "/admin/credito/consistencia",
    acao: "Abrir certificação de crédito",
    destaque: "Regras de crédito",
    passo: "2. Conferir crédito",
  },
  {
    ordem: 3,
    icon: WalletCards,
    titulo: "Financeiro e prestação de contas",
    descricao:
      "Confirma se vendas, parcelas, recebimentos, pagamentos, fechamentos e estornos fecham sem diferenças.",
    href: "/admin/financeiro/consistencia",
    acao: "Abrir certificação financeira",
    destaque: "Conciliação financeira",
    passo: "3. Conferir financeiro",
  },
  {
    ordem: 4,
    icon: ShieldCheck,
    titulo: "Segurança e permissões",
    descricao:
      "Confirma se cada perfil enxerga e executa somente o que deve, incluindo exceções e acessos sensíveis.",
    href: "/admin/permissoes/consistencia",
    acao: "Abrir certificação de acessos",
    destaque: "Governança de acesso",
    passo: "4. Conferir acessos",
  },
] as const;

const REGRAS_DE_LIBERACAO = [
  "Nenhuma certificação deve apresentar crítico antes da liberação.",
  "Atenções devem ser revisadas conscientemente antes do go-live.",
  "Itens legados e informativos não podem ser confundidos com falhas atuais.",
  "Cada diagnóstico permanece somente leitura e não altera dados operacionais.",
] as const;

export default async function CentralCertificacoesPage() {
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
          title="Central de certificações"
          backHref="/admin"
          actions={
            <>
              <HeaderLink href="/admin/qualidade/liberacao">
                Gate de liberação
              </HeaderLink>
              <HeaderLink href="/admin/permissoes">
                Matriz de acessos
              </HeaderLink>
              <HeaderLink href="/admin/qualidade" variant="primary">
                Atualizar central
              </HeaderLink>
            </>
          }
        />

        <Hero
          eyebrow="Validação antes do go-live"
          title="Confira a operação antes de liberar para uso."
          description="Esta central reúne quatro conferências independentes. Abra cada uma, revise o resultado e só considere a rodada aprovada quando não houver itens críticos. Nenhuma verificação desta tela altera dados."
          badge={
            <div className="rounded-[18px] border border-white/15 bg-white/[0.08] px-4 py-3 text-right">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/60">
                Central aberta em
              </p>
              <p className="mt-1 text-[14px] font-extrabold text-white">
                {executadoEm}
              </p>
            </div>
          }
        >
          <KpiGrid>
            <Kpi
              label="Certificações"
              value="4 frentes"
              subtitle="Estoque, crédito, financeiro e segurança"
            />
            <Kpi
              label="Estoque"
              value="Saldo físico"
              subtitle="Cargas, entregas, retornos e volumes"
            />
            <Kpi
              label="Crédito"
              value="Regras de crédito"
              subtitle="Limites, bloqueios, alertas e exceções"
            />
            <Kpi
              label="Financeiro"
              value="Conciliação"
              subtitle="Parcelas, recebimentos, pagamentos e estornos"
            />
            <Kpi
              label="Segurança"
              value="Acessos"
              subtitle="Perfis, permissões e exceções"
            />
            <Kpi
              label="Modo de execução"
              value="Somente leitura"
              subtitle="Nenhuma validação altera dados"
            />
          </KpiGrid>
        </Hero>

        <section className="mt-5 rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-[920px]">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#b28735]">
                Como validar
              </p>
              <h2 className="mt-1 break-words text-[26px] font-extrabold tracking-[-0.04em] text-[#0f1d13]">
                Quatro conferências para liberar a operação
              </h2>
              <p className="mt-2 max-w-[840px] text-[14px] leading-6 text-slate-500">
                Siga esta ordem para reduzir falso positivo e facilitar a análise: estoque, crédito, financeiro e acessos.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-[12px] font-extrabold text-emerald-800">
              <Radar size={16} />
              4 verificações obrigatórias
            </div>
          </div>

          <div className="mt-5 grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-4">
            {MODULOS.map((modulo) => {
              const Icone = modulo.icon;
              return (
                <article
                  key={modulo.titulo}
                  className="flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-emerald-100 bg-[#fbfdfb] p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-emerald-50 text-emerald-700">
                      <Icone size={22} />
                    </div>
                    <span className="max-w-[72%] rounded-full bg-slate-100 px-3 py-2 text-right text-[10px] font-extrabold uppercase leading-4 tracking-[0.08em] text-slate-600">
                      {modulo.passo}
                    </span>
                  </div>

                  <p className="mt-5 break-words text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#b28735]">
                    {modulo.destaque}
                  </p>
                  <h3 className="mt-2 break-words text-[18px] font-extrabold leading-6 text-[#122018]">
                    {modulo.titulo}
                  </h3>
                  <p className="mt-2 flex-1 break-words text-[13px] leading-5 text-slate-500">
                    {modulo.descricao}
                  </p>

                  <Link
                    href={modulo.href}
                    className="mt-5 flex min-h-[48px] w-full items-center justify-center rounded-[15px] bg-[#137a3d] px-4 py-3 text-center text-[12px] font-extrabold text-white transition hover:bg-[#0f6934]"
                  >
                    {modulo.acao}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="min-w-0 rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-emerald-50 text-emerald-700">
                <ClipboardCheck size={23} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#b28735]">
                  Critério de liberação
                </p>
                <h2 className="mt-1 break-words text-[22px] font-extrabold tracking-[-0.03em] text-[#122018]">
                  O que revisar antes de considerar a rodada aprovada
                </h2>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {REGRAS_DE_LIBERACAO.map((regra, indice) => (
                <div
                  key={regra}
                  className="flex min-w-0 items-start gap-3 rounded-[18px] border border-emerald-100 bg-emerald-50/40 p-4"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[12px] font-extrabold text-emerald-700 shadow-sm">
                    {indice + 1}
                  </div>
                  <p className="min-w-0 break-words text-[13px] leading-5 text-slate-600">
                    {regra}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="min-w-0 overflow-hidden rounded-[28px] border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm md:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-white text-emerald-700 shadow-sm">
              <CheckCircle2 size={24} />
            </div>
            <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-emerald-700">
              Regra de segurança
            </p>
            <h2 className="mt-2 break-words text-[22px] font-extrabold tracking-[-0.03em] text-emerald-950">
              A central nunca substitui o resultado de cada diagnóstico.
            </h2>
            <p className="mt-3 break-words text-[13px] leading-6 text-emerald-900/70">
              A aprovação final depende da leitura das quatro certificações. Esta tela não mascara críticos, não converte atenção em aprovado e não executa correções automáticas.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
