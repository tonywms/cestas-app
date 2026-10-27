"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

type ActionState = {
  success: boolean;
  message: string;
};

export async function criarCliente(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return {
      success: false,
      message: "Sessão inválida.",
    };
  }

  const podeGerenciar =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo === "ADMINISTRADOR" ||
    usuario.perfilCodigo === "GESTOR";

  if (!podeGerenciar) {
    return {
      success: false,
      message:
        "Você não possui permissão para cadastrar clientes.",
    };
  }

  const nome = String(
    formData.get("nome") ?? "",
  ).trim();

  const codigoInformado = String(
    formData.get("codigo") ?? "",
  )
    .trim()
    .toUpperCase();

  const cpfCnpj = String(
    formData.get("cpf_cnpj") ?? "",
  ).trim();

  const telefone = String(
    formData.get("telefone") ?? "",
  ).trim();

  const logradouro = String(
    formData.get("logradouro") ?? "",
  ).trim();

  const numero = String(
    formData.get("numero") ?? "",
  ).trim();

  const bairro = String(
    formData.get("bairro") ?? "",
  ).trim();

  const cidade = String(
    formData.get("cidade") ?? "",
  ).trim();

  const uf = String(
    formData.get("uf") ?? "",
  )
    .trim()
    .toUpperCase();

  const cep = String(
    formData.get("cep") ?? "",
  ).trim();

  if (nome.length < 3) {
    return {
      success: false,
      message:
        "Informe o nome do cliente.",
    };
  }

  const supabase =
    await createClient();

  let codigo =
    codigoInformado;

  if (!codigo) {
    const {
      count,
    } = await supabase
      .from("clientes")
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
      );

    codigo =
      `CLI${String(
        (count ?? 0) + 1,
      ).padStart(5, "0")}`;
  }

  const {
    data: existente,
  } = await supabase
    .from("clientes")
    .select("id")
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "codigo",
      codigo,
    )
    .maybeSingle();

  if (existente) {
    return {
      success: false,
      message:
        "Já existe um cliente com este código.",
    };
  }

  const {
    error,
  } = await supabase
    .from("clientes")
    .insert({
      empresa_id:
        usuario.empresa.id,

      codigo,

      nome,

      cpf_cnpj:
        cpfCnpj || null,

      telefone:
        telefone || null,

      logradouro:
        logradouro || null,

      numero:
        numero || null,

      bairro:
        bairro || null,

      cidade:
        cidade || null,

      uf:
        uf || null,

      cep:
        cep || null,

      ativo:
        true,
    });

  if (error) {
    console.error(
      "Erro ao cadastrar cliente:",
      error,
    );

    return {
      success: false,
      message:
        "Não foi possível cadastrar o cliente.",
    };
  }

  revalidatePath(
    "/admin/clientes",
  );

  revalidatePath(
    "/mobile/entregas/nova",
  );

  return {
    success: true,
    message:
      `${nome} cadastrado com sucesso.`,
  };
}