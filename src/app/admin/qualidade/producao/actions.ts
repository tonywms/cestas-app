"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

/* V77_CERTIFICACAO_PRODUCAO_AUDITORIA */

type CertificarInput = {
  observacao?: string;
  goLiveEntidadeId?: string | null;
};

type Resultado = {
  success: boolean;
  message: string;
};

function objeto(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object"
    ? (valor as Record<string, unknown>)
    : {};
}

function texto(valor: unknown, limite = 1000) {
  return String(valor ?? "").trim().slice(0, limite);
}

function numero(valor: unknown) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
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
      erro: "Usuário sem permissão para certificar a produção.",
    } as const;
  }

  return {
    usuario,
    supabase: await createClient(),
    erro: null,
  } as const;
}

export async function certificarProducao(
  input: CertificarInput,
): Promise<Resultado> {
  const { usuario, supabase, erro } = await contexto();

  if (!usuario || !supabase) {
    return {
      success: false,
      message: erro ?? "Falha de autorização.",
    };
  }

  if (process.env.VERCEL_ENV !== "production") {
    return {
      success: false,
      message:
        "A certificação final só pode ser registrada no ambiente Production do Vercel.",
    };
  }

  const [goLiveResult, homologacaoResult] = await Promise.all([
    supabase
      .from("auditoria_eventos")
      .select("acao,dados,created_at,entidade_id")
      .eq("empresa_id", usuario.empresa.id)
      .eq("entidade", "GO_LIVE")
      .in("acao", ["GO_LIVE_LIBERADO", "GO_LIVE_NAO_LIBERADO"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("auditoria_eventos")
      .select("acao,dados,created_at,entidade_id")
      .eq("empresa_id", usuario.empresa.id)
      .eq("entidade", "HOMOLOGACAO_OPERACIONAL")
      .in("acao", ["HOMOLOGACAO_CONCLUIDA", "HOMOLOGACAO_REINICIADA"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (goLiveResult.error || homologacaoResult.error) {
    console.error("V77: falha ao ler governança para certificar produção", {
      goLive: goLiveResult.error,
      homologacao: homologacaoResult.error,
    });

    return {
      success: false,
      message: "Não foi possível validar a trilha de governança.",
    };
  }

  const goLive = goLiveResult.data;
  const homologacao = homologacaoResult.data;

  if (!goLive || goLive.acao !== "GO_LIVE_LIBERADO") {
    return {
      success: false,
      message:
        "A decisão executiva atual não está liberada para produção.",
    };
  }

  const esperadoGoLive = texto(input?.goLiveEntidadeId, 180);
  if (
    esperadoGoLive &&
    String(goLive.entidade_id ?? "") !== esperadoGoLive
  ) {
    return {
      success: false,
      message:
        "O go-live mudou desde a abertura da tela. Atualize a leitura antes de certificar.",
    };
  }

  const dadosGoLive = objeto(goLive.dados);
  const gate = objeto(dadosGoLive.gate);
  const homologacaoVinculadaId = texto(
    dadosGoLive.homologacao_entidade_id,
    180,
  );

  const gateAprovado =
    numero(gate.frentes_verificadas) === 4 &&
    numero(gate.aprovadas) === 4 &&
    numero(gate.revisoes) === 0 &&
    numero(gate.bloqueadas) === 0 &&
    numero(gate.indisponiveis) === 0 &&
    ["estoque", "credito", "financeiro", "seguranca"].every(
      (chave) => texto(gate[chave], 40) === "APROVADO",
    );

  if (!gateAprovado) {
    return {
      success: false,
      message:
        "O snapshot técnico vinculado ao go-live não está 4/4 aprovado.",
    };
  }

  const homologacaoValida = Boolean(
    homologacao &&
      homologacao.acao === "HOMOLOGACAO_CONCLUIDA" &&
      homologacaoVinculadaId &&
      String(homologacao.entidade_id ?? "") === homologacaoVinculadaId,
  );

  if (!homologacaoValida) {
    return {
      success: false,
      message:
        "A homologação operacional atual não corresponde à rodada 7/7 liberada.",
    };
  }

  const { data: invalidadores, error: invalidadoresError } =
    await supabase
      .from("auditoria_eventos")
      .select("acao,created_at")
      .eq("empresa_id", usuario.empresa.id)
      .in("acao", ["HOMOLOGACAO_REINICIADA", "GO_LIVE_NAO_LIBERADO"])
      .gt("created_at", goLive.created_at)
      .order("created_at", { ascending: false })
      .limit(20);

  if (invalidadoresError) {
    console.error("V77: falha ao validar eventos invalidadores", invalidadoresError);

    return {
      success: false,
      message:
        "Não foi possível validar eventos posteriores ao go-live.",
    };
  }

  if ((invalidadores ?? []).length > 0) {
    return {
      success: false,
      message:
        "Existe evento posterior que invalida a certificação automática. Revise o Gate.",
    };
  }

  const agora = new Date().toISOString();
  const observacao = texto(input?.observacao, 1000);
  const entidadeId = `producao-cert-${agora
    .replace(/[^0-9]/g, "")
    .slice(0, 17)}`;

  const { error: insertError } = await supabase
    .from("auditoria_eventos")
    .insert({
      empresa_id: usuario.empresa.id,
      usuario_id: usuario.id,
      entidade: "PRODUCAO_SAUDE",
      entidade_id: entidadeId,
      acao: "PRODUCAO_CERTIFICADA",
      dados: {
        status: "SAUDAVEL",
        certificado_em: agora,
        observacao: observacao || null,
        responsavel_nome: usuario.nome ?? "Usuário responsável",
        responsavel_perfil: usuario.perfilCodigo,
        go_live_entidade_id: String(goLive.entidade_id ?? ""),
        go_live_decidido_em:
          texto(dadosGoLive.decidido_em, 80) || goLive.created_at,
        homologacao_entidade_id: homologacaoVinculadaId,
        gate: {
          frentes_verificadas: 4,
          aprovadas: 4,
          revisoes: 0,
          bloqueadas: 0,
          indisponiveis: 0,
          estoque: "APROVADO",
          credito: "APROVADO",
          financeiro: "APROVADO",
          seguranca: "APROVADO",
        },
        ambiente: "Produção Vercel",
        vercel_env: process.env.VERCEL_ENV,
        commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
        commit_ref: process.env.VERCEL_GIT_COMMIT_REF ?? null,
        versao: "V77",
      },
    });

  if (insertError) {
    console.error("V77: erro ao registrar certificação de produção", insertError);

    return {
      success: false,
      message:
        "Não foi possível registrar a certificação na auditoria.",
    };
  }

  revalidatePath("/admin/qualidade/producao");
  revalidatePath("/admin/qualidade");
  revalidatePath("/admin/qualidade/liberacao");

  return {
    success: true,
    message: "Produção certificada e registrada na auditoria.",
  };
}
