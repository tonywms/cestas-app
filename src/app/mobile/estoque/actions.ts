"use server";

// V107: estoque do entregador inicia negociacao sem alterar selecao de carga.
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { getEstoqueMovelMulticargas } from "@/services/cargas/get-estoque-movel-multicargas";

export async function iniciarVendaEstoque(formData: FormData) {
  const usuario = await getCurrentUserProfile();
  if (!usuario || !usuario.ativo) redirect("/");
  const autorizado = usuario.isPlatformAdmin ||
    (temPermissao(usuario.permissoes,PERMISSOES.ENTREGA_REALIZAR) &&
     temPermissao(usuario.permissoes,PERMISSOES.PAGAMENTO_REGISTRAR) &&
     usuario.configuracao.permitirPagamentoMobile);
  if (!autorizado) redirect("/mobile/sem-acesso");
  const tipoId = Number(formData.get("tipo_cesta_id"));
  if (!Number.isSafeInteger(tipoId) || tipoId<1) redirect("/mobile/estoque?erro=tipo");

  const saldo = await getEstoqueMovelMulticargas({
    empresaId:usuario.empresa.id,
    entregadorId:usuario.id,
    exigeConferenciaFisica:usuario.configuracao.modoControleCarga==="VOLUME" &&
      usuario.configuracao.exigirBipagemCarga,
  });
  if (saldo.erro||saldo.saldoTotal===null) redirect("/mobile/estoque?erro=consulta");
  if (saldo.saldoTotal<=0) redirect("/mobile/estoque?erro=saldo");

  // Nenhum RPC de selecao de carga. O banco usa a origem real somente para rastreio.
  redirect(`/mobile/clientes?modo=venda-direta&tipoCestaId=${tipoId}`);
}
