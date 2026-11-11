export const instant = false;

// V107: negociar a venda antes de bipar ou movimentar estoque.
// Carga de origem fica estritamente no backend, para rastreio.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BadgeCheck, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { getEstoqueMovelMulticargas } from "@/services/cargas/get-estoque-movel-multicargas";
import VendaDiretaFinanceiroForm from "./VendaDiretaFinanceiroForm";

type Props = { searchParams: Promise<{ clienteId?: string; tipoCestaId?: string }> };
function dataLocal() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",year:"numeric",month:"2-digit",day:"2-digit",
  }).formatToParts(new Date());
  const partesMap = Object.fromEntries(partes.map(p=>[p.type,p.value]));
  const d = new Date(Date.UTC(Number(partesMap.year),Number(partesMap.month)-1,Number(partesMap.day)+30));
  return d.toISOString().slice(0,10);
}

export default async function PrepararVendaDireta({ searchParams }: Props) {
  const usuario = await getCurrentUserProfile();
  if (!usuario || !usuario.ativo) redirect("/");
  const autorizado = usuario.isPlatformAdmin || (
    temPermissao(usuario.permissoes, PERMISSOES.ENTREGA_REALIZAR) &&
    temPermissao(usuario.permissoes, PERMISSOES.PAGAMENTO_REGISTRAR) &&
    usuario.configuracao.permitirPagamentoMobile
  );
  if (!autorizado) redirect("/mobile/sem-acesso");

  const params = await searchParams;
  const clienteId = Number(params.clienteId);
  const tipoCestaId = Number(params.tipoCestaId);
  if (!Number.isSafeInteger(clienteId) || clienteId<1 ||
      !Number.isSafeInteger(tipoCestaId) || tipoCestaId<1) {
    redirect("/mobile/estoque?erro=tipo");
  }

  const supabase = await createClient();
  const [clienteResp,tipoResp,pendenteResp] = await Promise.all([
    supabase.from("clientes").select("id,codigo,nome").eq("empresa_id",usuario.empresa.id)
      .eq("id",clienteId).eq("ativo",true).maybeSingle(),
    supabase.from("tipos_cesta").select("id,codigo,nome,valor_venda")
      .eq("empresa_id",usuario.empresa.id).eq("id",tipoCestaId).eq("ativo",true).maybeSingle(),
    supabase.from("venda_fluxos_campo").select("id,cliente_id")
      .eq("empresa_id",usuario.empresa.id).eq("entregador_id",usuario.id)
      .eq("cliente_id",clienteId).is("rota_cliente_id",null)
      .eq("status","AGUARDANDO_ENTREGA")
      .order("id",{ascending:false}).limit(1).maybeSingle(),
  ]);
  if (pendenteResp.error) {
    return <main className="mx-auto max-w-[480px] p-6 text-sm">Falha ao verificar vendas pendentes. Atualize e tente novamente.</main>;
  }
  if (pendenteResp.data?.id) {
    redirect(`/mobile/vendas/finalizar?fluxoId=${pendenteResp.data.id}`);
  }
  const cliente = clienteResp.data, tipo = tipoResp.data;
  if (clienteResp.error || tipoResp.error || !cliente || !tipo) {
    redirect("/mobile/estoque?erro=tipo");
  }
  const valorUnitario = Number(tipo.valor_venda ?? 0);
  if (!(valorUnitario>0)) {
    return <main className="mx-auto max-w-[480px] p-6">Preço não cadastrado para este tipo de cesta. Solicite atualização ao CD.</main>;
  }

  const estoque = await getEstoqueMovelMulticargas({
    empresaId:usuario.empresa.id,entregadorId:usuario.id,
    exigeConferenciaFisica: usuario.configuracao.modoControleCarga==="VOLUME" &&
      usuario.configuracao.exigirBipagemCarga,
  });
  if (estoque.erro) {
    return <main className="mx-auto max-w-[480px] p-6 text-sm">{estoque.erro}</main>;
  }
  const ids = estoque.cargas.filter(c=>c.recebida && c.saldo>0).map(c=>c.id);
  const {data:itens,error:erroItens,count} = ids.length
    ? await supabase.from("carga_itens")
      .select("carga_id,quantidade_carregada,quantidade_entregue,quantidade_retornada,quantidade_avariada",{count:"exact"})
      .eq("empresa_id",usuario.empresa.id).eq("tipo_cesta_id",tipoCestaId)
      .in("carga_id",ids).limit(1000)
    : {data:[],error:null,count:0};
  if (erroItens || count!==(itens?.length??0)) {
    return <main className="mx-auto max-w-[480px] p-6 text-sm">Não foi possível conferir o saldo completo. Atualize o estoque móvel.</main>;
  }
  // A V107 consome uma origem por entrega; o estoque consolidado pode ser maior.
  const maxEmUmaOrigem = Math.max(0,...(itens??[]).map(i=>
    Math.max(0,Number(i.quantidade_carregada)-Number(i.quantidade_entregue)-
      Number(i.quantidade_retornada)-Number(i.quantidade_avariada))
  ));
  const limite = Math.min(100,maxEmUmaOrigem);

  return (
    <main className="min-h-dvh bg-[#eaf2ec] text-[#142018]">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f7faf7] pb-12">
        <header className="bg-[linear-gradient(155deg,#176b3a,#0d5a30)] px-5 pb-7 pt-5 text-white">
          <div className="flex items-center gap-3">
            <Link href={`/mobile/clientes?modo=venda-direta&tipoCestaId=${tipoCestaId}`}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10" aria-label="Voltar para clientes"><ArrowLeft size={19}/></Link>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Etapa 1 de 2</p>
              <h1 className="text-xl font-black">Negociação da venda</h1>
            </div>
          </div>
          <p className="mt-4 text-[12px] leading-5 text-emerald-100">
            Confira valor, modalidade, entrada e parcelas com o cliente. Só depois será feita a bipagem ou a entrega física.
          </p>
        </header>
        <div className="space-y-4 p-4">
          <div className="rounded-[22px] border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3"><ShoppingBag className="text-emerald-700" size={20}/>
              <div><p className="text-[10px] font-black uppercase text-emerald-700">Cliente</p>
                <p className="mt-1 text-[17px] font-black">{cliente.nome}</p>
                <p className="text-[10px] text-slate-500">{cliente.codigo}</p></div>
            </div>
          </div>
          <VendaDiretaFinanceiroForm clienteId={clienteId} tipoCestaId={tipoCestaId}
            nomeCesta={tipo.nome} valorUnitario={valorUnitario}
            limite={limite} primeiroVencimento={dataLocal()}/>
          <div className="flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-[11px] text-sky-900">
            <BadgeCheck size={18} className="shrink-0"/>
            Nenhum estoque ou pagamento é lançado antes da confirmação física da entrega.
          </div>
        </div>
      </div>
    </main>
  );
}
