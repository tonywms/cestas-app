"use client";

import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

export type ColunaExportacao = {
  chave: string;
  titulo: string;
};

type Props = {
  nomeArquivo: string;
  titulo: string;
  subtitulo?: string;
  colunas: ColunaExportacao[];
  linhas: Record<string, string | number | null | undefined>[];
  resumo?: { label: string; valor: string | number }[];
};

function valorSeguro(valor: string | number | null | undefined) {
  return valor == null ? "" : valor;
}

export default function RelatorioExportActions({
  nomeArquivo,
  titulo,
  subtitulo,
  colunas,
  linhas,
  resumo = [],
}: Props) {
  const [gerando, setGerando] = useState<"excel" | "pdf" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function exportarExcel() {
    try {
      setErro(null);
      setGerando("excel");

      const workbook = XLSX.utils.book_new();

      if (resumo.length > 0) {
        const wsResumo = XLSX.utils.json_to_sheet(
          resumo.map((item) => ({
            Indicador: item.label,
            Valor: item.valor,
          })),
        );

        wsResumo["!cols"] = [{ wch: 30 }, { wch: 22 }];
        XLSX.utils.book_append_sheet(workbook, wsResumo, "Resumo");
      }

      const dados = linhas.map((linha) => {
        const registro: Record<string, string | number> = {};

        for (const coluna of colunas) {
          registro[coluna.titulo] = valorSeguro(linha[coluna.chave]);
        }

        return registro;
      });

      const wsDados = XLSX.utils.json_to_sheet(dados);
      wsDados["!cols"] = colunas.map((coluna) => ({ wch: 22 }));
      XLSX.utils.book_append_sheet(workbook, wsDados, "Dados");

      XLSX.writeFile(workbook, `${nomeArquivo}.xlsx`);
    } catch (e) {
      console.error(e);
      setErro("Falha ao gerar Excel.");
    } finally {
      setGerando(null);
    }
  }

  function exportarPdf() {
    try {
      setErro(null);
      setGerando("pdf");

      const landscape = colunas.length >= 7;

      const doc = new jsPDF({
        orientation: landscape ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const largura = doc.internal.pageSize.getWidth();
      const margem = 12;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(titulo, margem, 15);

      let y = 22;

      if (subtitulo) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);

        const linhasSubtitulo = doc.splitTextToSize(
          subtitulo,
          largura - margem * 2,
        );

        doc.text(linhasSubtitulo, margem, y);
        y += linhasSubtitulo.length * 4 + 3;
      }

      if (resumo.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("Resumo", margem, y);
        y += 4;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);

        const textoResumo = resumo
          .map((item) => `${item.label}: ${item.valor}`)
          .join(" | ");

        const linhasResumo = doc.splitTextToSize(
          textoResumo,
          largura - margem * 2,
        );

        doc.text(linhasResumo, margem, y);
        y += linhasResumo.length * 4 + 5;
      }

      autoTable(doc, {
        startY: y,
        head: [colunas.map((coluna) => coluna.titulo)],
        body: linhas.map((linha) =>
          colunas.map((coluna) => String(valorSeguro(linha[coluna.chave]))),
        ),
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: landscape ? 6 : 7,
          cellPadding: 1.8,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: {
          fillColor: [23, 111, 60],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [247, 250, 247],
        },
        margin: {
          left: margem,
          right: margem,
          bottom: 12,
        },
        didDrawPage: () => {
          const pagina = doc.getCurrentPageInfo().pageNumber;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(120, 130, 124);

          doc.text(
            `Página ${pagina}`,
            largura - margem,
            doc.internal.pageSize.getHeight() - 6,
            { align: "right" },
          );
        },
      });

      doc.save(`${nomeArquivo}.pdf`);
    } catch (e) {
      console.error(e);
      setErro("Falha ao gerar PDF.");
    } finally {
      setGerando(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-1 flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
          <Download size={14} />
          Exportar dados
        </div>

        <button
          type="button"
          onClick={exportarExcel}
          disabled={gerando !== null || linhas.length === 0}
          className="inline-flex h-10 items-center gap-2 rounded-[13px] border border-emerald-100 bg-emerald-50 px-4 text-[9px] font-black text-emerald-800 disabled:opacity-40"
        >
          <FileSpreadsheet size={15} />
          {gerando === "excel" ? "Gerando..." : "Excel"}
        </button>

        <button
          type="button"
          onClick={exportarPdf}
          disabled={gerando !== null || linhas.length === 0}
          className="inline-flex h-10 items-center gap-2 rounded-[13px] border border-slate-200 bg-white px-4 text-[9px] font-black text-slate-700 disabled:opacity-40"
        >
          <FileText size={15} />
          {gerando === "pdf" ? "Gerando..." : "PDF"}
        </button>
      </div>

      {erro && (
        <p className="mt-2 text-right text-[8px] font-semibold text-red-600">
          {erro}
        </p>
      )}
    </div>
  );
}
