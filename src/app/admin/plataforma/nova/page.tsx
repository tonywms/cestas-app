export const instant = false;

import {
  Building2,
  ShieldCheck,
} from "lucide-react";

import {
  Hero,
  Kpi,
  KpiGrid,
  ModuleHeader,
} from "@/components/admin/PremiumModuleUi";

import {
  requirePlatformAdminAal2,
} from "@/lib/auth/platform-security";

import NovaEmpresaForm from "./NovaEmpresaForm";

export default async function NovaEmpresaPage() {
  await requirePlatformAdminAal2();

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto max-w-[1040px]">
        <ModuleHeader
          eyebrow="Plataforma"
          title="Nova empresa"
          backHref="/admin/plataforma"
        />

        <Hero
          eyebrow="Onboarding"
          title="Novo fornecedor, ambiente isolado."
          description="Cria tenant, configura a operação, monta a matriz inicial de permissões e entrega o primeiro acesso administrativo."
        >
          <KpiGrid>
            <Kpi
              label="Isolamento"
              value="RLS"
              highlight
            />

            <Kpi
              label="Primeiro perfil"
              value="ADMIN"
            />

            <Kpi
              label="Configuração"
              value="Pronta"
            />
          </KpiGrid>
        </Hero>

        <div className="mt-6 flex items-start gap-3 rounded-[22px] border border-emerald-100 bg-white/80 p-4">
          <Building2
            size={20}
            className="mt-0.5 shrink-0 text-emerald-700"
          />

          <div>
            <p className="text-[13px] font-black">
              Onboarding completo
            </p>

            <p className="mt-1 text-[12px] leading-5 text-slate-500">
              A empresa nasce com configurações próprias, permissões próprias e primeiro administrador próprio.
            </p>
          </div>

          <ShieldCheck
            size={20}
            className="ml-auto shrink-0 text-emerald-600"
          />
        </div>

        <div className="mt-6">
          <NovaEmpresaForm />
        </div>
      </div>
    </main>
  );
}
