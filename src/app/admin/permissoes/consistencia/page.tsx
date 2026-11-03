export const instant = false;

import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  UsersRound,
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
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

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

type Severidade = "CRITICO" | "ATENCAO" | "INFO";

type Achado = {
  severidade: Severidade;
  titulo: string;
  descricao: string;
  quantidade: number;
};

function relacaoUnica<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) {
    return valor[0] ?? null;
  }
  return valor ?? null;
}

function rotuloSeveridade(valor: Severidade) {
  if (valor === "CRITICO") return "Crítico";
  if (valor === "ATENCAO") return "Atenção";
  return "Informativo";
}

function classesSeveridade(valor: Severidade) {
  if (valor === "CRITICO") {
    return {
      borda: "border-red-200",
      fundo: "bg-red-50/70",
      badge: "bg-red-100 text-red-700",
      icone: "bg-red-100 text-red-700",
    };
  }

  if (valor === "ATENCAO") {
    return {
      borda: "border-amber-200",
      fundo: "bg-amber-50/70",
      badge: "bg-amber-100 text-amber-800",
      icone: "bg-amber-100 text-amber-700",
    };
  }

  return {
    borda: "border-slate-200",
    fundo: "bg-slate-50/80",
    badge: "bg-slate-100 text-slate-700",
    icone: "bg-slate-100 text-slate-600",
  };
}

export default async function ConsistenciaPermissoesPage() {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const podeAuditar =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo === "ADMINISTRADOR" ||
    usuario.perfilCodigo === "GESTOR" ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.PERMISSOES_GERENCIAR,
    );

  if (!podeAuditar) {
    redirect("/admin");
  }

  const supabase = await createClient();

  const [
    perfisResult,
    permissoesResult,
    perfilPermissoesResult,
    usuarioPermissoesResult,
    membrosResult,
  ] = await Promise.all([
    supabase
      .from("perfis")
      .select("id,codigo,nome,ativo")
      .eq("ativo", true)
      .order("id"),

    supabase
      .from("permissoes")
      .select("id,codigo,nome,modulo,sensivel,ativo")
      .eq("ativo", true)
      .order("modulo")
      .order("nome"),

    supabase
      .from("perfil_permissoes")
      .select("perfil_id,permissao_id,permitido")
      .eq("empresa_id", usuario.empresa.id),

    supabase
      .from("usuario_permissoes")
      .select("usuario_id,permissao_id,permitido,motivo")
      .eq("empresa_id", usuario.empresa.id),

    supabase
      .from("empresa_usuarios")
      .select(`
        usuario_id,
        perfil_id,
        ativo,
        usuarios!inner (
          id,
          nome,
          ativo
        ),
        perfis!inner (
          id,
          codigo,
          nome
        )
      `)
      .eq("empresa_id", usuario.empresa.id),
  ]);

  const erroCarga =
    perfisResult.error ||
    permissoesResult.error ||
    perfilPermissoesResult.error ||
    usuarioPermissoesResult.error ||
    membrosResult.error;

  if (erroCarga) {
    throw new Error(
      "Não foi possível executar a certificação de segurança e permissões.",
    );
  }

  const perfis = perfisResult.data ?? [];
  const permissoes = permissoesResult.data ?? [];
  const perfilPermissoes = perfilPermissoesResult.data ?? [];
  const usuarioPermissoes = usuarioPermissoesResult.data ?? [];

  const perfilEntregador = perfis.find(
    (perfil) => String(perfil.codigo) === "ENTREGADOR",
  );

  if (!perfilEntregador) {
    throw new Error("Perfil Entregador não encontrado para certificação.");
  }

  const permissaoPorId = new Map(
    permissoes.map((permissao) => [
      String(permissao.id),
      {
        codigo: String(permissao.codigo),
        nome: String(permissao.nome),
        modulo: String(permissao.modulo),
        sensivel: Boolean(permissao.sensivel),
      },
    ]),
  );

  const membros = (membrosResult.data ?? [])
    .map((membro) => {
      const pessoa = relacaoUnica(membro.usuarios);
      const perfil = relacaoUnica(membro.perfis);

      if (!pessoa || !perfil) {
        return null;
      }

      return {
        usuarioId: String(membro.usuario_id),
        vinculoAtivo: Boolean(membro.ativo),
        usuarioAtivo: Boolean(pessoa.ativo),
        nome: String(pessoa.nome),
        perfilCodigo: String(perfil.codigo),
        perfilNome: String(perfil.nome),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const entregadoresAtivos = membros.filter(
    (membro) =>
      membro.vinculoAtivo &&
      membro.usuarioAtivo &&
      membro.perfilCodigo === "ENTREGADOR",
  );

  const entregadorIds = new Set(
    entregadoresAtivos.map((membro) => membro.usuarioId),
  );

  const membrosDaEmpresa = new Set(
    membros.map((membro) => membro.usuarioId),
  );

  const baseEntregador = perfilPermissoes.filter(
    (item) =>
      Number(item.perfil_id) === Number(perfilEntregador.id),
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
    return permissao
      ? BLOQUEIOS_ADMINISTRATIVOS.has(permissao.codigo)
      : false;
  });

  const proibidasIndividuais = overridesLiberados(
    BLOQUEIOS_ADMINISTRATIVOS,
  );

  const vinculosAtivosComUsuarioInativo = membros.filter(
    (membro) => membro.vinculoAtivo && !membro.usuarioAtivo,
  );

  const overridesSemVinculo = usuarioPermissoes.filter(
    (item) => !membrosDaEmpresa.has(String(item.usuario_id)),
  );

  const bipagensIndividuais = overridesLiberados(BIPAGENS);
  const conflitoVolume =
    usuario.configuracao.modoControleCarga !== "VOLUME"
      ? [
          baseLiberada("CARGA_BIPAR_VOLUME"),
          baseLiberada("ENTREGA_BIPAR_VOLUME"),
        ].filter(Boolean).length + bipagensIndividuais.length
      : 0;

  const financeiroMobile = new Set(["PAGAMENTO_REGISTRAR"]);
  const conflitoFinanceiro = !usuario.configuracao.permitirPagamentoMobile
    ? (baseLiberada("PAGAMENTO_REGISTRAR") ? 1 : 0) +
      overridesLiberados(financeiroMobile).length
    : 0;

  const ocorrenciaMobile = new Set(["OCORRENCIA_REGISTRAR"]);
  const conflitoOcorrencia = !usuario.configuracao.permitirOcorrenciaMobile
    ? (baseLiberada("OCORRENCIA_REGISTRAR") ? 1 : 0) +
      overridesLiberados(ocorrenciaMobile).length
    : 0;

  const overridesSensiveis = overridesEntregador.filter((item) => {
    const permissao = permissaoPorId.get(String(item.permissao_id));
    return Boolean(item.permitido) && Boolean(permissao?.sensivel);
  });

  const catalogoSemConfiguracao = permissoes.filter((permissao) =>
    !baseEntregador.some(
      (item) => String(item.permissao_id) === String(permissao.id),
    ),
  );

  const achados: Achado[] = [];

  if (proibidasNoPerfil.length > 0) {
    achados.push({
      severidade: "CRITICO",
      titulo: "Perfil do Entregador possui acesso administrativo indevido",
      descricao:
        "Existem permissões administrativas ou financeiras de retaguarda liberadas diretamente no perfil padrão do Entregador.",
      quantidade: proibidasNoPerfil.length,
    });
  }

  if (proibidasIndividuais.length > 0) {
    achados.push({
      severidade: "CRITICO",
      titulo: "Exceção individual ultrapassa o limite do Entregador",
      descricao:
        "Uma ou mais exceções individuais concedem acessos que devem permanecer reservados à gestão administrativa.",
      quantidade: proibidasIndividuais.length,
    });
  }

  if (vinculosAtivosComUsuarioInativo.length > 0) {
    achados.push({
      severidade: "CRITICO",
      titulo: "Vínculo ativo para usuário inativo",
      descricao:
        "Há vínculo operacional ativo na empresa apontando para usuário que está inativo no cadastro principal.",
      quantidade: vinculosAtivosComUsuarioInativo.length,
    });
  }

  if (conflitoVolume > 0) {
    achados.push({
      severidade: "ATENCAO",
      titulo: "Bipagem incompatível com o modo da empresa",
      descricao:
        "A empresa opera sem controle individual por volume, mas ainda existem liberações de bipagem configuradas para Entregadores.",
      quantidade: conflitoVolume,
    });
  }

  if (conflitoFinanceiro > 0) {
    achados.push({
      severidade: "ATENCAO",
      titulo: "Recebimento mobile desativado com permissão ainda configurada",
      descricao:
        "A configuração da empresa bloqueia recebimentos no mobile, porém o perfil ou uma exceção individual ainda mantém a função marcada como liberada.",
      quantidade: conflitoFinanceiro,
    });
  }

  if (conflitoOcorrencia > 0) {
    achados.push({
      severidade: "ATENCAO",
      titulo: "Ocorrência mobile desativada com permissão ainda configurada",
      descricao:
        "A configuração da empresa bloqueia ocorrências no mobile, porém o perfil ou uma exceção individual ainda mantém a função marcada como liberada.",
      quantidade: conflitoOcorrencia,
    });
  }

  if (overridesSemVinculo.length > 0) {
    achados.push({
      severidade: "ATENCAO",
      titulo: "Exceção individual sem vínculo atual com a empresa",
      descricao:
        "Existem exceções preservadas para usuários que não possuem vínculo atual nesta empresa. O registro continua auditável, mas merece revisão.",
      quantidade: overridesSemVinculo.length,
    });
  }

  if (catalogoSemConfiguracao.length > 0) {
    achados.push({
      severidade: "INFO",
      titulo: "Permissões novas ainda não configuradas no perfil do Entregador",
      descricao:
        "Itens sem configuração explícita permanecem bloqueados por padrão. A certificação apenas sinaliza para revisão consciente da matriz.",
      quantidade: catalogoSemConfiguracao.length,
    });
  }

  const criticos = achados
    .filter((item) => item.severidade === "CRITICO")
    .reduce((total, item) => total + item.quantidade, 0);

  const atencoes = achados
    .filter((item) => item.severidade === "ATENCAO")
    .reduce((total, item) => total + item.quantidade, 0);

  const informativos = achados
    .filter((item) => item.severidade === "INFO")
    .reduce((total, item) => total + item.quantidade, 0);

  const aprovado = criticos === 0 && atencoes === 0;

  const executadoEm = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const regras = [
    {
      icon: ShieldCheck,
      titulo: "Limites do perfil Entregador",
      descricao:
        "Acessos de empresa, usuários, permissões e auditoria financeira permanecem fora do perfil operacional.",
    },
    {
      icon: SlidersHorizontal,
      titulo: "Configuração da empresa prevalece",
      descricao:
        "Modo de carga, recebimento mobile e ocorrências limitam o que pode ser efetivamente utilizado no campo.",
    },
    {
      icon: UserCheck,
      titulo: "Exceções individuais controladas",
      descricao:
        "Liberações por usuário são cruzadas com o perfil e não podem ultrapassar os bloqueios administrativos.",
    },
    {
      icon: UsersRound,
      titulo: "Vínculos operacionais coerentes",
      descricao:
        "Usuário e vínculo precisam estar ativos para participar da operação desta empresa.",
    },
    {
      icon: KeyRound,
      titulo: "Permissões sensíveis rastreadas",
      descricao:
        "A certificação destaca concessões sensíveis e preserva a matriz como fonte única de governança.",
    },
  ];

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto w-full">
        <ModuleHeader
          eyebrow="Segurança operacional"
          title="Certificação de permissões"
          backHref="/admin/permissoes"
          actions={
            <>
              {/* V73_CENTRAL_CERTIFICACOES */}
              <HeaderLink href="/admin/qualidade">
                Central de certificações
              </HeaderLink>
              <HeaderLink href="/admin/permissoes">
                Matriz de permissões
              </HeaderLink>
              <HeaderLink
                href="/admin/permissoes/consistencia"
                variant="primary"
              >
                Executar novamente
              </HeaderLink>
            </>
          }
        />

        <Hero
          eyebrow="Certificação automática"
          title={
            aprovado
              ? "Governança de acessos aprovada"
              : "Revisão de acessos necessária"
          }
          description={
            aprovado
              ? "A matriz do Entregador, as exceções individuais e as regras da empresa estão coerentes. O diagnóstico é somente leitura e não altera permissões."
              : "A certificação encontrou pontos que devem ser revisados antes de considerar a governança de acessos plenamente aprovada."
          }
          badge={
            <div className="rounded-[18px] border border-white/15 bg-white/[0.08] px-4 py-3 text-right">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/60">
                Executado em
              </p>
              <p className="mt-1 text-[14px] font-extrabold text-white">
                {executadoEm}
              </p>
            </div>
          }
        >
          <KpiGrid>
            <Kpi label="Críticos" value={criticos} warning={criticos > 0} />
            <Kpi label="Atenções" value={atencoes} warning={atencoes > 0} />
            <Kpi label="Permissões" value={permissoes.length} />
            <Kpi label="Entregadores" value={entregadoresAtivos.length} />
            <Kpi label="Exceções" value={usuarioPermissoes.length} />
            <Kpi label="Informativos" value={informativos} />
          </KpiGrid>
        </Hero>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="min-w-0 rounded-[22px] border border-emerald-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
              Empresa auditada
            </p>
            <p className="mt-2 break-words text-[16px] font-extrabold leading-5 text-[#122018]">
              {usuario.empresa.nomeFantasia}
            </p>
          </div>

          <div className="min-w-0 rounded-[22px] border border-emerald-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
              Perfis ativos
            </p>
            <p className="mt-2 text-[22px] font-extrabold text-[#122018]">
              {perfis.length}
            </p>
          </div>

          <div className="min-w-0 rounded-[22px] border border-emerald-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
              Sensíveis no catálogo
            </p>
            <p className="mt-2 text-[22px] font-extrabold text-[#122018]">
              {permissoes.filter((item) => item.sensivel).length}
            </p>
          </div>

          <div className="min-w-0 rounded-[22px] border border-emerald-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
              Exceções sensíveis
            </p>
            <p className="mt-2 text-[22px] font-extrabold text-[#122018]">
              {overridesSensiveis.length}
            </p>
          </div>

          <div className="min-w-0 rounded-[22px] border border-emerald-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
              Modo de carga
            </p>
            <p className="mt-2 break-words text-[16px] font-extrabold text-[#122018]">
              {usuario.configuracao.modoControleCarga === "VOLUME"
                ? "Controle por volume"
                : "Controle por quantidade"}
            </p>
          </div>
        </section>

        <section className="mt-5">
          <div className="mb-4 px-1">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#b28735]">
              Regras auditadas
            </p>
            <h2 className="mt-1 text-[26px] font-extrabold tracking-[-0.04em] text-[#0f1d13]">
              O que o sistema comprova automaticamente
            </h2>
            <p className="mt-2 max-w-[820px] text-[14px] leading-6 text-slate-500">
              A análise cruza somente os dados da empresa ativa e não concede, revoga ou altera acessos.
            </p>
          </div>

          <div className="grid auto-rows-fr gap-3 md:grid-cols-2 xl:grid-cols-5">
            {regras.map((regra) => {
              const Icone = regra.icon;
              return (
                <article
                  key={regra.titulo}
                  className="min-w-0 overflow-hidden rounded-[22px] border border-emerald-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700">
                    <Icone size={20} />
                  </div>
                  <h3 className="mt-4 break-words text-[16px] font-extrabold leading-5 text-[#132018]">
                    {regra.titulo}
                  </h3>
                  <p className="mt-2 break-words text-[13px] leading-5 text-slate-500">
                    {regra.descricao}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-5 rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-[820px]">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#b28735]">
                Resultado
              </p>
              <h2 className="mt-1 text-[26px] font-extrabold tracking-[-0.04em] text-[#0f1d13]">
                Achados de consistência
              </h2>
              <p className="mt-2 text-[14px] leading-6 text-slate-500">
                Críticos reprovam a certificação. Atenções pedem revisão. Informativos não bloqueiam a aprovação.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-red-50 px-3 py-2 text-[12px] font-extrabold text-red-700">
                {criticos} crítico(s)
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-2 text-[12px] font-extrabold text-amber-800">
                {atencoes} atenção(ões)
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-2 text-[12px] font-extrabold text-slate-700">
                {informativos} informativo(s)
              </span>
            </div>
          </div>

          {achados.length === 0 ? (
            <div className="mt-5 flex min-w-0 items-start gap-4 rounded-[22px] border border-emerald-200 bg-emerald-50/70 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-emerald-100 text-emerald-700">
                <BadgeCheck size={24} />
              </div>
              <div className="min-w-0">
                <h3 className="break-words text-[17px] font-extrabold text-emerald-900">
                  Nenhuma inconsistência encontrada
                </h3>
                <p className="mt-1 break-words text-[13px] leading-5 text-emerald-700/80">
                  A matriz de segurança está coerente com as regras operacionais vigentes desta empresa.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {achados.map((achado) => {
                const visual = classesSeveridade(achado.severidade);
                return (
                  <article
                    key={`${achado.severidade}-${achado.titulo}`}
                    className={`min-w-0 overflow-hidden rounded-[22px] border p-5 ${visual.borda} ${visual.fundo}`}
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${visual.icone}`}>
                        {achado.severidade === "CRITICO" ? (
                          <LockKeyhole size={20} />
                        ) : achado.severidade === "ATENCAO" ? (
                          <AlertTriangle size={20} />
                        ) : (
                          <ShieldCheck size={20} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${visual.badge}`}>
                            {rotuloSeveridade(achado.severidade)}
                          </span>
                          <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-extrabold text-slate-600">
                            {achado.quantidade} ocorrência(s)
                          </span>
                        </div>

                        <h3 className="mt-3 break-words text-[17px] font-extrabold leading-5 text-[#142018]">
                          {achado.titulo}
                        </h3>
                        <p className="mt-2 break-words text-[13px] leading-5 text-slate-600">
                          {achado.descricao}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-emerald-100 bg-emerald-50/70 px-5 py-4 text-[13px] text-emerald-800">
          <div className="flex min-w-0 items-center gap-3">
            <ShieldCheck className="shrink-0" size={19} />
            <p className="min-w-0 break-words">
              Diagnóstico somente leitura. Nenhuma permissão, perfil, usuário ou configuração é alterada por esta tela.
            </p>
          </div>
          <Link
            href="/admin/permissoes"
            className="shrink-0 font-extrabold text-emerald-800 underline decoration-emerald-300 underline-offset-4"
          >
            Revisar matriz
          </Link>
        </div>
      </div>
    </main>
  );
}
