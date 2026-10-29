export const instant = false;

import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

import EtiquetasVolumesClient from "./EtiquetasVolumesClient";

type PageProps = {
  searchParams: Promise<{
    status?: string;
    carga?: string;
  }>;
};

const STATUS_VALIDOS = [
  "TODOS",
  "EM_CARGA",
  "DISPONIVEL",
  "ENTREGUE",
  "RETORNADO",
  "AVARIADO",
  "OUTROS",
] as const;

type StatusFiltro = (typeof STATUS_VALIDOS)[number];

type VolumeDb = {
  id: string;
  tipo_cesta_id: number;
  codigo_volume: string;
  status: string;
  carga_id: number | null;
  created_at: string;
};

export default async function EtiquetasVolumesPage({
  searchParams,
}: PageProps) {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  if (usuario.configuracao.modoControleCarga !== "VOLUME") {
    redirect("/admin/volumes");
  }

  const params = await searchParams;
  const statusRecebido = String(params.status ?? "TODOS").toUpperCase();
  const cargaIdRecebida = Number(params.carga ?? 0);
  const cargaIdInicial =
    Number.isInteger(cargaIdRecebida) && cargaIdRecebida > 0
      ? cargaIdRecebida
      : null;
  const statusInicial: StatusFiltro = STATUS_VALIDOS.includes(
    statusRecebido as StatusFiltro,
  )
    ? (statusRecebido as StatusFiltro)
    : "TODOS";

  const supabase = await createClient();

  const tiposResult = await supabase
    .from("tipos_cesta")
    .select("id, codigo, nome")
    .eq("empresa_id", usuario.empresa.id)
    .order("nome");

  const volumesRaw: VolumeDb[] = [];
  const tamanhoPagina = 1000;
  let inicio = 0;

  while (true) {
    const fim = inicio + tamanhoPagina - 1;

    let query = supabase
      .from("cesta_volumes")
      .select("id, tipo_cesta_id, codigo_volume, status, carga_id, created_at")
      .eq("empresa_id", usuario.empresa.id);

    if (cargaIdInicial) {
      query = query.eq("carga_id", cargaIdInicial);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .range(inicio, fim);

    if (error) {
      console.error(
        "Erro ao carregar volumes para impressão:",
        error.message,
        error.code,
        error.details,
      );
      break;
    }

    const lote = (data ?? []) as VolumeDb[];
    volumesRaw.push(...lote);

    if (lote.length < tamanhoPagina) {
      break;
    }

    inicio += tamanhoPagina;
  }

  const tiposMap = new Map(
    (tiposResult.data ?? []).map((tipo) => [Number(tipo.id), tipo]),
  );

  const volumes = volumesRaw.map((volume) => {
    const tipo = tiposMap.get(Number(volume.tipo_cesta_id));

    return {
      id: String(volume.id),
      codigoVolume: String(volume.codigo_volume),
      status: String(volume.status),
      cargaId: volume.carga_id ? Number(volume.carga_id) : null,
      tipoNome: String(tipo?.nome ?? "Cesta"),
      tipoCodigo: String(tipo?.codigo ?? ""),
    };
  });

  return (
    <EtiquetasVolumesClient
      empresaNome={usuario.empresa.nomeFantasia}
      volumes={volumes}
      statusInicial={statusInicial}
      cargaIdInicial={cargaIdInicial}
    />
  );
}
