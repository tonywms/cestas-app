import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

const opcoes = ["nome", "cpf_cnpj", "telefone", "logradouro", "numero",
  "complemento", "bairro", "cidade", "uf", "cep"] as const;
const limites: Record<(typeof opcoes)[number], number> = {
  nome: 160, cpf_cnpj: 30, telefone: 40, logradouro: 200,
  numero: 30, complemento: 150, bairro: 120, cidade: 120, uf: 2, cep: 20,
};
const h = { "Cache-Control": "no-store" };
const resposta = (mensagem: string, status: number) =>
  Response.json({ ok: false, mensagem }, { status, headers: h });

export async function POST(request: Request): Promise<Response> {
  const origem = request.headers.get("origin");
  if (origem && origem !== new URL(request.url).origin) {
    return resposta("Origem não autorizada.", 403);
  }
  try {
    const usuario = await getCurrentUserProfile();
    if (!usuario || !usuario.ativo) return resposta("Sessão expirada. Faça login e tente novamente.", 401);
    if (!usuario.isPlatformAdmin && !temPermissao(usuario.permissoes, PERMISSOES.CLIENTE_MOBILE_CADASTRAR)) {
      return resposta("Usuário sem permissão de cadastro.", 403);
    }
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return resposta("Operação inválida.", 400);
    const registro = body as Record<string, unknown>;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (typeof registro.id !== "string" || !uuid.test(registro.id)) return resposta("ID inválido.", 400);
    if (registro.usuarioId !== usuario.id || registro.empresaId !== usuario.empresa.id) {
      return resposta("A operação pertence a outro usuário ou empresa.", 403);
    }
    if (!registro.dados || typeof registro.dados !== "object" || Array.isArray(registro.dados)) {
      return resposta("Dados inválidos.", 400);
    }
    const origemDados = registro.dados as Record<string, unknown>;
    const dados: Record<string, string> = {};
    for (const nome of opcoes) {
      const valor = origemDados[nome] ?? "";
      if (typeof valor !== "string" || valor.length > limites[nome]) {
        return resposta("Confira os dados do cliente antes de sincronizar.", 422);
      }
      dados[nome] = valor.trim();
    }
    if (dados.nome.length < 3) return resposta("Informe um nome com pelo menos 3 caracteres.", 422);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("mobile_sincronizar_cliente_offline", {
      p_empresa_id: usuario.empresa.id,
      p_operacao_id: registro.id,
      p_dados: dados,
    });
    if (error) {
      if (error.code === "PGRST202" || error.code === "42883") return resposta("Serviço de sincronização indisponível.", 503);
      return resposta(error.message || "Conflito na validação do cadastro.", 409);
    }
    const resultado = (data ?? {}) as { cliente_id?: number; codigo?: string; repetida?: boolean };
    return Response.json({
      ok: true, operacaoId: registro.id,
      clienteId: Number(resultado.cliente_id) || null,
      codigo: resultado.codigo ?? null, repetida: !!resultado.repetida,
    }, { headers: h });
  } catch {
    return resposta("Não foi possível conectar com o servidor. O cadastro permanece no aparelho.", 503);
  }
}
