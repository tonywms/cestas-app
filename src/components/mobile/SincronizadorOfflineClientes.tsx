"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  conflitoClienteOffline, listarClientesOffline, removerClienteOffline,
} from "@/lib/mobile/offline-clientes";

// V104: sincroniza apenas operacoes previamente confirmadas no IndexedDB.
// Nunca assume sucesso sem ACK; repeticoes usam o mesmo UUID e sao deduplicadas no banco.
export default function SincronizadorOfflineClientes({
  empresaId, usuarioId, compacto = false,
}: { empresaId: string; usuarioId: string; compacto?: boolean }) {
  const ocupado = useRef(false);
  const [pendentes, setPendentes] = useState(0);
  const [conflitos, setConflitos] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [ultimoCliente, setUltimoCliente] = useState<number | null>(null);

  const sincronizar = useCallback(async () => {
    if (ocupado.current) return;
    ocupado.current = true;
    try {
      let itens = await listarClientesOffline(empresaId, usuarioId);
      setPendentes(itens.filter((item) => item.status === "pendente").length);
      setConflitos(itens.filter((item) => item.status === "conflito").length);
      if (!itens.some((item) => item.status === "pendente")) return;
      if (navigator.onLine === false) {
        setMensagem("Sem internet. Os cadastros continuam salvos neste aparelho.");
        return;
      }
      const heartbeat = await fetch("/api/mobile/conectividade?v104=" + Date.now(), {
        method: "GET", credentials: "same-origin", cache: "no-store",
        signal: AbortSignal.timeout(5500),
      });
      if (!heartbeat.ok) {
        setMensagem("Aguardando conexão com o Supabase para sincronizar.");
        return;
      }
      setSincronizando(true);
      setMensagem("Enviando cadastros pendentes ao servidor...");
      let sincronizados = 0;
      for (const item of itens) {
        if (item.status !== "pendente") continue;
        if (navigator.onLine === false) break;
        let resposta: Response;
        try {
          resposta = await fetch("/api/mobile/offline/clientes", {
            method: "POST", credentials: "same-origin", cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
            signal: AbortSignal.timeout(15000),
          });
        } catch {
          setMensagem("Conexão interrompida. Os cadastros permanecem na fila.");
          break;
        }
        const dados: unknown = await resposta.json().catch(() => null);
        const corpo = dados && typeof dados === "object" ? dados as Record<string, unknown> : {};
        if (resposta.ok && corpo.ok === true && corpo.operacaoId === item.id) {
          // So remove apos confirmacao nominal do mesmo UUID.
          await removerClienteOffline(item.id);
          sincronizados += 1;
          if (typeof corpo.clienteId === "number" && corpo.clienteId > 0) {
            setUltimoCliente(corpo.clienteId);
          }
        } else if ([400, 403, 409, 422].includes(resposta.status)) {
          // Falha de negocio: nao reenvia automaticamente nem descarta os dados.
          await conflitoClienteOffline(item.id,
            typeof corpo.mensagem === "string" ? corpo.mensagem : "Revisão manual necessária.");
          setMensagem("Há um cadastro que precisa de revisão antes de sincronizar.");
        } else {
          setMensagem(resposta.status === 401
            ? "Entre novamente na sua conta; os cadastros continuam no aparelho."
            : "Servidor indisponível. A fila será reenviada automaticamente.");
          break;
        }
      }
      itens = await listarClientesOffline(empresaId, usuarioId);
      setPendentes(itens.filter((item) => item.status === "pendente").length);
      setConflitos(itens.filter((item) => item.status === "conflito").length);
      if (sincronizados > 0) {
        setMensagem(sincronizados === 1
          ? "1 cliente sincronizado e confirmado pelo banco."
          : `${sincronizados} clientes sincronizados e confirmados pelo banco.`);
      }
    } catch {
      setMensagem("Armazenamento local ou conexão indisponível. Não apague dados do navegador.");
    } finally {
      setSincronizando(false);
      ocupado.current = false;
    }
  }, [empresaId, usuarioId]);

  useEffect(() => {
    void sincronizar();
    const onChange = () => { void sincronizar(); };
    const onFocus = () => { void sincronizar(); };
    const timer = window.setInterval(() => {
      if (!document.hidden) void sincronizar();
    }, 8000);
    window.addEventListener("online", onChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener("cestas:clientes-offline-alterados", onChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", onChange);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("cestas:clientes-offline-alterados", onChange);
    };
  }, [sincronizar]);

  if (!mensagem && pendentes === 0 && conflitos === 0 && !sincronizando) return null;

  return (
    <section role="status" aria-live="polite"
      className={`rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm ${compacto ? "mx-5 my-3" : "mb-4"}`}>
      <div className="flex items-center justify-between gap-2">
        <strong className="text-xs">Sincronização dos clientes</strong>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black">
          {sincronizando ? "ENVIANDO" : pendentes > 0 ? "PENDENTE" : conflitos > 0 ? "REVISAR" : "CONCLUÍDO"}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed">{mensagem}</p>
      <p className="mt-1 text-[10px] font-semibold">
        {pendentes} pendente(s) · {conflitos} com conflito
      </p>
      {ultimoCliente && pendentes === 0 && conflitos === 0 && (
        <Link href={`/mobile/clientes?clienteId=${ultimoCliente}`}
          className="mt-2 inline-block text-[11px] font-bold underline">
          Ver cliente confirmado
        </Link>
      )}
      {pendentes > 0 && (
        <button type="button" disabled={sincronizando} onClick={() => void sincronizar()}
          className="mt-3 rounded-lg border border-amber-500 bg-white px-3 py-2 text-[11px] font-bold disabled:opacity-60">
          Tentar sincronizar agora
        </button>
      )}
      {conflitos > 0 && (
        <p className="mt-2 text-[10px]">
          Cadastros em conflito ficam preservados neste aparelho para revisão.
          Não limpe os dados do navegador.
        </p>
      )}
    </section>
  );
}
