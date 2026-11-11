"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShieldCheck, X } from "lucide-react";

type Props={
  protocolo:number;
  saldoPendente:number;
  destinoFechar:string;
};
const moeda=(n:number)=>new Intl.NumberFormat("pt-BR",{
  style:"currency",currency:"BRL"
}).format(n);
export default function ModalPrestacaoEnviadaV118({
  protocolo,saldoPendente,destinoFechar
}:Props){
  const router=useRouter();
  const [aberto,setAberto]=useState(true);
  const fecharRef=useRef<HTMLButtonElement>(null);
  function fechar(){
    setAberto(false);
    router.replace(destinoFechar,{scroll:false});
  }
  useEffect(()=>{
    const overflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    fecharRef.current?.focus();
    const aoEsc=(e:KeyboardEvent)=>{
      if(e.key==="Escape"){
        setAberto(false);
        router.replace(destinoFechar,{scroll:false});
      }
    };
    document.addEventListener("keydown",aoEsc);
    return ()=>{
      document.body.style.overflow=overflow;
      document.removeEventListener("keydown",aoEsc);
    };
  },[destinoFechar,router]);
  if(!aberto)return null;
  return <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-[3px]">
    <div role="dialog" aria-modal="true" aria-labelledby="prestacao-v118-titulo"
      aria-describedby="prestacao-v118-descricao"
      className="relative my-auto w-full max-w-[390px] rounded-[28px] bg-white px-6 py-7 text-center shadow-2xl">
      <button type="button" onClick={fechar} aria-label="Fechar"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <X size={18}/>
      </button>
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle2 size={42}/>
      </div>
      <p className="mt-5 text-[10px] font-black uppercase tracking-widest text-emerald-700">
        Prestação enviada ao CD
      </p>
      <h2 id="prestacao-v118-titulo" className="mt-2 text-xl font-black text-slate-950">
        Acerto enviado com sucesso!
      </h2>
      <p id="prestacao-v118-descricao" className="mt-3 text-[12px] leading-6 text-slate-600">
        O CD recebeu sua declaração. O saldo só será quitado depois que um funcionário autorizado confirmar os repasses.
      </p>
      <div className="mt-5 rounded-[18px] border border-emerald-200 bg-emerald-50 p-4 text-left">
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Protocolo da prestação</p>
        <p className="mt-1 text-lg font-black text-emerald-950">Nº {protocolo}</p>
        <p className="mt-3 text-[10px] font-bold text-emerald-700">Saldo ainda a conferir pelo CD</p>
        <p className="mt-1 text-2xl font-black tabular-nums text-emerald-950">{moeda(saldoPendente)}</p>
      </div>
      <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-left text-[10px] leading-5 text-slate-600">
        <ShieldCheck size={18} className="shrink-0 text-emerald-700"/>
        PIX e cartão da empresa são conciliados diretamente pelo CD e não são cobrados de você novamente.
      </p>
      <button type="button" ref={fecharRef} onClick={fechar}
        className="mt-6 min-h-[52px] w-full rounded-xl bg-emerald-800 px-5 text-[12px] font-black text-white">
        Entendi, continuar
      </button>
    </div>
  </div>;
}
