"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  confirmarVendaOffline, EVENTO_VENDAS_OFFLINE, listarVendasRotaOffline,
  marcarConflitoVendaOffline, type VendaRotaOffline,
} from "@/lib/mobile/offline-vendas-rota";

export default function SincronizadorVendasRotaOffline({
  empresaId, usuarioId, compacto=false,
}: { empresaId:string; usuarioId:string; compacto?:boolean }) {
  const processando=useRef(false);
  const [registros,setRegistros]=useState<VendaRotaOffline[]>([]);
  const [executando,setExecutando]=useState(false);
  const [mensagem,setMensagem]=useState("");
  const [ultimaVenda,setUltimaVenda]=useState<number|null>(null);

  const consultar=useCallback(async()=>{
    const itens=await listarVendasRotaOffline(empresaId,usuarioId);
    setRegistros(itens);
    return itens;
  },[empresaId,usuarioId]);

  const sincronizar=useCallback(async()=>{
    if(processando.current)return;
    processando.current=true;
    try {
      const registrosAtuais=await consultar();
      if (!registrosAtuais.some(x=>x.status==="pendente")) return;
      if (!navigator.onLine) {
        setMensagem("Sem internet: negociações e bipagens permanecem salvas neste aparelho.");
        return;
      }
      const health=await fetch("/api/mobile/conectividade?vo=" + Date.now(),{
        credentials:"same-origin",cache:"no-store",signal:AbortSignal.timeout(6000),
      });
      if(!health.ok){setMensagem("Aguardando conexão com o banco. Nada foi perdido.");return;}
      setExecutando(true);
      setMensagem("Validando e transmitindo venda, recebimento e entrega ao Supabase...");
      let confirmadas=0;
      for(const item of registrosAtuais){
        if(item.status!=="pendente")continue;
        let resposta:Response;
        try{
          resposta=await fetch("/api/mobile/offline/vendas-rota",{
            method:"POST",credentials:"same-origin",cache:"no-store",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify(item),signal:AbortSignal.timeout(30000),
          });
        }catch{
          setMensagem("Conexão interrompida durante envio. O registro permanece seguro para nova tentativa.");
          break;
        }
        const json:unknown=await resposta.json().catch(()=>null);
        const body=json&&typeof json==="object"?json as Record<string,unknown>:{};
        if(resposta.ok && body.ok===true && body.operacaoId===item.id &&
           typeof body.vendaId==="number" && body.vendaId>0 &&
           typeof body.entregaId==="number" && body.entregaId>0){
          await confirmarVendaOffline(item.id);
          setUltimaVenda(body.vendaId);
          confirmadas+=1;
        }else if([400,403,409,422].includes(resposta.status)){
          await marcarConflitoVendaOffline(item.id,
            typeof body.mensagem==="string"?body.mensagem:"Operação necessita revisão.");
          setMensagem("Há uma operação com conflito. Nenhuma baixa parcial dessa operação foi aplicada.");
        }else{
          setMensagem(resposta.status===401
            ? "Sessão expirada: entre novamente. A fila continua salva."
            : "Servidor indisponível. A operação permanece na fila.");
          break;
        }
      }
      await consultar();
      if(confirmadas){
        setMensagem(confirmadas===1
          ? "1 venda e entrega confirmadas no banco, sem baixa duplicada."
          : `${confirmadas} vendas e entregas confirmadas no banco.`);
      }
    }catch{
      setMensagem("Não foi possível sincronizar agora. Não limpe os dados do navegador.");
    }finally{
      setExecutando(false);
      processando.current=false;
    }
  },[consultar]);

  useEffect(()=>{
    void sincronizar();
    const evento=()=>{void sincronizar()};
    const id=window.setInterval(()=>{if(!document.hidden)void sincronizar()},8000);
    window.addEventListener("online",evento);
    window.addEventListener("focus",evento);
    window.addEventListener(EVENTO_VENDAS_OFFLINE,evento);
    return()=>{
      window.clearInterval(id);
      window.removeEventListener("online",evento);
      window.removeEventListener("focus",evento);
      window.removeEventListener(EVENTO_VENDAS_OFFLINE,evento);
    };
  },[sincronizar]);

  const pendentes=registros.filter(x=>x.status==="pendente");
  const rascunhos=registros.filter(x=>x.status==="rascunho");
  const conflitos=registros.filter(x=>x.status==="conflito");
  if(!registros.length&&!mensagem&&!executando)return null;
  return (
    <section role="status" aria-live="polite"
      className={`rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm ${compacto?"mx-5 my-3":"my-4"}`}>
      <div className="flex items-center justify-between gap-2">
        <strong className="text-xs">Vendas e entregas offline</strong>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black">
          {executando?"SINCRONIZANDO":conflitos.length?"REVISAR":pendentes.length?"PENDENTE":rascunhos.length?"EM PREENCHIMENTO":"CONCLUÍDO"}
        </span>
      </div>
      {mensagem&&<p className="mt-2 text-[11px] leading-5">{mensagem}</p>}
      <p className="mt-2 text-[10px] font-semibold">
        {rascunhos.length} em preparação · {pendentes.length} pendente(s) · {conflitos.length} conflito(s)
      </p>
      {registros.map(x=><div key={x.id} className="mt-2 rounded-lg bg-white p-2 text-[10px]">
        <strong>{x.clienteNome} — {x.dados.quantidade} cesta(s)</strong>
        <p>{x.status==="rascunho"?"Bipagem / confirmação ainda pendente no aparelho":x.status==="pendente"?"Aguardando envio":"Revisão obrigatória"}</p>
        {x.erro&&<p className="font-semibold text-red-700">{x.erro}</p>}
      </div>)}
      {pendentes.length>0&&<button type="button" onClick={()=>void sincronizar()} disabled={executando}
        className="mt-3 rounded-xl border border-amber-400 bg-white px-3 py-2 text-[11px] font-bold disabled:opacity-40">
        Verificar e sincronizar
      </button>}
      {ultimaVenda&&<p className="mt-2 text-[10px] font-bold text-emerald-900">
        Venda nº {ultimaVenda} confirmada no Supabase.
      </p>}
      {rascunhos.length>0&&<p className="mt-2 text-[10px]">
        Existe uma bipagem iniciada neste navegador. Conclua na tela da venda antes de aguardar a sincronização.
      </p>}
      {conflitos.length>0&&<p className="mt-2 text-[10px]">
        Operações rejeitadas permanecem preservadas; solicite revisão do gestor.
      </p>}
    </section>
  );
}
