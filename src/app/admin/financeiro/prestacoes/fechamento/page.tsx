export const instant = false;

// V114 | Painel financeiro do CD. Somente leitura de fontes confirmadas.
import Link from "next/link";
import {redirect} from "next/navigation";
import {
  ArrowLeft,Building2,Banknote,CheckCircle2,Clock3,FileSpreadsheet,
  ShieldCheck,Wallet,ClipboardCheck,AlertTriangle
} from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES,temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import {
  type ResumoCreditosV114,type PrestacaoCDV114,
  dataBrV114,horarioV114,hojeV114,moedaV114,numeroV114,
  periodoValidoV114,resumoPrestacoesV114
} from "@/lib/financeiro/fechamento-cd-v114";

type Props={searchParams:Promise<{inicio?:string;fim?:string}>};
function Metrica({titulo,valor,detalhe,cor="emerald"}:{
  titulo:string;valor:unknown;detalhe:string;cor?:"emerald"|"amber"|"slate";
}){
  const classes=cor==="amber"?"border-amber-100 bg-amber-50":cor==="slate"?"border-slate-100 bg-white":"border-emerald-100 bg-white";
  return <div className={`rounded-[22px] border p-4 shadow-sm ${classes}`}>
    <p className="text-[11px] font-black text-slate-700">{titulo}</p>
    <p className="mt-2 text-[22px] font-black tabular-nums text-emerald-950">{moedaV114(valor)}</p>
    <p className="mt-1 text-[10px] leading-5 text-slate-500">{detalhe}</p>
  </div>;
}
export default async function FechamentoCdV114({searchParams}:Props){
  const usuario=await getCurrentUserProfile();
  if(!usuario||!usuario.ativo)redirect("/");
  if(!usuario.isPlatformAdmin&&!temPermissao(usuario.permissoes,PERMISSOES.FINANCEIRO_AUDITAR))
    redirect("/admin/financeiro");

  const q=await searchParams, hoje=hojeV114();
  const inicio=String(q.inicio??hoje),fim=String(q.fim??hoje);
  const periodoValido=periodoValidoV114(inicio,fim,hoje);
  let creditos:ResumoCreditosV114|null=null;
  let prestacoes:PrestacaoCDV114[]=[];
  let erro:string|null=null;
  if(periodoValido){
    const supabase=await createClient();
    const [resCreditos,resPrestacoes]=await Promise.all([
      supabase.rpc("listar_creditos_corporativos_v110",{
        p_empresa_id:usuario.empresa.id,p_inicio:inicio,p_fim:fim
      }),
      supabase.rpc("listar_prestacoes_v109",{p_empresa_id:usuario.empresa.id})
    ]);
    if(resCreditos.error||resPrestacoes.error){
      erro=resCreditos.error?.message??resPrestacoes.error?.message??"Erro no financeiro.";
    }else{
      creditos=(resCreditos.data??{}) as ResumoCreditosV114;
      prestacoes=Array.isArray(resPrestacoes.data)?resPrestacoes.data as PrestacaoCDV114[]:[];
    }
  }
  const r=resumoPrestacoesV114(prestacoes,inicio,fim);
  const avisoLimite=Boolean(creditos?.detalhe_limitado)||prestacoes.length>=100;
  const links=new URLSearchParams({inicio,fim});
  const pendenteEntregador=r.pendenteDinheiro+r.pendentePix+r.pendenteCartao;
  const creditoTotal=numeroV114(creditos?.total);
  const creditoConfirmado=numeroV114(creditos?.valor_conciliado);
  const creditoPendente=numeroV114(creditos?.valor_pendente);

  return <main className="min-h-screen bg-[#edf4ef] text-[#152c1d]">
    <div className="mx-auto max-w-[1180px] space-y-5 p-4 pb-14 md:p-8">
      <header className="rounded-[30px] bg-[linear-gradient(130deg,#0b4c2b,#168148)] p-6 text-white shadow-sm md:p-8">
        <Link href="/admin/financeiro/prestacoes" className="inline-flex items-center gap-2 text-xs font-bold text-emerald-100">
          <ArrowLeft size={17}/> Prestação de contas
        </Link>
        <div className="mt-5 flex items-center gap-3"><ClipboardCheck size={30}/>
          <div><p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Consolidação financeira do CD · V114</p>
            <h1 className="mt-1 text-2xl font-black md:text-3xl">Fechamento financeiro</h1></div>
        </div>
        <p className="mt-3 max-w-3xl text-[12px] leading-6 text-emerald-50">
          Visão unificada dos créditos PIX/cartão da empresa e das prestações dos entregadores.
          Valores apresentados separadamente para impedir dupla contagem.
        </p>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-[22px] bg-white p-5 shadow-sm">
        <label className="min-w-[150px] flex-1 text-[11px] font-bold text-slate-700">
          Data inicial
          <input type="date" name="inicio" defaultValue={inicio} max={hoje} required
            className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"/>
        </label>
        <label className="min-w-[150px] flex-1 text-[11px] font-bold text-slate-700">
          Data final
          <input type="date" name="fim" defaultValue={fim} max={hoje} required
            className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"/>
        </label>
        <button type="submit" className="h-12 rounded-xl bg-emerald-800 px-7 text-[12px] font-black text-white">Consultar período</button>
        {periodoValido&&!erro&&<a
          href={`/admin/financeiro/prestacoes/fechamento/exportar?${links.toString()}`}
          className="inline-flex h-12 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 text-[12px] font-black text-emerald-950">
          <FileSpreadsheet size={17}/> Exportar Excel
        </a>}
      </form>
      {!periodoValido&&<div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-900">
        Informe um período de até 91 dias, dentro dos últimos 12 meses, sem datas futuras.
      </div>}
      {erro&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-900">
        Não foi possível calcular o fechamento: {erro}
      </div>}
      {periodoValido&&!erro&&creditos&&<>
        <section className="rounded-[26px] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3"><Building2 className="text-emerald-800"/>
              <div><p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Entradas diretas na empresa</p>
                <h2 className="text-lg font-black">PIX e cartão corporativos</h2></div>
            </div>
            <Link href={`/admin/financeiro/prestacoes/creditos?${links.toString()}`}
              className="rounded-xl bg-emerald-800 px-4 py-2 text-[11px] font-black text-white">Ver e conferir créditos</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metrica titulo="Registrado pelos vendedores" valor={creditoTotal} detalhe={`${numeroV114(creditos.transacoes)} transação(ões) no período`}/>
            <Metrica titulo="Confirmado pelo CD" valor={creditoConfirmado} detalhe={`${numeroV114(creditos.conciliados)} crédito(s) conferido(s)`}/>
            <Metrica titulo="Aguardando confirmação" valor={creditoPendente} cor="amber" detalhe={`${numeroV114(creditos.pendentes)} transação(ões) sem confirmação`}/>
          </div>
          <p className="mt-3 text-[10px] leading-5 text-slate-500">Esses recebimentos não entram como dinheiro a repassar pelo entregador. “Confirmado” é uma conferência manual do CD, não uma consulta bancária automática.</p>
        </section>
        <section className="rounded-[26px] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3"><Wallet className="text-emerald-800"/>
              <div><p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Acertos financeiros enviados</p>
                <h2 className="text-lg font-black">Dinheiro e repasses dos entregadores</h2></div>
            </div>
            <Link href={`/admin/financeiro/prestacoes?${links.toString()}`}
              className="rounded-xl bg-emerald-800 px-4 py-2 text-[11px] font-black text-white">Conferir prestações</Link>
          </div>
          <p className="mb-4 text-[10px] leading-5 text-slate-600">
            {r.quantidade} prestação(ões) cujo intervalo coincide com o período selecionado.
            Saldos de prestações não enviadas ainda não estão contabilizados aqui.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metrica titulo="Dinheiro físico declarado no sistema" valor={r.dinheiroEsperado} detalhe="Valor devido em dinheiro nas prestações" />
            <Metrica titulo="PIX e cartão do entregador" valor={r.pixEntregador+r.cartaoEntregador} detalhe="Repasses de contas/maquinetas próprias"/>
            <Metrica titulo="Total ainda a prestar ao CD" valor={pendenteEntregador} detalhe="Saldo após conferências efetivamente registradas" cor="amber"/>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Detalhe icon={<Banknote size={16}/>} nome="Dinheiro confirmado" valor={r.dinheiroConferido}/>
            <Detalhe icon={<CheckCircle2 size={16}/>} nome="PIX confirmado" valor={r.pixConferido}/>
            <Detalhe icon={<ShieldCheck size={16}/>} nome="Cartão confirmado" valor={r.cartaoConferido}/>
          </div>
          {r.taxasAutorizadas>0&&<p className="mt-3 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-700">
            Taxas de cartão autorizadas na conferência: <strong>{moedaV114(r.taxasAutorizadas)}</strong>.
            Essas taxas já foram consideradas no saldo das prestações.
          </p>}
        </section>

        {avisoLimite&&<p role="status" className="flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-[11px] text-amber-900">
          <AlertTriangle size={18} className="shrink-0"/>
          Há limite de consulta na fonte (100 prestações ou 250 detalhes de créditos).
          Se necessário, reduza o período; não considere listas parciais como fechamento completo.
        </p>}
        {r.filtradas.length===0&&<div className="rounded-[22px] border border-emerald-100 bg-white p-5 text-[12px] text-slate-600">
          Nenhuma prestação enviada para esse período. PIX/cartão corporativos já conciliados aparecem acima mesmo assim.
        </div>}
        {r.filtradas.length>0&&<section className="rounded-[25px] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><Clock3 className="text-emerald-800" size={20}/>
            <h2 className="text-base font-black">Prestações por entregador</h2></div>
          <div className="space-y-3">
            {r.filtradas.map(p=><div key={p.id} className="grid gap-2 rounded-xl border border-slate-100 bg-[#f8fbf9] p-4 sm:grid-cols-[1.5fr_1fr_1fr] sm:items-center">
              <div><p className="text-[12px] font-black">{p.entregador_nome}</p>
                <p className="mt-1 text-[10px] text-slate-500">Protocolo nº {p.id} · {dataBrV114(p.inicio)} a {dataBrV114(p.fim)}</p></div>
              <p className="text-[11px] font-semibold text-slate-700">Situação: {p.status}</p>
              <div className="sm:text-right"><p className="text-[10px] text-slate-500">Saldo pendente</p>
                <p className="mt-1 text-[15px] font-black text-amber-900">{moedaV114(numeroV114(p.pendente_dinheiro)+numeroV114(p.pendente_pix)+numeroV114(p.pendente_cartao))}</p></div>
            </div>)}
          </div>
        </section>}
        <p className="rounded-xl border border-sky-100 bg-sky-50 p-4 text-[11px] leading-5 text-sky-950">
          <strong>Critério do relatório:</strong> PIX/cartão da empresa são apurados pela data do recebimento.
          Prestações são apresentadas quando seu período coincide com o filtro, mantendo eventuais saldos de dias anteriores.
          Não há soma dupla dos mesmos pagamentos, nem criação de operações financeiras por esta consulta.
        </p>
      </>}
    </div>
  </main>;
}
function Detalhe({icon,nome,valor}:{icon:React.ReactNode;nome:string;valor:number}){
  return <div className="flex items-center justify-between gap-2 rounded-xl bg-[#f5f9f6] px-3 py-4 text-[11px]">
    <span className="flex items-center gap-2 text-emerald-800">{icon}{nome}</span>
    <strong className="whitespace-nowrap tabular-nums">{moedaV114(valor)}</strong>
  </div>;
}
