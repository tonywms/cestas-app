export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock3, LocateFixed, ShieldCheck } from "lucide-react";
import CestasMobileShellV119_3 from "@/components/mobile/CestasMobileShellV119_3";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

type Ponto = {
  id: number; tipo_evento: string; referencia_id: number; latitude: number;
  longitude: number; precisao_m: number; capturado_em: string;
};
const dataHora = (v: string) => new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Fortaleza", dateStyle: "short", timeStyle: "short",
}).format(new Date(v));
const tipoNome = (v: string) => v === "ENTREGA" ? "Entrega" : v === "VENDA" ? "Venda" : "Cobrança";

export default async function MeusPontosV120() {
  const usuario = await getCurrentUserProfile();
  if (!usuario || !usuario.ativo) redirect("/");
  const modo = usuario.perfilCodigo === "ENTREGADOR" ? "entregador" : "gestor";
  const supabase = await createClient();
  const { data, error } = await supabase.from("gps_atendimentos_v120")
    .select("id,tipo_evento,referencia_id,latitude,longitude,precisao_m,capturado_em")
    .eq("empresa_id", usuario.empresa.id).eq("usuario_id", usuario.id)
    .order("capturado_em", { ascending: false }).limit(30);
  const pontos = (data ?? []) as Ponto[];
  return <CestasMobileShellV119_3 modo={modo} etiqueta="LOCALIZAÇÃO OPERACIONAL · V120.1"
    titulo="Meus pontos" subtitulo="Apenas atendimentos confirmados com GPS autorizado">
    <section className="card-premium rounded-[25px] border border-white bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700"><LocateFixed size={23}/></span>
        <div><p className="text-[9px] font-black uppercase tracking-widest text-[#b07a12]">Rastreabilidade por evento</p>
          <h2 className="mt-1 text-[18px] font-black text-emerald-950">Locais dos meus atendimentos</h2></div>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-slate-500">Não há coleta contínua. Um ponto só é gravado quando você toca em registrar local depois de uma entrega, venda ou cobrança confirmada.</p>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-[#f0f8f3] px-4 py-3"><span className="text-[11px] font-bold text-slate-600">Últimos registros</span><strong className="text-xl text-emerald-900">{pontos.length}</strong></div>
    </section>
    {error ? <section role="alert" className="rounded-[23px] border border-amber-200 bg-white p-5"><p className="text-[13px] font-black text-amber-900">Consulta GPS indisponível</p><p className="mt-2 text-[11px] leading-5 text-slate-600">A tabela da V120.1 pode não ter sido criada no banco conectado ao aplicativo. Nenhum atendimento foi alterado.</p></section>
      : pontos.length === 0 ? <section className="card-premium rounded-[23px] bg-white p-7 text-center"><Clock3 className="mx-auto text-slate-400" size={30}/><p className="mt-3 text-[13px] font-black text-emerald-950">Nenhuma localização registrada</p><p className="mt-2 text-[11px] leading-5 text-slate-500">Após concluir um atendimento, toque em “Registrar local (opcional)”.</p></section>
        : <section className="space-y-3" aria-label="Histórico de localizações">{pontos.map(ponto => <article key={ponto.id} className="card-premium rounded-[22px] border border-white bg-white p-4">
          <div className="flex items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-wider text-emerald-800">{tipoNome(ponto.tipo_evento)} nº {ponto.referencia_id}</p><CheckCircle2 size={17} className="text-emerald-600"/></div>
          <p className="mt-2 text-[12px] font-bold text-emerald-950">{dataHora(ponto.capturado_em)}</p>
          <p className="mt-1 text-[11px] text-slate-500">Precisão informada: aproximadamente {Math.round(ponto.precisao_m)} m</p>
          <p className="mt-1 break-all font-mono text-[11px] text-slate-500">{Number(ponto.latitude).toFixed(6)}, {Number(ponto.longitude).toFixed(6)}</p>
        </article>)}</section>}
    <aside className="flex gap-3 rounded-[20px] bg-white p-4 text-[10px] leading-[18px] text-slate-500"><ShieldCheck size={20} className="shrink-0 text-emerald-700"/>Coordenadas fornecidas pelo aparelho são aproximadas e não constituem prova absoluta de presença física. O acesso deve respeitar a política de privacidade da empresa.</aside>
    <Link prefetch={false} href="/mobile" className="block rounded-[15px] bg-emerald-800 p-4 text-center text-[12px] font-black text-white">Voltar ao início</Link>
  </CestasMobileShellV119_3>;
}
