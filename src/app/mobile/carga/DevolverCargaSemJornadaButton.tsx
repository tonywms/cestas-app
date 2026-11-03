"use client";

import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  cargaId: number;
  codigo: string;
  totalEmPosse: number;
};

type Resultado = {
  totalDevolvido: number;
  codigo: string;
};

export default function DevolverCargaSemJornadaButton({
  cargaId,
  codigo,
  totalEmPosse,
}: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const motivoValido = motivo.trim().length >= 8;

  async function confirmar() {
    if (!motivoValido || pending) return;

    setPending(true);
    setErro("");

    try {
      const response = await fetch(
        "/api/mobile/carga/devolver-sem-jornada",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cargaId,
            motivo: motivo.trim(),
          }),
        },
      );

      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        totalDevolvido?: number;
        codigo?: string;
      };

      if (!response.ok || !payload.ok) {
        setErro(
          payload.message ||
            "Não foi possível devolver a carga. Atualize a tela e tente novamente.",
        );
        return;
      }

      setResultado({
        totalDevolvido: Number(payload.totalDevolvido ?? 0),
        codigo: String(payload.codigo ?? codigo),
      });
    } catch {
      setErro(
        "Não foi possível concluir a devolução. Verifique sua conexão e tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }

  if (resultado) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#07150d]/60 p-4 backdrop-blur-[6px]">
        <div className="w-full max-w-[420px] rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.28)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={31} />
          </div>

          <p className="mt-5 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-600">
            Devolução concluída
          </p>

          <h3 className="mt-2 text-[21px] font-black tracking-[-0.04em] text-[#142018]">
            Carga devolvida ao central
          </h3>

          <p className="mt-3 text-[11px] leading-5 text-slate-500">
            {resultado.totalDevolvido} cesta(s) retornaram ao estoque central. A carga {resultado.codigo} foi cancelada e preservada no histórico.
          </p>

          <button
            type="button"
            onClick={() => {
              router.push("/mobile");
              router.refresh();
            }}
            className="mt-6 flex h-[54px] w-full items-center justify-center rounded-[17px] bg-[#176b3a] text-[11px] font-black text-white shadow-[0_14px_30px_rgba(23,107,58,0.20)]"
          >
            Concluir e voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErro("");
          setAberto(true);
        }}
        className="mt-3 flex h-[50px] w-full items-center justify-center gap-2 rounded-[16px] border border-amber-200 bg-white text-[10px] font-black text-amber-700 transition hover:bg-amber-50 active:scale-[0.99]"
      >
        <RotateCcw size={16} />
        Devolver carga sem iniciar jornada
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#07150d]/60 p-4 backdrop-blur-[6px]">
          <div className="w-full max-w-[430px] overflow-hidden rounded-[30px] bg-white shadow-[0_30px_100px_rgba(15,50,30,0.30)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-amber-100 text-amber-700">
                  <AlertTriangle size={21} />
                </div>

                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-amber-600">
                    Exceção operacional
                  </p>
                  <h3 className="mt-1 text-[19px] font-black tracking-[-0.04em] text-[#142018]">
                    Devolver esta carga?
                  </h3>
                  <p className="mt-2 text-[9px] leading-5 text-slate-500">
                    Use somente se a jornada não acontecer. Todo o saldo volta ao estoque central, os volumes físicos ficam CANCELADO e a operação permanece auditada.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAberto(false)}
                disabled={pending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 disabled:opacity-40"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[16px] bg-slate-50 p-3">
                  <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">
                    Carga
                  </p>
                  <p className="mt-1 text-[11px] font-black text-slate-700">
                    {codigo}
                  </p>
                </div>
                <div className="rounded-[16px] bg-emerald-50 p-3">
                  <p className="text-[7px] font-black uppercase tracking-[0.12em] text-emerald-600/70">
                    Volta ao central
                  </p>
                  <p className="mt-1 text-[18px] font-black text-emerald-700">
                    {totalEmPosse}
                  </p>
                </div>
              </div>

              <label className="mt-5 block">
                <span className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Motivo obrigatório
                </span>
                <textarea
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  maxLength={500}
                  rows={4}
                  disabled={pending}
                  placeholder="Ex.: jornada cancelada pela empresa, veículo indisponível, operação suspensa..."
                  className="mt-2 w-full resize-none rounded-[17px] border border-slate-200 bg-white p-4 text-[10px] font-semibold text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-50 disabled:opacity-60"
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className={`text-[8px] font-bold ${motivoValido ? "text-emerald-600" : "text-slate-400"}`}>
                    {motivoValido
                      ? "Justificativa pronta para auditoria."
                      : "Informe pelo menos 8 caracteres."}
                  </p>
                  <p className="text-[8px] font-bold text-slate-400">
                    {motivo.length}/500
                  </p>
                </div>
              </label>

              {erro && (
                <div className="mt-4 rounded-[15px] border border-red-200 bg-red-50 p-3 text-left text-[9px] font-bold leading-5 text-red-700">
                  {erro}
                </div>
              )}

              <button
                type="button"
                onClick={confirmar}
                disabled={!motivoValido || pending}
                className="mt-5 flex h-[54px] w-full items-center justify-center gap-2 rounded-[17px] bg-amber-600 text-[11px] font-black text-white shadow-[0_14px_30px_rgba(180,120,10,0.20)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw size={16} />
                {pending
                  ? "Devolvendo carga..."
                  : `Confirmar devolução de ${totalEmPosse} cesta(s)`}
              </button>

              <button
                type="button"
                onClick={() => setAberto(false)}
                disabled={pending}
                className="mt-2 flex h-[48px] w-full items-center justify-center rounded-[15px] border border-slate-200 bg-white text-[10px] font-black text-slate-500 disabled:opacity-40"
              >
                Manter carga e voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
