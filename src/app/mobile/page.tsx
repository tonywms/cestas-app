export const instant = false;

import Image from "next/image";
import { redirect } from "next/navigation";
import {
  Bell,
  ChevronRight,
  CircleUserRound,
  Clock3,
  MapPinned,
  PackageCheck,
  PackageOpen,
  Route,
  ScanBarcode,
  Truck,
  WalletCards,
} from "lucide-react";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
export default async function MobileHome() {
  const usuario = await getCurrentUserProfile();

  if (!usuario || !usuario.ativo) {
    redirect("/");
  }

  const primeiroNome =
    usuario.nome?.trim().split(" ")[0] || "Usuário";

  return (
    <main className="min-h-dvh bg-[#eaf2ec] text-[#142018]">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-[#f7faf7] shadow-[0_0_60px_rgba(17,63,33,0.10)]">

        {/* =========================================================
            HEADER MOBILE
        ========================================================= */}
        <header className="relative overflow-hidden bg-[linear-gradient(155deg,#176b3a_0%,#105f33_48%,#0b4d29_100%)] px-5 pb-24 pt-5 text-white">

          {/* ELEMENTOS DECORATIVOS */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full border-[32px] border-white/[0.035]" />

          <div className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-white/[0.035]" />

          <div className="pointer-events-none absolute left-[38%] top-[-65px] h-36 w-36 rounded-full bg-[#35a764]/10 blur-3xl" />

          {/* TOPO */}
          <div className="relative z-10 flex items-start justify-between gap-4">

            {/* LOGO TRANSPARENTE */}
            <div className="relative -ml-1 h-[92px] w-[205px] shrink-0">
              <Image
                src="/branding/cestas-app-logo-header.svg"
                alt="Cestas APP"
                fill
                priority
                sizes="205px"
                className="object-contain object-left drop-shadow-[0_12px_22px_rgba(0,0,0,0.18)]"
              />
            </div>

            {/* AÇÕES */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                aria-label="Notificações"
                className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition active:scale-95"
              >
                <Bell size={19} strokeWidth={1.9} />
              </button>

              <button
                type="button"
                aria-label="Meu perfil"
                className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition active:scale-95"
              >
                <CircleUserRound size={21} strokeWidth={1.9} />
              </button>
            </div>
          </div>

          {/* SAUDAÇÃO */}
          <div className="relative z-10 mt-3">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#a8d8b7]">
              Operação de hoje
            </p>

            <h1 className="mt-2 text-[30px] font-black leading-tight tracking-[-0.045em]">
              Olá, {primeiroNome}
              <span className="text-[#f4b13f]">.</span>
            </h1>

            <p className="mt-2 max-w-[310px] text-sm font-medium leading-6 text-white/65">
              Sua operação está pronta para começar.
            </p>
          </div>
        </header>

        {/* =========================================================
            CARD PRINCIPAL - MINHA CARGA
        ========================================================= */}
        <section className="relative z-10 -mt-16 px-5">
          <div className="rounded-[28px] border border-black/[0.04] bg-white p-5 shadow-[0_22px_55px_rgba(17,63,33,0.12)]">

            <div className="flex items-start justify-between">
              <div className="w-full">

                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#e9f5ec] text-[#176b3a]">
                    <Truck size={19} strokeWidth={2} />
                  </div>

                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#176b3a]">
                    Minha carga
                  </span>
                </div>

                <h2 className="mt-4 text-xl font-black tracking-[-0.035em] text-[#142018]">
                  Nenhuma carga aberta
                </h2>

                <p className="mt-2 max-w-[330px] text-xs font-medium leading-5 text-[#849085]">
                  Quando uma carga for atribuída a você, os dados aparecerão aqui automaticamente.
                </p>

              </div>
            </div>

            {/* INDICADORES */}
            <div className="mt-5 grid grid-cols-3 gap-2">
              <MiniIndicador
                valor="0"
                label="Cestas"
              />

              <MiniIndicador
                valor="0"
                label="Entregues"
              />

              <MiniIndicador
                valor="0"
                label="Pendentes"
              />
            </div>
          </div>
        </section>

        {/* =========================================================
            ACESSOS RÁPIDOS
        ========================================================= */}
        <section className="px-5 pb-5 pt-7">

          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#859186]">
                Operação
              </p>

              <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[#142018]">
                Acessos rápidos
              </h2>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-[#dceade] bg-[#eaf5ed] px-3 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1f9b52] shadow-[0_0_0_3px_rgba(31,155,82,0.10)]" />

              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#176b3a]">
                Online
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">

            <ActionCard
              icon={<PackageOpen size={22} />}
              titulo="Minha carga"
              descricao="Consultar estoque móvel"
            />

            <ActionCard
              icon={<Route size={22} />}
              titulo="Minha rota"
              descricao="Clientes e sequência"
            />

            <ActionCard
              icon={<ScanBarcode size={22} />}
              titulo="Bipar cesta"
              descricao="Ler código da entrega"
            />

            <ActionCard
              icon={<WalletCards size={22} />}
              titulo="Recebimentos"
              descricao="Parcelas e pagamentos"
            />

          </div>
        </section>

        {/* =========================================================
            PRÓXIMA ENTREGA
        ========================================================= */}
        <section className="px-5 pb-28">
          <button
            type="button"
            className="w-full rounded-[24px] border border-[#dfe8e1] bg-[linear-gradient(145deg,#f2f8f3,#edf5ef)] p-5 text-left transition active:scale-[0.99]"
          >

            <div className="flex items-center justify-between">

              <div className="flex min-w-0 items-center gap-3">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white text-[#176b3a] shadow-[0_8px_20px_rgba(17,63,33,0.06)]">
                  <MapPinned size={21} strokeWidth={2} />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7f8c80]">
                    Próxima entrega
                  </p>

                  <p className="mt-1 truncate text-sm font-black text-[#142018]">
                    Nenhuma rota iniciada
                  </p>
                </div>
              </div>

              <ChevronRight
                size={19}
                className="shrink-0 text-[#8b978c]"
              />
            </div>

            <div className="mt-4 flex items-center gap-2 text-[#8b978c]">
              <Clock3 size={14} />

              <span className="text-[11px] font-semibold">
                Aguardando início da operação
              </span>
            </div>

          </button>
        </section>

        {/* =========================================================
            NAVEGAÇÃO INFERIOR
        ========================================================= */}
        <nav className="fixed bottom-0 left-1/2 z-50 flex w-full max-w-[480px] -translate-x-1/2 items-center justify-around border-t border-black/[0.05] bg-white/95 px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-15px_35px_rgba(17,63,33,0.07)] backdrop-blur-xl">

          <NavItem
            active
            icon={<PackageCheck size={20} />}
            label="Início"
          />

          <NavItem
            icon={<Route size={20} />}
            label="Rota"
          />

          {/* BOTÃO CENTRAL SCANNER */}
          <div className="-mt-8">
            <button
              type="button"
              aria-label="Bipar cesta"
              className="flex h-[58px] w-[58px] items-center justify-center rounded-[20px] border border-white/20 bg-[linear-gradient(145deg,#1d8047,#0e5a30)] text-white shadow-[0_12px_28px_rgba(23,107,58,0.30)] transition active:scale-95"
            >
              <ScanBarcode size={25} strokeWidth={2} />
            </button>
          </div>

          <NavItem
            icon={<WalletCards size={20} />}
            label="Receber"
          />

          <NavItem
            icon={<CircleUserRound size={20} />}
            label="Perfil"
          />

        </nav>
      </div>
    </main>
  );
}

/* =========================================================
   MINI INDICADOR
========================================================= */

function MiniIndicador({
  valor,
  label,
}: {
  valor: string;
  label: string;
}) {
  return (
    <div className="rounded-[16px] border border-black/[0.02] bg-[#f5f8f5] px-3 py-3 text-center">

      <div className="text-lg font-black tracking-[-0.04em] text-[#172117]">
        {valor}
      </div>

      <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#8a968b]">
        {label}
      </div>

    </div>
  );
}

/* =========================================================
   CARD DE AÇÃO
========================================================= */

function ActionCard({
  icon,
  titulo,
  descricao,
}: {
  icon: React.ReactNode;
  titulo: string;
  descricao: string;
}) {
  return (
    <button
      type="button"
      className="group rounded-[22px] border border-black/[0.04] bg-white p-4 text-left shadow-[0_12px_30px_rgba(17,63,33,0.055)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(17,63,33,0.08)] active:translate-y-0 active:scale-[0.98]"
    >

      <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eaf5ed] text-[#176b3a]">
        {icon}
      </div>

      <div className="mt-5 flex items-end justify-between gap-2">

        <div className="min-w-0">
          <h3 className="text-sm font-black tracking-[-0.025em] text-[#142018]">
            {titulo}
          </h3>

          <p className="mt-1 text-[10px] font-medium leading-4 text-[#8a958b]">
            {descricao}
          </p>
        </div>

        <ChevronRight
          size={16}
          className="shrink-0 text-[#a4afa5] transition-transform group-hover:translate-x-0.5"
        />

      </div>

    </button>
  );
}

/* =========================================================
   ITEM DA NAVEGAÇÃO
========================================================= */

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`flex min-w-[55px] flex-col items-center gap-1.5 transition active:scale-95 ${
        active
          ? "text-[#176b3a]"
          : "text-[#9aa59b]"
      }`}
    >

      {icon}

      <span
        className={`text-[9px] font-extrabold ${
          active
            ? "text-[#176b3a]"
            : "text-[#9aa59b]"
        }`}
      >
        {label}
      </span>

    </button>
  );
}



