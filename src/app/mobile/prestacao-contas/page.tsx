export const instant = false;

// V109 - Extrato automático do entregador. Prestação financeira independente
// de rotas, cargas e de qualquer baixa/devolução de estoque.
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft, Banknote, Building2, CalendarRange, CheckCircle2,
  CreditCard, FileClock, Info, ReceiptText, Smartphone, WalletCards
} from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { enviarPrestacaoPeriodoMobile } from "./actions";

type Movimento = {
  origem: string; origem_id: number; cliente_nome: string; cliente_id: number;
  recebido_at: string; forma: string; destino: string | null;
  valor: number | string; prestacao_id: number | null;
};
type Resumo = {
  total_recebido?: number; qtde?: number; dinheiro?: number;
  pix_empresa?: number; pix_entregador?: number;
  cartao_empresa?: number; cartao_entregador?: number;
  sem_classificacao?: number; ja_prestado?: number;
  ainda_nao_prestado?: number; saldo_pendente_anterior?: number;
  movimentos?: Movimento[]; detalhe_limitado?: boolean;
};
type Prestacao = {
  id: number; inicio: string; fim: string; status: string;
  pendente_dinheiro: number; pendente_pix: number; pendente_cartao: number;
  itens_empresa_pendentes: number;
};
type Props = { searchParams: Promise<{ inicio?: string; fim?: string; erro?: string; enviada?: string }> };
const n = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;
const moeda = (v: unknown) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n(v));
const diaBr = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join("/") : s;
function hojeFortaleza() {
  const t = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const o = Object.fromEntries(t.map(x => [x.type, x.value]));
  return `${o.year}-${o.month}-${o.day}`;
}
function Cartao({ titulo, valor, detalhe, destaque = false }: {
  titulo: string; valor: number; detalhe: string; destaque?: boolean;
}) {
  return <div className={`rounded-[18px] border p-3 ${destaque ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-white"}`}>
    <p className="text-[10px] font-semibold text-slate-600">{titulo}</p>
    <p className="mt-2 text-lg font-black tabular-nums text-emerald-900">{moeda(valor)}</p>
    <p className="mt-1 text-[9px] leading-4 text-slate-500">{detalhe}</p>
  </div>;
}

export default async function PrestacaoContasPage({ searchParams }: Props) {
  const usuario = await getCurrentUserProfile();
  if (!usuario || !usuario.ativo) redirect("/");
  if (!usuario.isPlatformAdmin && !temPermissao(usuario.permissoes, PERMISSOES.PAGAMENTO_REGISTRAR))
    redirect("/mobile/sem-acesso");

  const params = await searchParams;
  const hoje = hojeFortaleza();
  const inicio = /^\d{4}-\d{2}-\d{2}$/.test(params.inicio ?? "") ? String(params.inicio) : hoje;
  const fim = /^\d{4}-\d{2}-\d{2}$/.test(params.fim ?? "") ? String(params.fim) : hoje;
  const supabase = await createClient();
  const [resumoResp, prestResp] = await Promise.all([
    supabase.rpc("resumo_periodo_prestacao_v109", {
      p_empresa_id: usuario.empresa.id, p_inicio: inicio, p_fim: fim,
    }),
    supabase.rpc("listar_prestacoes_v109", { p_empresa_id: usuario.empresa.id }),
  ]);
  if (resumoResp.error || prestResp.error) {
    return <main className="mx-auto min-h-dvh max-w-[480px] bg-slate-50 p-6 text-sm">
      <Link href="/mobile" className="font-bold text-emerald-800">Voltar</Link>
      <h1 className="mt-5 text-xl font-black">Prestação de contas</h1>
      <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
        {resumoResp.error?.message || prestResp.error?.message || "Falha ao consultar o financeiro."}
      </p>
      <Link href="/mobile/prestacao-contas" className="mt-4 inline-block font-bold text-emerald-800">Consultar hoje</Link>
    </main>;
  }
  const resumo = (resumoResp.data ?? {}) as Resumo;
  const movimentos = Array.isArray(resumo.movimentos) ? resumo.movimentos : [];
  const prestacoes = (Array.isArray(prestResp.data) ? prestResp.data : []) as Prestacao[];
  const valorPendenteAnterior = n(resumo.saldo_pendente_anterior);
  const novos = movimentos.filter(m => m.prestacao_id == null);
  const incertos = n(resumo.sem_classificacao) > 0;
  const acertosMesmoPeriodo = prestacoes.filter(p => p.inicio === inicio && p.fim === fim);
  const dinheiro = n(resumo.dinheiro), pixEmpresa = n(resumo.pix_empresa);
  const pixEntregador = n(resumo.pix_entregador), cartaoEmpresa = n(resumo.cartao_empresa);
  const cartaoEntregador = n(resumo.cartao_entregador);
  // Saldo novo: não cobrar novamente itens já incluídos em outros protocolos.
  const novosDinheiro = novos.filter(m => m.forma==="DINHEIRO")
    .reduce((total,m)=>total+n(m.valor),0);
  const valorResponsabilidade = novos
    .filter(m => m.destino==="ENTREGADOR")
    .reduce((total,m)=>total+n(m.valor),0);
  const temNovos = novos.length > 0;

  return <main className="min-h-dvh bg-[#ebf2ec] text-[#142018]">
    <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f7faf7] pb-12 shadow-[0_0_55px_rgba(17,63,33,0.11)]">
      <header className="bg-[linear-gradient(145deg,#0c4a2a,#168044)] px-5 pb-8 pt-5 text-white">
        <div className="flex items-center gap-3">
          <Link href="/mobile" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10" aria-label="Voltar"><ArrowLeft size={20}/></Link>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-200">Financeiro do entregador · V109</p>
            <h1 className="text-lg font-black">Minha prestação de contas</h1>
          </div>
        </div>
        <p className="mt-4 text-[12px] leading-5 text-emerald-50/90">
          Seu extrato é calculado pelas vendas e cobranças registradas. Você só declara o dinheiro em mãos e os repasses efetuados.
        </p>
      </header>
      <div className="space-y-4 p-4">
        <form method="get" className="rounded-[22px] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-emerald-800"><CalendarRange size={19}/><h2 className="text-[12px] font-black">Período do acerto</h2></div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] font-bold text-slate-600">Data inicial
              <input type="date" name="inicio" defaultValue={inicio} max={hoje} required className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold"/>
            </label>
            <label className="text-[10px] font-bold text-slate-600">Data final
              <input type="date" name="fim" defaultValue={fim} max={hoje} required className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold"/>
            </label>
          </div>
          <button type="submit" className="mt-3 h-11 w-full rounded-xl bg-emerald-800 text-[12px] font-black text-white">Consultar movimentações</button>
        </form>

        {params.enviada && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-[11px] font-bold text-emerald-900">
          Prestação nº {params.enviada} enviada. O CD ainda precisa conferir dinheiro, repasses e créditos corporativos.
        </p>}
        {params.erro && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-[11px] font-semibold text-red-900">{params.erro.slice(0,250)}</p>}

        <div className="rounded-[24px] bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Recebido dos clientes · {diaBr(inicio)} a {diaBr(fim)}</p>
          <p className="mt-2 text-3xl font-black tabular-nums text-emerald-950">{moeda(resumo.total_recebido)}</p>
          <p className="mt-1 text-[10px] text-slate-500">{n(resumo.qtde)} movimentação(ões) registradas. Só valores efetivamente lançados entram no acerto.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Cartao titulo="Responsabilidade de novos recebimentos" valor={valorResponsabilidade} detalhe="Somente movimentos ainda não incluídos em acerto" destaque/>
            <Cartao titulo="Direto para a empresa" valor={pixEmpresa+cartaoEmpresa} detalhe="A conciliar pelo CD, sem novo repasse"/>
          </div>
          {valorPendenteAnterior>0 && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-[10px] font-bold text-amber-900">Saldo pendente de prestações já enviadas</p>
            <p className="mt-1 text-xl font-black text-amber-950">{moeda(valorPendenteAnterior)}</p>
            <p className="mt-1 text-[9px] text-amber-800">Não foi somado às novas vendas. Esse valor será abatido somente pelo CD ao confirmar cada repasse.</p>
          </div>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Cartao titulo="Dinheiro físico" valor={dinheiro} detalhe="Entregar ao CD"/>
          <Cartao titulo="PIX da empresa" valor={pixEmpresa} detalhe="Conciliação bancária"/>
          <Cartao titulo="Cartão da empresa" valor={cartaoEmpresa} detalhe="Conciliação da maquineta"/>
          <Cartao titulo="PIX do entregador" valor={pixEntregador} detalhe="Comprovar transferência"/>
          <Cartao titulo="Cartão do entregador" valor={cartaoEntregador} detalhe="Repassar conforme liquidação"/>
          <Cartao titulo="Já incluído em prestações" valor={n(resumo.ja_prestado)} detalhe="Não entra de novo"/>
        </div>

        {incertos && <div role="alert" className="rounded-[20px] border border-amber-300 bg-amber-50 p-4 text-[11px] leading-5 text-amber-900">
          <strong>{moeda(resumo.sem_classificacao)} com titular não identificado.</strong>
          <p className="mt-1">O CD deve classificar os recebimentos antigos antes do envio. Não presumimos que esse dinheiro esteja com você.</p>
        </div>}

        <section className="rounded-[23px] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-emerald-800"><ReceiptText size={19}/><h2 className="text-[13px] font-black">Extrato detalhado do período</h2></div>
          {movimentos.length===0 && <p className="rounded-xl bg-slate-50 p-4 text-[11px] text-slate-500">Nenhum pagamento registrado neste período.</p>}
          <div className="space-y-2">
            {movimentos.map(m => <div key={m.origem+"-"+m.origem_id} className="rounded-[15px] border border-slate-100 bg-[#f8fbf9] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-black">{m.cliente_nome}</p>
                  <p className="mt-1 text-[9px] text-slate-500">
                    {m.origem==="VENDA"?"Venda":m.origem==="COBRANCA"?"Cobrança":"Parcela"} nº {m.origem_id} · {new Date(m.recebido_at).toLocaleString("pt-BR", {timeZone:"America/Fortaleza",dateStyle:"short",timeStyle:"short"})}
                  </p>
                </div>
                <p className="shrink-0 text-[12px] font-black text-emerald-950">{moeda(m.valor)}</p>
              </div>
              <p className="mt-2 text-[9px] font-semibold text-emerald-800">
                {m.forma} · {m.destino==="EMPRESA"?"Recebido pela empresa":m.destino==="ENTREGADOR"?"Com entregador":"Titular pendente"}
                {m.prestacao_id ? ` · Prestação nº ${m.prestacao_id}` : ""}
              </p>
            </div>)}
          </div>
          {resumo.detalhe_limitado && <p className="mt-3 text-[10px] font-semibold text-amber-900">A lista foi limitada a 500 movimentos. Reduza o intervalo para consultar todo o detalhe.</p>}
        </section>

        <section className="rounded-[24px] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-800"><WalletCards size={19}/><h2 className="text-[14px] font-black">Enviar prestação ao CD</h2></div>
          <p className="mt-2 text-[10px] leading-5 text-slate-600">
            Os pagamentos acima já foram preenchidos pelo sistema. Informe apenas o valor contado em mãos e os repasses efetivamente efetuados.
          </p>
          <form action={enviarPrestacaoPeriodoMobile} className="mt-4 space-y-3">
            <input type="hidden" name="inicio" value={inicio}/>
            <input type="hidden" name="fim" value={fim}/>
            <Campo nome="dinheiro" titulo="Dinheiro contado nesta nova prestação" valor={novosDinheiro}/>
            <Campo nome="pix" titulo="PIX já transferido da conta do entregador" valor={0} detalhe={`Sob sua responsabilidade: ${moeda(pixEntregador)}`}/>
            <Campo nome="cartao" titulo="Cartão já repassado pelo entregador" valor={0} detalhe={`Sob sua responsabilidade: ${moeda(cartaoEntregador)}`}/>
            <label className="block text-[10px] font-bold text-slate-700">Observação ou referência dos repasses
              <textarea name="observacao" maxLength={1500} rows={3}
                placeholder="Ex.: dinheiro em mãos; PIX feito às 14h; cartão a liquidar amanhã"
                className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-[12px]"/>
            </label>
            <button type="submit" disabled={!temNovos || incertos || Boolean(resumo.detalhe_limitado)}
              className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-3 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
              <CheckCircle2 size={17}/> Enviar acerto do período ao CD
            </button>
            {acertosMesmoPeriodo.length>0 && <p className="text-center text-[10px] text-slate-600">
              Há {acertosMesmoPeriodo.length} prestação(ões) neste mesmo período. O novo envio incluirá apenas os pagamentos ainda não prestados.
            </p>}
            <p className="text-center text-[10px] leading-5 text-slate-500">Enviar não significa repasse quitado. Só a confirmação do CD reduz o saldo sob sua responsabilidade.</p>
          </form>
        </section>

        {prestacoes.length>0 && <section className="rounded-[23px] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-emerald-800"><FileClock size={19}/><h2 className="text-[13px] font-black">Meus protocolos de prestação</h2></div>
          <div className="space-y-2">
            {prestacoes.slice(0,15).map(p => {
              const saldo = n(p.pendente_dinheiro)+n(p.pendente_pix)+n(p.pendente_cartao);
              return <div key={p.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex justify-between gap-2"><p className="text-[11px] font-black">Nº {p.id} · {diaBr(p.inicio)} a {diaBr(p.fim)}</p><span className="text-[9px] font-black text-emerald-800">{p.status.replaceAll("_"," ")}</span></div>
                <p className="mt-2 text-[10px] text-slate-600">A repassar: <strong>{moeda(saldo)}</strong> · Créditos da empresa sem conciliar: <strong>{p.itens_empresa_pendentes}</strong></p>
              </div>;
            })}
          </div>
        </section>}

        <div className="flex gap-2 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-[10px] leading-5 text-sky-900">
          <Info size={18} className="shrink-0"/>
          PIX/cartão da empresa são pagamentos registrados no aplicativo, não necessariamente conciliados no banco. Prestação não encerra rota nem devolve cestas.
        </div>
      </div>
    </div>
  </main>;
}
function Campo({nome,titulo,valor,detalhe}:{nome:string;titulo:string;valor:number;detalhe?:string}) {
  return <label className="block text-[10px] font-bold text-slate-700">
    {titulo}{detalhe && <span className="ml-1 font-normal text-slate-500">({detalhe})</span>}
    <input name={nome} type="number" min={0} step="0.01" defaultValue={valor.toFixed(2)}
      className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-[#f8faf9] px-3 text-[13px] font-black text-emerald-950" required/>
  </label>;
}
