"use client";

import { useState } from "react";
import { LocateFixed, RefreshCcw, ShieldCheck, ShieldAlert } from "lucide-react";
import { diagnosticarGPS, lerGPS, mensagemFalhaGPS, type DiagnosticoGPS } from "@/lib/mobile/gps-leitura-v120";

type Estado = "pronto" | "testando" | "sucesso" | "falha";
export default function TestarGpsV120() {
  const [estado, setEstado] = useState<Estado>("pronto");
  const [diagnostico, setDiagnostico] = useState<DiagnosticoGPS | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [posicao, setPosicao] = useState<{ latitude: number; longitude: number; precisao: number } | null>(null);

  async function testar() {
    if (estado === "testando") return;
    setEstado("testando");
    setPosicao(null);
    setMensagem("");
    setDiagnostico(await diagnosticarGPS());
    try {
      const p = await lerGPS();
      setDiagnostico(await diagnosticarGPS());
      setPosicao({ latitude: p.coords.latitude, longitude: p.coords.longitude, precisao: p.coords.accuracy });
      setEstado("sucesso");
      setMensagem("O navegador conseguiu ler sua posição. Este teste não salvou nada no Supabase.");
    } catch (erro) {
      const d = await diagnosticarGPS();
      setDiagnostico(d);
      setEstado("falha");
      setMensagem(mensagemFalhaGPS(erro, d));
    }
  }

  return (
    <section className="space-y-4 rounded-[26px] border border-emerald-100 bg-white p-5 shadow-[0_16px_40px_rgba(17,63,33,0.06)]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><LocateFixed size={22}/></div>
        <div><h2 className="text-[17px] font-black text-emerald-950">Teste de localização</h2><p className="text-[10px] text-slate-600">Sem gravar pontos e sem registrar entregas</p></div>
      </div>
      <button type="button" onClick={() => void testar()} disabled={estado === "testando"} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-emerald-800 px-4 text-xs font-black text-white disabled:opacity-50">
        {estado === "testando" ? <RefreshCcw size={16} className="animate-spin"/> : <LocateFixed size={16}/>}
        {estado === "testando" ? "Consultando dispositivo..." : "Testar GPS agora"}
      </button>
      {mensagem && <div role="status" className={`rounded-xl border p-3 text-xs leading-5 ${estado === "sucesso" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
        <div className="flex gap-2">{estado === "sucesso" ? <ShieldCheck className="shrink-0" size={18}/> : <ShieldAlert className="shrink-0" size={18}/>}<p>{mensagem}</p></div>
      </div>}
      {diagnostico && <dl className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">Permissão</dt><dd className="mt-1 font-black">{diagnostico.permissao}</dd></div>
        <div className="rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">Contexto seguro</dt><dd className="mt-1 font-black">{diagnostico.seguro ? "Sim" : "Não"}</dd></div>
        <div className="rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">API GPS</dt><dd className="mt-1 font-black">{diagnostico.apiDisponivel ? "Disponível" : "Indisponível"}</dd></div>
        <div className="rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">Política da página</dt><dd className="mt-1 font-black">{diagnostico.politica}</dd></div>
        <div className="col-span-2 rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">Origem</dt><dd className="mt-1 break-all font-black">{diagnostico.origem}</dd></div>
      </dl>}
      {posicao && <div className="rounded-xl bg-emerald-50 p-4 text-[11px] font-bold leading-6 text-emerald-900">
        <p>Latitude: {posicao.latitude.toFixed(6)}</p><p>Longitude: {posicao.longitude.toFixed(6)}</p><p>Precisão aproximada: {Math.round(posicao.precisao)} m</p>
        <p className="mt-2 text-[10px] font-normal">Não compartilhe estas coordenadas fora da equipe autorizada.</p>
      </div>}
      <p className="text-[10px] leading-5 text-slate-500">Se aparecer "granted" e erro de permissão, a leitura foi barrada fora do app. No computador, confirme a localização do Windows e as políticas do Chrome. No celular, utilize HTTPS; endereço de rede local HTTP não equivale a localhost seguro.</p>
    </section>
  );
}
