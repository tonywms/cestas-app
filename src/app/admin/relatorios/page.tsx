export const instant = false;

import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CircleDollarSign,
  History,
  PackageCheck,
  Route,
  ShoppingBag,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";

type RelatorioCard = {
  titulo: string;
  descricao: string;
  href: string;
  icone: React.ReactNode;
};

export default async function RelatoriosPage() {
  const usuario = await getCurrentUserProfile();

  if (!usuario || !usuario.ativo) {
    redirect("/");
  }

  if (usuario.perfilCodigo === "ENTREGADOR") {
    redirect("/mobile");
  }

  const relatorios: RelatorioCard[] = [
    {
      titulo: "Vendas e entregas",
      descricao:
        "Analise vendas por período, cliente, entregador, tipo de venda, forma de pagamento e valor.",
      href: "/admin/relatorios/vendas",
      icone: <ShoppingBag size={22} />,
    },
    {
      titulo: "Estoque e movimentações",
      descricao:
        "Entradas, saídas, carga, retorno, avaria e evolução do estoque central.",
      href: "/admin/relatorios/estoque",
      icone: <Boxes size={22} />,
    },
    {
      titulo: "Rotas e produtividade",
      descricao:
        "Execução das rotas, paradas atendidas, ausências e desempenho dos entregadores.",
      href: "/admin/relatorios/rotas",
      icone: <Route size={22} />,
    },
    {
      titulo: "Financeiro e inadimplência",
      descricao:
        "Recebimentos, crediário, parcelas vencidas, carteira em aberto e recuperação.",
      href: "/admin/relatorios/financeiro",
      icone: <CircleDollarSign size={22} />,
    },
    {
      titulo: "Clientes — visão 360º",
      descricao:
        "Base ativa, compras, entregas, crediário, inadimplência e histórico consolidado por cliente.",
      href: "/admin/relatorios/clientes",
      icone: <UsersRound size={22} />,
    },
    {
      titulo: "Auditoria operacional",
      descricao:
        "Quem fez o quê, quando e em qual rotina. Histórico rastreável das ações críticas da empresa.",
      href: "/admin/relatorios/auditoria",
      icone: <History size={22} />,
    },
  ];

  return (
    <main className="app-premium min-h-screen px-4 py-6 text-[#142018] md:px-6 md:py-8">
      <div className="mx-auto max-w-[1180px]">
        <header className="glass flex items-center justify-between gap-4 rounded-[28px] px-5 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-[#176f3c]"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#b07a12]">
                Gestão e análise
              </p>
              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Relatórios
              </h1>
            </div>
          </div>

          <div className="flex h-11 items-center gap-2 rounded-[14px] border border-emerald-100 bg-white px-4 text-[9px] font-black text-[#176f3c]">
            <BarChart3 size={16} />
            Central gerencial
          </div>
        </header>

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.035]" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
              <PackageCheck size={16} />
              Inteligência da operação
            </div>

            <h2 className="mt-4 text-[32px] font-black tracking-[-0.055em]">
              Tudo que precisa ser analisado
              <span className="text-[#f4b13f]">.</span>
            </h2>

            <p className="mt-3 max-w-2xl text-[11px] leading-6 text-white/65">
              Esta é a central única dos relatórios do Cestas APP. Novos relatórios entram aqui sem poluir a tela principal da gestão.
            </p>
          </div>
        </section>

        <section className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {relatorios.map((relatorio) => (
              <Link
                key={relatorio.titulo}
                href={relatorio.href}
                className="card-premium min-h-[230px] rounded-[28px] p-6"
              >
                <div className="flex h-full flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="icon-emerald flex h-12 w-12 items-center justify-center rounded-[16px]">
                        {relatorio.icone}
                      </div>

                      <span className="rounded-full bg-emerald-50 px-3 py-2 text-[8px] font-black uppercase text-emerald-700">
                        Disponível
                      </span>
                    </div>

                    <h3 className="mt-5 text-[19px] font-black tracking-[-0.04em]">
                      {relatorio.titulo}
                    </h3>

                    <p className="mt-2 text-[10px] leading-5 text-slate-500">
                      {relatorio.descricao}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-[9px] font-black text-[#176f3c]">
                      Abrir relatório
                    </span>
                    <ArrowUpRight size={17} className="text-[#176f3c]" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
