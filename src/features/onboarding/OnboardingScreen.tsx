"use client";

import CestasLogo from "@/components/brand/CestasLogo";
import {
  ArrowRight,
  ChevronRight,
  PackageCheck,
  Route,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { useRef, useState } from "react";
import LoginScreen from "@/features/auth/LoginScreen";

const slides = [
  {
    eyebrow: "GestÃ£o inteligente",
    title: "Sua operaÃ§Ã£o de cestas na palma da mÃ£o.",
    description:
      "Controle clientes, entregas, estoque e recebimentos em uma Ãºnica operaÃ§Ã£o, com uma experiÃªncia premium e intuitiva.",
    icon: PackageCheck,
    stat: "Estoque",
    statValue: "Sob controle",
  },
  {
    eyebrow: "Rotas e entregas",
    title: "Cada cesta, cada cliente e cada entrega rastreados.",
    description:
      "Acompanhe a carga do veÃ­culo, organize a rota e confirme as entregas com agilidade direto do celular.",
    icon: Route,
    stat: "Entregas",
    statValue: "RastreÃ¡veis",
  },
  {
    eyebrow: "Financeiro",
    title: "Recebimentos e crediÃ¡rio em um sÃ³ fluxo.",
    description:
      "Consulte parcelas, registre pagamentos e saiba a situaÃ§Ã£o financeira do cliente antes de vender.",
    icon: WalletCards,
    stat: "CrÃ©dito",
    statValue: "Mais seguro",
  },
];

export default function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const touchStartX = useRef<number | null>(null);

  if (showLogin) {
    return <LoginScreen onBack={() => setShowLogin(false)} />;
  }

  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isLast = currentSlide === slides.length - 1;

  function next() {
    if (isLast) {
      setShowLogin(true);
      return;
    }
    setCurrentSlide((value) => value + 1);
  }

  function prev() {
    setCurrentSlide((value) => Math.max(0, value - 1));
  }

  function onTouchEnd(clientX: number) {
    if (touchStartX.current === null) return;
    const delta = clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta < -50) next();
    if (delta > 50) prev();
  }

  return (
    <main className="min-h-dvh text-[#0f1d13]">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-[linear-gradient(180deg,#fbfdfb_0%,#f1f8f3_100%)] md:my-5 md:min-h-[calc(100dvh-40px)] md:rounded-[40px] md:border md:border-white/70 md:shadow-[0_40px_110px_rgba(12,77,39,0.22),0_0_0_1px_rgba(17,63,33,0.05)]">
        {/* Header */}
        <header className="relative z-20 flex items-center justify-between px-6 pb-2 pt-6">
          <div className="flex items-center gap-2 rounded-full border border-[#176b3a]/10 bg-white/80 py-2 pl-3 pr-4 shadow-[0_10px_28px_rgba(17,63,33,0.07)] backdrop-blur-xl">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-[#23914f]" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1d7a43]" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#176b3a]">
              Cestas APP
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowLogin(true)}
            className="rounded-full px-4 py-2 text-sm font-bold text-[#5d6b5e] transition hover:bg-[#176b3a]/5 hover:text-[#176b3a]"
          >
            Pular
          </button>
        </header>

        <section
          className="relative z-10 flex flex-1 flex-col px-6 pb-7"
          onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => onTouchEnd(e.changedTouches[0].clientX)}
        >
          {/* Palco da logo */}
          <div className="grain relative mt-3 flex min-h-[340px] flex-1 items-center justify-center overflow-hidden rounded-[38px] border border-white bg-[linear-gradient(150deg,#f6fbf7_0%,#e3f2e8_55%,#d4ebdb_100%)] px-6 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_30px_60px_-24px_rgba(17,92,48,0.35)]">
            {/* Orbs de luz */}
            <div className="absolute -left-16 top-6 h-44 w-44 animate-orb rounded-full bg-white/90 blur-3xl" />
            <div className="absolute -right-12 -top-4 h-52 w-52 animate-orb rounded-full bg-[#23914f]/25 blur-3xl [animation-delay:-5s]" />
            <div className="absolute -bottom-24 left-1/2 h-52 w-52 -translate-x-1/2 animate-orb rounded-full bg-[#f4b13f]/25 blur-3xl [animation-delay:-9s]" />

            {/* AnÃ©is decorativos */}
            <div className="absolute left-1/2 top-[44%] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#176b3a]/[0.07]" />
            <div className="absolute left-1/2 top-[44%] h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#176b3a]/[0.09]" />

            <div className="relative z-10 flex w-full flex-col items-center">
              <div className="relative flex h-[230px] w-full items-center justify-center">
                {/* Halo luminoso atrÃ¡s da logo */}
                <div className="absolute h-[200px] w-[200px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0)_70%)]" />
                {/* Sombra de chÃ£o (a logo "flutua" sobre ela) */}
                <div className="absolute bottom-3 h-4 w-[150px] rounded-[100%] bg-[#0c4d27]/20 blur-md" />

                <div className="relative h-[220px] w-[270px] animate-float">
                  <CestasLogo className="h-full w-full drop-shadow-[0_22px_28px_rgba(12,77,39,0.28)]" />
                </div>
              </div>

              {/* Chip de destaque do slide */}
              <div
                key={`chip-${currentSlide}`}
                className="mt-1 flex animate-pop items-center gap-3 rounded-full border border-white bg-white/85 py-2.5 pl-2.5 pr-5 shadow-[0_16px_34px_rgba(17,63,33,0.12)] backdrop-blur-xl"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#23914f,#115c30)] text-white shadow-[0_6px_14px_rgba(17,92,48,0.4)]">
                  <Icon size={16} strokeWidth={2.3} />
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#176b3a]">
                  {slide.stat}
                </span>
                <span className="h-1 w-1 rounded-full bg-[#b7c3b8]" />
                <span className="text-xs font-bold text-[#4a574b]">
                  {slide.statValue}
                </span>
              </div>
            </div>
          </div>

          {/* Texto */}
          <div key={`text-${currentSlide}`} className="pt-8">
            <p className="mb-3 flex animate-fade-up items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.26em] text-[#1d7a43]">
              <Sparkles size={12} className="text-[#f4b13f]" />
              {slide.eyebrow}
            </p>

            <h1 className="max-w-[400px] animate-fade-up text-[32px] font-extrabold leading-[1.04] tracking-[-0.045em] text-[#0f1d13] [animation-delay:70ms]">
              {slide.title}
            </h1>

            <p className="mt-4 max-w-[390px] animate-fade-up text-[14.5px] font-medium leading-[1.7] text-[#5f6d60] [animation-delay:140ms]">
              {slide.description}
            </p>
          </div>

          {/* Controles */}
          <div className="mt-7 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {slides.map((_, index) => (
                <button
                  type="button"
                  key={index}
                  aria-label={`Ir para apresentaÃ§Ã£o ${index + 1}`}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    index === currentSlide
                      ? "w-9 bg-[linear-gradient(90deg,#176b3a,#23914f)] shadow-[0_4px_10px_rgba(23,107,58,0.35)]"
                      : "w-2 bg-[#cdd8ce] hover:bg-[#b4c3b6]"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={next}
              className="group relative flex h-[56px] items-center gap-3 overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#1d7a43_0%,#115c30_60%,#0c4d27_100%)] px-6 text-sm font-extrabold text-white shadow-[0_18px_36px_rgba(17,92,48,0.34),inset_0_1px_0_rgba(255,255,255,0.22)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgba(17,92,48,0.4),inset_0_1px_0_rgba(255,255,255,0.25)] active:translate-y-0 active:scale-[0.98]"
            >
              <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shine bg-white/25 blur-[2px]" />
              <span className="relative">
                {isLast ? "Entrar no app" : "Continuar"}
              </span>
              {isLast ? (
                <ArrowRight size={18} className="relative transition-transform group-hover:translate-x-1" />
              ) : (
                <ChevronRight size={19} className="relative transition-transform group-hover:translate-x-1" />
              )}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

