"use client";

import Image from "next/image";
import {
  ArrowRight,
  ChevronRight,
  PackageCheck,
  Route,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import LoginScreen from "@/features/auth/LoginScreen";

const slides = [
  {
    eyebrow: "GESTÃO INTELIGENTE",
    title: "Sua operação de cestas na palma da mão.",
    description:
      "Controle clientes, entregas, estoque e recebimentos em uma única operação, com uma experiência premium e intuitiva.",
    icon: PackageCheck,
    stat: "Estoque",
    statValue: "Sob controle",
  },
  {
    eyebrow: "ROTAS E ENTREGAS",
    title: "Cada cesta, cada cliente e cada entrega rastreados.",
    description:
      "Acompanhe a carga do veículo, organize a rota e confirme as entregas com agilidade direto do celular.",
    icon: Route,
    stat: "Entregas",
    statValue: "Rastreáveis",
  },
  {
    eyebrow: "FINANCEIRO",
    title: "Recebimentos e crediário em um só fluxo.",
    description:
      "Consulte parcelas, registre pagamentos e saiba a situação financeira do cliente antes de vender.",
    icon: WalletCards,
    stat: "Crédito",
    statValue: "Mais seguro",
  },
];

export default function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showLogin, setShowLogin] = useState(false);

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

  return (
    <main className="min-h-dvh bg-transparent text-[#112015]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-[#f8fbf8] md:my-5 md:min-h-[calc(100dvh-40px)] md:rounded-[38px] md:border md:border-black/[0.05] md:shadow-[0_35px_95px_rgba(17,63,33,0.16)]">
        <header className="flex items-center justify-between px-6 pb-2 pt-6">
          <div className="rounded-full border border-[#dce8de] bg-white/85 px-4 py-2 shadow-[0_10px_25px_rgba(17,63,33,0.06)] backdrop-blur">
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#176b3a]">
              Cestas APP
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowLogin(true)}
            className="rounded-full px-4 py-2 text-sm font-extrabold text-[#546254] transition hover:bg-[#176b3a]/5 hover:text-[#176b3a]"
          >
            Pular
          </button>
        </header>

        <section className="flex flex-1 flex-col px-6 pb-6">
          <div className="relative mt-3 flex min-h-[330px] flex-1 items-center justify-center overflow-hidden rounded-[36px] border border-white/90 bg-[linear-gradient(145deg,#eef7f0_0%,#dff0e4_100%)] px-6 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            <div className="absolute -left-14 top-10 h-36 w-36 rounded-full bg-[#ffffff]/80 blur-2xl" />
            <div className="absolute -right-10 top-0 h-44 w-44 rounded-full bg-[#7db68a]/18 blur-3xl" />
            <div className="absolute -bottom-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[#176b3a]/10 blur-3xl" />

            <div className="relative z-10 flex w-full flex-col items-center">
              <div className="relative flex h-[220px] w-full items-center justify-center">
                <div className="absolute h-[210px] w-[210px] rounded-full bg-white/55 blur-[24px]" />

                <div className="relative h-[210px] w-[260px]">
                  <Image
                    src="/branding/cestas-app-logo.png"
                    alt="Logo Cestas APP"
                    fill
                    priority
                    sizes="260px"
                    className="object-contain drop-shadow-[0_20px_32px_rgba(17,63,33,0.18)]"
                  />
                </div>
              </div>

              <div className="mt-1 flex items-center gap-3 rounded-full border border-white/80 bg-white/80 px-4 py-3 shadow-[0_14px_30px_rgba(17,63,33,0.08)] backdrop-blur">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#176b3a] text-white shadow-md">
                  <Icon size={15} strokeWidth={2.3} />
                </div>

                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#176b3a]">
                  {slide.stat}
                </span>

                <span className="h-1 w-1 rounded-full bg-[#b7c3b8]" />

                <span className="text-xs font-bold text-[#4f5b50]">
                  {slide.statValue}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.26em] text-[#23834b]">
              ✨ {slide.eyebrow}
            </p>

            <h1 className="max-w-[400px] text-[31px] font-black leading-[1.02] tracking-[-0.055em] text-[#112015]">
              {slide.title}
            </h1>

            <p className="mt-4 max-w-[390px] text-[14px] font-medium leading-[1.7] text-[#657265]">
              {slide.description}
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {slides.map((_, index) => (
                <button
                  type="button"
                  key={index}
                  aria-label={`Ir para apresentação ${index + 1}`}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? "w-8 bg-[#176b3a]"
                      : "w-2 bg-[#cdd6ce]"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={next}
              className="group flex h-[54px] items-center gap-3 rounded-[18px] bg-[linear-gradient(135deg,#176b3a_0%,#115c30_100%)] px-6 text-sm font-extrabold text-white shadow-[0_16px_32px_rgba(23,107,58,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_38px_rgba(23,107,58,0.28)] active:translate-y-0 active:scale-[0.98]"
            >
              {isLast ? "Entrar no app" : "Continuar"}

              {isLast ? (
                <ArrowRight size={18} />
              ) : (
                <ChevronRight
                  size={19}
                  className="transition-transform group-hover:translate-x-1"
                />
              )}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}