"use client";

import { Download } from "lucide-react";

// V130: exporta apenas os registros já conferidos e autorizados no servidor.
// O arquivo contém somente as cargas visíveis da empresa autenticada.
export type AuditoriaCsvLinha = {
  cargaId: number;
  cargaCodigo: string;
  statusCarga: string;
  dataFechamento: string;
  conciliacao: string;
  tipoId: number;
  tipoNome: string;
  carregadas: number;
  entregues: number;
  retornadas: number;
  entradaCd: number;
  avariadas: number;
  baixaAvaria: number;
  saldoPosse: number;
  volumesAtivos: number | null;
  volumesRetornados: number | null;
  volumesAvariados: number | null;
  alertas: string;
};

type Props = {
  linhas: AuditoriaCsvLinha[];
};

// Previne formulas em planilhas e preserva campos com ponto e virgula,
// aspas ou quebras de linha. UTF-8 BOM facilita abertura no Excel.
function celulaCsv(valor: string | number | null): string {
  let texto = valor === null ? "" : String(valor);
  texto = texto.replace(/[\r\n\t]+/g, " ").trim();
  if (/^[=+@-]/.test(texto) && typeof valor !== "number") {
    texto = "'" + texto;
  }
  return '"' + texto.replace(/"/g, '""') + '"';
}

const colunas: Array<[string, keyof AuditoriaCsvLinha]> = [
  ["Carga nº", "cargaId"],
  ["Código da carga", "cargaCodigo"],
  ["Status da carga", "statusCarga"],
  ["Finalizada em", "dataFechamento"],
  ["Situação da conciliação", "conciliacao"],
  ["Tipo nº", "tipoId"],
  ["Tipo de cesta", "tipoNome"],
  ["Carregadas", "carregadas"],
  ["Entregues", "entregues"],
  ["Retornadas", "retornadas"],
  ["Entrada no CD", "entradaCd"],
  ["Avariadas", "avariadas"],
  ["Baixa por avaria", "baixaAvaria"],
  ["Saldo em posse", "saldoPosse"],
  ["Volumes EM_CARGA", "volumesAtivos"],
  ["Volumes retornados", "volumesRetornados"],
  ["Volumes avariados", "volumesAvariados"],
  ["Alertas", "alertas"],
];

export default function ExportarAuditoriaCsv({ linhas }: Props) {
  function exportar() {
    if (!linhas.length) return;
    const cabecalho = colunas.map(([nome]) => celulaCsv(nome)).join(";");
    const conteudo = linhas
      .map((linha) => colunas.map(([, campo]) => celulaCsv(linha[campo])).join(";"))
      .join("\r\n");
    const csv = "\uFEFF" + cabecalho + "\r\n" + conteudo + "\r\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dia = new Date().toISOString().slice(0, 10);
    link.download = "auditoria-devolucoes-" + dia + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <button
      type="button"
      onClick={exportar}
      disabled={!linhas.length}
      title={linhas.length ? "Exportar apenas os resultados exibidos" : "Nenhum resultado disponível"}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#b8d1c0] bg-white px-4 text-xs font-black text-[#176f3c] transition hover:bg-[#f0f8f2] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Download size={16} />
      Resumo CSV ({linhas.length})
    </button>
  );
}
