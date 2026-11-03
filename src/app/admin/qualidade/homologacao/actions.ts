"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

/* V75_8_HOMOLOGACAO_AUDITORIA */

const ETAPAS_OBRIGATORIAS = [
  "receber-carga",
  "executar-rota",
  "venda-entrega",
  "cobranca-recebimento",
  "retorno-avaria",
  "fechamento-financeiro",
  "acessos-permissoes",
] as const;

const ETAPAS_SET = new Set<string>(ETAPAS_OBRIGATORIAS);

type ResultadoPersistencia = {
  success: boolean;
  message: string;
};

type ConclusaoInput = {
  marcadas: string[];
  concluidaEm: string;
  origem?: string;
};

type ReinicioInput = {
  reiniciadaEm: string;
  origem?: string;
};

function isoSeguro(valor: string | null | undefined) {
  const texto = String(valor ?? "").trim();
  if (!texto) return null;
  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return null;
  return data.toISOString();
}

function etapasValidas(marcadas: string[]) {
  const unicas = Array.from(
    new Set(
      marcadas.filter(
        (item): item is string => typeof item === "string" && ETAPAS_SET.has(item),
      ),
    ),
  );

  return ETAPAS_OBRIGATORIAS.filter((id) => unicas.includes(id));
}

function rodadaId(prefixo: "conclusao" | "reinicio", instante: string) {
  const compacto = instante.replace(/[^0-9]/g, "").slice(0, 17);
  return `${prefixo}-${compacto || Date.now()}`;
}

async function contexto() {
  const usuario = await getCurrentUserProfile();

  if (!usuario || !usuario.ativo) {
    return {
      usuario: null,
      supabase: null,
      erro: "Sessão inválida. Entre novamente no sistema.",
    } as const;
  }

  const autorizado =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo === "ADMINISTRADOR" ||
    usuario.perfilCodigo === "GESTOR";

  if (!autorizado) {
    return {
      usuario: null,
      supabase: null,
      erro: "Usuário sem permissão para registrar homologação operacional.",
    } as const;
  }

  return {
    usuario,
    supabase: await createClient(),
    erro: null,
  } as const;
}

async function eventoMaisRecente(
  supabase: Awaited<ReturnType<typeof createClient>>,
  empresaId: string,
) {
  const { data, error } = await supabase
    .from("auditoria_eventos")
    .select("acao,created_at,dados,entidade_id")
    .eq("empresa_id", empresaId)
    .eq("entidade", "HOMOLOGACAO_OPERACIONAL")
    .in("acao", ["HOMOLOGACAO_CONCLUIDA", "HOMOLOGACAO_REINICIADA"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Erro ao consultar histórico da homologação:", error);
    return null;
  }

  return data;
}

export async function registrarHomologacaoConcluida(
  input: ConclusaoInput,
): Promise<ResultadoPersistencia> {
  const { usuario, supabase, erro } = await contexto();
  if (!usuario || !supabase) {
    return { success: false, message: erro ?? "Falha de autorização." };
  }

  const marcadas = etapasValidas(Array.isArray(input.marcadas) ? input.marcadas : []);
  if (marcadas.length !== ETAPAS_OBRIGATORIAS.length) {
    return {
      success: false,
      message: "A homologação só pode ser persistida com as sete etapas validadas.",
    };
  }

  const concluidaEm = isoSeguro(input.concluidaEm) ?? new Date().toISOString();
  const entidadeId = rodadaId("conclusao", concluidaEm);

  const maisRecente = await eventoMaisRecente(supabase, String(usuario.empresa.id));
  if (maisRecente?.acao === "HOMOLOGACAO_REINICIADA") {
    const reiniciadaEm = new Date(String(maisRecente.created_at)).getTime();
    const conclusaoInformada = new Date(concluidaEm).getTime();

    if (
      Number.isFinite(reiniciadaEm) &&
      Number.isFinite(conclusaoInformada) &&
      reiniciadaEm > conclusaoInformada
    ) {
      return {
        success: true,
        message: "Conclusão local antiga ignorada porque existe uma rodada reiniciada mais recente.",
      };
    }
  }

  const { data: existente, error: existenteError } = await supabase
    .from("auditoria_eventos")
    .select("id")
    .eq("empresa_id", usuario.empresa.id)
    .eq("entidade", "HOMOLOGACAO_OPERACIONAL")
    .eq("entidade_id", entidadeId)
    .eq("acao", "HOMOLOGACAO_CONCLUIDA")
    .limit(1)
    .maybeSingle();

  if (existenteError) {
    console.error("Erro ao verificar homologação já registrada:", existenteError);
    return {
      success: false,
      message: "Não foi possível verificar o histórico da homologação.",
    };
  }

  if (existente) {
    return {
      success: true,
      message: "Homologação já registrada na auditoria.",
    };
  }

  const { error: insertError } = await supabase.from("auditoria_eventos").insert({
    empresa_id: usuario.empresa.id,
    usuario_id: usuario.id,
    entidade: "HOMOLOGACAO_OPERACIONAL",
    entidade_id: entidadeId,
    acao: "HOMOLOGACAO_CONCLUIDA",
    dados: {
      status: "CONCLUIDA",
      total_etapas: ETAPAS_OBRIGATORIAS.length,
      etapas_validadas: marcadas.length,
      marcadas,
      concluida_em: concluidaEm,
      responsavel_nome: usuario.nome ?? "Usuário responsável",
      responsavel_perfil: usuario.perfilCodigo,
      origem: String(input.origem ?? "HOMOLOGACAO_OPERACIONAL_V75_8"),
      versao: "V75.8",
    },
  });

  if (insertError) {
    console.error("Erro ao registrar conclusão da homologação:", insertError);
    return {
      success: false,
      message: "A rodada foi concluída na tela, mas não foi possível gravá-la na auditoria.",
    };
  }

  revalidatePath("/admin/qualidade/homologacao");
  revalidatePath("/admin/qualidade/liberacao");
  revalidatePath("/admin/qualidade");

  return {
    success: true,
    message: "Homologação operacional registrada na auditoria.",
  };
}

export async function registrarHomologacaoReiniciada(
  input: ReinicioInput,
): Promise<ResultadoPersistencia> {
  const { usuario, supabase, erro } = await contexto();
  if (!usuario || !supabase) {
    return { success: false, message: erro ?? "Falha de autorização." };
  }

  const reiniciadaEm = isoSeguro(input.reiniciadaEm) ?? new Date().toISOString();
  const entidadeId = rodadaId("reinicio", reiniciadaEm);

  const { data: existente, error: existenteError } = await supabase
    .from("auditoria_eventos")
    .select("id")
    .eq("empresa_id", usuario.empresa.id)
    .eq("entidade", "HOMOLOGACAO_OPERACIONAL")
    .eq("entidade_id", entidadeId)
    .eq("acao", "HOMOLOGACAO_REINICIADA")
    .limit(1)
    .maybeSingle();

  if (existenteError) {
    console.error("Erro ao verificar reinício da homologação:", existenteError);
    return {
      success: false,
      message: "Não foi possível verificar o histórico da homologação.",
    };
  }

  if (existente) {
    return { success: true, message: "Reinício já registrado na auditoria." };
  }

  const { error: insertError } = await supabase.from("auditoria_eventos").insert({
    empresa_id: usuario.empresa.id,
    usuario_id: usuario.id,
    entidade: "HOMOLOGACAO_OPERACIONAL",
    entidade_id: entidadeId,
    acao: "HOMOLOGACAO_REINICIADA",
    dados: {
      status: "EM_ANDAMENTO",
      total_etapas: ETAPAS_OBRIGATORIAS.length,
      etapas_validadas: 0,
      marcadas: [],
      reiniciada_em: reiniciadaEm,
      responsavel_nome: usuario.nome ?? "Usuário responsável",
      responsavel_perfil: usuario.perfilCodigo,
      origem: String(input.origem ?? "HOMOLOGACAO_OPERACIONAL_V75_8"),
      versao: "V75.8",
    },
  });

  if (insertError) {
    console.error("Erro ao registrar reinício da homologação:", insertError);
    return {
      success: false,
      message: "A rodada foi reiniciada na tela, mas não foi possível registrar a auditoria.",
    };
  }

  revalidatePath("/admin/qualidade/homologacao");
  revalidatePath("/admin/qualidade/liberacao");
  revalidatePath("/admin/qualidade");

  return {
    success: true,
    message: "Reinício da homologação registrado na auditoria.",
  };
}
