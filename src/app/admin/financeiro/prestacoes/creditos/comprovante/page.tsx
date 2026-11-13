export const instant = false;

// Comprovante interno de conferência manual do CD. Não é comprovante bancário.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Building2, CheckCircle2, ShieldCheck } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES,temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import ImprimirComprovanteButton from "./ImprimirComprovanteButton";

type Confirmacao = {
  origem: string; origem_id: number; protocolo: string;
  forma: string; valor: number; cliente_nome: string;
  recebido_at: string; confirmado_at: string; confirmado_por_nome: string;
  tipo_confirmacao: string; referencia: string | null; prestacao_id: number | null;
};
type Props={searchParams:Promise<{inicio?:string;fim?:string;origem?:string;id?:string}>};
const moeda=(v:unknown)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v??0));
const horario=(v:string)=>new Date(v).toLocaleString("pt-BR",{
  timeZone:"America/Fortaleza",dateStyle:"long",timeStyle:"short"
});
const formato=(s:string)=>s.split("-").reverse().join("/");
export default async function ComprovanteConferenciaCdV113({searchParams}:Props){
  const usuario=await getCurrentUserProfile();
  if(!usuario||!usuario.ativo)redirect("/");
  if(!usuario.isPlatformAdmin&&!temPermissao(usuario.permissoes,PERMISSOES.FINANCEIRO_AUDITAR))
    redirect("/admin/financeiro");
  const params=await searchParams;
  const inicio=String(params.inicio??""),fim=String(params.fim??"");
  const origem=String(params.origem??"");
  const id=Number(params.id);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(inicio)||!/^\d{4}-\d{2}-\d{2}$/.test(fim)||
    !["VENDA","COBRANCA","PARCELA"].includes(origem)||
    !Number.isSafeInteger(id)||id<=0)notFound();

  const supabase=await createClient();
  const {data,error}=await supabase.rpc("historico_confirmacoes_cd_v113",{
    p_empresa_id:usuario.empresa.id,p_inicio:inicio,p_fim:fim,
  });
  if(error) return <main className="mx-auto max-w-xl p-6">
    <h1 className="text-lg font-black">Não foi possível consultar o comprovante</h1>
    <p className="mt-3 text-xs text-slate-600">Confira o período ou entre em contato com o Financeiro.</p>
    <Link href="/admin/financeiro/prestacoes/creditos" className="mt-4 inline-block text-sm font-bold text-emerald-800">Voltar</Link>
  </main>;

  const historico=(Array.isArray(data)?data:[]) as Confirmacao[];
  const confirmado=historico.find(x=>x.origem===origem&&Number(x.origem_id)===id);
  if(!confirmado)notFound();
  const manual=confirmado.tipo_confirmacao==="MANUAL_CD";
  const consulta=new URLSearchParams({inicio,fim,situacao:"CONCILIADO"});
  return <main className="min-h-dvh bg-[#eaf1ed] px-3 py-6 text-[#172c21] print:bg-white print:p-0">
    <div className="mx-auto max-w-[760px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/admin/financeiro/prestacoes/creditos?${consulta.toString()}`}
          className="inline-flex items-center gap-2 text-xs font-bold text-emerald-900">
          <ArrowLeft size={16}/> Voltar à conciliação
        </Link>
        <ImprimirComprovanteButton/>
      </div>
      <article className="overflow-hidden rounded-[25px] border border-emerald-100 bg-white shadow-lg print:rounded-none print:border-0 print:shadow-none">
        <header className="bg-[linear-gradient(130deg,#0b4f2d,#167c42)] px-7 py-8 text-white print:rounded-none">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15"><Building2 size={28}/></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">Cestas APP · Financeiro do CD</p>
              <h1 className="mt-1 text-xl font-black">Comprovante interno de conferência</h1>
              <p className="mt-1 text-[12px] text-white/80">{usuario.empresa.nomeFantasia??"Empresa"}</p>
            </div>
          </div>
        </header>
        <div className="space-y-6 p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-3 text-emerald-950">
              <CheckCircle2 size={25} className="text-emerald-700"/>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Status</p>
                <p className="text-[14px] font-black">Recebimento confirmado pelo CD</p>
              </div>
            </div>
            <span className="rounded-full bg-white px-4 py-2 text-[12px] font-black text-emerald-900">{confirmado.protocolo}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Info titulo="Cliente" conteudo={confirmado.cliente_nome}/>
            <Info titulo="Documento de origem" conteudo={`${confirmado.origem} nº ${confirmado.origem_id}`}/>
            <Info titulo="Forma de pagamento" conteudo={confirmado.forma}/>
            <Info titulo="Data do recebimento informado" conteudo={horario(confirmado.recebido_at)}/>
          </div>
          <div className="rounded-2xl bg-[#f4faf6] p-5">
            <p className="text-[11px] font-bold text-emerald-800">Valor registrado e conferido</p>
            <p className="mt-2 text-3xl font-black tabular-nums text-emerald-950">{moeda(confirmado.valor)}</p>
          </div>
          <section className="space-y-4 border-t border-slate-100 pt-5">
            <h2 className="flex items-center gap-2 text-[14px] font-black text-emerald-900"><ShieldCheck size={20}/> Registro da conferência</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Info titulo="Responsável pela confirmação" conteudo={confirmado.confirmado_por_nome}/>
              <Info titulo="Conferido em (horário de Fortaleza)" conteudo={horario(confirmado.confirmado_at)}/>
              <Info titulo="Protocolo interno" conteudo={confirmado.protocolo}/>
              <Info titulo="Tipo de conferência" conteudo={manual?"Confirmação manual do CD":
                confirmado.tipo_confirmacao==="CONFERENCIA_PRESTACAO"?"Conferência pela prestação de contas":"Registro de conferência do CD"}/>
            </div>
            {confirmado.referencia && !manual && <Info titulo="Referência informada na conferência" conteudo={confirmado.referencia}/>}
          </section>
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11px] leading-6 text-amber-950">
            <strong>Documento interno.</strong> Esta confirmação foi registrada por usuário autorizado do CD e
            possui histórico de responsável e horário. Não é comprovante de transferência bancária,
            extrato ou validação automática de crédito pelo banco.
          </p>
          <footer className="border-t border-slate-100 pt-5 text-[10px] leading-5 text-slate-500">
            Documento consultado a partir de registro existente no sistema. Período de referência:
            {" "}{formato(inicio)} a {formato(fim)}. Não houve criação de novo pagamento para emissão deste comprovante.
          </footer>
        </div>
      </article>
    </div>
  </main>;
}
function Info({titulo,conteudo}:{titulo:string;conteudo:string}){
  return <div>
    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
    <p className="mt-1 break-words text-[12px] font-bold leading-5 text-slate-900">{conteudo}</p>
  </div>;
}
