export const instant = false;
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, MapPinned, Navigation, ShieldCheck } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { dataBr, dataHora, obterVisao, periodo, temPerfilGestao } from "@/lib/gestao/indicadores-v119";

type Props = { searchParams: Promise<{ dias?: string }> };
export default async function TerritorioV119({searchParams}: Props) {
  const user = await getCurrentUserProfile();
  if (!user || !user.ativo) redirect("/");
  if (!temPerfilGestao(user)) redirect("/admin");
  const { dias } = await searchParams;
  let visao: Awaited<ReturnType<typeof obterVisao>>;
  try { visao = await obterVisao(user.empresa.id, dias); }
  catch(e) { console.error("[V119] Consulta territorial indisponível",e); return <main className="app-premium min-h-screen p-6"><h1 className="text-xl font-black">Território de atendimento</h1><p role="alert" className="mt-4 rounded-xl bg-red-50 p-4">A consulta está temporariamente indisponível.</p></main>; }
  const maior = Math.max(1,...visao.bairros.map(x=>x.atendimentos));
  return <main className="app-premium min-h-screen bg-[#f1f7f2] px-4 py-7 text-[#142018] md:px-8">
    <div className="mx-auto max-w-[1100px] space-y-5">
      <header className="hero-premium grain rounded-[28px] p-6 text-white">
        <Link prefetch={false} href="/admin/gestao-operacional" className="inline-flex items-center gap-2 text-xs font-bold"><ArrowLeft size={17}/> Centro de gestão</Link>
        <div className="mt-6 flex items-center gap-3"><MapPinned size={28}/><div><p className="text-[10px] font-black uppercase tracking-widest text-amber-200">Território · V119</p><h1 className="text-[25px] font-black">Mapa de calor operacional</h1></div></div>
        <p className="mt-3 text-xs leading-6 text-emerald-100">Concentração de entregas concluídas por bairro cadastrado do cliente, entre {dataBr(visao.inicio)} e {dataBr(visao.fim)}. Não é rastreamento GPS.</p>
      </header>
      {visao.limiteAtingido && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-900">A amostra excedeu o limite de leitura. Reduza o período; as contagens mostradas podem ser parciais.</p>}
      <form className="flex items-center justify-between gap-3 rounded-xl bg-white p-4" method="get">
        <label htmlFor="periodo-territorio" className="text-xs font-black">Período analisado</label>
        <div className="flex gap-2"><select id="periodo-territorio" name="dias" defaultValue={String(periodo(dias).dias)} className="h-11 rounded-xl border border-emerald-100 px-3 text-xs font-bold"><option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option></select><button className="rounded-xl bg-emerald-800 px-4 text-xs font-black text-white">Filtrar</button></div>
      </form>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] border border-emerald-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black">Intensidade dos bairros</h2>
          <p className="mt-1 text-[11px] text-slate-500">Quanto maior a barra, maior o número de entregas registradas.</p>
          <div className="mt-5 space-y-4">{visao.bairros.length ? visao.bairros.slice(0,30).map((a,i)=><div key={a.cidade+"/"+a.nome}>
            <div className="flex items-center justify-between gap-3 text-xs"><p className="min-w-0 truncate font-bold"><span className="text-slate-400">{i+1}.</span> {a.nome} · {a.cidade}</p><strong className="shrink-0 tabular-nums">{a.atendimentos}</strong></div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[linear-gradient(90deg,#bce8c6,#209854,#12643b)]" style={{width:`${100*a.atendimentos/maior}%`}}/></div>
            <p className="mt-1 text-[10px] text-slate-400">{a.vendedores} entregador(es) com entregas</p>
          </div>) : <p className="text-xs text-slate-500">Nenhuma entrega com bairro identificado no período.</p>}</div>
        </div>
        <div className="rounded-[24px] border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2"><CalendarClock size={20} className="text-emerald-800"/><h2 className="text-base font-black">Trilha de atendimentos</h2></div>
          <p className="mt-1 text-[11px] text-slate-500">Últimas 40 entregas concluídas no período, ordenadas por registro.</p>
          <div className="mt-5 space-y-3">{visao.visitas.length?visao.visitas.map((v)=><div key={v.id} className="border-l-[3px] border-emerald-200 bg-[#f6faf7] p-3">
            <div className="flex items-center justify-between gap-2"><strong className="text-xs text-slate-900">{v.nomeCliente}</strong><span className="text-[10px] text-slate-500">{dataHora(v.data)}</span></div>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-600"><Navigation size={12}/>{v.bairro} · {v.cidade}</p>
            <p className="mt-1 text-[10px] font-bold text-emerald-800">{v.vendedor}</p>
          </div>):<p className="text-xs text-slate-500">Nenhuma visita registrada no período.</p>}</div>
        </div>
      </section>
      <aside className="rounded-[20px] border border-emerald-100 bg-white p-5 text-xs leading-6 text-slate-600">
        <h3 className="flex items-center gap-2 font-black text-emerald-950"><ShieldCheck size={18}/> Escopo e integridade dos dados</h3>
        <p className="mt-2">Esta tela utiliza o endereço atual cadastrado do cliente e o horário da entrega. Não captura coordenadas, não rastreia deslocamento contínuo, não calcula quilometragem e não prova o trajeto físico percorrido. O rastreamento GPS real será uma evolução separada, com transparência aos usuários, controle de acesso e retenção limitada.</p>
      </aside>
    </div>
  </main>;
}
