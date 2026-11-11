import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BarChart3, House, LayoutDashboard, MapPinned, Route, ShieldCheck, UsersRound, WalletCards } from "lucide-react";

type Modo = "entregador" | "gestor";
type Props = {
  modo: Modo;
  titulo: string;
  subtitulo: string;
  etiqueta: string;
  children: ReactNode;
};

const menus = {
  entregador: {
    esquerda: [
      { href: "/mobile", texto: "Início", icone: House },
      { href: "/mobile/rota", texto: "Rota", icone: Route },
    ],
    centro: { href: "/mobile/produtividade", texto: "Desempenho", icone: BarChart3 },
    direita: [
      { href: "/mobile/recebimentos", texto: "Receber", icone: WalletCards },
      { href: "/mobile/clientes", texto: "Clientes", icone: UsersRound },
    ],
  },
  gestor: {
    esquerda: [
      { href: "/mobile", texto: "Início", icone: House },
      { href: "/admin/rotas", texto: "Rotas", icone: Route },
    ],
    centro: { href: "/mobile/gestor", texto: "Gestão", icone: BarChart3 },
    direita: [
      { href: "/admin/dashboard", texto: "Web", icone: LayoutDashboard },
      { href: "/admin/territorio", texto: "Mapa", icone: MapPinned },
    ],
  },
};

function NavItem({ href, texto, Icone }: { href: string; texto: string; Icone: typeof House }) {
  return <Link key={href} prefetch={false} href={href} className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[9px] font-black text-[#8b978c] transition active:scale-95">
    <span className="flex h-10 w-10 items-center justify-center rounded-[13px]"><Icone size={20}/></span>
    <span className="truncate">{texto}</span>
  </Link>;
}

// V119.3: MESMA CONCHA VISUAL do /mobile aprovado.
// Páginas SSR; nenhum GPS é solicitado e nenhuma operação financeira é realizada.
export default function CestasMobileShellV119_3({ modo, titulo, subtitulo, etiqueta, children }: Props) {
  const menu = menus[modo];
  const CentroIcone = menu.centro.icone;
  return (
    <main className="app-premium min-h-dvh bg-[#e9f1ec] text-[#142018]">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-[#f7faf7]/90 shadow-[0_0_60px_rgba(17,63,33,0.12)]">
        <header className="hero-premium grain relative overflow-hidden px-5 pb-[83px] pt-5 text-white">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full border-[32px] border-white/[0.035]" />
          <div className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-white/[0.035]" />
          <div className="animate-orb pointer-events-none absolute right-10 top-24 h-36 w-36 rounded-full bg-[#f4b13f]/[0.12] blur-3xl" />
          <div className="relative z-10 flex items-start justify-between gap-2">
            <Link prefetch={false} href="/mobile" aria-label="Voltar ao início do coletor" className="relative -ml-1 h-[92px] w-[205px] min-w-0 shrink-0 focus-visible:rounded-xl focus-visible:outline-2 focus-visible:outline-white">
              <Image src="/branding/cestas-app-logo-header.svg" alt="Cestas APP — Voltar ao início" fill priority unoptimized sizes="205px" className="object-contain object-left drop-shadow-[0_12px_22px_rgba(0,0,0,0.18)]" />
            </Link>
            <div className="flex items-center gap-2 pt-2">
              <Link prefetch={false} href="/mobile" aria-label="Ir para início" title="Início" className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/[0.10] text-white backdrop-blur transition active:scale-95"><House size={19} /></Link>
              <Link prefetch={false} href={modo === "gestor" ? "/admin/dashboard" : "/mobile/rota"} aria-label={modo === "gestor" ? "Abrir gestão web" : "Abrir minha rota"} className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/[0.10] text-white backdrop-blur transition active:scale-95">{modo === "gestor" ? <ShieldCheck size={19} /> : <Route size={19} />}</Link>
            </div>
          </div>
          <div className="relative z-10 mt-1">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a8d8b7]">{etiqueta}</p>
            <h1 className="mt-2 text-[26px] font-black leading-tight tracking-[-0.045em]">{titulo}<span className="text-gold">.</span></h1>
            <p className="mt-2 text-[12px] font-medium leading-5 text-white/70">{subtitulo}</p>
          </div>
        </header>
        <div className="relative z-10 -mt-12 flex-1 space-y-3 px-4 pb-32">{children}</div>
        <nav aria-label="Navegação do coletor" className="nav-glass fixed bottom-0 left-1/2 z-50 flex w-full max-w-[480px] -translate-x-1/2 items-center justify-around rounded-t-[26px] px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(17,63,33,0.08)]">
          {menu.esquerda.map(({href,texto,icone}) => <NavItem key={href} href={href} texto={texto} Icone={icone}/>)}
          <Link prefetch={false} href={menu.centro.href} aria-current="page" aria-label={menu.centro.texto} className="-mt-9 flex min-w-[65px] flex-1 flex-col items-center justify-center gap-1 text-[9px] font-black text-[#176f3c] transition active:scale-95">
            <span className="fab-premium flex h-[58px] w-[58px] items-center justify-center rounded-[22px] text-emerald-950 shadow-lg"><CentroIcone size={25}/></span>
            <span className="truncate">{menu.centro.texto}</span>
          </Link>
          {menu.direita.map(({href,texto,icone}) => <NavItem key={href} href={href} texto={texto} Icone={icone}/>)}
        </nav>
      </div>
    </main>
  );
}
