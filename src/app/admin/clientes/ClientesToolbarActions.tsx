import {
  Download,
  FileDown,
  FileSpreadsheet,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import NovoClienteModalTrigger from "./NovoClienteModalTrigger";

export default function ClientesToolbarActions() {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <a
        href="/modelos/MODELO_IMPORTACAO_CLIENTES_CESTAS_APP.xlsx"
        download
        className="inline-flex h-[38px] items-center gap-2 rounded-[13px] border border-emerald-200 bg-white px-3 text-[8px] font-black text-[#176f3c] shadow-sm transition hover:bg-emerald-50 active:scale-[0.98]"
      >
        <FileDown size={14} />
        Modelo Excel
      </a>

      <Link
        href="/admin/clientes/importar"
        className="inline-flex h-[38px] items-center gap-2 rounded-[13px] border border-emerald-200 bg-emerald-50 px-3 text-[8px] font-black text-[#176f3c] shadow-sm transition hover:bg-emerald-100 active:scale-[0.98]"
      >
        <FileSpreadsheet size={14} />
        Importar Excel
      </Link>

      <Link
        href="/admin/clientes/qualidade"
        className="inline-flex h-[38px] items-center gap-2 rounded-[13px] border border-amber-200 bg-amber-50 px-3 text-[8px] font-black text-amber-700 shadow-sm transition hover:bg-amber-100 active:scale-[0.98]"
      >
        <ShieldCheck size={14} />
        Qualidade da carteira
      </Link>

      <a
        href="/api/admin/clientes/exportar"
        className="inline-flex h-[38px] items-center gap-2 rounded-[13px] border border-slate-200 bg-white px-3 text-[8px] font-black text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
      >
        <Download size={14} />
        Exportar clientes
      </a>

      <NovoClienteModalTrigger />
    </div>
  );
}
