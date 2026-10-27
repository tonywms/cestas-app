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
    <main className="min-h-dvh bg-[#eaf2ec] text-[#142018]">

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-[#f7faf7] shadow-[0_0_60px_rgba(17,63,33,0.10)]">

        <header className="relative overflow-hidden bg-[linear-gradient(155deg,#176b3a_0%,#105f33_48%,#0b4d29_100%)] px-5 pb-24 pt-5 text-white">

          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full border-[32px] border-white/[0.035]" />

          <div className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-white/[0.035]" />

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
                className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.08] text-white"
              >
                <Bell size={19} />
              </button>

              <button
                type="button"
                aria-label="Meu perfil"
                className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.08] text-white"
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
              <span className="text-[#f4b13f]">
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
              className="block rounded-[28px] border border-black/[0.04] bg-white p-5 shadow-[0_22px_55px_rgba(17,63,33,0.12)]"
            >

              <div className="flex items-center gap-2">

                <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#e9f5ec] text-[#176b3a]">
                  <Truck size={19} />
                </div>

                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#176b3a]">
                  Minha carga
                </span>

              </div>

              <h2 className="mt-4 text-xl font-black">
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

              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#859186]">
                Operação
              </p>

              <h2 className="mt-1 text-xl font-black">
                Acessos rápidos
              </h2>

            </div>

            <div className="flex items-center gap-2 rounded-full border border-[#dceade] bg-[#eaf5ed] px-3 py-2">

              <span className="h-1.5 w-1.5 rounded-full bg-[#1f9b52]" />

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
              />
            )}

            {podeBiparEntrega && (
              <ActionCard
                icon={
                  <ScanBarcode size={22} />
                }
                titulo="Bipar cesta"
                descricao="Ler código da entrega"
              />
            )}

            {podeRegistrarPagamento && (
              <ActionCard
                icon={
                  <WalletCards size={22} />
                }
                titulo="Recebimentos"
                descricao="Parcelas e pagamentos"
              />
            )}

          </div>

        </section>

        {podeVerRota && (
          <section className="px-5 pb-28">

            <Link
              href="/mobile/rota"
              className="block w-full rounded-[24px] border border-[#dfe8e1] bg-[linear-gradient(145deg,#f2f8f3,#edf5ef)] p-5"
            >

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white text-[#176b3a]">
                    <MapPinned size={21} />
                  </div>

                  <div>

                    <p className="text-[10px] font-black uppercase text-[#7f8c80]">
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

        <nav className="fixed bottom-0 left-1/2 z-50 flex w-full max-w-[480px] -translate-x-1/2 items-center justify-around border-t border-black/[0.05] bg-white/95 px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">

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
                className="flex h-[58px] w-[58px] items-center justify-center rounded-[20px] bg-[#176f3c] text-white"
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
}: {
  icon: React.ReactNode;
  titulo: string;
  descricao: string;
  href?: string;
}) {
  const conteudo = (
    <>
      <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eaf5ed] text-[#176b3a]">
        {icon}
      </div>

      <div className="mt-5 flex items-end justify-between gap-2">

        <div>

          <h3 className="text-sm font-black">
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
    "rounded-[22px] border border-black/[0.04] bg-white p-4 text-left shadow-[0_12px_30px_rgba(17,63,33,0.055)]";

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
      {icon}

      <span className="text-[9px] font-extrabold">
        {label}
      </span>
    </>
  );

  const classes =
    `flex min-w-[55px] flex-col items-center gap-1.5 ${
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