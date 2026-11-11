export const instant = false;

// V110: conferência de PIX/cartão da empresa sem depender do repasse do entregador.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2, CheckCircle2, Clock3, FileSpreadsheet, Landmark, ReceiptText, ShieldCheck } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { confirmarCreditoCorporativoV110 } from "./actions";

type Movimento={
  origem:"VENDA"|"COBRANCA"|"PARCELA"; origem_id:number; cliente_nome:string;
  recebido_at:string; forma:string; valor:number; entregador_nome:string;
  prestacao_id:number|null; conciliado:boolean; referencia:string|null; conciliado_at:string|null;
};
type Resumo={
  inicio:string;fim:string;transacoes:number;total:number;pendentes:number;
  valor_pendente:number;conciliados:number;valor_conciliado:number;
  movimentos:Movimento[];detalhe_limitado:boolean;
};
type Props={searchParams:Promise<{
  inicio?:string;fim?:string;erro?:string;conciliado?:string;
  situacao?:string;forma?:string;busca?:string;
}>};
const real=(v:unknown)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v??0));
function hojeFortaleza(){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Fortaleza",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return `${v.year}-${v.month}-${v.day}`;
}
function dia(s:string){return /^\d{4}-\d{2}-\d{2}$/.test(s)?s.split("-").reverse().join("/") : s}
export default async function CreditosEmpresaV110({searchParams}:Props){
  const usuario=await getCurrentUserProfile();
  if(!usuario||!usuario.ativo)redirect("/");
  if(!usuario.isPlatformAdmin&&!temPermissao(usuario.permissoes,PERMISSOES.FINANCEIRO_AUDITAR))
    redirect("/admin/financeiro");
  const params=await searchParams;
  const hoje=hojeFortaleza();
  const inicio=/^\d{4}-\d{2}-\d{2}$/.test(params.inicio??"")?String(params.inicio):hoje;
  const fim=/^\d{4}-\d{2}-\d{2}$/.test(params.fim??"")?String(params.fim):hoje;
  const supabase=await createClient();
  const {data,error}=await supabase.rpc("listar_creditos_corporativos_v110",{
    p_empresa_id:usuario.empresa.id,p_inicio:inicio,p_fim:fim,
  });
  const resumo=(data??{}) as Partial<Resumo>;
  const movimentos=Array.isArray(resumo.movimentos)?resumo.movimentos:[];
  const situacao=["TODOS","PENDENTE","CONCILIADO"].includes(params.situacao??"")?String(params.situacao):"TODOS";
  const forma=["TODOS","PIX","CARTAO"].includes(params.forma??"")?String(params.forma):"TODOS";
  const busca=String(params.busca??"").trim().slice(0,100);
  const filtrados=movimentos.filter(m=>{
    if(situacao!=="TODOS"&&(m.conciliado?"CONCILIADO":"PENDENTE")!==situacao)return false;
    if(forma!=="TODOS"&&m.forma!==forma)return false;
    const haystack=`${m.cliente_nome} ${m.entregador_nome??""} ${m.origem} ${m.origem_id} ${m.referencia??""}`;
    return haystack.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR"));
  });
  const valorFiltrado=filtrados.reduce((acc,m)=>acc+Number(m.valor),0);
  const query=new URLSearchParams({inicio,fim,situacao,forma,busca});
  const exportHref=`/admin/financeiro/prestacoes/creditos/exportar?${query.toString()}`;
  return <main className="min-h-dvh bg-[#eef4ef] text-[#142018]">
    <div className="mx-auto max-w-[1060px] space-y-5 p-4 md:p-8">
      <header className="rounded-[27px] bg-[linear-gradient(140deg,#0c5732,#138448)] p-6 text-white">
        <Link href="/admin/financeiro/prestacoes" className="inline-flex items-center gap-2 text-xs font-bold text-emerald-100">
          <ArrowLeft size={18}/> Voltar às prestações
        </Link>
        <div className="mt-5 flex items-center gap-3"><Landmark size={30}/><div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">Conciliação e fechamento · V111</p>
          <h1 className="text-2xl font-black">PIX e cartão da empresa</h1>
        </div></div>
        <p className="mt-3 text-[12px] leading-6 text-emerald-50">
          Confira os créditos que entram diretamente na conta ou maquineta da empresa. Não é necessário o entregador enviar um acerto de R$ 0.
        </p>
      </header>
      {params.conciliado&&<p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-950">
        Crédito registrado na conciliação. Nenhum repasse adicional foi cobrado do entregador.
      </p>}
      {params.erro&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-900">{params.erro.slice(0,260)}</p>}
      <form method="get" className="grid items-end gap-3 rounded-[22px] bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6">
        <label className="text-[11px] font-bold text-slate-700">Data inicial
          <input type="date" name="inicio" defaultValue={inicio} max={hoje} required
            className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-xs"/>
        </label>
        <label className="text-[11px] font-bold text-slate-700">Data final
          <input type="date" name="fim" defaultValue={fim} max={hoje} required
            className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-xs"/>
        </label>
        <label className="text-[11px] font-bold text-slate-700">Situação
          <select name="situacao" defaultValue={situacao} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs">
            <option value="TODOS">Todas</option><option value="PENDENTE">Pendentes</option><option value="CONCILIADO">Conciliadas</option>
          </select>
        </label>
        <label className="text-[11px] font-bold text-slate-700">Pagamento
          <select name="forma" defaultValue={forma} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs">
            <option value="TODOS">PIX e cartão</option><option value="PIX">Somente PIX</option><option value="CARTAO">Somente cartão</option>
          </select>
        </label>
        <label className="text-[11px] font-bold text-slate-700 sm:col-span-2 lg:col-span-2">Cliente, vendedor ou referência
          <input name="busca" defaultValue={busca} maxLength={100} placeholder="Pesquisar recebimentos..."
            className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-xs"/>
        </label>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-6">
          <button type="submit" className="h-12 flex-1 rounded-xl bg-emerald-800 px-5 text-[11px] font-black text-white sm:flex-none">Aplicar filtros</button>
          <Link href="/admin/financeiro/prestacoes/creditos" className="inline-flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-[11px] font-black text-slate-700">Limpar filtros</Link>
          {!error && <a href={exportHref} className="inline-flex h-12 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-[11px] font-black text-emerald-950">
            <FileSpreadsheet size={17}/> Exportar Excel
          </a>}
        </div>
      </form>
      {error ? <div role="alert" className="rounded-2xl border border-red-100 bg-white p-5 text-xs text-red-900">
        Não foi possível consultar o extrato corporativo: {error.message}
      </div>:<>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            {titulo:"Total registrado",valor:real(resumo.total),icon:<ReceiptText size={19}/>},
            {titulo:"Pendente de conferência",valor:real(resumo.valor_pendente),icon:<Clock3 size={19}/>},
            {titulo:"Já conciliado",valor:real(resumo.valor_conciliado),icon:<CheckCircle2 size={19}/>},
            {titulo:"Transações pendentes",valor:String(resumo.pendentes??0),icon:<Building2 size={19}/>},
          ].map(c=><div key={c.titulo} className="rounded-[20px] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-800">{c.icon}<p className="text-[10px] font-bold">{c.titulo}</p></div>
            <p className="mt-3 text-lg font-black text-emerald-950">{c.valor}</p>
          </div>)}
        </div>
        <section className="space-y-3">
          <div className="flex flex-wrap justify-between gap-2">
            <div><p className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Extrato do CD</p>
              <h2 className="mt-1 text-xl font-black">Créditos de {dia(inicio)} a {dia(fim)}</h2></div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="rounded-full bg-white px-4 py-2 text-xs font-bold text-emerald-900">{filtrados.length} exibida(s) de {resumo.transacoes??0}</p>
              <p className="rounded-full bg-white px-4 py-2 text-xs font-bold text-emerald-900">{real(valorFiltrado)} no filtro</p>
            </div>
          </div>
          {filtrados.length===0&&<div className="rounded-[24px] bg-white p-8 text-center text-xs text-slate-500">
            <Building2 size={26} className="mx-auto mb-3 text-emerald-700"/> Nenhum crédito corresponde aos filtros selecionados.
          </div>}
          {filtrados.map(m=><article key={m.origem+"-"+m.origem_id} className="rounded-[23px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-[10px] font-black text-emerald-800">{m.forma} da empresa · {m.origem} nº {m.origem_id}</p>
                <h3 className="mt-1 text-[15px] font-black">{m.cliente_nome}</h3>
                <p className="mt-2 text-[10px] text-slate-500">
                  {new Date(m.recebido_at).toLocaleString("pt-BR",{timeZone:"America/Fortaleza",dateStyle:"short",timeStyle:"short"})}
                  {" · "}Recebimento registrado por {m.entregador_nome??"entregador"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-emerald-950">{real(m.valor)}</p>
                <p className={`mt-2 text-[10px] font-black ${m.conciliado?"text-emerald-800":"text-amber-800"}`}>
                  {m.conciliado?"CONCILIADO":"AGUARDANDO CONFERÊNCIA"}
                </p>
              </div>
            </div>
            {m.conciliado
              ? <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-[11px] text-emerald-950">
                  <ShieldCheck size={17} className="shrink-0"/> Conferido no CD. Referência: {m.referencia??"registrada no fechamento"}
                </div>
              : <form action={confirmarCreditoCorporativoV110} className="mt-4 space-y-3 rounded-[17px] border border-emerald-100 bg-[#f8fcf9] p-4">
                  <input type="hidden" name="origem" value={m.origem}/>
                  <input type="hidden" name="origem_id" value={m.origem_id}/>
                  <input type="hidden" name="inicio" value={inicio}/>
                  <input type="hidden" name="fim" value={fim}/>
                  <input type="hidden" name="situacao" value={situacao}/>
                  <input type="hidden" name="forma" value={forma}/>
                  <input type="hidden" name="busca" value={busca}/>
                  <label className="block text-[10px] font-black text-slate-700">ID PIX, NSU ou referência do crédito conferido
                    <input name="referencia" minLength={4} maxLength={250} required
                      placeholder={m.forma==="PIX"?"Ex.: identificador E2E no extrato":"Ex.: NSU da transação aprovada"}
                      className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"/>
                  </label>
                  <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 font-semibold text-amber-950">
                    <input type="checkbox" name="confirmado_no_extrato" value="SIM" required
                      className="mt-1 h-4 w-4 shrink-0 accent-emerald-700"/>
                    Verifiquei o crédito de {real(m.valor)} no extrato/maquineta da empresa e confirmei que corresponde a este cliente e pagamento.
                  </label>
                  <button type="submit" className="min-h-12 w-full rounded-xl bg-emerald-800 px-4 text-xs font-black text-white">
                    Confirmar crédito conferido no banco
                  </button>
                  <p className="text-[10px] leading-5 text-slate-600">
                    Confirme somente após verificar o banco ou a maquineta. Isso não cria outro pagamento nem cobra o entregador.
                  </p>
                </form>}
          </article>)}
          {resumo.detalhe_limitado&&<p className="rounded-xl bg-amber-50 p-4 text-xs text-amber-900">
            O extrato está limitado a 250 transações. Reduza o período antes de conciliar.
          </p>}
        </section>
      </>}
    </div>
  </main>;
}
