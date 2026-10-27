"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  getCurrentUserProfile,
} from "@/lib/auth/get-current-user";

import {
  avaliarCredito,
  dataLimiteAtraso,
  POLITICA_CREDITO_PADRAO,
  type PoliticaCredito,
} from "@/lib/credito/avaliar-credito";

import {
  createClient,
} from "@/lib/supabase/server";

type ActionState = {
  success: boolean;
  message: string;
  contratoId: number | null;
  codigo: string | null;
};

function parseValor(
  value:
    FormDataEntryValue | null,
) {
  const texto =
    String(
      value ??
      "",
    ).trim();

  if (!texto) {
    return NaN;
  }

  const normalizado =
    texto.includes(",")
      ? texto
          .replaceAll(
            ".",
            "",
          )
          .replace(
            ",",
            ".",
          )
      : texto;

  return Number(
    normalizado,
  );
}

function hojeFortaleza() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Fortaleza",

      year:
        "numeric",

      month:
        "2-digit",

      day:
        "2-digit",
    },
  ).format(
    new Date(),
  );
}

async function registrarAuditoria({
  empresaId,
  usuarioId,
  clienteId,
  acao,
  dados,
}: {
  empresaId:
    string;

  usuarioId:
    string;

  clienteId:
    number;

  acao:
    string;

  dados:
    Record<string, unknown>;
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

      entidade:
        "CLIENTE",

      entidade_id:
        String(
          clienteId,
        ),

      acao,

      dados,
    });

  if (error) {
    console.error(
      "Erro auditoria contrato:",
      error,
    );
  }
}

export async function criarContrato(
  _previousState:
    ActionState,
  formData:
    FormData,
): Promise<ActionState> {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return {
      success:
        false,

      message:
        "Sessão inválida. Entre novamente no sistema.",

      contratoId:
        null,

      codigo:
        null,
    };
  }

  const autorizado =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo ===
      "ADMINISTRADOR" ||
    usuario.perfilCodigo ===
      "GESTOR";

  if (!autorizado) {
    return {
      success:
        false,

      message:
        "Você não possui permissão para criar contratos.",

      contratoId:
        null,

      codigo:
        null,
    };
  }

  const clienteId =
    Number(
      formData.get(
        "cliente_id",
      ),
    );

  const valorTotal =
    parseValor(
      formData.get(
        "valor_total",
      ),
    );

  const quantidadeParcelas =
    Number(
      formData.get(
        "quantidade_parcelas",
      ),
    );

  const primeiroVencimento =
    String(
      formData.get(
        "primeiro_vencimento",
      ) ??
      "",
    ).trim();

  const observacao =
    String(
      formData.get(
        "observacao",
      ) ??
      "",
    ).trim();

  if (
    !Number.isInteger(
      clienteId,
    ) ||
    clienteId <=
      0
  ) {
    return {
      success:
        false,

      message:
        "Selecione o cliente.",

      contratoId:
        null,

      codigo:
        null,
    };
  }

  if (
    !Number.isFinite(
      valorTotal,
    ) ||
    valorTotal <=
      0
  ) {
    return {
      success:
        false,

      message:
        "Informe um valor total válido.",

      contratoId:
        null,

      codigo:
        null,
    };
  }

  if (
    !Number.isInteger(
      quantidadeParcelas,
    ) ||
    quantidadeParcelas <
      1 ||
    quantidadeParcelas >
      120
  ) {
    return {
      success:
        false,

      message:
        "Quantidade de parcelas inválida.",

      contratoId:
        null,

      codigo:
        null,
    };
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      primeiroVencimento,
    )
  ) {
    return {
      success:
        false,

      message:
        "Informe o primeiro vencimento.",

      contratoId:
        null,

      codigo:
        null,
    };
  }

  const supabase =
    await createClient();

  /* =======================================================
     VERIFICA CLIENTE + POLÍTICA + ATRASOS + EXCEÇÃO
  ======================================================= */

  const agora =
    new Date();

  const [
    clienteResult,
    configResult,
    parcelasResult,
    liberacaoResult,
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
        .eq(
          "ativo",
          true,
        )
        .maybeSingle(),

      supabase
        .from(
          "empresa_configuracoes",
        )
        .select(`
          credito_alerta_qtd_atrasos,
          credito_bloqueio_qtd_atrasos,
          credito_dias_tolerancia,
          credito_permitir_excecao,
          credito_validade_excecao_dias
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .maybeSingle(),

      supabase
        .from(
          "parcelas",
        )
        .select(`
          id,
          vencimento,
          status
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "cliente_id",
          clienteId,
        )
        .in(
          "status",
          [
            "ABERTA",
            "PARCIAL",
          ],
        ),

      supabase
        .from(
          "credito_liberacoes",
        )
        .select(`
          id,
          motivo,
          valido_ate
        `)
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
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        )
        .limit(
          1,
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

      contratoId:
        null,

      codigo:
        null,
    };
  }

  if (
    parcelasResult.error
  ) {
    console.error(
      "Erro verificando parcelas do crédito:",
      parcelasResult.error,
    );

    return {
      success:
        false,

      message:
        "Não foi possível validar a situação de crédito do cliente.",

      contratoId:
        null,

      codigo:
        null,
    };
  }

  const config =
    configResult.data;

  const politica:
    PoliticaCredito = {
      alertaQtdAtrasos:
        config
          ?.credito_alerta_qtd_atrasos ??
        POLITICA_CREDITO_PADRAO
          .alertaQtdAtrasos,

      bloqueioQtdAtrasos:
        config
          ?.credito_bloqueio_qtd_atrasos ??
        POLITICA_CREDITO_PADRAO
          .bloqueioQtdAtrasos,

      diasTolerancia:
        config
          ?.credito_dias_tolerancia ??
        POLITICA_CREDITO_PADRAO
          .diasTolerancia,

      permitirExcecao:
        config
          ?.credito_permitir_excecao ??
        POLITICA_CREDITO_PADRAO
          .permitirExcecao,

      validadeExcecaoDias:
        config
          ?.credito_validade_excecao_dias ??
        POLITICA_CREDITO_PADRAO
          .validadeExcecaoDias,
    };

  const limiteAtraso =
    dataLimiteAtraso(
      hojeFortaleza(),
      politica.diasTolerancia,
    );

  const qtdAtrasos =
    (
      parcelasResult.data ??
      []
    ).filter(
      (
        parcela,
      ) =>
        parcela.vencimento <
        limiteAtraso,
    ).length;

  const liberacao =
    liberacaoResult.data
      ? {
          id:
            liberacaoResult.data
              .id,

          motivo:
            liberacaoResult.data
              .motivo,

          validoAte:
            liberacaoResult.data
              .valido_ate,
        }
      : null;

  const avaliacao =
    avaliarCredito({
      qtdAtrasos,

      politica,

      liberacaoAtiva:
        liberacao,

      agora,
    });

  if (
    avaliacao.bloqueado
  ) {
    await registrarAuditoria({
      empresaId:
        usuario.empresa.id,

      usuarioId:
        usuario.id,

      clienteId,

      acao:
        "CONTRATO_BLOQUEADO_POR_CREDITO",

      dados: {
        cliente:
          clienteResult.data
            .nome,

        quantidadeAtrasos:
          qtdAtrasos,

        valorTentativa:
          valorTotal,

        parcelasTentativa:
          quantidadeParcelas,
      },
    });

    return {
      success:
        false,

      message:
        `Crédito bloqueado: ${qtdAtrasos} parcela(s) vencida(s). É necessária uma liberação excepcional em Gestão de Crédito.`,

      contratoId:
        null,

      codigo:
        null,
    };
  }

  /* =======================================================
     CRIA CONTRATO
  ======================================================= */

  const {
    data,
    error,
  } = await supabase.rpc(
    "criar_contrato_parcelado",
    {
      p_empresa_id:
        usuario.empresa.id,

      p_cliente_id:
        clienteId,

      p_valor_total:
        valorTotal,

      p_quantidade_parcelas:
        quantidadeParcelas,

      p_primeiro_vencimento:
        primeiroVencimento,

      p_observacao:
        observacao ||
        null,
    },
  );

  if (error) {
    console.error(
      "Erro criar contrato:",
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

    return {
      success:
        false,

      message:
        error.message ||
        "Não foi possível criar o contrato.",

      contratoId:
        null,

      codigo:
        null,
    };
  }

  const resultado =
    data as {
      contrato_id?:
        number;

      codigo?:
        string;

      valor_total?:
        number;

      quantidade_parcelas?:
        number;
    };

  if (
    avaliacao
      .liberadoPorExcecao
  ) {
    await registrarAuditoria({
      empresaId:
        usuario.empresa.id,

      usuarioId:
        usuario.id,

      clienteId,

      acao:
        "CONTRATO_CRIADO_COM_EXCECAO_CREDITO",

      dados: {
        contratoId:
          resultado.contrato_id ??
          null,

        codigo:
          resultado.codigo ??
          null,

        valor:
          valorTotal,

        quantidadeParcelas,

        quantidadeAtrasos:
          qtdAtrasos,

        liberacaoId:
          liberacao?.id ??
          null,
      },
    });
  }

  revalidatePath(
    "/admin/financeiro",
  );

  revalidatePath(
    "/admin/credito",
  );

  revalidatePath(
    "/mobile/recebimentos",
  );

  return {
    success:
      true,

    message:
      `Contrato ${resultado.codigo ?? ""} criado com ${quantidadeParcelas} parcela(s).`,

    contratoId:
      resultado.contrato_id ??
      null,

    codigo:
      resultado.codigo ??
      null,
  };
}
