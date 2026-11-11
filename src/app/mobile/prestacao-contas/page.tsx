export const instant = false;

// V108 — Prestação financeira do entregador: não depende de carga ou rota.
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft, Banknote, Building2, CheckCircle2, CreditCard,
  FileCheck2, Info, Receipt, ShieldCheck, Smartphone, Wallet
} from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { enviarPrestacaoMobile } from "./actions";

type Resumo = {
  dinheiro:number;pix_empresa:number;pix_entregador:number;
  cartao_empresa:number;cartao_entregador:number;sem_classificacao:number;
  total_recebido:number;quantidade_movimentos:number;
};
type Props={searchParams:Promise<{data?:string;erro?:string;enviada?:string}>};
const moeda=(v:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
const numero=(v:unknown)=>Number.isFinite(Number(v))?Number(v):0;
function hojeFortaleza() {
  const v=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Fortaleza",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const m=Object.fromEntries(v.map(p=>[p.type,p.value]));
  return `${m.year}-${m.month}-${m.day}`;
}
export default async function PrestacaoContasPage({searchParams}:Props) {
  const usuario=await getCurrentUserProfile();
  if(!usuario||!usuario.ativo) redirect("/");
  if(!usuario.isPlatformAdmin&&!temPermissao(usuario.permissoes,PERMISSOES.PAGAMENTO_REGISTRAR))
    redirect("/mobile/sem-acesso");
  const params=await searchParams;
  const dia=/^\d{4}-\d{2}-\d{2}$/.test(params.data??"") ? String(params.data) : hojeFortaleza();
  const supabase=await createClient();
  const [resumoResp,prestResp]=await Promise.all([
    supabase.rpc("resumo_prestacao_v108",{p_empresa_id:usuario.empresa.id,p_data:dia}),
    supabase.from("prestacoes_contas_v108")
      .select("id,status,entregador_id,dinheiro_declarado,pix_repassado,cartao_repassado,comprovante_pix,comprovante_cartao,observacao_entregador,observacao_cd,conferido_at,enviado_at")
      .eq("empresa_id",usuario.empresa.id).eq("entregador_id",usuario.id)
      .eq("data_referencia",dia).maybeSingle(),
  ]);
  if (resumoResp.error||prestResp.error) {
    return <main className="mx-auto min-h-dvh max-w-[480px] bg-slate-50 p-6 text-sm">
      <Link href="/mobile" className="font-black text-emerald-700">Voltar</Link>
      <h1 className="mt-8 text-xl font-black">Prestação de contas</h1>
      <p role="alert" className="mt-3 rounded-xl bg-red-50 p-4 text-red-800">Não foi possível consultar a prestação. Atualize o aplicativo ou entre em contato com o Financeiro.</p>
    </main>;
  }
  const d=resumoResp.data as Partial<Resumo>|null;
  const resumo:Resumo={
    dinheiro:numero(d?.dinheiro),pix_empresa:numero(d?.pix_empresa),pix_entregador:numero(d?.pix_entregador),
    cartao_empresa:numero(d?.cartao_empresa),cartao_entregador:numero(d?.cartao_entregador),
    sem_classificacao:numero(d?.sem_classificacao),total_recebido:numero(d?.total_recebido),
    quantidade_movimentos:numero(d?.quantidade_movimentos),
  };
  const prest=prestResp.data;
  const bloqueada=prest?.status==="CONFERIDA"||prest?.status==="COM_DIVERGENCIA";
  const pendenteClassificacao=Math.abs(resumo.sem_classificacao)>0.009;
  const repasse=resumo.dinheiro+resumo.pix_entregador+resumo.cartao_entregador;
  return <main className="min-h-dvh bg-[#eaf2ec] text-[#142018]">
    <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f7faf7] pb-10 shadow-[0_0_60px_rgba(17,63,33,0.1)]">
      <header className="bg-[linear-gradient(140deg,#0c4c2a,#16763c)] px-5 pb-7 pt-5 text-white">
        <div className="flex items-center gap-3">
          <Link href="/mobile" className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/20 bg-white/10" aria-label="Voltar">
            <ArrowLeft size={19}/>
          </Link>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-200">Financeiro do entregador</p>
            <h1 className="text-xl font-black">Minha prestação de contas</h1>
          </div>
        </div>
        <p className="mt-4 text-[12px] leading-5 text-emerald-100">
          Preste contas dos valores recebidos. Não é preciso encerrar rota, fechar carga ou devolver cestas.
        </p>
      </header>
      <section className="space-y-4 p-4">
        <form method="get" className="flex items-end gap-2 rounded-2xl bg-white p-3 shadow-sm">
          <label className="flex-1 text-[10px] font-black text-slate-600">Dia do acerto
            <input type="date" name="data" defaultValue={dia} max={hojeFortaleza()} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-[12px] font-bold"/>
          </label>
          <button className="h-11 rounded-xl bg-emerald-800 px-4 text-[11px] font-black text-white" type="submit">Consultar</button>
        </form>
        {params.enviada&&<p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] font-bold text-emerald-900">Prestação enviada ao CD. Aguardando conferência do Financeiro.</p>}
        {params.erro&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] font-bold text-red-800">{decodeURIComponent(params.erro).slice(0,260)}</p>}
        <div className="rounded-[24px] bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Total recebido dos clientes</p>
          <p className="mt-2 text-3xl font-black tabular-nums text-emerald-900">{moeda(resumo.total_recebido)}</p>
          <p className="mt-1 text-[10px] text-slate-500">{resumo.quantidade_movimentos} movimento(s) entre vendas e cobranças no dia</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[16px] bg-emerald-50 p-3">
              <p className="text-[9px] font-semibold text-emerald-800">Sob sua responsabilidade</p>
              <p className="mt-1 text-lg font-black text-emerald-950">{moeda(repasse)}</p>
            </div>
            <div className="rounded-[16px] bg-slate-50 p-3">
              <p className="text-[9px] font-semibold text-slate-600">Recebido diretamente pela empresa</p>
              <p className="mt-1 text-lg font-black">{moeda(resumo.pix_empresa+resumo.cartao_empresa)}</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Metodo icon={<Banknote size={20}/>} titulo="Dinheiro" valor={resumo.dinheiro}
            destino="ENTREGADOR" detalhe="Entregar e conferir o dinheiro físico no CD"/>
          <Metodo icon={<Smartphone size={20}/>} titulo="PIX" valor={resumo.pix_empresa+resumo.pix_entregador}
            destino={resumo.pix_entregador>0?"ENTREGADOR":"EMPRESA"}
            detalhe={resumo.pix_entregador>0?"Repasse da conta do entregador ao CD":"Recebido pela empresa; CD confere no banco"}/>
          <Metodo icon={<CreditCard size={20}/>} titulo="Cartão" valor={resumo.cartao_empresa+resumo.cartao_entregador}
            destino={resumo.cartao_entregador>0?"ENTREGADOR":"EMPRESA"}
            detalhe={resumo.cartao_entregador>0?"Maquineta própria: comprovar repasse ao CD":"Maquineta da empresa: CD confere a transação"}/>
        </div>
        {pendenteClassificacao&&<p role="alert" className="rounded-[20px] border border-amber-300 bg-amber-50 p-4 text-[11px] leading-5 text-amber-900">
          <strong>Recebimentos pendentes de classificação: {moeda(resumo.sem_classificacao)}.</strong>
          <span className="block mt-1">O CD precisa informar quem recebeu os lançamentos antigos ou de outras formas antes do acerto. Nenhum valor será atribuído a você por suposição.</span>
        </p>}
        {prest&&<div className="rounded-[20px] border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2"><FileCheck2 size={18} className="text-emerald-800"/>
            <p className="text-[12px] font-black text-emerald-950">Prestação nº {prest.id} · {prest.status.replaceAll("_"," ")}</p>
          </div>
          <p className="mt-2 text-[10px] leading-5 text-emerald-900">
            Declarado: dinheiro {moeda(numero(prest.dinheiro_declarado))},
            PIX {moeda(numero(prest.pix_repassado))},
            cartão {moeda(numero(prest.cartao_repassado))}.
          </p>
          {prest.observacao_cd&&<p className="mt-2 text-[11px] font-semibold text-amber-900">Observação do CD: {prest.observacao_cd}</p>}
        </div>}
        {!bloqueada&&<form action={enviarPrestacaoMobile} className="space-y-3 rounded-[24px] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2"><Wallet size={19} className="text-emerald-800"/>
            <h2 className="text-[14px] font-black">Declarar valores ao CD</h2>
          </div>
          <p className="text-[10px] leading-5 text-slate-500">Informe o que está efetivamente entregando ou transferindo. O CD confirmará os valores em uma segunda etapa.</p>
          <input type="hidden" name="data" value={dia}/>
          <Campo nome="dinheiro" titulo="Dinheiro físico entregue" esperado={resumo.dinheiro} inicial={prest?.dinheiro_declarado}/>
          <Campo nome="pix" titulo="PIX repassado à empresa" esperado={resumo.pix_entregador} inicial={prest?.pix_repassado} disabled={resumo.pix_entregador<=0}/>
          {resumo.pix_entregador>0&&<label className="block text-[10px] font-black text-slate-700">Identificador ou referência do comprovante PIX
            <input name="comprovante_pix" maxLength={250} defaultValue={prest?.comprovante_pix??""}
              placeholder="Ex.: ID da transferência / comprovante" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-[12px]"/>
          </label>}
          <Campo nome="cartao" titulo="Cartão repassado à empresa" esperado={resumo.cartao_entregador} inicial={prest?.cartao_repassado} disabled={resumo.cartao_entregador<=0}/>
          {resumo.cartao_entregador>0&&<label className="block text-[10px] font-black text-slate-700">Identificador do repasse da maquineta
            <input name="comprovante_cartao" maxLength={250} defaultValue={prest?.comprovante_cartao??""}
              placeholder="Ex.: operação InfinitePay / transferência" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-[12px]"/>
          </label>}
          <label className="block text-[10px] font-black text-slate-700">Observação do entregador
            <textarea name="observacao" rows={3} maxLength={1500} defaultValue={prest?.observacao_entregador??""}
              placeholder="Ex.: falta de troco, cartão aguardando liquidação, previsão de repasse"
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-[12px]"/>
          </label>
          <button disabled={pendenteClassificacao} type="submit" className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[15px] bg-emerald-800 px-4 text-[12px] font-black text-white disabled:opacity-40">
            <CheckCircle2 size={18}/> {prest?"Reenviar prestação ao CD":"Enviar prestação ao CD"}
          </button>
          <p className="text-center text-[10px] leading-5 text-slate-500">Enviar não significa que o CD já recebeu ou conciliou os valores.</p>
        </form>}
        {bloqueada&&<div className="flex items-start gap-2 rounded-xl bg-white p-4 text-[11px] text-emerald-900">
          <ShieldCheck size={18} className="shrink-0"/> Esta prestação já foi conferida pelo CD. Alterações dependem de revisão do Financeiro.
        </div>}
        <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50 p-4 text-[10px] leading-5 text-sky-800">
          <Info size={16} className="shrink-0"/>
          A prestação não fecha sua rota nem devolve cestas. PIX/cartão corporativos são conciliados pelo CD, sem cobrança de novo repasse.
        </div>
      </section>
    </div>
  </main>;
}
function Metodo({icon,titulo,valor,destino,detalhe}:{icon:React.ReactNode;titulo:string;valor:number;destino:string;detalhe:string}) {
  return <div className="flex items-center gap-3 rounded-[19px] border border-slate-100 bg-white p-4 shadow-sm">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">{icon}</div>
    <div className="min-w-0 flex-1"><p className="text-[12px] font-black">{titulo}</p>
      <p className="mt-1 text-[10px] leading-4 text-slate-500">{detalhe}</p></div>
    <div className="text-right"><p className="text-[14px] font-black tabular-nums">{moeda(valor)}</p>
      <p className="mt-1 text-[9px] font-semibold text-emerald-700">{destino==="EMPRESA"?"Empresa":"Entregador"}</p></div>
  </div>;
}
function Campo({nome,titulo,esperado,inicial,disabled=false}:{nome:string;titulo:string;esperado:number;inicial:unknown;disabled?:boolean}) {
  return <label className="block text-[10px] font-black text-slate-700">
    {titulo}<span className="ml-1 font-normal text-slate-500">· esperado {moeda(esperado)}</span>
    <input type="number" step="0.01" min={0} max={Math.max(0,esperado)} name={nome}
      defaultValue={disabled?"0":inicial==null?"0":String(inicial)} readOnly={disabled}
      className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-black text-emerald-900"/>
  </label>;
}
