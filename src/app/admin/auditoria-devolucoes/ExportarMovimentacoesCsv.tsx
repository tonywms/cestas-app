"use client";

import { FileDown } from "lucide-react";

// V131: exportacao local e somente leitura dos movimentos ja consultados
// com autorizacao no servidor. Nao requisita outros registros ao banco.
export type MovimentoExportacao = {
  cargaNumero: number;
  codigoCarga: string;
  statusCarga: string;
  movimentoNumero: number;
  dataMovimento: string;
  tipoCestaNumero: number;
  tipoCesta: string;
  natureza: string;
  quantidade: number;
  observacao: string;
};

type Props = { registros: MovimentoExportacao[] };

const colunas: Array<[string, keyof MovimentoExportacao]> = [
  ["Carga nº", "cargaNumero"],
  ["Código da carga", "codigoCarga"],
  ["Situação da carga", "statusCarga"],
  ["Movimentação nº", "movimentoNumero"],
  ["Data/hora da movimentação", "dataMovimento"],
  ["Tipo de cesta nº", "tipoCestaNumero"],
  ["Tipo de cesta", "tipoCesta"],
  ["Operação", "natureza"],
  ["Quantidade", "quantidade"],
  ["Observação / justificativa", "observacao"],
];

// Excel pode interpretar strings iniciadas em =,+,-,@ como formulas.
// Neutraliza esses prefixos inclusive apos espacos/controles, sem
// interferir nos valores numericos tipados do banco.
function celula(valor: string | number) {
  const numerico = typeof valor === "number";
  let texto = String(valor).replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
  if (!numerico && /^[=+\-@]/.test(texto)) texto = "'" + texto;
  return '"' + texto.replace(/"/g, '""') + '"';
}

export default function ExportarMovimentacoesCsv({ registros }: Props) {
  function exportar() {
    if (registros.length === 0) return;

    const linhas = [
      colunas.map(([titulo]) => celula(titulo)).join(";"),
      ...registros.map((registro) =>
        colunas.map(([, chave]) => celula(registro[chave])).join(";"),
      ),
    ];
    const arquivo = new Blob(["\uFEFF" + linhas.join("\r\n") + "\r\n"], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    link.href = url;
    link.download = "movimentacoes-devolucoes-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <button
      type="button"
      onClick={exportar}
      disabled={registros.length === 0}
      title="Exporta somente os movimentos das cargas atualmente filtradas"
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#b8d1c0] bg-white px-4 text-xs font-black text-[#176f3c] transition hover:bg-[#f0f8f2] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <FileDown size={16} />
      Movimentações CSV ({registros.length})
    </button>
  );
}
