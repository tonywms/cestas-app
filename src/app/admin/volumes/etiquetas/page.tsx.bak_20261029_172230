export const instant = false;

import {
  redirect,
} from "next/navigation";

import {
  getCurrentUserProfile,
} from "@/lib/auth/get-current-user";

import {
  createClient,
} from "@/lib/supabase/server";

import EtiquetasVolumesClient from "./EtiquetasVolumesClient";

export default async function EtiquetasVolumesPage() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  if (
    usuario.configuracao
      .modoControleCarga !==
    "VOLUME"
  ) {
    redirect(
      "/admin/volumes",
    );
  }

  const supabase =
    await createClient();

  const [
    tiposResult,
    volumesResult,
  ] =
    await Promise.all([
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
        .order(
          "nome",
        ),

      supabase
        .from("cesta_volumes")
        .select(`
          id,
          tipo_cesta_id,
          codigo_volume,
          status,
          carga_id,
          created_at
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
        )
        .limit(500),
    ]);

  const tiposMap =
    new Map(
      (
        tiposResult.data ??
        []
      ).map(
        (tipo) => [
          tipo.id,
          tipo,
        ],
      ),
    );

  const volumes =
    (
      volumesResult.data ??
      []
    ).map(
      (volume) => {
        const tipo =
          tiposMap.get(
            volume.tipo_cesta_id,
          );

        return {
          id:
            volume.id,
          codigoVolume:
            volume.codigo_volume,
          status:
            volume.status,
          cargaId:
            volume.carga_id,
          tipoNome:
            tipo?.nome ??
            "Cesta",
          tipoCodigo:
            tipo?.codigo ??
            "",
        };
      },
    );

  return (
    <EtiquetasVolumesClient
      empresaNome={
        usuario.empresa
          .nomeFantasia
      }
      volumes={volumes}
    />
  );
}
