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

export type CreditoActionState = {
  success: boolean;
  message: string;
};

async function registrarAuditoria({
  empresaId,
  usuarioId,
  entidade,
  entidadeId,
  acao,
  dados,
}: {
  empresaId: string;
  usuarioId: string;
  entidade: string;
  entidadeId?: string | null;
  acao: string;
  dados?: Record<string, unknown>;
}) {
  const supabase =
    await createClient();

  const {
    error,
  } = await supabase
    .from(
      "auditoria_eventos",
    )
    .insert({
      empresa_id:
        empresaId,

      usuario_id:
        usuarioId,

      entidade,

      entidade_id:
        entidadeId ??
        null,

      acao,

      dados:
        dados ??
        {},
    });

  if (error) {
    console.error(
      "Erro ao registrar auditoria:",
      error,
    );
  }
}

function numeroInteiro(
  valor:
    FormDataEntryValue | null,
) {
  return Number(
    String(
      valor ??
      "",
    ).trim(),
  );
}

/* =========================================================
   POLÍTICA DE CRÉDITO
========================================================= */

export async function salvarPoliticaCredito(
  _previousState:
    CreditoActionState,
  formData:
    FormData,
): Promise<CreditoActionState> {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return {
      success:
        false,

      message:
        "Sessão inválida. Entre novamente no sistema.",
    };
  }

  const podeConfigurar =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo ===
      "ADMINISTRADOR";

  if (!podeConfigurar) {
    return {
      success:
        false,

      message:
        "Somente administrador pode alterar a política de crédito.",
    };
  }

  const alerta =
    numeroInteiro(
      formData.get(
        "credito_alerta_qtd_atrasos",
      ),
    );

  const bloqueio =
    numeroInteiro(
      formData.get(
        "credito_bloqueio_qtd_atrasos",
      ),
    );

  const tolerancia =
    numeroInteiro(
      formData.get(
        "credito_dias_tolerancia",
      ),
    );

  const validade =
    numeroInteiro(
      formData.get(
        "credito_validade_excecao_dias",
      ),
    );

  const permitirExcecao =
    formData.get(
      "credito_permitir_excecao",
    ) === "on";

  if (
    !Number.isInteger(
      alerta,
    ) ||
    alerta < 1 ||
    alerta > 100
  ) {
    return {
      success:
        false,

      message:
        "A quantidade para alerta deve ficar entre 1 e 100.",
    };
  }

  if (
    !Number.isInteger(
      bloqueio,
    ) ||
    bloqueio <=
      alerta ||
    bloqueio > 100
  ) {
    return {
      success:
        false,

      message:
        "O bloqueio deve ser maior que o limite de alerta.",
    };
  }

  if (
    !Number.isInteger(
      tolerancia,
    ) ||
    tolerancia < 0 ||
    tolerancia > 90
  ) {
    return {
      success:
        false,

      message:
        "A tolerância deve ficar entre 0 e 90 dias.",
    };
  }

  if (
    !Number.isInteger(
      validade,
    ) ||
    validade < 1 ||
    validade > 365
  ) {
    return {
      success:
        false,

      message:
        "A validade da exceção deve ficar entre 1 e 365 dias.",
    };
  }

  const supabase =
    await createClient();

  const {
    error,
  } = await supabase
    .from(
      "empresa_configuracoes",
    )
    .update({
      credito_alerta_qtd_atrasos:
        alerta,

      credito_bloqueio_qtd_atrasos:
        bloqueio,

      credito_dias_tolerancia:
        tolerancia,

      credito_permitir_excecao:
        permitirExcecao,

      credito_validade_excecao_dias:
        validade,

      updated_at:
        new Date()
          .toISOString(),
    })
    .eq(
      "empresa_id",
      usuario.empresa.id,
    );

  if (error) {
    console.error(
      "Erro política crédito:",
      error,
    );

    return {
      success:
        false,

      message:
        "Não foi possível salvar a política de crédito.",
    };
  }

  await registrarAuditoria({
    empresaId:
      usuario.empresa.id,

    usuarioId:
      usuario.id,

    entidade:
      "CREDITO_CONFIGURACAO",

    entidadeId:
      usuario.empresa.id,

    acao:
      "POLITICA_CREDITO_ATUALIZADA",

    dados: {
      alertaQtdAtrasos:
        alerta,

      bloqueioQtdAtrasos:
        bloqueio,

      diasTolerancia:
        tolerancia,

      permitirExcecao,

      validadeExcecaoDias:
        validade,
    },
  });

  revalidatePath(
    "/admin/credito",
  );

  revalidatePath(
    "/admin/financeiro",
  );

  revalidatePath(
    "/mobile/recebimentos",
  );

  return {
    success:
      true,

    message:
      "Política de crédito atualizada com sucesso.",
  };
}

/* =========================================================
   LIBERAÇÃO EXCEPCIONAL
========================================================= */

export async function liberarCreditoCliente(
  _previousState:
    CreditoActionState,
  formData:
    FormData,
): Promise<CreditoActionState> {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return {
      success:
        false,

      message:
        "Sessão inválida.",
    };
  }

  const perfilGestao =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo ===
      "ADMINISTRADOR" ||
    usuario.perfilCodigo ===
      "GESTOR";

  const podeLiberar =
    usuario.isPlatformAdmin ||
    (
      perfilGestao &&
      temPermissao(
        usuario.permissoes,
        PERMISSOES.CREDITO_LIBERAR,
      )
    );

  if (!podeLiberar) {
    return {
      success:
        false,

      message:
        "Você não possui permissão para liberar crédito.",
    };
  }

  const clienteId =
    numeroInteiro(
      formData.get(
        "cliente_id",
      ),
    );

  const motivo =
    String(
      formData.get(
        "motivo",
      ) ??
      "",
    ).trim();

  const validadeSolicitada =
    numeroInteiro(
      formData.get(
        "validade_dias",
      ),
    );

  if (
    !Number.isInteger(
      clienteId,
    ) ||
    clienteId <= 0
  ) {
    return {
      success:
        false,

      message:
        "Cliente inválido.",
    };
  }

  if (
    motivo.length <
    10
  ) {
    return {
      success:
        false,

      message:
        "Informe um motivo com pelo menos 10 caracteres.",
    };
  }

  const supabase =
    await createClient();

  const [
    clienteResult,
    configResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "clientes",
        )
        .select(`
          id,
          nome
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "id",
          clienteId,
        )
        .maybeSingle(),

      supabase
        .from(
          "empresa_configuracoes",
        )
        .select(`
          credito_permitir_excecao,
          credito_validade_excecao_dias
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .maybeSingle(),
    ]);

  if (
    clienteResult.error ||
    !clienteResult.data
  ) {
    return {
      success:
        false,

      message:
        "Cliente não encontrado nesta empresa.",
    };
  }

  if (
    configResult.error ||
    !configResult.data
  ) {
    return {
      success:
        false,

      message:
        "Configuração de crédito não encontrada.",
    };
  }

  if (
    !configResult.data
      .credito_permitir_excecao
  ) {
    return {
      success:
        false,

      message:
        "A empresa desativou liberações excepcionais de crédito.",
    };
  }

  const validadeDias =
    Number.isInteger(
      validadeSolicitada,
    ) &&
    validadeSolicitada >=
      1 &&
    validadeSolicitada <=
      365
      ? validadeSolicitada
      : configResult.data
          .credito_validade_excecao_dias;

  const agora =
    new Date();

  const validoAte =
    new Date(
      agora,
    );

  validoAte.setDate(
    validoAte.getDate() +
      validadeDias,
  );

  /*
   * Revoga eventual liberação anterior ainda ativa,
   * preservando histórico.
   */
  const {
    error:
      revogarAnteriorError,
  } = await supabase
    .from(
      "credito_liberacoes",
    )
    .update({
      status:
        "REVOGADA",

      revogado_por:
        usuario.id,

      revogado_at:
        agora.toISOString(),

      motivo_revogacao:
        "Substituída por nova liberação excepcional.",

      updated_at:
        agora.toISOString(),
    })
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "cliente_id",
      clienteId,
    )
    .eq(
      "status",
      "ATIVA",
    )
    .gt(
      "valido_ate",
      agora.toISOString(),
    );

  if (
    revogarAnteriorError
  ) {
    console.error(
      "Erro revogando liberação anterior:",
      revogarAnteriorError,
    );

    return {
      success:
        false,

      message:
        "Não foi possível substituir a liberação anterior.",
    };
  }

  const {
    data:
      liberacao,
    error:
      liberarError,
  } = await supabase
    .from(
      "credito_liberacoes",
    )
    .insert({
      empresa_id:
        usuario.empresa.id,

      cliente_id:
        clienteId,

      liberado_por:
        usuario.id,

      motivo,

      valido_ate:
        validoAte.toISOString(),

      status:
        "ATIVA",
    })
    .select(`
      id,
      valido_ate
    `)
    .single();

  if (
    liberarError ||
    !liberacao
  ) {
    console.error(
      "Erro ao liberar crédito:",
      liberarError,
    );

    return {
      success:
        false,

      message:
        "Não foi possível liberar o crédito.",
    };
  }

  await registrarAuditoria({
    empresaId:
      usuario.empresa.id,

    usuarioId:
      usuario.id,

    entidade:
      "CREDITO",

    entidadeId:
      String(
        clienteId,
      ),

    acao:
      "CREDITO_LIBERADO_EXCECAO",

    dados: {
      cliente:
        clienteResult.data
          .nome,

      motivo,

      validadeDias,

      validoAte:
        liberacao.valido_ate,

      liberacaoId:
        liberacao.id,
    },
  });

  revalidatePath(
    "/admin/credito",
  );

  revalidatePath(
    "/admin/financeiro",
  );

  revalidatePath(
    "/mobile/recebimentos",
  );

  revalidatePath(
    `/mobile/recebimentos/${clienteId}`,
  );

  return {
    success:
      true,

    message:
      `Crédito de ${clienteResult.data.nome} liberado excepcionalmente por ${validadeDias} dia(s).`,
  };
}

/* =========================================================
   REVOGAR LIBERAÇÃO
========================================================= */

export async function revogarLiberacaoCredito(
  _previousState:
    CreditoActionState,
  formData:
    FormData,
): Promise<CreditoActionState> {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return {
      success:
        false,

      message:
        "Sessão inválida.",
    };
  }

  const perfilGestao =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo ===
      "ADMINISTRADOR" ||
    usuario.perfilCodigo ===
      "GESTOR";

  const podeLiberar =
    usuario.isPlatformAdmin ||
    (
      perfilGestao &&
      temPermissao(
        usuario.permissoes,
        PERMISSOES.CREDITO_LIBERAR,
      )
    );

  if (!podeLiberar) {
    return {
      success:
        false,

      message:
        "Você não possui permissão para revogar liberações.",
    };
  }

  const liberacaoId =
    numeroInteiro(
      formData.get(
        "liberacao_id",
      ),
    );

  const clienteId =
    numeroInteiro(
      formData.get(
        "cliente_id",
      ),
    );

  const motivo =
    String(
      formData.get(
        "motivo_revogacao",
      ) ??
      "",
    ).trim() ||
    "Revogação manual pelo gestor.";

  if (
    !Number.isInteger(
      liberacaoId,
    ) ||
    liberacaoId <= 0
  ) {
    return {
      success:
        false,

      message:
        "Liberação inválida.",
    };
  }

  const supabase =
    await createClient();

  const agora =
    new Date()
      .toISOString();

  const {
    data,
    error,
  } = await supabase
    .from(
      "credito_liberacoes",
    )
    .update({
      status:
        "REVOGADA",

      revogado_por:
        usuario.id,

      revogado_at:
        agora,

      motivo_revogacao:
        motivo,

      updated_at:
        agora,
    })
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "id",
      liberacaoId,
    )
    .eq(
      "status",
      "ATIVA",
    )
    .select(`
      id,
      cliente_id
    `)
    .maybeSingle();

  if (
    error ||
    !data
  ) {
    console.error(
      "Erro revogar crédito:",
      error,
    );

    return {
      success:
        false,

      message:
        "Não foi possível revogar a liberação.",
    };
  }

  await registrarAuditoria({
    empresaId:
      usuario.empresa.id,

    usuarioId:
      usuario.id,

    entidade:
      "CREDITO",

    entidadeId:
      String(
        data.cliente_id,
      ),

    acao:
      "CREDITO_EXCECAO_REVOGADA",

    dados: {
      liberacaoId:
        data.id,

      motivo,
    },
  });

  revalidatePath(
    "/admin/credito",
  );

  revalidatePath(
    "/admin/financeiro",
  );

  revalidatePath(
    "/mobile/recebimentos",
  );

  if (
    Number.isInteger(
      clienteId,
    ) &&
    clienteId >
      0
  ) {
    revalidatePath(
      `/mobile/recebimentos/${clienteId}`,
    );
  }

  return {
    success:
      true,

    message:
      "Liberação excepcional revogada.",
  };
}
