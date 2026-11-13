export const instant = false;

// V117 | Comprovante interno. Consultar não cria novo crédito ou movimentação.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Banknote, Building2, CheckCircle2, ShieldCheck } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import ImprimirComprovanteButton from "../../creditos/comprovante/ImprimirComprovanteButton";

type Comprovante = {
  protocolo:string;repasse_id:number;prestacao_id:number;entregador_nome:string;
  conferido_por_nome:string;periodo_inicio:string;periodo_fim:string;
  enviado_at:string|null;forma:string;valor:number;taxa_cartao_autorizada:number;
  referencia:string|null;confirmado_at:string;
};
type Props={searchParams:Promise<{prestacao?:string;repasse?:string}>};
const moeda=(n:unknown)=>new Intl.NumberFormat("pt-BR",{
  style:"currency",currency:"BRL"
}).format(Number(n??0));
const dataBr=(s:string)=>s.split("-").reverse().join("/");
const horario=(s:string)=>new Date(s).toLocaleString("pt-BR",{
  timeZone:"America/Fortaleza",dateStyle:"long",timeStyle:"short"
});
function Campo({rotulo,valor}:{rotulo:string;valor:string}){
  return <div className="min-w-0">
    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{rotulo}</p>
    <p className="mt-1 break-words text-[12px] font-bold leading-6 text-slate-950">{valor}</p>
  </div>;
}

export default async function ComprovanteRepasseV117({searchParams}:Props){
  const usuario=await getCurrentUserProfile();
  if(!usuario||!usuario.ativo)redirect("/");
  if(!usuario.isPlatformAdmin&&!temPermissao(usuario.permissoes,PERMISSOES.FINANCEIRO_AUDITAR))
    redirect("/admin/financeiro");
  const q=await searchParams;
  const prestacao=Number(q.prestacao),repasse=Number(q.repasse);
  if(!Number.isSafeInteger(prestacao)||prestacao<1||!Number.isSafeInteger(repasse)||repasse<1)
    notFound();

  const supabase=await createClient();
  const {data,error}=await supabase.rpc("obter_comprovante_repasse_cd_v117",{
    p_empresa_id:usuario.empresa.id,p_prestacao_id:prestacao,p_repasse_id:repasse
  });
  if(error) return <main className="mx-auto max-w-2xl space-y-4 p-6">
    <Link href="/admin/financeiro/prestacoes" className="text-sm font-bold text-emerald-800">Voltar às prestações</Link>
    <h1 className="text-xl font-black">Comprovante temporariamente indisponível</h1>
    <p className="text-sm text-slate-600">Não foi possível consultar o registro de conferência. Nenhum lançamento financeiro foi alterado.</p>
  </main>;
  const registro=data as Comprovante|null;
  if(!registro||registro.prestacao_id!==prestacao||registro.repasse_id!==repasse)notFound();

  return <main className="min-h-dvh bg-[#ebf3ee] px-3 py-6 text-[#152b20] print:bg-white print:p-0">
    <div className="mx-auto max-w-[780px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/admin/financeiro/prestacoes"
          className="inline-flex items-center gap-2 text-xs font-bold text-emerald-900">
          <ArrowLeft size={16}/> Voltar às prestações
        </Link>
        <ImprimirComprovanteButton/>
      </div>
      <article className="overflow-hidden rounded-[25px] border border-emerald-100 bg-white shadow-lg print:rounded-none print:border-none print:shadow-none">
        <header className="bg-[linear-gradient(130deg,#0b4e2b,#187e44)] px-7 py-8 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <Building2 size={28}/>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">Cestas APP · Financeiro do CD · V117</p>
              <h1 className="mt-1 text-xl font-black">Comprovante interno de repasse</h1>
              <p className="mt-1 text-[12px] text-emerald-50">{usuario.empresa.nomeFantasia??"Empresa"}</p>
            </div>
          </div>
        </header>
        <div className="space-y-6 p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[17px] border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={27} className="text-emerald-700"/>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Conferência realizada</p>
                <p className="text-[14px] font-black">Valor confirmado como recebido pelo CD</p>
              </div>
            </div>
            <span className="rounded-full bg-white px-4 py-2 text-[12px] font-black text-emerald-950">
              {registro.protocolo}
            </span>
          </div>
          <div className="rounded-[20px] bg-[#f4faf6] p-6">
            <div className="flex items-center gap-2 text-emerald-700">
              <Banknote size={19}/><p className="text-[11px] font-bold">Valor deste repasse</p>
            </div>
            <p className="mt-2 text-3xl font-black tabular-nums text-emerald-950">{moeda(registro.valor)}</p>
          </div>
          <section className="grid gap-5 sm:grid-cols-2">
            <Campo rotulo="Entregador" valor={registro.entregador_nome}/>
            <Campo rotulo="Prestação de contas" valor={`Protocolo nº ${registro.prestacao_id}`}/>
            <Campo rotulo="Período da prestação" valor={`${dataBr(registro.periodo_inicio)} a ${dataBr(registro.periodo_fim)}`}/>
            <Campo rotulo="Forma de repasse" valor={registro.forma==="DINHEIRO"?"Dinheiro físico":registro.forma==="PIX"?"PIX do entregador":"Cartão do entregador"}/>
            <Campo rotulo="Confirmado pelo funcionário" valor={registro.conferido_por_nome}/>
            <Campo rotulo="Confirmado em (Fortaleza)" valor={horario(registro.confirmado_at)}/>
            <Campo rotulo="Protocolo interno" valor={registro.protocolo}/>
            {registro.referencia&&<Campo rotulo="Referência informada" valor={registro.referencia}/>}
            {Number(registro.taxa_cartao_autorizada)>0&&<Campo rotulo="Taxa autorizada no cartão" valor={moeda(registro.taxa_cartao_autorizada)}/>}
          </section>
          <section className="flex items-start gap-3 rounded-[16px] border border-sky-100 bg-sky-50 p-4">
            <ShieldCheck size={20} className="shrink-0 text-emerald-800"/>
            <p className="text-[11px] leading-6 text-slate-700">
              <strong>Documento interno do CD.</strong> Este recibo comprova o registro de conferência do repasse
              feito pelo funcionário no Cestas APP. Não constitui extrato bancário, comprovante de
              transferência PIX nem validação automática feita por instituição financeira.
            </p>
          </section>
          <footer className="border-t border-slate-100 pt-4 text-[10px] leading-5 text-slate-500">
            Documento emitido a partir de lançamento já confirmado e auditado. A impressão não altera saldos,
            não realiza novo pagamento e não quita outros repasses.
          </footer>
        </div>
      </article>
    </div>
  </main>;
}
