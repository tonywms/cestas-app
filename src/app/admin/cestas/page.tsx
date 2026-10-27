export const instant = false;

import {
  ArrowLeft,
  PackageCheck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

import NovoTipoCestaForm from "./NovoTipoCestaForm";

export default async function CestasPage() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const supabase =
    await createClient();

  const {
    data: tipos,
  } = await supabase
    .from("tipos_cesta")
    .select(`
      id,
      codigo,
      nome,
      descricao,
      valor_venda,
      ativo
    `)
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .order(
      "nome",
    );

  return (
    <main className="min-h-screen bg-[#f3f7f4] px-4 py-6">
      <div className="mx-auto max-w-[1000px]">

        <header className="flex items-center gap-4 rounded-[26px] bg-white px-5 py-4 shadow-sm">
          <Link
            href="/admin"
            className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700"
          >
            <ArrowLeft size={19} />
          </Link>

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">
              Estoque
            </p>

            <h1 className="text-base font-black">
              Tipos de cesta
            </h1>
          </div>
        </header>

        <section className="mt-5 rounded-[30px] bg-[linear-gradient(135deg,#176f3c,#0d5a30)] p-7 text-white">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200">
            Catálogo
          </p>

          <h2 className="mt-3 text-[30px] font-black tracking-[-0.05em]">
            Cestas da empresa.
          </h2>

          <p className="mt-2 text-xs text-white/60">
            {tipos?.length ?? 0} tipo(s) cadastrado(s).
          </p>
        </section>

        <div className="mt-5">
          <NovoTipoCestaForm />
        </div>

        <section className="mt-5 space-y-3">
          {(tipos ?? []).map(
            (tipo) => (
              <div
                key={tipo.id}
                className="flex items-center gap-4 rounded-[22px] bg-white p-5 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700">
                  <PackageCheck
                    size={20}
                  />
                </div>

                <div className="flex-1">
                  <p className="text-sm font-black">
                    {tipo.nome}
                  </p>

                  <p className="mt-1 text-[10px] font-bold text-slate-400">
                    {tipo.codigo}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-black text-emerald-700">
                    R$ {Number(
                      tipo.valor_venda,
                    ).toFixed(2)}
                  </p>

                  <p className="mt-1 text-[9px] text-slate-400">
                    {tipo.ativo
                      ? "ATIVA"
                      : "INATIVA"}
                  </p>
                </div>
              </div>
            ),
          )}
        </section>

      </div>
    </main>
  );
}