"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

type CriarEntregadorState = {
  success: boolean;
  message: string;
  usuarioId: string | null;
};

export async function criarEntregador(
  _previousState: CriarEntregadorState,
  formData: FormData,
): Promise<CriarEntregadorState> {
  const atual =
    await getCurrentUserProfile();

  if (!atual) {
    return {
      success: false,
      message:
        "Sessão inválida. Entre novamente no sistema.",
      usuarioId: null,
    };
  }

  const podeGerenciar =
    atual.isPlatformAdmin ||
    temPermissao(
      atual.permissoes,
      PERMISSOES.USUARIOS_GERENCIAR,
    );

  if (!podeGerenciar) {
    return {
      success: false,
      message:
        "Você não possui permissão para cadastrar usuários.",
      usuarioId: null,
    };
  }

  const nome = String(
    formData.get("nome") ?? "",
  ).trim();

  const email = String(
    formData.get("email") ?? "",
  )
    .trim()
    .toLowerCase();

  const telefone = String(
    formData.get("telefone") ?? "",
  ).trim();

  const senha = String(
    formData.get("senha") ?? "",
  );

  if (nome.length < 3) {
    return {
      success: false,
      message:
        "Informe o nome completo do colaborador.",
      usuarioId: null,
    };
  }

  const emailValido =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    );

  if (!emailValido) {
    return {
      success: false,
      message:
        "Informe um e-mail válido.",
      usuarioId: null,
    };
  }

  if (senha.length < 8) {
    return {
      success: false,
      message:
        "A senha inicial deve possuir pelo menos 8 caracteres.",
      usuarioId: null,
    };
  }

  if (!process.env.SUPABASE_SECRET_KEY) {
    return {
      success: false,
      message:
        "SUPABASE_SECRET_KEY não está configurada no servidor.",
      usuarioId: null,
    };
  }

  const supabaseAdmin =
    createAdminClient();

  /*
   * PERFIL ENTREGADOR
   */
  const {
    data: perfil,
    error: perfilError,
  } = await supabaseAdmin
    .from("perfis")
    .select(`
      id,
      codigo,
      nome
    `)
    .eq("codigo", "ENTREGADOR")
    .eq("ativo", true)
    .maybeSingle();

  if (
    perfilError ||
    !perfil
  ) {
    console.error(
      "Perfil ENTREGADOR:",
      perfilError,
    );

    return {
      success: false,
      message:
        "Perfil ENTREGADOR não encontrado.",
      usuarioId: null,
    };
  }

  /*
   * EVITA E-MAIL DUPLICADO
   */
  const {
    data: usuarioExistente,
    error: usuarioExistenteError,
  } = await supabaseAdmin
    .from("usuarios")
    .select(`
      id,
      email
    `)
    .eq("email", email)
    .maybeSingle();

  if (usuarioExistenteError) {
    console.error(
      "Erro ao verificar usuário existente:",
      usuarioExistenteError,
    );

    return {
      success: false,
      message:
        "Não foi possível validar o e-mail informado.",
      usuarioId: null,
    };
  }

  if (usuarioExistente) {
    return {
      success: false,
      message:
        "Já existe um usuário cadastrado com este e-mail.",
      usuarioId: null,
    };
  }

  /*
   * CRIA NO SUPABASE AUTH
   *
   * IMPORTANTE:
   * já existe um trigger:
   *
   * auth.users
   *   ↓
   * public.handle_new_auth_user()
   *   ↓
   * public.usuarios
   *
   * Portanto NÃO fazemos INSERT em usuarios.
   */
  const {
    data: authData,
    error: authError,
  } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,

      user_metadata: {
        full_name: nome,
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
      success: false,
      message:
        authError?.message ??
        "Não foi possível criar o usuário no Auth.",
      usuarioId: null,
    };
  }

  const novoUsuarioId =
    authData.user.id;

  /*
   * O TRIGGER JÁ CRIOU public.usuarios.
   *
   * Agora apenas atualizamos o cadastro
   * com os dados informados no formulário.
   */
  const {
    data: usuarioAtualizado,
    error: usuarioError,
  } = await supabaseAdmin
    .from("usuarios")
    .update({
      perfil_id:
        perfil.id,

      nome,

      email,

      telefone:
        telefone || null,

      ativo: true,

      updated_at:
        new Date().toISOString(),
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

    /*
     * ROLLBACK
     *
     * Apagando auth.users,
     * public.usuarios também é removido
     * pelo ON DELETE CASCADE.
     */
    await supabaseAdmin.auth.admin.deleteUser(
      novoUsuarioId,
    );

    return {
      success: false,
      message:
        "Não foi possível completar o cadastro do colaborador.",
      usuarioId: null,
    };
  }

  /*
   * VINCULA À EMPRESA ATUAL
   */
  const {
    error: vinculoError,
  } = await supabaseAdmin
    .from("empresa_usuarios")
    .insert({
      empresa_id:
        atual.empresa.id,

      usuario_id:
        novoUsuarioId,

      perfil_id:
        perfil.id,

      ativo: true,

      updated_at:
        new Date().toISOString(),
    });

  if (vinculoError) {
    console.error(
      "Erro empresa_usuarios:",
      vinculoError,
    );

    await supabaseAdmin.auth.admin.deleteUser(
      novoUsuarioId,
    );

    return {
      success: false,
      message:
        "Não foi possível vincular o colaborador à empresa.",
      usuarioId: null,
    };
  }

  /*
   * ATUALIZA TELAS
   */
  revalidatePath(
    "/admin/usuarios",
  );

  revalidatePath(
    "/admin/permissoes",
  );

  revalidatePath(
    `/admin/usuarios/${novoUsuarioId}/permissoes`,
  );

  return {
    success: true,
    message:
      `${nome} foi cadastrado como ENTREGADOR da ${atual.empresa.nomeFantasia}.`,
    usuarioId:
      novoUsuarioId,
  };
}