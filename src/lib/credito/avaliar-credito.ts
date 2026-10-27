export type CreditoStatusBase =
  | "LIBERADO"
  | "ALERTA"
  | "BLOQUEADO";

export type CreditoStatusEfetivo =
  | CreditoStatusBase
  | "LIBERADO_EXCECAO";

export type PoliticaCredito = {
  alertaQtdAtrasos: number;
  bloqueioQtdAtrasos: number;
  diasTolerancia: number;
  permitirExcecao: boolean;
  validadeExcecaoDias: number;
};

export type LiberacaoCreditoResumo = {
  id: number;
  motivo: string;
  validoAte: string;
} | null;

export type AvaliacaoCredito = {
  statusBase: CreditoStatusBase;
  statusEfetivo: CreditoStatusEfetivo;
  bloqueado: boolean;
  liberadoPorExcecao: boolean;
  qtdAtrasos: number;
};

export const POLITICA_CREDITO_PADRAO: PoliticaCredito = {
  alertaQtdAtrasos: 1,
  bloqueioQtdAtrasos: 2,
  diasTolerancia: 0,
  permitirExcecao: true,
  validadeExcecaoDias: 7,
};

/**
 * Retorna a data-limite usada para considerar uma parcela atrasada.
 *
 * Exemplo:
 * hoje = 2026-10-27
 * tolerância = 3 dias
 *
 * vencimentos anteriores a 2026-10-24 contam como atraso.
 */
export function dataLimiteAtraso(
  hoje: string,
  diasTolerancia: number,
) {
  const [
    ano,
    mes,
    dia,
  ] = hoje
    .split("-")
    .map(Number);

  if (
    !ano ||
    !mes ||
    !dia
  ) {
    return hoje;
  }

  const data =
    new Date(
      Date.UTC(
        ano,
        mes - 1,
        dia,
      ),
    );

  data.setUTCDate(
    data.getUTCDate() -
      Math.max(
        0,
        diasTolerancia,
      ),
  );

  return data
    .toISOString()
    .slice(0, 10);
}

export function liberacaoCreditoValida(
  liberacao: LiberacaoCreditoResumo,
  agora = new Date(),
) {
  if (!liberacao) {
    return false;
  }

  const validade =
    new Date(
      liberacao.validoAte,
    );

  return (
    !Number.isNaN(
      validade.getTime(),
    ) &&
    validade.getTime() >
      agora.getTime()
  );
}

export function avaliarCredito({
  qtdAtrasos,
  politica,
  liberacaoAtiva,
  agora = new Date(),
}: {
  qtdAtrasos: number;
  politica: PoliticaCredito;
  liberacaoAtiva: LiberacaoCreditoResumo;
  agora?: Date;
}): AvaliacaoCredito {
  let statusBase:
    CreditoStatusBase =
      "LIBERADO";

  if (
    qtdAtrasos >=
    politica.bloqueioQtdAtrasos
  ) {
    statusBase =
      "BLOQUEADO";
  } else if (
    qtdAtrasos >=
    politica.alertaQtdAtrasos
  ) {
    statusBase =
      "ALERTA";
  }

  const excecaoValida =
    politica.permitirExcecao &&
    statusBase ===
      "BLOQUEADO" &&
    liberacaoCreditoValida(
      liberacaoAtiva,
      agora,
    );

  return {
    statusBase,

    statusEfetivo:
      excecaoValida
        ? "LIBERADO_EXCECAO"
        : statusBase,

    bloqueado:
      statusBase ===
        "BLOQUEADO" &&
      !excecaoValida,

    liberadoPorExcecao:
      excecaoValida,

    qtdAtrasos,
  };
}
