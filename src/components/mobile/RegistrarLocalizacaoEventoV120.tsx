"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CheckCircle2, LocateFixed, MapPinOff, RefreshCcw, ShieldAlert } from "lucide-react";
import {
  diagnosticarGPS, lerGPS, mensagemFalhaGPS,
  type DiagnosticoGPS,
} from "@/lib/mobile/gps-leitura-v120";

type TipoEvento = "ENTREGA" | "VENDA" | "COBRANCA";
type Estado = "pronto" | "capturando" | "enviando" | "salvo" | "ja_registrado" | "erro";

// V120.1.2: somente apos clique explicito. Nunca registra novo pagamento ou venda.
export default function RegistrarLocalizacaoEventoV120({ tipo, eventoId }: {
  tipo: TipoEvento;
  eventoId: number | null | undefined;
}) {
  const [estado, setEstado] = useState<Estado>("pronto");
  const [mensagem, setMensagem] = useState("");
  const [diagnostico, setDiagnostico] = useState<DiagnosticoGPS | null>(null);
  const emAndamento = useRef(false);

  if (!eventoId || !Number.isSafeInteger(eventoId) || eventoId <= 0) return null;

  async function registrar() {
    if (!eventoId || emAndamento.current || estado === "salvo" || estado === "ja_registrado") return;
    emAndamento.current = true;
    setMensagem("");
    setDiagnostico(null);
    setEstado("capturando");
    try {
      const posicao = await lerGPS();
      if (!Number.isFinite(posicao.coords.accuracy) || posicao.coords.accuracy > 1500 ||
          !Number.isFinite(posicao.coords.latitude) || !Number.isFinite(posicao.coords.longitude)) {
        setEstado("erro");
        setDiagnostico(await diagnosticarGPS());
        setMensagem("A localização foi encontrada, mas a precisão supera 1.500 m. Não será salva como ponto confiável.");
        return;
      }
      setEstado("enviando");
      const resposta = await fetch("/api/mobile/localizacao-atendimento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          tipo,
          eventoId,
          latitude: posicao.coords.latitude,
          longitude: posicao.coords.longitude,
          precisaoMetros: posicao.coords.accuracy,
          capturadoEm: new Date(posicao.timestamp).toISOString(),
        }),
      });
      let retorno: { ok?: boolean; jaRegistrado?: boolean; mensagem?: string } = {};
      try { retorno = await resposta.json(); } catch { /* erro de transporte ou proxy */ }
      if (!resposta.ok || !retorno.ok) {
        setEstado("erro");
        setMensagem(retorno.mensagem || `Falha do servidor ao salvar o ponto (HTTP ${resposta.status}). Nenhum atendimento foi alterado.`);
        return;
      }
      setEstado(retorno.jaRegistrado ? "ja_registrado" : "salvo");
      setMensagem(retorno.jaRegistrado
        ? "Este atendimento já possui localização registrada. Nenhum ponto foi duplicado."
        : `Ponto associado ao atendimento nº ${eventoId}. Consulte em Meus pontos.`);
    } catch (erro) {
      const d = await diagnosticarGPS();
      setDiagnostico(d);
      setEstado("erro");
      setMensagem(mensagemFalhaGPS(erro, d));
    } finally {
      emAndamento.current = false;
    }
  }

  const concluido = estado === "salvo" || estado === "ja_registrado";
  const aguardando = estado === "capturando" || estado === "enviando";
  return (
    <section aria-label="Localização opcional do atendimento" className="mt-4 rounded-[18px] border border-emerald-100 bg-[#f4faf6] p-3 text-left">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white text-emerald-700">
          {concluido ? <CheckCircle2 size={18}/> : estado === "erro" ? <MapPinOff size={18}/> : <LocateFixed size={18}/>}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black text-emerald-950">Localização deste atendimento</p>
          <p className="mt-1 text-[10px] leading-[17px] text-slate-600">Opcional. Após clicar, o navegador tentará obter sua localização. Não há rastreamento contínuo e a operação permanece concluída em caso de erro.</p>
        </div>
      </div>
      {!concluido && (
        <button type="button" disabled={aguardando} onClick={() => void registrar()}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-[13px] bg-emerald-800 px-3 text-[11px] font-black text-white disabled:opacity-60">
          {aguardando ? <RefreshCcw size={15} className="animate-spin"/> : <LocateFixed size={15}/>}
          {estado === "capturando" ? "Localizando aparelho..." : estado === "enviando" ? "Registrando ponto..." : estado === "erro" ? "Tentar registrar novamente" : "Registrar local (opcional)"}
        </button>
      )}
      {mensagem && <p role="status" aria-live="polite" className={`mt-2 rounded-xl p-2 text-[10px] font-semibold leading-5 ${concluido ? "bg-emerald-100 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{mensagem}</p>}
      {diagnostico && !concluido && (
        <div className="mt-3 rounded-[13px] border border-amber-200 bg-white p-3 text-[10px] leading-5 text-slate-700">
          <p className="flex items-center gap-2 font-black text-amber-900"><ShieldAlert size={15}/> Diagnóstico da permissão</p>
          <p className="mt-2">Permissão do site: <b>{diagnostico.permissao}</b></p>
          <p>HTTPS ou localhost seguro: <b>{diagnostico.seguro ? "Sim" : "Não"}</b></p>
          <p>API de localização: <b>{diagnostico.apiDisponivel ? "Disponível" : "Indisponível"}</b></p>
          <p>Política da página: <b>{diagnostico.politica}</b></p>
          <p className="mt-1 break-all text-slate-500">Site: {diagnostico.origem}</p>
          <p className="mt-2 text-slate-600">Se a permissão aparece como <b>granted</b> e ainda há erro 1, o bloqueio é externo ao código da aplicação.</p>
        </div>
      )}
      {concluido ? (
        <Link prefetch={false} href="/mobile/localizacoes" className="mt-3 flex min-h-10 items-center justify-center rounded-xl border border-emerald-200 bg-white text-[11px] font-black text-emerald-800">Ver meus pontos registrados</Link>
      ) : (
        <Link prefetch={false} href="/mobile/gps-diagnostico" className="mt-3 flex min-h-10 items-center justify-center rounded-xl border border-emerald-200 bg-white px-3 text-center text-[11px] font-black text-emerald-800">Testar GPS sem criar outra venda</Link>
      )}
    </section>
  );
}
