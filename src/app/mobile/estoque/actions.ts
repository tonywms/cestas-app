"use server";

// Ponte de compatibilidade V106. O usuario vende do estoque consolidado;
// a carga tecnica e escolhida INTERNAMENTE apenas para o RPC legado e rastreio.
// A migracao de abatimento multi-origem atomico permanece separada.
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { getEstoqueMovelMulticargas } from "@/services/cargas/get-estoque-movel-multicargas";

export async function iniciarVendaEstoque() {
  const usuario = await getCurrentUserProfile();
  if (!usuario || !usuario.ativo) redirect("/");
  const autorizado = usuario.isPlatformAdmin || (
    temPermissao(usuario.permissoes, PERMISSOES.CARGA_VISUALIZAR) &&
    temPermissao(usuario.permissoes, PERMISSOES.ENTREGA_REALIZAR) &&
    usuario.configuracao.permitirPagamentoMobile &&
    temPermissao(usuario.permissoes, PERMISSOES.PAGAMENTO_REGISTRAR)
  );
  if (!autorizado) redirect("/mobile/sem-acesso");

  const estoque = await getEstoqueMovelMulticargas({
    empresaId: usuario.empresa.id,
    entregadorId: usuario.id,
    exigeConferenciaFisica: usuario.configuracao.modoControleCarga === "VOLUME" &&
      usuario.configuracao.exigirBipagemCarga,
  });
  if (estoque.erro || estoque.saldoTotal === null) {
    redirect("/mobile/estoque?erro=consulta");
  }
  const origem = [...estoque.cargas]
    .filter(c => c.recebida && c.saldo > 0)
    .sort((a,b)=>a.id - b.id)[0];
  if (!origem) redirect("/mobile/estoque?erro=saldo");

  const supabase = await createClient();
  const { error } = await supabase.rpc("mobile_definir_carga_escolhida", {
    p_empresa_id: usuario.empresa.id,
    p_carga_id: origem.id,
  });
  if (error) {
    console.error("V106: falha ao apontar origem tecnica da venda:", error.code, error.message);
    redirect("/mobile/estoque?erro=origem");
  }
  redirect("/mobile/clientes?modo=venda-direta");
}
