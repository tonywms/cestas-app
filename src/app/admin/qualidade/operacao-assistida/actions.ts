"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

/* V78_OPERACAO_ASSISTIDA_ACTIONS */

type Severidade = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";

type Modulo =
  | "ESTOQUE"
  | "CARGAS"
  | "VENDAS"
  | "CLIENTES"
  | "ROTAS"
  | "FINANCEIRO"
  | "CREDITO"
  | "PERMISSOES"
  | "MOBILE"
  | "AUTENTICACAO"
  | "INTEGRACOES"
  | "OUTROS";

type Resultado = {
  success: boolean;
  message: string;
};

function texto(valor: unknown, limite: number) {
  return String(valor ?? "").trim().slice(0, limite);
}

function severidade(valor: unknown): Severidade | null {
  const atual = texto(valor, 20).toUpperCase();
  if (
    atual === "BAIXA" ||
    atual === "MEDIA" ||
    atual === "ALTA" ||
    atual === "CRITICA"
  ) {
    return atual;
  }
  return null;
}

function modulo(valor: unknown): Modulo | null {
  const atual = texto(valor, 40).toUpperCase();
  const permitidos: Modulo[] = [
    "ESTOQUE",
    "CARGAS",
    "VENDAS",
    "CLIENTES",
    "ROTAS",
    "FINANCEIRO",
    "CREDITO",
    "PERMISSOES",
    "MOBILE",
    "AUTENTICACAO",
    "INTEGRACOES",
    "OUTROS",
  ];

  return permitidos.includes(atual as Modulo)
    ? (atual as Modulo)
    : null;
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
      erro: "Usuário sem permissão para administrar a operação assistida.",
    } as const;
  }

  return {
    usuario,
    supabase: await createClient(),
    erro: null,
  } as const;
}

function revalidar() {
  revalidatePath("/admin/qualidade/operacao-assistida");
  revalidatePath("/admin/qualidade");
  revalidatePath("/admin/qualidade/producao");
}

async function incidenteExiste(
  supabase: Awaited<ReturnType<typeof createClient>>,
  empresaId: string,
  incidenteId: string,
) {
  const { data, error } = await supabase
    .from("auditoria_eventos")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("entidade", "OPERACAO_ASSISTIDA")
    .eq("entidade_id", incidenteId)
    .eq("acao", "INCIDENTE_ABERTO")
    .limit(1)
    .maybeSingle();

  return {
    existe: Boolean(data),
    error,
  };
}

export async function abrirIncidente(input: {
  titulo?: string;
  descricao?: string;
  severidade?: string;
  modulo?: string;
  responsavel?: string;
}): Promise<Resultado> {
  const { usuario, supabase, erro } = await contexto();

  if (!usuario || !supabase) {
    return { success: false, message: erro ?? "Falha de autorização." };
  }

  const titulo = texto(input?.titulo, 160);
  const descricao = texto(input?.descricao, 3000);
  const severidadeAtual = severidade(input?.severidade);
  const moduloAtual = modulo(input?.modulo);
  const responsavel = texto(input?.responsavel, 120);

  if (titulo.length < 5) {
    return {
      success: false,
      message: "Informe um título com pelo menos 5 caracteres.",
    };
  }

  if (descricao.length < 10) {
    return {
      success: false,
      message: "Descreva o incidente com pelo menos 10 caracteres.",
    };
  }

  if (!severidadeAtual || !moduloAtual) {
    return {
      success: false,
      message: "Selecione severidade e módulo válidos.",
    };
  }

  const agora = new Date().toISOString();
  const incidenteId = `inc-${agora.replace(/[^0-9]/g, "").slice(0, 17)}`;

  const { error } = await supabase.from("auditoria_eventos").insert({
    empresa_id: usuario.empresa.id,
    usuario_id: usuario.id,
    entidade: "OPERACAO_ASSISTIDA",
    entidade_id: incidenteId,
    acao: "INCIDENTE_ABERTO",
    dados: {
      titulo,
      descricao,
      severidade: severidadeAtual,
      modulo: moduloAtual,
      responsavel: responsavel || null,
      status: "ABERTO",
      aberto_em: agora,
      responsavel_nome: usuario.nome ?? "Usuário responsável",
      responsavel_perfil: usuario.perfilCodigo,
      versao: "V78",
    },
  });

  if (error) {
    console.error("V78: erro ao abrir incidente", error);
    return {
      success: false,
      message: "Não foi possível registrar o incidente.",
    };
  }

  revalidar();

  return {
    success: true,
    message: "Incidente registrado na operação assistida.",
  };
}

export async function iniciarAnalise(input: {
  incidenteId?: string;
  responsavel?: string;
  observacao?: string;
}): Promise<Resultado> {
  const { usuario, supabase, erro } = await contexto();

  if (!usuario || !supabase) {
    return { success: false, message: erro ?? "Falha de autorização." };
  }

  const incidenteId = texto(input?.incidenteId, 180);
  const responsavel = texto(input?.responsavel, 120);
  const observacao = texto(input?.observacao, 1000);

  if (!incidenteId) {
    return { success: false, message: "Incidente inválido." };
  }

  const existencia = await incidenteExiste(
    supabase,
    usuario.empresa.id,
    incidenteId,
  );

  if (existencia.error || !existencia.existe) {
    return {
      success: false,
      message: "Incidente não encontrado para esta empresa.",
    };
  }

  const { error } = await supabase.from("auditoria_eventos").insert({
    empresa_id: usuario.empresa.id,
    usuario_id: usuario.id,
    entidade: "OPERACAO_ASSISTIDA",
    entidade_id: incidenteId,
    acao: "INCIDENTE_EM_ANALISE",
    dados: {
      status: "EM_ANALISE",
      responsavel: responsavel || null,
      observacao: observacao || null,
      responsavel_nome: usuario.nome ?? "Usuário responsável",
      responsavel_perfil: usuario.perfilCodigo,
      versao: "V78",
    },
  });

  if (error) {
    console.error("V78: erro ao iniciar análise", error);
    return {
      success: false,
      message: "Não foi possível iniciar a análise.",
    };
  }

  revalidar();

  return {
    success: true,
    message: "Incidente movido para análise.",
  };
}

export async function resolverIncidente(input: {
  incidenteId?: string;
  responsavel?: string;
  solucao?: string;
}): Promise<Resultado> {
  const { usuario, supabase, erro } = await contexto();

  if (!usuario || !supabase) {
    return { success: false, message: erro ?? "Falha de autorização." };
  }

  const incidenteId = texto(input?.incidenteId, 180);
  const responsavel = texto(input?.responsavel, 120);
  const solucao = texto(input?.solucao, 3000);

  if (!incidenteId) {
    return { success: false, message: "Incidente inválido." };
  }

  if (solucao.length < 10) {
    return {
      success: false,
      message: "Descreva a solução aplicada com pelo menos 10 caracteres.",
    };
  }

  const existencia = await incidenteExiste(
    supabase,
    usuario.empresa.id,
    incidenteId,
  );

  if (existencia.error || !existencia.existe) {
    return {
      success: false,
      message: "Incidente não encontrado para esta empresa.",
    };
  }

  const agora = new Date().toISOString();

  const { error } = await supabase.from("auditoria_eventos").insert({
    empresa_id: usuario.empresa.id,
    usuario_id: usuario.id,
    entidade: "OPERACAO_ASSISTIDA",
    entidade_id: incidenteId,
    acao: "INCIDENTE_RESOLVIDO",
    dados: {
      status: "RESOLVIDO",
      responsavel: responsavel || null,
      solucao,
      resolvido_em: agora,
      responsavel_nome: usuario.nome ?? "Usuário responsável",
      responsavel_perfil: usuario.perfilCodigo,
      versao: "V78",
    },
  });

  if (error) {
    console.error("V78: erro ao resolver incidente", error);
    return {
      success: false,
      message: "Não foi possível resolver o incidente.",
    };
  }

  revalidar();

  return {
    success: true,
    message: "Incidente resolvido e solução registrada.",
  };
}

export async function reabrirIncidente(input: {
  incidenteId?: string;
  motivo?: string;
}): Promise<Resultado> {
  const { usuario, supabase, erro } = await contexto();

  if (!usuario || !supabase) {
    return { success: false, message: erro ?? "Falha de autorização." };
  }

  const incidenteId = texto(input?.incidenteId, 180);
  const motivo = texto(input?.motivo, 1000);

  if (!incidenteId) {
    return { success: false, message: "Incidente inválido." };
  }

  if (motivo.length < 5) {
    return {
      success: false,
      message: "Informe o motivo da reabertura.",
    };
  }

  const existencia = await incidenteExiste(
    supabase,
    usuario.empresa.id,
    incidenteId,
  );

  if (existencia.error || !existencia.existe) {
    return {
      success: false,
      message: "Incidente não encontrado para esta empresa.",
    };
  }

  const { error } = await supabase.from("auditoria_eventos").insert({
    empresa_id: usuario.empresa.id,
    usuario_id: usuario.id,
    entidade: "OPERACAO_ASSISTIDA",
    entidade_id: incidenteId,
    acao: "INCIDENTE_REABERTO",
    dados: {
      status: "ABERTO",
      motivo,
      responsavel_nome: usuario.nome ?? "Usuário responsável",
      responsavel_perfil: usuario.perfilCodigo,
      versao: "V78",
    },
  });

  if (error) {
    console.error("V78: erro ao reabrir incidente", error);
    return {
      success: false,
      message: "Não foi possível reabrir o incidente.",
    };
  }

  revalidar();

  return {
    success: true,
    message: "Incidente reaberto.",
  };
}
