export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Boxes,
  ChevronRight,
  CircleDollarSign,
  CircleUserRound,
  LayoutDashboard,
  PackageCheck,
  Route,
  Smartphone,
  UsersRound,
} from "lucide-react";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";

export default async function AdminHome() {
  const usuario = await getCurrentUserProfile();

  if (!usuario || !usuario.ativo) {
    redirect("/");
  }

  if (usuario.perfilCodigo === "ENTREGADOR") {
    redirect("/mobile");
  }

  return (
    <main className="min-h-dvh bg-[#f3f7f4] p-5 text-[#142018] md:p-8">
      <div className="mx-auto max-w-[1280px]">

        <header className="flex flex-col gap-4 rounded-[28px] border border-black/[0.04] bg-white p-5 shadow-[0_16px_45px_rgba(17,63,33,0.07)] sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[15px] bg-[#176b3a] text-white">
              <PackageCheck size={24} />
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#849085]">
                Cestas APP
              </p>

              <h1 className="text-xl font-black tracking-[-0.04em]">
                Central de Gestão
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-full bg-[#f2f7f3] px-4 py-2.5">
            <CircleUserRound
              size={20}
              className="text-[#176b3a]"
            />

            <div>
              <p className="text-xs font-black">
                {usuario.nome}
              </p>

              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#849085]">
                {usuario.perfilNome}
              </p>
            </div>
          </div>
        </header>

        <section className="mt-6 rounded-[32px] bg-[linear-gradient(135deg,#176b3a,#0c512a)] p-7 text-white shadow-[0_24px_60px_rgba(23,107,58,0.18)]">

          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/55">
            Visão executiva
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">
            Sua operação em um só lugar.
          </h2>

          <p className="mt-3 max-w-[600px] text-sm font-medium leading-6 text-white/65">
            Administração, clientes, estoque, rotas, crédito e financeiro do Cestas APP.
          </p>

          <Link
            href="/mobile"
            className="mt-7 inline-flex h-12 items-center gap-3 rounded-[16px] bg-white px-5 text-xs font-black text-[#176b3a] shadow-lg transition hover:-translate-y-0.5"
          >
            <Smartphone size={18} />
            Abrir visão Mobile
            <ChevronRight size={16} />
          </Link>
        </section>

        <section className="mt-6">
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#89958a]">
              Administração
            </p>

            <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">
              Módulos do sistema
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            <Modulo
              icon={<LayoutDashboard size={22} />}
              titulo="Dashboard"
              descricao="Indicadores executivos da operação."
            />

            <Modulo
              icon={<UsersRound size={22} />}
              titulo="Clientes"
              descricao="Cadastro, endereço, contratos e crédito."
            />

            <Modulo
              icon={<Boxes size={22} />}
              titulo="Estoque"
              descricao="Estoque central, cargas e movimentações."
            />

            <Modulo
              icon={<Route size={22} />}
              titulo="Rotas"
              descricao="Planejamento e acompanhamento de entregas."
            />

            <Modulo
              icon={<CircleDollarSign size={22} />}
              titulo="Financeiro"
              descricao="Parcelas, pagamentos e caixa."
            />

            <Modulo
              icon={<CircleUserRound size={22} />}
              titulo="Usuários"
              descricao="Perfis, acessos e permissões."
            />

          </div>
        </section>
      </div>
    </main>
  );
}

function Modulo({
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
      className="group rounded-[24px] border border-black/[0.04] bg-white p-5 text-left shadow-[0_12px_32px_rgba(17,63,33,0.055)] transition hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(17,63,33,0.09)]"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eaf5ed] text-[#176b3a]">
        {icon}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div>
          <h3 className="font-black tracking-[-0.025em]">
            {titulo}
          </h3>

          <p className="mt-2 text-xs leading-5 text-[#849085]">
            {descricao}
          </p>
        </div>

        <ChevronRight
          size={18}
          className="text-[#a0aba1]"
        />
      </div>
    </button>
  );
}


