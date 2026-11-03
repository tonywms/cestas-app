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

function mensagemAmigavel(
  original:
    string | null | undefined,
) {
  const texto =
    String(
      original ?? "",
    ).toLocaleLowerCase(
      "pt-BR",
    );

  if (
    texto.includes(
      "outro atendimento pendente",
    )
  ) {
    return "Este cliente já possui outro atendimento pendente na sua rota. Abra a rota e conclua esse atendimento antes de adicionar uma cobrança.";
  }

  if (
    texto.includes(
      "sem permissão",
    ) ||
    texto.includes(
      "sem permissao",
    )
  ) {
    return "Seu usuário não possui permissão para adicionar cobranças à rota.";
  }

  if (
    texto.includes(
      "cliente inválido",
    ) ||
    texto.includes(
      "cliente invalido",
    )
  ) {
    return "Este cliente não está mais disponível para cobrança.";
  }

  /* V66_COBRANCA_SEM_SALDO_MENSAGEM */
  if (
    texto.includes(
      "não possui saldo em aberto",
    ) ||
    texto.includes(
      "nao possui saldo em aberto",
    )
  ) {
    return "Este cliente não possui saldo em aberto e não precisa ser adicionado à rota de cobrança.";
  }

  return "Não foi possível adicionar esta cobrança à rota agora. Atualize a carteira e tente novamente.";
}

export async function adicionarCobrancaNaRota(
  formData:
    FormData,
) {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const permitidoRota =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ROTA_MOBILE_GERENCIAR_PROPRIA,
    );

  const permitidoReceber =
    usuario.configuracao
      .permitirPagamentoMobile &&
    (
      usuario.isPlatformAdmin ||
      temPermissao(
        usuario.permissoes,
        PERMISSOES.PAGAMENTO_REGISTRAR,
      )
    );

  if (
    !permitidoRota ||
    !permitidoReceber
  ) {
    redirect(
      `/mobile/rota?erro=${encodeURIComponent(
        "Seu perfil não possui permissão para adicionar cobranças à rota.",
      )}`,
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
    clienteId <=
      0
  ) {
    redirect(
      `/mobile/rota?erro=${encodeURIComponent(
        "Cliente inválido para cobrança.",
      )}`,
    );
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "mobile_adicionar_cobranca_rota_propria",
      {
        p_empresa_id:
          usuario.empresa.id,

        p_cliente_id:
          clienteId,
      },
    );

  if (error) {
    console.error(
      "Erro adicionar cobrança à rota:",
      {
        message:
          error.message,
        code:
          error.code,
        details:
          error.details,
        hint:
          error.hint,
      },
    );

    redirect(
      `/mobile/rota?erro=${encodeURIComponent(
        mensagemAmigavel(
          error.message,
        ),
      )}`,
    );
  }

  const resultado =
    (
      data ??
      {}
    ) as {
      codigo?:
        string;

      sequencia?:
        number;

      ja_existia?:
        boolean;
    };

  [
    "/mobile",
    "/mobile/rota",
    "/mobile/recebimentos",
    "/admin/rotas",
  ].forEach(
    (path) =>
      revalidatePath(
        path,
      ),
  );

  const mensagem =
    resultado.ja_existia
      ? "Esta cobrança já estava na sua rota."
      : `Cobrança adicionada à rota${
          resultado.sequencia
            ? ` como parada nº ${resultado.sequencia}`
            : ""
        }.`;

  redirect(
    `/mobile/rota?ok=${encodeURIComponent(
      mensagem,
    )}`,
  );
}
