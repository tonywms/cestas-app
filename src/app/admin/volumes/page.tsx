export const instant = false;

import {
  ArrowLeft,
  Barcode,
  Boxes,
  CircleHelp,
  PackageCheck,
  Printer,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

type VolumeRow = {
  id: string;
  tipo_cesta_id: number;
  codigo_volume: string;
  status: string;
  carga_id: number | null;
  created_at: string;
};

type TipoRow = {
  id: number;
  codigo: string;
  nome: string;
};

type StatusSectionView = {
  key: string;
  title: string;
  description: string;
  tone: string;
  total: number;
  items: VolumeRow[];
};

const STATUS_SECTIONS = [
  {
    key: "EM_CARGA",
    title: "Em carga",
    description: "Volumes vinculados às cargas em operação.",
    tone: "border-blue-100 bg-blue-50/50",
  },
  {
    key: "DISPONIVEL",
    title: "Disponíveis",
    description: "Volumes avulsos ainda não vinculados a uma carga.",
    tone: "border-emerald-100 bg-emerald-50/50",
  },
  {
    key: "ENTREGUE",
    title: "Entregues",
    description: "Volumes que concluíram uma entrega.",
    tone: "border-slate-200 bg-slate-50/80",
  },
  {
    key: "RETORNADO",
    title: "Retornados",
    description: "Volumes devolvidos ao estoque central no fechamento da carga.",
    tone: "border-violet-100 bg-violet-50/60",
  },
  {
    key: "AVARIADO",
    title: "Avariados",
    description: "Volumes baixados por avaria no fechamento da carga.",
    tone: "border-amber-100 bg-amber-50/60",
  },
] as const;

const STATUS_KEYS = STATUS_SECTIONS.map((item) => item.key);

function formatarDataHora(valor: string) {
  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return valor;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(data);
}

function statusVisual(status: string) {
  switch (status) {
    case "DISPONIVEL":
      return { label: "Disponível", className: "bg-emerald-100 text-emerald-700" };
    case "EM_CARGA":
      return { label: "Em carga", className: "bg-blue-100 text-blue-700" };
    case "ENTREGUE":
      return { label: "Entregue", className: "bg-slate-100 text-slate-700" };
    case "RETORNADO":
      return { label: "Retornado", className: "bg-violet-100 text-violet-700" };
    case "AVARIADO":
      return { label: "Avariado", className: "bg-amber-100 text-amber-700" };
    default:
      return { label: status, className: "bg-slate-100 text-slate-500" };
  }
}

function VolumeItem({
  volume,
  tipoNome,
  compact = false,
}: {
  volume: VolumeRow;
  tipoNome: string;
  compact?: boolean;
}) {
  const visual = statusVisual(volume.status);

  return (
    <article
      className={`rounded-[19px] border border-slate-100 bg-[#fbfdfb] ${compact ? "p-3.5" : "p-4"}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-emerald-50 text-emerald-700">
          <Barcode size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-black">{volume.codigo_volume}</p>
              <p className="mt-1 truncate text-[8px] font-semibold text-slate-400">
                {tipoNome}
                {volume.carga_id ? ` • Carga #${volume.carga_id}` : ""}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[7px] font-black uppercase ${visual.className}`}
            >
              {visual.label}
            </span>
          </div>

          <p className="mt-2 text-[8px] text-slate-400">
            Criado em {formatarDataHora(volume.created_at)}
          </p>
        </div>
      </div>
    </article>
  );
}

export default async function VolumesPage() {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const supabase = await createClient();

  const [
    tiposResult,
    saldosResult,
    volumesRecentesResult,
    totalCountResult,
    disponiveisCountResult,
    emCargaCountResult,
    entreguesCountResult,
    retornadosCountResult,
    avariadosCountResult,
  ] = await Promise.all([
    supabase
      .from("tipos_cesta")
      .select("id, codigo, nome")
      .eq("empresa_id", usuario.empresa.id)
      .eq("ativo", true)
      .order("nome"),

    supabase
      .from("estoque_central_saldos")
      .select("tipo_cesta_id, quantidade")
      .eq("empresa_id", usuario.empresa.id),

    supabase
      .from("cesta_volumes")
      .select("id, tipo_cesta_id, codigo_volume, status, carga_id, created_at")
      .eq("empresa_id", usuario.empresa.id)
      .order("created_at", { ascending: false })
      .limit(300),

    supabase
      .from("cesta_volumes")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", usuario.empresa.id),

    supabase
      .from("cesta_volumes")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", usuario.empresa.id)
      .eq("status", "DISPONIVEL"),

    supabase
      .from("cesta_volumes")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", usuario.empresa.id)
      .eq("status", "EM_CARGA"),

    supabase
      .from("cesta_volumes")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", usuario.empresa.id)
      .eq("status", "ENTREGUE"),

    supabase
      .from("cesta_volumes")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", usuario.empresa.id)
      .eq("status", "RETORNADO"),

    supabase
      .from("cesta_volumes")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", usuario.empresa.id)
      .eq("status", "AVARIADO"),
  ]);

  const tipos = (tiposResult.data ?? []) as TipoRow[];
  const volumesRecentes = (volumesRecentesResult.data ?? []) as VolumeRow[];

  const tiposPorId = new Map<number, string>(
    tipos.map((tipo) => [Number(tipo.id), tipo.nome]),
  );

  const saldoCentralTotal = (saldosResult.data ?? []).reduce(
    (total, item) => total + Math.max(0, Number(item.quantidade ?? 0)),
    0,
  );

  const totalVolumes = totalCountResult.count ?? volumesRecentes.length;
  const disponiveis = disponiveisCountResult.count ?? 0;
  const emCarga = emCargaCountResult.count ?? 0;
  const entregues = entreguesCountResult.count ?? 0;
  const retornados = retornadosCountResult.count ?? 0;
  const avariados = avariadosCountResult.count ?? 0;

  const modoVolume = usuario.configuracao.modoControleCarga === "VOLUME";

  const volumesEmCargaRecentes = volumesRecentes.filter(
    (item) => item.status === "EM_CARGA",
  );

  const knownStatusTotal =
    disponiveis + emCarga + entregues + retornados + avariados;

  const outrosTotal = Math.max(0, totalVolumes - knownStatusTotal);

  const volumesOutrosRecentes = volumesRecentes.filter(
    (item) => !STATUS_KEYS.some((status) => status === item.status),
  );

  const sections: StatusSectionView[] = STATUS_SECTIONS
    .map((section) => {
      const items = volumesRecentes
        .filter((item) => item.status === section.key)
        .slice(0, section.key === "EM_CARGA" ? 10 : 8);

      const total =
        section.key === "EM_CARGA"
          ? emCarga
          : section.key === "DISPONIVEL"
            ? disponiveis
            : section.key === "ENTREGUE"
              ? entregues
              : section.key === "RETORNADO"
                ? retornados
                : avariados;

      return {
        ...section,
        total,
        items,
      };
    })
    .filter((section) => section.total > 0);

  if (outrosTotal > 0) {
    sections.push({
      key: "OUTROS",
      title: "Outros status",
      description: "Volumes com situação diferente das categorias principais.",
      tone: "border-slate-200 bg-slate-50/80",
      total: outrosTotal,
      items: volumesOutrosRecentes.slice(0, 8),
    });
  }

  return (
    <main className="app-premium min-h-screen px-4 py-6 text-[#142018] md:px-6 md:py-8">
      <div className="mx-auto max-w-[1240px]">
        <header className="glass flex items-center justify-between gap-4 rounded-[28px] px-5 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/estoque"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-[#176f3c]"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#b07a12]">
                Rastreabilidade
              </p>
              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">Volumes</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {modoVolume && totalVolumes > 0 && (
              <Link
                href="/admin/volumes/etiquetas"
                className="flex h-11 items-center gap-2 rounded-[14px] border border-emerald-100 bg-white px-4 text-[9px] font-black text-[#176f3c]"
              >
                <Printer size={15} />
                Etiquetas
              </Link>
            )}

            <Link
              href="/admin/configuracoes"
              className="flex h-11 items-center gap-2 rounded-[14px] border border-emerald-100 bg-white px-4 text-[9px] font-black text-[#176f3c]"
            >
              <ShieldCheck size={15} />
              Configuração
            </Link>
          </div>
        </header>

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.035]" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
              <Barcode size={16} />
              Identificação individual
            </div>

            <h2 className="mt-4 text-[32px] font-black tracking-[-0.055em]">
              Uma cesta, um volume
              <span className="text-[#f4b13f]">.</span>
            </h2>

            <p className="mt-3 max-w-2xl text-[11px] leading-6 text-white/65">
              Os volumes são gerados automaticamente quando uma carga é criada. O estoque central permanece controlado por quantidade até a cesta entrar em uma carga.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Kpi label="Saldo central" valor={saldoCentralTotal} />
              <Kpi label="Em carga" valor={emCarga} />
              <Kpi label="Entregues" valor={entregues} />
              <Kpi label="Retornados" valor={retornados} />
              <Kpi label="Total histórico" valor={totalVolumes} />
            </div>
          </div>
        </section>

        {!modoVolume ? (
          <section className="mt-5 rounded-[30px] border border-amber-200 bg-[linear-gradient(145deg,#fffaf0,#ffffff)] p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-amber-100 text-amber-700">
                <ShieldCheck size={21} />
              </div>

              <div className="flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-700">
                  Empresa em QUANTIDADE
                </p>
                <h3 className="mt-2 text-[21px] font-black tracking-[-0.04em]">
                  Bipagem de volume está desativada
                </h3>
                <p className="mt-2 max-w-2xl text-[10px] leading-5 text-slate-500">
                  A empresa {usuario.empresa.nomeFantasia} trabalha atualmente com saldo numérico. Nenhum volume individual será exigido.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-6 grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
            <div className="space-y-5">
              <div className="card-premium rounded-[30px] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="icon-emerald flex h-12 w-12 items-center justify-center rounded-[16px]">
                      <Truck size={21} />
                    </div>

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                        Operação ativa
                      </p>
                      <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                        Em carga agora
                      </h3>
                      <p className="mt-1 max-w-sm text-[9px] leading-5 text-slate-400">
                        Volumes em posse dos entregadores e ainda disponíveis para entrega ou fechamento da carga.
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-blue-50 px-3 py-2 text-[8px] font-black text-blue-700">
                    {emCarga}
                  </span>
                </div>

                {emCarga === 0 ? (
                  <div className="mt-5 rounded-[20px] bg-[#f6f9f6] p-8 text-center">
                    <Truck size={26} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-[11px] font-black">Nenhum volume em carga</p>
                    <p className="mt-1 text-[9px] text-slate-400">
                      Ao criar uma carga, os QR Codes serão gerados automaticamente e aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mt-5 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                      {volumesEmCargaRecentes.slice(0, 8).map((volume) => (
                        <VolumeItem
                          key={volume.id}
                          volume={volume}
                          tipoNome={tiposPorId.get(Number(volume.tipo_cesta_id)) ?? "Tipo de cesta"}
                          compact
                        />
                      ))}
                    </div>

                    <Link
                      href="/admin/volumes/etiquetas?status=EM_CARGA"
                      className="mt-5 flex h-[48px] w-full items-center justify-center gap-2 rounded-[15px] border border-blue-100 bg-blue-50 text-[9px] font-black text-blue-700 transition hover:bg-blue-100"
                    >
                      <Printer size={15} />
                      Imprimir etiquetas em carga
                    </Link>
                  </>
                )}
              </div>

              <div className="card-premium rounded-[30px] p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-emerald-50 text-emerald-700">
                    <CircleHelp size={21} />
                  </div>

                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                      Regra operacional
                    </p>
                    <h3 className="mt-1 text-[18px] font-black">Volume nasce na carga</h3>
                    <p className="mt-2 text-[9px] leading-5 text-slate-500">
                      Não é necessário gerar QR Code para todo o estoque central. Quando uma carga com 3 cestas é criada, o sistema cria automaticamente 3 volumes e os vincula àquela carga.
                    </p>
                    <p className="mt-3 text-[9px] leading-5 text-slate-500">
                      Se uma cesta voltar, o volume fica como <strong>RETORNADO</strong> para preservar o histórico. A quantidade volta ao estoque central normalmente.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-premium rounded-[30px] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="icon-emerald flex h-12 w-12 items-center justify-center rounded-[16px]">
                    <Barcode size={21} />
                  </div>

                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                      Organização
                    </p>
                    <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                      Painel por status
                    </h3>
                    <p className="mt-1 max-w-xl text-[9px] leading-5 text-slate-400">
                      Histórico e operação separados por situação do volume.
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-2 text-[8px] font-black text-[#176f3c]">
                  {totalVolumes} no total
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <ResumoStatusCard titulo="Em carga" valor={emCarga} className="border-blue-100 bg-blue-50/70" />
                <ResumoStatusCard titulo="Disponíveis" valor={disponiveis} className="border-emerald-100 bg-emerald-50/70" />
                <ResumoStatusCard titulo="Entregues" valor={entregues} className="border-slate-200 bg-slate-50/80" />
                <ResumoStatusCard titulo="Retornados" valor={retornados} className="border-violet-100 bg-violet-50/70" />
                <ResumoStatusCard titulo="Avariados" valor={avariados} className="border-amber-100 bg-amber-50/70" />
                <ResumoStatusCard titulo="Outros" valor={outrosTotal} className="border-slate-200 bg-slate-50/70" />
              </div>

              <div className="mt-6 space-y-4">
                {sections.length === 0 ? (
                  <div className="rounded-[20px] bg-[#f6f9f6] p-10 text-center">
                    <Barcode size={28} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-[11px] font-black">Nenhum volume registrado</p>
                  </div>
                ) : (
                  sections.map((section) => (
                    <section key={section.key} className={`rounded-[22px] border p-4 ${section.tone}`}>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h4 className="text-[12px] font-black text-[#142018]">{section.title}</h4>
                          <p className="mt-1 text-[8px] leading-5 text-slate-500">{section.description}</p>
                        </div>

                        <span className="rounded-full bg-white px-3 py-1.5 text-[8px] font-black text-slate-700 shadow-sm">
                          {section.total}
                        </span>
                      </div>

                      {section.items.length > 0 && (
                        <div className="mt-4 max-h-[260px] space-y-3 overflow-y-auto pr-1">
                          {section.items.map((volume) => (
                            <VolumeItem
                              key={volume.id}
                              volume={volume}
                              tipoNome={tiposPorId.get(Number(volume.tipo_cesta_id)) ?? "Tipo de cesta"}
                            />
                          ))}
                        </div>
                      )}

                      {section.total > section.items.length && (
                        <p className="mt-3 text-[8px] text-slate-400">
                          Exibindo os últimos {section.items.length} de {section.total} volume(s) deste status.
                        </p>
                      )}
                    </section>
                  ))
                )}
              </div>

              {totalVolumes > 0 && (
                <Link
                  href="/admin/volumes/etiquetas"
                  className="mt-5 flex h-[50px] w-full items-center justify-center gap-2 rounded-[16px] border border-emerald-100 bg-emerald-50 text-[10px] font-black text-emerald-800"
                >
                  <Printer size={16} />
                  Abrir etiquetas QR
                </Link>
              )}
            </div>
          </section>
        )}

        <section className="mt-6 grid gap-3 md:grid-cols-3">
          <Link href="/admin/estoque" className="card-premium flex items-center gap-4 rounded-[24px] p-5">
            <div className="icon-emerald flex h-11 w-11 items-center justify-center rounded-[14px]">
              <Boxes size={19} />
            </div>
            <div>
              <p className="text-[11px] font-black">Estoque central</p>
              <p className="mt-1 text-[9px] text-slate-400">Saldos físicos da empresa.</p>
            </div>
          </Link>

          <Link href="/admin/cargas" className="card-premium flex items-center gap-4 rounded-[24px] p-5">
            <div className="icon-emerald flex h-11 w-11 items-center justify-center rounded-[14px]">
              <Truck size={19} />
            </div>
            <div>
              <p className="text-[11px] font-black">Cargas</p>
              <p className="mt-1 text-[9px] text-slate-400">Volumes vinculados aos entregadores.</p>
            </div>
          </Link>

          <Link href="/admin/cestas" className="card-premium flex items-center gap-4 rounded-[24px] p-5">
            <div className="icon-emerald flex h-11 w-11 items-center justify-center rounded-[14px]">
              <PackageCheck size={19} />
            </div>
            <div>
              <p className="text-[11px] font-black">Tipos de cesta</p>
              <p className="mt-1 text-[9px] text-slate-400">Catálogo dos produtos.</p>
            </div>
          </Link>
        </section>
      </div>
    </main>
  );
}

function Kpi({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-[19px] border border-white/10 bg-white/[0.07] px-4 py-3.5 backdrop-blur">
      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/45">{label}</p>
      <p className="mt-1.5 text-[22px] font-black text-white">{valor}</p>
    </div>
  );
}

function ResumoStatusCard({
  titulo,
  valor,
  className,
}: {
  titulo: string;
  valor: number;
  className: string;
}) {
  return (
    <div className={`rounded-[18px] border px-4 py-3 ${className}`}>
      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">{titulo}</p>
      <p className="mt-2 text-[22px] font-black text-[#142018]">{valor}</p>
    </div>
  );
}
