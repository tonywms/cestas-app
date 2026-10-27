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

export type EditarClienteState = {
  success: boolean;
  message: string;
};

function texto(
  valor:
    FormDataEntryValue | null,
) {
  const resultado =
    String(
      valor ??
      "",
    ).trim();

  return (
    resultado ||
    null
  );
}

export async function editarCliente(
  _previousState:
    EditarClienteState,
  formData:
    FormData,
): Promise<EditarClienteState> {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return {
      success: false,
      message:
        "Sessão inválida. Entre novamente no sistema.",
    };
  }

  const podeGerenciar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CLIENTES_GERENCIAR,
    );

  if (!podeGerenciar) {
    return {
      success: false,
      message:
        "Você não possui permissão para editar clientes.",
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
      success: false,
      message:
        "Cliente inválido.",
    };
  }

  const nome =
    String(
      formData.get(
        "nome",
      ) ??
      "",
    ).trim();

  if (
    nome.length <
    2
  ) {
    return {
      success: false,
      message:
        "Informe o nome do cliente.",
    };
  }

  const supabase =
    await createClient();

  const {
    data: atual,
    error:
      atualError,
  } = await supabase
    .from("clientes")
    .select(`
      id,
      nome,
      cpf_cnpj,
      telefone,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      cep,
      ativo
    `)
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "id",
      clienteId,
    )
    .maybeSingle();

  if (
    atualError ||
    !atual
  ) {
    return {
      success: false,
      message:
        "Cliente não encontrado nesta empresa.",
    };
  }

  const novo = {
    nome,
    cpf_cnpj:
      texto(
        formData.get(
          "cpf_cnpj",
        ),
      ),

    telefone:
      texto(
        formData.get(
          "telefone",
        ),
      ),

    logradouro:
      texto(
        formData.get(
          "logradouro",
        ),
      ),

    numero:
      texto(
        formData.get(
          "numero",
        ),
      ),

    complemento:
      texto(
        formData.get(
          "complemento",
        ),
      ),

    bairro:
      texto(
        formData.get(
          "bairro",
        ),
      ),

    cidade:
      texto(
        formData.get(
          "cidade",
        ),
      ),

    uf:
      texto(
        formData.get(
          "uf",
        ),
      )?.toUpperCase() ??
      null,

    cep:
      texto(
        formData.get(
          "cep",
        ),
      ),

    ativo:
      formData.get(
        "ativo",
      ) === "on",

    updated_at:
      new Date()
        .toISOString(),
  };

  const enderecoAlterado =
    atual.logradouro !==
      novo.logradouro ||
    atual.numero !==
      novo.numero ||
    atual.complemento !==
      novo.complemento ||
    atual.bairro !==
      novo.bairro ||
    atual.cidade !==
      novo.cidade ||
    atual.uf !==
      novo.uf ||
    atual.cep !==
      novo.cep;

  const {
    error:
      updateError,
  } = await supabase
    .from("clientes")
    .update(novo)
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "id",
      clienteId,
    );

  if (updateError) {
    console.error(
      "Erro ao editar cliente:",
      updateError,
    );

    return {
      success: false,
      message:
        "Não foi possível salvar as alterações do cliente.",
    };
  }

  const {
    error:
      auditoriaError,
  } = await supabase
    .from(
      "auditoria_eventos",
    )
    .insert({
      empresa_id:
        usuario.empresa.id,

      usuario_id:
        usuario.id,

      entidade:
        "CLIENTE",

      entidade_id:
        String(
          clienteId,
        ),

      acao:
        enderecoAlterado
          ? "CLIENTE_DADOS_E_ENDERECO_ATUALIZADOS"
          : "CLIENTE_DADOS_ATUALIZADOS",

      dados: {
        nomeAnterior:
          atual.nome,

        nomeNovo:
          nome,

        enderecoAlterado,

        ativoAnterior:
          atual.ativo,

        ativoNovo:
          novo.ativo,
      },
    });

  if (
    auditoriaError
  ) {
    console.error(
      "Erro auditoria cliente:",
      auditoriaError,
    );
  }

  revalidatePath(
    "/admin/clientes",
  );

  revalidatePath(
    `/admin/clientes/${clienteId}`,
  );

  revalidatePath(
    `/admin/clientes/${clienteId}/editar`,
  );

  revalidatePath(
    "/admin/rotas",
  );

  revalidatePath(
    "/mobile/rota",
  );

  return {
    success: true,
    message:
      enderecoAlterado
        ? "Cliente atualizado. O novo endereço será usado apenas em novas rotas."
        : "Cliente atualizado com sucesso.",
  };
}
