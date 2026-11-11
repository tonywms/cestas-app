"use server";

// V106.2: o operador escolhe TIPO, nunca a carga que originou as cestas.
// Ponte FIFO para a RPC legada de entrega (uma origem por operação).
// Consumo multi-origem na mesma entrega depende da SQL V106.2 isolada.
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { getEstoqueMovelMulticargas } from "@/services/cargas/get-estoque-movel-multicargas";

export async function iniciarVendaEstoque(formData: FormData) {
  const usuario = await getCurrentUserProfile();
  if (!usuario || !usuario.ativo) redirect("/");

  const autorizado = usuario.isPlatformAdmin || (
    temPermissao(usuario.permissoes, PERMISSOES.CARGA_VISUALIZAR) &&
    temPermissao(usuario.permissoes, PERMISSOES.ENTREGA_REALIZAR) &&
    usuario.configuracao.permitirPagamentoMobile &&
    temPermissao(usuario.permissoes, PERMISSOES.PAGAMENTO_REGISTRAR)
  );
  if (!autorizado) redirect("/mobile/sem-acesso");

  const tipoCestaId = Number(formData.get("tipo_cesta_id"));
  if (!Number.isSafeInteger(tipoCestaId) || tipoCestaId < 1) {
    redirect("/mobile/estoque?erro=tipo");
  }

  const estoque = await getEstoqueMovelMulticargas({
    empresaId: usuario.empresa.id,
    entregadorId: usuario.id,
    exigeConferenciaFisica: usuario.configuracao.modoControleCarga === "VOLUME" &&
      usuario.configuracao.exigirBipagemCarga,
  });
  if (estoque.erro || estoque.saldoTotal === null) {
    redirect("/mobile/estoque?erro=consulta");
  }
  const ids = estoque.cargas.filter(c => c.recebida && c.saldo > 0).map(c => c.id);
  if (!ids.length) redirect("/mobile/estoque?erro=saldo");

  const supabase = await createClient();
  const { data: itens, error, count } = await supabase.from("carga_itens")
    .select("carga_id,quantidade_carregada,quantidade_entregue,quantidade_retornada,quantidade_avariada", { count: "exact" })
    .eq("empresa_id", usuario.empresa.id)
    .eq("tipo_cesta_id", tipoCestaId)
    .in("carga_id", ids)
    .order("carga_id", { ascending: true })
    .limit(1000);

  // Nunca escolher origem usando uma consulta parcial.
  if (error || count === null || count !== (itens?.length ?? 0)) {
    redirect("/mobile/estoque?erro=consulta");
  }

  const candidatos = (itens ?? []).filter(item =>
    Number(item.quantidade_carregada ?? 0) -
    Number(item.quantidade_entregue ?? 0) -
    Number(item.quantidade_retornada ?? 0) -
    Number(item.quantidade_avariada ?? 0) > 0
  );

  let origemId: number | null = null;
  for (const item of candidatos) {
    const id = Number(item.carga_id);
    if (usuario.configuracao.modoControleCarga === "VOLUME") {
      const { data: fisico, error: fisicoError } = await supabase.from("cesta_volumes")
        .select("id")
        .eq("empresa_id", usuario.empresa.id)
        .eq("carga_id", id)
        .eq("tipo_cesta_id", tipoCestaId)
        .eq("status", "EM_CARGA")
        .limit(1);
      if (fisicoError) redirect("/mobile/estoque?erro=consulta");
      if (!fisico?.length) continue;
    }
    origemId = id;
    break;
  }
  if (origemId === null) redirect("/mobile/estoque?erro=saldo");

  // Ponte interna de compatibilidade; NENHUMA alteracao de estoque.
  const { error: escolhaError } = await supabase.rpc("mobile_definir_carga_escolhida", {
    p_empresa_id: usuario.empresa.id,
    p_carga_id: origemId,
  });
  if (escolhaError) {
    console.error("V106.2: falha ao apontar origem interna:", escolhaError.code);
    redirect("/mobile/estoque?erro=origem");
  }
  redirect(`/mobile/clientes?modo=venda-direta&tipoCestaId=${tipoCestaId}`);
}
