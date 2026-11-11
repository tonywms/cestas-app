"use server";

import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES,temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

function numero(form:FormData,key:string) {
  const texto=String(form.get(key)??"0").trim();
  const n=Number(texto.includes(",")?texto.replaceAll(".","").replace(",","."):texto);
  if (!Number.isFinite(n)||n<0||n>100000000) throw new Error(`Valor inválido: ${key}`);
  return Math.round(n*100)/100;
}
const aviso=(erro:string)=>`/admin/financeiro/prestacoes?erro=${encodeURIComponent(erro)}`;
export async function configurarPrestacao(form:FormData){
  const usuario=await getCurrentUserProfile();
  if(!usuario||!usuario.ativo) redirect("/");
  if(!usuario.isPlatformAdmin&&!temPermissao(usuario.permissoes,PERMISSOES.EMPRESA_CONFIGURAR))
    redirect("/admin/sem-acesso");
  const pix=String(form.get("pix")??""),cartao=String(form.get("cartao")??"");
  if(!["EMPRESA","ENTREGADOR"].includes(pix)||!["EMPRESA","ENTREGADOR"].includes(cartao))
    redirect(aviso("Configuração de destinatário inválida."));
  const supabase=await createClient();
  const {error}=await supabase.rpc("configurar_destinos_v108",{
    p_empresa_id:usuario.empresa.id,p_pix:pix,p_cartao:cartao
  });
  if(error){
    console.error("V108 configuração:",error.code,error.message);
    redirect(aviso(error.message));
  }
  redirect("/admin/financeiro/prestacoes?configurado=1");
}
export async function conferirPrestacao(form:FormData){
  const usuario=await getCurrentUserProfile();
  if(!usuario||!usuario.ativo) redirect("/");
  if(!usuario.isPlatformAdmin&&!temPermissao(usuario.permissoes,PERMISSOES.FINANCEIRO_AUDITAR))
    redirect("/admin/sem-acesso");
  const id=Number(form.get("id"));
  if(!Number.isSafeInteger(id)||id<1) redirect(aviso("Prestação inválida."));
  let valores:Record<string,number>;
  try {
    valores={
      p_dinheiro:numero(form,"dinheiro"),p_pix:numero(form,"pix"),
      p_cartao:numero(form,"cartao"),p_pix_empresa:numero(form,"pix_empresa"),
      p_cartao_empresa:numero(form,"cartao_empresa"),
      p_taxa_cartao:numero(form,"taxa_cartao"),
    };
  }catch(e){redirect(aviso(e instanceof Error?e.message:"Conferência inválida."));}
  const supabase=await createClient();
  const {error}=await supabase.rpc("conferir_prestacao_v108",{
    p_empresa_id:usuario.empresa.id,p_id:id,...valores,
    p_observacao:String(form.get("observacao")??"").trim()||null,
    p_devolver:String(form.get("devolver")??"") === "1",
  });
  if(error){
    console.error("V108 conferência:",error.code,error.message);
    redirect(aviso(error.message));
  }
  redirect("/admin/financeiro/prestacoes?conferido=1");
}

export async function classificarRecebimentoAnterior(form:FormData){
  const usuario=await getCurrentUserProfile();
  if(!usuario||!usuario.ativo)redirect("/");
  if(!usuario.isPlatformAdmin&&!temPermissao(usuario.permissoes,PERMISSOES.FINANCEIRO_AUDITAR))
    redirect("/admin/financeiro");
  const origem=String(form.get("origem")??"");
  const id=Number(form.get("id"));
  const destino=String(form.get("destino")??"");
  if(!["VENDA","COBRANCA"].includes(origem) || !Number.isSafeInteger(id) || id<1 ||
    !["EMPRESA","ENTREGADOR"].includes(destino))redirect(aviso("Selecione origem, lançamento e titular corretos."));
  const supabase=await createClient();
  const {error}=await supabase.rpc("classificar_recebimento_v108",{
    p_empresa_id:usuario.empresa.id,p_origem:origem,p_id:id,p_destino:destino,
  });
  if(error){
    console.error("V108 classificação legado:",error.code,error.message);
    redirect(aviso(error.message));
  }
  redirect("/admin/financeiro/prestacoes?classificado=1");
}
