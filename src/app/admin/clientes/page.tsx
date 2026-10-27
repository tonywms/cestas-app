export const instant = false;

import {
  ArrowLeft,
  MapPin,
  UserRound,
} from "lucide-react";

import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getCurrentUserProfile,
} from "@/lib/auth/get-current-user";

import {
  createClient,
} from "@/lib/supabase/server";

import NovoClienteForm from "./NovoClienteForm";

export default async function ClientesPage() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const supabase =
    await createClient();

  const {
    data: clientes,
  } = await supabase
    .from("clientes")
    .select(`
      id,
      codigo,
      nome,
      telefone,
      logradouro,
      numero,
      bairro,
      cidade,
      uf,
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
              Comercial
            </p>

            <h1 className="text-base font-black">
              Clientes
            </h1>
          </div>

        </header>

        <section className="mt-5 rounded-[30px] bg-[linear-gradient(135deg,#176f3c,#0d5a30)] p-7 text-white">

          <UserRound size={25} />

          <h2 className="mt-4 text-[30px] font-black tracking-[-0.05em]">
            Clientes da empresa.
          </h2>

          <p className="mt-2 text-xs text-white/60">
            {clientes?.length ?? 0} cliente(s) cadastrado(s).
          </p>

        </section>

        <div className="mt-5">
          <NovoClienteForm />
        </div>

        <section className="mt-5 space-y-3">

          {(clientes ?? []).map(
            (cliente) => (
              <div
                key={cliente.id}
                className="rounded-[22px] bg-white p-5 shadow-sm"
              >

                <div className="flex items-start gap-4">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700">
                    <UserRound size={20} />
                  </div>

                  <div className="min-w-0 flex-1">

                    <p className="text-sm font-black">
                      {cliente.nome}
                    </p>

                    <p className="mt-1 text-[9px] font-bold text-slate-400">
                      {cliente.codigo}
                    </p>

                    {cliente.logradouro && (
                      <div className="mt-3 flex items-start gap-2 text-[10px] text-slate-500">
                        <MapPin
                          size={13}
                          className="mt-0.5 shrink-0"
                        />

                        <span>
                          {cliente.logradouro}
                          {cliente.numero
                            ? `, ${cliente.numero}`
                            : ""}
                          {cliente.bairro
                            ? ` - ${cliente.bairro}`
                            : ""}
                        </span>
                      </div>
                    )}

                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[8px] font-black text-emerald-700">
                    {cliente.ativo
                      ? "ATIVO"
                      : "INATIVO"}
                  </span>

                </div>

              </div>
            ),
          )}

        </section>

      </div>
    </main>
  );
}