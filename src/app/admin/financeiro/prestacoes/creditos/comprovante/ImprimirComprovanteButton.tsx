"use client";

import { Printer } from "lucide-react";

export default function ImprimirComprovanteButton() {
  return <button type="button" onClick={()=>window.print()}
    className="print:hidden inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 text-xs font-black text-white">
    <Printer size={16}/> Imprimir ou salvar PDF
  </button>;
}
