"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

/* V75_9_DECISAO_GO_LIVE_AUDITORIA */

const ETAPAS_OBRIGATORIAS = [
  "receber-carga",
  "executar-rota",
  "venda-entrega",
  "cobranca-recebimento",
  "retorno-avaria",
  "fechamento-financeiro",
  "acessos-permissoes",
] as const;

type StatusDecisao = "LIBERADO" | "NAO_LIBERADO";

type SnapshotGate = {
  aprovadas: number;
  revisoes: number;
  bloqueadas: number;
  indisponiveis: number;
  estoque: string;
  credito: string;
  financeiro: string;
  seguranca: string;
};

type DecisaoInput = {
  status: StatusDecisao;
  observacao?: string;
  homologacaoEntidadeId: string;
  snapshot: SnapshotGate;
};

type Resultado = {
  success: boolean;
  message: string;
};

function texto(valor: unknown, limite = 1000) {
  return String(valor ?? "").trim().slice(0, limite);
}

function statusValido(valor: unknown): valor is StatusDecisao {
  return valor === "LIBERADO" || valor === "NAO_LIBERADO";
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
      erro: "Usuário sem permissão para registrar decisão de go-live.",
    } as const;
  }

  return {
    usuario,
    supabase: await createClient(),
    erro: null,
  } as const;
}

async function homologacaoAtual(
  supabase: Awaited<ReturnType<typeof createClient>>,
  empresaId: string,
) {
  const { data, error } = await supabase
    .from("auditoria_eventos")
    .select("acao,dados,created_at,entidade_id")
    .eq("empresa_id", empresaId)
    .eq("entidade", "HOMOLOGACAO_OPERACIONAL")
    .in("acao", ["HOMOLOGACAO_CONCLUIDA", "HOMOLOGACAO_REINICIADA"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Erro ao consultar homologação atual para decisão de go-live:", error);
    return null;
  }

  return data;
}

export async function registrarDecisaoGoLive(
  input: DecisaoInput,
): Promise<Resultado> {
  const { usuario, supabase, erro } = await contexto();
  if (!usuario || !supabase) {
    return { success: false, message: erro ?? "Falha de autorização." };
  }

  if (!statusValido(input?.status)) {
    return { success: false, message: "Decisão de go-live inválida." };
  }

  const homologacaoEntidadeId = texto(input?.homologacaoEntidadeId, 180);
  if (!homologacaoEntidadeId) {
    return {
      success: false,
      message: "A decisão precisa estar vinculada à homologação operacional atual.",
    };
  }

  const observacao = texto(input?.observacao, 1000);
  if (input.status === "NAO_LIBERADO" && observacao.length < 8) {
    return {
      success: false,
      message: "Informe o motivo da não liberação com pelo menos 8 caracteres.",
    };
  }

  const homologacao = await homologacaoAtual(supabase, String(usuario.empresa.id));
  const dadosHomologacao =
    homologacao?.dados && typeof homologacao.dados === "object"
      ? (homologacao.dados as Record<string, unknown>)
      : {};
  const marcadas = Array.isArray(dadosHomologacao.marcadas)
    ? dadosHomologacao.marcadas.filter((item): item is string => typeof item === "string")
    : [];

  const homologacaoValida = Boolean(
    homologacao?.acao === "HOMOLOGACAO_CONCLUIDA" &&
      homologacao?.entidade_id === homologacaoEntidadeId &&
      dadosHomologacao.status === "CONCLUIDA" &&
      ETAPAS_OBRIGATORIAS.every((id) => marcadas.includes(id)),
  );

  if (!homologacaoValida) {
    return {
      success: false,
      message:
        "A homologação atual não está concluída ou mudou desde a leitura do Gate. Atualize a tela antes de decidir.",
    };
  }

  const snapshot = input?.snapshot ?? ({} as SnapshotGate);
  const gateAprovado =
    Number(snapshot.aprovadas) === 4 &&
    Number(snapshot.revisoes) === 0 &&
    Number(snapshot.bloqueadas) === 0 &&
    Number(snapshot.indisponiveis) === 0 &&
    [snapshot.estoque, snapshot.credito, snapshot.financeiro, snapshot.seguranca].every(
      (estado) => String(estado) === "APROVADO",
    );

  if (!gateAprovado) {
    return {
      success: false,
      message:
        "O snapshot atual do Gate não está integralmente aprovado. Atualize o Gate antes de registrar a decisão.",
    };
  }

  const agora = new Date().toISOString();
  const acao = input.status === "LIBERADO" ? "GO_LIVE_LIBERADO" : "GO_LIVE_NAO_LIBERADO";
  const entidadeId = `go-live-${agora.replace(/[^0-9]/g, "").slice(0, 17)}`;

  const { error: insertError } = await supabase.from("auditoria_eventos").insert({
    empresa_id: usuario.empresa.id,
    usuario_id: usuario.id,
    entidade: "GO_LIVE",
    entidade_id: entidadeId,
    acao,
    dados: {
      status: input.status,
      decidido_em: agora,
      observacao: observacao || null,
      responsavel_nome: usuario.nome ?? "Usuário responsável",
      responsavel_perfil: usuario.perfilCodigo,
      homologacao_entidade_id: homologacaoEntidadeId,
      homologacao_concluida_em:
        typeof dadosHomologacao.concluida_em === "string"
          ? dadosHomologacao.concluida_em
          : homologacao?.created_at ?? null,
      homologacao_total_etapas: 7,
      homologacao_etapas_validadas: 7,
      gate: {
        frentes_verificadas: 4,
        aprovadas: Number(snapshot.aprovadas),
        revisoes: Number(snapshot.revisoes),
        bloqueadas: Number(snapshot.bloqueadas),
        indisponiveis: Number(snapshot.indisponiveis),
        estoque: String(snapshot.estoque),
        credito: String(snapshot.credito),
        financeiro: String(snapshot.financeiro),
        seguranca: String(snapshot.seguranca),
      },
      versao: "V75.9",
    },
  });

  if (insertError) {
    console.error("Erro ao registrar decisão de go-live:", insertError);
    return {
      success: false,
      message: "Não foi possível registrar a decisão executiva na auditoria.",
    };
  }

  revalidatePath("/admin/qualidade/liberacao");
  revalidatePath("/admin/qualidade");

  return {
    success: true,
    message:
      input.status === "LIBERADO"
        ? "Go-live liberado e registrado na auditoria."
        : "Não liberação registrada na auditoria.",
  };
}
