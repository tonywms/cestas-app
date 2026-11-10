"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  confirmarEntregaOffline, listarEntregasOffline, marcarConflitoEntregaOffline,
  EVENTO_ENTREGAS_OFFLINE, type EntregaPendenteOffline,
} from "@/lib/mobile/offline-entregas";

export default function SincronizadorOfflineEntregas({
  empresaId, usuarioId, compacto = false,
}: { empresaId: string; usuarioId: string; compacto?: boolean }) {
  const router = useRouter();
  const processando = useRef(false);
  const [itens, setItens] = useState<EntregaPendenteOffline[]>([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [ultimaEntrega, setUltimaEntrega] = useState<number | null>(null);

  const atualizar = useCallback(async () => {
    setItens(await listarEntregasOffline(empresaId, usuarioId));
  }, [empresaId, usuarioId]);

  const sincronizar = useCallback(async () => {
    if (processando.current) return;
    processando.current = true;
    try {
      const registros = await listarEntregasOffline(empresaId, usuarioId);
      setItens(registros);
      if (!registros.some(item => item.status === "pendente")) return;
      if (!navigator.onLine) {
        setMensagem("Sem internet. Entregas guardadas no aparelho; nenhuma baixa de estoque foi enviada.");
        return;
      }
      const health = await fetch("/api/mobile/conectividade?v105=" + Date.now(), {
        method: "GET", credentials: "same-origin", cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });
      if (!health.ok) {
        setMensagem("Aguardando conexão com o Supabase. Entregas preservadas.");
        return;
      }
      setSincronizando(true);
      setMensagem("Sincronizando entregas com estoque e crédito do banco...");
      let sucessos = 0;
      for (const registro of registros) {
        if (registro.status !== "pendente") continue;
        let resposta: Response;
        try {
          resposta = await fetch("/api/mobile/offline/entregas", {
            method: "POST", credentials: "same-origin", cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(registro),
            signal: AbortSignal.timeout(25000),
          });
        } catch {
          setMensagem("Conexão interrompida. As entregas continuam guardadas no aparelho.");
          break;
        }
        const json: unknown = await resposta.json().catch(() => null);
        const body = json && typeof json === "object" ? json as Record<string, unknown> : {};
        if (resposta.ok && body.ok === true && body.operacaoId === registro.id &&
            typeof body.entregaId === "number" && body.entregaId > 0) {
          await confirmarEntregaOffline(registro.id);
          setUltimaEntrega(body.entregaId);
          sucessos += 1;
        } else if ([400, 403, 409, 422].includes(resposta.status)) {
          await marcarConflitoEntregaOffline(registro.id,
            typeof body.mensagem === "string" ? body.mensagem : "Validação do servidor não aprovada.");
          setMensagem("Uma entrega requer revisão e não movimentou estoque.");
        } else {
          setMensagem(resposta.status === 401
            ? "Faça login novamente. Os registros continuam armazenados no aparelho."
            : "Servidor temporariamente indisponível. Reenvio seguro pendente.");
          break;
        }
      }
      await atualizar();
      if (sucessos) {
        setMensagem(sucessos === 1
          ? "1 entrega confirmada no banco. Estoque reconciliado."
          : `${sucessos} entregas confirmadas no banco. Estoque reconciliado.`);
        router.refresh();
      }
    } catch {
      setMensagem("Aguardando conexão ou acesso ao armazenamento. Não limpe os dados do navegador.");
    } finally {
      setSincronizando(false);
      processando.current = false;
    }
  }, [empresaId, usuarioId, atualizar, router]);

  useEffect(() => {
    void sincronizar();
    const recomeçar = () => { void sincronizar(); };
    const timer = window.setInterval(() => {
      if (!document.hidden) void sincronizar();
    }, 8000);
    window.addEventListener("online", recomeçar);
    window.addEventListener("focus", recomeçar);
    window.addEventListener(EVENTO_ENTREGAS_OFFLINE, recomeçar);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", recomeçar);
      window.removeEventListener("focus", recomeçar);
      window.removeEventListener(EVENTO_ENTREGAS_OFFLINE, recomeçar);
    };
  }, [sincronizar]);

  const pendentes = itens.filter(x => x.status === "pendente");
  const conflitos = itens.filter(x => x.status === "conflito");
  if (!mensagem && !itens.length && !sincronizando) return null;
  return (
    <section role="status" aria-live="polite"
      className={`rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm ${compacto ? "mx-5 my-3" : "my-4"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="text-xs">Entregas offline</strong>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black">
          {sincronizando ? "SINCRONIZANDO" : conflitos.length ? "REVISÃO" : pendentes.length ? "PENDENTE" : "CONFIRMADO"}
        </span>
      </div>
      {mensagem && <p className="mt-2 text-[11px] leading-5">{mensagem}</p>}
      <p className="mt-2 text-[10px] font-bold">
        {pendentes.length} pendente(s) · {conflitos.length} com conflito
      </p>
      {itens.map(item => (
        <div key={item.id} className="mt-2 rounded-xl bg-white/85 p-3 text-[10px]">
          <strong>{item.clienteNome} — {item.cargaCodigo}</strong>
          <p className="mt-1">{item.dados.quantidade} cesta(s) · {item.dados.modo === "VOLUME" ? "Rastreada por volume" : "Quantidade"} · {item.status === "conflito" ? "Revisão necessária" : "Aguardando banco"}</p>
          {item.erro && <p className="mt-1 font-semibold text-red-700">{item.erro}</p>}
        </div>
      ))}
      {pendentes.length > 0 && (
        <button type="button" onClick={() => void sincronizar()} disabled={sincronizando}
          className="mt-3 rounded-xl border border-amber-500 bg-white px-3 py-2 text-[11px] font-bold disabled:opacity-50">
          Verificar e sincronizar agora
        </button>
      )}
      {ultimaEntrega && pendentes.length === 0 && conflitos.length === 0 && (
        <Link href={`/mobile/vendas/nova?entregaId=${ultimaEntrega}`}
          className="mt-3 inline-block text-[11px] font-bold underline">
          Registrar venda / pagamento da última entrega
        </Link>
      )}
      {conflitos.length > 0 && (
        <p className="mt-2 text-[10px]">
          Entrega em conflito não foi baixada automaticamente. Solicite revisão ao gestor.
          Não apague os dados deste navegador.
        </p>
      )}
      <p className="mt-2 text-[9px] text-amber-800/70">
        O saldo do aplicativo pode ficar desatualizado até a confirmação pelo Supabase.
      </p>
    </section>
  );
}
