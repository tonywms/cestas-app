"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowRight, Banknote, CalendarDays, CreditCard, ReceiptText, WalletCards } from "lucide-react";
import { prepararVendaDireta } from "./actions";

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(valor);
}
function numeroMoeda(texto: string) {
  const valor = Number(texto.includes(",") ?
    texto.replaceAll(".","").replace(",",".") : texto);
  return Number.isFinite(valor) ? valor : NaN;
}
type Modalidade = "AVISTA" | "SALDO_ABERTO" | "CREDIARIO";
const formas = [
  { id:"PIX",label:"PIX" },{ id:"DINHEIRO",label:"Dinheiro" },
  { id:"CARTAO",label:"Cartão" },{ id:"TRANSFERENCIA",label:"Transferência" },
  { id:"OUTRO",label:"Outro" },
];

export default function VendaDiretaFinanceiroForm({
  clienteId,tipoCestaId,nomeCesta,valorUnitario,limite,primeiroVencimento,
}:{
  clienteId:number;tipoCestaId:number;nomeCesta:string;valorUnitario:number;
  limite:number;primeiroVencimento:string;
}){
  const [state,action,pending] = useActionState(prepararVendaDireta,{success:false,message:""});
  const [quantidade,setQuantidade] = useState(1);
  const [modalidade,setModalidade] = useState<Modalidade>("AVISTA");
  const [entrada,setEntrada] = useState("0");
  const [parcelas,setParcelas] = useState(4);
  const [forma,setForma] = useState("PIX");
  const total = useMemo(()=>Math.round(valorUnitario*quantidade*100)/100,[valorUnitario,quantidade]);
  const entradaValor = numeroMoeda(entrada);
  const recebido = modalidade==="AVISTA" ? total : entradaValor;
  const saldo = Number.isFinite(recebido) ? Math.max(0,Math.round((total-recebido)*100)/100) : NaN;
  const valido = limite>0 && quantidade>=1 && quantidade<=limite && total>0 &&
    (modalidade==="AVISTA" || (Number.isFinite(entradaValor) && entradaValor>=0 && entradaValor<total)) &&
    (modalidade!=="CREDIARIO" || (parcelas>=1 && parcelas<=120));
  const parcela = modalidade==="CREDIARIO"&&parcelas>0 ? saldo/parcelas : 0;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="cliente_id" value={clienteId}/>
      <input type="hidden" name="tipo_cesta_id" value={tipoCestaId}/>
      <input type="hidden" name="tipo_venda" value={modalidade}/>

      <section className="rounded-[23px] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-emerald-800">
          <ReceiptText size={19}/><p className="text-[11px] font-black">1. Cesta e valor da negociação</p>
        </div>
        <h2 className="mt-3 text-lg font-black">{nomeCesta}</h2>
        <div className="mt-2 flex justify-between text-[12px] text-slate-600">
          <span>Valor unitário cadastrado</span><strong>{moeda(valorUnitario)}</strong>
        </div>
        <label htmlFor="v107-quantidade" className="mt-4 block text-[10px] font-black text-slate-700">
          Quantidade a vender
        </label>
        <input id="v107-quantidade" name="quantidade" type="number" min={1} max={Math.max(1,limite)}
          value={quantidade} onChange={e=>setQuantidade(Math.max(1,Math.min(limite||1,Number(e.target.value)||1)))}
          className="mt-2 h-[52px] w-full rounded-[14px] border border-slate-200 bg-white px-4 text-base font-bold"/>
        <p className="mt-2 text-[10px] leading-4 text-slate-500">
          Até {limite} cesta(s) deste tipo disponíveis para uma entrega nesta versão.
        </p>
        <div className="mt-4 rounded-[17px] bg-emerald-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Valor total da venda</p>
          <p className="mt-1 text-3xl font-black text-emerald-900">{moeda(total)}</p>
        </div>
      </section>

      <section className="rounded-[23px] bg-white p-5 shadow-sm">
        <p className="text-[11px] font-black text-emerald-800">2. Condição da venda</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {([
            ["AVISTA","À vista",Banknote],
            ["SALDO_ABERTO","Saldo aberto",WalletCards],
            ["CREDIARIO","Crediário",CreditCard],
          ] as const).map(([id,nome,Icone])=>(
            <button key={id} type="button" onClick={()=>setModalidade(id)}
              aria-pressed={modalidade===id}
              className={`min-h-[100px] rounded-[16px] border p-3 text-left transition ${modalidade===id?
                "border-emerald-600 bg-emerald-50 text-emerald-950":"border-slate-200 text-slate-600"}`}>
              <Icone size={20}/>
              <p className="mt-3 text-[10px] font-black">{nome}</p>
            </button>
          ))}
        </div>
        <label htmlFor="v107-forma" className="mt-5 block text-[10px] font-black text-slate-700">
          {modalidade==="AVISTA"?"Forma de pagamento":"Forma do valor recebido hoje"}
        </label>
        <select id="v107-forma" name="forma_pagamento" value={forma}
          onChange={e=>setForma(e.target.value)} required
          className="mt-2 h-[52px] w-full rounded-[14px] border border-slate-200 bg-white px-4 text-[12px] font-bold">
          {formas.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}
        </select>

        {modalidade!=="AVISTA"&&(
          <>
            <label htmlFor="v107-entrada" className="mt-5 block text-[10px] font-black text-slate-700">
              Valor recebido agora / entrada (R$)
            </label>
            <input id="v107-entrada" name="valor_entrada" value={entrada} inputMode="decimal" required
              onChange={e=>setEntrada(e.target.value)}
              className="mt-2 h-[52px] w-full rounded-[14px] border border-slate-200 px-4 text-[13px] font-black"
              placeholder="0,00"/>
            {modalidade==="CREDIARIO"&&(
              <>
                <label htmlFor="v107-parcelas" className="mt-5 block text-[10px] font-black text-slate-700">
                  Quantidade de parcelas
                </label>
                <input id="v107-parcelas" name="quantidade_parcelas" type="number" min={1} max={120}
                  value={parcelas} onChange={e=>setParcelas(Math.max(1,Math.min(120,Number(e.target.value)||1)))}
                  required className="mt-2 h-[52px] w-full rounded-[14px] border border-slate-200 px-4 text-[13px] font-black"/>
              </>
            )}
            <label htmlFor="v107-vencimento" className="mt-5 flex items-center gap-2 text-[10px] font-black text-slate-700">
              <CalendarDays size={14}/>
              {modalidade==="CREDIARIO"?"Primeiro vencimento":"Próxima visita sugerida"}
            </label>
            <input id="v107-vencimento" type="date" name="primeiro_vencimento"
              defaultValue={primeiroVencimento} required
              className="mt-2 h-[52px] w-full rounded-[14px] border border-slate-200 px-4 text-[12px] font-bold"/>
          </>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-[16px] bg-[#f5faf6] p-3">
            <p className="text-[9px] text-slate-500">Recebido na venda</p>
            <p className="mt-1 text-[17px] font-black text-emerald-800">{Number.isFinite(recebido)?moeda(recebido):"Revisar"}</p>
          </div>
          <div className="rounded-[16px] bg-[#f5faf6] p-3">
            <p className="text-[9px] text-slate-500">Saldo do cliente</p>
            <p className="mt-1 text-[17px] font-black text-emerald-800">{Number.isFinite(saldo)?moeda(saldo):"Revisar"}</p>
          </div>
        </div>
        {modalidade==="CREDIARIO"&&(
          <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-[11px] font-bold text-amber-900">
            Previsão: {parcelas} parcela(s) de aproximadamente {moeda(parcela)}, com ajuste de centavos na última.
          </p>
        )}
        <label htmlFor="v107-obs" className="mt-4 block text-[10px] font-black text-slate-700">Observações (opcional)</label>
        <textarea id="v107-obs" name="observacao" maxLength={500} rows={2}
          className="mt-2 w-full rounded-[14px] border border-slate-200 p-3 text-[12px]"
          placeholder="Informações importantes da negociação"/>
      </section>

      {state.message&&(
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[11px] font-bold text-red-800">{state.message}</p>
      )}
      {limite===0&&(
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[11px] font-semibold text-amber-900">
          Nenhuma cesta recebida está disponível neste momento. Volte ao estoque móvel.
        </p>
      )}
      <button type="submit" disabled={pending||!valido}
        className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#176f3c] px-3 text-[12px] font-black text-white disabled:opacity-40">
        {pending?"Salvando condições...":"Confirmar negociação e ir para bipagem"}<ArrowRight size={18}/>
      </button>
      <p className="text-center text-[10px] leading-5 text-slate-500">
        Esta etapa salva apenas a intenção da venda. Estoque, pagamento e contrato serão lançados juntos ao confirmar a entrega.
      </p>
    </form>
  );
}
