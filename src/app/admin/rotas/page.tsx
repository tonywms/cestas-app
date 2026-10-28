export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

import {
  ApplyButton,
  EmptyState,
  Field,
  Hero,
  Kpi,
  KpiGrid,
  MiniMetric,
  ModuleHeader,
  QuickLink,
  SmartFilters,
  StatusBadge,
  dateTodayFortaleza,
  formatDate,
  inputClass,
  subtractDays,
} from "@/components/admin/PremiumModuleUi";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    entregador?: string;
    periodo?: string;
    progresso?: string;
    de?: string;
    ate?: string;
  }>;
};

export default async function RotasPage({
  searchParams,
}: PageProps) {
  const usuario = await getCurrentUserProfile();

  if (!usuario) redirect("/");

  const podeGerenciar =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo === "ADMINISTRADOR" ||
    usuario.perfilCodigo === "GESTOR" ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ROTA_GERENCIAR,
    );

  if (!podeGerenciar) redirect("/admin");

  const filtros = await searchParams;
  const supabase = await createClient();

  const { data: rotasData } = await supabase
    .from("rotas")
    .select(`
      id,
      codigo,
      entregador_id,
      data_rota,
      status,
      observacao,
      iniciada_at,
      finalizada_at,
      created_at
    `)
    .eq("empresa_id", usuario.empresa.id)
    .order("data_rota", { ascending: false })
    .order("created_at", { ascending: false });

  const rotasBase = rotasData ?? [];
  const rotaIds = rotasBase.map((item) => Number(item.id));
  const entregadorIds = Array.from(
    new Set(rotasBase.map((item) => String(item.entregador_id))),
  );

  const [usuariosResult, itensResult] = await Promise.all([
    entregadorIds.length
      ? supabase
          .from("usuarios")
          .select(`id, nome`)
          .in("id", entregadorIds)
      : Promise.resolve({ data: [], error: null }),

    rotaIds.length
      ? supabase
          .from("rota_clientes")
          .select(`rota_id, status`)
          .eq("empresa_id", usuario.empresa.id)
          .in("rota_id", rotaIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const usuariosMap = new Map(
    (usuariosResult.data ?? []).map((item) => [
      String(item.id),
      String(item.nome),
    ]),
  );

  const resumo = new Map<
    number,
    {
      total: number;
      entregues: number;
      ausentes: number;
    }
  >();

  for (const item of itensResult.data ?? []) {
    const rotaId = Number(item.rota_id);

    const atual =
      resumo.get(rotaId) ?? {
        total: 0,
        entregues: 0,
        ausentes: 0,
      };

    atual.total += 1;

    if (item.status === "ENTREGUE") atual.entregues += 1;
    if (item.status === "AUSENTE") atual.ausentes += 1;

    resumo.set(rotaId, atual);
  }

  const hoje = dateTodayFortaleza();
  let inicio: string | null = null;

  if (filtros.periodo === "hoje") {
    inicio = hoje;
  } else if (["7", "15", "30"].includes(filtros.periodo ?? "")) {
    inicio = subtractDays(hoje, Number(filtros.periodo) - 1);
  }

  const busca = (filtros.q ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR");

  const rotas = rotasBase
    .map((rota) => {
      const res =
        resumo.get(Number(rota.id)) ?? {
          total: 0,
          entregues: 0,
          ausentes: 0,
        };

      const percentual =
        res.total > 0
          ? Math.round((res.entregues / res.total) * 100)
          : 0;

      return {
        ...rota,
        entregadorNome:
          usuariosMap.get(String(rota.entregador_id)) ?? "Entregador",
        ...res,
        percentual,
      };
    })
    .filter((rota) => {
      if (
        busca &&
        !String(rota.codigo)
          .toLocaleLowerCase("pt-BR")
          .includes(busca) &&
        !rota.entregadorNome
          .toLocaleLowerCase("pt-BR")
          .includes(busca)
      ) {
        return false;
      }

      if (filtros.status && rota.status !== filtros.status) return false;

      if (
        filtros.entregador &&
        String(rota.entregador_id) !== filtros.entregador
      ) {
        return false;
      }

      if (filtros.de && String(rota.data_rota) < filtros.de) return false;
      if (filtros.ate && String(rota.data_rota) > filtros.ate) return false;

      if (
        !filtros.de &&
        !filtros.ate &&
        inicio &&
        String(rota.data_rota) < inicio
      ) {
        return false;
      }

      if (filtros.progresso === "concluida" && rota.percentual !== 100) {
        return false;
      }

      if (
        filtros.progresso === "parcial" &&
        !(rota.percentual > 0 && rota.percentual < 100)
      ) {
        return false;
      }

      if (filtros.progresso === "pendente" && rota.percentual !== 0) {
        return false;
      }

      return true;
    });

  const finalizadas = rotas.filter((r) => r.status === "FINALIZADA").length;
  const emRota = rotas.filter((r) => r.status === "EM_ROTA").length;
  const planejadas = rotas.filter((r) => r.status === "PLANEJADA").length;
  const clientes = rotas.reduce((sum, r) => sum + r.total, 0);
  const entregues = rotas.reduce((sum, r) => sum + r.entregues, 0);
  const ausentes = rotas.reduce((sum, r) => sum + r.ausentes, 0);

  const activeCount = Object.values(filtros).filter(
    (value) => typeof value === "string" && value.trim(),
  ).length;

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto max-w-[1180px]">
        <ModuleHeader
          eyebrow="Logística"
          title="Rotas"
          actions={
            <Link
              href="/admin/rotas/nova"
              className="rounded-[14px] bg-[#176f3c] px-4 py-3 text-[9px] font-black text-white"
            >
              + Nova rota
            </Link>
          }
        />

        <Hero
          eyebrow="Planejamento operacional"
          title="Rotas da empresa"
          description="Veja entregador, data, progresso, clientes atendidos e exceções sem precisar interpretar o status."
        >
          <KpiGrid>
            <Kpi label="Rotas" value={rotas.length} />
            <Kpi label="Planejadas" value={planejadas} />
            <Kpi label="Em rota" value={emRota} highlight={emRota > 0} />
            <Kpi label="Finalizadas" value={finalizadas} />
            <Kpi label="Clientes" value={clientes} />
            <Kpi
              label="Ausentes"
              value={ausentes}
              warning={ausentes > 0}
              subtitle={`${entregues} entregues`}
            />
          </KpiGrid>
        </Hero>

        <SmartFilters
          resetHref="/admin/rotas"
          activeCount={activeCount}
          quick={
            <div className="flex flex-wrap gap-2">
              <QuickLink
                href="/admin/rotas"
                active={!filtros.periodo && !filtros.status}
              >
                Todas
              </QuickLink>

              <QuickLink
                href="/admin/rotas?periodo=hoje"
                active={filtros.periodo === "hoje"}
              >
                Hoje
              </QuickLink>

              <QuickLink
                href="/admin/rotas?periodo=7"
                active={filtros.periodo === "7"}
              >
                7 dias
              </QuickLink>

              <QuickLink
                href="/admin/rotas?status=EM_ROTA"
                active={filtros.status === "EM_ROTA"}
              >
                Em rota
              </QuickLink>

              <QuickLink
                href="/admin/rotas?status=FINALIZADA"
                active={filtros.status === "FINALIZADA"}
              >
                Finalizadas
              </QuickLink>
            </div>
          }
        >
          <form
            method="get"
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"
          >
            <Field label="Buscar">
              <input
                name="q"
                defaultValue={filtros.q ?? ""}
                placeholder="Rota ou entregador"
                className={inputClass}
              />
            </Field>

            <Field label="Entregador">
              <select
                name="entregador"
                defaultValue={filtros.entregador ?? ""}
                className={inputClass}
              >
                <option value="">Todos</option>
                {(usuariosResult.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select
                name="status"
                defaultValue={filtros.status ?? ""}
                className={inputClass}
              >
                <option value="">Todos</option>
                <option value="PLANEJADA">Planejada</option>
                <option value="EM_ROTA">Em rota</option>
                <option value="FINALIZADA">Finalizada</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </Field>

            <Field label="Progresso">
              <select
                name="progresso"
                defaultValue={filtros.progresso ?? ""}
                className={inputClass}
              >
                <option value="">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="parcial">Parcial</option>
                <option value="concluida">Concluída</option>
              </select>
            </Field>

            <div className="flex items-end">
              <ApplyButton />
            </div>
          </form>
        </SmartFilters>

        <section className="mt-7">
          {rotas.length === 0 ? (
            <EmptyState
              title="Nenhuma rota encontrada"
              text="Ajuste os filtros ou crie uma nova rota."
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {rotas.map((rota) => {
                const tone =
                  rota.status === "FINALIZADA"
                    ? "green"
                    : rota.status === "EM_ROTA"
                      ? "blue"
                      : rota.status === "CANCELADA"
                        ? "red"
                        : "amber";

                return (
                  <Link
                    key={rota.id}
                    href={`/admin/rotas/${rota.id}`}
                    className="group block"
                  >
                    <article className="card-premium rounded-[28px] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[8px] font-black uppercase tracking-[0.13em] text-[#b28735]">
                          {formatDate(String(rota.data_rota))}
                        </p>

                        <h3 className="mt-1 text-[18px] font-black">
                          {rota.codigo}
                        </h3>
                      </div>

                      <StatusBadge tone={tone}>
                        {String(rota.status).replaceAll("_", " ")}
                      </StatusBadge>
                    </div>

                    <div className="mt-4 rounded-[18px] border border-emerald-100 bg-[#f5faf6] p-4">
                      <p className="text-[7px] font-black uppercase tracking-[0.13em] text-emerald-700">
                        Entregador responsável
                      </p>

                      <p className="mt-1 text-[15px] font-black">
                        {rota.entregadorNome}
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <MiniMetric label="Clientes" value={rota.total} />
                      <MiniMetric
                        label="Entregues"
                        value={rota.entregues}
                        tone="green"
                      />
                      <MiniMetric
                        label="Ausentes"
                        value={rota.ausentes}
                        tone={rota.ausentes > 0 ? "amber" : "default"}
                      />
                    </div>

                    <div className="mt-4 rounded-[18px] bg-[#f5f8f5] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[8px] font-black text-slate-500">
                          {rota.entregues} de {rota.total} concluído(s)
                        </span>

                        <span className="text-[16px] font-black text-emerald-700">
                          {rota.percentual}%
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-[#176f3c]"
                          style={{ width: `${rota.percentual}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-emerald-700">
                          Abrir acompanhamento
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          Clientes, entregas, ocorrências e andamento
                        </p>
                      </div>

                      <span className="text-[22px] font-black text-emerald-700 transition group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  </article>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}