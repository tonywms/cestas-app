"use server";

import {
  randomUUID,
} from "crypto";

import {
  revalidatePath,
} from "next/cache";

import {
  getCurrentUserProfile,
} from "@/lib/auth/get-current-user";

import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";

import {
  createClient,
} from "@/lib/supabase/server";

export type VolumesActionState = {
  success: boolean;
  message: string;
  quantidadeCriada: number;
};

function estado(
  success: boolean,
  message: string,
  quantidadeCriada = 0,
): VolumesActionState {
  return {
    success,
    message,
    quantidadeCriada,
  };
}

export async function gerarVolumes(
  _previousState: VolumesActionState,
  formData: FormData,
): Promise<VolumesActionState> {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return estado(
      false,
      "Sessão inválida. Entre novamente no sistema.",
    );
  }

  if (
    usuario.configuracao
      .modoControleCarga !== "VOLUME"
  ) {
    return estado(
      false,
      "Esta empresa está configurada para QUANTIDADE. Altere o controle para VOLUME antes de gerar identificadores.",
    );
  }

  const autorizado =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CARGA_GERENCIAR,
    ) ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CARGA_BIPAR_VOLUME,
    );

  if (!autorizado) {
    return estado(
      false,
      "Você não possui permissão para gerar volumes.",
    );
  }

  const tipoCestaId =
    Number(
      formData.get(
        "tipo_cesta_id",
      ),
    );

  const quantidade =
    Number(
      formData.get(
        "quantidade",
      ),
    );

  const prefixo =
    String(
      formData.get(
        "prefixo",
      ) ?? "VOL",
    )
      .trim()
      .toUpperCase()
      .replace(
        /[^A-Z0-9_-]/g,
        "",
      )
      .slice(
        0,
        12,
      ) || "VOL";

  if (
    !Number.isInteger(
      tipoCestaId,
    ) ||
    tipoCestaId <= 0
  ) {
    return estado(
      false,
      "Selecione um tipo de cesta válido.",
    );
  }

  if (
    !Number.isInteger(
      quantidade,
    ) ||
    quantidade <= 0 ||
    quantidade > 500
  ) {
    return estado(
      false,
      "Informe uma quantidade entre 1 e 500 volumes.",
    );
  }

  const supabase =
    await createClient();

  const [
    tipoResult,
    saldoResult,
    volumesDisponiveisResult,
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
        .eq(
          "id",
          tipoCestaId,
        )
        .eq(
          "ativo",
          true,
        )
        .maybeSingle(),

      supabase
        .from(
          "estoque_central_saldos",
        )
        .select(`
          quantidade
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "tipo_cesta_id",
          tipoCestaId,
        )
        .maybeSingle(),

      supabase
        .from(
          "cesta_volumes",
        )
        .select(
          "id",
          {
            count: "exact",
            head: true,
          },
        )
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "tipo_cesta_id",
          tipoCestaId,
        )
        .eq(
          "status",
          "DISPONIVEL",
        ),
    ]);

  if (
    tipoResult.error ||
    !tipoResult.data
  ) {
    return estado(
      false,
      "Tipo de cesta não encontrado nesta empresa.",
    );
  }

  if (
    saldoResult.error
  ) {
    console.error(
      "Erro ao consultar estoque central:",
      saldoResult.error,
    );

    return estado(
      false,
      "Não foi possível validar o saldo do estoque central.",
    );
  }

  if (
    volumesDisponiveisResult.error
  ) {
    console.error(
      "Erro ao consultar volumes disponíveis:",
      volumesDisponiveisResult.error,
    );

    return estado(
      false,
      "Não foi possível validar os volumes já existentes.",
    );
  }

  const saldoCentral =
    Math.max(
      0,
      Number(
        saldoResult.data
          ?.quantidade ?? 0,
      ),
    );

  const volumesDisponiveis =
    Math.max(
      0,
      Number(
        volumesDisponiveisResult.count ??
        0,
      ),
    );

  const faltamIdentificar =
    Math.max(
      0,
      saldoCentral -
        volumesDisponiveis,
    );

  if (
    saldoCentral <= 0
  ) {
    return estado(
      false,
      "Não existe saldo físico no estoque central para este tipo de cesta. Registre a entrada física antes de gerar volumes.",
    );
  }

  if (
    faltamIdentificar <= 0
  ) {
    return estado(
      false,
      `Todo o saldo central já está identificado. Saldo: ${saldoCentral}; volumes disponíveis: ${volumesDisponiveis}.`,
    );
  }

  if (
    quantidade >
    faltamIdentificar
  ) {
    return estado(
      false,
      `Você pode gerar no máximo ${faltamIdentificar} volume(s). O estoque possui ${saldoCentral} cesta(s) e ${volumesDisponiveis} já estão identificadas.`,
    );
  }

  const dataCodigo =
    new Date()
      .toISOString()
      .slice(
        0,
        10,
      )
      .replaceAll(
        "-",
        "",
      );

  const registros =
    Array.from(
      {
        length:
          quantidade,
      },
      () => ({
        empresa_id:
          usuario.empresa.id,

        tipo_cesta_id:
          tipoCestaId,

        codigo_volume:
          `${prefixo}-${dataCodigo}-${randomUUID()
            .replaceAll(
              "-",
              "",
            )
            .slice(
              0,
              10,
            )
            .toUpperCase()}`,

        status:
          "DISPONIVEL",
      }),
    );

  const {
    error:
      inserirError,
  } = await supabase
    .from(
      "cesta_volumes",
    )
    .insert(
      registros,
    );

  if (inserirError) {
    console.error(
      "Erro ao gerar volumes:",
      inserirError.message,
      inserirError.code,
      inserirError.details,
    );

    return estado(
      false,
      inserirError.message ||
        "Não foi possível gerar os volumes.",
    );
  }

  revalidatePath(
    "/admin/volumes",
  );

  revalidatePath(
    "/admin/volumes/etiquetas",
  );

  revalidatePath(
    "/admin/estoque",
  );

  revalidatePath(
    "/admin/cargas/nova",
  );

  return estado(
    true,
    `${quantidade} volume(s) de ${tipoResult.data.nome} foram gerados e vinculados ao saldo físico central.`,
    quantidade,
  );
}
