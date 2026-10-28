"use server";

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

type ActionState = {
  success: boolean;
  message: string;
};

function parseValor(
  value:
    FormDataEntryValue | null,
) {
  const texto =
    String(
      value ??
        "0",
    )
      .trim()
      .replaceAll(
        ".",
        "",
      )
      .replace(
        ",",
        ".",
      );

  return Number(
    texto,
  );
}

async function contextoAutorizado() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return {
      usuario:
        null,
      erro:
        "Sessão inválida.",
    };
  }

  const autorizado =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CESTAS_GERENCIAR,
    );

  if (!autorizado) {
    return {
      usuario:
        null,
      erro:
        "Você não possui permissão para gerenciar tipos de cesta.",
    };
  }

  return {
    usuario,
    erro:
      null,
  };
}

function revalidar() {
  revalidatePath(
    "/admin/cestas",
  );

  revalidatePath(
    "/admin/configuracoes",
  );

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
    "/admin/volumes",
  );

  revalidatePath(
    "/admin/dashboard",
  );

  revalidatePath(
    "/mobile",
  );

  revalidatePath(
    "/mobile/carga",
  );
}

export async function criarTipoCesta(
  _previousState:
    ActionState,
  formData:
    FormData,
): Promise<ActionState> {
  const contexto =
    await contextoAutorizado();

  if (
    !contexto.usuario
  ) {
    return {
      success:
        false,
      message:
        contexto.erro ??
        "Acesso negado.",
    };
  }

  const usuario =
    contexto.usuario;

  const codigo =
    String(
      formData.get(
        "codigo",
      ) ??
        "",
    )
      .trim()
      .toUpperCase();

  const nome =
    String(
      formData.get(
        "nome",
      ) ??
        "",
    ).trim();

  const descricao =
    String(
      formData.get(
        "descricao",
      ) ??
        "",
    ).trim();

  const valorVenda =
    parseValor(
      formData.get(
        "valor_venda",
      ),
    );

  if (
    codigo.length <
    2
  ) {
    return {
      success:
        false,
      message:
        "Informe o código da cesta.",
    };
  }

  if (
    nome.length <
    3
  ) {
    return {
      success:
        false,
      message:
        "Informe o nome da cesta.",
    };
  }

  if (
    !Number.isFinite(
      valorVenda,
    ) ||
    valorVenda <
      0
  ) {
    return {
      success:
        false,
      message:
        "Informe um valor de venda válido.",
    };
  }

  const supabase =
    await createClient();

  const {
    data:
      existente,
  } =
    await supabase
      .from(
        "tipos_cesta",
      )
      .select(
        "id",
      )
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "codigo",
        codigo,
      )
      .maybeSingle();

  if (
    existente
  ) {
    return {
      success:
        false,
      message:
        "Já existe uma cesta com este código nesta empresa.",
    };
  }

  const {
    error,
  } =
    await supabase
      .from(
        "tipos_cesta",
      )
      .insert({
        empresa_id:
          usuario.empresa.id,

        codigo,

        nome,

        descricao:
          descricao ||
          null,

        valor_venda:
          valorVenda,

        ativo:
          true,
      });

  if (error) {
    console.error(
      "Erro criar tipo cesta:",
      error,
    );

    return {
      success:
        false,
      message:
        "Não foi possível cadastrar o tipo de cesta.",
    };
  }

  revalidar();

  return {
    success:
      true,
    message:
      `${nome} cadastrada com sucesso.`,
  };
}

export async function atualizarTipoCesta(
  _previousState:
    ActionState,
  formData:
    FormData,
): Promise<ActionState> {
  const contexto =
    await contextoAutorizado();

  if (
    !contexto.usuario
  ) {
    return {
      success:
        false,
      message:
        contexto.erro ??
        "Acesso negado.",
    };
  }

  const usuario =
    contexto.usuario;

  const tipoId =
    Number(
      formData.get(
        "tipo_id",
      ),
    );

  const nome =
    String(
      formData.get(
        "nome",
      ) ??
        "",
    ).trim();

  const descricao =
    String(
      formData.get(
        "descricao",
      ) ??
        "",
    ).trim();

  const valorVenda =
    parseValor(
      formData.get(
        "valor_venda",
      ),
    );

  if (
    !Number.isInteger(
      tipoId,
    ) ||
    tipoId <=
      0
  ) {
    return {
      success:
        false,
      message:
        "Tipo de cesta inválido.",
    };
  }

  if (
    nome.length <
    3
  ) {
    return {
      success:
        false,
      message:
        "Informe o nome da cesta.",
    };
  }

  if (
    !Number.isFinite(
      valorVenda,
    ) ||
    valorVenda <
      0
  ) {
    return {
      success:
        false,
      message:
        "Informe um valor de venda válido.",
    };
  }

  const supabase =
    await createClient();

  const {
    error,
  } =
    await supabase
      .from(
        "tipos_cesta",
      )
      .update({
        nome,

        descricao:
          descricao ||
          null,

        valor_venda:
          valorVenda,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "id",
        tipoId,
      );

  if (error) {
    console.error(
      "Erro atualizar tipo cesta:",
      error,
    );

    return {
      success:
        false,
      message:
        "Não foi possível atualizar a cesta.",
    };
  }

  revalidar();

  return {
    success:
      true,
    message:
      `${nome} atualizada com sucesso.`,
  };
}

export async function alternarStatusTipoCesta(
  _previousState:
    ActionState,
  formData:
    FormData,
): Promise<ActionState> {
  const contexto =
    await contextoAutorizado();

  if (
    !contexto.usuario
  ) {
    return {
      success:
        false,
      message:
        contexto.erro ??
        "Acesso negado.",
    };
  }

  const usuario =
    contexto.usuario;

  const tipoId =
    Number(
      formData.get(
        "tipo_id",
      ),
    );

  if (
    !Number.isInteger(
      tipoId,
    ) ||
    tipoId <=
      0
  ) {
    return {
      success:
        false,
      message:
        "Tipo de cesta inválido.",
    };
  }

  const supabase =
    await createClient();

  const {
    data:
      tipo,
    error:
      tipoError,
  } =
    await supabase
      .from(
        "tipos_cesta",
      )
      .select(`
        id,
        nome,
        ativo
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "id",
        tipoId,
      )
      .maybeSingle();

  if (
    tipoError ||
    !tipo
  ) {
    return {
      success:
        false,
      message:
        "Tipo de cesta não encontrado.",
    };
  }

  const novoAtivo =
    !tipo.ativo;

  /*
   * Para INATIVAR, primeiro verificamos se a cesta
   * ainda possui saldo físico na operação.
   */
  if (
    !novoAtivo
  ) {
    const [
      centralResult,
      cargaItensResult,
      volumesResult,
    ] =
      await Promise.all([
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
            tipoId,
          )
          .maybeSingle(),

        supabase
          .from(
            "carga_itens",
          )
          .select(`
            quantidade_carregada,
            quantidade_entregue,
            quantidade_retornada,
            quantidade_avariada
          `)
          .eq(
            "empresa_id",
            usuario.empresa.id,
          )
          .eq(
            "tipo_cesta_id",
            tipoId,
          ),

        supabase
          .from(
            "cesta_volumes",
          )
          .select(`
            id
          `)
          .eq(
            "empresa_id",
            usuario.empresa.id,
          )
          .eq(
            "tipo_cesta_id",
            tipoId,
          )
          .in(
            "status",
            [
              "DISPONIVEL",
              "EM_CARGA",
            ],
          )
          .limit(
            1,
          ),
      ]);

    const saldoCentral =
      Number(
        centralResult.data
          ?.quantidade ??
          0,
      );

    const saldoCarga =
      (
        cargaItensResult.data ??
        []
      ).reduce(
        (
          total,
          item,
        ) =>
          total +
          Math.max(
            0,
            Number(
              item.quantidade_carregada ??
                0,
            ) -
              Number(
                item.quantidade_entregue ??
                  0,
              ) -
              Number(
                item.quantidade_retornada ??
                  0,
              ) -
              Number(
                item.quantidade_avariada ??
                  0,
              ),
          ),
        0,
      );

    const possuiVolumeAtivo =
      (
        volumesResult.data ??
        []
      ).length >
      0;

    if (
      saldoCentral >
        0 ||
      saldoCarga >
        0 ||
      possuiVolumeAtivo
    ) {
      return {
        success:
          false,

        message:
          `Não é possível inativar ${tipo.nome}. Existe saldo físico: central ${saldoCentral}, em carga ${saldoCarga}${possuiVolumeAtivo ? " e volume(s) disponível(is)/em carga" : ""}. Zere a operação antes de inativar.`,
      };
    }
  }

  const {
    error,
  } =
    await supabase
      .from(
        "tipos_cesta",
      )
      .update({
        ativo:
          novoAtivo,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "id",
        tipoId,
      );

  if (error) {
    console.error(
      "Erro alterar status tipo cesta:",
      error,
    );

    return {
      success:
        false,
      message:
        "Não foi possível alterar o status da cesta.",
    };
  }

  revalidar();

  return {
    success:
      true,

    message:
      `${tipo.nome} foi ${novoAtivo ? "ativada" : "inativada"} com sucesso.`,
  };
}
