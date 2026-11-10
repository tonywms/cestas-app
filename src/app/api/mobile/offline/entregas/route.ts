import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { isConnectivityFailure } from "@/lib/auth/connectivity-error";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { validarCreditoCliente, mensagemBloqueioEntrega } from "@/lib/credito/validar-credito-cliente";
import { createClient } from "@/lib/supabase/server";

const h = { "Cache-Control": "no-store" };
const falha = (mensagem: string, code: number) =>
  Response.json({ ok: false, mensagem }, { status: code, headers: h });
const inteiro = (x: unknown): x is number => typeof x === "number" &&
  Number.isSafeInteger(x) && x > 0;

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return falha("Origem inválida.", 403);
  try {
    if (Number(request.headers.get("content-length") || "0") > 16000) {
      return falha("Operação muito grande.", 413);
    }
    const usuario = await getCurrentUserProfile();
    if (!usuario || !usuario.ativo) return falha("Sessão expirada. Dados permanecem no aparelho.", 401);
    if (!(usuario.isPlatformAdmin || temPermissao(usuario.permissoes, PERMISSOES.ENTREGA_REALIZAR))) {
      return falha("Sem permissão para realizar entrega.", 403);
    }
    const entrada: unknown = await request.json();
    if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
      return falha("Registro inválido.", 422);
    }
    const item = entrada as Record<string, unknown>;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (typeof item.id !== "string" || !uuid.test(item.id)) return falha("UUID inválido.", 422);
    if (item.empresaId !== usuario.empresa.id || item.usuarioId !== usuario.id) {
      return falha("Operação de outro entregador ou empresa.", 403);
    }
    if (!item.dados || typeof item.dados !== "object" || Array.isArray(item.dados)) {
      return falha("Dados de entrega inválidos.", 422);
    }
    const raw = item.dados as Record<string, unknown>;
    const modo = raw.modo;
    if (modo !== "QUANTIDADE" && modo !== "VOLUME") return falha("Modo inválido.", 422);
    if (usuario.configuracao.modoControleCarga !== modo) {
      return falha("Modo da empresa alterado. Solicite revisão.", 409);
    }
    if (!inteiro(raw.cargaId) || !inteiro(raw.clienteId) || !inteiro(raw.tipoCestaId) ||
        !inteiro(raw.quantidade) || raw.quantidade > 200) return falha("Carga, cliente ou quantidade inválida.", 422);
    const rotaClienteId = raw.rotaClienteId === null ? null : raw.rotaClienteId;
    if (rotaClienteId !== null && !inteiro(rotaClienteId)) return falha("Parada inválida.", 422);
    if (!Array.isArray(raw.codigosVolume) || raw.codigosVolume.length > 200 ||
        raw.codigosVolume.some(x => typeof x !== "string" || x.length > 120)) {
      return falha("Lista de volumes inválida.", 422);
    }
    const codigosVolume = raw.codigosVolume.map((x: string) => x.trim().toUpperCase());
    if (modo === "QUANTIDADE" && codigosVolume.length) return falha("Bipagem incompatível.", 422);
    if (modo === "VOLUME" && usuario.configuracao.exigirBipagemEntrega) {
      if (!usuario.isPlatformAdmin && !temPermissao(usuario.permissoes, PERMISSOES.ENTREGA_BIPAR_VOLUME)) {
        return falha("Sem permissão para bipar volumes.", 403);
      }
      if (codigosVolume.length !== raw.quantidade || new Set(codigosVolume).size !== codigosVolume.length ||
          codigosVolume.some(x => !x)) return falha("Volumes divergentes ou duplicados.", 422);
    }
    if (modo === "VOLUME" && !usuario.configuracao.exigirBipagemEntrega && codigosVolume.length) {
      return falha("Esta empresa não exige bipagem nessa operação.", 422);
    }
    if (typeof raw.observacao !== "string" || raw.observacao.length > 500) {
      return falha("Observação inválida.", 422);
    }
    const dados = {
      modo, cargaId: raw.cargaId, clienteId: raw.clienteId,
      tipoCestaId: raw.tipoCestaId, quantidade: raw.quantidade,
      codigosVolume, rotaClienteId, observacao: raw.observacao.trim(),
    };
    const supabase = await createClient();

    // Retorna comprovante de envio anterior antes de verificar credito novamente.
    const situacao = await supabase.rpc("mobile_status_entrega_offline", {
      p_empresa_id: usuario.empresa.id,
      p_operacao_id: item.id,
      p_dados: dados,
    });
    if (situacao.error) {
      if (isConnectivityFailure(situacao.error) || ["PGRST202", "42883"].includes(situacao.error.code)) {
        return falha("Servidor de sincronização indisponível. Operação permanece no aparelho.", 503);
      }
      return falha(situacao.error.message || "Conflito com operação anterior.", 409);
    }
    const existente = situacao.data as { entrega_id?: number; quantidade?: number } | null;
    if (existente) {
      return Response.json({ ok: true, operacaoId: item.id,
        entregaId: Number(existente.entrega_id) || null, quantidade: existente.quantidade,
        repetida: true }, { headers: h });
    }

    // Mesma validacao de credito da entrega online atual; a RPC repete a protecao em SQL.
    const validacao = await validarCreditoCliente({
      empresaId: usuario.empresa.id, clienteId: dados.clienteId,
    });
    if (!validacao.ok) return falha(validacao.erro || "Não foi possível validar o crédito.", 409);
    if (validacao.avaliacao.bloqueado) return falha(mensagemBloqueioEntrega(validacao), 409);

    const resultado = await supabase.rpc("mobile_sincronizar_entrega_offline", {
      p_empresa_id: usuario.empresa.id, p_operacao_id: item.id, p_dados: dados,
    });
    if (resultado.error) {
      if (isConnectivityFailure(resultado.error) || ["PGRST202", "42883"].includes(resultado.error.code)) {
        return falha("Servidor temporariamente indisponível. Fila preservada.", 503);
      }
      return falha(resultado.error.message || "Entrega requer revisão.", 409);
    }
    const confirmado = (resultado.data ?? {}) as { entrega_id?: number; quantidade?: number; repetida?: boolean };
    if (!inteiro(confirmado.entrega_id)) return falha("Servidor não retornou comprovante válido.", 503);
    return Response.json({ ok: true, operacaoId: item.id, entregaId: confirmado.entrega_id,
      quantidade: confirmado.quantidade ?? dados.quantidade,
      repetida: !!confirmado.repetida }, { headers: h });
  } catch {
    return falha("Conexão ou autenticação indisponível. Operação preservada no aparelho.", 503);
  }
}
