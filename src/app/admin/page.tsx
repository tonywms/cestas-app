export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowUpRight,
  BarChart3,
  BellRing,
  Boxes,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  Route,
  ShieldCheck,
  Settings2,
  Smartphone,
  Sparkles,
  UsersRound,
  Plus,
  ScanLine,
  Truck,
} from "lucide-react";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import AdminNotificationBell from "@/components/admin/AdminNotificationBell";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";

type Modulo = {
  titulo: string;
  descricao: string;
  href: string;
  icone: React.ReactNode;
};

export default async function AdminPage() {
  const usuario = await getCurrentUserProfile();

  if (!usuario || !usuario.ativo) {
    redirect("/");
  }

  /* ENTREGADOR não acessa painel administrativo. */
  if (usuario.perfilCodigo === "ENTREGADOR") {
    redirect("/mobile");
  }

  const primeiroNome = usuario.nome?.trim().split(" ")[0] || "Usuário";

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Fortaleza",
  });

  const financeiro =
    usuario.perfilCodigo ===
    "FINANCEIRO";

  const modulos: Modulo[] =
    financeiro
      ? [
          {
            titulo:
              "Dashboard",
            descricao:
              "Indicadores financeiros e visão da operação.",
            href:
              "/admin/dashboard",
            icone:
              <LayoutDashboard size={22} />,
          },
          {
            titulo:
              "Relatórios",
            descricao:
              "Vendas, operação e análises consolidadas.",
            href:
              "/admin/relatorios",
            icone:
              <BarChart3 size={22} />,
          },
          {
            titulo:
              "Clientes",
            descricao:
              "Cadastro, contratos, parcelas e situação financeira.",
            href:
              "/admin/clientes",
            icone:
              <UsersRound size={22} />,
          },
          {
            titulo:
              "Financeiro",
            descricao:
              "Parcelas, recebimentos e contas a receber.",
            href:
              "/admin/financeiro",
            icone:
              <CircleDollarSign size={22} />,
          },
          {
            titulo:
              "Crédito",
            descricao:
              "Bloqueios, atrasos e liberações.",
            href:
              "/admin/credito",
            icone:
              <CreditCard size={22} />,
          },
          {
            titulo:
              "Notificações",
            descricao:
              "Alertas financeiros e pendências que exigem atenção.",
            href:
              "/admin/notificacoes",
            icone:
              <BellRing size={22} />,
          },
        ]
      : [
          {
            titulo:
              "Dashboard",
            descricao:
              "Indicadores executivos da operação.",
            href:
              "/admin/dashboard",
            icone:
              <LayoutDashboard size={22} />,
          },
          {
            titulo:
              "Relatórios",
            descricao:
              "Central de relatórios gerenciais e operacionais.",
            href:
              "/admin/relatorios",
            icone:
              <BarChart3 size={22} />,
          },
          {
            titulo:
              "Clientes",
            descricao:
              "Cadastro, endereço, contratos e crédito.",
            href:
              "/admin/clientes",
            icone:
              <UsersRound size={22} />,
          },
          {
            titulo:
              "Estoque",
            descricao:
              "Estoque central, cargas e movimentações.",
            href:
              "/admin/estoque",
            icone:
              <Boxes size={22} />,
          },
          {
            titulo:
              "Rotas",
            descricao:
              "Planejamento e acompanhamento de entregas.",
            href:
              "/admin/rotas",
            icone:
              <Route size={22} />,
          },
          {
            titulo:
              "Financeiro",
            descricao:
              "Parcelas, pagamentos e caixa.",
            href:
              "/admin/financeiro",
            icone:
              <CircleDollarSign size={22} />,
          },
          {
            titulo:
              "Notificações",
            descricao:
              "Alertas operacionais, pendências e pontos que exigem atenção.",
            href:
              "/admin/notificacoes",
            icone:
              <BellRing size={22} />,
          },
          {
            titulo:
              "Configurações",
            descricao:
              "Regras da empresa, carga, bipagem e operação.",
            href:
              "/admin/configuracoes",
            icone:
              <Settings2 size={22} />,
          },
        ];

  if (
    !financeiro &&
    (
      usuario.isPlatformAdmin ||
      usuario.perfilCodigo ===
        "ADMINISTRADOR" ||
      usuario.perfilCodigo ===
        "GESTOR"
    )
  ) {
    modulos.push({
      titulo:
        "Crédito",
      descricao:
        "Bloqueios, regras, exceções e auditoria.",
      href:
        "/admin/credito",
      icone:
        <CreditCard size={22} />,
    });
  }

  if (
    !financeiro
  ) {
    modulos.push({
      titulo:
        "Usuários",
      descricao:
        "Perfis, acessos, licenças e permissões.",
      href:
        "/admin/usuarios",
      icone:
        <ShieldCheck size={22} />,
    });
  }

  const podeVisualizarCargas =
    usuario.isPlatformAdmin ||
    temPermissao(usuario.permissoes, PERMISSOES.CARGA_VISUALIZAR) ||
    temPermissao(usuario.permissoes, PERMISSOES.CARGA_VISUALIZAR_TODAS) ||
    temPermissao(usuario.permissoes, PERMISSOES.CARGA_GERENCIAR);

  const podeCriarCarga =
    usuario.isPlatformAdmin ||
    (
      temPermissao(usuario.permissoes, PERMISSOES.CARGA_GERENCIAR) &&
      temPermissao(usuario.permissoes, PERMISSOES.ESTOQUE_MOVIMENTAR)
    );

  const podeVerVolumes =
    usuario.isPlatformAdmin ||
    temPermissao(usuario.permissoes, PERMISSOES.ESTOQUE_VISUALIZAR) ||
    temPermissao(usuario.permissoes, PERMISSOES.CARGA_VISUALIZAR) ||
    temPermissao(usuario.permissoes, PERMISSOES.CARGA_VISUALIZAR_TODAS) ||
    temPermissao(usuario.permissoes, PERMISSOES.CARGA_GERENCIAR) ||
    temPermissao(usuario.permissoes, PERMISSOES.CARGA_BIPAR_VOLUME);

  const podeGerenciarRotas =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo === "ADMINISTRADOR" ||
    usuario.perfilCodigo === "GESTOR" ||
    temPermissao(usuario.permissoes, PERMISSOES.ROTA_GERENCIAR);

  const podeVerEstoque =
    usuario.isPlatformAdmin ||
    temPermissao(usuario.permissoes, PERMISSOES.ESTOQUE_VISUALIZAR) ||
    temPermissao(usuario.permissoes, PERMISSOES.ESTOQUE_MOVIMENTAR) ||
    temPermissao(usuario.permissoes, PERMISSOES.ESTOQUE_AJUSTAR);

  const podeVerFechamento =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo === "ADMINISTRADOR" ||
    usuario.perfilCodigo === "GESTOR" ||
    usuario.perfilCodigo === "FINANCEIRO";

  const atalhosRapidos = [
    ...(podeVerFechamento
      ? [{
          titulo: "Fechamento diário",
          descricao: "Conferir carga, vendas e recebimentos.",
          href: "/admin/financeiro/fechamento",
          icone: <ClipboardCheck size={19} />,
          destaque: true,
        }]
      : []),

    ...(podeCriarCarga
      ? [{
          titulo: "Nova carga",
          descricao: "Enviar estoque ao entregador.",
          href: "/admin/cargas/nova",
          icone: <Plus size={19} />,
          destaque: true,
        }]
      : []),

    ...(podeVisualizarCargas
      ? [{
          titulo: "Cargas",
          descricao: "Acompanhar cargas e saldos móveis.",
          href: "/admin/cargas",
          icone: <Truck size={19} />,
          destaque: false,
        }]
      : []),

    ...(podeVerVolumes
      ? [{
          titulo: "Volumes",
          descricao: "Rastrear e gerar identificadores.",
          href: "/admin/volumes",
          icone: <ScanLine size={19} />,
          destaque: false,
        }]
      : []),

    ...(podeGerenciarRotas
      ? [
          {
            titulo: "Nova rota",
            descricao: "Planejar uma nova sequência.",
            href: "/admin/rotas/nova",
            icone: <Plus size={19} />,
            destaque: true,
          },
          {
            titulo: "Rotas",
            descricao: "Acompanhar execução das entregas.",
            href: "/admin/rotas",
            icone: <Route size={19} />,
            destaque: false,
          },
        ]
      : []),

    ...(podeVerEstoque
      ? [{
          titulo: "Estoque central",
          descricao: "Consultar saldo e movimentações.",
          href: "/admin/estoque",
          icone: <Boxes size={19} />,
          destaque: false,
        }]
      : []),
  ];

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto max-w-[1280px]">

        {/* HEADER */}
        <header className="glass animate-fade-up flex items-center justify-between gap-5 rounded-[28px] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="icon-emerald flex h-[48px] w-[48px] items-center justify-center rounded-[16px]">
              <Boxes size={23} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.26em] text-[#819083]">
                Cestas APP
              </p>
              <h1 className="mt-0.5 text-[20px] font-black tracking-[-0.04em]">
                Central de Gestão
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AdminNotificationBell
              empresaId={usuario.empresa.id}
              usuarioId={usuario.id}
            />

            <div className="flex items-center gap-3 rounded-full border border-[#f4b13f]/30 bg-white/70 py-2 pl-2 pr-4">
              <div className="icon-emerald flex h-9 w-9 items-center justify-center rounded-full">
                <UsersRound size={17} />
              </div>
              <div className="hidden sm:block">
                <p className="text-[12px] font-black leading-none">{usuario.nome}</p>
                <p className="mt-1 text-[8px] font-black uppercase tracking-[0.16em] text-[#b07a12]">
                  {usuario.perfilNome}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* HERO */}
        <section
          className="hero-premium grain animate-fade-up relative mt-6 overflow-hidden rounded-[34px] px-7 py-9 text-white shadow-[0_30px_70px_rgba(13,93,49,0.28)] sm:px-10 sm:py-11"
          style={{ animationDelay: "80ms" }}
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-[320px] w-[320px] rounded-full border-[40px] border-white/[0.04]" />
          <div className="animate-orb pointer-events-none absolute -bottom-24 left-1/3 h-[260px] w-[260px] rounded-full bg-[#f4b13f]/[0.10] blur-3xl" />
          <div className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur">
              <Sparkles size={13} className="text-[#f4b13f]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/85 first-letter:uppercase">
                {hoje}
              </span>
            </div>

            <h2 className="mt-5 text-[32px] font-black leading-[1.05] tracking-[-0.055em] sm:text-[42px]">
              Olá, <span className="text-gold">{primeiroNome}</span>.
              <br />
              Sua operação em um só lugar.
            </h2>

            <p className="mt-4 max-w-xl text-sm font-medium leading-6 text-white/70">
              Administração, clientes, estoque, rotas, crédito e financeiro do Cestas APP.
            </p>

            <Link
              href="/mobile"
              className="group mt-8 inline-flex h-[52px] items-center gap-3 rounded-[16px] bg-white px-5 text-[12px] font-black text-[#0d5d31] shadow-[0_14px_30px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.24)]"
            >
              <Smartphone size={17} />
              Abrir visão Mobile
              <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </section>

        {/* MÓDULOS */}
        <section className="mt-9">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b07a12]">
            Administração
          </p>
          <h2 className="mt-1 text-[24px] font-black tracking-[-0.045em]">
            Módulos do sistema
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modulos.map((modulo, i) => (
              <Link
                key={modulo.titulo}
                href={modulo.href}
                className="card-premium animate-fade-up group flex min-h-[170px] flex-col justify-between rounded-[26px] p-5"
                style={{ animationDelay: `${160 + i * 70}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="icon-emerald flex h-12 w-12 items-center justify-center rounded-[16px]">
                    {modulo.icone}
                  </div>
                  <span className="text-[11px] font-black tracking-[0.1em] text-[#cfd8d1]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="mt-6 flex items-end justify-between gap-4">
                  <div>
                    <h3 className="text-[17px] font-black tracking-[-0.03em]">
                      {modulo.titulo}
                    </h3>
                    <p className="mt-1 text-[12px] leading-5 text-[#7d897f]">
                      {modulo.descricao}
                    </p>
                  </div>

                  <span className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef5f0] text-[#176f3c] transition duration-300 group-hover:bg-[#176f3c] group-hover:text-white">
                    <ArrowUpRight size={16} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>


        {/* OPERAÇÃO RÁPIDA */}
        {atalhosRapidos.length > 0 && (
          <section className="mt-9 pb-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b07a12]">
                  Operação rápida
                </p>

                <h2 className="mt-1 text-[24px] font-black tracking-[-0.045em]">
                  Acesso direto ao dia a dia
                </h2>

                <p className="mt-1 text-[12px] font-medium text-[#7d897f]">
                  Menos cliques para as ações mais usadas da operação.
                </p>
              </div>

              <span className="rounded-full border border-[#d8e7dc] bg-white/80 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-[#176f3c] shadow-sm">
                {atalhosRapidos.length} acesso(s)
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {atalhosRapidos.map((atalho, i) => (
                <Link
                  key={atalho.titulo}
                  href={atalho.href}
                  className={
                    atalho.destaque
                      ? "animate-fade-up group flex min-h-[126px] flex-col justify-between rounded-[24px] bg-[linear-gradient(135deg,#19864b,#0f6336)] p-4 text-white shadow-[0_18px_40px_rgba(23,111,60,0.18)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(23,111,60,0.25)]"
                      : "card-premium animate-fade-up group flex min-h-[126px] flex-col justify-between rounded-[24px] p-4 transition duration-300 hover:-translate-y-1"
                  }
                  style={{ animationDelay: `${720 + i * 55}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={
                        atalho.destaque
                          ? "flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/14 text-white ring-1 ring-white/15"
                          : "icon-emerald flex h-10 w-10 items-center justify-center rounded-[14px]"
                      }
                    >
                      {atalho.icone}
                    </span>

                    <ArrowUpRight
                      size={16}
                      className={
                        atalho.destaque
                          ? "text-white/70 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          : "text-[#8ca294] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#176f3c]"
                      }
                    />
                  </div>

                  <div className="mt-5">
                    <h3 className="text-[14px] font-black tracking-[-0.025em]">
                      {atalho.titulo}
                    </h3>

                    <p
                      className={
                        atalho.destaque
                          ? "mt-1 text-[10px] leading-4 text-white/70"
                          : "mt-1 text-[10px] leading-4 text-[#7d897f]"
                      }
                    >
                      {atalho.descricao}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
