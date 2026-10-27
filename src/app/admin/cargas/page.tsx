export const instant = false;

import {
  ArrowLeft,
  Plus,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

export default async function CargasPage() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const supabase =
    await createClient();

  const {
    data: cargas,
  } = await supabase
    .from("cargas")
    .select(`
      id,
      codigo,
      entregador_id,
      data_carga,
      status,
      observacao
    `)
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    );

  const entregadorIds =
    Array.from(
      new Set(
        (cargas ?? []).map(
          (carga) =>
            carga.entregador_id,
        ),
      ),
    );

  const {
    data: usuarios,
  } =
    entregadorIds.length > 0
      ? await supabase
          .from("usuarios")
          .select(`
            id,
            nome
          `)
          .in(
            "id",
            entregadorIds,
          )
      : {
          data: [],
        };

  const usuariosMap =
    new Map(
      (usuarios ?? []).map(
        (item) => [
          item.id,
          item.nome,
        ],
      ),
    );

  return (
    <main className="min-h-screen bg-[#f3f7f4] px-4 py-6">
      <div className="mx-auto max-w-[1000px]">

        <header className="flex items-center justify-between rounded-[26px] bg-white px-5 py-4 shadow-sm">

          <div className="flex items-center gap-4">
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
                Cargas
              </h1>
            </div>
          </div>

          <Link
            href="/admin/cargas/nova"
            className="flex h-[44px] items-center gap-2 rounded-[14px] bg-[#176f3c] px-4 text-xs font-black text-white"
          >
            <Plus size={17} />

            Nova carga
          </Link>

        </header>

        <section className="mt-5 rounded-[30px] bg-[linear-gradient(135deg,#176f3c,#0d5a30)] p-7 text-white">

          <Truck size={25} />

          <h2 className="mt-4 text-[30px] font-black tracking-[-0.05em]">
            Estoque em movimento.
          </h2>

          <p className="mt-2 text-xs text-white/60">
            {cargas?.length ?? 0} carga(s) cadastrada(s).
          </p>

        </section>

        <section className="mt-5 space-y-3">

          {(cargas ?? []).length ===
          0 ? (
            <div className="rounded-[28px] bg-white p-10 text-center shadow-sm">
              <Truck
                size={35}
                className="mx-auto text-emerald-700"
              />

              <h3 className="mt-4 text-base font-black">
                Nenhuma carga criada
              </h3>

              <p className="mt-2 text-xs text-slate-400">
                Crie a primeira carga para um entregador.
              </p>
            </div>
          ) : (
            (cargas ?? []).map(
              (carga) => (
                <div
                  key={
                    carga.id
                  }
                  className="flex items-center gap-4 rounded-[22px] bg-white p-5 shadow-sm"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-emerald-50 text-emerald-700">
                    <Truck
                      size={21}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-black">
                      {
                        carga.codigo
                      }
                    </p>

                    <p className="mt-1 text-[10px] text-slate-400">
                      {
                        usuariosMap.get(
                          carga.entregador_id,
                        ) ??
                        "Entregador"
                      }
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[9px] font-black text-emerald-700">
                      {
                        carga.status
                      }
                    </span>

                    <p className="mt-2 text-[9px] text-slate-400">
                      {
                        carga.data_carga
                      }
                    </p>
                  </div>
                </div>
              ),
            )
          )}

        </section>

      </div>
    </main>
  );
}