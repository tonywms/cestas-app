"use client";

import { Camera, CircleAlert, Images, LoaderCircle, ScanLine, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";

type Estado = "iniciando" | "lendo" | "erro" | "foto";
type Props = { onCodigo: (codigo: string) => void; disabled?: boolean; textoBotao?: string };

function descricaoErro(erro: unknown): string {
  const mensagem = String(erro && typeof erro === "object" && "message" in erro ? (erro as { message: unknown }).message : erro ?? "");
  if (/NotAllowed|Permission|denied/i.test(mensagem)) return "Permissão negada. Autorize a câmera ou fotografe o QR Code.";
  if (/NotFound|No camera|not found/i.test(mensagem)) return "Nenhuma câmera disponível. Use uma fotografia ou digite o código.";
  if (/NotReadable|in use/i.test(mensagem)) return "A câmera está sendo utilizada por outro aplicativo.";
  return "Não foi possível iniciar a câmera. Fotografe o QR ou informe o código manualmente.";
}

export default function LeitorQrCamera({ onCodigo, disabled = false, textoBotao = "Ler QR com a câmera" }: Props) {
  const [aberto, setAberto] = useState(false);
  const [estado, setEstado] = useState<Estado>("iniciando");
  const [erro, setErro] = useState("");
  const id = "cestas-qr-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const receberRef = useRef(onCodigo);
  const bloqueado = useRef(false);
  const fotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => { receberRef.current = onCodigo; }, [onCodigo]);

  function abrir() {
    if (disabled) return;
    bloqueado.current = false;
    setEstado("iniciando");
    setErro("");
    setAberto(true);
  }

  function receber(texto: string) {
    if (bloqueado.current) return;
    const codigo = texto.trim().toUpperCase();
    if (!codigo || codigo.length > 200 || /[\r\n]/.test(codigo)) {
      setErro("O QR não contém um código de volume válido.");
      return;
    }
    bloqueado.current = true;
    setAberto(false);
    receberRef.current(codigo);
  }

  useEffect(() => {
    if (!aberto) return;
    let cancelado = false;
    let scanner: Html5Qrcode | null = null;
    let iniciou = false;
    const encerrar = async () => {
      if (!scanner) return;
      if (iniciou) {
        try { await scanner.stop(); } catch { /* encerrado */ }
        iniciou = false;
      }
      try { scanner.clear(); } catch { /* encerrado */ }
    };
    const iniciar = async () => {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          setEstado("erro");
          setErro("A câmera ao vivo exige HTTPS no celular. Use o endereço HTTPS, fotografe o QR ou digite.");
          return;
        }
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (cancelado) return;
        scanner = new Html5Qrcode(id, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: (w: number, h: number) => {
            const lado = Math.max(80, Math.min(240, Math.floor(Math.min(w, h) * 0.76)));
            return { width: lado, height: lado };
          } },
          valor => { if (!cancelado) receber(valor); },
          () => { /* manter procurando */ }
        );
        iniciou = true;
        if (cancelado) await encerrar();
        else setEstado("lendo");
      } catch (causa) {
        await encerrar();
        if (!cancelado) { setEstado("erro"); setErro(descricaoErro(causa)); }
      }
    };
    const inicio = iniciar();
    return () => {
      cancelado = true;
      void (async () => {
        try { await inicio; } catch { /* tratado */ }
        await encerrar();
      })();
    };
    // Leitura dispara o callback da abertura; fechar desconecta a câmera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, id]);

  useEffect(() => {
    if (!aberto) return;
    const escapar = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    window.addEventListener("keydown", escapar);
    return () => window.removeEventListener("keydown", escapar);
  }, [aberto]);

  async function fotografar(arquivo?: File) {
    if (!arquivo || bloqueado.current) return;
    setEstado("foto");
    setErro("");
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const leitor = new Html5Qrcode(id, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
      try { receber(await leitor.scanFile(arquivo, false)); }
      finally { try { leitor.clear(); } catch { /* encerrado */ } }
    } catch {
      setErro("QR não identificado na fotografia. Melhore a iluminação e tente novamente.");
      setEstado("erro");
    } finally {
      if (fotoRef.current) fotoRef.current.value = "";
    }
  }

  return <>
    <button type="button" onClick={abrir} disabled={disabled}
      className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[16px] border border-emerald-200 bg-emerald-50 px-3 text-[12px] font-extrabold text-emerald-900 shadow-sm disabled:opacity-50">
      <Camera size={19}/> {textoBotao}
    </button>
    {aberto && <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-[#07190e]/80 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Leitor de QR Code">
      <div className="w-full max-w-[440px] max-h-[94dvh] overflow-y-auto rounded-[26px] bg-white p-4 shadow-[0_25px_85px_rgba(0,0,0,0.3)] sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Conferência por câmera</p>
            <h2 className="mt-1 text-[21px] font-black text-slate-900">Aponte para o QR Code</h2>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">Posicione a etiqueta dentro do quadro. A leitura é automática.</p>
          </div>
          <button type="button" aria-label="Fechar câmera" onClick={() => setAberto(false)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><X size={21}/></button>
        </div>
        <div className="relative mt-4 overflow-hidden rounded-[20px] border-2 border-emerald-200 bg-[#0c2215]">
          <div id={id} className="min-h-[240px] w-full text-white"/>
          {estado === "iniciando" && <div className="absolute inset-0 flex items-center justify-center gap-2 bg-[#0c2215]/85 text-xs font-bold text-white"><LoaderCircle size={19} className="animate-spin"/> Iniciando câmera...</div>}
        </div>
        {estado === "lendo" && <p className="mt-3 flex items-center gap-2 text-[11px] font-bold text-emerald-700"><ScanLine size={17}/> Câmera ativa. Procurando QR Code...</p>}
        {erro && <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-semibold leading-5 text-amber-900"><CircleAlert size={17}/> {erro}</p>}
        {estado === "erro" && <div className="mt-3">
          <input ref={fotoRef} type="file" accept="image/*" capture="environment" className="sr-only" id={id + "-foto"}
            onChange={e => { void fotografar(e.target.files?.[0]); }}/>
          <label htmlFor={id + "-foto"} className="flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 text-[12px] font-bold text-white"><Images size={17}/> Fotografar QR Code</label>
        </div>}
        {estado === "foto" && <p className="mt-3 flex items-center gap-2 text-[11px] text-slate-600"><LoaderCircle size={16} className="animate-spin"/> Analisando fotografia...</p>}
        <button type="button" onClick={() => setAberto(false)} className="mt-4 flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 text-[11px] font-bold text-slate-600">Cancelar e voltar à digitação</button>
      </div>
    </div>}
  </>;
}
