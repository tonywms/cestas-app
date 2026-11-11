import Link from "next/link";
import { AlertTriangle, Banknote, Boxes, CalendarRange, MapPinned, PackageCheck, Route, ShoppingBag, UsersRound } from "lucide-react";
import CestasMobileShellV119_3 from "@/components/mobile/CestasMobileShellV119_3";
import { dataBr, dinheiro, type Visao } from "@/lib/gestao/indicadores-v119";

const num = (n: number) => n.toLocaleString("pt-BR");
function Kpi({ titulo, valor, detalhe, icone: Icone }: { titulo: string; valor: string; detalhe: string; icone: typeof Boxes }) {
  return <div className="card-premium min-w-0 rounded-[20px] border border-white bg-white p-4 shadow-[0_9px_22px_rgba(17,63,33,.045)]">
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f7ec] text-[#176f3c]"><Icone size={18}/></span>
    <p className="mt-3 text-[10px] font-black uppercase tracking-[.08em] text-slate-500">{titulo}</p>
    <p className="mt-1 break-words text-[21px] font-black tracking-tight text-emerald-950">{valor}</p>
    <p className="mt-1 text-[10px] leading-[16px] text-slate-500">{detalhe}</p>
  </div>;
}

// Mobile gestor: o mesmo componente de dados já homologado na V119, sem duplicar RPCs.
export default function PainelGestorMobileV119_3({ visao, nome, dias }: { visao: Visao; nome: string; dias: number }) {
  const max = Math.max(1, ...visao.serie.map(x => x.entregas));
  const totalEntregasEquipe = visao.equipe.reduce((s, x) => s + x.entregas, 0);
  const maxBairro = Math.max(1, ...visao.bairros.map(x => x.atendimentos));
  return <CestasMobileShellV119_3 modo="gestor" etiqueta="Central de gestão" titulo="Painel do gestor" subtitulo={`${nome} · ${dataBr(visao.inicio)} a ${dataBr(visao.fim)}`}>
    {visao.limiteAtingido && <p role="alert" className="flex items-start gap-2 rounded-[17px] border border-amber-200 bg-amber-50 p-4 text-[11px] font-bold leading-5 text-amber-900"><AlertTriangle size={17} className="shrink-0"/> Há mais registros do que o limite da consulta; números podem ser parciais. Não utilizar para fechamento de caixa.</p>}
    <section className="card-premium rounded-[25px] border border-white bg-white p-4 shadow-[0_15px_30px_rgba(17,63,33,.07)]">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#b07a12]">Visão consolidada</p><h2 className="mt-1 text-[19px] font-black tracking-tight text-emerald-950">Sua operação em números</h2></div><span className="rounded-full bg-emerald-50 px-3 py-2 text-[9px] font-black text-emerald-800">{dias} dias</span></div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-[16px] bg-[#f0f8f2] p-4"><p className="text-[10px] font-black text-[#547360]">Entregas concluídas</p><p className="mt-2 text-[29px] font-black leading-none text-[#125b32]">{num(visao.entregas)}</p></div>
        <div className="rounded-[16px] bg-[#fff8eb] p-4"><p className="text-[10px] font-black text-[#8b6c34]">Vendas registradas</p><p className="mt-2 text-[29px] font-black leading-none text-[#8e6319]">{num(visao.vendas)}</p></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2"><Link prefetch={false} href="/admin/dashboard" className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-[#176f3c] px-4 text-[11px] font-black text-white">Dashboard web</Link><Link prefetch={false} href="/admin/territorio" className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 px-4 text-[11px] font-black text-emerald-800">Território</Link></div>
    </section>

    <form method="get" className="card-premium rounded-[20px] border border-emerald-100 bg-white p-4"><label htmlFor="dias-gestor" className="flex items-center gap-2 text-[11px] font-black text-emerald-950"><CalendarRange size={17} className="text-emerald-700"/> Período dos indicadores</label>
      <div className="mt-3 flex gap-2"><select id="dias-gestor" name="dias" defaultValue={String(dias)} className="h-11 min-w-0 flex-1 rounded-[12px] border border-emerald-100 bg-[#f4faf6] px-3 text-[12px] font-bold text-emerald-950"><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select><button type="submit" className="h-11 rounded-[12px] bg-[#176f3c] px-4 text-[11px] font-black text-white">Aplicar</button></div>
    </form>

    <section aria-label="Indicadores do gestor" className="grid grid-cols-2 gap-3">
      <Kpi titulo="Valor vendido" valor={dinheiro(visao.faturamento)} detalhe="Vendas registradas" icone={ShoppingBag}/>
      <Kpi titulo="Recebimentos" valor={dinheiro(visao.recebido)} detalhe={`${num(visao.pagamentos)} pagamentos`} icone={Banknote}/>
      <Kpi titulo="Cargas abertas" valor={num(visao.cargasAbertas)} detalhe="Ainda não finalizadas" icone={Boxes}/>
      <Kpi titulo="Ocorrências" valor={num(visao.ocorrencias)} detalhe="No período selecionado" icone={AlertTriangle}/>
      <Kpi titulo="Entregadores" valor={num(visao.equipe.filter(x => x.entregas > 0).length)} detalhe="Com entregas registradas" icone={UsersRound}/>
      <Kpi titulo="Bairros" valor={num(visao.bairros.length)} detalhe="Com entregas no período" icone={MapPinned}/>
    </section>

    <section className="card-premium rounded-[24px] border border-white bg-white p-4"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#176f3c]"><Route size={18}/></span><div><h2 className="text-[15px] font-black text-emerald-950">Ritmo das entregas</h2><p className="text-[10px] text-slate-500">Últimos dias do período</p></div></div>
      <div className="mt-5 flex h-36 items-end gap-2 border-b border-slate-100 pb-2">{visao.serie.map(x => <div key={x.data} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"><span className="text-[10px] font-black text-emerald-900">{x.entregas}</span><div className="w-full max-w-[31px] rounded-t-[8px] bg-[linear-gradient(#2aa763,#176f3c)]" style={{ height: `${Math.max(4, x.entregas / max * 100)}%` }}/><span className="text-[9px] font-bold text-slate-500">{x.data.slice(8,10)}</span></div>)}</div>
    </section>

    <section className="card-premium rounded-[24px] border border-white bg-white p-4"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#176f3c]"><MapPinned size={18}/></span><div><h2 className="text-[15px] font-black text-emerald-950">Bairros com mais entregas</h2><p className="text-[10px] text-slate-500">Concentração registrada, não GPS</p></div></div>
      {visao.bairros.length ? <div className="mt-4 space-y-3">{visao.bairros.slice(0, 6).map((b, i) => <div key={b.cidade+"::"+b.nome}><div className="flex items-center justify-between gap-2 text-[11px]"><span className="min-w-0 truncate font-black">{i+1}. {b.nome} · {b.cidade}</span><span className="font-black tabular-nums text-emerald-900">{b.atendimentos}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-emerald-50"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${b.atendimentos / maxBairro * 100}%` }}/></div></div>)}</div> : <p className="mt-4 rounded-xl bg-[#f4f9f5] p-4 text-[11px] text-slate-500">Ainda não há bairros com entregas registradas neste período.</p>}
      <Link prefetch={false} href="/admin/territorio" className="mt-4 inline-flex min-h-10 items-center text-[11px] font-black text-emerald-800">Explorar todos os bairros →</Link>
    </section>

    <section className="card-premium rounded-[24px] border border-white bg-white p-4"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#176f3c]"><UsersRound size={18}/></span><div><h2 className="text-[15px] font-black text-emerald-950">Equipe em campo</h2><p className="text-[10px] text-slate-500">{num(totalEntregasEquipe)} entregas registradas pela equipe</p></div></div>
      {visao.equipe.length ? <div className="mt-4 space-y-2">{visao.equipe.slice(0, 20).map(x => <article key={x.id} className="flex items-center justify-between gap-3 rounded-[15px] bg-[#f4f9f5] p-3"><div className="min-w-0"><h3 className="truncate text-[11px] font-black text-emerald-950">{x.nome}</h3><p className="mt-1 text-[10px] text-slate-500">{x.vendas} vendas · {x.ocorrencias} ocorrências</p></div><div className="shrink-0 text-right"><p className="text-[17px] font-black tabular-nums text-emerald-950">{x.entregas}</p><p className="text-[9px] text-slate-500">entregas</p></div></article>)}</div> : <p className="mt-4 text-[11px] text-slate-500">Nenhum entregador identificado.</p>}
    </section>
    <p className="rounded-[17px] bg-white p-4 text-[10px] leading-[18px] text-slate-500"><PackageCheck size={14} className="mr-1 inline align-middle text-emerald-700"/> Painel gerencial somente leitura. Valores de vendas não substituem prestação de contas. Localização representa bairro cadastrado, não trajeto GPS.</p>
  </CestasMobileShellV119_3>;
}
