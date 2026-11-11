export const instant = false;

// V109 | Centro de conferência do CD: repasse do entregador != crédito corporativo.
// Não vincular esta prestação a carga, rota ou saldo físico.
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import {
  ArrowLeft, Banknote, Building2, CheckCircle2, CreditCard,
  FileCheck2, Landmark, ReceiptText, ShieldCheck, Wallet
} from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import {
  configurarPrestacao, classificarRecebimentoAnterior,
  registrarRepasseV109, conciliarCreditoEmpresaV109
} from "./actions";

type Valores = {
  dinheiro?:number; pix_empresa?:number; pix_entregador?:number;
  cartao_empresa?:number; cartao_entregador?:number; total?:number; quantidade?:number;
};
type Item = {
  id:number; origem:string; origem_id:number; cliente_nome:string;
  cliente_id:number; recebido_at:string; forma:string; destino:string;
  valor:number; conciliado_em:string|null; referencia_conciliacao:string|null;
};
type Repasse = {
  id:number; forma:string; valor:number; taxa_cartao_autorizada:number;
  referencia:string|null; confirmado_at:string;
};
type Prestacao = {
  id:number; entregador_nome:string; inicio:string; fim:string; status:string;
  enviado_at:string; valores_esperados:Valores;
  dinheiro_declarado:number; pix_declarado:number; cartao_declarado:number;
  dinheiro_conferido:number; pix_conferido:number; cartao_conferido:number;
  taxas_autorizadas:number;
  pendente_dinheiro:number; pendente_pix:number; pendente_cartao:number;
  itens_empresa_pendentes:number; total_itens:number;
  observacao_entregador:string|null; observacao_cd:string|null;
  itens:Item[]; repasses:Repasse[];
};
type Antigo = { id:number; valor:number; forma_pagamento:string; created_at:string;
  recebido_por:string; origem:"VENDA"|"COBRANCA" };
type Props={searchParams:Promise<{
  erro?:string;configurado?:string;classificado?:string;repasse?:string;
  conciliado?:string;inicio?:string;fim?:string;
}>};
const n=(v:unknown)=>Number.isFinite(Number(v))?Number(v):0;
const moeda=(v:unknown)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n(v));
const diaBr=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)?s.split("-").reverse().join("/"):s;
const dataHora=(s:string)=>new Date(s).toLocaleString("pt-BR",{timeZone:"America/Fortaleza",dateStyle:"short",timeStyle:"short"});

function Metrica({titulo,valor,detalhe}:{titulo:string;valor:unknown;detalhe?:string}) {
  return <div className="rounded-[17px] border border-emerald-100 bg-[#f7fbf8] p-4">
    <p className="text-[10px] font-bold text-slate-600">{titulo}</p>
    <p className="mt-2 text-xl font-black tabular-nums text-emerald-950">{moeda(valor)}</p>
    {detalhe&&<p className="mt-1 text-[9px] leading-4 text-slate-500">{detalhe}</p>}
  </div>;
}
function CampoCD({nome,rotulo,padrao="",nota}:{nome:string;rotulo:string;padrao?:string;nota?:string}){
  return <label className="block text-[10px] font-black text-slate-700">
    {rotulo}
    {nota&&<p className="mt-1 font-normal text-slate-500">{nota}</p>}
    <input name={nome} type={nome==="valor"||nome==="taxa_cartao"?"number":"text"}
      step={nome==="valor"||nome==="taxa_cartao"?"0.01":undefined}
      min={nome==="valor"||nome==="taxa_cartao"?0:undefined}
      maxLength={nome==="referencia"?250:undefined}
      defaultValue={padrao} required={nome!=="taxa_cartao"}
      placeholder={nome==="referencia"?"Código do comprovante ou conferência":"0,00"}
      className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-bold"/>
  </label>;
}

export default async function PrestacoesCdPage({searchParams}:Props) {
  const usuario=await getCurrentUserProfile();
  if(!usuario||!usuario.ativo)redirect("/");
  const podeConferir=usuario.isPlatformAdmin ||
    temPermissao(usuario.permissoes,PERMISSOES.FINANCEIRO_AUDITAR);
  if(!podeConferir)redirect("/admin/financeiro");
  const podeConfigurar=usuario.isPlatformAdmin ||
    temPermissao(usuario.permissoes,PERMISSOES.EMPRESA_CONFIGURAR);
  const params=await searchParams;
  const supabase=await createClient();
  const [configResp,prestResp,vendasResp,cobrancasResp,usuariosResp,historicoResp] = await Promise.all([
    supabase.from("empresa_configuracoes").select("destino_pix_v108,destino_cartao_v108")
      .eq("empresa_id",usuario.empresa.id).maybeSingle(),
    supabase.rpc("listar_prestacoes_v109",{p_empresa_id:usuario.empresa.id}),
    supabase.from("venda_recebimentos")
      .select("id,valor,forma_pagamento,created_at,recebido_por")
      .eq("empresa_id",usuario.empresa.id).is("destino_recebimento_v108",null)
      .in("forma_pagamento",["PIX","CARTAO"]).order("id",{ascending:false}).limit(100),
    supabase.from("pagamentos")
      .select("id,valor,forma_pagamento,created_at,recebido_por")
      .eq("empresa_id",usuario.empresa.id).is("destino_recebimento_v108",null)
      .in("forma_pagamento",["PIX","CARTAO"]).order("id",{ascending:false}).limit(100),
    supabase.from("usuarios").select("id,nome").eq("empresa_id",usuario.empresa.id).limit(200),
    supabase.from("prestacoes_contas_v108").select("id,status,data_referencia,valores_esperados")
      .eq("empresa_id",usuario.empresa.id).order("id",{ascending:false}).limit(10),
  ]);
  if(configResp.error||prestResp.error||vendasResp.error||cobrancasResp.error||usuariosResp.error||historicoResp.error) {
    return <main className="min-h-screen bg-slate-50 p-6 text-sm">
      <Link href="/admin/financeiro" className="font-bold text-emerald-800">Voltar ao Financeiro</Link>
      <h1 className="mt-4 text-xl font-black">Prestação de contas</h1>
      <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-900">
        {prestResp.error?.message||configResp.error?.message||"Erro ao consultar as prestações. Atualize a página."}
      </p>
    </main>;
  }
  const prestacoes=(Array.isArray(prestResp.data)?prestResp.data:[]) as Prestacao[];
  const nomes=new Map((usuariosResp.data??[]).map(u=>[u.id,u.nome]));
  const pendentes:Antigo[]=[
    ...(vendasResp.data??[]).map(v=>({...v,origem:"VENDA" as const})),
    ...(cobrancasResp.data??[]).map(v=>({...v,origem:"COBRANCA" as const})),
  ].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
  const inicio=/^\d{4}-\d{2}-\d{2}$/.test(params.inicio??"")?params.inicio:null;
  const fim=/^\d{4}-\d{2}-\d{2}$/.test(params.fim??"")?params.fim:null;
  const visiveis=prestacoes.filter(p=>(!inicio||p.fim>=inicio)&&(!fim||p.inicio<=fim));
  const saldos=visiveis.reduce((a,p)=>a+n(p.pendente_dinheiro)+n(p.pendente_pix)+n(p.pendente_cartao),0);
  return <main className="min-h-screen bg-[#eef4ef] text-[#142018]">
    <div className="mx-auto max-w-[1160px] space-y-5 p-4 md:p-8">
      <header className="rounded-[28px] bg-[linear-gradient(135deg,#0d5730,#187c43)] p-6 text-white">
        <Link href="/admin/financeiro" className="inline-flex items-center gap-2 text-xs font-bold text-white/80">
          <ArrowLeft size={17}/> Financeiro
        </Link>
        <div className="mt-5 flex items-center gap-3"><Landmark size={30}/><div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">Centro de distribuição · V109</p>
          <h1 className="mt-1 text-2xl font-black">Conciliação e prestação de contas</h1>
        </div></div>
        <p className="mt-3 max-w-3xl text-[12px] leading-6 text-white/90">
          O entregador declara o caixa. O CD confirma repasses reais e concilia PIX/cartão da empresa.
          Pagamentos já incluídos numa prestação não entram em outra.
        </p>
      </header>

      {(params.configurado||params.classificado||params.repasse||params.conciliado)&&
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-xs font-bold text-emerald-900">Operação registrada. O histórico e os saldos foram atualizados.</p>}
      {params.erro&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-900">{params.erro.slice(0,320)}</p>}

      <section className="grid gap-3 md:grid-cols-3">
        <Metrica titulo="Prestações encontradas" valor={visiveis.length} detalhe="Quantidade de protocolos, não valor monetário"/>
        <Metrica titulo="A repassar pelos entregadores" valor={saldos} detalhe="Somente saldos que o CD ainda não confirmou"/>
        <Metrica titulo="PIX/cartão corporativos não conciliados" valor={visiveis.reduce((a,p)=>a+n(p.itens_empresa_pendentes),0)}
          detalhe="Quantidade de transações para conferir"/>
      </section>

      <section className="rounded-[25px] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3"><Building2 className="text-emerald-800" size={23}/>
          <div><h2 className="text-base font-black">Destinatário de PIX e cartão</h2>
            <p className="mt-1 text-[11px] text-slate-500">Configuração vale somente para novos recebimentos; dinheiro físico permanece com o entregador até o CD receber.</p></div>
        </div>
        <form action={configurarPrestacao} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="text-[11px] font-black">PIX
            <select name="pix" disabled={!podeConfigurar} defaultValue={configResp.data?.destino_pix_v108??"EMPRESA"}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold">
              <option value="EMPRESA">Conta da empresa</option><option value="ENTREGADOR">Conta do entregador</option>
            </select>
          </label>
          <label className="text-[11px] font-black">Cartão
            <select name="cartao" disabled={!podeConfigurar} defaultValue={configResp.data?.destino_cartao_v108??"EMPRESA"}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold">
              <option value="EMPRESA">Maquineta da empresa</option><option value="ENTREGADOR">Maquineta do entregador</option>
            </select>
          </label>
          <button disabled={!podeConfigurar} className="min-h-12 rounded-xl bg-emerald-800 px-5 text-[11px] font-black text-white disabled:opacity-40">Salvar configuração</button>
        </form>
      </section>

      {pendentes.length>0&&<section className="rounded-[25px] border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-base font-black text-amber-950">Pagamentos antigos aguardando classificação</h2>
        <p className="mt-2 text-[11px] leading-5 text-amber-900">
          O destinatário não foi registrado na época. Confira o comprovante antes de vincular à empresa ou ao entregador.
          Este ajuste não altera valor nem cria um novo recebimento.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {pendentes.map(item=><form key={item.origem+"-"+item.id} action={classificarRecebimentoAnterior}
            className="rounded-xl bg-white p-4">
            <p className="text-[10px] font-black text-amber-800">{item.origem==="VENDA"?"Recebimento da venda":"Pagamento de parcela"} nº {item.id}</p>
            <p className="mt-2 text-base font-black">{moeda(item.valor)} · {item.forma_pagamento}</p>
            <p className="mt-1 text-[10px] text-slate-500">{nomes.get(item.recebido_por)??"Entregador"} · {diaBr(String(item.created_at).slice(0,10))}</p>
            <input type="hidden" name="origem" value={item.origem}/><input type="hidden" name="id" value={item.id}/>
            <select name="destino" defaultValue="" required className="mt-3 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs">
              <option value="" disabled>Confirmar quem recebeu</option>
              <option value="EMPRESA">Empresa / dono</option>
              <option value="ENTREGADOR">Entregador</option>
            </select>
            <button className="mt-2 h-10 w-full rounded-xl bg-amber-800 text-[11px] font-black text-white">Classificar com auditoria</button>
          </form>)}
        </div>
      </section>}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Fechamentos por período</p>
            <h2 className="mt-1 text-xl font-black">Prestações enviadas ao CD</h2></div>
          <form method="get" className="flex flex-wrap items-end gap-2 rounded-xl bg-white p-3 text-xs">
            <label>De <input type="date" name="inicio" defaultValue={inicio??""} className="ml-1 h-9 rounded-lg border border-slate-200 px-2"/></label>
            <label>Até <input type="date" name="fim" defaultValue={fim??""} className="ml-1 h-9 rounded-lg border border-slate-200 px-2"/></label>
            <button className="h-9 rounded-lg bg-emerald-800 px-3 font-black text-white">Filtrar</button>
          </form>
        </div>
        {visiveis.length===0&&<div className="rounded-[24px] bg-white p-8 text-center">
          <ReceiptText size={28} className="mx-auto text-emerald-700"/>
          <p className="mt-3 font-black">Nenhuma prestação neste período</p>
          <p className="mt-2 text-xs text-slate-500">Os recebimentos de vendas e cobranças aparecerão quando o entregador enviar o acerto pelo coletor.</p>
        </div>}
        {visiveis.map(p=>{
          const e=p.valores_esperados??{};
          const pendente=n(p.pendente_dinheiro)+n(p.pendente_pix)+n(p.pendente_cartao);
          const encerrada=p.status==="CONFERIDA";
          return <article key={p.id} className="space-y-4 rounded-[25px] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Protocolo nº {p.id} · {diaBr(p.inicio)} a {diaBr(p.fim)}</p>
                <h3 className="mt-1 text-lg font-black">{p.entregador_nome}</h3>
                <p className="mt-1 text-[10px] text-slate-500">Enviado em {dataHora(p.enviado_at)}</p>
              </div>
              <span className={`rounded-full px-3 py-2 text-[10px] font-black ${encerrada?"bg-emerald-50 text-emerald-800":"bg-amber-50 text-amber-900"}`}>
                {p.status.replaceAll("_"," ")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <Metrica titulo="Recebido dos clientes" valor={e.total}/>
              <Metrica titulo="Já confirmado pelo CD" valor={n(p.dinheiro_conferido)+n(p.pix_conferido)+n(p.cartao_conferido)}
                detalhe="Soma de dinheiro e repasses, sem conciliação corporativa"/>
              <Metrica titulo="Saldo do entregador" valor={pendente} detalhe="A transportar para próximos acertos"/>
              <Metrica titulo="Créditos corporativos pendentes" valor={p.itens_empresa_pendentes}
                detalhe="Número de PIX/cartões a conciliar"/>
            </div>
            <div className="rounded-xl bg-[#f5faf7] p-3 text-[11px] text-slate-700">
              <strong>Declarado pelo entregador:</strong> dinheiro {moeda(p.dinheiro_declarado)},
              PIX {moeda(p.pix_declarado)}, cartão {moeda(p.cartao_declarado)}.
              {p.observacao_entregador&&<p className="mt-2 text-slate-600">Observação: {p.observacao_entregador}</p>}
              {p.observacao_cd&&<p className="mt-2 font-bold text-amber-900">CD: {p.observacao_cd}</p>}
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {([
                {forma:"DINHEIRO",nome:"Dinheiro físico",esperado:e.dinheiro,pendente:p.pendente_dinheiro,icone:<Banknote size={19}/>},
                {forma:"PIX",nome:"PIX do entregador",esperado:e.pix_entregador,pendente:p.pendente_pix,icone:<Wallet size={19}/>},
                {forma:"CARTAO",nome:"Cartão do entregador",esperado:e.cartao_entregador,pendente:p.pendente_cartao,icone:<CreditCard size={19}/>},
              ]).map(tipo=><div key={tipo.forma} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center gap-2 font-black text-emerald-800">{tipo.icone}<p className="text-[12px]">{tipo.nome}</p></div>
                <p className="mt-3 text-[11px]">Esperado: <strong>{moeda(tipo.esperado)}</strong></p>
                <p className="mt-1 text-[11px]">Pendente: <strong className="text-amber-900">{moeda(tipo.pendente)}</strong></p>
                {n(tipo.pendente)>0&&!encerrada&&<form action={registrarRepasseV109} className="mt-3 space-y-2">
                  <input type="hidden" name="prestacao_id" value={p.id}/>
                  <input type="hidden" name="forma" value={tipo.forma}/>
                  <input type="hidden" name="chave_operacao" value={randomUUID()}/>
                  <CampoCD nome="valor" rotulo="Valor efetivamente recebido" nota="Permite conferência parcial"/>
                  {tipo.forma==="CARTAO"&&<CampoCD nome="taxa_cartao" rotulo="Taxa autorizada pela empresa" padrao="0"/>}
                  {tipo.forma!=="CARTAO"&&<input type="hidden" name="taxa_cartao" value="0"/>}
                  <CampoCD nome="referencia" rotulo="Referência/identificador" nota="PIX/cartão exigem código real; dinheiro pode ter recibo"/>
                  <button type="submit" className="min-h-[44px] w-full rounded-xl bg-emerald-800 px-3 text-[11px] font-black text-white">
                    Confirmar repasse
                  </button>
                </form>}
              </div>)}
            </div>

            <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-emerald-900"><Building2 size={19}/>
                <h4 className="text-[13px] font-black">PIX e cartão da empresa — conciliação bancária</h4></div>
              <p className="mt-2 text-[10px] leading-5 text-slate-600">Esses valores nunca são cobrados novamente do entregador. Confirme cada transação no extrato ou na maquineta.</p>
              <div className="mt-3 space-y-2">
                {(p.itens??[]).filter(i=>i.destino==="EMPRESA").map(item=>
                  <div key={item.id} className="rounded-xl bg-white p-3">
                    <div className="flex flex-wrap justify-between gap-2">
                      <div><p className="text-[11px] font-black">{item.cliente_nome}</p>
                        <p className="mt-1 text-[10px] text-slate-500">{item.forma} · {dataHora(item.recebido_at)} · {item.origem} nº {item.origem_id}</p></div>
                      <strong className="text-[12px]">{moeda(item.valor)}</strong>
                    </div>
                    {item.conciliado_em
                      ? <p className="mt-2 flex items-center gap-2 text-[10px] font-black text-emerald-800"><CheckCircle2 size={14}/> Conciliado · {item.referencia_conciliacao}</p>
                      : <form action={conciliarCreditoEmpresaV109} className="mt-3 flex flex-wrap gap-2">
                          <input type="hidden" name="item_id" value={item.id}/>
                          <input name="referencia" required minLength={4} maxLength={250}
                            placeholder="ID PIX / NSU da maquineta" className="h-11 min-w-[170px] flex-1 rounded-xl border border-slate-200 px-3 text-[11px]"/>
                          <button type="submit" className="h-11 rounded-xl bg-emerald-800 px-3 text-[11px] font-black text-white">Conciliar no CD</button>
                        </form>}
                  </div>
                )}
              </div>
            </section>

            <details className="rounded-xl border border-slate-100 bg-white p-4">
              <summary className="cursor-pointer text-[12px] font-black text-emerald-900">Ver extrato de recebimentos ({p.total_itens})</summary>
              <div className="mt-3 space-y-2">
                {(p.itens??[]).map(i=><div key={i.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2 text-[10px]">
                  <div><strong>{i.cliente_nome}</strong>
                    <p className="mt-1 text-slate-500">{i.forma} · {i.destino==="EMPRESA"?"Empresa":"Entregador"} · {i.origem} nº {i.origem_id}</p></div>
                  <strong>{moeda(i.valor)}</strong>
                </div>)}
              </div>
            </details>
            {(p.repasses??[]).length>0&&<details className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <summary className="cursor-pointer text-[12px] font-black text-emerald-900">Repasses já confirmados pelo CD ({p.repasses.length})</summary>
              <div className="mt-3 space-y-2">{p.repasses.map(r=><p key={r.id} className="text-[10px] text-emerald-900">
                {dataHora(r.confirmado_at)} · {r.forma} · {moeda(r.valor)}
                {n(r.taxa_cartao_autorizada)>0?` · taxa autorizada ${moeda(r.taxa_cartao_autorizada)}`:""}
                {r.referencia?` · ${r.referencia}`:""}
              </p>)}</div>
            </details>}
            {encerrada&&<p className="flex items-center gap-2 text-[11px] font-black text-emerald-800">
              <ShieldCheck size={18}/> Saldo do entregador quitado e créditos corporativos conciliados
            </p>}
          </article>;
        })}
      </section>

      {(historicoResp.data??[]).length>0&&<details className="rounded-xl bg-white p-4 text-xs text-slate-700">
        <summary className="cursor-pointer font-bold">Histórico de prestações anteriores à V109</summary>
        <div className="mt-3 space-y-2">{(historicoResp.data??[]).map(p=><p key={p.id}>
          V108 nº {p.id} · {diaBr(p.data_referencia)} · {p.status}
        </p>)}</div>
      </details>}
    </div>
  </main>;
}
