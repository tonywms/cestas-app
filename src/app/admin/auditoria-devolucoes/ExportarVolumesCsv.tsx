"use client";

import { ScanBarcode } from "lucide-react";

// V132: exporta apenas volumes ja lidos pela pagina autenticada,
// sem requisicoes adicionais. Na modalidade QUANTIDADE, nao exibir.
export type VolumeExportacao = {
  cargaNumero: number;
  codigoCarga: string;
  situacaoCarga: string;
  dataFechamento: string;
  tipoNumero: number;
  tipoCesta: string;
  codigoVolume: string;
  statusVolume: string;
  destinoOperacional: string;
};

const colunas: Array<[string, keyof VolumeExportacao]> = [
  ["Carga nº", "cargaNumero"],
  ["Código da carga", "codigoCarga"],
  ["Situação da carga", "situacaoCarga"],
  ["Finalizada em", "dataFechamento"],
  ["Tipo de cesta nº", "tipoNumero"],
  ["Tipo de cesta", "tipoCesta"],
  ["Código do volume", "codigoVolume"],
  ["Status físico", "statusVolume"],
  ["Situação operacional", "destinoOperacional"],
];

function destino(status: string): string {
  switch (status) {
    case "EM_CARGA": return "Em posse do entregador";
    case "RETORNADO": return "Retorno normal ao CD";
    case "AVARIADO": return "Baixa por avaria";
    case "ENTREGUE": return "Entregue";
    case "DISPONIVEL": return "Disponível no estoque";
    default: return "Verificar status";
  }
}

export function prepararVolumeExportacao(
  linha: Omit<VolumeExportacao, "destinoOperacional">,
): VolumeExportacao {
  return { ...linha, destinoOperacional: destino(linha.statusVolume) };
}

// Proteção contra formulas maliciosas abertas no Excel/LibreOffice.
// Sanitiza texto e usa ; como separador do Excel pt-BR.
function celula(valor: string | number): string {
  const numerico = typeof valor === "number";
  let texto = String(valor).replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
  if (!numerico && /^[=+\-@]/.test(texto)) texto = "'" + texto;
  return '"' + texto.replace(/"/g, '""') + '"';
}

export default function ExportarVolumesCsv({
  registros,
}: {
  registros: VolumeExportacao[];
}) {
  function exportar() {
    if (registros.length === 0) return;
    const linhas = [
      colunas.map(([titulo]) => celula(titulo)).join(";"),
      ...registros.map((item) =>
        colunas.map(([, chave]) => celula(item[chave])).join(";"),
      ),
    ];
    const blob = new Blob(["\uFEFF" + linhas.join("\r\n") + "\r\n"], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "volumes-cargas-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <button
      type="button"
      onClick={exportar}
      disabled={registros.length === 0}
      title="Exporta os volumes vinculados às cargas filtradas, inclusive os que ainda estão em carga"
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#b8d1c0] bg-white px-4 text-xs font-black text-[#176f3c] transition hover:bg-[#f0f8f2] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <ScanBarcode size={16} />
      Volumes CSV ({registros.length})
    </button>
  );
}
