import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { isConnectivityFailure } from "@/lib/auth/connectivity-error";
import { createClient } from "@/lib/supabase/server";

const h = { "Cache-Control": "no-store" };
const falha = (mensagem: string, status: number) =>
  Response.json({ ok: false, mensagem }, { status, headers: h });
const positivo = (v: unknown): v is number => typeof v === "number" &&
  Number.isSafeInteger(v) && v > 0;
const numero = (v: unknown): v is number => typeof v === "number" &&
  Number.isFinite(v) && v >= 0;

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return falha("Origem não autorizada.",403);
  if (Number(request.headers.get("content-length") || 0)>16000) return falha("Operação muito grande.",413);
  try {
    const usuario = await getCurrentUserProfile();
    if (!usuario || !usuario.ativo) return falha("Sessão expirada. Registro preservado no aparelho.",401);
    if (!(usuario.isPlatformAdmin || (
      temPermissao(usuario.permissoes,PERMISSOES.ROTA_MOBILE_GERENCIAR_PROPRIA) &&
      temPermissao(usuario.permissoes,PERMISSOES.ENTREGA_REALIZAR) &&
      usuario.configuracao.permitirPagamentoMobile &&
      temPermissao(usuario.permissoes,PERMISSOES.PAGAMENTO_REGISTRAR)
    ))) return falha("Sem permissão de rota, entrega ou pagamento.",403);
    const raw: unknown=await request.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return falha("Registro inválido.",422);
    const item=raw as Record<string,unknown>;
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (typeof item.id!=="string" || !uuid.test(item.id)) return falha("Identificador único inválido.",422);
    if (item.usuarioId!==usuario.id || item.empresaId!==usuario.empresa.id) {
      return falha("Operação vinculada a outra sessão ou empresa.",403);
    }
    if (item.status!=="pendente" || !item.dados || typeof item.dados!=="object" || Array.isArray(item.dados)) {
      return falha("Operação não está pronta para sincronização.",422);
    }
    const dados=item.dados as Record<string,unknown>;
    for (const key of ["rotaClienteId","clienteId","cargaId","tipoCestaId","quantidade"]) {
      if (!positivo(dados[key])) return falha("Identificadores ou quantidade inválidos.",422);
    }
    if ((dados.quantidade as number)>100 || !numero(dados.valorTotalEsperado) ||
        !numero(dados.valorEntrada) || (dados.valorTotalEsperado as number)<=0 ||
        (dados.valorEntrada as number)>(dados.valorTotalEsperado as number)) {
      return falha("Valores de venda inválidos.",422);
    }
    if (!["AVISTA","SALDO_ABERTO","CREDIARIO"].includes(String(dados.tipoVenda)) ||
        !["PIX","DINHEIRO","CARTAO","TRANSFERENCIA","OUTRO"].includes(String(dados.formaPagamento))) {
      return falha("Modalidade ou forma de pagamento inválida.",422);
    }
    if (dados.tipoVenda==="CREDIARIO" && (!positivo(dados.quantidadeParcelas) ||
        (dados.quantidadeParcelas as number)>120)) return falha("Parcelamento inválido.",422);
    if (dados.tipoVenda!=="AVISTA" && (typeof dados.primeiroVencimento!=="string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(dados.primeiroVencimento))) {
      return falha("Vencimento inválido.",422);
    }
    if (typeof dados.observacao!=="string" || dados.observacao.length>500 ||
      (dados.modoControle!=="QUANTIDADE" && dados.modoControle!=="VOLUME") ||
      typeof dados.exigirBipagem!=="boolean" ||
      usuario.configuracao.modoControleCarga!==dados.modoControle ||
      Boolean(usuario.configuracao.exigirBipagemEntrega)!==dados.exigirBipagem) {
      return falha("Configuração da operação mudou. Revisão obrigatória.",409);
    }
    if (!Array.isArray(dados.codigosVolume) || dados.codigosVolume.length>100 ||
        dados.codigosVolume.some(v => typeof v!=="string" || !v.trim() || v.length>120)) {
      return falha("Códigos de volumes inválidos.",422);
    }
    const codigos=(dados.codigosVolume as string[]).map(v=>v.trim().toUpperCase());
    if (dados.exigirBipagem && (codigos.length!==dados.quantidade ||
        new Set(codigos).size!==codigos.length)) return falha("Volumetria incompleta ou duplicada.",422);
    if (!dados.exigirBipagem && codigos.length) return falha("Volumes não solicitados.",422);

    const payload={
      rotaClienteId: dados.rotaClienteId, clienteId: dados.clienteId,
      cargaId: dados.cargaId, tipoCestaId: dados.tipoCestaId,
      quantidade: dados.quantidade, valorTotalEsperado: dados.valorTotalEsperado,
      tipoVenda: dados.tipoVenda, formaPagamento: dados.formaPagamento,
      valorEntrada: dados.valorEntrada, quantidadeParcelas: dados.quantidadeParcelas,
      primeiroVencimento: dados.primeiroVencimento, observacao: dados.observacao,
      modoControle: dados.modoControle, exigirBipagem: dados.exigirBipagem,
      codigosVolume: codigos,
    };
    const supabase=await createClient();
    const { data, error }=await supabase.rpc("mobile_sincronizar_venda_rota_offline",{
      p_empresa_id:usuario.empresa.id, p_operacao_id:item.id, p_dados:payload,
    });
    if (error) {
      if (isConnectivityFailure(error) || ["PGRST202","42883"].includes(error.code)) {
        return falha("Servidor temporariamente indisponível. Operação mantida no aparelho.",503);
      }
      return falha(error.message || "Venda não autorizada na reconciliação.",409);
    }
    const retorno=(data??{}) as Record<string,unknown>;
    if (!positivo(Number(retorno.venda_id)) || !positivo(Number(retorno.entrega_id))) {
      return falha("Sem comprovante transacional válido do banco.",503);
    }
    return Response.json({
      ok:true,operacaoId:item.id,
      vendaId:Number(retorno.venda_id), entregaId:Number(retorno.entrega_id),
      fluxoId:Number(retorno.fluxo_id)||null, repetida:retorno.repetida===true,
    },{headers:h});
  } catch {
    return falha("Falha de transporte. Registro mantido no aparelho.",503);
  }
}
