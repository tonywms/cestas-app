import * as XLSX from "@e965/xlsx";

export type ClientePlanilha = {
  linha: number;
  codigo: string;
  nome: string;
  cpf_cnpj: string;
  telefone: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  ativo: boolean;
  ativoOriginal: string;
};

function semAcento(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizarCabecalho(valor: string) {
  return semAcento(valor)
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

const aliases: Record<string, string[]> = {
  codigo: [
    "codigo",
    "codigoerp",
    "codigoreferencia",
    "codigocliente",
    "codcliente",
    "codcli",
  ],
  nome: [
    "nome",
    "cliente",
    "nomecliente",
    "razaosocial",
  ],
  cpf_cnpj: [
    "cpfcnpj",
    "cpf",
    "cnpj",
    "documento",
  ],
  telefone: [
    "telefone",
    "celular",
    "fone",
    "whatsapp",
  ],
  logradouro: [
    "logradouro",
    "endereco",
    "rua",
    "avenida",
  ],
  numero: ["numero", "num"],
  complemento: ["complemento", "compl"],
  bairro: ["bairro"],
  cidade: ["cidade", "municipio"],
  uf: ["uf", "estado"],
  cep: ["cep"],
  ativo: ["ativo", "status", "situacao"],
};

function encontrarColuna(
  cabecalhos: Map<string, number>,
  campo: keyof typeof aliases,
) {
  for (const alias of aliases[campo]) {
    const coluna = cabecalhos.get(alias);
    if (coluna !== undefined) return coluna;
  }

  return null;
}

function textoCelula(
  linhas: unknown[][],
  linha: number,
  coluna: number | null,
) {
  if (coluna === null) return "";

  const valor = linhas[linha]?.[coluna];

  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor).trim();
}

function parseAtivo(valor: string) {
  const texto = semAcento(valor)
    .toLocaleUpperCase("pt-BR")
    .trim();

  if (!texto) {
    return {
      valido: true,
      valor: true,
    };
  }

  if (["SIM", "S", "TRUE", "1", "ATIVO"].includes(texto)) {
    return {
      valido: true,
      valor: true,
    };
  }

  if (["NAO", "N", "FALSE", "0", "INATIVO"].includes(texto)) {
    return {
      valido: true,
      valor: false,
    };
  }

  return {
    valido: false,
    valor: true,
  };
}

export async function lerPlanilhaClientes(
  arrayBuffer: ArrayBuffer,
) {
  let workbook: XLSX.WorkBook;

  try {
    workbook = XLSX.read(arrayBuffer, {
      type: "array",
      raw: false,
      cellDates: false,
    });
  } catch {
    throw new Error(
      "Não foi possível abrir o arquivo Excel. Baixe o modelo oficial e salve no formato .xlsx.",
    );
  }

  const nomeAba =
    workbook.SheetNames.find(
      (nome) => nome.toLocaleUpperCase("pt-BR") === "CLIENTES",
    ) ?? workbook.SheetNames[0];

  if (!nomeAba) {
    throw new Error(
      "A planilha não possui nenhuma aba para importar.",
    );
  }

  const worksheet = workbook.Sheets[nomeAba];

  if (!worksheet) {
    throw new Error(
      "Não foi possível localizar a aba de clientes na planilha.",
    );
  }

  const linhas = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });

  if (linhas.length > 5001) {
    throw new Error(
      "A planilha ultrapassa o limite de 5.000 clientes por importação. Divida o arquivo em partes menores.",
    );
  }

  if (linhas.length === 0) {
    throw new Error(
      "A planilha está vazia. Preencha a aba CLIENTES antes de importar.",
    );
  }

  const cabecalhos = new Map<string, number>();
  const primeiraLinha = linhas[0] ?? [];

  primeiraLinha.forEach((valor, coluna) => {
    const normalizado = normalizarCabecalho(
      String(valor ?? ""),
    );

    if (normalizado) {
      cabecalhos.set(normalizado, coluna);
    }
  });

  const colunas = {
    codigo: encontrarColuna(cabecalhos, "codigo"),
    nome: encontrarColuna(cabecalhos, "nome"),
    cpf_cnpj: encontrarColuna(cabecalhos, "cpf_cnpj"),
    telefone: encontrarColuna(cabecalhos, "telefone"),
    logradouro: encontrarColuna(cabecalhos, "logradouro"),
    numero: encontrarColuna(cabecalhos, "numero"),
    complemento: encontrarColuna(cabecalhos, "complemento"),
    bairro: encontrarColuna(cabecalhos, "bairro"),
    cidade: encontrarColuna(cabecalhos, "cidade"),
    uf: encontrarColuna(cabecalhos, "uf"),
    cep: encontrarColuna(cabecalhos, "cep"),
    ativo: encontrarColuna(cabecalhos, "ativo"),
  };

  const colunasObrigatorias = [
    ["NOME", colunas.nome],
    ["TELEFONE", colunas.telefone],
    ["ENDERECO", colunas.logradouro],
    ["NUMERO", colunas.numero],
    ["BAIRRO", colunas.bairro],
  ] as const;

  const colunasAusentes = colunasObrigatorias
    .filter(([, coluna]) => coluna === null)
    .map(([nome]) => nome);

  if (colunasAusentes.length > 0) {
    throw new Error(
      `Faltam colunas obrigatórias na planilha: ${colunasAusentes.join(", ")}. Use o modelo oficial do Cestas APP.`,
    );
  }

  const clientes: ClientePlanilha[] = [];
  const errosEstruturais: Array<{
    linha: number;
    mensagem: string;
  }> = [];

  for (
    let indiceLinha = 1;
    indiceLinha < linhas.length;
    indiceLinha += 1
  ) {
    const numeroLinhaExcel = indiceLinha + 1;

    const nome = textoCelula(
      linhas,
      indiceLinha,
      colunas.nome,
    );

    const codigo = textoCelula(
      linhas,
      indiceLinha,
      colunas.codigo,
    ).toLocaleUpperCase("pt-BR");

    const cpfCnpj = textoCelula(
      linhas,
      indiceLinha,
      colunas.cpf_cnpj,
    );

    const telefone = textoCelula(
      linhas,
      indiceLinha,
      colunas.telefone,
    );

    const logradouro = textoCelula(
      linhas,
      indiceLinha,
      colunas.logradouro,
    );

    const numero = textoCelula(
      linhas,
      indiceLinha,
      colunas.numero,
    );

    const complemento = textoCelula(
      linhas,
      indiceLinha,
      colunas.complemento,
    );

    const bairro = textoCelula(
      linhas,
      indiceLinha,
      colunas.bairro,
    );

    const cidade = textoCelula(
      linhas,
      indiceLinha,
      colunas.cidade,
    );

    const uf = textoCelula(
      linhas,
      indiceLinha,
      colunas.uf,
    ).toLocaleUpperCase("pt-BR");

    const cep = textoCelula(
      linhas,
      indiceLinha,
      colunas.cep,
    );

    const ativoOriginal = textoCelula(
      linhas,
      indiceLinha,
      colunas.ativo,
    );

    const linhaVazia = [
      nome,
      codigo,
      cpfCnpj,
      telefone,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      cep,
      ativoOriginal,
    ].every((valor) => !valor);

    if (linhaVazia) continue;

    const ativo = parseAtivo(ativoOriginal);

    if (!ativo.valido) {
      errosEstruturais.push({
        linha: numeroLinhaExcel,
        mensagem:
          "ATIVO deve ser SIM ou NAO.",
      });
    }

    clientes.push({
      linha: numeroLinhaExcel,
      codigo,
      nome,
      cpf_cnpj: cpfCnpj,
      telefone,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      cep,
      ativo: ativo.valor,
      ativoOriginal,
    });
  }

  return {
    clientes,
    errosEstruturais,
    aba: nomeAba,
  };
}

export function normalizarDocumento(valor: string) {
  return valor.replace(/\D/g, "");
}
