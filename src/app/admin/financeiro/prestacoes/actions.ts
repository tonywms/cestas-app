"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
  if(!["VENDA","COBRANCA","PARCELA"].includes(origem) || !Number.isSafeInteger(id) || id<1 ||
    !["EMPRESA","ENTREGADOR"].includes(destino))redirect(aviso("Selecione origem, lançamento e titular corretos."));
  const supabase=await createClient();
  const {error}=await supabase.rpc("classificar_recebimento_origem_v109",{
    p_empresa_id:usuario.empresa.id,p_origem:origem,p_id:id,p_destino:destino,
  });
  if(error){
    console.error("V108 classificação legado:",error.code,error.message);
    redirect(aviso(error.message));
  }
  redirect("/admin/financeiro/prestacoes?classificado=1");
}

function podeConferirFin(usuario: Awaited<ReturnType<typeof getCurrentUserProfile>>) {
  return Boolean(usuario && (usuario.isPlatformAdmin ||
    temPermissao(usuario.permissoes,PERMISSOES.FINANCEIRO_AUDITAR)));
}
export async function registrarRepasseV109(form: FormData) {
  const usuario=await getCurrentUserProfile();
  if(!usuario||!usuario.ativo) redirect("/");
  if(!podeConferirFin(usuario)) redirect("/admin/financeiro");
  const id=Number(form.get("prestacao_id"));
  const forma=String(form.get("forma")??"");
  const chave=String(form.get("chave_operacao")??"");
  const referencia=String(form.get("referencia")??"").trim();
  if(!Number.isSafeInteger(id)||id<1 || !["DINHEIRO","PIX","CARTAO"].includes(forma) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(chave)) {
    redirect(aviso("Dados da conferência inválidos."));
  }
  let valorRepasse:number,taxa:number;
  try {
    valorRepasse=numero(form,"valor");
    taxa=numero(form,"taxa_cartao");
  } catch(e) { redirect(aviso(e instanceof Error?e.message:"Valores inválidos.")); }
  if(valorRepasse<=0 || referencia.length>250)redirect(aviso("Informe valor positivo e referência válida."));
  const supabase=await createClient();
  const {error}=await supabase.rpc("registrar_repasse_cd_v109",{
    p_empresa_id:usuario.empresa.id,p_prestacao_id:id,p_forma:forma,
    p_valor:valorRepasse,p_taxa_cartao:taxa,
    p_referencia:referencia||null,p_chave_operacao:chave,
  });
  if(error) {
    console.error("V109: erro ao confirmar repasse:",error.code,error.message);
    redirect(aviso(error.message));
  }
  revalidatePath("/admin/financeiro/prestacoes");
  revalidatePath("/mobile/prestacao-contas");
  redirect("/admin/financeiro/prestacoes?repasse=1");
}

export async function conciliarCreditoEmpresaV109(form:FormData) {
  const usuario=await getCurrentUserProfile();
  if(!usuario||!usuario.ativo)redirect("/");
  if(!podeConferirFin(usuario))redirect("/admin/financeiro");
  const id=Number(form.get("item_id"));
  const referencia=String(form.get("referencia")??"").trim();
  if(!Number.isSafeInteger(id)||id<1||referencia.length<4||referencia.length>250) {
    redirect(aviso("Informe o código bancário/da transação que foi realmente conferida."));
  }
  const supabase=await createClient();
  const {error}=await supabase.rpc("conciliar_credito_empresa_v109",{
    p_empresa_id:usuario.empresa.id,p_item_id:id,p_referencia:referencia,
  });
  if(error){
    console.error("V109: erro ao conciliar recebimento corporativo:",error.code,error.message);
    redirect(aviso(error.message));
  }
  revalidatePath("/admin/financeiro/prestacoes");
  revalidatePath("/mobile/prestacao-contas");
  redirect("/admin/financeiro/prestacoes?conciliado=1");
}
