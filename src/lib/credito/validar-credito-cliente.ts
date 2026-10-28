import {
  avaliarCredito,
  dataLimiteAtraso,
  POLITICA_CREDITO_PADRAO,
  type AvaliacaoCredito,
  type PoliticaCredito,
} from "@/lib/credito/avaliar-credito";

import {
  createClient,
} from "@/lib/supabase/server";

export type ValidacaoCreditoCliente = {
  ok: boolean;
  erro: string | null;
  clienteId: number;
  clienteNome: string;
  qtdAtrasos: number;
  valorVencido: number;
  politica: PoliticaCredito;
  avaliacao: AvaliacaoCredito;
  liberacao: {
    id: number;
    motivo: string;
    validoAte: string;
  } | null;
};

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

function resultadoErro({
  clienteId,
  erro,
}: {
  clienteId: number;
  erro: string;
}): ValidacaoCreditoCliente {
  return {
    ok: false,
    erro,
    clienteId,
    clienteNome:
      "Cliente",
    qtdAtrasos:
      0,
    valorVencido:
      0,
    politica:
      POLITICA_CREDITO_PADRAO,
    avaliacao:
      avaliarCredito({
        qtdAtrasos:
          0,
        politica:
          POLITICA_CREDITO_PADRAO,
        liberacaoAtiva:
          null,
      }),
    liberacao:
      null,
  };
}

export async function validarCreditoCliente({
  empresaId,
  clienteId,
  agora = new Date(),
}: {
  empresaId: string;
  clienteId: number;
  agora?: Date;
}): Promise<ValidacaoCreditoCliente> {
  if (
    !Number.isInteger(
      clienteId,
    ) ||
    clienteId <= 0
  ) {
    return resultadoErro({
      clienteId,
      erro:
        "Cliente inválido.",
    });
  }

  const supabase =
    await createClient();

  const [
    clienteResult,
    configResult,
    parcelasResult,
    liberacaoResult,
  ] =
    await Promise.all([
      supabase
        .from("clientes")
        .select(`
          id,
          nome,
          ativo
        `)
        .eq(
          "empresa_id",
          empresaId,
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
          credito_alerta_qtd_atrasos,
          credito_bloqueio_qtd_atrasos,
          credito_dias_tolerancia,
          credito_permitir_excecao,
          credito_validade_excecao_dias
        `)
        .eq(
          "empresa_id",
          empresaId,
        )
        .maybeSingle(),

      supabase
        .from("parcelas")
        .select(`
          id,
          vencimento,
          valor,
          valor_pago,
          status
        `)
        .eq(
          "empresa_id",
          empresaId,
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
          valido_ate,
          status,
          created_at
        `)
        .eq(
          "empresa_id",
          empresaId,
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
        .limit(1)
        .maybeSingle(),
    ]);

  if (
    clienteResult.error ||
    !clienteResult.data
  ) {
    return resultadoErro({
      clienteId,
      erro:
        "Cliente não encontrado nesta empresa.",
    });
  }

  if (
    !clienteResult.data.ativo
  ) {
    return resultadoErro({
      clienteId,
      erro:
        "Cliente inativo. A entrega não pode ser registrada.",
    });
  }

  if (
    parcelasResult.error
  ) {
    console.error(
      "Erro ao validar parcelas do cliente:",
      parcelasResult.error,
    );

    return resultadoErro({
      clienteId,
      erro:
        "Não foi possível validar o crédito do cliente.",
    });
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

  const parcelasVencidas =
    (
      parcelasResult.data ??
      []
    ).filter(
      (parcela) =>
        String(
          parcela.vencimento,
        ) <
          limiteAtraso &&
        Math.max(
          0,
          Number(
            parcela.valor ??
              0,
          ) -
            Number(
              parcela.valor_pago ??
                0,
            ),
        ) >
          0,
    );

  const valorVencido =
    parcelasVencidas.reduce(
      (
        total,
        parcela,
      ) =>
        total +
        Math.max(
          0,
          Number(
            parcela.valor ??
              0,
          ) -
            Number(
              parcela.valor_pago ??
                0,
            ),
        ),
      0,
    );

  const liberacao =
    liberacaoResult.data
      ? {
          id:
            Number(
              liberacaoResult.data.id,
            ),
          motivo:
            String(
              liberacaoResult.data.motivo,
            ),
          validoAte:
            String(
              liberacaoResult.data
                .valido_ate,
            ),
        }
      : null;

  const avaliacao =
    avaliarCredito({
      qtdAtrasos:
        parcelasVencidas.length,
      politica,
      liberacaoAtiva:
        liberacao,
      agora,
    });

  return {
    ok: true,
    erro:
      null,
    clienteId,
    clienteNome:
      String(
        clienteResult.data.nome,
      ),
    qtdAtrasos:
      parcelasVencidas.length,
    valorVencido,
    politica,
    avaliacao,
    liberacao,
  };
}

export function mensagemBloqueioEntrega(
  validacao:
    ValidacaoCreditoCliente,
) {
  return (
    `ENTREGA BLOQUEADA POR CRÉDITO. ` +
    `${validacao.clienteNome} possui ` +
    `${validacao.qtdAtrasos} parcela(s) vencida(s), ` +
    `atingindo o limite de bloqueio da empresa ` +
    `(${validacao.politica.bloqueioQtdAtrasos}). ` +
    `Regularize o financeiro ou solicite uma liberação excepcional em Gestão de Crédito.`
  );
}
