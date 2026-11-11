"use server";

import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

function valor(form: FormData, chave: string) {
  const t = String(form.get(chave) ?? "0").trim();
  const n = Number(t.includes(",") ? t.replaceAll(".","").replace(",",".") : t);
  if (!Number.isFinite(n) || n<0 || n>100000000) throw new Error(`Valor inválido: ${chave}`);
  return Math.round(n*100)/100;
}
function retorno(data: string, erro: string) {
  return `/mobile/prestacao-contas?data=${encodeURIComponent(data)}&erro=${encodeURIComponent(erro)}`;
}
export async function enviarPrestacaoMobile(form: FormData) {
  const usuario = await getCurrentUserProfile();
  if (!usuario || !usuario.ativo) redirect("/");
  if (!usuario.isPlatformAdmin && !temPermissao(usuario.permissoes,PERMISSOES.PAGAMENTO_REGISTRAR))
    redirect("/mobile/sem-acesso");
  const data = String(form.get("data")??"").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) redirect("/mobile/prestacao-contas?erro=data");
  let dinheiro:number,pix:number,cartao:number;
  try {
    dinheiro = valor(form,"dinheiro");
    pix = valor(form,"pix");
    cartao = valor(form,"cartao");
  } catch(e) {
    redirect(retorno(data,e instanceof Error?e.message:"Valores inválidos"));
  }
  const supabase = await createClient();
  const {error}=await supabase.rpc("enviar_prestacao_v108",{
    p_empresa_id:usuario.empresa.id,p_data:data,
    p_dinheiro:dinheiro,p_pix:pix,p_cartao:cartao,
    p_comprovante_pix:String(form.get("comprovante_pix")??"").trim()||null,
    p_comprovante_cartao:String(form.get("comprovante_cartao")??"").trim()||null,
    p_observacao:String(form.get("observacao")??"").trim()||null,
  });
  if(error) {
    console.error("V108 envio da prestacao:",error.code,error.message);
    redirect(retorno(data,error.message));
  }
  redirect(`/mobile/prestacao-contas?data=${data}&enviada=1`);
}
