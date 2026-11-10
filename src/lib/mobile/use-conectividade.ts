"use client";

// V102_2_HEARTBEAT_REAL: verificacao ativa da disponibilidade do backend,
// sem armazenar dados de carga nem fazer operacoes offline.
import { useCallback, useEffect, useRef, useState } from "react";

type Estado = "verificando" | "online" | "offline";

export function useConectividadeMobile() {
  const [estado, setEstado] = useState<Estado>("verificando");
  const controlador = useRef<AbortController | null>(null);
  const sequencia = useRef(0);
  const ativo = useRef(false);

  const verificar = useCallback(async () => {
    const atual = ++sequencia.current;
    controlador.current?.abort();

    // Browser continua respondendo no localhost mesmo quando a internet cai.
    // navigator.onLine e apenas um sinal inicial: a confirmacao vem do heartbeat.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      if (ativo.current) setEstado("offline");
      return;
    }

    const nova = new AbortController();
    controlador.current = nova;
    const limite = window.setTimeout(() => nova.abort(), 4500);
    try {
      const resposta = await fetch("/api/mobile/conectividade?verificacao=" + Date.now(), {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: nova.signal,
      });
      const retorno: unknown = await resposta.json();
      const confirmado = typeof retorno === "object" && retorno !== null &&
        "online" in retorno && retorno.online === true;
      if (ativo.current && atual === sequencia.current) {
        setEstado(resposta.ok && confirmado ? "online" : "offline");
      }
    } catch {
      if (ativo.current && atual === sequencia.current) setEstado("offline");
    } finally {
      window.clearTimeout(limite);
      if (controlador.current === nova) controlador.current = null;
    }
  }, []);

  const marcarIndisponivel = useCallback(() => {
    sequencia.current++;
    controlador.current?.abort();
    setEstado("offline");
  }, []);

  const revalidar = useCallback(() => {
    setEstado("verificando");
    void verificar();
  }, [verificar]);

  useEffect(() => {
    ativo.current = true;
    void verificar();
    const offline = () => marcarIndisponivel();
    const online = () => revalidar();
    const foco = () => { void verificar(); };
    const visibilidade = () => { if (!document.hidden) void verificar(); };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    window.addEventListener("focus", foco);
    document.addEventListener("visibilitychange", visibilidade);
    // Detecta quedas sem refresh, inclusive quando o Windows mantem adaptador virtual ativo.
    const periodicidade = window.setInterval(() => {
      if (!document.hidden) void verificar();
    }, 6000);
    return () => {
      ativo.current = false;
      sequencia.current++;
      controlador.current?.abort();
      window.clearInterval(periodicidade);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      window.removeEventListener("focus", foco);
      document.removeEventListener("visibilitychange", visibilidade);
    };
  }, [verificar, marcarIndisponivel, revalidar]);

  return {
    conectado: estado === "online",
    verificando: estado === "verificando",
    marcarIndisponivel,
    revalidar,
  };
}
