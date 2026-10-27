export const instant = false;

import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  MapPinned,
  Plus,
  Route,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

function statusClasses(status: string) {
  if (status === "FINALIZADA") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "EM_ROTA") {
    return "bg-blue-50 text-blue-700";
  }

  if (status === "CANCELADA") {
    return "bg-red-50 text-red-700";
  }

  return "bg-amber-50 text-amber-700";
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.split("-");

  if (!ano || !mes || !dia) {
    return data;
  }

  return `${dia}/${mes}/${ano}`;
}

export default async function RotasPage() {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const podeGerenciar =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo === "ADMINISTRADOR" ||
    usuario.perfilCodigo === "GESTOR" ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ROTA_GERENCIAR,
    );

  if (!podeGerenciar) {
    redirect("/admin");
  }

  const supabase = await createClient();

  const {
    data: rotas,
    error: rotasError,
  } = await supabase
    .from("rotas")
    .select(`
      id,
      codigo,
      entregador_id,
      data_rota,
      status,
      observacao,
      created_at
    `)
    .eq("empresa_id", usuario.empresa.id)
    .order("data_rota", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    });

  if (rotasError) {
    console.error(
      "Erro ao carregar rotas:",
      rotasError,
    );
  }

  const listaRotas = rotas ?? [];

  const entregadorIds = Array.from(
    new Set(
      listaRotas.map(
        (rota) => rota.entregador_id,
      ),
    ),
  );

  const rotaIds = listaRotas.map(
    (rota) => rota.id,
  );

  const [
    entregadoresResult,
    itensResult,
  ] = await Promise.all([
    entregadorIds.length > 0
      ? supabase
          .from("usuarios")
          .select(`
            id,
            nome
          `)
          .in("id", entregadorIds)
      : Promise.resolve({
          data: [],
          error: null,
        }),

    rotaIds.length > 0
      ? supabase
          .from("rota_clientes")
          .select(`
            rota_id,
            status
          `)
          .eq("empresa_id", usuario.empresa.id)
          .in("rota_id", rotaIds)
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  const entregadoresMap = new Map(
    (entregadoresResult.data ?? []).map(
      (entregador) => [
        entregador.id,
        entregador.nome,
      ],
    ),
  );

  const resumoRotas = new Map<
    number,
    {
      total: number;
      processados: number;
      entregues: number;
      ocorrencias: number;
    }
  >();

  for (
    const item of itensResult.data ?? []
  ) {
    const atual =
      resumoRotas.get(item.rota_id) ?? {
        total: 0,
        processados: 0,
        entregues: 0,
        ocorrencias: 0,
      };

    atual.total += 1;

    if (item.status !== "PENDENTE") {
      atual.processados += 1;
    }

    if (item.status === "ENTREGUE") {
      atual.entregues += 1;
    } else if (item.status !== "PENDENTE") {
      atual.ocorrencias += 1;
    }

    resumoRotas.set(
      item.rota_id,
      atual,
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f7f4] px-4 py-6 text-[#142018] md:px-6 md:py-8">
      <div className="mx-auto max-w-[1100px]">
        <header className="flex items-center justify-between gap-4 rounded-[26px] bg-white px-5 py-4 shadow-[0_12px_40px_rgba(17,63,33,0.05)]">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-700">
                Logística
              </p>

              <h1 className="mt-0.5 text-base font-black">
                Rotas
              </h1>
            </div>
          </div>

          <Link
            href="/admin/rotas/nova"
            className="flex h-[44px] items-center gap-2 rounded-[14px] bg-[#176f3c] px-4 text-xs font-black text-white transition hover:bg-[#125d32]"
          >
            <Plus size={17} />
            Nova rota
          </Link>
        </header>

        <section className="relative mt-5 overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#176f3c,#0d5a30)] p-7 text-white shadow-[0_20px_55px_rgba(17,86,46,0.14)] md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/[0.035]" />

          <Route size={27} />

          <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
            Planejamento operacional
          </p>

          <h2 className="mt-2 text-[30px] font-black tracking-[-0.05em]">
            Rotas da empresa.
          </h2>

          <p className="mt-3 text-xs text-white/65">
            {listaRotas.length} rota(s) cadastrada(s) em{" "}
            {usuario.empresa.nomeFantasia}.
          </p>
        </section>

        <section className="mt-5 space-y-3">
          {listaRotas.length === 0 ? (
            <div className="rounded-[28px] bg-white p-10 text-center shadow-sm">
              <MapPinned
                size={38}
                className="mx-auto text-emerald-700"
              />

              <h3 className="mt-5 text-lg font-black">
                Nenhuma rota criada
              </h3>

              <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-400">
                Crie a primeira rota e vincule os clientes ao entregador.
              </p>

              <Link
                href="/admin/rotas/nova"
                className="mx-auto mt-6 flex h-[48px] max-w-[260px] items-center justify-center gap-2 rounded-[15px] bg-[#176f3c] text-xs font-black text-white"
              >
                <Plus size={16} />
                Criar primeira rota
              </Link>
            </div>
          ) : (
            listaRotas.map(
              (rota) => {
                const resumo =
                  resumoRotas.get(rota.id) ?? {
                    total: 0,
                    processados: 0,
                    entregues: 0,
                    ocorrencias: 0,
                  };

                const percentual =
                  resumo.total > 0
                    ? Math.round(
                        (resumo.processados /
                          resumo.total) *
                          100,
                      )
                    : 0;

                return (
                  <Link
                    key={rota.id}
                    href={`/admin/rotas/${rota.id}`}
                    className="group block rounded-[24px] border border-black/[0.04] bg-white p-5 shadow-[0_12px_35px_rgba(17,63,33,0.05)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_18px_45px_rgba(17,63,33,0.10)]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-emerald-50 text-emerald-700">
                        {rota.status ===
                        "FINALIZADA" ? (
                          <CheckCircle2
                            size={21}
                          />
                        ) : (
                          <Truck
                            size={21}
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-black">
                            {rota.codigo}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1.5 text-[8px] font-black ${statusClasses(
                              rota.status,
                            )}`}
                          >
                            {rota.status}
                          </span>
                        </div>

                        <p className="mt-1 text-[10px] text-slate-400">
                          {entregadoresMap.get(
                            rota.entregador_id,
                          ) ?? "Entregador"}
                          {" • "}
                          {formatarData(
                            rota.data_rota,
                          )}
                        </p>
                      </div>

                      <ChevronRight
                        size={18}
                        className="mt-2 text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600"
                      />
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                        <span>
                          {resumo.processados} de{" "}
                          {resumo.total} processado(s)
                        </span>

                        <span>
                          {percentual}%
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#176f3c]"
                          style={{
                            width: `${percentual}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-[0.08em]">
                      <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                        {resumo.entregues} entrega(s)
                      </span>

                      {resumo.ocorrencias > 0 && (
                        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">
                          {resumo.ocorrencias} ocorrência(s)
                        </span>
                      )}
                    </div>
                  </Link>
                );
              },
            )
          )}
        </section>
      </div>
    </main>
  );
}