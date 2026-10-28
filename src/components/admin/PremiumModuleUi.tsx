import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  Inbox,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

/* =========================================================
   HEADER DO MÓDULO
========================================================= */
export function ModuleHeader({
  eyebrow,
  title,
  backHref = "/admin",
  actions,
}: {
  eyebrow: string;
  title: string;
  backHref?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white bg-white/80 px-5 py-4 shadow-[0_0_0_1px_rgba(17,63,33,0.05),0_22px_44px_-28px_rgba(12,77,39,0.35)] backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <Link
          href={backHref}
          aria-label="Voltar"
          className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-[linear-gradient(145deg,#f3fbf5,#d9efe0)] text-[#14743d] shadow-[0_1px_0_#fff_inset,0_8px_16px_-10px_rgba(17,92,48,0.55)] transition hover:-translate-x-0.5"
        >
          <ArrowLeft size={19} />
        </Link>

        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#b28735]">
            {eyebrow}
          </p>
          <h1 className="mt-0.5 text-[22px] font-extrabold tracking-[-0.04em] text-[#0f1d13]">
            {title}
          </h1>
        </div>
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
      ) : null}
    </header>
  );
}

/* Botões para usar em <ModuleHeader actions={...}> */
export function HeaderLink({
  href,
  children,
  variant = "secondary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={
        variant === "primary"
          ? "inline-flex h-11 items-center rounded-[14px] bg-[linear-gradient(135deg,#1f8a4b,#0c4d27)] px-5 text-[13px] font-extrabold text-white shadow-[0_14px_26px_-12px_rgba(17,92,48,0.7)] transition hover:-translate-y-0.5"
          : "inline-flex h-11 items-center rounded-[14px] border border-[#cfe6d6] bg-white px-5 text-[13px] font-extrabold text-[#14743d] transition hover:-translate-y-0.5 hover:bg-[#f4faf6]"
      }
    >
      {children}
    </Link>
  );
}

/* =========================================================
   HERO + KPIs
========================================================= */
export function Hero({
  eyebrow,
  title,
  description,
  children,
  badge,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <section
      className="relative mt-6 overflow-hidden rounded-[36px] px-6 py-8 text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_36px_70px_-30px_rgba(7,51,26,0.75)] md:px-9 md:py-10"
      style={{
        backgroundImage:
          "radial-gradient(110% 140% at 100% 0%, rgba(244,177,63,0.24), transparent 46%), radial-gradient(90% 120% at 0% 110%, rgba(63,191,120,0.30), transparent 56%), linear-gradient(135deg, #1d7a43 0%, #0f5a30 48%, #07331a 100%)",
      }}
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border-[44px] border-white/[0.045]" />
      <div className="pointer-events-none absolute -bottom-24 right-[28%] h-44 w-44 rounded-full bg-[#f4b13f]/[0.07] blur-2xl" />

      <div className="relative z-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[720px]">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.26em] text-[#bfe9cc]">
              {eyebrow}
            </p>

            <h2 className="mt-3 text-[34px] font-extrabold leading-[1.02] tracking-[-0.05em] md:text-[42px]">
              {title}
              <span className="text-[#f7c35f]">.</span>
            </h2>

            <p className="mt-3 text-[14px] font-medium leading-6 text-white/75">
              {description}
            </p>
          </div>

          {badge}
        </div>

        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  );
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>
  );
}

export function Kpi({
  label,
  value,
  highlight = false,
  warning = false,
  subtitle,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  warning?: boolean;
  subtitle?: string;
}) {
  const destaque = warning || highlight;

  return (
    <div
      className={`rounded-[22px] border px-4 py-4 backdrop-blur-xl md:px-5 ${
        destaque
          ? "border-[#f4b13f]/40 bg-[#f4b13f]/[0.13]"
          : "border-white/15 bg-white/[0.09]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/70">
          {label}
        </p>
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            destaque ? "bg-[#f4b13f]" : "bg-emerald-300/80"
          }`}
        />
      </div>

      <p
        className={`mt-3 text-[32px] font-extrabold leading-none tracking-[-0.03em] tabular-nums ${
          destaque ? "text-[#ffd98a]" : "text-white"
        }`}
      >
        {value}
      </p>

      {subtitle ? (
        <p className="mt-2 text-[12px] font-semibold text-white/60">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

/* =========================================================
   TÍTULO DE SEÇÃO
========================================================= */
export function SectionHeader({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 px-1">
      <div className="min-w-0 max-w-[760px]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#b28735]">
          {eyebrow}
        </p>
        <h3 className="mt-1 text-[26px] font-extrabold leading-tight tracking-[-0.04em] text-[#0f1d13]">
          {title}
        </h3>
        {description ? (
          <p className="mt-2 text-[14px] leading-6 text-[#6b786c]">
            {description}
          </p>
        ) : null}
      </div>
      {right}
    </div>
  );
}

/* Célula "rótulo + valor" para grades de detalhes */
export function InfoCell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-[16px] bg-[#f6f9f6] px-4 py-3.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8a968b]">
        {label}
      </p>
      <p className="mt-1.5 break-words text-[14px] font-bold leading-5 text-[#1c2a20]">
        {children}
      </p>
    </div>
  );
}

/* =========================================================
   FILTROS
========================================================= */
export function SmartFilters({
  title = "Filtros",
  description = "Refine a visão desta tela",
  quick,
  children,
  resetHref,
  activeCount = 0,
  chips,
}: {
  title?: string;
  description?: string;
  quick?: ReactNode;
  children?: ReactNode;
  resetHref: string;
  activeCount?: number;
  /** Filtros ativos em formato de chips (opcional). */
  chips?: ReactNode;
}) {
  return (
    <section className="mt-6 overflow-hidden rounded-[30px] border border-white bg-white shadow-[0_0_0_1px_rgba(17,63,33,0.05),0_22px_44px_-28px_rgba(12,77,39,0.32)]">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 md:px-7">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[linear-gradient(145deg,#2a9d5c,#0f5a30)] text-white shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_12px_22px_-10px_rgba(12,77,39,0.65)]">
            <SlidersHorizontal size={21} />
          </span>

          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#b28735]">
              {title}
            </p>
            <h3 className="mt-0.5 text-[17px] font-extrabold tracking-[-0.02em] text-[#0f1d13]">
              {description}
            </h3>
          </div>
        </div>

        {activeCount > 0 ? (
          <Link
            href={resetHref}
            className="inline-flex h-10 items-center gap-2 rounded-[13px] border border-[#f0d49a] bg-[#fff8e9] px-4 text-[13px] font-extrabold text-[#9a6a10] transition hover:bg-[#fff1cf]"
          >
            <X size={15} />
            Limpar {activeCount} filtro{activeCount > 1 ? "s" : ""}
          </Link>
        ) : null}
      </div>

      {/* Chips ativos */}
      {chips ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-[#eef2ee] bg-[#f7fbf8] px-5 py-3.5 md:px-7">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#6b786c]">
            Filtrando por:
          </span>
          {chips}
        </div>
      ) : null}

      {/* Atalhos rápidos */}
      {quick ? (
        <div className="space-y-5 border-t border-[#eef2ee] px-5 py-6 md:px-7">
          {quick}
        </div>
      ) : null}

      {/* Filtros avançados */}
      {children ? (
        <details className="group border-t border-[#eef2ee] bg-[#fbfdfb]">
          <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-3 px-5 py-4 md:px-7 [&::-webkit-details-marker]:hidden">
            <span className="text-[14px] font-extrabold text-[#14743d]">
              Filtros avançados
              <span className="ml-2 font-semibold text-[#6b786c]">
                movimento, responsável, destino e período
              </span>
            </span>
            <ChevronDown
              size={18}
              className="shrink-0 text-[#14743d] transition-transform duration-300 group-open:rotate-180"
            />
          </summary>

          <div className="px-5 pb-6 md:px-7">{children}</div>
        </details>
      ) : null}
    </section>
  );
}

/* Grupo de atalhos com título e explicação curta */
export function QuickGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-[13px] font-extrabold text-[#0f1d13]">{title}</p>
        {hint ? (
          <p className="text-[12px] font-medium text-[#6b786c]">{hint}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function QuickLink({
  href,
  active,
  children,
  tone = "green",
}: {
  href: string;
  active: boolean;
  children: ReactNode;
  tone?: "green" | "gold";
}) {
  const selected =
    tone === "gold"
      ? "border-[#d5a33e] bg-[#fff6df] text-[#8a5a00] shadow-[0_8px_16px_-10px_rgba(180,107,0,0.55)]"
      : "border-transparent bg-[linear-gradient(135deg,#1f8a4b,#0c4d27)] text-white shadow-[0_10px_20px_-10px_rgba(17,92,48,0.7)]";

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-10 items-center rounded-full border px-4 text-[13px] font-bold transition ${
        active
          ? selected
          : "border-[#dfe6df] bg-white text-[#44524a] hover:border-[#b9d3c0] hover:bg-[#f4faf6]"
      }`}
    >
      {active ? <span className="mr-2 h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </Link>
  );
}

/* Chip de filtro ativo (com atalho para remover) */
export function FilterChip({
  children,
  removeHref,
}: {
  children: ReactNode;
  removeHref?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e3f5e9] py-1.5 pl-3 pr-2 text-[12px] font-bold text-[#14743d] ring-1 ring-inset ring-[#bfe5cb]">
      {children}
      {removeHref ? (
        <Link
          href={removeHref}
          aria-label="Remover filtro"
          className="flex h-5 w-5 items-center justify-center rounded-full bg-[#14743d]/10 transition hover:bg-[#14743d]/20"
        >
          <X size={12} />
        </Link>
      ) : null}
    </span>
  );
}

/* =========================================================
   CAMPOS
========================================================= */
export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-[12px] font-bold text-[#44524a]">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "h-12 w-full rounded-[14px] border border-[#dfe6df] bg-[#fbfcfb] px-3.5 text-[14px] font-semibold text-[#0f1d13] shadow-[0_8px_18px_-12px_rgba(17,63,33,0.18)] outline-none transition hover:border-[#c4d2c6] focus:border-[#1d7a43] focus:bg-white focus:ring-4 focus:ring-[#1d7a43]/10";

export function ApplyButton() {
  return (
    <button
      type="submit"
      className="flex h-12 w-full items-center justify-center rounded-[15px] bg-[linear-gradient(135deg,#1f8a4b_0%,#136333_55%,#0c4d27_100%)] px-5 text-[14px] font-extrabold text-white shadow-[0_1px_0_rgba(255,255,255,0.24)_inset,0_18px_32px_-14px_rgba(17,92,48,0.62)] transition duration-300 hover:-translate-y-0.5 active:scale-[0.985] md:w-auto md:min-w-[220px]"
    >
      Aplicar filtros
    </button>
  );
}

/* =========================================================
   ESTADOS, BADGES E MÉTRICAS
========================================================= */
export function EmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[30px] border border-white bg-white px-6 py-14 text-center shadow-[0_0_0_1px_rgba(17,63,33,0.05),0_22px_44px_-28px_rgba(12,77,39,0.32)]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[linear-gradient(145deg,#f3fbf5,#d9efe0)] text-[#14743d] shadow-[0_1px_0_#fff_inset,0_8px_16px_-10px_rgba(17,92,48,0.55)]">
        <Inbox size={28} />
      </div>

      <h3 className="mt-6 text-[20px] font-extrabold tracking-[-0.02em] text-[#0f1d13]">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-lg text-[14px] leading-6 text-[#6b786c]">
        {text}
      </p>
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: "green" | "amber" | "red" | "blue" | "slate";
}) {
  const tones = {
    green: "bg-[#e3f5e9] text-[#14743d] ring-[#bfe5cb]",
    amber: "bg-[#fff3d9] text-[#a15f00] ring-[#f7dd9f]",
    red: "bg-[#ffe6e4] text-[#b42318] ring-[#f9c3bd]",
    blue: "bg-[#e4efff] text-[#1f57b8] ring-[#bfd6fb]",
    slate: "bg-[#eef1ee] text-[#5b675c] ring-[#d9dfd9]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-extrabold ring-1 ring-inset ${tones[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {children}
    </span>
  );
}

export function MiniMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "green" | "amber" | "red";
}) {
  const tones = {
    default: "bg-[#f3f7f4] text-[#0f1d13]",
    green: "bg-[#e3f5e9] text-[#14743d]",
    amber: "bg-[#fff3d9] text-[#a15f00]",
    red: "bg-[#ffe6e4] text-[#b42318]",
  };

  return (
    <div className={`rounded-[16px] px-3 py-3.5 text-center ${tones[tone]}`}>
      <p className="text-[20px] font-extrabold leading-none tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-[12px] font-bold opacity-70">{label}</p>
    </div>
  );
}

/* =========================================================
   FORMATADORES
========================================================= */
export function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const raw = value.slice(0, 10);
  const [ano, mes, dia] = raw.split("-");

  if (!ano || !mes || !dia) return value;

  return `${dia}/${mes}/${ano}`;
}

export function dateTodayFortaleza() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function subtractDays(dateText: string, days: number) {
  const date = new Date(`${dateText}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export const instant = false;
