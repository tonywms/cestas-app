"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, X, ClipboardList, ShieldCheck, AlertCircle } from "lucide-react";
import SincronizadorOfflineClientes from "@/components/mobile/SincronizadorOfflineClientes";
import SincronizadorOfflineEntregas from "@/components/mobile/SincronizadorOfflineEntregas";
import SincronizadorVendasRotaOffline from "@/components/mobile/SincronizadorVendasRotaOffline";
import { listarClientesOffline } from "@/lib/mobile/offline-clientes";
import { listarEntregasOffline, EVENTO_ENTREGAS_OFFLINE } from "@/lib/mobile/offline-entregas";
import { listarVendasRotaOffline, EVENTO_VENDAS_OFFLINE, type VendaRotaOffline } from "@/lib/mobile/offline-vendas-rota";

type Resumo = {
  total: number;
  preparacao: number;
  pendentes: number;
  conflitos: number;
  vendas: VendaRotaOffline[];
  alertaIds: string[];
};
const vazio: Resumo = {
  total: 0, preparacao: 0, pendentes: 0, conflitos: 0,
  vendas: [], alertaIds: [],
};

export default function CentralNotificacoesMobile({
  empresaId, usuarioId,
}: { empresaId: string; usuarioId: string }) {
  const [montado, setMontado] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [resumo, setResumo] = useState<Resumo>(vazio);
  const [erroLocal, setErroLocal] = useState("");
  const botaoRef = useRef<HTMLButtonElement>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);
  const chaveAviso = `cestas-notificacoes-v1053:${empresaId}:${usuarioId}`;

  const atualizar = useCallback(async () => {
    try {
      const [clientes, entregas, vendas] = await Promise.all([
        listarClientesOffline(empresaId, usuarioId),
        listarEntregasOffline(empresaId, usuarioId),
        listarVendasRotaOffline(empresaId, usuarioId),
      ]);
      const todos = [
        ...clientes.map(x => ({ id: "cliente:"+x.id, status: x.status })),
        ...entregas.map(x => ({ id: "entrega:"+x.id, status: x.status })),
        ...vendas.map(x => ({ id: "venda:"+x.id, status: x.status })),
      ];
      const requerDecisao = todos.filter(x =>
        x.status === "rascunho" || x.status === "conflito"
      );
      const novoResumo: Resumo = {
        total: todos.length,
        preparacao: todos.filter(x => x.status === "rascunho").length,
        pendentes: todos.filter(x => x.status === "pendente").length,
        conflitos: todos.filter(x => x.status === "conflito").length,
        vendas,
        alertaIds: requerDecisao.map(x => x.id).sort(),
      };
      setResumo(novoResumo);
      setErroLocal("");
      // Avisar em modal somente quando houver nova decisao pendente nesta sessao.
      // Fechar o modal NAO elimina o indicador do sininho.
      if (requerDecisao.length > 0) {
        const assinatura = novoResumo.alertaIds.join("|");
        const ultimo = window.sessionStorage.getItem(chaveAviso);
        if (ultimo !== assinatura) {
          window.sessionStorage.setItem(chaveAviso, assinatura);
          setAberto(true);
        }
      } else {
        window.sessionStorage.removeItem(chaveAviso);
      }
    } catch {
      setErroLocal("Não foi possível consultar as pendências deste navegador.");
    }
  }, [empresaId, usuarioId, chaveAviso]);

  useEffect(() => {
    setMontado(true);
    void atualizar();
    const onChange = () => { void atualizar(); };
    const timer = window.setInterval(() => {
      if (!document.hidden) void atualizar();
    }, 10000);
    window.addEventListener("focus", onChange);
    window.addEventListener("online", onChange);
    window.addEventListener("cestas:clientes-offline-alterados", onChange);
    window.addEventListener(EVENTO_ENTREGAS_OFFLINE, onChange);
    window.addEventListener(EVENTO_VENDAS_OFFLINE, onChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onChange);
      window.removeEventListener("online", onChange);
      window.removeEventListener("cestas:clientes-offline-alterados", onChange);
      window.removeEventListener(EVENTO_ENTREGAS_OFFLINE, onChange);
      window.removeEventListener(EVENTO_VENDAS_OFFLINE, onChange);
    };
  }, [atualizar]);

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fecharRef.current?.focus();
    const fecharNoEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setAberto(false);
        botaoRef.current?.focus();
      }
    };
    document.addEventListener("keydown", fecharNoEscape);
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener("keydown", fecharNoEscape);
    };
  }, [aberto]);

  const fechar = () => {
    setAberto(false);
    botaoRef.current?.focus();
  };

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        onClick={() => { void atualizar(); setAberto(true); }}
        aria-label={resumo.total
          ? `Notificações: ${resumo.total} operação(ões) aguardando atenção`
          : "Abrir notificações"}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-white/15 bg-white/[0.10] text-white backdrop-blur transition active:scale-95"
      >
        <Bell size={19} aria-hidden="true" />
        {resumo.total > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-emerald-900 bg-amber-400 px-1 text-[9px] font-black text-emerald-950">
            {resumo.total > 99 ? "99+" : resumo.total}
          </span>
        )}
        {resumo.conflitos > 0 && (
          <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-emerald-900 bg-red-500" />
        )}
      </button>

      {montado && createPortal(
        <div className={aberto
          ? "fixed inset-0 z-[300] flex items-center justify-center px-3 py-5"
          : "hidden"} aria-hidden={!aberto}>
          <button
            type="button"
            tabIndex={aberto ? 0 : -1}
            aria-label="Fechar notificações"
            onClick={fechar}
            className="absolute inset-0 bg-[#071e13]/70 backdrop-blur-[5px]"
          />
          <section
            role="dialog"
            aria-modal={aberto}
            aria-labelledby="titulo-notificacoes-mobile"
            className="relative z-10 flex max-h-[min(88dvh,780px)] w-full max-w-[470px] flex-col overflow-hidden rounded-[26px] border border-white/30 bg-[#f7faf7] text-[#142018] shadow-[0_25px_95px_rgba(0,0,0,0.3)]"
          >
            <div className="shrink-0 bg-gradient-to-br from-[#064c30] to-[#0b7544] px-5 pb-5 pt-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100">
                    Cestas APP · Central operacional
                  </p>
                  <h2 id="titulo-notificacoes-mobile" className="mt-1 text-xl font-black">
                    Notificações
                  </h2>
                  <p className="mt-1 text-[11px] leading-5 text-emerald-100">
                    Pendências armazenadas neste aparelho. Fechar o modal não apaga os registros.
                  </p>
                </div>
                <button ref={fecharRef} type="button" onClick={fechar}
                  aria-label="Fechar modal de notificações"
                  className="rounded-xl border border-white/25 bg-white/10 p-2 text-white hover:bg-white/20">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto overscroll-contain px-4 pb-5 pt-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-3 text-center">
                  <p className="text-lg font-black text-amber-900">{resumo.preparacao}</p>
                  <p className="text-[9px] font-bold text-amber-800">Em preparação</p>
                </div>
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-2 py-3 text-center">
                  <p className="text-lg font-black text-sky-900">{resumo.pendentes}</p>
                  <p className="text-[9px] font-bold text-sky-800">Aguardando envio</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 px-2 py-3 text-center">
                  <p className="text-lg font-black text-red-900">{resumo.conflitos}</p>
                  <p className="text-[9px] font-bold text-red-800">Revisar</p>
                </div>
              </div>

              {resumo.total === 0 && !erroLocal && (
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <ShieldCheck size={19} className="mt-0.5 shrink-0 text-emerald-700" />
                  <p className="text-xs font-semibold leading-5 text-emerald-900">
                    Sem operações locais pendentes de decisão ou sincronização.
                  </p>
                </div>
              )}
              {erroLocal && (
                <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
                  {erroLocal}
                </div>
              )}

              {resumo.vendas.filter(x => x.status === "rascunho").map(item => (
                <div key={item.id}
                  className="mt-4 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <ClipboardList size={17} className="shrink-0 text-amber-700" />
                    <strong className="text-xs">Venda aguardando conferência</strong>
                  </div>
                  <p className="mt-2 text-[11px] font-semibold">{item.clienteNome}</p>
                  <p className="mt-1 text-[10px] text-slate-600">
                    {item.dados.quantidade} cesta(s) · {item.dados.codigosVolume.length} de {item.dados.quantidade} volume(s) bipado(s)
                  </p>
                  <p className="mt-2 text-[10px] leading-5 text-amber-900">
                    A negociação já foi salva no aparelho, mas a entrega ainda precisa ser concluída.
                    Não existe venda nem baixa de estoque confirmada no banco.
                  </p>
                  <Link href={`/mobile/vendas/preparar?rotaClienteId=${item.dados.rotaClienteId}`}
                    onClick={fechar}
                    className="mt-3 block rounded-xl bg-emerald-700 px-4 py-3 text-center text-xs font-bold text-white">
                    Retomar a bipagem / conclusão
                  </Link>
                  <p className="mt-2 text-[9px] text-slate-500">
                    Abra este link com internet. Depois de carregada a tela, a conferência local funciona sem sinal.
                  </p>
                </div>
              ))}

              <div className="mt-4 space-y-3">
                <SincronizadorVendasRotaOffline empresaId={empresaId} usuarioId={usuarioId} />
                <SincronizadorOfflineEntregas empresaId={empresaId} usuarioId={usuarioId} />
                <SincronizadorOfflineClientes empresaId={empresaId} usuarioId={usuarioId} />
              </div>
              {resumo.conflitos > 0 && (
                <p className="mt-4 flex items-start gap-2 text-[10px] leading-5 text-red-800">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  Operações rejeitadas permanecem no dispositivo até serem revisadas.
                </p>
              )}
              <button type="button" onClick={fechar}
                className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700">
                Fechar e continuar trabalhando
              </button>
            </div>
          </section>
        </div>, document.body
      )}
    </>
  );
}
