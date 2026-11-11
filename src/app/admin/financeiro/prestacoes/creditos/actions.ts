"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

function voltar(inicio:string,fim:string,erro?:string){
  const base=`/admin/financeiro/prestacoes/creditos?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`;
  return erro ? base + `&erro=${encodeURIComponent(erro)}` : base + "&conciliado=1";
}
export async function confirmarCreditoCorporativoV110(form:FormData){
  const usuario=await getCurrentUserProfile();
  if(!usuario||!usuario.ativo)redirect("/");
  if(!usuario.isPlatformAdmin&&!temPermissao(usuario.permissoes,PERMISSOES.FINANCEIRO_AUDITAR))
    redirect("/admin/financeiro");
  const origem=String(form.get("origem")??"");
  const id=Number(form.get("origem_id"));
  const referencia=String(form.get("referencia")??"").trim();
  const inicio=String(form.get("inicio")??"");
  const fim=String(form.get("fim")??"");
  if(!["VENDA","COBRANCA","PARCELA"].includes(origem)||!Number.isSafeInteger(id)||id<1||
     referencia.length<4||referencia.length>250) {
    redirect(voltar(inicio,fim,"Informe o identificador bancário/NSU confirmado e um recebimento válido."));
  }
  const supabase=await createClient();
  const {error}=await supabase.rpc("conciliar_credito_direto_v110",{
    p_empresa_id:usuario.empresa.id,
    p_origem:origem,p_origem_id:id,p_referencia:referencia,
  });
  if(error){
    console.error("V110 conciliar credito corporativo:",error.code,error.message);
    redirect(voltar(inicio,fim,error.message));
  }
  revalidatePath("/admin/financeiro/prestacoes");
  revalidatePath("/admin/financeiro/prestacoes/creditos");
  revalidatePath("/mobile/prestacao-contas");
  redirect(voltar(inicio,fim));
}
