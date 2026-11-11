export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, CalendarDays, CheckCheck, CircleDollarSign, Target, TrendingUp, Truck } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import { dataBr, dataHora, diaFortaleza, dinheiro, deslocarDia } from "@/lib/gestao/indicadores-v119";
import CestasMobileShellV119_3 from "@/components/mobile/CestasMobileShellV119_3";

type Props = { searchParams: Promise<{ meta?: string }> };
type Nivel = { emoji: string; titulo: string; frase: string; estilo: string };

function Tile({ titulo, valor, icone: Icone }: { titulo: string; valor: string; icone: typeof Truck }) {
  return <div className="card-premium min-w-0 rounded-[20px] border border-white bg-white p-4 shadow-[0_9px_22px_rgba(17,63,33,.045)]">
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#177443]"><Icone size={18}/></span>
    <p className="mt-3 text-[10px] font-black uppercase tracking-[.08em] text-slate-500">{titulo}</p>
    <p className="mt-1 break-words text-[21px] font-black tracking-tight text-emerald-950">{valor}</p>
  </div>;
}

// V119.3: somente dados do próprio entregador + apresentação idêntica ao coletor.
export default async function ProdutividadeV119_3({ searchParams }: Props) {
  const user = await getCurrentUserProfile();
  if (!user || !user.ativo) redirect("/");
  if (user.perfilCodigo !== "ENTREGADOR" && !user.isPlatformAdmin) redirect("/mobile/sem-acesso");
  const q = await searchParams;
  const meta = [4, 6, 8, 10, 12].includes(Number(q.meta)) ? Number(q.meta) : 8;
  const hoje = diaFortaleza();
  const inicio7 = deslocarDia(hoje, -6);
  const inicioIso = `${inicio7}T00:00:00-03:00`;
  const fimIso = `${hoje}T23:59:59.999-03:00`;
  const db = await createClient();
  const [entregasResult, vendasResult] = await Promise.all([
    db.from("entregas").select("id,entregue_at", { count: "exact" }).eq("empresa_id", user.empresa.id)
      .eq("entregador_id", user.id).eq("status", "CONCLUIDA")
      .gte("entregue_at", inicioIso).lte("entregue_at", fimIso)
      .order("entregue_at", { ascending: false }).limit(1000),
    db.from("vendas").select("id,valor_total,created_at", { count: "exact" }).eq("empresa_id", user.empresa.id)
      .eq("entregador_id", user.id).gte("created_at", `${hoje}T00:00:00-03:00`)
      .lte("created_at", fimIso).limit(1000),
  ]);
  const cabecalho = { modo: "entregador" as const, etiqueta: "Operação de hoje", titulo: "Minha produtividade", subtitulo: `${user.nome.split(" ")[0]} · ${dataBr(hoje)} · Seu desempenho individual` };
  if (entregasResult.error || vendasResult.error) return <CestasMobileShellV119_3 {...cabecalho}>
    <div role="alert" className="card-premium rounded-[24px] bg-white p-6 text-sm font-semibold text-red-800">Não foi possível carregar os indicadores. Nenhum registro foi alterado.</div>
    <Link href="/mobile" className="block rounded-xl bg-emerald-800 p-4 text-center text-sm font-bold text-white">Voltar ao início</Link>
  </CestasMobileShellV119_3>;

  const entregas = entregasResult.data ?? [];
  const vendas = vendasResult.data ?? [];
  const hojeContagem = entregas.filter(x => x.entregue_at && diaFortaleza(new Date(x.entregue_at)) === hoje).length;
  const parcial = (entregasResult.count ?? 0) > 1000 || (vendasResult.count ?? 0) > 1000;
  const percentual = Math.round(hojeContagem / meta * 100);
  const nivel: Nivel = hojeContagem === 0
    ? { emoji: "🙂", titulo: "Vamos começar?", frase: "Aguardando a primeira entrega concluída de hoje.", estilo: "bg-[#fff7e9]" }
    : percentual >= 100
    ? { emoji: "😄", titulo: "Ótimo ritmo!", frase: "Você alcançou a referência selecionada para hoje.", estilo: "bg-[#e7f8ee]" }
    : percentual >= 70
    ? { emoji: "😊", titulo: "Bom ritmo!", frase: "Você está próximo da referência de hoje.", estilo: "bg-[#eaf4fe]" }
    : { emoji: "🙂", titulo: "Em evolução", frase: "O dia está em andamento. Continue registrando as entregas.", estilo: "bg-[#fff7e9]" };
  const semana = Array.from({ length: 7 }, (_, i) => ({ data: deslocarDia(hoje, i - 6), total: 0 }));
  const mapa = new Map(semana.map(x => [x.data, x]));
  for (const x of entregas) {
    if (!x.entregue_at) continue;
    const dia = diaFortaleza(new Date(x.entregue_at));
    const item = mapa.get(dia);
    if (item) item.total++;
  }
  const max = Math.max(1, ...semana.map(x => x.total));
  return <CestasMobileShellV119_3 {...cabecalho}>
    {parcial && <p role="alert" className="rounded-[17px] border border-amber-200 bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-900">Os registros atingiram o limite da consulta. Alguns totais podem estar incompletos. Não use este painel para prestação de contas.</p>}
    <section className="card-premium overflow-hidden rounded-[25px] border border-white bg-white p-4 shadow-[0_15px_30px_rgba(17,63,33,.07)]">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#b07a12]">Seu desempenho hoje</p><h2 className="mt-1 text-[20px] font-black tracking-tight text-emerald-950">Como está meu dia?</h2></div>
        <span className="rounded-full bg-emerald-50 px-3 py-2 text-[9px] font-black uppercase text-emerald-800">Hoje</span>
      </div>
      <div className={`mt-4 flex items-center gap-3 rounded-[18px] p-3 ${nivel.estilo}`}>
        <div role="img" aria-label={nivel.titulo} className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/75 text-[43px] shadow-sm">{nivel.emoji}</div>
        <div className="min-w-0"><h3 className="text-[19px] font-black tracking-tight text-emerald-950">{nivel.titulo}</h3><p className="mt-1 text-[11px] leading-[18px] text-slate-600">{nivel.frase}</p></div>
      </div>
      <div className="mt-4 flex items-center justify-between text-[11px]"><span className="font-bold text-slate-600">Entregas concluídas</span><strong className="tabular-nums text-emerald-950">{hojeContagem} de {meta}</strong></div>
      <div className="mt-2 h-[9px] overflow-hidden rounded-full bg-[#eaf2ec]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#146c3b,#27a765)]" style={{ width: `${Math.min(100, percentual)}%` }} /></div>
      <p className="mt-2 text-[10px] font-bold text-emerald-800">{percentual}% da referência selecionada</p>
    </section>

    <form method="get" className="card-premium rounded-[21px] border border-emerald-100 bg-white p-4">
      <label htmlFor="meta-pessoal" className="flex items-center gap-2 text-[11px] font-black text-emerald-950"><Target size={17} className="text-emerald-700"/> Referência para hoje</label>
      <div className="mt-3 flex gap-2"><select id="meta-pessoal" name="meta" defaultValue={String(meta)} className="h-11 min-w-0 flex-1 rounded-[12px] border border-emerald-100 bg-[#f4faf6] px-3 text-[12px] font-bold text-emerald-950"><option value="4">4 entregas</option><option value="6">6 entregas</option><option value="8">8 entregas</option><option value="10">10 entregas</option><option value="12">12 entregas</option></select><button type="submit" className="h-11 rounded-[12px] bg-[#176f3c] px-4 text-[11px] font-black text-white">Aplicar</button></div>
      <p className="mt-2 text-[10px] leading-[17px] text-slate-500">Referência ilustrativa. Não é uma meta oficial nem avaliação trabalhista.</p>
    </form>

    <section className="grid grid-cols-2 gap-3" aria-label="Meu resumo operacional">
      <Tile titulo="Entregas hoje" valor={String(hojeContagem)} icone={Truck}/>
      <Tile titulo="Últimos 7 dias" valor={String(entregasResult.count ?? entregas.length)} icone={CalendarDays}/>
      <Tile titulo="Vendas hoje" valor={String(vendasResult.count ?? vendas.length)} icone={BadgeCheck}/>
      <Tile titulo="Vendido hoje" valor={dinheiro(vendas.reduce((s, x) => s + Number(x.valor_total ?? 0), 0))} icone={CircleDollarSign}/>
    </section>

    <section className="card-premium rounded-[24px] border border-white bg-white p-4">
      <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#176f3c]"><TrendingUp size={18}/></span><div><h2 className="text-[15px] font-black text-emerald-950">Meus últimos 7 dias</h2><p className="text-[10px] text-slate-500">Entregas concluídas por dia</p></div></div>
      <div className="mt-5 flex h-36 items-end gap-2 border-b border-slate-100 pb-2">{semana.map(x => <div key={x.data} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"><span className="text-[10px] font-black text-emerald-900">{x.total}</span><div className="w-full max-w-[30px] rounded-t-[8px] bg-[linear-gradient(#2aa763,#176f3c)]" style={{ height: `${Math.max(4, 100 * x.total / max)}%` }} /><span className="text-[9px] font-bold text-slate-500">{x.data.slice(8, 10)}</span></div>)}</div>
    </section>

    <section className="card-premium rounded-[24px] border border-white bg-white p-4"><div className="flex items-center gap-2"><CheckCheck size={19} className="text-emerald-700"/><h2 className="text-[15px] font-black text-emerald-950">Últimas entregas</h2></div>
      {entregas.length ? <div className="mt-4 space-y-2">{entregas.slice(0, 8).map(x => <div key={x.id} className="flex items-center justify-between gap-2 rounded-[14px] bg-[#f4f9f5] px-3 py-3"><span className="text-[11px] font-black">Entrega nº {x.id}</span><span className="text-[10px] font-semibold text-slate-500">{x.entregue_at ? dataHora(x.entregue_at) : "—"}</span></div>)}</div> : <p className="mt-3 rounded-xl bg-[#f4f9f5] p-4 text-[11px] text-slate-500">Nenhuma entrega concluída registrada nos últimos 7 dias.</p>}
    </section>
    <p className="rounded-[18px] bg-white/80 p-4 text-[10px] leading-[18px] text-slate-500">Indicadores informativos da sua operação, sem impacto sobre prestação de contas, pagamentos ou estoque.</p>
  </CestasMobileShellV119_3>;
}
