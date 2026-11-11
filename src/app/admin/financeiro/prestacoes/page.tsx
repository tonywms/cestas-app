export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Banknote, Building2, CheckCircle2, CreditCard, ReceiptText, ShieldCheck, Wallet } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { configurarPrestacao,conferirPrestacao,classificarRecebimentoAnterior } from "./actions";

type Valores={dinheiro?:number;pix_empresa?:number;pix_entregador?:number;cartao_empresa?:number;cartao_entregador?:number;sem_classificacao?:number;total_recebido?:number;quantidade_movimentos?:number};
type Props={searchParams:Promise<{erro?:string;configurado?:string;conferido?:string;classificado?:string}>};
const moeda=(v:unknown)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v??0));
const numero=(v:unknown)=>Number(v??0);
function Entrada({name,label,esperado,valor}:{name:string;label:string;esperado:unknown;valor?:unknown}){
  return <label className="text-[10px] font-black text-slate-700">
    {label}<span className="ml-1 font-semibold text-emerald-700">· {moeda(esperado)}</span>
    <input type="number" min={0} step="0.01" name={name} defaultValue={valor==null?"0":String(valor)}
      className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-bold"/>
  </label>;
}
export default async function PrestacoesCdPage({searchParams}:Props){
  const usuario=await getCurrentUserProfile();
  if(!usuario||!usuario.ativo)redirect("/");
  const autorizado=usuario.isPlatformAdmin||temPermissao(usuario.permissoes,PERMISSOES.FINANCEIRO_AUDITAR);
  if(!autorizado)redirect("/admin/financeiro");
  const permiteConfig=usuario.isPlatformAdmin||temPermissao(usuario.permissoes,PERMISSOES.EMPRESA_CONFIGURAR);
  const params=await searchParams;
  const supabase=await createClient();
  const [config,prest,usuarios,antigasVendas,antigasCobrancas]=await Promise.all([
    supabase.from("empresa_configuracoes")
      .select("destino_pix_v108,destino_cartao_v108").eq("empresa_id",usuario.empresa.id).maybeSingle(),
    supabase.from("prestacoes_contas_v108")
      .select("id,data_referencia,entregador_id,status,valores_esperados,dinheiro_declarado,pix_repassado,cartao_repassado,comprovante_pix,comprovante_cartao,observacao_entregador,observacao_cd,conferido_at,pix_empresa_conciliado,cartao_empresa_conciliado")
      .eq("empresa_id",usuario.empresa.id).order("data_referencia",{ascending:false}).order("id",{ascending:false}).limit(100),
    supabase.from("usuarios").select("id,nome").eq("ativo",true).limit(200),
    supabase.from("venda_recebimentos")
      .select("id,valor,forma_pagamento,created_at,recebido_por")
      .eq("empresa_id",usuario.empresa.id).is("destino_recebimento_v108",null)
      .neq("forma_pagamento","DINHEIRO").order("id",{ascending:false}).limit(60),
    supabase.from("pagamentos")
      .select("id,valor,forma_pagamento,created_at,recebido_por")
      .eq("empresa_id",usuario.empresa.id).is("destino_recebimento_v108",null)
      .neq("forma_pagamento","DINHEIRO").order("id",{ascending:false}).limit(60),
  ]);
  if(config.error||prest.error||usuarios.error||antigasVendas.error||antigasCobrancas.error)return <main className="p-6">Não foi possível consultar as prestações do CD. Confirme as permissões e atualize.</main>;
  const nomes=new Map((usuarios.data??[]).map(u=>[u.id,u.nome]));
  const cards=prest.data??[];
  const pendentes=[
    ...(antigasVendas.data??[]).map(r=>({...r,origem:"VENDA" as const})),
    ...(antigasCobrancas.data??[]).map(r=>({...r,origem:"COBRANCA" as const})),
  ].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
  return <main className="min-h-dvh bg-[#eef4ef] text-[#142018]">
    <div className="mx-auto max-w-[1160px] space-y-6 p-5 md:p-8">
      <header className="rounded-[27px] bg-[linear-gradient(130deg,#0e5731,#187b43)] p-6 text-white">
        <Link href="/admin/financeiro" className="inline-flex items-center gap-2 text-xs font-bold text-white/80"><ArrowLeft size={16}/> Voltar ao financeiro</Link>
        <div className="mt-5 flex items-center gap-3"><Wallet size={27}/><h1 className="text-2xl font-black">Prestação de contas do CD</h1></div>
        <p className="mt-3 max-w-2xl text-[12px] leading-6 text-white/80">
          Confira dinheiro físico e repasses do entregador. PIX e cartão recebidos pela própria empresa exigem conciliação bancária ou da maquineta — não um segundo repasse.
        </p>
      </header>
      {params.configurado&&<p role="status" className="rounded-xl bg-emerald-50 p-4 text-xs font-black text-emerald-800">Destinatários atualizados. A configuração vale somente para novos recebimentos; os anteriores mantêm a origem original.</p>}
      {params.classificado&&<p role="status" className="rounded-xl bg-emerald-50 p-4 text-xs font-black text-emerald-800">Titular confirmado e registrado na auditoria. O histórico original foi preservado.</p>}
      {params.conferido&&<p role="status" className="rounded-xl bg-emerald-50 p-4 text-xs font-black text-emerald-800">Prestação conferida e registrada com auditoria.</p>}
      {params.erro&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-xs font-black text-red-800">{params.erro.slice(0,320)}</p>}

      <section className="rounded-[25px] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Building2 size={24} className="text-emerald-800"/>
          <div><h2 className="text-[16px] font-black">Titular dos recebimentos</h2><p className="mt-1 text-xs text-slate-500">O dinheiro sempre fica com o entregador até o acerto presencial no CD.</p></div>
        </div>
        <form action={configurarPrestacao} className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="text-[11px] font-black">Destino do PIX
            <select name="pix" disabled={!permiteConfig} defaultValue={config.data?.destino_pix_v108??"EMPRESA"}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold">
              <option value="EMPRESA">Chave/conta da empresa</option>
              <option value="ENTREGADOR">Chave/conta do entregador (repassa)</option>
            </select>
          </label>
          <label className="text-[11px] font-black">Destino do cartão
            <select name="cartao" disabled={!permiteConfig} defaultValue={config.data?.destino_cartao_v108??"EMPRESA"}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold">
              <option value="EMPRESA">Maquineta da empresa</option>
              <option value="ENTREGADOR">Maquineta do entregador (repassa)</option>
            </select>
          </label>
          <button disabled={!permiteConfig} type="submit" className="h-12 rounded-xl bg-emerald-800 px-5 text-[11px] font-black text-white disabled:opacity-40">
            Salvar configuração
          </button>
        </form>
        <p className="mt-3 text-[10px] leading-5 text-slate-500">A propriedade fica registrada em cada recebimento. Mudanças futuras não reclassificam recebimentos históricos.</p>
      </section>

      {pendentes.length>0&&<section className="rounded-[25px] border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-[16px] font-black text-amber-950">Recebimentos antigos sem titular identificado</h2>
        <p className="mt-2 text-[11px] leading-5 text-amber-900">
          Confirme com o banco ou comprovante quem recebeu cada transação anterior à V108.
          Não atribuiremos pagamentos automaticamente ao entregador.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {pendentes.map(item=><form action={classificarRecebimentoAnterior} key={`${item.origem}-${item.id}`}
            className="rounded-xl border border-amber-100 bg-white p-4">
            <p className="text-[10px] font-black text-amber-800">{item.origem==="VENDA"?"Venda":"Cobrança"} nº {item.id}</p>
            <p className="mt-1 text-base font-black">{moeda(item.valor)} · {item.forma_pagamento}</p>
            <p className="mt-1 text-[10px] text-slate-500">{nomes.get(item.recebido_por)??"Entregador"} · {String(item.created_at).slice(0,10)}</p>
            <input type="hidden" name="origem" value={item.origem}/>
            <input type="hidden" name="id" value={item.id}/>
            <label className="mt-3 block text-[10px] font-black text-slate-700">Quem recebeu este pagamento?
              <select name="destino" defaultValue="" required className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs">
                <option value="" disabled>Confirmar titular</option>
                <option value="EMPRESA">Empresa / dono</option>
                <option value="ENTREGADOR">Entregador</option>
              </select>
            </label>
            <button className="mt-3 h-10 w-full rounded-lg bg-amber-800 text-[11px] font-black text-white">Confirmar titular</button>
          </form>)}
        </div>
      </section>}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">Conciliação</p>
            <h2 className="mt-1 text-xl font-black">Prestações recebidas</h2></div>
          <p className="rounded-full bg-white px-4 py-2 text-xs font-bold text-emerald-800">{cards.length} registro(s)</p>
        </div>
        {cards.length===0&&<div className="rounded-[24px] bg-white p-8 text-center">
          <ReceiptText className="mx-auto text-emerald-700" size={28}/>
          <p className="mt-3 font-black">Nenhuma prestação enviada</p>
          <p className="mt-2 text-xs text-slate-500">O entregador envia pelo coletor em Minha prestação de contas. O CD confere por aqui.</p>
        </div>}
        <div className="grid gap-4">
        {cards.map(p=>{
          const e=(p.valores_esperados??{}) as Valores;
          const aguardando=p.status==="ENVIADA";
          return <article key={p.id} className="rounded-[25px] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-[10px] font-black text-emerald-700">PRESTAÇÃO Nº {p.id} · {p.data_referencia}</p>
                <h3 className="mt-1 text-[16px] font-black">{nomes.get(p.entregador_id)??"Entregador"}</h3></div>
              <span className={`rounded-full px-3 py-2 text-[10px] font-black ${p.status==="CONFERIDA"?"bg-emerald-50 text-emerald-800":p.status==="COM_DIVERGENCIA"?"bg-red-50 text-red-800":"bg-amber-50 text-amber-800"}`}>{p.status.replaceAll("_"," ")}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Resumo titulo="Dinheiro no entregador" valor={e.dinheiro??0} icone={<Banknote size={17}/>}/>
              <Resumo titulo="PIX do entregador" valor={e.pix_entregador??0} icone={<Wallet size={17}/>}/>
              <Resumo titulo="Cartão do entregador" valor={e.cartao_entregador??0} icone={<CreditCard size={17}/>}/>
              <Resumo titulo="Recebimentos corporativos" valor={numero(e.pix_empresa)+numero(e.cartao_empresa)} icone={<Building2 size={17}/>}/>
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-700">
              <strong>Declarado pelo entregador:</strong> dinheiro {moeda(p.dinheiro_declarado)}, PIX {moeda(p.pix_repassado)}, cartão {moeda(p.cartao_repassado)}.
              {(p.comprovante_pix||p.comprovante_cartao)&&<p className="mt-2 break-all text-slate-600">Referências: PIX {p.comprovante_pix??"—"} · Cartão {p.comprovante_cartao??"—"}</p>}
              {p.observacao_entregador&&<p className="mt-2">Observação: {p.observacao_entregador}</p>}
              {p.observacao_cd&&<p className="mt-2 font-bold text-amber-900">CD: {p.observacao_cd}</p>}
            </div>
            {aguardando&&<form action={conferirPrestacao} className="mt-5 space-y-4 rounded-[20px] border border-emerald-100 bg-[#f9fcfa] p-4">
              <input type="hidden" name="id" value={p.id}/>
              <h4 className="text-[13px] font-black">Conferência do CD — informe o que foi efetivamente confirmado</h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Entrada name="dinheiro" label="Dinheiro entregue ao CD" esperado={e.dinheiro}/>
                <Entrada name="pix" label="PIX repassado pelo entregador" esperado={e.pix_entregador}/>
                <Entrada name="cartao" label="Cartão repassado pelo entregador" esperado={e.cartao_entregador}/>
                <Entrada name="pix_empresa" label="PIX creditado no banco da empresa" esperado={e.pix_empresa}/>
                <Entrada name="cartao_empresa" label="Cartão da maquineta corporativa" esperado={e.cartao_empresa}/>
                <Entrada name="taxa_cartao" label="Taxa autorizada da maquineta do entregador" esperado={0}/>
              </div>
              <label className="block text-[11px] font-black text-slate-700">Observações e divergências
                <textarea rows={2} maxLength={1500} name="observacao" placeholder="Ex.: cartão com liquidação pendente; caixa conferido; divergência de R$ 20."
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-[11px]"/>
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="min-h-[48px] flex-1 rounded-xl bg-emerald-800 px-4 text-[11px] font-black text-white">
                  Registrar conferência
                </button>
                <button type="submit" name="devolver" value="1" className="min-h-[48px] rounded-xl border border-amber-200 bg-amber-50 px-4 text-[11px] font-black text-amber-900">
                  Devolver para correção
                </button>
              </div>
              <p className="text-[10px] text-slate-500">O CD deve conferir extrato/maquineta e dinheiro físico antes de informar valores. A prestação não movimenta estoque.</p>
            </form>}
            {p.status==="CONFERIDA"&&<p className="mt-4 flex items-center gap-2 text-[11px] font-black text-emerald-800"><ShieldCheck size={16}/> Conciliado pelo CD</p>}
          </article>;
        })}
        </div>
      </section>
    </div>
  </main>;
}
function Resumo({titulo,valor,icone}:{titulo:string;valor:number;icone:React.ReactNode}){
  return <div className="rounded-xl border border-emerald-50 bg-emerald-50/60 p-3">
    <div className="flex items-center gap-2 text-emerald-800">{icone}<p className="text-[10px] font-semibold">{titulo}</p></div>
    <p className="mt-2 text-lg font-black text-emerald-950">{moeda(valor)}</p>
  </div>;
}
