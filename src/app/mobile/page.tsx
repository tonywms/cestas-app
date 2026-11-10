export const instant = false;

import SincronizadorOfflineClientes from "@/components/mobile/SincronizadorOfflineClientes";
import SincronizadorOfflineEntregas from "@/components/mobile/SincronizadorOfflineEntregas";
import SincronizadorVendasRotaOffline from "@/components/mobile/SincronizadorVendasRotaOffline";

import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Bell,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Clock3,
  MapPinned,
  PackageCheck,
  PackageOpen,
  Route,
  ScanBarcode,
  ShoppingBag,
  Truck,
  UsersRound,
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

import {
  getCargaAtiva,
} from "@/services/cargas/get-carga-ativa";

import { getEstoqueMovelMulticargas } from "@/services/cargas/get-estoque-movel-multicargas";

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

  const podeCadastrarCliente =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CLIENTE_MOBILE_CADASTRAR,
    );

  const podeEditarCliente =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CLIENTE_MOBILE_EDITAR,
    );

  const podeVenderCampo =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ENTREGA_REALIZAR,
    );

  const podeClientesCampo =
    podeCadastrarCliente ||
    podeEditarCliente ||
    podeVenderCampo;

  const resultadoCarga =
    podeVerCarga
      ? await getCargaAtiva({
          entregadorId: usuario.id,
          empresaId: usuario.empresa.id,
        })
      : {
          carga: null,
          erro: null,
        };

  const cargaAtiva =
    resultadoCarga.carga;

  const erroCarga =
    resultadoCarga.erro;

  // V92: o painel inicial nao usa somente a carga em operacao.
  const resultadoSaldo = podeVerCarga
    ? await getEstoqueMovelMulticargas({
        empresaId: usuario.empresa.id,
        entregadorId: usuario.id,
        exigeConferenciaFisica:
          usuario.configuracao.modoControleCarga === "VOLUME" &&
          usuario.configuracao.exigirBipagemCarga,
      })
    : null;
  const saldoGeral = resultadoSaldo?.saldoTotal ?? null;
  const erroSaldoTotal = Boolean(resultadoSaldo?.erro) || saldoGeral === null;
  const cargaEmOperacao = resultadoSaldo?.cargas.find(
    (item) => item.id === cargaAtiva?.id,
  );

return (
    <main className="app-premium min-h-dvh text-[#142018]">

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-[#f7faf7]/90 shadow-[0_0_60px_rgba(17,63,33,0.12)]">
        <SincronizadorOfflineClientes empresaId={usuario.empresa.id} usuarioId={usuario.id} compacto />
        <SincronizadorOfflineEntregas empresaId={usuario.empresa.id} usuarioId={usuario.id} compacto />
        <SincronizadorVendasRotaOffline empresaId={usuario.empresa.id} usuarioId={usuario.id} compacto />

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

            {/* V92.1: detalhamento recolhido por padrao; total sempre visivel. */}
            <div className="card-premium animate-pop rounded-[28px] p-5 shadow-[0_28px_60px_rgba(17,63,33,0.16)]">
              <Link
                href="/mobile/carga"
                className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="icon-emerald flex h-9 w-9 items-center justify-center rounded-[12px]">
                      <Truck size={19} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#176b3a]">Minha carga</span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[9px] font-black ${
                      erroSaldoTotal
                        ? "bg-slate-100 text-slate-500"
                        : (saldoGeral ?? 0) > 0
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {erroSaldoTotal ? "Total --" : `Total ${saldoGeral}`}
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-black tracking-[-0.03em]">Estoque móvel</h2>
                <p className="mt-2 text-xs leading-5 text-[#849085]">
                  Saldo consolidado das cargas recebidas e ativas.
                </p>
              </Link>

              {erroSaldoTotal ? (
                <p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-[11px] font-semibold text-amber-900">
                  Saldo total indisponível. Atualize a tela.
                </p>
              ) : (
                <div className="mt-4 border-t border-emerald-100 pt-3">
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="font-bold text-[#176b3a]">Todas as cargas recebidas</span>
                    <strong className="text-base font-black text-[#176b3a]">{saldoGeral} cestas</strong>
                  </div>

                  <details className="group mt-3 rounded-xl border border-emerald-100 bg-[#f5faf5]">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[#176b3a] focus-visible:outline-2 focus-visible:outline-emerald-700 [&::-webkit-details-marker]:hidden">
                      <span className="text-[11px] font-black">
                        Ver cargas ({resultadoSaldo?.cargas.length ?? 0})
                      </span>
                      <ChevronDown aria-hidden="true" size={17} className="shrink-0 transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <div className="space-y-2 border-t border-emerald-100 px-3 pb-3 pt-3">
                      {(resultadoSaldo?.cargas ?? []).slice(0, 4).map((carga) => (
                        <div key={carga.id} className="flex items-start justify-between gap-3 text-[10px] text-[#506454]">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">
                              Carga nº {carga.id} · {carga.codigo}
                            </p>
                            {cargaEmOperacao?.id === carga.id && (
                              <p className="font-bold text-emerald-700">Em operação</p>
                            )}
                          </div>
                          <strong className="shrink-0 text-[#176b3a]">
                            {carga.recebida ? `${carga.saldo} cestas` : "A conferir"}
                          </strong>
                        </div>
                      ))}
                      {(resultadoSaldo?.cargas.length ?? 0) > 4 && (
                        <p className="text-[10px] font-semibold text-[#176b3a]">
                          Mais {(resultadoSaldo?.cargas.length ?? 0) - 4} carga(s) no seletor.
                        </p>
                      )}
                      {(resultadoSaldo?.pendentes ?? 0) > 0 && (
                        <p className="text-[10px] text-amber-800">
                          {(resultadoSaldo?.pendentes ?? 0)} carga(s) aguardando confirmação física; não incluídas no total.
                        </p>
                      )}
                      <Link href="/mobile/carga/selecionar" className="inline-flex items-center gap-1 pt-1 text-[11px] font-bold text-[#176b3a] underline underline-offset-2">
                        Gerenciar cargas <ChevronRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </details>
                </div>
              )}
            </div>

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

            {podeVenderCampo && (
              <ActionCard
                href="/mobile/clientes?modo=venda"
                icon={
                  <ShoppingBag size={22} />
                }
                titulo="Venda em campo"
                descricao="Cliente novo ou avulso"
                delay={210}
              />
            )}

            {podeClientesCampo && (
              <ActionCard
                href="/mobile/clientes"
                icon={
                  <UsersRound size={22} />
                }
                titulo="Clientes"
                descricao="Cadastrar, localizar e editar"
                delay={235}
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

          {podeClientesCampo ? (
            <NavItem
              href="/mobile/clientes"
              icon={
                <UsersRound size={20} />
              }
              label="Clientes"
            />
          ) : (
            <NavItem
              icon={
                <CircleUserRound size={20} />
              }
              label="Perfil"
            />
          )}

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
