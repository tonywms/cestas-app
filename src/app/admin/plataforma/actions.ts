"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  getPlatformActionContext,
} from "@/lib/auth/platform-security";

import {
  registrarAuditoriaPlataforma,
} from "@/lib/security/platform-audit";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

type ActionState = {
  success: boolean;
  message: string;
  empresaId?: string | null;
};

function falha(
  message: string,
): ActionState {
  return {
    success: false,
    message,
    empresaId: null,
  };
}

function texto(
  formData: FormData,
  campo: string,
) {
  return String(
    formData.get(campo) ??
      "",
  ).trim();
}

function booleano(
  formData: FormData,
  campo: string,
) {
  return (
    formData.get(campo) ===
    "on"
  );
}

async function sincronizarPerfilEntregador({
  admin,
  empresaId,
  modo,
  bipagemCarga,
  bipagemEntrega,
  pagamentoMobile,
  ocorrenciaMobile,
}: {
  admin:
    ReturnType<typeof createAdminClient>;
  empresaId: string;
  modo:
    "QUANTIDADE" |
    "VOLUME";
  bipagemCarga: boolean;
  bipagemEntrega: boolean;
  pagamentoMobile: boolean;
  ocorrenciaMobile: boolean;
}) {
  const [
    perfilResult,
    permissoesResult,
  ] =
    await Promise.all([
      admin
        .from("perfis")
        .select("id")
        .eq(
          "codigo",
          "ENTREGADOR",
        )
        .eq(
          "ativo",
          true,
        )
        .maybeSingle(),

      admin
        .from("permissoes")
        .select(`
          id,
          codigo
        `)
        .in(
          "codigo",
          [
            "CARGA_BIPAR_VOLUME",
            "ENTREGA_BIPAR_VOLUME",
            "PAGAMENTO_REGISTRAR",
            "OCORRENCIA_REGISTRAR",
          ],
        ),
    ]);

  if (
    !perfilResult.data
  ) {
    return;
  }

  const regras =
    new Map<
      string,
      boolean
    >([
      [
        "CARGA_BIPAR_VOLUME",
        modo ===
          "VOLUME" &&
          bipagemCarga,
      ],
      [
        "ENTREGA_BIPAR_VOLUME",
        modo ===
          "VOLUME" &&
          bipagemEntrega,
      ],
      [
        "PAGAMENTO_REGISTRAR",
        pagamentoMobile,
      ],
      [
        "OCORRENCIA_REGISTRAR",
        ocorrenciaMobile,
      ],
    ]);

  const registros =
    (
      permissoesResult.data ??
      []
    ).map(
      (
        permissao,
      ) => ({
        empresa_id:
          empresaId,
        perfil_id:
          perfilResult.data!.id,
        permissao_id:
          permissao.id,
        permitido:
          regras.get(
            String(
              permissao.codigo,
            ),
          ) ??
          false,
        updated_at:
          new Date()
            .toISOString(),
      }),
    );

  if (
    registros.length >
    0
  ) {
    await admin
      .from(
        "perfil_permissoes",
      )
      .upsert(
        registros,
        {
          onConflict:
            "empresa_id,perfil_id,permissao_id",
        },
      );
  }
}

async function criarMatrizInicial({
  admin,
  empresaId,
  modo,
  bipagemCarga,
  bipagemEntrega,
  pagamentoMobile,
  ocorrenciaMobile,
}: {
  admin:
    ReturnType<typeof createAdminClient>;
  empresaId: string;
  modo:
    "QUANTIDADE" |
    "VOLUME";
  bipagemCarga: boolean;
  bipagemEntrega: boolean;
  pagamentoMobile: boolean;
  ocorrenciaMobile: boolean;
}) {
  const [
    perfisResult,
    permissoesResult,
  ] =
    await Promise.all([
      admin
        .from("perfis")
        .select(`
          id,
          codigo
        `)
        .eq(
          "ativo",
          true,
        ),

      admin
        .from("permissoes")
        .select(`
          id,
          codigo
        `)
        .eq(
          "ativo",
          true,
        ),
    ]);

  const perfis =
    perfisResult.data ??
    [];

  const permissoes =
    permissoesResult.data ??
    [];

  const mapa: Record<
    string,
    Set<string>
  > = {
    ADMINISTRADOR:
      new Set(
        permissoes.map(
          (
            item,
          ) =>
            String(
              item.codigo,
            ),
        ),
      ),

    GESTOR:
      new Set(
        permissoes
          .map(
            (
              item,
            ) =>
              String(
                item.codigo,
              ),
          )
          .filter(
            (
              codigo,
            ) =>
              codigo !==
                "EMPRESA_CONFIGURAR" &&
              codigo !==
                "PERMISSOES_GERENCIAR",
          ),
      ),

    ESTOQUE:
      new Set([
        "CARGA_BIPAR_VOLUME",
        "CARGA_GERENCIAR",
        "CARGA_RECEBER",
        "CARGA_VISUALIZAR_TODAS",
        "CESTAS_GERENCIAR",
        "ESTOQUE_AJUSTAR",
        "ESTOQUE_MOVIMENTAR",
        "ESTOQUE_VISUALIZAR",
      ]),

    ENTREGADOR:
      new Set([
        "CARGA_RECEBER",
        "CARGA_RETORNAR",
        "CARGA_VISUALIZAR",
        "ENTREGA_REALIZAR",
        "ROTA_VISUALIZAR",
        "CLIENTE_MOBILE_CADASTRAR",
        "CLIENTE_MOBILE_EDITAR",
      ]),

    FINANCEIRO:
      new Set([
        "CREDITO_LIBERAR",
        "PAGAMENTO_REGISTRAR",
      ]),
  };

  if (
    modo ===
      "VOLUME" &&
    bipagemCarga
  ) {
    mapa.ENTREGADOR.add(
      "CARGA_BIPAR_VOLUME",
    );
  }

  if (
    modo ===
      "VOLUME" &&
    bipagemEntrega
  ) {
    mapa.ENTREGADOR.add(
      "ENTREGA_BIPAR_VOLUME",
    );
  }

  if (
    pagamentoMobile
  ) {
    mapa.ENTREGADOR.add(
      "PAGAMENTO_REGISTRAR",
    );
  }

  if (
    ocorrenciaMobile
  ) {
    mapa.ENTREGADOR.add(
      "OCORRENCIA_REGISTRAR",
    );
  }

  const registros:
    Array<{
      empresa_id: string;
      perfil_id: number;
      permissao_id: string;
      permitido: boolean;
    }> = [];

  for (
    const perfil of
      perfis
  ) {
    const permitidas =
      mapa[
        String(
          perfil.codigo,
        )
      ] ??
      new Set<string>();

    for (
      const permissao of
        permissoes
    ) {
      registros.push({
        empresa_id:
          empresaId,
        perfil_id:
          Number(
            perfil.id,
          ),
        permissao_id:
          String(
            permissao.id,
          ),
        permitido:
          permitidas.has(
            String(
              permissao.codigo,
            ),
          ),
      });
    }
  }

  if (
    registros.length >
    0
  ) {
    const {
      error,
    } =
      await admin
        .from(
          "perfil_permissoes",
        )
        .upsert(
          registros,
          {
            onConflict:
              "empresa_id,perfil_id,permissao_id",
          },
        );

    if (error) {
      throw error;
    }
  }
}

export async function criarEmpresaPlataforma(
  _previousState:
    ActionState,
  formData:
    FormData,
): Promise<ActionState> {
  const seguranca =
    await getPlatformActionContext();

  if (
    !seguranca.ok ||
    !seguranca.usuario
  ) {
    return falha(
      seguranca.message,
    );
  }

  const atual =
    seguranca.usuario;

  const codigo =
    texto(
      formData,
      "codigo",
    ).toUpperCase();

  const nomeFantasia =
    texto(
      formData,
      "nome_fantasia",
    );

  const razaoSocial =
    texto(
      formData,
      "razao_social",
    );

  const cnpj =
    texto(
      formData,
      "cnpj",
    );

  const limiteUsuarios =
    Number(
      formData.get(
        "limite_usuarios",
      ),
    );

  const modo =
    texto(
      formData,
      "modo_controle_carga",
    ) ===
    "VOLUME"
      ? "VOLUME"
      : "QUANTIDADE";

  const bipagemCarga =
    booleano(
      formData,
      "exigir_bipagem_carga",
    );

  const bipagemEntrega =
    booleano(
      formData,
      "exigir_bipagem_entrega",
    );

  const pagamentoMobile =
    booleano(
      formData,
      "permitir_pagamento_mobile",
    );

  const ocorrenciaMobile =
    booleano(
      formData,
      "permitir_ocorrencia_mobile",
    );

  const adminNome =
    texto(
      formData,
      "admin_nome",
    );

  const adminEmail =
    texto(
      formData,
      "admin_email",
    ).toLowerCase();

  const adminSenha =
    texto(
      formData,
      "admin_senha",
    );

  if (
    codigo.length <
    2
  ) {
    return falha(
      "Informe um código válido para a empresa.",
    );
  }

  if (
    nomeFantasia.length <
    3
  ) {
    return falha(
      "Informe o nome fantasia.",
    );
  }

  if (
    !Number.isInteger(
      limiteUsuarios,
    ) ||
    limiteUsuarios <
      1 ||
    limiteUsuarios >
      999
  ) {
    return falha(
      "O limite de usuários deve ficar entre 1 e 999.",
    );
  }

  if (
    adminNome.length <
    3
  ) {
    return falha(
      "Informe o nome do primeiro administrador.",
    );
  }

  if (
    !adminEmail.includes(
      "@",
    )
  ) {
    return falha(
      "Informe um e-mail válido para o administrador.",
    );
  }

  if (
    adminSenha.length <
    8
  ) {
    return falha(
      "A senha inicial precisa ter pelo menos 8 caracteres.",
    );
  }

  const admin =
    createAdminClient();

  const {
    data:
      empresaExistente,
  } =
    await admin
      .from("empresas")
      .select("id")
      .eq(
        "codigo",
        codigo,
      )
      .maybeSingle();

  if (
    empresaExistente
  ) {
    return falha(
      "Já existe uma empresa com este código.",
    );
  }

  const {
    data:
      emailExistente,
  } =
    await admin
      .from("usuarios")
      .select("id")
      .eq(
        "email",
        adminEmail,
      )
      .maybeSingle();

  if (
    emailExistente
  ) {
    return falha(
      "Já existe um usuário cadastrado com este e-mail.",
    );
  }

  let authUserId:
    string |
    null =
    null;

  let empresaId:
    string |
    null =
    null;

  try {
    const {
      data:
        authResult,
      error:
        authError,
    } =
      await admin.auth.admin.createUser({
        email:
          adminEmail,
        password:
          adminSenha,
        email_confirm:
          true,
        user_metadata: {
          nome:
            adminNome,
        },
      });

    if (
      authError ||
      !authResult.user
    ) {
      throw new Error(
        authError?.message ??
        "Não foi possível criar o usuário administrador.",
      );
    }

    authUserId =
      authResult.user.id;

    const {
      data:
        empresa,
      error:
        empresaError,
    } =
      await admin
        .from("empresas")
        .insert({
          codigo,
          nome_fantasia:
            nomeFantasia,
          razao_social:
            razaoSocial ||
            null,
          cnpj:
            cnpj ||
            null,
          status:
            "ATIVA",
          ativo:
            true,
          limite_usuarios:
            limiteUsuarios,
        })
        .select("id")
        .single();

    if (
      empresaError ||
      !empresa
    ) {
      throw new Error(
        empresaError?.message ??
        "Não foi possível criar a empresa.",
      );
    }

    empresaId =
      String(
        empresa.id,
      );

    const {
      error:
        configuracaoError,
    } =
      await admin
        .from(
          "empresa_configuracoes",
        )
        .insert({
          empresa_id:
            empresaId,
          modo_controle_carga:
            modo,
          exigir_bipagem_carga:
            modo ===
              "VOLUME" &&
            bipagemCarga,
          exigir_bipagem_entrega:
            modo ===
              "VOLUME" &&
            bipagemEntrega,
          permitir_pagamento_mobile:
            pagamentoMobile,
          permitir_ocorrencia_mobile:
            ocorrenciaMobile,
        });

    if (
      configuracaoError
    ) {
      throw configuracaoError;
    }

    await criarMatrizInicial({
      admin,
      empresaId,
      modo,
      bipagemCarga:
        modo ===
        "VOLUME"
          ? bipagemCarga
          : false,
      bipagemEntrega:
        modo ===
        "VOLUME"
          ? bipagemEntrega
          : false,
      pagamentoMobile,
      ocorrenciaMobile,
    });

    const {
      data:
        perfilAdmin,
      error:
        perfilError,
    } =
      await admin
        .from("perfis")
        .select("id")
        .eq(
          "codigo",
          "ADMINISTRADOR",
        )
        .eq(
          "ativo",
          true,
        )
        .maybeSingle();

    if (
      perfilError ||
      !perfilAdmin
    ) {
      throw new Error(
        "Perfil ADMINISTRADOR não encontrado.",
      );
    }

    const {
      error:
        usuarioError,
    } =
      await admin
        .from("usuarios")
        .insert({
          id:
            authUserId,
          nome:
            adminNome,
          email:
            adminEmail,
          ativo:
            true,
        });

    if (
      usuarioError
    ) {
      throw usuarioError;
    }

    const {
      error:
        vinculoError,
    } =
      await admin
        .from(
          "empresa_usuarios",
        )
        .insert({
          empresa_id:
            empresaId,
          usuario_id:
            authUserId,
          perfil_id:
            perfilAdmin.id,
          ativo:
            true,
        });

    if (
      vinculoError
    ) {
      throw vinculoError;
    }

    revalidatePath(
      "/admin/plataforma",
    );

    revalidatePath(
      `/admin/plataforma/empresas/${empresaId}`,
    );

    await registrarAuditoriaPlataforma({
      admin,
      empresaId,
      usuarioId:
        atual.id,
      acao:
        "EMPRESA_CRIADA",
      entidadeId:
        empresaId,
      dados: {
        codigo,
        nome_fantasia:
          nomeFantasia,
        limite_usuarios:
          limiteUsuarios,
        modo_controle_carga:
          modo,
        exigir_bipagem_carga:
          modo ===
            "VOLUME" &&
          bipagemCarga,
        exigir_bipagem_entrega:
          modo ===
            "VOLUME" &&
          bipagemEntrega,
        permitir_pagamento_mobile:
          pagamentoMobile,
        permitir_ocorrencia_mobile:
          ocorrenciaMobile,
        administrador_inicial_email:
          adminEmail,
      },
    });

    return {
      success:
        true,
      message:
        `${nomeFantasia} criada com administrador inicial e ambiente isolado.`,
      empresaId,
    };
  } catch (
    error
  ) {
    console.error(
      "Erro onboarding empresa:",
      error,
    );

    /*
     * Rollback de segurança do onboarding recém-criado.
     */
    if (
      empresaId
    ) {
      await admin
        .from("empresas")
        .delete()
        .eq(
          "id",
          empresaId,
        );
    }

    if (
      authUserId
    ) {
      await admin.auth.admin.deleteUser(
        authUserId,
      );
    }

    await registrarAuditoriaPlataforma({
      admin,
      empresaId:
        atual.empresa.id,
      usuarioId:
        atual.id,
      acao:
        "EMPRESA_CRIACAO_FALHOU",
      entidadeId:
        codigo,
      dados: {
        codigo,
        nome_fantasia:
          nomeFantasia,
        erro:
          error instanceof
            Error
            ? error.message
            : "Erro desconhecido",
      },
    });

    return falha(
      error instanceof
        Error
        ? error.message
        : "Não foi possível concluir o onboarding da empresa.",
    );
  }
}

export async function atualizarEmpresaPlataforma(
  _previousState:
    ActionState,
  formData:
    FormData,
): Promise<ActionState> {
  const seguranca =
    await getPlatformActionContext();

  if (
    !seguranca.ok ||
    !seguranca.usuario
  ) {
    return falha(
      seguranca.message,
    );
  }

  const atual =
    seguranca.usuario;

  const empresaId =
    texto(
      formData,
      "empresa_id",
    );

  const nomeFantasia =
    texto(
      formData,
      "nome_fantasia",
    );

  const razaoSocial =
    texto(
      formData,
      "razao_social",
    );

  const cnpj =
    texto(
      formData,
      "cnpj",
    );

  const status =
    texto(
      formData,
      "status",
    ) ===
    "SUSPENSA"
      ? "SUSPENSA"
      : "ATIVA";

  const limiteUsuarios =
    Number(
      formData.get(
        "limite_usuarios",
      ),
    );

  const confirmacaoSuspensao =
    texto(
      formData,
      "confirmacao_suspensao",
    ).toUpperCase();

  const modo =
    texto(
      formData,
      "modo_controle_carga",
    ) ===
    "VOLUME"
      ? "VOLUME"
      : "QUANTIDADE";

  const bipagemCarga =
    booleano(
      formData,
      "exigir_bipagem_carga",
    );

  const bipagemEntrega =
    booleano(
      formData,
      "exigir_bipagem_entrega",
    );

  const pagamentoMobile =
    booleano(
      formData,
      "permitir_pagamento_mobile",
    );

  const ocorrenciaMobile =
    booleano(
      formData,
      "permitir_ocorrencia_mobile",
    );

  if (
    !empresaId
  ) {
    return falha(
      "Empresa inválida.",
    );
  }

  if (
    nomeFantasia.length <
    3
  ) {
    return falha(
      "Informe o nome fantasia.",
    );
  }

  if (
    !Number.isInteger(
      limiteUsuarios,
    ) ||
    limiteUsuarios <
      1 ||
    limiteUsuarios >
      999
  ) {
    return falha(
      "O limite de usuários deve ficar entre 1 e 999.",
    );
  }

  if (
    status ===
      "SUSPENSA" &&
    empresaId ===
      atual.empresa.id
  ) {
    return falha(
      "A empresa em que o Super Admin está logado não pode ser suspensa por esta tela.",
    );
  }

  const admin =
    createAdminClient();

  const [
    empresaAntesResult,
    configAntesResult,
    usuariosAtivosResult,
  ] =
    await Promise.all([
      admin
        .from("empresas")
        .select(`
          id,
          codigo,
          nome_fantasia,
          razao_social,
          cnpj,
          status,
          ativo,
          limite_usuarios
        `)
        .eq(
          "id",
          empresaId,
        )
        .maybeSingle(),

      admin
        .from(
          "empresa_configuracoes",
        )
        .select(`
          modo_controle_carga,
          exigir_bipagem_carga,
          exigir_bipagem_entrega,
          permitir_pagamento_mobile,
          permitir_ocorrencia_mobile
        `)
        .eq(
          "empresa_id",
          empresaId,
        )
        .maybeSingle(),

      admin
        .from(
          "empresa_usuarios",
        )
        .select(
          "usuario_id",
          {
            count:
              "exact",
            head:
              true,
          },
        )
        .eq(
          "empresa_id",
          empresaId,
        )
        .eq(
          "ativo",
          true,
        ),
    ]);

  const empresaAntes =
    empresaAntesResult.data;

  if (
    !empresaAntes
  ) {
    return falha(
      "Empresa não encontrada.",
    );
  }

  const usuariosAtivos =
    usuariosAtivosResult.count ??
    0;

  if (
    limiteUsuarios <
    usuariosAtivos
  ) {
    return falha(
      `O limite não pode ficar abaixo dos ${usuariosAtivos} usuário(s) ativos atuais.`,
    );
  }

  const suspensaoNova =
    empresaAntes.status !==
      "SUSPENSA" &&
    status ===
      "SUSPENSA";

  if (
    suspensaoNova &&
    confirmacaoSuspensao !==
      String(
        empresaAntes.codigo,
      ).toUpperCase()
  ) {
    return falha(
      `Para suspender, digite exatamente o código ${empresaAntes.codigo}.`,
    );
  }

  const {
    error:
      empresaError,
  } =
    await admin
      .from("empresas")
      .update({
        nome_fantasia:
          nomeFantasia,
        razao_social:
          razaoSocial ||
          null,
        cnpj:
          cnpj ||
          null,
        status,
        ativo:
          status ===
          "ATIVA",
        limite_usuarios:
          limiteUsuarios,
        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        empresaId,
      );

  if (
    empresaError
  ) {
    return falha(
      empresaError.message,
    );
  }

  const {
    error:
      configError,
  } =
    await admin
      .from(
        "empresa_configuracoes",
      )
      .upsert(
        {
          empresa_id:
            empresaId,
          modo_controle_carga:
            modo,
          exigir_bipagem_carga:
            modo ===
              "VOLUME" &&
            bipagemCarga,
          exigir_bipagem_entrega:
            modo ===
              "VOLUME" &&
            bipagemEntrega,
          permitir_pagamento_mobile:
            pagamentoMobile,
          permitir_ocorrencia_mobile:
            ocorrenciaMobile,
          updated_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            "empresa_id",
        },
      );

  if (
    configError
  ) {
    return falha(
      configError.message,
    );
  }

  await sincronizarPerfilEntregador({
    admin,
    empresaId,
    modo,
    bipagemCarga:
      modo ===
      "VOLUME"
        ? bipagemCarga
        : false,
    bipagemEntrega:
      modo ===
      "VOLUME"
        ? bipagemEntrega
        : false,
    pagamentoMobile,
    ocorrenciaMobile,
  });

  revalidatePath(
    "/admin/plataforma",
  );

  revalidatePath(
    `/admin/plataforma/empresas/${empresaId}`,
  );

  await registrarAuditoriaPlataforma({
    admin,
    empresaId,
    usuarioId:
      atual.id,
    acao:
      "EMPRESA_ATUALIZADA",
    entidadeId:
      empresaId,
    dados: {
      antes: {
        nome_fantasia:
          empresaAntes.nome_fantasia,
        razao_social:
          empresaAntes.razao_social,
        cnpj:
          empresaAntes.cnpj,
        status:
          empresaAntes.status,
        ativo:
          empresaAntes.ativo,
        limite_usuarios:
          empresaAntes.limite_usuarios,
        configuracao:
          configAntesResult.data,
      },
      depois: {
        nome_fantasia:
          nomeFantasia,
        razao_social:
          razaoSocial ||
          null,
        cnpj:
          cnpj ||
          null,
        status,
        ativo:
          status ===
          "ATIVA",
        limite_usuarios:
          limiteUsuarios,
        configuracao: {
          modo_controle_carga:
            modo,
          exigir_bipagem_carga:
            modo ===
              "VOLUME" &&
            bipagemCarga,
          exigir_bipagem_entrega:
            modo ===
              "VOLUME" &&
            bipagemEntrega,
          permitir_pagamento_mobile:
            pagamentoMobile,
          permitir_ocorrencia_mobile:
            ocorrenciaMobile,
        },
      },
    },
  });

  return {
    success:
      true,
    message:
      "Empresa atualizada com sucesso.",
    empresaId,
  };
}
