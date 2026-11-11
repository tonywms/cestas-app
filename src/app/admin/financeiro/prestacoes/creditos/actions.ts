"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

function voltar(inicio:string,fim:string,filtros:{situacao:string;forma:string;busca:string},erro?:string){
  const q=new URLSearchParams({
    inicio,fim,
    situacao:filtros.situacao,
    forma:filtros.forma,
    busca:filtros.busca,
  });
  if(erro)q.set("erro",erro);
  else q.set("conciliado","1");
  return "/admin/financeiro/prestacoes/creditos?"+q.toString();
}
export async function confirmarCreditoCorporativoV110(form:FormData){
  const usuario=await getCurrentUserProfile();
  if(!usuario||!usuario.ativo)redirect("/");
  if(!usuario.isPlatformAdmin&&!temPermissao(usuario.permissoes,PERMISSOES.FINANCEIRO_AUDITAR))
    redirect("/admin/financeiro");
  const origem=String(form.get("origem")??"");
  const id=Number(form.get("origem_id"));
  // Referência técnica automática: não é chave PIX, E2E ou NSU bancário.
  // O operador confirma manualmente o recebimento; o banco não é consultado.
  const referencia=`CONF-MANUAL-CD-${randomUUID()}`;
  const inicio=String(form.get("inicio")??"");
  const fim=String(form.get("fim")??"");
  const filtros={
    situacao:String(form.get("situacao")??"TODOS").slice(0,20),
    forma:String(form.get("forma")??"TODOS").slice(0,10),
    busca:String(form.get("busca")??"").slice(0,100),
  };
  if(!["VENDA","COBRANCA","PARCELA"].includes(origem)||!Number.isSafeInteger(id)||id<1) {
    redirect(voltar(inicio,fim,filtros,"Selecione um recebimento válido."));
  }
  const supabase=await createClient();
  const {error}=await supabase.rpc("conciliar_credito_direto_v110",{
    p_empresa_id:usuario.empresa.id,
    p_origem:origem,p_origem_id:id,p_referencia:referencia,
  });
  if(error){
    console.error("V112 confirmação manual CD:",error.code,error.message);
    redirect(voltar(inicio,fim,filtros,error.message));
  }
  revalidatePath("/admin/financeiro/prestacoes");
  revalidatePath("/admin/financeiro/prestacoes/creditos");
  revalidatePath("/mobile/prestacao-contas");
  redirect(voltar(inicio,fim,filtros));
}
