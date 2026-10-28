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
  createAdminClient,
} from "@/lib/supabase/admin";

export type CriarColaboradorState = {
  success: boolean;
  message: string;
  usuarioId: string | null;
};

const PERFIS_PERMITIDOS =
  new Set([
    "ENTREGADOR",
    "FINANCEIRO",
  ]);

async function garantirPermissoesFinanceiro({
  supabaseAdmin,
  empresaId,
  perfilId,
}: {
  supabaseAdmin:
    ReturnType<
      typeof createAdminClient
    >;
  empresaId: string;
  perfilId: number;
}) {
  const {
    data:
      permissoes,
    error:
      permissoesError,
  } =
    await supabaseAdmin
      .from("permissoes")
      .select(`
        id,
        codigo
      `)
      .in(
        "codigo",
        [
          "PAGAMENTO_REGISTRAR",
          "CREDITO_LIBERAR",
        ],
      )
      .eq(
        "ativo",
        true,
      );

  if (
    permissoesError
  ) {
    console.error(
      "Erro permissões Financeiro:",
      permissoesError,
    );

    return;
  }

  const registros =
    (
      permissoes ??
      []
    ).map(
      (
        permissao,
      ) => ({
        empresa_id:
          empresaId,
        perfil_id:
          perfilId,
        permissao_id:
          permissao.id,
        permitido:
          true,
        updated_at:
          new Date()
            .toISOString(),
      }),
    );

  if (
    registros.length ===
    0
  ) {
    return;
  }

  const {
    error,
  } =
    await supabaseAdmin
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

  if (
    error
  ) {
    console.error(
      "Erro perfil_permissoes Financeiro:",
      error,
    );
  }
}

export async function criarColaborador(
  _previousState:
    CriarColaboradorState,
  formData:
    FormData,
): Promise<CriarColaboradorState> {
  const atual =
    await getCurrentUserProfile();

  if (!atual) {
    return {
      success:
        false,
      message:
        "Sessão inválida. Entre novamente no sistema.",
      usuarioId:
        null,
    };
  }

  const podeGerenciar =
    atual.isPlatformAdmin ||
    temPermissao(
      atual.permissoes,
      PERMISSOES.USUARIOS_GERENCIAR,
    );

  if (
    !podeGerenciar
  ) {
    return {
      success:
        false,
      message:
        "Você não possui permissão para cadastrar usuários.",
      usuarioId:
        null,
    };
  }

  const nome =
    String(
      formData.get(
        "nome",
      ) ??
        "",
    ).trim();

  const email =
    String(
      formData.get(
        "email",
      ) ??
        "",
    )
      .trim()
      .toLowerCase();

  const telefone =
    String(
      formData.get(
        "telefone",
      ) ??
        "",
    ).trim();

  const senha =
    String(
      formData.get(
        "senha",
      ) ??
        "",
    );

  const perfilCodigo =
    String(
      formData.get(
        "perfil_codigo",
      ) ??
        "",
    )
      .trim()
      .toUpperCase();

  if (
    nome.length <
    3
  ) {
    return {
      success:
        false,
      message:
        "Informe o nome completo do colaborador.",
      usuarioId:
        null,
    };
  }

  const emailValido =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    );

  if (
    !emailValido
  ) {
    return {
      success:
        false,
      message:
        "Informe um e-mail válido.",
      usuarioId:
        null,
    };
  }

  if (
    senha.length <
    8
  ) {
    return {
      success:
        false,
      message:
        "A senha inicial deve possuir pelo menos 8 caracteres.",
      usuarioId:
        null,
    };
  }

  if (
    !PERFIS_PERMITIDOS.has(
      perfilCodigo,
    )
  ) {
    return {
      success:
        false,
      message:
        "Perfil inválido. Cadastre apenas Entregador ou Financeiro.",
      usuarioId:
        null,
    };
  }

  if (
    !process.env
      .SUPABASE_SECRET_KEY
  ) {
    return {
      success:
        false,
      message:
        "SUPABASE_SECRET_KEY não está configurada no servidor.",
      usuarioId:
        null,
    };
  }

  const supabaseAdmin =
    createAdminClient();

  /*
   * LICENCIAMENTO / LIMITE DE USUÁRIOS
   */
  const [
    empresaResult,
    membrosResult,
  ] =
    await Promise.all([
      supabaseAdmin
        .from("empresas")
        .select(`
          id,
          nome_fantasia,
          limite_usuarios
        `)
        .eq(
          "id",
          atual.empresa.id,
        )
        .maybeSingle(),

      supabaseAdmin
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
          atual.empresa.id,
        )
        .eq(
          "ativo",
          true,
        ),
    ]);

  if (
    empresaResult.error ||
    !empresaResult.data
  ) {
    return {
      success:
        false,
      message:
        "Não foi possível consultar o limite de usuários da empresa.",
      usuarioId:
        null,
    };
  }

  const limite =
    Number(
      empresaResult.data
        .limite_usuarios ??
        10,
    );

  const usados =
    membrosResult.count ??
    0;

  if (
    usados >=
    limite
  ) {
    return {
      success:
        false,
      message:
        `Limite de usuários atingido: ${usados}/${limite}. Aumente o limite da empresa antes de cadastrar outro colaborador.`,
      usuarioId:
        null,
    };
  }

  /*
   * PERFIL ESCOLHIDO
   */
  const {
    data:
      perfil,
    error:
      perfilError,
  } =
    await supabaseAdmin
      .from("perfis")
      .select(`
        id,
        codigo,
        nome
      `)
      .eq(
        "codigo",
        perfilCodigo,
      )
      .eq(
        "ativo",
        true,
      )
      .maybeSingle();

  if (
    perfilError ||
    !perfil
  ) {
    console.error(
      "Perfil:",
      perfilError,
    );

    return {
      success:
        false,
      message:
        `Perfil ${perfilCodigo} não encontrado.`,
      usuarioId:
        null,
    };
  }

  /*
   * EVITA E-MAIL DUPLICADO
   */
  const {
    data:
      usuarioExistente,
    error:
      usuarioExistenteError,
  } =
    await supabaseAdmin
      .from("usuarios")
      .select(`
        id,
        email
      `)
      .eq(
        "email",
        email,
      )
      .maybeSingle();

  if (
    usuarioExistenteError
  ) {
    console.error(
      "Erro ao verificar usuário existente:",
      usuarioExistenteError,
    );

    return {
      success:
        false,
      message:
        "Não foi possível validar o e-mail informado.",
      usuarioId:
        null,
    };
  }

  if (
    usuarioExistente
  ) {
    return {
      success:
        false,
      message:
        "Já existe um usuário cadastrado com este e-mail.",
      usuarioId:
        null,
    };
  }

  const {
    data:
      authData,
    error:
      authError,
  } =
    await supabaseAdmin
      .auth
      .admin
      .createUser({
        email,
        password:
          senha,
        email_confirm:
          true,

        user_metadata: {
          full_name:
            nome,
          nome,
        },
      });

  if (
    authError ||
    !authData.user
  ) {
    console.error(
      "Erro Auth:",
      authError,
    );

    return {
      success:
        false,
      message:
        authError
          ?.message ??
        "Não foi possível criar o usuário no Auth.",
      usuarioId:
        null,
    };
  }

  const novoUsuarioId =
    authData.user.id;

  const {
    data:
      usuarioAtualizado,
    error:
      usuarioError,
  } =
    await supabaseAdmin
      .from("usuarios")
      .update({
        perfil_id:
          perfil.id,

        nome,

        email,

        telefone:
          telefone ||
          null,

        ativo:
          true,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        novoUsuarioId,
      )
      .select(`
        id,
        nome,
        email,
        perfil_id
      `)
      .maybeSingle();

  if (
    usuarioError ||
    !usuarioAtualizado
  ) {
    console.error(
      "Erro ao atualizar public.usuarios:",
      usuarioError,
    );

    await supabaseAdmin
      .auth
      .admin
      .deleteUser(
        novoUsuarioId,
      );

    return {
      success:
        false,
      message:
        "Não foi possível completar o cadastro do colaborador.",
      usuarioId:
        null,
    };
  }

  const {
    error:
      vinculoError,
  } =
    await supabaseAdmin
      .from(
        "empresa_usuarios",
      )
      .insert({
        empresa_id:
          atual.empresa.id,

        usuario_id:
          novoUsuarioId,

        perfil_id:
          perfil.id,

        ativo:
          true,

        updated_at:
          new Date()
            .toISOString(),
      });

  if (
    vinculoError
  ) {
    console.error(
      "Erro empresa_usuarios:",
      vinculoError,
    );

    await supabaseAdmin
      .auth
      .admin
      .deleteUser(
        novoUsuarioId,
      );

    return {
      success:
        false,
      message:
        "Não foi possível vincular o colaborador à empresa.",
      usuarioId:
        null,
    };
  }

  if (
    perfilCodigo ===
    "FINANCEIRO"
  ) {
    await garantirPermissoesFinanceiro({
      supabaseAdmin,
      empresaId:
        atual.empresa.id,
      perfilId:
        Number(
          perfil.id,
        ),
    });
  }

  revalidatePath(
    "/admin/usuarios",
  );

  revalidatePath(
    "/admin/permissoes",
  );

  revalidatePath(
    "/admin",
  );

  if (
    perfilCodigo ===
    "ENTREGADOR"
  ) {
    revalidatePath(
      `/admin/usuarios/${novoUsuarioId}/permissoes`,
    );
  }

  return {
    success:
      true,
    message:
      `${nome} foi cadastrado como ${perfil.nome} da ${atual.empresa.nomeFantasia}.`,
    usuarioId:
      novoUsuarioId,
  };
}
