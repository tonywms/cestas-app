import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircle, ArrowLeft, ArrowUpRight, BadgeCheck, Banknote, CircleDollarSign,
  MapPinned, PackageCheck, Receipt, Route, ShieldCheck, ShoppingBag, Truck, UsersRound,
} from "lucide-react";
import { dataBr, dinheiro, type Visao } from "@/lib/gestao/indicadores-v119";

type Props = { visao: Visao; nome: string; compact?: boolean; dias: number };
const int = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
function Indicador({ icon, titulo, valor, detalhe }: { icon: ReactNode; titulo: string; valor: string; detalhe: string }) {
  return <div className="rounded-[22px] border border-emerald-100/70 bg-white p-5 shadow-[0_8px_22px_rgba(10,66,35,.05)]">
    <div className="flex items-center gap-2 text-emerald-800">{icon}<span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{titulo}</span></div>
    <p className="mt-3 break-words text-[25px] font-black tracking-tight text-emerald-950">{valor}</p>
    <p className="mt-1 text-[11px] text-slate-500">{detalhe}</p>
  </div>;
}
export default function PainelGestaoV119({visao, nome, compact=false, dias}: Props) {
  const max = Math.max(1,...visao.serie.map(x=>x.entregas));
  const maxArea = Math.max(1,...visao.bairros.map(x=>x.atendimentos));
  return <main className={`app-premium min-h-screen bg-[#f3f8f3] text-[#142018] ${compact ? "px-4 py-5" : "px-4 py-7 md:px-8"}`}>
    <div className={`mx-auto space-y-5 ${compact ? "max-w-[540px]" : "max-w-[1320px]"}`}>
      <header className="hero-premium grain relative overflow-hidden rounded-[28px] p-6 text-white shadow-[0_20px_40px_rgba(12,66,34,.14)]">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link prefetch={false} href={compact ? "/mobile" : "/admin/dashboard"} className="inline-flex items-center gap-2 text-xs font-bold text-emerald-100"><ArrowLeft size={15}/> Voltar</Link>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-black"><ShieldCheck size={15}/> Somente leitura · V119</span>
          </div>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[.2em] text-[#f8d689]">Inteligência operacional</p>
          <h1 className="mt-2 text-[25px] font-black tracking-[-.04em] sm:text-[30px]">Centro de gestão</h1>
          <p className="mt-2 text-xs leading-6 text-emerald-100">{nome} · Indicadores de {dataBr(visao.inicio)} a {dataBr(visao.fim)}.</p>
          <p className="mt-2 text-xs leading-5 text-emerald-100">Vendas, produtividade, recebimentos e território, sem movimentações financeiras ou alteração de estoque.</p>
        </div>
      </header>
      {visao.limiteAtingido && <div role="alert" className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-900">
        <AlertCircle size={19} className="shrink-0"/> Há mais registros do que o limite desta visualização. Valores apresentados são parciais; não utilize para fechamento financeiro. Reduza o período.
      </div>}
      <form method="get" className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-emerald-100 bg-white p-4 shadow-sm">
        <label htmlFor="dias-gestao" className="text-xs font-black text-emerald-950">Período da análise</label>
        <div className="flex items-center gap-2">
          <select id="dias-gestao" name="dias" defaultValue={String(dias)} className="h-11 rounded-xl border border-emerald-100 bg-[#f5faf6] px-4 text-xs font-bold text-emerald-950">
            <option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option>
          </select>
          <button type="submit" className="h-11 rounded-xl bg-emerald-800 px-5 text-xs font-black text-white">Aplicar</button>
        </div>
      </form>
      <section aria-label="Indicadores executivos" className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"}`}>
        <Indicador icon={<PackageCheck size={17}/>} titulo="Entregas" valor={int(visao.entregas)} detalhe="Concluídas no período"/>
        <Indicador icon={<ShoppingBag size={17}/>} titulo="Vendas" valor={int(visao.vendas)} detalhe="Registros de venda · todos os status"/>
        <Indicador icon={<CircleDollarSign size={17}/>} titulo="Vendido" valor={dinheiro(visao.faturamento)} detalhe="Soma dos registros de venda"/>
        <Indicador icon={<Banknote size={17}/>} titulo="Recebimentos" valor={dinheiro(visao.recebido)} detalhe={`${int(visao.pagamentos)} pagamento(s) registrados`}/>
        <Indicador icon={<Truck size={17}/>} titulo="Cargas abertas" valor={int(visao.cargasAbertas)} detalhe="Saldo de cargas ainda não finalizadas"/>
        <Indicador icon={<AlertCircle size={17}/>} titulo="Ocorrências" valor={int(visao.ocorrencias)} detalhe="Ocorrências registradas no período"/>
        <Indicador icon={<UsersRound size={17}/>} titulo="Entregadores" valor={int(visao.equipe.filter(x=>x.entregas>0).length)} detalhe="Com entregas registradas"/>
        <Indicador icon={<MapPinned size={17}/>} titulo="Bairros atendidos" valor={int(visao.bairros.length)} detalhe="Com entrega concluída"/>
      </section>
      <section className={`grid gap-4 ${compact ? "" : "xl:grid-cols-2"}`}>
        <div className="rounded-[24px] border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2"><Route size={19} className="text-emerald-800"/><h2 className="text-base font-black">Ritmo de entregas</h2></div>
          <p className="mt-1 text-[11px] text-slate-500">Últimos dias dentro do período selecionado.</p>
          <div className="mt-5 flex h-36 items-end gap-3 border-b border-slate-100 pb-3">
            {visao.serie.map(d=><div key={d.data} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-black text-emerald-900">{d.entregas}</span>
              <div className="w-full max-w-[45px] rounded-t-lg bg-[linear-gradient(#32ab69,#176c3e)]" style={{height:`${Math.max(5,(d.entregas/max)*100)}%`}}/>
              <span className="text-[9px] font-bold text-slate-500">{d.data.slice(8,10)}/{d.data.slice(5,7)}</span>
            </div>)}
          </div>
        </div>
        <div className="rounded-[24px] border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2"><div><h2 className="text-base font-black">Concentração por bairro</h2><p className="mt-1 text-[11px] text-slate-500">Baseado no bairro cadastrado do cliente.</p></div><MapPinned size={20} className="shrink-0 text-emerald-800"/></div>
          {visao.bairros.length === 0 ? <p className="mt-6 text-xs text-slate-500">Nenhum bairro com entrega concluída no período.</p> :
            <div className="mt-5 space-y-3">{visao.bairros.slice(0,6).map((a,i)=><div key={a.cidade+"::"+a.nome}>
              <div className="flex justify-between gap-3 text-[11px] font-bold"><span className="truncate">{i+1}. {a.nome} · {a.cidade}</span><span className="shrink-0 tabular-nums">{a.atendimentos}</span></div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-emerald-50"><div className="h-full rounded-full bg-emerald-600" style={{width:`${(a.atendimentos/maxArea)*100}%`}}/></div>
            </div>)}</div>}
          <Link prefetch={false} href="/admin/territorio" className={`mt-5 inline-flex items-center gap-2 text-xs font-black text-emerald-800 ${compact ? "hidden" : ""}`}>Explorar bairros e visitas <ArrowUpRight size={15}/></Link>
          {compact && <Link prefetch={false} href="/admin/territorio" className="mt-5 inline-flex items-center gap-2 text-xs font-black text-emerald-800">Abrir análise territorial <ArrowUpRight size={15}/></Link>}
        </div>
      </section>
      <section className="rounded-[24px] border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2"><BadgeCheck className="text-emerald-800" size={20}/><h2 className="text-base font-black">Equipe em campo</h2></div>
        <p className="mt-1 text-[11px] text-slate-500">Indicadores por entregador. Não são notas automáticas de desempenho.</p>
        {visao.equipe.length===0 ? <p className="mt-4 text-xs text-slate-500">Sem entregadores identificados para esta empresa.</p> :
          <div className="mt-4 grid gap-2 lg:grid-cols-2">{visao.equipe.slice(0,30).map(r=><div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f4f9f5] p-4">
            <div className="min-w-0"><p className="truncate text-xs font-black text-emerald-950">{r.nome}</p><p className="mt-1 text-[10px] text-slate-500">{r.vendas} vendas · {r.ocorrencias} ocorrência(s)</p></div>
            <div className="text-right"><p className="text-base font-black tabular-nums text-emerald-900">{r.entregas} entregas</p><p className="text-[10px] font-semibold text-slate-500">{dinheiro(r.faturamento)} em vendas</p></div>
          </div>)}</div>}
      </section>
      <footer className="rounded-2xl bg-white p-4 text-[11px] leading-5 text-slate-500">
        <div className="flex items-start gap-2"><Receipt size={17} className="shrink-0 text-emerald-700"/> O painel é gerencial, não substitui prestação de contas ou conciliação. Vendas podem incluir registros cancelados. A análise territorial indica locais de entrega registrados, não GPS nem caminhos percorridos.</div>
      </footer>
    </div>
  </main>;
}
