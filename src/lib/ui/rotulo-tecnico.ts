const ROTULOS_FIXOS: Record<string, string> = {
  LIBERADO: "Liberado",
  ALERTA: "Alerta",
  BLOQUEADO: "Bloqueado",
  LIBERADO_EXCECAO: "Liberado por exceção",
  APROVADO: "Aprovado",
  CRITICO: "Crítico",
  ATENCAO: "Atenção",
  INFO: "Informativo",
  LEGADO: "Legado",
  EM_ROTA: "Em rota",
  EM_CARGA: "Em carga",
  AGUARDANDO_ENTREGA: "Aguardando entrega",
  AGUARDANDO_VENDA: "Aguardando venda",
  EM_ATENDIMENTO: "Em atendimento",
  BIPAGEM_PENDENTE: "Bipagem pendente",
  COM_DIVERGENCIA: "Com divergência",
  SALDO_ABERTO: "Saldo em aberto",
  PROXIMOS_7: "Próximos 7 dias",
  CLIENTE_AUSENTE: "Cliente ausente",
  ENDERECO_INCORRETO: "Endereço incorreto",
  DADOS_INVALIDOS: "Dados inválidos",
  SEM_ALTERACAO: "Sem alteração",
  SEM_PREVISAO: "Sem previsão",
  CARGA_FINALIZADA: "Carga finalizada",
  CARGA_CANCELADA: "Carga cancelada",
  CREDITO_LIBERADO_EXCECAO: "Crédito liberado por exceção",
  FECHAMENTO_ENTREGADOR_CONFERIDO: "Fechamento conferido",
  FECHAMENTO_ENTREGADOR_REABERTO: "Fechamento reaberto",
  CONTRATO_BLOQUEADO_POR_CREDITO: "Contrato bloqueado por crédito",
  CONTRATO_CRIADO_COM_EXCECAO_CREDITO: "Contrato criado com exceção de crédito",
};

const PALAVRAS: Record<string, string> = {
  ACAO: "ação",
  ACOES: "ações",
  ATENCAO: "atenção",
  ATUALIZACAO: "atualização",
  AVARIA: "avaria",
  BLOQUEIO: "bloqueio",
  CARGA: "carga",
  CENTRAL: "central",
  CLIENTE: "cliente",
  COBERTURA: "cobertura",
  CREDITO: "crédito",
  DIVERGENCIA: "divergência",
  ENDERECO: "endereço",
  ENTRADA: "entrada",
  ENTREGA: "entrega",
  ENTREGUE: "entregue",
  ESTOQUE: "estoque",
  EXCECAO: "exceção",
  EXCECOES: "exceções",
  EXPIRADA: "expirada",
  FINALIZADA: "finalizada",
  INVALIDA: "inválida",
  INVALIDO: "inválido",
  MOVIMENTO: "movimento",
  OPERACAO: "operação",
  PAGAMENTO: "pagamento",
  PARCELA: "parcela",
  POLITICA: "política",
  RECEBIMENTO: "recebimento",
  RETORNO: "retorno",
  SAIDA: "saída",
  SITUACAO: "situação",
  TOLERANCIA: "tolerância",
  USUARIO: "usuário",
  USUARIOS: "usuários",
  VALIDADE: "validade",
  VENCIMENTO: "vencimento",
  VOLUME: "volume",
  VOLUMES: "volumes",
};

const CATEGORIAS_DIAGNOSTICO: Record<string, string> = {
  POLITICA_ALERTA_INVALIDA: "Política de alerta",
  POLITICA_BLOQUEIO_INVALIDA: "Política de bloqueio",
  POLITICA_TOLERANCIA_INVALIDA: "Política de tolerância",
  POLITICA_VALIDADE_INVALIDA: "Política de exceção",
  PARCELA_VALOR_PAGO_INVALIDO: "Consistência da parcela",
  PARCELA_PAGA_COM_SALDO: "Consistência da parcela",
  PARCELA_ABERTA_SEM_SALDO: "Consistência da parcela",
  EXCECOES_ATIVAS_DUPLICADAS: "Exceções de crédito",
  EXCECAO_ATIVA_EXPIRADA: "Exceção de crédito",
  EXCECAO_COM_POLITICA_DESATIVADA: "Exceção de crédito",
  EXCECAO_SEM_BLOQUEIO_ATUAL: "Exceção de crédito",
  SALDO_NEGATIVO: "Saldo de carga",
  CARGA_ENCERRADA_COM_SALDO: "Fechamento de carga",
  ENTREGA_DIVERGENTE: "Reconciliação de entrega",
  VOLUME_ATIVO_INCOMPLETO: "Cobertura de volumes",
  VOLUME_EM_CARGA_DIVERGENTE: "Reconciliação de volumes",
  VOLUME_ENTREGUE_DIVERGENTE: "Reconciliação de volumes",
  VOLUME_RETORNO_DIVERGENTE: "Reconciliação de retorno",
  VOLUME_AVARIA_DIVERGENTE: "Reconciliação de avaria",
  VOLUME_CANCELADO_DIVERGENTE: "Reconciliação de cancelamento",
  COBERTURA_VOLUME_PARCIAL: "Rastreabilidade histórica",
  SALDO_CENTRAL_NEGATIVO: "Estoque central",
};

export function rotuloTecnico(valor: string | null | undefined): string {
  const bruto = String(valor ?? "").trim();
  if (!bruto) return "—";
  if (ROTULOS_FIXOS[bruto]) return ROTULOS_FIXOS[bruto];

  // Datas, códigos de domínio e textos já humanizados não devem ser alterados.
  if (!bruto.includes("_") && bruto !== bruto.toUpperCase()) return bruto;
  if (/^\d{4}-\d{2}-\d{2}$/.test(bruto)) return bruto;

  const tokens = bruto.split("_").filter(Boolean);
  const palavras = tokens.map((token) => PALAVRAS[token] ?? token.toLowerCase());
  const frase = palavras.join(" ");
  return frase.charAt(0).toUpperCase() + frase.slice(1);
}

export function rotuloSeveridade(valor: string | null | undefined): string {
  const bruto = String(valor ?? "").trim();
  if (bruto === "CRITICO") return "Crítico";
  if (bruto === "ATENCAO") return "Atenção";
  if (bruto === "INFO") return "Informativo";
  if (bruto === "LEGADO") return "Legado";
  return rotuloTecnico(bruto);
}

export function categoriaDiagnostico(codigo: string | null | undefined): string {
  const bruto = String(codigo ?? "").trim();
  return CATEGORIAS_DIAGNOSTICO[bruto] ?? "Diagnóstico operacional";
}
