export const instant = false;

import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  BadgeDollarSign,
  Boxes,
  CheckCircle2,
  CircleAlert,
  RefreshCcw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { redirect } from "next/navigation";

import {
  HeaderLink,
  Hero,
  Kpi,
  KpiGrid,
  ModuleHeader,
} from "@/components/admin/PremiumModuleUi";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  avaliarCredito,
  dataLimiteAtraso,
  type PoliticaCredito,
} from "@/lib/credito/avaliar-credito";
import { createClient } from "@/lib/supabase/server";

import HomologacaoGateSync from "./HomologacaoGateSync";
import DecisaoGoLiveClient from "./DecisaoGoLiveClient";

/* V74_GATE_EXECUTIVO_GO_LIVE */
/* V75_8_GATE_HOMOLOGACAO_PERSISTENTE */
/* V75_9_DECISAO_EXECUTIVA_GO_LIVE */

const BLOQUEIOS_ADMINISTRATIVOS = new Set([
  "EMPRESA_CONFIGURAR",
  "PERMISSOES_GERENCIAR",
  "USUARIOS_GERENCIAR",
  "FINANCEIRO_AUDITAR",
  "FINANCEIRO_ESTORNAR",
]);

const BIPAGENS = new Set([
  "CARGA_BIPAR_VOLUME",
  "ENTREGA_BIPAR_VOLUME",
]);

const HOMOLOGACAO_ETAPAS = [
  "receber-carga",
  "executar-rota",
  "venda-entrega",
  "cobranca-recebimento",
  "retorno-avaria",
  "fechamento-financeiro",
  "acessos-permissoes",
] as const;

type Estado = "APROVADO" | "ATENCAO" | "BLOQUEADO" | "INDISPONIVEL";

type Frente = {
  chave: "estoque" | "credito" | "financeiro" | "seguranca";
  titulo: string;
  subtitulo: string;
  descricao: string;
  href: string;
  estado: Estado;
  criticos: number;
  atencoes: number;
  informativos: number;
  resumo: string;
  icon: typeof Boxes;
};

type CreditoDiag = {
  politica?: {
    alerta_qtd_atrasos?: number;
    bloqueio_qtd_atrasos?: number;
    dias_tolerancia?: number;
    permitir_excecao?: boolean;
    validade_excecao_dias?: number;
  };
  resumo?: {
    criticos?: number;
    atencoes?: number;
    informativos?: number;
  };
};

type FinanceiroDiag = {
  aprovado?: boolean;
  criticos?: number;
  atencoes?: number;
  findings?: Array<{ nivel?: string }>;
};

function numero(valor: unknown) {
  const convertido = Number(valor ?? 0);
  return Number.isFinite(convertido) ? convertido : 0;
}

function formatarDataHora(valor: string | null | undefined) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function relacaoUnica<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

function estadoPorContagem(
  criticos: number,
  atencoes: number,
  disponivel = true,
): Estado {
  if (!disponivel) return "INDISPONIVEL";
  if (criticos > 0) return "BLOQUEADO";
  if (atencoes > 0) return "ATENCAO";
  return "APROVADO";
}

function rotuloEstado(estado: Estado) {
  if (estado === "APROVADO") return "Aprovada";
  if (estado === "ATENCAO") return "Revisar";
  if (estado === "BLOQUEADO") return "Bloqueada";
  return "Indisponível";
}

function visualEstado(estado: Estado) {
  if (estado === "APROVADO") {
    return {
      card: "border-emerald-200 bg-emerald-50/45",
      badge: "bg-emerald-100 text-emerald-800",
      icon: "bg-emerald-100 text-emerald-700",
      botao: "bg-[#137a3d] hover:bg-[#0f6934]",
    };
  }

  if (estado === "ATENCAO") {
    return {
      card: "border-amber-200 bg-amber-50/45",
      badge: "bg-amber-100 text-amber-800",
      icon: "bg-amber-100 text-amber-700",
      botao: "bg-amber-600 hover:bg-amber-700",
    };
  }

  if (estado === "BLOQUEADO") {
    return {
      card: "border-red-200 bg-red-50/45",
      badge: "bg-red-100 text-red-700",
      icon: "bg-red-100 text-red-700",
      botao: "bg-red-700 hover:bg-red-800",
    };
  }

  return {
    card: "border-slate-200 bg-slate-50",
    badge: "bg-slate-200 text-slate-700",
    icon: "bg-slate-200 text-slate-600",
    botao: "bg-slate-700 hover:bg-slate-800",
  };
}

function falhasDeterministicasCredito(diagnostico: CreditoDiag) {
  const p = diagnostico.politica;
  if (!p) return 1;

  const politica: PoliticaCredito = {
    alertaQtdAtrasos: numero(p.alerta_qtd_atrasos),
    bloqueioQtdAtrasos: numero(p.bloqueio_qtd_atrasos),
    diasTolerancia: numero(p.dias_tolerancia),
    permitirExcecao: Boolean(p.permitir_excecao),
    validadeExcecaoDias: numero(p.validade_excecao_dias),
  };

  const agora = new Date("2026-11-02T18:00:00-03:00");
  const futura = {
    id: 999001,
    motivo: "Cenário de certificação",
    validoAte: "2026-11-03T18:00:00-03:00",
  };
  const expirada = {
    id: 999002,
    motivo: "Cenário expirado",
    validoAte: "2026-11-01T18:00:00-03:00",
  };

  const testes = [
    avaliarCredito({ qtdAtrasos: 0, politica, liberacaoAtiva: null, agora }).statusEfetivo === "LIBERADO",
    avaliarCredito({ qtdAtrasos: politica.alertaQtdAtrasos, politica, liberacaoAtiva: null, agora }).statusEfetivo === "ALERTA",
    avaliarCredito({ qtdAtrasos: politica.bloqueioQtdAtrasos, politica, liberacaoAtiva: null, agora }).statusEfetivo === "BLOQUEADO",
    avaliarCredito({ qtdAtrasos: politica.bloqueioQtdAtrasos, politica: { ...politica, permitirExcecao: true }, liberacaoAtiva: futura, agora }).statusEfetivo === "LIBERADO_EXCECAO",
    avaliarCredito({ qtdAtrasos: politica.bloqueioQtdAtrasos, politica: { ...politica, permitirExcecao: true }, liberacaoAtiva: expirada, agora }).statusEfetivo === "BLOQUEADO",
    avaliarCredito({ qtdAtrasos: politica.bloqueioQtdAtrasos, politica: { ...politica, permitirExcecao: false }, liberacaoAtiva: futura, agora }).statusEfetivo === "BLOQUEADO",
    dataLimiteAtraso("2026-11-02", 3) === "2026-10-30",
  ];

  return testes.filter((ok) => !ok).length;
}

export default async function GateExecutivoPage() {
  const usuario = await getCurrentUserProfile();
  if (!usuario || !usuario.ativo) redirect("/");

  const podeAuditar =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo === "ADMINISTRADOR" ||
    usuario.perfilCodigo === "GESTOR";

  if (!podeAuditar) redirect("/admin");

  const supabase = await createClient();

  const [
    estoqueResult,
    creditoResult,
    financeiroResult,
    homologacaoResult,
    decisoesResult,
  ] = await Promise.all([
    supabase.rpc("diagnostico_consistencia_estoque", {
      p_empresa_id: usuario.empresa.id,
      p_limite: 100,
    }),
    supabase.rpc("diagnostico_credito_qa", {
      p_empresa_id: usuario.empresa.id,
      p_limite: 100,
    }),
    supabase.rpc("diagnostico_financeiro_qa_v70", {
      p_empresa_id: usuario.empresa.id,
    }),
    supabase
      .from("auditoria_eventos")
      .select("acao,dados,created_at,entidade_id")
      .eq("empresa_id", usuario.empresa.id)
      .eq("entidade", "HOMOLOGACAO_OPERACIONAL")
      .in("acao", ["HOMOLOGACAO_CONCLUIDA", "HOMOLOGACAO_REINICIADA"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("auditoria_eventos")
      .select("acao,dados,created_at,entidade_id")
      .eq("empresa_id", usuario.empresa.id)
      .eq("entidade", "GO_LIVE")
      .in("acao", ["GO_LIVE_LIBERADO", "GO_LIVE_NAO_LIBERADO"])
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const estoqueBruto =
    estoqueResult.data && typeof estoqueResult.data === "object"
      ? (estoqueResult.data as Record<string, unknown>)
      : {};
  const estoqueResumo =
    estoqueBruto.resumo && typeof estoqueBruto.resumo === "object"
      ? (estoqueBruto.resumo as Record<string, unknown>)
      : {};
  const estoqueCriticos = numero(estoqueResumo.criticos);
  const estoqueLegados = numero(estoqueResumo.legados);

  const credito = (creditoResult.data ?? {}) as CreditoDiag;
  const creditoCriticos = numero(credito.resumo?.criticos);
  const creditoAtencoes = numero(credito.resumo?.atencoes);
  const creditoInformativos = numero(credito.resumo?.informativos);
  const creditoFalhas = creditoResult.error ? 0 : falhasDeterministicasCredito(credito);

  const financeiro = (financeiroResult.data ?? {}) as FinanceiroDiag;
  const findingsFinanceiro = Array.isArray(financeiro.findings)
    ? financeiro.findings
    : [];
  const financeiroCriticos = Math.max(
    numero(financeiro.criticos),
    findingsFinanceiro.filter((item) => String(item.nivel).toUpperCase() === "CRITICO").length,
  );
  const financeiroAtencoes = Math.max(
    numero(financeiro.atencoes),
    findingsFinanceiro.filter((item) => String(item.nivel).toUpperCase() === "ATENCAO").length,
  );

  const homologacaoEvento = homologacaoResult.data;
  const homologacaoDados =
    homologacaoEvento?.dados && typeof homologacaoEvento.dados === "object"
      ? (homologacaoEvento.dados as Record<string, unknown>)
      : {};
  const homologacaoMarcadas = Array.isArray(homologacaoDados.marcadas)
    ? homologacaoDados.marcadas.filter((item): item is string => typeof item === "string")
    : [];
  const homologacaoConcluida = Boolean(
    !homologacaoResult.error &&
      homologacaoEvento?.acao === "HOMOLOGACAO_CONCLUIDA" &&
      homologacaoDados.status === "CONCLUIDA" &&
      HOMOLOGACAO_ETAPAS.every((id) => homologacaoMarcadas.includes(id)),
  );
  const homologacaoResponsavel =
    typeof homologacaoDados.responsavel_nome === "string"
      ? homologacaoDados.responsavel_nome
      : "Responsável da homologação";
  const homologacaoConcluidaEm =
    typeof homologacaoDados.concluida_em === "string"
      ? homologacaoDados.concluida_em
      : homologacaoEvento?.created_at ?? null;

  const historicoGoLive = (decisoesResult.data ?? []).map((evento) => {
    const dados =
      evento.dados && typeof evento.dados === "object"
        ? (evento.dados as Record<string, unknown>)
        : {};
    const status =
      evento.acao === "GO_LIVE_LIBERADO" ? "LIBERADO" : "NAO_LIBERADO";

    return {
      id: String(evento.entidade_id ?? evento.created_at ?? "go-live"),
      status: status as "LIBERADO" | "NAO_LIBERADO",
      decididoEm:
        typeof dados.decidido_em === "string"
          ? dados.decidido_em
          : String(evento.created_at ?? ""),
      responsavel:
        typeof dados.responsavel_nome === "string"
          ? dados.responsavel_nome
          : "Responsável da decisão",
      perfil:
        typeof dados.responsavel_perfil === "string"
          ? dados.responsavel_perfil
          : "GESTÃO",
      observacao:
        typeof dados.observacao === "string" && dados.observacao.trim()
          ? dados.observacao
          : null,
      homologacaoEntidadeId:
        typeof dados.homologacao_entidade_id === "string"
          ? dados.homologacao_entidade_id
          : null,
    };
  });

  const homologacaoEntidadeId = homologacaoEvento?.entidade_id
    ? String(homologacaoEvento.entidade_id)
    : null;
  const decisaoAtual = homologacaoConcluida && homologacaoEntidadeId
    ? historicoGoLive.find(
        (item) => item.homologacaoEntidadeId === homologacaoEntidadeId,
      ) ?? null
    : null;

  const [
    perfisResult,
    permissoesResult,
    perfilPermissoesResult,
    usuarioPermissoesResult,
    membrosResult,
  ] = await Promise.all([
    supabase.from("perfis").select("id,codigo,nome,ativo").eq("ativo", true).order("id"),
    supabase.from("permissoes").select("id,codigo,nome,modulo,sensivel,ativo").eq("ativo", true).order("modulo").order("nome"),
    supabase.from("perfil_permissoes").select("perfil_id,permissao_id,permitido").eq("empresa_id", usuario.empresa.id),
    supabase.from("usuario_permissoes").select("usuario_id,permissao_id,permitido,motivo").eq("empresa_id", usuario.empresa.id),
    supabase
      .from("empresa_usuarios")
      .select(`
        usuario_id,
        perfil_id,
        ativo,
        usuarios!inner (id,nome,ativo),
        perfis!inner (id,codigo,nome)
      `)
      .eq("empresa_id", usuario.empresa.id),
  ]);

  const erroSeguranca = Boolean(
    perfisResult.error ||
      permissoesResult.error ||
      perfilPermissoesResult.error ||
      usuarioPermissoesResult.error ||
      membrosResult.error,
  );

  let segurancaCriticos = 0;
  let segurancaAtencoes = 0;
  let segurancaInformativos = 0;

  if (!erroSeguranca) {
    const perfis = perfisResult.data ?? [];
    const permissoes = permissoesResult.data ?? [];
    const perfilPermissoes = perfilPermissoesResult.data ?? [];
    const usuarioPermissoes = usuarioPermissoesResult.data ?? [];
    const perfilEntregador = perfis.find((perfil) => String(perfil.codigo) === "ENTREGADOR");

    if (!perfilEntregador) {
      segurancaCriticos = 1;
    } else {
      const permissaoPorId = new Map(
        permissoes.map((permissao) => [
          String(permissao.id),
          {
            codigo: String(permissao.codigo),
            sensivel: Boolean(permissao.sensivel),
          },
        ]),
      );

      const membros = (membrosResult.data ?? [])
        .map((membro) => {
          const pessoa = relacaoUnica(membro.usuarios);
          const perfil = relacaoUnica(membro.perfis);
          if (!pessoa || !perfil) return null;
          return {
            usuarioId: String(membro.usuario_id),
            vinculoAtivo: Boolean(membro.ativo),
            usuarioAtivo: Boolean(pessoa.ativo),
            perfilCodigo: String(perfil.codigo),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      const entregadoresAtivos = membros.filter(
        (membro) =>
          membro.vinculoAtivo &&
          membro.usuarioAtivo &&
          membro.perfilCodigo === "ENTREGADOR",
      );
      const entregadorIds = new Set(entregadoresAtivos.map((membro) => membro.usuarioId));
      const membrosDaEmpresa = new Set(membros.map((membro) => membro.usuarioId));
      const baseEntregador = perfilPermissoes.filter(
        (item) => Number(item.perfil_id) === Number(perfilEntregador.id),
      );
      const baseLiberada = (codigo: string) =>
        baseEntregador.some((item) => {
          const permissao = permissaoPorId.get(String(item.permissao_id));
          return Boolean(item.permitido) && permissao?.codigo === codigo;
        });
      const overridesEntregador = usuarioPermissoes.filter((item) =>
        entregadorIds.has(String(item.usuario_id)),
      );
      const overridesLiberados = (codigos: Set<string>) =>
        overridesEntregador.filter((item) => {
          if (!item.permitido) return false;
          const permissao = permissaoPorId.get(String(item.permissao_id));
          return permissao ? codigos.has(permissao.codigo) : false;
        });

      const proibidasNoPerfil = baseEntregador.filter((item) => {
        if (!item.permitido) return false;
        const permissao = permissaoPorId.get(String(item.permissao_id));
        return permissao ? BLOQUEIOS_ADMINISTRATIVOS.has(permissao.codigo) : false;
      });
      const proibidasIndividuais = overridesLiberados(BLOQUEIOS_ADMINISTRATIVOS);
      const vinculosAtivosComUsuarioInativo = membros.filter(
        (membro) => membro.vinculoAtivo && !membro.usuarioAtivo,
      );
      const overridesSemVinculo = usuarioPermissoes.filter(
        (item) => !membrosDaEmpresa.has(String(item.usuario_id)),
      );
      const bipagensIndividuais = overridesLiberados(BIPAGENS);
      const conflitoVolume =
        usuario.configuracao.modoControleCarga !== "VOLUME"
          ? [baseLiberada("CARGA_BIPAR_VOLUME"), baseLiberada("ENTREGA_BIPAR_VOLUME")].filter(Boolean).length + bipagensIndividuais.length
          : 0;
      const conflitoFinanceiro = !usuario.configuracao.permitirPagamentoMobile
        ? (baseLiberada("PAGAMENTO_REGISTRAR") ? 1 : 0) +
          overridesLiberados(new Set(["PAGAMENTO_REGISTRAR"])).length
        : 0;
      const conflitoOcorrencia = !usuario.configuracao.permitirOcorrenciaMobile
        ? (baseLiberada("OCORRENCIA_REGISTRAR") ? 1 : 0) +
          overridesLiberados(new Set(["OCORRENCIA_REGISTRAR"])).length
        : 0;
      const catalogoSemConfiguracao = permissoes.filter(
        (permissao) =>
          !baseEntregador.some(
            (item) => String(item.permissao_id) === String(permissao.id),
          ),
      );

      segurancaCriticos =
        proibidasNoPerfil.length +
        proibidasIndividuais.length +
        vinculosAtivosComUsuarioInativo.length;
      segurancaAtencoes =
        conflitoVolume +
        conflitoFinanceiro +
        conflitoOcorrencia +
        overridesSemVinculo.length;
      segurancaInformativos = catalogoSemConfiguracao.length;
    }
  }

  const frentes: Frente[] = [
    {
      chave: "estoque",
      titulo: "Estoque e rastreabilidade",
      subtitulo: "Integridade física",
      descricao: "Confere saldo central, cargas, entregas, retornos, avarias e volumes físicos.",
      href: "/admin/estoque/consistencia",
      estado: estadoPorContagem(estoqueCriticos, 0, !estoqueResult.error),
      criticos: estoqueCriticos,
      atencoes: 0,
      informativos: estoqueLegados,
      resumo: estoqueResult.error
        ? "A certificação de estoque não respondeu nesta leitura."
        : estoqueCriticos > 0
          ? "Há divergências físicas que precisam ser corrigidas antes da liberação."
          : estoqueLegados > 0
            ? "Operação atual coerente; existem apenas registros históricos anteriores à rastreabilidade completa."
            : "Saldo físico e movimentos operacionais estão coerentes.",
      icon: Boxes,
    },
    {
      chave: "credito",
      titulo: "Crédito e carteira",
      subtitulo: "Regras de crédito",
      descricao: "Valida política, tolerância, alertas, bloqueios, exceções e o motor de decisão.",
      href: "/admin/credito/consistencia",
      estado: estadoPorContagem(
        creditoCriticos + creditoFalhas,
        creditoAtencoes,
        !creditoResult.error,
      ),
      criticos: creditoCriticos + creditoFalhas,
      atencoes: creditoAtencoes,
      informativos: creditoInformativos,
      resumo: creditoResult.error
        ? "A certificação de crédito não respondeu nesta leitura."
        : creditoCriticos + creditoFalhas > 0
          ? "Há regra ou cenário do motor de crédito que reprova a liberação."
          : creditoAtencoes > 0
            ? "O motor está íntegro, mas existem situações que precisam ser revisadas pela gestão."
            : "Política e motor de crédito estão coerentes com as regras configuradas.",
      icon: BadgeDollarSign,
    },
    {
      chave: "financeiro",
      titulo: "Financeiro e prestação de contas",
      subtitulo: "Conciliação financeira",
      descricao: "Cruza contratos, parcelas, pagamentos, recebimentos, fechamentos e estornos.",
      href: "/admin/financeiro/consistencia",
      estado: estadoPorContagem(
        financeiroCriticos + (!financeiroResult.error && financeiro.aprovado === false && financeiroCriticos === 0 && financeiroAtencoes === 0 ? 1 : 0),
        financeiroAtencoes,
        !financeiroResult.error,
      ),
      criticos: financeiroCriticos,
      atencoes: financeiroAtencoes,
      informativos: 0,
      resumo: financeiroResult.error
        ? "A certificação financeira não respondeu nesta leitura."
        : financeiroCriticos > 0 || financeiro.aprovado === false
          ? "Existe divergência de conciliação que precisa ser investigada antes da liberação."
          : financeiroAtencoes > 0
            ? "A conciliação não tem crítico, mas há pontos que exigem revisão consciente."
            : "Conciliação financeira e prestação de contas estão coerentes.",
      icon: WalletCards,
    },
    {
      chave: "seguranca",
      titulo: "Segurança e permissões",
      subtitulo: "Governança de acesso",
      descricao: "Confere perfil do Entregador, exceções, vínculos, bloqueios superiores e acessos sensíveis.",
      href: "/admin/permissoes/consistencia",
      estado: estadoPorContagem(segurancaCriticos, segurancaAtencoes, !erroSeguranca),
      criticos: segurancaCriticos,
      atencoes: segurancaAtencoes,
      informativos: segurancaInformativos,
      resumo: erroSeguranca
        ? "A certificação de acessos não respondeu nesta leitura."
        : segurancaCriticos > 0
          ? "Há acesso incompatível com o perfil operacional e a liberação deve permanecer bloqueada."
          : segurancaAtencoes > 0
            ? "Não há acesso crítico, mas a matriz possui configurações que precisam ser revisadas."
            : "Perfis, exceções e limites de acesso estão coerentes.",
      icon: ShieldCheck,
    },
  ];

  const aprovadas = frentes.filter((item) => item.estado === "APROVADO").length;
  const revisoes = frentes.filter((item) => item.estado === "ATENCAO").length;
  const bloqueadas = frentes.filter((item) => item.estado === "BLOQUEADO").length;
  const indisponiveis = frentes.filter((item) => item.estado === "INDISPONIVEL").length;

  const gatePronto =
    aprovadas === 4 &&
    revisoes === 0 &&
    bloqueadas === 0 &&
    indisponiveis === 0 &&
    homologacaoConcluida;

  const snapshotGate = {
    aprovadas,
    revisoes,
    bloqueadas,
    indisponiveis,
    estoque: frentes.find((item) => item.chave === "estoque")?.estado ?? "INDISPONIVEL",
    credito: frentes.find((item) => item.chave === "credito")?.estado ?? "INDISPONIVEL",
    financeiro: frentes.find((item) => item.chave === "financeiro")?.estado ?? "INDISPONIVEL",
    seguranca: frentes.find((item) => item.chave === "seguranca")?.estado ?? "INDISPONIVEL",
  };

  const veredito =
    indisponiveis > 0
      ? {
          titulo: "Validação incompleta",
          descricao: "Uma ou mais certificações não responderam. Não libere a operação até executar novamente e obter leitura completa.",
          tone: "slate",
        }
      : bloqueadas > 0
        ? {
            titulo: "Liberação bloqueada",
            descricao: "Existe pelo menos uma inconsistência crítica. Corrija o ponto indicado e execute o gate novamente.",
            tone: "red",
          }
        : revisoes > 0
          ? {
              titulo: "Revisão gerencial necessária",
              descricao: "Não há crítico, mas existem atenções que precisam ser entendidas e aceitas conscientemente antes da homologação final.",
              tone: "amber",
            }
          : homologacaoConcluida && decisaoAtual?.status === "LIBERADO"
            ? {
                titulo: "Liberado para produção",
                descricao: "A decisão executiva desta homologação foi registrada como LIBERADA. O registro é auditável e permanece vinculado à rodada 7/7 aprovada.",
                tone: "emerald",
              }
            : homologacaoConcluida && decisaoAtual?.status === "NAO_LIBERADO"
              ? {
                  titulo: "Go-live não liberado",
                  descricao: "A homologação está concluída, mas a decisão executiva atual não liberou a produção. Consulte o motivo registrado e decida novamente quando estiver resolvido.",
                  tone: "red",
                }
              : homologacaoConcluida
                ? {
                    titulo: "Pronto para decisão de go-live",
                    descricao: "As quatro frentes técnicas estão aprovadas e a homologação operacional 7/7 foi concluída. O ambiente está pronto para a decisão executiva de liberação.",
                    tone: "emerald",
                  }
                : {
                titulo: "Pronto para homologação final",
                descricao: "As quatro frentes técnicas estão aprovadas. O próximo passo é a validação operacional final com o usuário-chave antes do go-live.",
                tone: "emerald",
              };

  const vereditoClasses =
    veredito.tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : veredito.tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : veredito.tone === "red"
          ? "border-red-200 bg-red-50 text-red-950"
          : "border-slate-200 bg-slate-50 text-slate-800";

  const executadoEm = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto w-full max-w-[1600px]">
        <HomologacaoGateSync
          empresaId={String(usuario.empresa.id)}
          jaPersistida={homologacaoConcluida}
        />
        <ModuleHeader
          eyebrow="Qualidade e governança"
          title="Gate executivo de liberação"
          backHref="/admin/qualidade"
          actions={
            <>
              {/* V77_SAUDE_PRODUCAO_LINK */}
              <HeaderLink href="/admin/qualidade/producao">Saúde da produção</HeaderLink>
              <HeaderLink href="/admin/qualidade">Central de certificações</HeaderLink>
              <HeaderLink href="/admin/qualidade/liberacao" variant="primary">
                <RefreshCcw size={15} /> Atualizar gate
              </HeaderLink>
            </>
          }
        />

        <Hero
          eyebrow={homologacaoConcluida ? "Decisão final de liberação" : "Decisão antes da homologação"}
          title={`${veredito.titulo}.`}
          description={veredito.descricao}
          badge={
            <div className="rounded-[18px] border border-white/15 bg-white/[0.08] px-4 py-3 text-right">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/60">Leitura executada em</p>
              <p className="mt-1 text-[14px] font-extrabold text-white">{executadoEm}</p>
            </div>
          }
        >
          <KpiGrid>
            <Kpi label="Frentes verificadas" value="4" subtitle="Estoque, crédito, financeiro e acessos" />
            <Kpi label="Aprovadas" value={aprovadas} subtitle="Sem crítico nem atenção" />
            <Kpi label="Para revisar" value={revisoes} subtitle="Exigem leitura gerencial" warning={revisoes > 0} />
            <Kpi label="Bloqueadas" value={bloqueadas} subtitle="Impedem a liberação" warning={bloqueadas > 0} />
            <Kpi label="Indisponíveis" value={indisponiveis} subtitle="Precisam ser executadas novamente" warning={indisponiveis > 0} />
          </KpiGrid>
        </Hero>

        <section className={`mt-5 rounded-[26px] border p-5 shadow-sm md:p-6 ${vereditoClasses}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white shadow-sm">
                {bloqueadas > 0 || indisponiveis > 0 ? (
                  <CircleAlert size={24} />
                ) : revisoes > 0 ? (
                  <AlertTriangle size={24} />
                ) : (
                  <CheckCircle2 size={24} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-70">Resultado consolidado</p>
                <h2 className="mt-1 break-words text-[24px] font-extrabold tracking-[-0.04em]">{veredito.titulo}</h2>
                <p className="mt-2 max-w-[980px] break-words text-[13px] leading-6 opacity-75">{veredito.descricao}</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-white px-4 py-2 text-[12px] font-extrabold shadow-sm">
              {homologacaoConcluida ? "4/4 técnicas • 7/7 operacional" : `${aprovadas}/4 aprovadas`}
            </span>
          </div>
        </section>

        <DecisaoGoLiveClient
          podeDecidir={gatePronto}
          homologacaoEntidadeId={homologacaoEntidadeId}
          homologacaoResponsavel={homologacaoResponsavel}
          homologacaoConcluidaEm={homologacaoConcluidaEm}
          snapshot={snapshotGate}
          decisaoAtual={decisaoAtual}
          historico={historicoGoLive}
        />

        <section className="mt-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#b28735]">Leitura por frente</p>
              <h2 className="mt-1 text-[25px] font-extrabold tracking-[-0.04em] text-[#102017]">Entenda exatamente o que está liberado e o que exige ação</h2>
            </div>
            <p className="max-w-[620px] text-right text-[12px] leading-5 text-slate-500">A decisão abaixo usa os mesmos diagnósticos oficiais das telas de certificação. Nenhuma regra é recriada apenas para aparência.</p>
          </div>

          <div className="mt-4 grid auto-rows-fr gap-4 lg:grid-cols-2">
            {frentes.map((frente) => {
              const Icone = frente.icon;
              const visual = visualEstado(frente.estado);
              return (
                <article key={frente.chave} className={`flex min-w-0 flex-col overflow-hidden rounded-[26px] border p-5 shadow-sm md:p-6 ${visual.card}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] ${visual.icon}`}>
                        <Icone size={22} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#b28735]">{frente.subtitulo}</p>
                        <h3 className="mt-1 break-words text-[20px] font-extrabold leading-6 text-[#122018]">{frente.titulo}</h3>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.08em] ${visual.badge}`}>
                      {rotuloEstado(frente.estado)}
                    </span>
                  </div>

                  <p className="mt-4 break-words text-[13px] leading-5 text-slate-600">{frente.descricao}</p>
                  <div className="mt-4 rounded-[18px] border border-white/80 bg-white/75 p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">O que isso significa</p>
                    <p className="mt-2 break-words text-[13px] font-semibold leading-5 text-slate-700">{frente.resumo}</p>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="min-w-0 rounded-[16px] bg-white/80 p-3">
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-400">Críticos</p>
                      <p className="mt-1 text-[18px] font-extrabold text-slate-800">{frente.criticos}</p>
                    </div>
                    <div className="min-w-0 rounded-[16px] bg-white/80 p-3">
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-400">Atenções</p>
                      <p className="mt-1 text-[18px] font-extrabold text-slate-800">{frente.atencoes}</p>
                    </div>
                    <div className="min-w-0 rounded-[16px] bg-white/80 p-3">
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-400">Informativos</p>
                      <p className="mt-1 text-[18px] font-extrabold text-slate-800">{frente.informativos}</p>
                    </div>
                  </div>

                  <Link href={frente.href} className={`mt-5 flex min-h-[48px] w-full items-center justify-center rounded-[15px] px-4 py-3 text-center text-[12px] font-extrabold text-white transition ${visual.botao}`}>
                    Ver certificação completa
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        {/* V74_1_LAYOUT_GATE_PREMIUM */}
        <section className="mt-5 grid items-stretch gap-4 xl:grid-cols-2">
          <article className="flex h-full min-h-[220px] flex-col rounded-[26px] border border-emerald-100 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-emerald-50 text-emerald-700">
                <BadgeCheck size={23} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#b28735]">Próximo passo</p>
                <h2 className="mt-1 break-words text-[21px] font-extrabold leading-tight tracking-[-0.03em] text-slate-950">
                  {aprovadas === 4
                    ? homologacaoConcluida
                      ? "Homologação operacional concluída"
                      : "Homologação operacional final"
                    : "Resolver as pendências antes de homologar"}
                </h2>
                <p className="mt-3 break-words text-[13px] leading-6 text-slate-500">
                  {aprovadas === 4
                    ? homologacaoConcluida
                      ? `Rodada 7/7 concluída por ${homologacaoResponsavel} em ${formatarDataHora(homologacaoConcluidaEm)}. O Gate agora considera a evidência operacional junto das quatro certificações técnicas.`
                      : "Com as quatro frentes aprovadas, valide o fluxo real com usuário-chave: receber carga, executar rota, vender, receber, retornar saldo e conferir o fechamento financeiro."
                    : "Abra as certificações marcadas para revisão, bloqueio ou indisponibilidade. O gate só deve ficar totalmente verde quando os quatro controles estiverem tecnicamente coerentes."}
                </p>
                {/* V75_HOMOLOGACAO_OPERACIONAL_LINK */}
                {aprovadas === 4 ? (
                  <Link
                    href="/admin/qualidade/homologacao"
                    className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-[15px] bg-[#137a3d] px-5 py-3 text-center text-[12px] font-extrabold text-white transition hover:bg-[#0f6934]"
                  >
                    {homologacaoConcluida
                      ? "Revisar homologação concluída"
                      : "Iniciar homologação operacional"}
                  </Link>
                ) : null}
              </div>
            </div>
          </article>

          <article className="flex h-full min-h-[220px] flex-col rounded-[26px] border border-slate-200 bg-slate-50 p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white text-slate-700 shadow-sm">
                <ShieldCheck size={23} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Proteção do processo</p>
                <h2 className="mt-1 break-words text-[21px] font-extrabold leading-tight tracking-[-0.03em] text-slate-950">
                  Este gate não altera estoque, crédito, financeiro ou permissões.
                </h2>
                <p className="mt-3 break-words text-[13px] leading-6 text-slate-500">
                  Ele apenas consolida leituras reais para apoiar a decisão. Correções continuam acontecendo nos módulos responsáveis, preservando rastreabilidade.
                </p>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
