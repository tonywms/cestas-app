export const instant = false;

import {
  ArrowLeft,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

import NovaCargaForm from "./NovaCargaForm";

export default async function NovaCargaPage() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const supabase =
    await createClient();

  const [
    entregadoresResult,
    tiposResult,
  ] = await Promise.all([
    supabase
      .from("empresa_usuarios")
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
      .from("tipos_cesta")
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
      .order("nome"),
  ]);

  const entregadores =
    (
      entregadoresResult.data ??
      []
    )
      .map((item) => {
        const raw =
          item.usuarios;

        const colaborador =
          Array.isArray(raw)
            ? raw[0]
            : raw;

        if (!colaborador) {
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
      })
      .filter(
        (
          item,
        ): item is {
          id: string;
          nome: string;
          email: string | null;
        } =>
          item !== null,
      );

  const tiposCesta =
    tiposResult.data ?? [];

  return (
    <main className="min-h-screen bg-[#f3f7f4] px-4 py-6">
      <div className="mx-auto max-w-[900px]">

        <header className="flex items-center gap-4 rounded-[26px] bg-white px-5 py-4 shadow-sm">
          <Link
            href="/admin/cargas"
            className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700"
          >
            <ArrowLeft size={19} />
          </Link>

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">
              Estoque móvel
            </p>

            <h1 className="text-base font-black">
              Nova carga
            </h1>
          </div>
        </header>

        <section className="mt-5 rounded-[30px] bg-[linear-gradient(135deg,#176f3c,#0d5a30)] p-7 text-white">
          <Truck size={25} />

          <h2 className="mt-4 text-[30px] font-black tracking-[-0.05em]">
            Carregar entregador.
          </h2>

          <p className="mt-3 text-xs leading-6 text-white/60">
            Selecione o colaborador, o tipo de cesta
            e a quantidade que ficará em posse dele.
          </p>
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