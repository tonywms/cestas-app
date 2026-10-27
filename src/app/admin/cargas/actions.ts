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

export type CriarCargaState = {
  success: boolean;
  message: string;
  cargaId: number | null;
};

export async function criarCarga(
  _previousState:
    CriarCargaState,
  formData:
    FormData,
): Promise<CriarCargaState> {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return {
      success: false,
      message:
        "Sessão inválida.",
      cargaId: null,
    };
  }

  const podeGerenciar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CARGA_GERENCIAR,
    );

  const podeMovimentar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ESTOQUE_MOVIMENTAR,
    );

  if (
    !podeGerenciar
  ) {
    return {
      success: false,
      message:
        "Você não possui permissão para criar cargas.",
      cargaId: null,
    };
  }

  if (
    !podeMovimentar
  ) {
    return {
      success: false,
      message:
        "Seu perfil não possui permissão para retirar saldo do estoque central.",
      cargaId: null,
    };
  }

  const entregadorId =
    String(
      formData.get(
        "entregador_id",
      ) ?? "",
    );

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

  const observacao =
    String(
      formData.get(
        "observacao",
      ) ?? "",
    ).trim();

  if (!entregadorId) {
    return {
      success: false,
      message:
        "Selecione o entregador.",
      cargaId: null,
    };
  }

  if (
    !Number.isInteger(
      tipoCestaId,
    ) ||
    tipoCestaId <= 0
  ) {
    return {
      success: false,
      message:
        "Selecione o tipo de cesta.",
      cargaId: null,
    };
  }

  if (
    !Number.isInteger(
      quantidade,
    ) ||
    quantidade <= 0
  ) {
    return {
      success: false,
      message:
        "Informe uma quantidade válida.",
      cargaId: null,
    };
  }

  const agora =
    new Date();

  const dataCodigo =
    agora
      .toISOString()
      .slice(0, 10)
      .replaceAll(
        "-",
        "",
      );

  const codigo =
    `CG-${dataCodigo}-${randomUUID()
      .slice(
        0,
        6,
      )
      .toUpperCase()}`;

  const supabase =
    await createClient();

  /*
   * A criação agora acontece dentro de uma única
   * transação no PostgreSQL:
   *
   * estoque central
   * → carga
   * → carga_itens
   * → movimentações
   *
   * Se qualquer etapa falhar, nada é gravado.
   */
  const {
    data,
    error,
  } = await supabase.rpc(
    "criar_carga_com_estoque",
    {
      p_empresa_id:
        usuario.empresa.id,

      p_codigo:
        codigo,

      p_entregador_id:
        entregadorId,

      p_tipo_cesta_id:
        tipoCestaId,

      p_quantidade:
        quantidade,

      p_observacao:
        observacao || null,
    },
  );

  if (error) {
    console.error(
      "Erro criar carga com estoque:",
      error.message,
      error.code,
      error.details,
    );

    return {
      success: false,
      message:
        error.message ||
        "Não foi possível criar a carga.",
      cargaId: null,
    };
  }

  const resultado =
    Array.isArray(data)
      ? data[0]
      : data;

  revalidatePath(
    "/admin/estoque",
  );

  revalidatePath(
    "/admin/cargas",
  );

  revalidatePath(
    "/admin/cargas/nova",
  );

  revalidatePath(
    "/mobile",
  );

  revalidatePath(
    "/mobile/carga",
  );

  return {
    success: true,
    message:
      `Carga ${codigo} criada com ${quantidade} cesta(s). Saldo central restante: ${Number(
        resultado
          ?.saldo_central ??
          0,
      )}.`,
    cargaId:
      Number(
        resultado
          ?.carga_id ??
          0,
      ) ||
      null,
  };
}
