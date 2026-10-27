export const instant = false;

import {
  ArrowLeft,
  Boxes,
  ShieldCheck,
  Truck,
} from "lucide-react";

import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getCurrentUserProfile,
} from "@/lib/auth/get-current-user";

import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";

import {
  createClient,
} from "@/lib/supabase/server";

import NovaCargaForm from "./NovaCargaForm";

export default async function NovaCargaPage() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const autorizado =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CARGA_GERENCIAR,
    );

  if (!autorizado) {
    redirect(
      "/admin/cargas",
    );
  }

  const supabase =
    await createClient();

  const [
    entregadoresResult,
    tiposResult,
    saldosResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "empresa_usuarios",
        )
        .select(`
          usuario_id,
          usuarios!inner (
            id,
            nome,
            email
          ),
          perfis!inner (
            codigo
          )
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "ativo",
          true,
        )
        .eq(
          "perfis.codigo",
          "ENTREGADOR",
        ),

      supabase
        .from(
          "tipos_cesta",
        )
        .select(`
          id,
          codigo,
          nome
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "ativo",
          true,
        )
        .order(
          "nome",
        ),

      supabase
        .from(
          "estoque_central_saldos",
        )
        .select(`
          tipo_cesta_id,
          quantidade
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        ),
    ]);

  const entregadores =
    (
      entregadoresResult.data ??
      []
    )
      .map(
        (
          item,
        ) => {
          const raw =
            item.usuarios;

          const colaborador =
            Array.isArray(
              raw,
            )
              ? raw[0]
              : raw;

          if (
            !colaborador
          ) {
            return null;
          }

          return {
            id:
              colaborador.id,

            nome:
              colaborador.nome,

            email:
              colaborador.email,
          };
        },
      )
      .filter(
        (
          item,
        ): item is {
          id: string;
          nome: string;
          email: string | null;
        } =>
          item !==
          null,
      );

  const saldosMap =
    new Map(
      (
        saldosResult.data ??
        []
      ).map(
        (
          item,
        ) => [
          item.tipo_cesta_id,
          Number(
            item.quantidade,
          ),
        ],
      ),
    );

  const tiposCesta =
    (
      tiposResult.data ??
      []
    ).map(
      (
        tipo,
      ) => ({
        ...tipo,

        saldo:
          saldosMap.get(
            tipo.id,
          ) ??
          0,
      }),
    );

  const totalDisponivel =
    tiposCesta.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.saldo,
      0,
    );

  return (
    <main className="app-premium min-h-screen px-4 py-6 text-[#142018] md:px-6 md:py-8">

      <div className="mx-auto max-w-[940px]">

        <header className="glass flex items-center justify-between gap-4 rounded-[28px] px-5 py-4">

          <div className="flex items-center gap-4">

            <Link
              href="/admin/cargas"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-[#176f3c]"
            >
              <ArrowLeft
                size={19}
              />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#b07a12]">
                Estoque móvel
              </p>

              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Nova carga
              </h1>
            </div>

          </div>

          <Link
            href="/admin/estoque"
            className="flex h-11 items-center gap-2 rounded-[14px] border border-emerald-100 bg-white px-4 text-[9px] font-black text-[#176f3c]"
          >
            <Boxes
              size={15}
            />

            Estoque central
          </Link>

        </header>

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">

          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.035]" />

          <div className="relative z-10">

            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
              <Truck
                size={15}
              />

              Transferência de estoque
            </div>

            <h2 className="mt-4 text-[32px] font-black tracking-[-0.055em]">
              Carregar entregador
              <span className="text-[#f4b13f]">
                .
              </span>
            </h2>

            <p className="mt-3 max-w-2xl text-[11px] leading-6 text-white/65">
              A carga passa a retirar saldo real do estoque central. Se não existir quantidade suficiente, o banco bloqueia a operação.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-[9px] font-black">
              <ShieldCheck
                size={14}
              />

              {totalDisponivel} cesta(s) disponíveis no central
            </div>

          </div>

        </section>

        <div className="mt-5">

          <NovaCargaForm
            entregadores={
              entregadores
            }
            tiposCesta={
              tiposCesta
            }
          />

        </div>

      </div>

    </main>
  );
}
