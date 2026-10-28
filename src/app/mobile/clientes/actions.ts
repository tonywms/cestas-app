"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

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

export type ClienteCampoState = {
  success: boolean;
  message: string;
  clienteId: number | null;
  codigo: string | null;
};

const estadoInicial: ClienteCampoState = {
  success: false,
  message: "",
  clienteId: null,
  codigo: null,
};

function campo(
  formData: FormData,
  nome: string,
) {
  return String(
    formData.get(nome) ??
      "",
  ).trim();
}

async function contexto() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return {
      usuario: null,
      supabase: null,
    };
  }

  return {
    usuario,
    supabase:
      await createClient(),
  };
}

export async function criarClienteCampo(
  _previousState:
    ClienteCampoState,
  formData:
    FormData,
): Promise<ClienteCampoState> {
  const {
    usuario,
    supabase,
  } =
    await contexto();

  if (
    !usuario ||
    !supabase
  ) {
    return {
      ...estadoInicial,
      message:
        "Sessão inválida. Entre novamente.",
    };
  }

  const permitido =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CLIENTE_MOBILE_CADASTRAR,
    );

  if (!permitido) {
    return {
      ...estadoInicial,
      message:
        "Você não possui permissão para cadastrar clientes no mobile.",
    };
  }

  const nome =
    campo(
      formData,
      "nome",
    );

  if (
    nome.length <
    3
  ) {
    return {
      ...estadoInicial,
      message:
        "Informe o nome do cliente.",
    };
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "mobile_criar_cliente",
      {
        p_empresa_id:
          usuario.empresa.id,
        p_nome:
          nome,
        p_cpf_cnpj:
          campo(
            formData,
            "cpf_cnpj",
          ) ||
          null,
        p_telefone:
          campo(
            formData,
            "telefone",
          ) ||
          null,
        p_logradouro:
          campo(
            formData,
            "logradouro",
          ) ||
          null,
        p_numero:
          campo(
            formData,
            "numero",
          ) ||
          null,
        p_complemento:
          campo(
            formData,
            "complemento",
          ) ||
          null,
        p_bairro:
          campo(
            formData,
            "bairro",
          ) ||
          null,
        p_cidade:
          campo(
            formData,
            "cidade",
          ) ||
          null,
        p_uf:
          campo(
            formData,
            "uf",
          ) ||
          null,
        p_cep:
          campo(
            formData,
            "cep",
          ) ||
          null,
      },
    );

  if (error) {
    return {
      ...estadoInicial,
      message:
        error.message ||
        "Não foi possível cadastrar o cliente.",
    };
  }

  const resultado =
    (
      data ??
      {}
    ) as {
      cliente_id?: number;
      codigo?: string;
    };

  const clienteId =
    Number(
      resultado.cliente_id ??
      0,
    );

  revalidatePath(
    "/mobile/clientes",
  );
  revalidatePath(
    "/admin/clientes",
  );
  revalidatePath(
    "/admin/dashboard",
  );

  return {
    success: true,
    message:
      `${nome} cadastrado com sucesso.`,
    clienteId:
      clienteId > 0
        ? clienteId
        : null,
    codigo:
      resultado.codigo ??
      null,
  };
}

export async function editarClienteCampo(
  _previousState:
    ClienteCampoState,
  formData:
    FormData,
): Promise<ClienteCampoState> {
  const {
    usuario,
    supabase,
  } =
    await contexto();

  if (
    !usuario ||
    !supabase
  ) {
    return {
      ...estadoInicial,
      message:
        "Sessão inválida. Entre novamente.",
    };
  }

  const permitido =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CLIENTE_MOBILE_EDITAR,
    );

  if (!permitido) {
    return {
      ...estadoInicial,
      message:
        "Você não possui permissão para editar clientes no mobile.",
    };
  }

  const clienteId =
    Number(
      formData.get(
        "cliente_id",
      ),
    );

  if (
    !Number.isInteger(
      clienteId,
    ) ||
    clienteId <= 0
  ) {
    return {
      ...estadoInicial,
      message:
        "Cliente inválido.",
    };
  }

  const nome =
    campo(
      formData,
      "nome",
    );

  if (
    nome.length <
    3
  ) {
    return {
      ...estadoInicial,
      clienteId,
      message:
        "Informe o nome do cliente.",
    };
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "mobile_editar_cliente",
      {
        p_empresa_id:
          usuario.empresa.id,
        p_cliente_id:
          clienteId,
        p_nome:
          nome,
        p_cpf_cnpj:
          campo(
            formData,
            "cpf_cnpj",
          ) ||
          null,
        p_telefone:
          campo(
            formData,
            "telefone",
          ) ||
          null,
        p_logradouro:
          campo(
            formData,
            "logradouro",
          ) ||
          null,
        p_numero:
          campo(
            formData,
            "numero",
          ) ||
          null,
        p_complemento:
          campo(
            formData,
            "complemento",
          ) ||
          null,
        p_bairro:
          campo(
            formData,
            "bairro",
          ) ||
          null,
        p_cidade:
          campo(
            formData,
            "cidade",
          ) ||
          null,
        p_uf:
          campo(
            formData,
            "uf",
          ) ||
          null,
        p_cep:
          campo(
            formData,
            "cep",
          ) ||
          null,
      },
    );

  if (error) {
    return {
      ...estadoInicial,
      clienteId,
      message:
        error.message ||
        "Não foi possível atualizar o cliente.",
    };
  }

  const resultado =
    (
      data ??
      {}
    ) as {
      codigo?: string;
    };

  revalidatePath(
    "/mobile/clientes",
  );
  revalidatePath(
    `/mobile/clientes/${clienteId}/editar`,
  );
  revalidatePath(
    "/admin/clientes",
  );
  revalidatePath(
    `/admin/clientes/${clienteId}`,
  );
  revalidatePath(
    "/admin/dashboard",
  );

  return {
    success: true,
    message:
      "Cliente atualizado com sucesso.",
    clienteId,
    codigo:
      resultado.codigo ??
      null,
  };
}

export async function iniciarVendaCampo(
  formData:
    FormData,
) {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const podeEntregar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ENTREGA_REALIZAR,
    );

  if (!podeEntregar) {
    redirect(
      "/mobile/sem-acesso",
    );
  }

  const clienteId =
    Number(
      formData.get(
        "cliente_id",
      ),
    );

  if (
    !Number.isInteger(
      clienteId,
    ) ||
    clienteId <= 0
  ) {
    redirect(
      "/mobile/clientes",
    );
  }

  const supabase =
    await createClient();

  const {
    data: cliente,
  } =
    await supabase
      .from("clientes")
      .select("id")
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "id",
        clienteId,
      )
      .eq(
        "ativo",
        true,
      )
      .maybeSingle();

  if (!cliente) {
    redirect(
      "/mobile/clientes",
    );
  }

  redirect(
    `/mobile/entregas/nova?clienteId=${clienteId}`,
  );
}
