"use server";

import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export type EstadoVendaDireta = { success: boolean; message: string };
const falha = (message: string): EstadoVendaDireta => ({success:false,message});
function valorMoeda(v: FormDataEntryValue | null) {
  const t = String(v ?? "").trim();
  if (!t) return 0;
  return Number(t.includes(",") ? t.replaceAll(".","").replace(",",".") : t);
}

export async function prepararVendaDireta(
  _anterior: EstadoVendaDireta,
  formData: FormData,
): Promise<EstadoVendaDireta> {
  const usuario = await getCurrentUserProfile();
  if (!usuario || !usuario.ativo) return falha("Sessão inválida. Entre novamente.");
  const podePagamento = usuario.configuracao.permitirPagamentoMobile &&
    (usuario.isPlatformAdmin || temPermissao(usuario.permissoes,PERMISSOES.PAGAMENTO_REGISTRAR));
  const podeEntrega = usuario.isPlatformAdmin || temPermissao(usuario.permissoes,PERMISSOES.ENTREGA_REALIZAR);
  if (!podePagamento || !podeEntrega) return falha("Sem permissão para esta venda.");

  const clienteId = Number(formData.get("cliente_id"));
  const tipoCestaId = Number(formData.get("tipo_cesta_id"));
  const quantidade = Number(formData.get("quantidade"));
  const tipoVenda = String(formData.get("tipo_venda")??"").toUpperCase();
  const formaPagamento = String(formData.get("forma_pagamento")??"").toUpperCase();
  const entrada = valorMoeda(formData.get("valor_entrada"));
  const parcelas = Number(formData.get("quantidade_parcelas")??0);
  const vencimento = String(formData.get("primeiro_vencimento")??"").trim();
  const observacao = String(formData.get("observacao")??"").trim();
  if (![clienteId,tipoCestaId].every(i=>Number.isSafeInteger(i) && i>0)) return falha("Cliente ou cesta inválido.");
  if (!Number.isSafeInteger(quantidade) || quantidade<1 || quantidade>100) return falha("Quantidade inválida.");
  if (!["AVISTA","SALDO_ABERTO","CREDIARIO"].includes(tipoVenda)) return falha("Selecione a modalidade.");
  if (!["PIX","DINHEIRO","CARTAO","TRANSFERENCIA","OUTRO"].includes(formaPagamento))
    return falha("Informe a forma de pagamento.");
  if (!Number.isFinite(entrada) || entrada<0) return falha("Valor recebido inválido.");
  if (tipoVenda!=="AVISTA" && !/^\d{4}-\d{2}-\d{2}$/.test(vencimento))
    return falha("Informe o vencimento ou próxima visita.");
  if (tipoVenda==="CREDIARIO" && (!Number.isSafeInteger(parcelas)||parcelas<1||parcelas>120))
    return falha("Informe entre 1 e 120 parcelas.");
  if (observacao.length>500) return falha("Observação maior que 500 caracteres.");

  const supabase = await createClient();
  // Se o CD alterar o destino durante o atendimento, impedir que a tela
  // antiga induza o vendedor a cobrar em conta/maquineta errada.
  const temRecebimento=tipoVenda==="AVISTA"||entrada>0;
  if(temRecebimento && (formaPagamento==="PIX"||formaPagamento==="CARTAO")){
    const destinoExibido=String(formData.get("destino_exibido")??"");
    const {data:config,error:erroConfig}=await supabase.from("empresa_configuracoes")
      .select("destino_pix_v108,destino_cartao_v108")
      .eq("empresa_id",usuario.empresa.id).maybeSingle();
    const destinoAtual=formaPagamento==="PIX"?config?.destino_pix_v108:config?.destino_cartao_v108;
    if(erroConfig || !["EMPRESA","ENTREGADOR"].includes(destinoAtual??"") ||
      destinoAtual!==destinoExibido){
      return falha("A conta/maquineta destinatária foi alterada ou não pôde ser conferida. Atualize a tela antes de continuar.");
    }
  }
  const {data,error} = await supabase.rpc("mobile_preparar_venda_direta_v107",{
    p_empresa_id:usuario.empresa.id,
    p_cliente_id:clienteId,
    p_tipo_cesta_id:tipoCestaId,
    p_quantidade:quantidade,
    p_tipo_venda:tipoVenda,
    p_forma_pagamento:formaPagamento,
    p_valor_entrada:tipoVenda==="AVISTA"?0:entrada,
    p_quantidade_parcelas:tipoVenda==="CREDIARIO"?parcelas:null,
    p_primeiro_vencimento:tipoVenda==="AVISTA"?null:vencimento,
    p_observacao:observacao||null,
  });
  if (error) {
    console.error("V107: erro preparando venda direta:",error.code,error.message);
    return falha(error.message || "Não foi possível preparar a venda.");
  }
  const fluxoId = Number((data as {fluxo_id?:number} | null)?.fluxo_id ?? 0);
  if (!Number.isSafeInteger(fluxoId)||fluxoId<1) return falha("Venda preparada sem identificador. Atualize o atendimento.");
  redirect(`/mobile/vendas/finalizar?fluxoId=${fluxoId}`);
}
