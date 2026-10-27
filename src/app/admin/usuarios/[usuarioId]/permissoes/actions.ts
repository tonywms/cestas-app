"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

type ActionState = {
  success: boolean;
  message: string;
};

const PROIBIDAS_ENTREGADOR =
  new Set<string>([
    PERMISSOES.EMPRESA_CONFIGURAR,
    PERMISSOES.PERMISSOES_GERENCIAR,
    PERMISSOES.USUARIOS_GERENCIAR,
  ]);

export async function salvarPermissoesUsuario(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const atual =
    await getCurrentUserProfile();

  if (!atual) {
    return {
      success: false,
      message:
        "Sessão inválida.",
    };
  }

  const podeGerenciar =
    atual.isPlatformAdmin ||
    temPermissao(
      atual.permissoes,
      PERMISSOES.PERMISSOES_GERENCIAR,
    );

  if (!podeGerenciar) {
    return {
      success: false,
      message:
        "Você não possui permissão para alterar acessos.",
    };
  }

  const usuarioId =
    String(
      formData.get(
        "usuario_id",
      ) ?? "",
    );

  if (!usuarioId) {
    return {
      success: false,
      message:
        "Usuário inválido.",
    };
  }

  const supabase =
    await createClient();

  const {
    data: vinculo,
    error: vinculoError,
  } = await supabase
    .from("empresa_usuarios")
    .select(`
      usuario_id,
      perfil_id,
      ativo,
      perfis!inner (
        codigo
      )
    `)
    .eq(
      "empresa_id",
      atual.empresa.id,
    )
    .eq(
      "usuario_id",
      usuarioId,
    )
    .eq(
      "ativo",
      true,
    )
    .maybeSingle();

  if (
    vinculoError ||
    !vinculo
  ) {
    return {
      success: false,
      message:
        "Colaborador não pertence a esta empresa.",
    };
  }

  const perfilRaw =
    vinculo.perfis;

  const perfil =
    Array.isArray(perfilRaw)
      ? perfilRaw[0]
      : perfilRaw;

  if (
    !perfil ||
    perfil.codigo !==
      "ENTREGADOR"
  ) {
    return {
      success: false,
      message:
        "Nesta etapa somente ENTREGADORES podem receber exceções individuais.",
    };
  }

  const {
    data: catalogo,
    error: catalogoError,
  } = await supabase
    .from("permissoes")
    .select(`
      id,
      codigo
    `)
    .eq(
      "ativo",
      true,
    );

  if (
    catalogoError ||
    !catalogo
  ) {
    return {
      success: false,
      message:
        "Não foi possível carregar o catálogo de permissões.",
    };
  }

  const herdarIds:
    string[] = [];

  const overrides: {
    empresa_id: string;
    usuario_id: string;
    permissao_id: string;
    permitido: boolean;
    concedido_por: string;
    motivo: string;
    updated_at: string;
  }[] = [];

  for (
    const permissao of catalogo
  ) {
    const codigo =
      permissao.codigo;

    let estado =
      String(
        formData.get(
          `permissao_${codigo}`,
        ) ?? "HERDAR",
      );

    if (
      PROIBIDAS_ENTREGADOR.has(
        codigo,
      )
    ) {
      estado = "HERDAR";
    }

    if (
      atual.configuracao
        .modoControleCarga !==
        "VOLUME" &&
      (
        codigo ===
          PERMISSOES.CARGA_BIPAR_VOLUME ||
        codigo ===
          PERMISSOES.ENTREGA_BIPAR_VOLUME
      )
    ) {
      estado = "HERDAR";
    }

    if (
      !atual.configuracao
        .permitirPagamentoMobile &&
      codigo ===
        PERMISSOES.PAGAMENTO_REGISTRAR
    ) {
      estado = "HERDAR";
    }

    if (
      !atual.configuracao
        .permitirOcorrenciaMobile &&
      codigo ===
        PERMISSOES.OCORRENCIA_REGISTRAR
    ) {
      estado = "HERDAR";
    }

    if (
      estado === "HERDAR"
    ) {
      herdarIds.push(
        permissao.id,
      );

      continue;
    }

    overrides.push({
      empresa_id:
        atual.empresa.id,
      usuario_id:
        usuarioId,
      permissao_id:
        permissao.id,
      permitido:
        estado === "LIBERAR",
      concedido_por:
        atual.id,
      motivo:
        "Override individual definido pelo administrador da empresa.",
      updated_at:
        new Date().toISOString(),
    });
  }

  if (
    herdarIds.length > 0
  ) {
    const {
      error: deleteError,
    } = await supabase
      .from(
        "usuario_permissoes",
      )
      .delete()
      .eq(
        "empresa_id",
        atual.empresa.id,
      )
      .eq(
        "usuario_id",
        usuarioId,
      )
      .in(
        "permissao_id",
        herdarIds,
      );

    if (deleteError) {
      console.error(
        deleteError,
      );

      return {
        success: false,
        message:
          "Erro ao remover overrides antigos.",
      };
    }
  }

  if (
    overrides.length > 0
  ) {
    const {
      error: upsertError,
    } = await supabase
      .from(
        "usuario_permissoes",
      )
      .upsert(
        overrides,
        {
          onConflict:
            "empresa_id,usuario_id,permissao_id",
        },
      );

    if (upsertError) {
      console.error(
        upsertError,
      );

      return {
        success: false,
        message:
          "Erro ao salvar permissões individuais.",
      };
    }
  }

  revalidatePath(
    `/admin/usuarios/${usuarioId}/permissoes`,
  );
  revalidatePath(
    "/admin/usuarios",
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
      "Permissões individuais atualizadas com sucesso.",
  };
}