export const instant = false;
// V118 | Histórico somente leitura; não confirma, não quita e não altera financeiro.
import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowLeft, Download, FileCheck2, Landmark, ReceiptText, ShieldCheck} from "lucide-react";
import {getCurrentUserProfile} from "@/lib/auth/get-current-user";
import {PERMISSOES,temPermissao} from "@/lib/auth/permissions";
import {createClient} from "@/lib/supabase/server";
import {aplicar,brl,dataHora,diaBr,extrair,filtrosDe,nomeForma,protocolo,queryFiltros} from "@/lib/financeiro/repasses-consulta-v118";

type Props={searchParams:Promise<Record<string,string|undefined>>};
const tamanho=20;
const campo="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500";
function Indicador({titulo,valor,detalhe}:{titulo:string;valor:string;detalhe:string}){
  return <div className="rounded-[19px] border border-emerald-100 bg-white p-5 shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{titulo}</p>
    <p className="mt-2 text-xl font-black tabular-nums text-emerald-950">{valor}</p>
    <p className="mt-1 text-[11px] text-slate-500">{detalhe}</p>
  </div>;
}
export default async function HistoricoRepassesV118({searchParams}:Props){
  const usuario=await getCurrentUserProfile();
  if(!usuario||!usuario.ativo)redirect("/");
  if(!usuario.isPlatformAdmin&&!temPermissao(usuario.permissoes,PERMISSOES.FINANCEIRO_AUDITAR))
    redirect("/admin/financeiro");
  const q=await searchParams,f=filtrosDe(q),supabase=await createClient();
  const {data,error}=await supabase.rpc("listar_prestacoes_v109",{p_empresa_id:usuario.empresa.id});
  if(error)return <main className="min-h-screen bg-slate-50 p-6">
    <Link href="/admin/financeiro/prestacoes" className="font-bold text-emerald-800">Voltar à prestação de contas</Link>
    <h1 className="mt-5 text-xl font-black">Histórico indisponível</h1>
    <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">Não foi possível consultar os repasses. Nenhum lançamento foi alterado.</p>
  </main>;
  const todos=extrair(data,usuario.empresa.id),itens=aplicar(todos,f);
  const entregadores=Array.from(new Map(todos.map(r=>[r.entregadorId,r.entregadorNome])).entries())
    .sort((a,b)=>a[1].localeCompare(b[1],"pt-BR"));
  const centavos=itens.reduce((s,r)=>s+Math.round(r.valor*100),0);
  const taxas=itens.reduce((s,r)=>s+Math.round(r.taxa*100),0);
  const totalPaginas=Math.max(1,Math.ceil(itens.length/tamanho));
  const n=Number(q.pagina??1);
  const pagina=Number.isSafeInteger(n)&&n>0?Math.min(n,totalPaginas):1;
  const visiveis=itens.slice((pagina-1)*tamanho,pagina*tamanho);
  const filtros=queryFiltros(f);
  const linkPagina=(p:number)=>{const s=new URLSearchParams(filtros);s.set("pagina",String(p));return "/admin/financeiro/prestacoes/repasses?"+s.toString();};
  return <main className="min-h-screen bg-[#eef4ef] pb-14 text-[#142018]">
    <div className="mx-auto max-w-[1160px] space-y-5 p-4 md:p-8">
      <header className="rounded-[28px] bg-[linear-gradient(135deg,#0d5730,#187c43)] p-6 text-white shadow-md">
        <Link href="/admin/financeiro/prestacoes" className="inline-flex items-center gap-2 text-xs font-bold text-emerald-100">
          <ArrowLeft size={16}/> Voltar à prestação de contas
        </Link>
        <div className="mt-5 flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15"><ReceiptText size={27}/></span>
          <div><p className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Centro de distribuição · V118</p>
          <h1 className="mt-1 text-2xl font-black">Histórico de repasses confirmados</h1></div>
        </div>
        <p className="mt-3 max-w-3xl text-xs leading-6 text-emerald-50">Consulte dinheiro, PIX e cartão já confirmados no CD, com filtros, totais e comprovantes internos individuais. Esta tela não executa movimentações financeiras.</p>
      </header>
      <section aria-label="Indicadores" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Total confirmado" valor={brl(centavos/100)} detalhe="Somente registros dos filtros"/>
        <Indicador titulo="Repasses" valor={itens.length.toLocaleString("pt-BR")} detalhe="Lançamentos distintos"/>
        <Indicador titulo="Entregadores" valor={new Set(itens.map(x=>x.entregadorId)).size.toLocaleString("pt-BR")} detalhe="Com repasse confirmado"/>
        <Indicador titulo="Taxa autorizada" valor={brl(taxas/100)} detalhe="Informativa; não somada ao repasse"/>
      </section>
      <section className="rounded-[24px] border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-base font-black text-emerald-950">Pesquisar comprovantes</h2>
            <p className="mt-1 text-[11px] text-slate-500">Datas de confirmação conforme horário de Fortaleza.</p></div>
          <Link href={"/admin/financeiro/prestacoes/repasses/exportar?"+filtros.toString()} prefetch={false}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-black text-emerald-900">
            <Download size={16}/> Exportar CSV filtrado
          </Link>
        </div>
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs font-bold">De<input className={campo} name="inicio" type="date" defaultValue={f.inicio}/></label>
          <label className="text-xs font-bold">Até<input className={campo} name="fim" type="date" defaultValue={f.fim}/></label>
          <label className="text-xs font-bold">Entregador<select className={campo} name="entregador" defaultValue={f.entregador}>
            <option value="">Todos</option>{entregadores.map(([id,nome])=><option key={id} value={id}>{nome}</option>)}
          </select></label>
          <label className="text-xs font-bold">Forma<select className={campo} name="forma" defaultValue={f.forma}>
            <option value="">Todas</option><option value="DINHEIRO">Dinheiro</option><option value="PIX">PIX</option><option value="CARTAO">Cartão</option>
          </select></label>
          <label className="text-xs font-bold">Busca<input className={campo} name="busca" type="search" maxLength={80} defaultValue={f.busca} placeholder="Nome, RP ou prestação"/></label>
          <div className="flex flex-wrap items-end gap-2 lg:col-span-5">
            <button type="submit" className="min-h-11 rounded-xl bg-emerald-800 px-6 text-xs font-black text-white">Aplicar filtros</button>
            <Link href="/admin/financeiro/prestacoes/repasses" className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-5 text-xs font-black text-slate-700">Limpar</Link>
          </div>
        </form>
      </section>
      <section aria-label="Repasses confirmados" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-emerald-950">Repasses conferidos</h2>
          <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-emerald-800">{itens.length} registro(s)</span>
        </div>
        {visiveis.length===0?<div className="rounded-[22px] bg-white p-10 text-center">
          <FileCheck2 className="mx-auto text-slate-400" size={34}/>
          <p className="mt-3 text-sm font-black text-slate-800">Nenhum repasse encontrado</p>
          <p className="mt-1 text-xs text-slate-500">Altere os filtros para consultar outros períodos ou entregadores.</p>
        </div>:<div className="grid gap-3 lg:grid-cols-2">
          {visiveis.map(r=><article key={r.id} className="rounded-[22px] border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">{protocolo(r.id)} · Prestação nº {r.prestacaoId}</p>
                <h3 className="mt-1 text-base font-black text-slate-900">{r.entregadorNome}</h3>
                <p className="mt-1 text-xs text-slate-500">{nomeForma(r.forma)}</p></div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-800"><ShieldCheck size={14}/> Confirmado no CD</span>
            </div>
            <div className="mt-4 rounded-[16px] bg-[#f2f8f4] p-4">
              <p className="text-[10px] font-bold text-slate-600">Valor do repasse</p>
              <p className="mt-1 text-xl font-black tabular-nums text-emerald-950">{brl(r.valor)}</p>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div><dt className="text-[10px] font-bold text-slate-500">Confirmado em</dt><dd className="mt-1 text-xs font-bold">{dataHora(r.confirmadoAt)}</dd></div>
              <div><dt className="text-[10px] font-bold text-slate-500">Período da prestação</dt><dd className="mt-1 text-xs font-bold">{diaBr(r.inicio)} a {diaBr(r.fim)}</dd></div>
              {r.referencia&&<div className="sm:col-span-2"><dt className="text-[10px] font-bold text-slate-500">Referência</dt><dd className="mt-1 break-all text-xs font-semibold">{r.referencia}</dd></div>}
              {r.taxa>0&&<div><dt className="text-[10px] font-bold text-slate-500">Taxa autorizada</dt><dd className="mt-1 text-xs font-semibold">{brl(r.taxa)}</dd></div>}
            </dl>
            <Link href={"/admin/financeiro/prestacoes/repasses/comprovante?prestacao="+r.prestacaoId+"&repasse="+r.id}
              target="_blank" rel="noopener noreferrer" prefetch={false}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 text-xs font-black text-white">
              <ReceiptText size={16}/> Visualizar e imprimir comprovante
            </Link>
          </article>)}
        </div>}
      </section>
      {totalPaginas>1&&<nav aria-label="Páginas de repasses" className="flex flex-wrap items-center justify-center gap-3 pt-3">
        {pagina>1&&<Link href={linkPagina(pagina-1)} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-black">Anterior</Link>}
        <span className="text-xs font-bold text-slate-600">Página {pagina} de {totalPaginas}</span>
        {pagina<totalPaginas&&<Link href={linkPagina(pagina+1)} className="rounded-xl bg-emerald-800 px-5 py-3 text-xs font-black text-white">Próxima</Link>}
      </nav>}
      <aside className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-white p-4 text-[11px] leading-6 text-slate-600">
        <Landmark size={19} className="mt-1 shrink-0 text-emerald-800"/>
        Histórico interno do centro de distribuição. A consulta não cria novo recebimento, não movimenta estoque e não comprova transferência bancária.
      </aside>
    </div>
  </main>;
}
