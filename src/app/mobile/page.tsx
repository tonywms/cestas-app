export const instant = false;

import Image from "next/image";
import Link from "next/link";
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

import LogoutButton from "@/components/auth/LogoutButton";

import {
  getCurrentUserProfile,
} from "@/lib/auth/get-current-user";

import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";

export default async function MobileHome() {
  const usuario =
    await getCurrentUserProfile();

  if (
    !usuario ||
    !usuario.ativo
  ) {
    redirect("/");
  }

  const primeiroNome =
    usuario.nome
      ?.trim()
      .split(" ")[0] ||
    "Usuário";

  const podeVerCarga =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CARGA_VISUALIZAR,
    );

  const podeVerRota =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ROTA_VISUALIZAR,
    );

  const podeBiparEntrega =
    usuario.configuracao
      .modoControleCarga ===
      "VOLUME" &&
    (
      usuario.isPlatformAdmin ||
      temPermissao(
        usuario.permissoes,
        PERMISSOES.ENTREGA_BIPAR_VOLUME,
      )
    );

  const podeRegistrarPagamento =
    usuario.configuracao
      .permitirPagamentoMobile &&
    (
      usuario.isPlatformAdmin ||
      temPermissao(
        usuario.permissoes,
        PERMISSOES.PAGAMENTO_REGISTRAR,
      )
    );

  return (
    <main className="app-premium min-h-dvh text-[#142018]">

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-[#f7faf7]/90 shadow-[0_0_60px_rgba(17,63,33,0.12)]">

        <header className="hero-premium grain relative overflow-hidden px-5 pb-24 pt-5 text-white">

          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full border-[32px] border-white/[0.035]" />

          <div className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-white/[0.035]" />

          <div className="animate-orb pointer-events-none absolute right-10 top-24 h-36 w-36 rounded-full bg-[#f4b13f]/[0.12] blur-3xl" />

          <div className="relative z-10 flex items-start justify-between gap-4">

            <div className="relative -ml-1 h-[92px] w-[205px] shrink-0">

              <Image
                src="/branding/cestas-app-logo-header.svg"
                alt="Cestas APP"
                fill
                priority
                unoptimized
                sizes="205px"
                className="object-contain object-left drop-shadow-[0_12px_22px_rgba(0,0,0,0.18)]"
              />

            </div>

            <div className="flex items-center gap-2 pt-2">

              <button
                type="button"
                aria-label="Notificações"
                className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/[0.10] text-white backdrop-blur transition active:scale-95"
              >
                <Bell size={19} />
              </button>

              <button
                type="button"
                aria-label="Meu perfil"
                className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/[0.10] text-white backdrop-blur transition active:scale-95"
              >
                <CircleUserRound
                  size={21}
                />
              </button>

              <LogoutButton mobile />

            </div>

          </div>

          <div className="relative z-10 mt-3">

            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#a8d8b7]">
              Operação de hoje
            </p>

            <h1 className="mt-2 text-[30px] font-black tracking-[-0.045em]">
              Olá, {primeiroNome}
              <span className="text-gold">
                .
              </span>
            </h1>

            <p className="mt-2 text-sm font-medium text-white/65">
              Sua operação está pronta para começar.
            </p>

          </div>

        </header>

        {podeVerCarga && (
          <section className="relative z-10 -mt-16 px-5">

            <Link
              href="/mobile/carga"
              className="card-premium animate-pop block rounded-[28px] p-5 shadow-[0_28px_60px_rgba(17,63,33,0.16)]"
            >

              <div className="flex items-center gap-2">

                <div className="icon-emerald flex h-9 w-9 items-center justify-center rounded-[12px]">
                  <Truck size={19} />
                </div>

                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#176b3a]">
                  Minha carga
                </span>

              </div>

              <h2 className="mt-4 text-xl font-black tracking-[-0.03em]">
                Estoque móvel
              </h2>

              <p className="mt-2 text-xs leading-5 text-[#849085]">
                Consulte seu saldo atual, entregas e movimentações.
              </p>

            </Link>

          </section>
        )}

        <section className="px-5 pb-5 pt-7">

          <div className="flex items-end justify-between">

            <div>

              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                Operação
              </p>

              <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">
                Acessos rápidos
              </h2>

            </div>

            <div className="flex items-center gap-2 rounded-full border border-[#dceade] bg-white/80 px-3 py-2 shadow-[0_6px_16px_rgba(17,63,33,0.06)]">

              <span className="relative flex h-2 w-2">
                <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-[#1f9b52]" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1f9b52]" />
              </span>

              <span className="text-[9px] font-black uppercase text-[#176b3a]">
                Online
              </span>

            </div>

          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">

            {podeVerCarga && (
              <ActionCard
                href="/mobile/carga"
                icon={
                  <PackageOpen size={22} />
                }
                titulo="Minha carga"
                descricao="Consultar estoque móvel"
                delay={100}
              />
            )}

            {podeVerRota && (
              <ActionCard
                href="/mobile/rota"
                icon={
                  <Route size={22} />
                }
                titulo="Minha rota"
                descricao="Clientes e sequência"
                delay={170}
              />
            )}

            {podeBiparEntrega && (
              <ActionCard
                icon={
                  <ScanBarcode size={22} />
                }
                titulo="Bipar cesta"
                descricao="Ler código da entrega"
                delay={240}
              />
            )}

            {podeRegistrarPagamento && (
              <ActionCard
                icon={
                  <WalletCards size={22} />
                }
                titulo="Recebimentos"
                descricao="Parcelas e pagamentos"
                href="/mobile/recebimentos"
                delay={310}
              />
            )}

          </div>

        </section>

        {podeVerRota && (
          <section className="px-5 pb-28">

            <Link
              href="/mobile/rota"
              className="card-premium animate-fade-up block w-full rounded-[24px] p-5"
              style={{ animationDelay: "380ms" }}
            >

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <div className="icon-emerald flex h-11 w-11 items-center justify-center rounded-[14px]">
                    <MapPinned size={21} />
                  </div>

                  <div>

                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#b07a12]">
                      Minha rota
                    </p>

                    <p className="mt-1 text-sm font-black">
                      Ver sequência de clientes
                    </p>

                  </div>

                </div>

                <ChevronRight
                  size={19}
                  className="text-[#8b978c]"
                />

              </div>

              <div className="mt-4 flex items-center gap-2 text-[#8b978c]">

                <Clock3 size={14} />

                <span className="text-[11px] font-semibold">
                  Abrir operação
                </span>

              </div>

            </Link>

          </section>
        )}

        <nav className="nav-glass fixed bottom-0 left-1/2 z-50 flex w-full max-w-[480px] -translate-x-1/2 items-center justify-around rounded-t-[26px] px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">

          <NavItem
            href="/mobile"
            active
            icon={
              <PackageCheck size={20} />
            }
            label="Início"
          />

          {podeVerRota && (
            <NavItem
              href="/mobile/rota"
              icon={
                <Route size={20} />
              }
              label="Rota"
            />
          )}

          {podeBiparEntrega && (
            <div className="-mt-8">

              <button
                type="button"
                aria-label="Bipar cesta"
                className="fab-premium flex h-[60px] w-[60px] items-center justify-center rounded-[22px] transition active:scale-95"
              >
                <ScanBarcode
                  size={25}
                />
              </button>

            </div>
          )}

          {podeRegistrarPagamento && (
            <NavItem
              icon={
                <WalletCards size={20} />
              }
              label="Receber"
              href="/mobile/recebimentos"
            />
          )}

          <NavItem
            icon={
              <CircleUserRound size={20} />
            }
            label="Perfil"
          />

        </nav>

      </div>

    </main>
  );
}

function ActionCard({
  icon,
  titulo,
  descricao,
  href,
  delay = 0,
}: {
  icon: React.ReactNode;
  titulo: string;
  descricao: string;
  href?: string;
  delay?: number;
}) {
  const conteudo = (
    <>
      <div className="icon-emerald flex h-11 w-11 items-center justify-center rounded-[14px]">
        {icon}
      </div>

      <div className="mt-5 flex items-end justify-between gap-2">

        <div>

          <h3 className="text-sm font-black tracking-[-0.02em]">
            {titulo}
          </h3>

          <p className="mt-1 text-[10px] text-[#8a958b]">
            {descricao}
          </p>

        </div>

        <ChevronRight
          size={16}
          className="text-[#a4afa5]"
        />

      </div>
    </>
  );

  const classes =
    "card-premium animate-fade-up rounded-[22px] p-4 text-left";

  const style = {
    animationDelay: `${delay}ms`,
  };

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        style={style}
      >
        {conteudo}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      style={style}
    >
      {conteudo}
    </button>
  );
}

function NavItem({
  icon,
  label,
  active = false,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  href?: string;
}) {
  const conteudo = (
    <>
      {active && (
        <span className="absolute -top-3 h-1 w-7 rounded-full bg-[#f4b13f]" />
      )}

      {icon}

      <span className="text-[9px] font-extrabold">
        {label}
      </span>
    </>
  );

  const classes =
    `relative flex min-w-[55px] flex-col items-center gap-1.5 transition-colors ${
      active
        ? "text-[#176b3a]"
        : "text-[#9aa59b]"
    }`;

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
      >
        {conteudo}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={classes}
    >
      {conteudo}
    </button>
  );
}