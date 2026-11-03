type Props = {
  numero: number;
  codigo: string;
  status?: string;
};

// Contexto operacional V88: identifica a carga concreta, sem inferir pelo volume.
export default function IdentificacaoCargaMobile({ numero, codigo, status }: Props) {
  return (
    <div
      className="sticky top-0 z-40 border-b border-emerald-200 bg-white/95 px-5 py-2.5 shadow-[0_8px_22px_rgba(15,75,40,0.10)] backdrop-blur-md"
      aria-label={`Carga atual nº ${numero}, ${codigo}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-700">Carga em operação</p>
          <p className="mt-0.5 text-[15px] font-black leading-5 text-slate-900">Carga nº {numero}</p>
          <p className="break-all text-[10px] font-semibold text-slate-600">{codigo}</p>
        </div>
        {status && <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[9px] font-black uppercase text-emerald-800">{status.replaceAll("_", " ")}</span>}
      </div>
    </div>
  );
}
