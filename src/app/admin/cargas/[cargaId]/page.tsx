export const instant = false;

import {
  ArrowLeft,
  Barcode,
  CheckCircle2,
  Clock3,
  PackageCheck,
  ScanLine,
  Truck,
  UserRound,
} from "lucide-react";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    cargaId: string;
  }>;
};

function formatarDataHora(valor: string | null) {
  if (!valor) return "—";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return valor;
  }

  return data.toLocaleString("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function classeStatusVolume(status: string) {
  switch (status) {
    case "ENTREGUE":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "EM_CARGA":
      return "bg-sky-50 text-sky-700 border-sky-100";
    case "DISPONIVEL":
    case "RETORNADO":
      return "bg-slate-50 text-slate-600 border-slate-200";
    case "AVARIADO":
      return "bg-amber-50 text-amber-700 border-amber-100";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

export default async function CargaDetalhePage({
  params,
}: PageProps) {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const { cargaId: cargaIdTexto } = await params;
  const cargaId = Number(cargaIdTexto);

  if (!Number.isInteger(cargaId) || cargaId <= 0) {
    notFound();
  }

  const supabase = await createClient();

  const { data: carga, error: cargaError } = await supabase
    .from("cargas")
    .select(`
      id,
      codigo,
      entregador_id,
      data_carga,
      status,
      recebida_at,
      finalizada_at
    `)
    .eq("empresa_id", usuario.empresa.id)
    .eq("id", cargaId)
    .maybeSingle();

  if (cargaError || !carga) {
    notFound();
  }

  const [
    entregadorResult,
    itensResult,
    bipagensResult,
  ] = await Promise.all([
    supabase
      .from("usuarios")
      .select(`id, nome`)
      .eq("id", carga.entregador_id)
      .maybeSingle(),

    supabase
      .from("carga_itens")
      .select(`
        quantidade_carregada,
        quantidade_entregue,
        quantidade_retornada,
        quantidade_avariada
      `)
      .eq("empresa_id", usuario.empresa.id)
      .eq("carga_id", cargaId),

    supabase
      .from("carga_volume_bipagens")
      .select(`
        id,
        volume_id,
        usuario_id,
        bipado_at
      `)
      .eq("empresa_id", usuario.empresa.id)
      .eq("carga_id", cargaId)
      .order("bipado_at", { ascending: true }),
  ]);

  const bipagens = bipagensResult.data ?? [];
  const volumeIds = Array.from(
    new Set(
      bipagens
        .map((item) => String(item.volume_id))
        .filter(Boolean),
    ),
  );

  const usuarioIds = Array.from(
    new Set(
      bipagens
        .map((item) => String(item.usuario_id))
        .filter(Boolean),
    ),
  );

  const [volumesResult, usuariosBipagemResult] = await Promise.all([
    volumeIds.length > 0
      ? supabase
          .from("cesta_volumes")
          .select(`
            id,
            codigo_volume,
            status,
            carga_id,
            entrega_id,
            entregue_at
          `)
          .eq("empresa_id", usuario.empresa.id)
          .in("id", volumeIds)
      : Promise.resolve({ data: [], error: null }),

    usuarioIds.length > 0
      ? supabase
          .from("usuarios")
          .select(`id, nome`)
          .in("id", usuarioIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const volumesMap = new Map(
    (volumesResult.data ?? []).map((volume) => [
      String(volume.id),
      volume,
    ]),
  );

  const usuariosMap = new Map(
    (usuariosBipagemResult.data ?? []).map((item) => [
      String(item.id),
      String(item.nome ?? "Usuário"),
    ]),
  );

  const totais = (itensResult.data ?? []).reduce(
    (acc, item) => {
      acc.carregado += Number(item.quantidade_carregada ?? 0);
      acc.entregue += Number(item.quantidade_entregue ?? 0);
      acc.retornado += Number(item.quantidade_retornada ?? 0);
      acc.avariado += Number(item.quantidade_avariada ?? 0);
      return acc;
    },
    {
      carregado: 0,
      entregue: 0,
      retornado: 0,
      avariado: 0,
    },
  );

  const saldo = Math.max(
    0,
    totais.carregado -
      totais.entregue -
      totais.retornado -
      totais.avariado,
  );

  const entregadorNome =
    String(
      entregadorResult.data?.nome ??
      "Entregador",
    );

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto max-w-[980px]">

        <header className="glass flex items-center justify-between gap-4 rounded-[28px] px-5 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/cargas"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-emerald-700"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b28735]">
                Rastreabilidade da carga
              </p>
              <h1 className="mt-0.5 text-[20px] font-black tracking-[-0.04em]">
                Volumes conferidos
              </h1>
            </div>
          </div>

          <div className="hidden h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-emerald-700 sm:flex">
            <Barcode size={19} />
          </div>
        </header>

        <section className="relative mt-6 overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#0d542d_0%,#176f3c_58%,#238747_100%)] p-7 text-white shadow-[0_22px_58px_rgba(18,87,47,0.16)]">
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full border-[34px] border-white/[0.04]" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200">
              <Truck size={14} />
              {carga.codigo}
            </div>

            <h2 className="mt-3 text-[31px] font-black tracking-[-0.05em]">
              Conferência física
              <span className="text-[#f4b13f]">.</span>
            </h2>

            <p className="mt-2 text-[11px] text-white/65">
              Histórico dos QR Codes que foram bipados no recebimento desta carga.
            </p>

            <div className="mt-6 flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.08] p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white/10 text-white">
                <UserRound size={19} />
              </div>

              <div>
                <p className="text-[7px] font-black uppercase tracking-[0.13em] text-emerald-200">
                  Entregador responsável
                </p>
                <p className="mt-1 text-[16px] font-black">
                  {entregadorNome}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-5 gap-2">
          <Resumo label="Carga" valor={totais.carregado} />
          <Resumo label="Entregue" valor={totais.entregue} />
          <Resumo label="Retorno" valor={totais.retornado} />
          <Resumo label="Avaria" valor={totais.avariado} alerta={totais.avariado > 0} />
          <Resumo label="Saldo" valor={saldo} destaque />
        </section>

        <section className="mt-6 rounded-[30px] border border-black/[0.04] bg-white p-5 shadow-[0_18px_48px_rgba(17,63,33,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-700">
                Conferência da carga
              </p>
              <h3 className="mt-1 text-[20px] font-black tracking-[-0.03em]">
                {bipagens.length} volume(s) bipado(s)
              </h3>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-[8px] font-black text-emerald-700">
              <ScanLine size={14} />
              Histórico preservado
            </div>
          </div>

          {bipagens.length === 0 ? (
            <div className="mt-5 rounded-[22px] bg-[#f5f8f5] p-8 text-center">
              <ScanLine
                size={30}
                className="mx-auto text-emerald-700"
              />
              <p className="mt-3 text-[12px] font-black">
                Nenhum volume bipado
              </p>
              <p className="mt-1 text-[9px] text-slate-400">
                Ainda não existe conferência registrada para esta carga.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {bipagens.map((bipagem, index) => {
                const volume = volumesMap.get(String(bipagem.volume_id));
                const codigo = volume?.codigo_volume
                  ? String(volume.codigo_volume)
                  : String(bipagem.volume_id);

                const status = volume?.status
                  ? String(volume.status)
                  : "HISTORICO";

                const bipadoPor =
                  usuariosMap.get(String(bipagem.usuario_id)) ??
                  entregadorNome;

                return (
                  <div
                    key={bipagem.id}
                    className="flex flex-col gap-4 rounded-[20px] border border-slate-100 bg-[#fbfcfb] p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700">
                        <PackageCheck size={18} />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">
                          Volume {index + 1}
                        </p>
                        <p className="mt-1 break-all font-mono text-[10px] font-black text-[#142018]">
                          {codigo}
                        </p>
                      </div>
                    </div>

                    <div className="grid min-w-[260px] grid-cols-2 gap-2 sm:text-right">
                      <div>
                        <p className="text-[7px] font-black uppercase tracking-[0.11em] text-slate-400">
                          Bipado por
                        </p>
                        <p className="mt-1 text-[9px] font-black text-slate-600">
                          {bipadoPor}
                        </p>
                      </div>

                      <div>
                        <p className="text-[7px] font-black uppercase tracking-[0.11em] text-slate-400">
                          Data / hora
                        </p>
                        <p className="mt-1 text-[9px] font-black text-slate-600">
                          {formatarDataHora(String(bipagem.bipado_at))}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`w-fit shrink-0 rounded-full border px-3 py-1.5 text-[7px] font-black uppercase tracking-[0.08em] ${classeStatusVolume(
                        status,
                      )}`}
                    >
                      {status.replaceAll("_", " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-5 rounded-[24px] border border-black/[0.04] bg-white px-5 py-4 shadow-[0_12px_30px_rgba(17,63,33,0.04)]">
          <div className="mx-auto flex max-w-[420px] items-center justify-center gap-8 text-center">
            <div className="min-w-[130px]">
              <p className="text-[7px] font-black uppercase tracking-[0.13em] text-slate-400">
                Recebimento
              </p>
              <p className="mt-1 text-[10px] font-black">
                {formatarDataHora(carga.recebida_at ? String(carga.recebida_at) : null)}
              </p>
            </div>

            <div className="h-8 w-px bg-slate-200" />

            <div className="min-w-[130px]">
              <p className="text-[7px] font-black uppercase tracking-[0.13em] text-slate-400">
                Fechamento
              </p>
              <p className="mt-1 text-[10px] font-black">
                {formatarDataHora(carga.finalizada_at ? String(carga.finalizada_at) : null)}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Resumo({
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
      className={`rounded-[18px] border px-2 py-4 text-center shadow-sm ${
        alerta
          ? "border-amber-100 bg-amber-50"
          : destaque
            ? "border-emerald-100 bg-emerald-50"
            : "border-black/[0.04] bg-white"
      }`}
    >
      <p
        className={`text-[19px] font-black ${
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
