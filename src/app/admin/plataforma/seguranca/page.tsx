export const instant = false;

import {
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import {
  redirect,
} from "next/navigation";

import {
  Hero,
  Kpi,
  KpiGrid,
  ModuleHeader,
} from "@/components/admin/PremiumModuleUi";

import {
  getPlatformSecurityStatus,
} from "@/lib/auth/platform-security";

import PlatformMfaGuard from "./PlatformMfaGuard";

export default async function PlataformaSegurancaPage() {
  const status =
    await getPlatformSecurityStatus();

  if (
    !status.usuario ||
    !status.platformAdmin
  ) {
    redirect(
      "/admin",
    );
  }

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto max-w-[980px]">
        <ModuleHeader
          eyebrow="Plataforma"
          title="Blindagem do Super Admin"
          backHref="/admin"
        />

        <Hero
          eyebrow="Segurança crítica"
          title="Senha sozinha não entra aqui."
          description="A área global exige Super Admin válido e uma sessão MFA no nível AAL2 antes de liberar empresas, licenças ou configurações."
        >
          <KpiGrid>
            <Kpi
              label="Super Admin"
              value="VALIDADO"
              highlight
            />

            <Kpi
              label="MFA cadastrado"
              value={
                status.hasVerifiedFactor
                  ? "SIM"
                  : "NÃO"
              }
              warning={
                !status.hasVerifiedFactor
              }
            />

            <Kpi
              label="Sessão atual"
              value={
                status.currentLevel
                  ?.toUpperCase() ??
                "AAL1"
              }
              warning={
                status.currentLevel !==
                "aal2"
              }
            />

            <Kpi
              label="Fatores verificados"
              value={
                status.verifiedFactors
              }
            />
          </KpiGrid>
        </Hero>

        <section className="mt-6 grid gap-3 md:grid-cols-3">
          <Protecao
            icon={
              <KeyRound
                size={20}
              />
            }
            titulo="Senha"
            texto="Primeiro fator da autenticação."
          />

          <Protecao
            icon={
              <ShieldCheck
                size={20}
              />
            }
            titulo="MFA AAL2"
            texto="Código temporário obrigatório para a Plataforma."
          />

          <Protecao
            icon={
              <LockKeyhole
                size={20}
              />
            }
            titulo="Servidor"
            texto="A autorização é refeita no servidor antes das operações."
          />
        </section>

        <section className="mt-6">
          <PlatformMfaGuard
            initialCurrentLevel={
              status.currentLevel
            }
            initialVerifiedFactors={
              status.verifiedFactors
            }
          />
        </section>
      </div>
    </main>
  );
}

function Protecao({
  icon,
  titulo,
  texto,
}: {
  icon:
    React.ReactNode;
  titulo:
    string;
  texto:
    string;
}) {
  return (
    <div className="card-premium rounded-[22px] p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700">
        {
          icon
        }
      </div>

      <p className="mt-4 text-[14px] font-black">
        {
          titulo
        }
      </p>

      <p className="mt-1 text-[11px] leading-5 text-slate-500">
        {
          texto
        }
      </p>
    </div>
  );
}
