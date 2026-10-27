export const instant = false;

import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

import Link from "next/link";
import { redirect } from "next/navigation";

import {
  PERMISSOES,
} from "@/lib/auth/permissions";

import {
  requirePermission,
} from "@/lib/auth/require-permission";

import {
  getCargaAtiva,
} from "@/services/cargas/get-carga-ativa";

import FecharCargaForm from "./FecharCargaForm";

export default async function FecharCargaPage() {
  const usuario =
    await requirePermission(
      PERMISSOES.CARGA_RETORNAR,
    );

  const {
    carga,
    erro,
  } = await getCargaAtiva({
    entregadorId:
      usuario.id,

    empresaId:
      usuario.empresa.id,
  });

  if (
    erro ||
    !carga
  ) {
    redirect(
      "/mobile/carga",
    );
  }

  const itens =
    carga.carga_itens.map(
      (
        item,
      ) => ({
        id:
          item.id,

        nome:
          item.tipos_cesta
            ?.nome ??
          "Tipo de cesta",

        codigo:
          item.tipos_cesta
            ?.codigo ??
          "-",

        saldo:
          Math.max(
            0,
            item.quantidade_carregada -
              item.quantidade_entregue -
              item.quantidade_retornada -
              item.quantidade_avariada,
          ),
      }),
    );

  const totalSaldo =
    itens.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.saldo,
      0,
    );

  return (
    <main className="min-h-dvh bg-[#eaf2ec] text-[#142018]">

      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f7faf7] pb-10">

        <header className="relative overflow-hidden bg-[linear-gradient(155deg,#176b3a,#0d5a30)] px-5 pb-8 pt-5 text-white">

          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full border-[28px] border-white/[0.04]" />

          <div className="relative z-10 flex items-center justify-between">

            <Link
              href="/mobile/carga"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/10"
            >
              <ArrowLeft
                size={19}
              />
            </Link>

            <div className="text-center">

              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
                Estoque móvel
              </p>

              <h1 className="mt-1 text-lg font-black">
                Fechar Carga
              </h1>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/10">
              <RotateCcw
                size={18}
              />
            </div>

          </div>

          <div className="relative z-10 mt-6">

            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-[#a8d8b7]">
              <Boxes
                size={14}
              />

              {carga.codigo}
            </div>

            <h2 className="mt-2 text-[27px] font-black tracking-[-0.045em]">
              Retorno e avarias
              <span className="text-[#f4b13f]">
                .
              </span>
            </h2>

            <p className="mt-2 text-[11px] leading-5 text-white/65">
              Classifique todo o saldo restante antes de encerrar a carga.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-[9px] font-black">
              <ShieldCheck
                size={14}
              />

              {totalSaldo} cesta(s) ainda em posse
            </div>

          </div>

        </header>

        <section className="px-5 py-6">

          <div className="mb-4 flex items-start gap-3 rounded-[20px] border border-amber-200 bg-amber-50 p-4">

            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0 text-amber-700"
            />

            <p className="text-[9px] leading-5 text-amber-800">
              O sistema não permitirá fechar a carga enquanto existir uma rota PLANEJADA ou EM ROTA para este entregador.
            </p>

          </div>

          <FecharCargaForm
            cargaId={
              carga.id
            }
            itens={
              itens
            }
          />

        </section>

      </div>

    </main>
  );
}
