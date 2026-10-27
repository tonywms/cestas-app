export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Boxes,
  ChevronRight,
  CircleDollarSign,
  LayoutDashboard,
  Route,
  Smartphone,
  UsersRound,
} from "lucide-react";

import {
  getCurrentUserProfile,
} from "@/lib/auth/get-current-user";

type Modulo = {
  titulo: string;
  descricao: string;
  href: string;
  icone: React.ReactNode;
};

export default async function AdminPage() {
  const usuario =
    await getCurrentUserProfile();

  if (
    !usuario ||
    !usuario.ativo
  ) {
    redirect("/");
  }

  /*
   * ENTREGADOR não acessa painel administrativo.
   */
  if (
    usuario.perfilCodigo ===
    "ENTREGADOR"
  ) {
    redirect("/mobile");
  }

  const modulos: Modulo[] = [
    {
      titulo: "Dashboard",
      descricao:
        "Indicadores executivos da operação.",
      href: "/admin/dashboard",
      icone: (
        <LayoutDashboard
          size={22}
        />
      ),
    },
    {
      titulo: "Clientes",
      descricao:
        "Cadastro, endereço, contratos e crédito.",
      href: "/admin/clientes",
      icone: (
        <UsersRound
          size={22}
        />
      ),
    },
    {
      titulo: "Estoque",
      descricao:
        "Estoque central, cargas e movimentações.",
      href: "/admin/cargas",
      icone: (
        <Boxes
          size={22}
        />
      ),
    },
    {
      titulo: "Rotas",
      descricao:
        "Planejamento e acompanhamento de entregas.",
      href: "/admin/rotas",
      icone: (
        <Route
          size={22}
        />
      ),
    },
    {
      titulo: "Financeiro",
      descricao:
        "Parcelas, pagamentos e caixa.",
      href: "/admin/financeiro",
      icone: (
        <CircleDollarSign
          size={22}
        />
      ),
    },
    {
      titulo: "Usuários",
      descricao:
        "Perfis, acessos e permissões.",
      href: "/admin/usuarios",
      icone: (
        <UsersRound
          size={22}
        />
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-[#f3f7f4] px-5 py-7 text-[#142018]">

      <div className="mx-auto max-w-[1280px]">

        {/* =====================================================
            HEADER
        ===================================================== */}
        <header className="flex items-center justify-between gap-5 rounded-[28px] border border-black/[0.03] bg-white px-5 py-4 shadow-[0_15px_45px_rgba(17,63,33,0.06)]">

          <div className="flex items-center gap-3">

            <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[15px] bg-[#176f3c] text-white">
              <Boxes
                size={23}
              />
            </div>

            <div>

              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#819083]">
                Cestas APP
              </p>

              <h1 className="mt-0.5 text-[20px] font-black tracking-[-0.04em]">
                Central de Gestão
              </h1>

            </div>

          </div>

          <div className="flex items-center gap-3 rounded-full bg-[#f1f6f2] px-4 py-3">

            <div className="flex h-8 w-8 items-center justify-center rounded-full text-[#176f3c]">
              <UsersRound
                size={19}
              />
            </div>

            <div className="hidden sm:block">

              <p className="text-[11px] font-black">
                {usuario.nome}
              </p>

              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#829184]">
                {usuario.perfilNome}
              </p>

            </div>

          </div>

        </header>

        {/* =====================================================
            HERO
        ===================================================== */}
        <section className="relative mt-6 overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#176f3c_0%,#0d5d31_100%)] px-7 py-8 text-white shadow-[0_22px_60px_rgba(21,105,57,0.14)]">

          <div className="pointer-events-none absolute -right-28 -top-28 h-[280px] w-[280px] rounded-full bg-white/[0.025]" />

          <div className="relative z-10">

            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a9d6b6]">
              Visão executiva
            </p>

            <h2 className="mt-4 text-[31px] font-black leading-none tracking-[-0.055em]">
              Sua operação em um só lugar.
            </h2>

            <p className="mt-4 text-sm font-medium text-white/70">
              Administração, clientes, estoque,
              rotas, crédito e financeiro do
              Cestas APP.
            </p>

            <Link
              href="/mobile"
              className="mt-7 inline-flex h-[50px] items-center gap-3 rounded-[15px] bg-white px-5 text-[11px] font-black text-[#176f3c] shadow-[0_10px_25px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5"
            >
              <Smartphone
                size={17}
              />

              Abrir visão Mobile

              <ChevronRight
                size={16}
              />
            </Link>

          </div>

        </section>

        {/* =====================================================
            MÓDULOS
        ===================================================== */}
        <section className="mt-7">

          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#819083]">
            Administração
          </p>

          <h2 className="mt-1 text-[22px] font-black tracking-[-0.04em]">
            Módulos do sistema
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">

            {modulos.map(
              (modulo) => (
                <Link
                  key={
                    modulo.titulo
                  }
                  href={
                    modulo.href
                  }
                  className="group flex min-h-[155px] flex-col justify-between rounded-[25px] border border-black/[0.035] bg-white p-5 shadow-[0_13px_35px_rgba(17,63,33,0.055)] transition duration-200 hover:-translate-y-1 hover:border-emerald-100 hover:shadow-[0_20px_45px_rgba(17,63,33,0.09)] active:translate-y-0 active:scale-[0.99]"
                >

                  <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eaf5ed] text-[#176f3c]">
                    {
                      modulo.icone
                    }
                  </div>

                  <div className="mt-6 flex items-end justify-between gap-4">

                    <div>

                      <h3 className="text-[16px] font-black tracking-[-0.03em]">
                        {
                          modulo.titulo
                        }
                      </h3>

                      <p className="mt-1 text-[11px] leading-5 text-[#869087]">
                        {
                          modulo.descricao
                        }
                      </p>

                    </div>

                    <ChevronRight
                      size={18}
                      className="mb-1 shrink-0 text-[#a3afa5] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#176f3c]"
                    />

                  </div>

                </Link>
              ),
            )}

          </div>

        </section>

      </div>

    </main>
  );
}