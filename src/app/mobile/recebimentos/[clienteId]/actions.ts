"use server";

// V64_RECEBIMENTO_IDEMPOTENTE

import {
  revalidatePath,
} from "next/cache";

import { redirect } from "next/navigation";

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
  recebimentoId: number | null;
  valorRecebido: number | null;
  formaPagamento: string | null;
  saldoAntes: number | null;
  saldoDepois: number | null;
  parcelasAfetadas: number;
  parcelasQuitadas: number;
  parcelasParciais: number;
  proximaVisita: string | null;
  cobrancaRotaConcluida: boolean;
  idempotente: boolean;
};

function estadoVazio(
  message: string,
): ActionState {
  return {
    success: false,
    message,
    recebimentoId: null,
    valorRecebido: null,
    formaPagamento: null,
    saldoAntes: null,
    saldoDepois: null,
    parcelasAfetadas: 0,
    parcelasQuitadas: 0,
    parcelasParciais: 0,
    proximaVisita: null,
    cobrancaRotaConcluida: false,
    idempotente: false,
  };
}

function parseValor(
  value: FormDataEntryValue | null,
) {
  const texto =
    String(
      value ?? "",
    ).trim();

  if (!texto) {
    return NaN;
  }

  const normalizado =
    texto.includes(",")
      ? texto
          .replaceAll(".", "")
          .replace(",", ".")
      : texto;

  return Number(
    normalizado,
  );
}

function mensagemErroAmigavel(
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
      "maior que o saldo total",
    )
  ) {
    return "O valor informado é maior que a dívida atual do cliente. Confira o saldo e informe um valor menor.";
  }

  if (
    texto.includes(
      "não possui saldo em aberto",
    ) ||
    texto.includes(
      "nao possui saldo em aberto",
    )
  ) {
    return "Este cliente não possui mais saldo em aberto para receber.";
  }

  if (
    texto.includes(
      "sessão inválida",
    ) ||
    texto.includes(
      "sessao invalida",
    )
  ) {
    return "Sua sessão expirou. Entre novamente no sistema antes de registrar o recebimento.";
  }

  if (
    texto.includes(
      "sem permissão",
    ) ||
    texto.includes(
      "sem permissao",
    )
  ) {
    return "Seu usuário não possui permissão para registrar recebimentos.";
  }

  if (
    texto.includes(
      "forma de pagamento",
    )
  ) {
    return "Selecione uma forma de pagamento válida.";
  }

  if (
    texto.includes(
      "cliente não encontrado",
    ) ||
    texto.includes(
      "cliente nao encontrado",
    )
  ) {
    return "O cliente não está mais disponível para esta operação. Atualize a lista de recebimentos.";
  }

  return "Não foi possível registrar o recebimento agora. Nenhum valor foi confirmado. Atualize a tela e tente novamente.";
}

export async function registrarRecebimento(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return estadoVazio(
      "Sua sessão expirou. Entre novamente no sistema antes de registrar o recebimento.",
    );
  }

  const autorizado =
    usuario.configuracao
      .permitirPagamentoMobile &&
    (
      usuario.isPlatformAdmin ||
      temPermissao(
        usuario.permissoes,
        PERMISSOES.PAGAMENTO_REGISTRAR,
      )
    );

  if (!autorizado) {
    return estadoVazio(
      "Seu usuário não possui permissão para registrar recebimentos.",
    );
  }

  const clienteId =
    Number(
      formData.get(
        "cliente_id",
      ),
    );

  const rotaClienteIdNumero =
    Number(
      formData.get(
        "rota_cliente_id",
      ) ??
        0,
    );

  const rotaClienteId =
    Number.isInteger(
      rotaClienteIdNumero,
    ) &&
    rotaClienteIdNumero >
      0
      ? rotaClienteIdNumero
      : null;

  const chaveOperacao =
    String(
      formData.get(
        "chave_operacao",
      ) ?? "",
    ).trim();

  const valor =
    parseValor(
      formData.get(
        "valor",
      ),
    );

  const forma =
    String(
      formData.get(
        "forma_pagamento",
      ) ?? "",
    )
      .trim()
      .toUpperCase();

  const observacao =
    String(
      formData.get(
        "observacao",
      ) ?? "",
    ).trim();

  if (
    !Number.isInteger(
      clienteId,
    ) ||
    clienteId <= 0
  ) {
    return estadoVazio(
      "Cliente inválido para recebimento.",
    );
  }

  const chaveOperacaoValida =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      chaveOperacao,
    );

  if (!chaveOperacaoValida) {
    return estadoVazio(
      "A proteção desta operação expirou. Atualize a tela antes de registrar o recebimento.",
    );
  }

  if (
    !Number.isFinite(
      valor,
    ) ||
    valor <= 0
  ) {
    return estadoVazio(
      "Informe quanto o cliente pagou nesta visita.",
    );
  }

  const formas =
    new Set([
      "DINHEIRO",
      "PIX",
      "CARTAO",
      "TRANSFERENCIA",
      "OUTRO",
    ]);

  if (
    !formas.has(
      forma,
    )
  ) {
    return estadoVazio(
      "Selecione uma forma de pagamento válida.",
    );
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "registrar_recebimento_cliente_rota_v64",
    {
      p_empresa_id:
        usuario.empresa.id,

      p_cliente_id:
        clienteId,

      p_valor:
        valor,

      p_forma_pagamento:
        forma,

      p_observacao:
        observacao || null,

      p_rota_cliente_id:
        rotaClienteId,

      p_chave_operacao:
        chaveOperacao,
    },
  );

  if (error) {
    console.error(
      "Erro registrar recebimento do cliente:",
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

    return estadoVazio(
      mensagemErroAmigavel(
        error.message,
      ),
    );
  }

  const resultado =
    data as {
      recebimento_id?: number;
      valor_recebido?: number;
      forma_pagamento?: string;
      saldo_antes?: number;
      saldo_depois?: number;
      alocacoes?: number;
      parcelas_quitadas?: number;
      parcelas_parciais?: number;
      proxima_visita_sugerida?: string | null;
      cobranca_rota_concluida?: boolean;
      idempotente?: boolean;
    };

  revalidatePath(
    "/mobile",
  );

  revalidatePath(
    "/mobile/recebimentos",
  );

  revalidatePath(
    `/mobile/recebimentos/${clienteId}`,
  );

  revalidatePath(
    "/admin/financeiro",
  );

  revalidatePath(
    `/admin/clientes/${clienteId}`,
  );

  revalidatePath(
    "/admin/relatorios/financeiro",
  );

  revalidatePath(
    "/mobile/rota",
  );

  revalidatePath(
    "/admin/rotas",
  );

  return {
    success: true,
    message:
      resultado.idempotente
        ? "Este recebimento já havia sido confirmado. Nenhum valor foi duplicado."
        : resultado.cobranca_rota_concluida
          ? "Recebimento registrado e parada de cobrança concluída na sua rota."
          : "Recebimento registrado. O valor foi distribuído automaticamente nas cobranças mais antigas do cliente.",
    recebimentoId:
      resultado.recebimento_id ??
      null,
    valorRecebido:
      resultado.valor_recebido ??
      valor,
    formaPagamento:
      resultado.forma_pagamento ??
      forma,
    saldoAntes:
      resultado.saldo_antes ??
      null,
    saldoDepois:
      resultado.saldo_depois ??
      null,
    parcelasAfetadas:
      resultado.alocacoes ??
      0,
    parcelasQuitadas:
      resultado.parcelas_quitadas ??
      0,
    parcelasParciais:
      resultado.parcelas_parciais ??
      0,
    proximaVisita:
      resultado.proxima_visita_sugerida ??
      null,
    cobrancaRotaConcluida:
      resultado.cobranca_rota_concluida ??
      false,
    idempotente:
      resultado.idempotente ??
      false,
  };
}

/* V66_COBRANCA_SEM_SALDO */
export async function concluirCobrancaSemSaldo(
  _previousState: {
    success: boolean;
    message: string;
  },
  formData: FormData,
): Promise<{
  success: boolean;
  message: string;
}> {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return {
      success: false,
      message:
        "Sua sessão expirou. Entre novamente antes de concluir a cobrança.",
    };
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
    return {
      success: false,
      message:
        "Seu usuário não possui permissão para concluir esta cobrança.",
    };
  }

  const rotaClienteId =
    Number(
      formData.get(
        "rota_cliente_id",
      ),
    );

  if (
    !Number.isInteger(
      rotaClienteId,
    ) ||
    rotaClienteId <= 0
  ) {
    return {
      success: false,
      message:
        "Parada de cobrança inválida.",
    };
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "mobile_concluir_cobranca_sem_saldo",
    {
      p_empresa_id:
        usuario.empresa.id,
      p_rota_cliente_id:
        rotaClienteId,
    },
  );

  if (error) {
    console.error(
      "Erro ao concluir cobrança sem saldo:",
      error,
    );

    const texto =
      String(
        error.message ?? "",
      ).toLocaleLowerCase(
        "pt-BR",
      );

    return {
      success: false,
      message:
        texto.includes(
          "ainda possui saldo",
        )
          ? "O cliente voltou a possuir saldo em aberto. Atualize a tela e registre o recebimento normalmente."
          : error.message ||
            "Não foi possível concluir a cobrança sem recebimento.",
    };
  }

  const resultado =
    (
      data ??
      {}
    ) as {
      ja_concluida?: boolean;
      pagamento_criado?: boolean;
    };

  if (
    resultado.pagamento_criado ===
    true
  ) {
    return {
      success: false,
      message:
        "A operação foi interrompida porque não deveria criar pagamento neste fluxo.",
    };
  }

  [
    "/mobile",
    "/mobile/rota",
    "/mobile/recebimentos",
    "/admin/rotas",
    "/admin/financeiro",
  ].forEach(
    (path) =>
      revalidatePath(
        path,
      ),
  );

  redirect(
    `/mobile/rota?ok=${encodeURIComponent(
      resultado.ja_concluida
        ? "Esta cobrança já estava concluída."
        : "Cobrança concluída sem recebimento: o saldo já estava quitado.",
    )}`,
  );
}
