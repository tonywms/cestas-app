export const instant = false;

import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Clock3,
  PackageCheck,
  Plus,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Truck,
  UserRound,
} from "lucide-react";

import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

import CargasFiltros from "./CargasFiltros";

type PageProps = {
  searchParams: Promise<{
    busca?: string;
    entregador?: string;
    status?: string;
    conferencia?: string;
    periodo?: string;
    movimento?: string;
    de?: string;
    ate?: string;
  }>;
};

type CargaResumo = {
  id: number;
  codigo: string;
  entregadorId: string;
  entregadorNome: string;
  dataCarga: string;
  status: string;
  observacao: string | null;
  recebidaAt: string | null;
  finalizadaAt: string | null;
  carregado: number;
  entregue: number;
  retornado: number;
  avariado: number;
  saldo: number;
  esperadoBipagem: number;
  confirmadoBipagem: number;
};

function formatarData(valor: string | null) {
  if (!valor) return "—";

  const somenteData = /^\d{4}-\d{2}-\d{2}$/.test(valor);
  const data = somenteData ? new Date(`${valor}T12:00:00`) : new Date(valor);

  if (Number.isNaN(data.getTime())) return valor;

  return data.toLocaleDateString("pt-BR", {
    timeZone: "America/Fortaleza",
  });
}

function hojeFortaleza() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function subtrairDias(
  dataTexto: string,
  dias: number,
) {
  const data =
    new Date(
      `${dataTexto}T12:00:00Z`,
    );

  data.setUTCDate(
    data.getUTCDate() -
      dias,
  );

  return data
    .toISOString()
    .slice(0, 10);
}

function normalizarStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letra) => letra.toUpperCase());
}

function classeStatus(status: string) {
  switch (status) {
    case "FINALIZADA":
      return "border-emerald-100 bg-emerald-50 text-emerald-700";
    case "EM_ROTA":
      return "border-sky-100 bg-sky-50 text-sky-700";
    case "ABERTA":
      return "border-amber-100 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function classeIcone(status: string) {
  switch (status) {
    case "FINALIZADA":
      return "bg-emerald-100 text-emerald-700";
    case "EM_ROTA":
      return "bg-sky-100 text-sky-700";
    case "ABERTA":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default async function CargasPage({
  searchParams,
}: PageProps) {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const filtros =
    await searchParams;

  const supabase = await createClient();

  const { data: cargasData, error: cargasError } = await supabase
    .from("cargas")
    .select(`
      id,
      codigo,
      entregador_id,
      data_carga,
      status,
      observacao,
      recebida_at,
      finalizada_at,
      created_at
    `)
    .eq("empresa_id", usuario.empresa.id)
    .order("created_at", { ascending: false });

  if (cargasError) {
    console.error("Erro ao consultar cargas:", cargasError);
  }

  const cargasBase = cargasData ?? [];
  const cargaIds = cargasBase.map((carga) => Number(carga.id));

  const entregadorIds = Array.from(
    new Set(
      cargasBase
        .map((carga) => carga.entregador_id)
        .filter(Boolean),
    ),
  );

  const [usuariosResult, itensResult, bipagensResult] = await Promise.all([
    entregadorIds.length > 0
      ? supabase
          .from("usuarios")
          .select(`id, nome`)
          .in("id", entregadorIds)
      : Promise.resolve({ data: [], error: null }),

    cargaIds.length > 0
      ? supabase
          .from("carga_itens")
          .select(`
            carga_id,
            quantidade_carregada,
            quantidade_entregue,
            quantidade_retornada,
            quantidade_avariada
          `)
          .eq("empresa_id", usuario.empresa.id)
          .in("carga_id", cargaIds)
      : Promise.resolve({ data: [], error: null }),

    cargaIds.length > 0
      ? supabase
          .from("carga_volume_bipagens")
          .select(`carga_id, volume_id`)
          .eq("empresa_id", usuario.empresa.id)
          .in("carga_id", cargaIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const usuariosMap = new Map(
    (usuariosResult.data ?? []).map((item) => [
      String(item.id),
      String(item.nome ?? "Entregador"),
    ]),
  );

  const entregadoresFiltro = Array.from(
    usuariosMap.entries(),
  )
    .map(([id, nome]) => ({
      id,
      nome,
    }))
    .sort((a, b) =>
      a.nome.localeCompare(
        b.nome,
        "pt-BR",
      ),
    );

  const itensPorCarga = new Map<
    number,
    {
      carregado: number;
      entregue: number;
      retornado: number;
      avariado: number;
    }
  >();

  for (const item of itensResult.data ?? []) {
    const cargaId = Number(item.carga_id);

    const atual = itensPorCarga.get(cargaId) ?? {
      carregado: 0,
      entregue: 0,
      retornado: 0,
      avariado: 0,
    };

    atual.carregado += Number(item.quantidade_carregada ?? 0);
    atual.entregue += Number(item.quantidade_entregue ?? 0);
    atual.retornado += Number(item.quantidade_retornada ?? 0);
    atual.avariado += Number(item.quantidade_avariada ?? 0);

    itensPorCarga.set(cargaId, atual);
  }

  const bipagensPorCarga = new Map<number, number>();

  for (const item of bipagensResult.data ?? []) {
    const cargaId = Number(item.carga_id);

    bipagensPorCarga.set(
      cargaId,
      (bipagensPorCarga.get(cargaId) ?? 0) + 1,
    );
  }

  const todasCargas: CargaResumo[] = cargasBase.map((carga) => {
    const cargaId = Number(carga.id);

    const totais = itensPorCarga.get(cargaId) ?? {
      carregado: 0,
      entregue: 0,
      retornado: 0,
      avariado: 0,
    };

    const saldo = Math.max(
      0,
      totais.carregado -
        totais.entregue -
        totais.retornado -
        totais.avariado,
    );

    return {
      id: cargaId,
      codigo: String(carga.codigo),
      entregadorId: String(carga.entregador_id),
      entregadorNome:
        usuariosMap.get(String(carga.entregador_id)) ?? "Entregador",
      dataCarga: String(carga.data_carga ?? ""),
      status: String(carga.status),
      observacao: carga.observacao ? String(carga.observacao) : null,
      recebidaAt: carga.recebida_at ? String(carga.recebida_at) : null,
      finalizadaAt: carga.finalizada_at ? String(carga.finalizada_at) : null,
      carregado: totais.carregado,
      entregue: totais.entregue,
      retornado: totais.retornado,
      avariado: totais.avariado,
      saldo,
      esperadoBipagem: totais.carregado,
      confirmadoBipagem: bipagensPorCarga.get(cargaId) ?? 0,
    };
  });

  const busca =
    (filtros.busca ?? "")
      .trim()
      .toLocaleLowerCase(
        "pt-BR",
      );

  const hoje =
    hojeFortaleza();

  let inicioPeriodo:
    string | null = null;

  if (
    filtros.periodo ===
    "hoje"
  ) {
    inicioPeriodo =
      hoje;
  } else if (
    ["7", "15", "30"].includes(
      filtros.periodo ??
        "",
    )
  ) {
    const dias =
      Number(
        filtros.periodo,
      );

    inicioPeriodo =
      subtrairDias(
        hoje,
        dias - 1,
      );
  }

  const cargas = todasCargas.filter((carga) => {
    if (
      busca &&
      !carga.codigo
        .toLocaleLowerCase(
          "pt-BR",
        )
        .includes(busca) &&
      !carga.entregadorNome
        .toLocaleLowerCase(
          "pt-BR",
        )
        .includes(busca)
    ) {
      return false;
    }

    if (
      filtros.entregador &&
      carga.entregadorId !==
        filtros.entregador
    ) {
      return false;
    }

    if (
      filtros.status &&
      carga.status !==
        filtros.status
    ) {
      return false;
    }

    if (
      filtros.conferencia ===
        "completa" &&
      carga.recebidaAt ===
        null
    ) {
      return false;
    }

    if (
      filtros.conferencia ===
        "pendente" &&
      carga.recebidaAt !==
        null
    ) {
      return false;
    }

    if (
      filtros.de &&
      carga.dataCarga <
        filtros.de
    ) {
      return false;
    }

    if (
      filtros.ate &&
      carga.dataCarga >
        filtros.ate
    ) {
      return false;
    }

    if (
      !filtros.de &&
      !filtros.ate &&
      inicioPeriodo &&
      carga.dataCarga <
        inicioPeriodo
    ) {
      return false;
    }

    if (
      !filtros.de &&
      !filtros.ate &&
      inicioPeriodo &&
      carga.dataCarga >
        hoje
    ) {
      return false;
    }

    switch (
      filtros.movimento
    ) {
      case "saldo":
        if (
          carga.saldo <=
          0
        ) {
          return false;
        }
        break;

      case "entrega":
        if (
          carga.entregue <=
          0
        ) {
          return false;
        }
        break;

      case "retorno":
        if (
          carga.retornado <=
          0
        ) {
          return false;
        }
        break;

      case "avaria":
        if (
          carga.avariado <=
          0
        ) {
          return false;
        }
        break;
    }

    return true;
  });

  const filtrosAtivos =
    Object.values(
      filtros,
    ).some(
      (
        valor,
      ) =>
        typeof valor ===
          "string" &&
        valor.trim() !==
          "",
    );

  const abertas = cargas.filter(
    (carga) => carga.status === "ABERTA" || carga.status === "EM_ROTA",
  ).length;

  const finalizadas = cargas.filter(
    (carga) => carga.status === "FINALIZADA",
  ).length;

  const emPosse = cargas
    .filter(
      (carga) => carga.status === "ABERTA" || carga.status === "EM_ROTA",
    )
    .reduce((total, carga) => total + carga.saldo, 0);

  const totalEntregue = cargas.reduce(
    (total, carga) => total + carga.entregue,
    0,
  );

  const totalRetornado = cargas.reduce(
    (total, carga) => total + carga.retornado,
    0,
  );

  const totalAvariado = cargas.reduce(
    (total, carga) => total + carga.avariado,
    0,
  );

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto max-w-[1220px]">

        <header className="glass animate-fade-up flex flex-wrap items-center justify-between gap-4 rounded-[28px] px-5 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#b28735]">
                Estoque móvel
              </p>
              <h1 className="mt-0.5 text-[20px] font-black tracking-[-0.04em]">
                Gestão de cargas
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/estoque"
              className="flex h-[44px] items-center gap-2 rounded-[14px] border border-emerald-100 bg-white px-4 text-[10px] font-black text-emerald-800 transition hover:bg-emerald-50"
            >
              <Boxes size={16} />
              Estoque central
            </Link>

            <Link
              href="/admin/volumes"
              className="flex h-[44px] items-center gap-2 rounded-[14px] border border-emerald-100 bg-white px-4 text-[10px] font-black text-emerald-800 transition hover:bg-emerald-50"
            >
              <ScanLine size={16} />
              Volumes
            </Link>

            <Link
              href="/admin/cargas/nova"
              className="flex h-[44px] items-center gap-2 rounded-[14px] bg-[#176f3c] px-4 text-[10px] font-black text-white shadow-[0_12px_24px_rgba(23,111,60,0.16)] transition hover:bg-[#126333]"
            >
              <Plus size={16} />
              Nova carga
            </Link>
          </div>
        </header>

        <section className="relative mt-6 overflow-hidden rounded-[36px] bg-[linear-gradient(132deg,#0a4b29_0%,#126636_42%,#238747_100%)] px-7 py-8 text-white shadow-[0_28px_72px_rgba(18,87,47,0.20)]">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border-[44px] border-white/[0.035]" />
          <div className="pointer-events-none absolute bottom-[-90px] right-[26%] h-44 w-44 rounded-full bg-[#f4b13f]/[0.045]" />

          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
                  <Truck size={14} />
                  Central operacional
                </div>

                <h2 className="mt-3 text-[36px] font-black tracking-[-0.06em]">
                  Cargas da empresa
                  <span className="text-[#f4b13f]">.</span>
                </h2>

                <p className="mt-2 max-w-[690px] text-[11px] leading-5 text-white/65">
                  Saiba quem está com cada carga, acompanhe entrega, retorno,
                  avaria, saldo e acesse a rastreabilidade dos QR Codes.
                </p>
              </div>

              <div className="rounded-[18px] border border-white/10 bg-white/[0.07] px-4 py-3 text-right backdrop-blur-sm">
                <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/45">
                  {filtrosAtivos ? "Visão filtrada" : "Visão geral"}
                </p>
                <p className="mt-1 text-[22px] font-black">
                  {cargas.length}
                </p>
                <p className="text-[7px] font-bold text-white/55">
                  carga(s) exibida(s)
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Kpi label="Abertas" valor={abertas} />
              <Kpi label="Finalizadas" valor={finalizadas} />
              <Kpi label="Em posse" valor={emPosse} destaque />
              <Kpi label="Entregues" valor={totalEntregue} />
              <Kpi label="Retornos" valor={totalRetornado} />
              <Kpi label="Avarias" valor={totalAvariado} alerta={totalAvariado > 0} />
            </div>
          </div>
        </section>

        <CargasFiltros
          entregadores={
            entregadoresFiltro
          }
        />

        <section className="mt-7">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b28735]">
                Operação
              </p>
              <h3 className="mt-1 text-[22px] font-black tracking-[-0.04em]">
                Histórico de cargas
              </h3>
            </div>

            <span className="rounded-full border border-emerald-100 bg-white px-4 py-2 text-[9px] font-black text-emerald-700 shadow-sm">
              {cargas.length} de {todasCargas.length}
            </span>
          </div>

          {cargas.length === 0 ? (
            <div className="rounded-[30px] border border-black/[0.04] bg-white p-12 text-center shadow-[0_18px_45px_rgba(17,63,33,0.06)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-emerald-50 text-emerald-700">
                <Truck size={28} />
              </div>

              <h3 className="mt-5 text-[20px] font-black">
                Nenhuma carga encontrada
              </h3>

              <p className="mt-2 text-[11px] text-slate-400">
                Ajuste ou limpe os filtros para visualizar outros registros.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {cargas.map((carga) => {
                const progresso =
                  carga.carregado > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (carga.entregue / carga.carregado) * 100,
                        ),
                      )
                    : 0;

                const bipagemCompleta = carga.recebidaAt !== null;

                return (
                  <article
                    key={carga.id}
                    className="overflow-hidden rounded-[30px] border border-black/[0.045] bg-white shadow-[0_18px_48px_rgba(17,63,33,0.07)]"
                  >
                    <div className="p-5">

                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] ${classeIcone(
                            carga.status,
                          )}`}
                        >
                          {carga.status === "FINALIZADA" ? (
                            <CheckCircle2 size={21} />
                          ) : carga.status === "EM_ROTA" ? (
                            <Truck size={21} />
                          ) : (
                            <Clock3 size={21} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="truncate text-[17px] font-black tracking-[-0.025em]">
                              {carga.codigo}
                            </h4>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.08em] ${classeStatus(
                                carga.status,
                              )}`}
                            >
                              {normalizarStatus(carga.status)}
                            </span>
                          </div>

                          <p className="mt-1 text-[8px] text-slate-400">
                            Carga em {formatarData(carga.dataCarga)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-3 rounded-[18px] border border-emerald-100 bg-[#f5faf6] px-4 py-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#176f3c] text-white shadow-[0_8px_18px_rgba(23,111,60,0.16)]">
                          <UserRound size={18} />
                        </div>

                        <div className="min-w-0">
                          <p className="text-[7px] font-black uppercase tracking-[0.14em] text-emerald-700">
                            Entregador responsável
                          </p>

                          <p className="mt-0.5 truncate text-[15px] font-black tracking-[-0.02em] text-[#142018]">
                            {carga.entregadorNome}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-5 gap-2">
                        <MiniKpi label="Carga" valor={carga.carregado} />
                        <MiniKpi label="Entregue" valor={carga.entregue} />
                        <MiniKpi label="Retorno" valor={carga.retornado} />
                        <MiniKpi
                          label="Avaria"
                          valor={carga.avariado}
                          alerta={carga.avariado > 0}
                        />
                        <MiniKpi label="Saldo" valor={carga.saldo} destaque />
                      </div>

                      <div className="mt-4 rounded-[19px] bg-[#f5f8f5] p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-400">
                              Progresso de entrega
                            </p>
                            <p className="mt-1 text-[11px] font-black">
                              {carga.entregue} de {carga.carregado} entregue(s)
                            </p>
                          </div>

                          <span className="text-[18px] font-black text-[#176f3c]">
                            {progresso}%
                          </span>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#dfe9e2]">
                          <div
                            className="h-full rounded-full bg-[#176f3c]"
                            style={{ width: `${progresso}%` }}
                          />
                        </div>
                      </div>

                      {usuario.configuracao.modoControleCarga === "VOLUME" && (
                        <Link
                          href={`/admin/cargas/${carga.id}`}
                          className="group mt-3 flex items-center justify-between gap-3 rounded-[18px] border border-emerald-100 bg-emerald-50/60 px-4 py-3.5 transition hover:border-emerald-200 hover:bg-emerald-50"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white text-emerald-700 shadow-sm">
                              <ScanLine size={17} />
                            </div>

                            <div className="min-w-0">
                              <p className="text-[7px] font-black uppercase tracking-[0.13em] text-emerald-700">
                                Conferência da carga
                              </p>

                              <p className="mt-0.5 text-[11px] font-black text-[#142018]">
                                {carga.confirmadoBipagem}/{carga.esperadoBipagem} bipado(s)
                              </p>

                              <p className="mt-0.5 text-[8px] text-slate-400">
                                Clique para visualizar os QR Codes conferidos
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <span className="hidden text-[8px] font-black text-emerald-700 sm:inline">
                              {bipagemCompleta ? "Conferida" : "Pendente"}
                            </span>
                            <ArrowUpRight
                              size={16}
                              className="text-emerald-700 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                            />
                          </div>
                        </Link>
                      )}

                      {carga.observacao && (
                        <div className="mt-3 rounded-[17px] border border-slate-100 px-4 py-3">
                          <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">
                            Observação
                          </p>

                          <p className="mt-1 text-[9px] leading-4 text-slate-500">
                            {carga.observacao}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-100 bg-[#fbfcfb] px-5 py-4">
                      <div className="mx-auto flex max-w-[360px] items-center justify-center gap-8 text-center">
                        <div className="min-w-[110px]">
                          <p className="text-[7px] font-black uppercase tracking-[0.13em] text-slate-400">
                            Recebimento
                          </p>
                          <p className="mt-1 text-[10px] font-black text-[#142018]">
                            {carga.recebidaAt
                              ? formatarData(carga.recebidaAt)
                              : "Pendente"}
                          </p>
                        </div>

                        <div className="h-8 w-px bg-slate-200" />

                        <div className="min-w-[110px]">
                          <p className="text-[7px] font-black uppercase tracking-[0.13em] text-slate-400">
                            Fechamento
                          </p>
                          <p className="mt-1 text-[10px] font-black text-[#142018]">
                            {carga.finalizadaAt
                              ? formatarData(carga.finalizadaAt)
                              : "Em aberto"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          <Legenda
            icon={<PackageCheck size={17} />}
            titulo="Entrega"
            texto="Baixa o saldo móvel e registra o volume entregue ao cliente."
          />
          <Legenda
            icon={<RotateCcw size={17} />}
            titulo="Retorno"
            texto="Devolve a cesta e o QR para o estoque central disponível."
          />
          <Legenda
            icon={<AlertTriangle size={17} />}
            titulo="Avaria"
            texto="Baixa o saldo da carga e mantém o volume identificado como avariado."
          />
        </section>
      </div>
    </main>
  );
}

function Kpi({
  label,
  valor,
  destaque = false,
  alerta = false,
}: {
  label: string;
  valor: number;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <div
      className={`rounded-[19px] border px-4 py-4 backdrop-blur-sm ${
        alerta
          ? "border-[#f4b13f]/35 bg-[#f4b13f]/10"
          : destaque
            ? "border-[#f4b13f]/35 bg-[#f4b13f]/10"
            : "border-white/10 bg-white/[0.075]"
      }`}
    >
      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/55">
        {label}
      </p>

      <div className="mt-2 flex items-end justify-between gap-2">
        <p
          className={`text-[25px] font-black leading-none ${
            alerta || destaque
              ? "text-[#ffd27a]"
              : "text-white"
          }`}
        >
          {valor}
        </p>

        <span
          className={`h-2 w-2 rounded-full ${
            alerta || destaque
              ? "bg-[#f4b13f]"
              : "bg-emerald-300/70"
          }`}
        />
      </div>
    </div>
  );
}

function MiniKpi({
  label,
  valor,
  destaque = false,
  alerta = false,
}: {
  label: string;
  valor: number;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <div
      className={`rounded-[15px] px-2 py-3 text-center ${
        alerta
          ? "bg-amber-50"
          : destaque
            ? "bg-emerald-50"
            : "bg-[#f5f8f5]"
      }`}
    >
      <p
        className={`text-[16px] font-black ${
          alerta
            ? "text-amber-700"
            : destaque
              ? "text-emerald-700"
              : "text-[#142018]"
        }`}
      >
        {valor}
      </p>

      <p className="mt-1 text-[6px] font-black uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

function Legenda({
  icon,
  titulo,
  texto,
}: {
  icon: React.ReactNode;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[22px] border border-black/[0.04] bg-white p-4 shadow-[0_12px_30px_rgba(17,63,33,0.04)]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-emerald-50 text-emerald-700">
        {icon}
      </div>

      <div>
        <p className="text-[10px] font-black">{titulo}</p>

        <p className="mt-1 text-[8px] leading-4 text-slate-400">
          {texto}
        </p>
      </div>
    </div>
  );
}
