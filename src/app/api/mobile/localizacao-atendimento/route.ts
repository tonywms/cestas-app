// V120.1 | Recebe apenas GPS de um evento confirmado e pertencente ao usuário/empresa.
// Sem service role, sem acesso à empresa fornecido pelo cliente e sem alterações no evento original.
import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";


type Tipo = "ENTREGA" | "VENDA" | "COBRANCA";
const isTipo = (x: unknown): x is Tipo => x === "ENTREGA" || x === "VENDA" || x === "COBRANCA";
const json = (mensagem: string, status: number, extras: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: status >= 200 && status < 300, mensagem, ...extras },
    { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  const origem = request.headers.get("origin");
  if (origem && origem !== new URL(request.url).origin)
    return json("Origem não permitida.", 403);
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json"))
    return json("Formato inválido.", 415);
  if (Number(request.headers.get("content-length") || 0) > 2048)
    return json("Dados excedem o tamanho permitido.", 413);

  let corpo: unknown;
  try { corpo = await request.json(); } catch { return json("Corpo inválido.", 400); }
  if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) return json("Dados inválidos.", 400);
  const p = corpo as Record<string, unknown>;
  const tipo = p.tipo;
  const eventoId = p.eventoId;
  const latitude = p.latitude;
  const longitude = p.longitude;
  const precisaoMetros = p.precisaoMetros;
  const capturadoEm = p.capturadoEm;

  if (!isTipo(tipo) || typeof eventoId !== "number" || !Number.isSafeInteger(eventoId) || eventoId <= 0 ||
    typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
    typeof precisaoMetros !== "number" || !Number.isFinite(precisaoMetros) || precisaoMetros < 0 || precisaoMetros > 1500 ||
    typeof capturadoEm !== "string" || capturadoEm.length > 40 || !Number.isFinite(Date.parse(capturadoEm))) {
    return json("Dados de localização inválidos ou sem precisão suficiente.", 400);
  }
  if (Math.abs(Date.now() - Date.parse(capturadoEm)) > 10 * 60 * 1000)
    return json("A posição expirou. Solicite uma nova leitura do GPS.", 400);

  let usuario;
  try { usuario = await getCurrentUserProfile(); }
  catch { return json("Sessão temporariamente indisponível. O atendimento não foi alterado.", 503); }
  if (!usuario || !usuario.ativo) return json("Sessão não autenticada.", 401);
  const autorizado = tipo === "ENTREGA"
    ? (usuario.isPlatformAdmin || temPermissao(usuario.permissoes, PERMISSOES.ENTREGA_REALIZAR))
    : (usuario.configuracao.permitirPagamentoMobile &&
      (usuario.isPlatformAdmin || temPermissao(usuario.permissoes, PERMISSOES.PAGAMENTO_REGISTRAR)));
  if (!autorizado) return json("Usuário sem permissão para este atendimento.", 403);

  const supabase = await createClient();
  // A consulta possui o mesmo predicado empresa + operador do lançamento original.
  // As consultas são separadas para preservar a tipagem e facilitar a auditoria.
  let evento: { id: number; entregue_at?: string | null; created_at?: string | null } | null = null;
  let erroReferencia: unknown = null;
  if (tipo === "ENTREGA") {
    const result = await supabase.from("entregas").select("id,entregue_at,status")
      .eq("empresa_id", usuario.empresa.id).eq("entregador_id", usuario.id)
      .eq("id", eventoId).eq("status", "CONCLUIDA").maybeSingle();
    evento = result.data; erroReferencia = result.error;
  } else if (tipo === "VENDA") {
    const result = await supabase.from("vendas").select("id,created_at")
      .eq("empresa_id", usuario.empresa.id).eq("entregador_id", usuario.id)
      .eq("id", eventoId).maybeSingle();
    evento = result.data; erroReferencia = result.error;
  } else {
    const result = await supabase.from("pagamentos").select("id,created_at")
      .eq("empresa_id", usuario.empresa.id).eq("recebido_por", usuario.id)
      .eq("id", eventoId).maybeSingle();
    evento = result.data; erroReferencia = result.error;
  }
  if (erroReferencia) return json("Não foi possível validar o atendimento. O lançamento original permanece intacto.", 503);
  if (!evento) return json("Atendimento não encontrado entre os registros confirmados do usuário.", 404);
  const dataEvento = evento.entregue_at ?? evento.created_at;
  if (!dataEvento || !Number.isFinite(Date.parse(dataEvento)) ||
      Math.abs(Date.now() - Date.parse(dataEvento)) > 30 * 60 * 1000) {
    return json("O atendimento é antigo para associar GPS com segurança. Nenhuma operação foi alterada.", 409);
  }

  const { data: jaGravado, error: erroBusca } = await supabase.from("gps_atendimentos_v120")
    .select("id").eq("empresa_id", usuario.empresa.id)
    .eq("usuario_id", usuario.id).eq("tipo_evento", tipo).eq("referencia_id", eventoId).maybeSingle();
  if (erroBusca) return json("GPS ainda não habilitado neste banco. Consulte o arquivo SQL da V120.1.", 503);
  if (jaGravado) return json("Localização já registrada para este atendimento.", 200, { jaRegistrado: true });

  // NÃO atualizar evento de venda, entrega, parcela ou pagamento.
  const { error } = await supabase.from("gps_atendimentos_v120").insert({
    empresa_id: usuario.empresa.id,
    usuario_id: usuario.id,
    tipo_evento: tipo,
    referencia_id: eventoId,
    latitude: Math.round(latitude * 1_000_000) / 1_000_000,
    longitude: Math.round(longitude * 1_000_000) / 1_000_000,
    precisao_m: Math.round(precisaoMetros * 100) / 100,
    capturado_em: new Date(capturadoEm).toISOString(),
  });
  if (error?.code === "23505") return json("Este atendimento já possui ponto GPS.", 200, { jaRegistrado: true });
  if (error) return json("Não foi possível gravar o GPS. O atendimento continua concluído.", 503);
  return json("Ponto salvo para auditoria da operação.", 200, { jaRegistrado: false });
}
