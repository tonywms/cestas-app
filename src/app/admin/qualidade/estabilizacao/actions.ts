"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

/* V80_TERMO_ESTABILIZACAO_ACTIONS */

type Resultado = {
  success: boolean;
  message: string;
};

type IncidenteAtual = {
  id: string;
  status: "ABERTO" | "EM_ANALISE" | "RESOLVIDO";
  severidade: string;
  abertoEm: string | null;
  primeiraAnaliseEm: string | null;
  resolvidoEm: string | null;
  reaberturas: number;
};

function objeto(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object"
    ? (valor as Record<string, unknown>)
    : {};
}

function texto(valor: unknown, limite: number) {
  return String(valor ?? "").trim().slice(0, limite);
}

function dataValida(valor: string | null | undefined) {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

function duracaoMinutos(inicio: string | null, fim: string | null) {
  const a = dataValida(inicio);
  const b = dataValida(fim);
  if (!a || !b) return null;

  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

function media(valores: number[]) {
  if (valores.length === 0) return null;

  return Math.round(
    valores.reduce((total, atual) => total + atual, 0) / valores.length,
  );
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
      erro: "Usuário sem permissão para formalizar a estabilização.",
    } as const;
  }

  return {
    usuario,
    supabase: await createClient(),
    erro: null,
  } as const;
}

async function snapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  empresaId: string,
) {
  const [incidentesResult, controleResult, goLiveResult] =
    await Promise.all([
      supabase
        .from("auditoria_eventos")
        .select("entidade_id,acao,dados,created_at")
        .eq("empresa_id", empresaId)
        .eq("entidade", "OPERACAO_ASSISTIDA")
        .in("acao", [
          "INCIDENTE_ABERTO",
          "INCIDENTE_EM_ANALISE",
          "INCIDENTE_RESOLVIDO",
          "INCIDENTE_REABERTO",
        ])
        .order("created_at", { ascending: true })
        .limit(5000),
      supabase
        .from("auditoria_eventos")
        .select("acao,created_at,dados")
        .eq("empresa_id", empresaId)
        .eq("entidade", "OPERACAO_ASSISTIDA_CONTROLE")
        .in("acao", [
          "OPERACAO_ASSISTIDA_ENCERRADA",
          "OPERACAO_ASSISTIDA_REABERTA",
        ])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("auditoria_eventos")
        .select("entidade_id,acao,dados,created_at")
        .eq("empresa_id", empresaId)
        .eq("entidade", "GO_LIVE")
        .in("acao", ["GO_LIVE_LIBERADO", "GO_LIVE_NAO_LIBERADO"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (
    incidentesResult.error ||
    controleResult.error ||
    goLiveResult.error
  ) {
    return {
      ok: false as const,
      message: "Não foi possível validar a trilha de governança.",
    };
  }

  const mapa = new Map<string, IncidenteAtual>();

  for (const evento of incidentesResult.data ?? []) {
    const id = texto(evento.entidade_id, 180);
    if (!id) continue;

    const dados = objeto(evento.dados);
    const atual = mapa.get(id);

    if (evento.acao === "INCIDENTE_ABERTO") {
      mapa.set(id, {
        id,
        status: "ABERTO",
        severidade: texto(dados.severidade, 30) || "BAIXA",
        abertoEm:
          texto(dados.aberto_em, 80) || evento.created_at || null,
        primeiraAnaliseEm: null,
        resolvidoEm: null,
        reaberturas: 0,
      });
      continue;
    }

    if (!atual) continue;

    if (evento.acao === "INCIDENTE_EM_ANALISE") {
      atual.status = "EM_ANALISE";
      if (!atual.primeiraAnaliseEm) {
        atual.primeiraAnaliseEm = evento.created_at;
      }
    }

    if (evento.acao === "INCIDENTE_RESOLVIDO") {
      atual.status = "RESOLVIDO";
      atual.resolvidoEm =
        texto(dados.resolvido_em, 80) || evento.created_at || null;
    }

    if (evento.acao === "INCIDENTE_REABERTO") {
      atual.status = "ABERTO";
      atual.reaberturas += 1;
      atual.resolvidoEm = null;
    }

    mapa.set(id, atual);
  }

  const incidentes = Array.from(mapa.values());
  const abertos = incidentes.filter(
    (item) => item.status !== "RESOLVIDO",
  );
  const resolvidos = incidentes.filter(
    (item) => item.status === "RESOLVIDO",
  );
  const criticosHistoricos = incidentes.filter(
    (item) => item.severidade === "CRITICA",
  ).length;
  const reaberturas = incidentes.reduce(
    (total, item) => total + item.reaberturas,
    0,
  );

  const temposAnalise = incidentes
    .map((item) =>
      duracaoMinutos(item.abertoEm, item.primeiraAnaliseEm),
    )
    .filter((item): item is number => item !== null);

  const temposResolucao = resolvidos
    .map((item) => duracaoMinutos(item.abertoEm, item.resolvidoEm))
    .filter((item): item is number => item !== null);

  const goLive = goLiveResult.data;
  const controle = controleResult.data;

  return {
    ok: true as const,
    incidentes,
    abertos,
    resolvidos,
    criticosHistoricos,
    reaberturas,
    mediaAnalise: media(temposAnalise),
    mediaResolucao: media(temposResolucao),
    goLive,
    goLiveLiberado: goLive?.acao === "GO_LIVE_LIBERADO",
    encerrada:
      controle?.acao === "OPERACAO_ASSISTIDA_ENCERRADA",
  };
}

function revalidar() {
  revalidatePath("/admin/qualidade/estabilizacao");
  revalidatePath("/admin/qualidade/estabilidade");
  revalidatePath("/admin/qualidade/operacao-assistida");
  revalidatePath("/admin/qualidade");
}

export async function encerrarOperacaoAssistida(input: {
  observacao?: string;
}): Promise<Resultado> {
  const { usuario, supabase, erro } = await contexto();

  if (!usuario || !supabase) {
    return { success: false, message: erro ?? "Falha de autorização." };
  }

  const atual = await snapshot(supabase, usuario.empresa.id);

  if (!atual.ok) {
    return { success: false, message: atual.message };
  }

  if (!atual.goLiveLiberado) {
    return {
      success: false,
      message:
        "A decisão executiva atual não está liberada para produção.",
    };
  }

  if (atual.encerrada) {
    return {
      success: false,
      message: "A operação assistida já está encerrada.",
    };
  }

  if (atual.abertos.length > 0) {
    return {
      success: false,
      message:
        "Existem incidentes em aberto. Resolva-os antes de encerrar.",
    };
  }

  const agora = new Date().toISOString();
  const observacao = texto(input?.observacao, 1500);
  const entidadeId = `estabilizacao-${agora
    .replace(/[^0-9]/g, "")
    .slice(0, 17)}`;

  const { error } = await supabase.from("auditoria_eventos").insert({
    empresa_id: usuario.empresa.id,
    usuario_id: usuario.id,
    entidade: "OPERACAO_ASSISTIDA_CONTROLE",
    entidade_id: entidadeId,
    acao: "OPERACAO_ASSISTIDA_ENCERRADA",
    dados: {
      status: "ENCERRADA",
      encerrada_em: agora,
      observacao: observacao || null,
      responsavel_nome: usuario.nome ?? "Usuário responsável",
      responsavel_perfil: usuario.perfilCodigo,
      go_live_entidade_id: atual.goLive?.entidade_id ?? null,
      snapshot: {
        incidentes: atual.incidentes.length,
        abertos: atual.abertos.length,
        resolvidos: atual.resolvidos.length,
        reaberturas: atual.reaberturas,
        criticos_historicos: atual.criticosHistoricos,
        media_analise_min: atual.mediaAnalise,
        media_resolucao_min: atual.mediaResolucao,
      },
      versao: "V80",
    },
  });

  if (error) {
    console.error("V80: erro ao encerrar operação assistida", error);
    return {
      success: false,
      message: "Não foi possível registrar o termo de estabilização.",
    };
  }

  revalidar();

  return {
    success: true,
    message: "Operação assistida encerrada e termo registrado.",
  };
}

export async function reabrirOperacaoAssistida(input: {
  motivo?: string;
}): Promise<Resultado> {
  const { usuario, supabase, erro } = await contexto();

  if (!usuario || !supabase) {
    return { success: false, message: erro ?? "Falha de autorização." };
  }

  const atual = await snapshot(supabase, usuario.empresa.id);

  if (!atual.ok) {
    return { success: false, message: atual.message };
  }

  if (!atual.encerrada) {
    return {
      success: false,
      message: "A operação assistida já está em acompanhamento.",
    };
  }

  const motivo = texto(input?.motivo, 1500);

  if (motivo.length < 5) {
    return {
      success: false,
      message: "Informe o motivo da reabertura.",
    };
  }

  const agora = new Date().toISOString();
  const entidadeId = `reabertura-estabilizacao-${agora
    .replace(/[^0-9]/g, "")
    .slice(0, 17)}`;

  const { error } = await supabase.from("auditoria_eventos").insert({
    empresa_id: usuario.empresa.id,
    usuario_id: usuario.id,
    entidade: "OPERACAO_ASSISTIDA_CONTROLE",
    entidade_id: entidadeId,
    acao: "OPERACAO_ASSISTIDA_REABERTA",
    dados: {
      status: "EM_ACOMPANHAMENTO",
      reaberta_em: agora,
      motivo,
      responsavel_nome: usuario.nome ?? "Usuário responsável",
      responsavel_perfil: usuario.perfilCodigo,
      versao: "V80",
    },
  });

  if (error) {
    console.error("V80: erro ao reabrir operação assistida", error);
    return {
      success: false,
      message: "Não foi possível reabrir a operação assistida.",
    };
  }

  revalidar();

  return {
    success: true,
    message: "Operação assistida reaberta e histórico preservado.",
  };
}
