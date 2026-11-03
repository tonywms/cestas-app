"use client";

import Link from "next/link";
import {
  BadgeCheck,
  Boxes,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  PackageCheck,
  RefreshCcw,
  Route,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  registrarHomologacaoConcluida,
  registrarHomologacaoReiniciada,
} from "./actions";

/* V75_HOMOLOGACAO_OPERACIONAL_CLIENT */
/* V75_8_HOMOLOGACAO_PERSISTENTE */

type Props = {
  empresaId: string;
  usuarioNome: string;
};

type Etapa = {
  id: string;
  ordem: number;
  titulo: string;
  frente: string;
  descricao: string;
  criterio: string;
  href: string;
  acao: string;
  icon: typeof Boxes;
};

type EstadoSalvo = {
  marcadas: string[];
  finalizada: boolean;
  atualizadoEm: string | null;
};

const ETAPAS: Etapa[] = [
  {
    id: "receber-carga",
    ordem: 1,
    titulo: "Receber carga e conferir volumes",
    frente: "Estoque móvel",
    descricao:
      "Atribua uma carga ao entregador, receba no mobile e confirme fisicamente todos os volumes quando a empresa operar em modo volume.",
    criterio:
      "A carga aparece para o entregador, a conferência fecha 100% e o saldo móvel corresponde ao que foi carregado.",
    href: "/admin/cargas/nova",
    acao: "Abrir gestão de cargas",
    icon: Boxes,
  },
  {
    id: "executar-rota",
    ordem: 2,
    titulo: "Executar rota e atendimento",
    frente: "Jornada operacional",
    descricao:
      "Inicie ou abra a rota do entregador, confirme a sequência dos atendimentos e processe pelo menos uma parada real de teste.",
    criterio:
      "A rota mostra progresso coerente, pendências corretas e não permite encerramento enquanto houver ação obrigatória.",
    href: "/mobile/rota",
    acao: "Abrir Minha Rota",
    icon: Route,
  },
  {
    id: "venda-entrega",
    ordem: 3,
    titulo: "Registrar venda e entrega física",
    frente: "Comercial e entrega",
    descricao:
      "Faça uma venda de teste, valide a forma de pagamento e conclua a entrega física com a bipagem exigida pelo fornecedor.",
    criterio:
      "Venda, entrega, volume e baixa da carga acontecem uma única vez, sem duplicidade e com os valores esperados.",
    href: "/mobile/rota",
    acao: "Abrir atendimento da rota",
    icon: PackageCheck,
  },
  {
    id: "cobranca-recebimento",
    ordem: 4,
    titulo: "Validar cobrança e recebimento",
    frente: "Carteira do cliente",
    descricao:
      "Registre um recebimento real de homologação e confira a aplicação automática nas cobranças mais antigas do cliente.",
    criterio:
      "O saldo reduz exatamente pelo valor recebido, a distribuição financeira fecha e nenhuma cobrança é duplicada.",
    href: "/mobile/recebimentos",
    acao: "Abrir recebimentos",
    icon: CreditCard,
  },
  {
    id: "retorno-avaria",
    ordem: 5,
    titulo: "Finalizar rota, retorno e avaria",
    frente: "Fechamento da carga",
    descricao:
      "Finalize a rota e feche a carga classificando corretamente o que retornou ao central e o que permaneceu como avaria.",
    criterio:
      "Retornos voltam ao saldo central, avarias ficam registradas sem retornar ao disponível e o fechamento exige confirmação.",
    href: "/mobile/carga",
    acao: "Abrir Minha Carga",
    icon: RefreshCcw,
  },
  {
    id: "fechamento-financeiro",
    ordem: 6,
    titulo: "Conferir prestação de contas",
    frente: "Financeiro operacional",
    descricao:
      "Abra o fechamento diário, compare o esperado com o conferido e valide a proteção contra sobrescrita após a conferência.",
    criterio:
      "O fechamento fica protegido, diferenças são explícitas e qualquer reabertura exige motivo e confirmação.",
    href: "/admin/financeiro/fechamento",
    acao: "Abrir fechamento diário",
    icon: WalletCards,
  },
  {
    id: "acessos-permissoes",
    ordem: 7,
    titulo: "Validar acessos do perfil Entregador",
    frente: "Segurança e permissões",
    descricao:
      "Revise o perfil padrão, exceções individuais e bloqueios superiores antes de liberar o usuário-chave para produção.",
    criterio:
      "O entregador executa somente as funções autorizadas e não acessa rotinas administrativas ou sensíveis bloqueadas.",
    href: "/admin/permissoes",
    acao: "Abrir matriz de acessos",
    icon: ShieldCheck,
  },
];

function formatarDataHora(valor: string | null) {
  if (!valor) return "Ainda não atualizado";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Ainda não atualizado";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

export default function HomologacaoOperacionalClient({
  empresaId,
  usuarioNome,
}: Props) {
  const storageKey = `cestas-app:homologacao-operacional:${empresaId}`;
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [finalizada, setFinalizada] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [modal, setModal] = useState<"FINALIZAR" | "REINICIAR" | null>(null);
  const [persistenciaErro, setPersistenciaErro] = useState<string | null>(null);
  const sincronizacaoConclusaoRef = useRef(false);

  useEffect(() => {
    try {
      const bruto = window.localStorage.getItem(storageKey);
      if (bruto) {
        const salvo = JSON.parse(bruto) as Partial<EstadoSalvo>;
        const idsValidos = new Set(ETAPAS.map((etapa) => etapa.id));
        const validas = Array.isArray(salvo.marcadas)
          ? salvo.marcadas.filter((id): id is string => typeof id === "string" && idsValidos.has(id))
          : [];
        setMarcadas(Array.from(new Set(validas)));
        setFinalizada(Boolean(salvo.finalizada) && validas.length === ETAPAS.length);
        setAtualizadoEm(typeof salvo.atualizadoEm === "string" ? salvo.atualizadoEm : null);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setCarregado(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!carregado) return;

    const estado: EstadoSalvo = {
      marcadas,
      finalizada,
      atualizadoEm,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(estado));
  }, [atualizadoEm, carregado, finalizada, marcadas, storageKey]);

  async function persistirConclusao(concluidaEm: string, origem: string) {
    const resultado = await registrarHomologacaoConcluida({
      marcadas,
      concluidaEm,
      origem,
    });

    if (!resultado.success) {
      setPersistenciaErro(resultado.message);
      return false;
    }

    setPersistenciaErro(null);
    return true;
  }

  useEffect(() => {
    if (
      !carregado ||
      !finalizada ||
      marcadas.length !== ETAPAS.length ||
      sincronizacaoConclusaoRef.current
    ) {
      return;
    }

    sincronizacaoConclusaoRef.current = true;
    const concluidaEm = atualizadoEm ?? new Date().toISOString();

    void persistirConclusao(concluidaEm, "SINCRONIZACAO_LOCAL_V75_8").catch(() => {
      setPersistenciaErro(
        "A homologação continua concluída neste navegador, mas a auditoria central não pôde ser sincronizada agora.",
      );
    });
  }, [atualizadoEm, carregado, finalizada, marcadas]);

  const total = ETAPAS.length;
  const concluidas = marcadas.length;
  const restantes = Math.max(0, total - concluidas);
  const percentual = Math.round((concluidas / total) * 100);
  const tudoValidado = concluidas === total;

  const marcadasSet = useMemo(() => new Set(marcadas), [marcadas]);

  function alternarEtapa(id: string) {
    const agora = new Date().toISOString();
    setAtualizadoEm(agora);
    setFinalizada(false);
    setMarcadas((atuais) =>
      atuais.includes(id)
        ? atuais.filter((item) => item !== id)
        : [...atuais, id],
    );
  }

  function confirmarFinalizacao() {
    if (!tudoValidado) return;

    const agora = new Date().toISOString();
    sincronizacaoConclusaoRef.current = true;
    setFinalizada(true);
    setAtualizadoEm(agora);
    setModal(null);
    setPersistenciaErro(null);

    void persistirConclusao(agora, "CONFIRMACAO_MANUAL_V75_8").catch(() => {
      setPersistenciaErro(
        "A rodada foi concluída, mas não foi possível registrar a auditoria central. Atualize a tela para tentar sincronizar novamente.",
      );
    });
  }

  function confirmarReinicio() {
    const agora = new Date().toISOString();
    sincronizacaoConclusaoRef.current = false;
    setMarcadas([]);
    setFinalizada(false);
    setAtualizadoEm(agora);
    setModal(null);
    setPersistenciaErro(null);

    void registrarHomologacaoReiniciada({
      reiniciadaEm: agora,
      origem: "CONFIRMACAO_MANUAL_V75_8",
    }).then((resultado) => {
      if (!resultado.success) setPersistenciaErro(resultado.message);
    }).catch(() => {
      setPersistenciaErro(
        "A rodada foi reiniciada neste navegador, mas o reinício não pôde ser registrado na auditoria central.",
      );
    });
  }

  return (
    <>
      <section className="mt-5 overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-sm">
        <div className="grid gap-4 border-b border-emerald-100 bg-[#fbfdfb] p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#b28735]">
              Progresso da homologação
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
              <h2 className="text-[26px] font-extrabold tracking-[-0.04em] text-slate-950">
                {finalizada ? "Rodada homologada" : `${concluidas} de ${total} etapas validadas`}
              </h2>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-extrabold text-emerald-800">
                {percentual}%
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-5 text-slate-500">
              Responsável: <strong className="font-extrabold text-slate-700">{usuarioNome}</strong>
              <span className="mx-2 text-slate-300">•</span>
              Última atualização: {formatarDataHora(atualizadoEm)}
            </p>
          </div>

          <div className="flex min-w-[210px] items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setModal("REINICIAR")}
              disabled={concluidas === 0 && !finalizada}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-white px-4 text-[12px] font-extrabold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCcw size={15} />
              Reiniciar rodada
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 pt-4 md:px-6 md:pb-6">
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#137a3d] transition-[width] duration-300"
              style={{ width: `${percentual}%` }}
            />
          </div>

          <div className="mt-5 grid auto-rows-fr gap-4 xl:grid-cols-2">
            {ETAPAS.map((etapa) => {
              const concluida = marcadasSet.has(etapa.id);
              const Icone = etapa.icon;

              return (
                <article
                  key={etapa.id}
                  className={`flex h-full min-w-0 flex-col overflow-hidden rounded-[24px] border p-5 transition ${
                    concluida
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] ${
                          concluida
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Icone size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#b28735]">
                          {etapa.ordem}. {etapa.frente}
                        </p>
                        <h3 className="mt-1 break-words text-[18px] font-extrabold leading-6 text-slate-950">
                          {etapa.titulo}
                        </h3>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] ${
                        concluida
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {concluida ? "Validado" : "Pendente"}
                    </span>
                  </div>

                  <p className="mt-4 break-words text-[13px] leading-6 text-slate-500">
                    {etapa.descricao}
                  </p>

                  <div className="mt-4 flex-1 rounded-[18px] border border-slate-100 bg-[#f7f9f7] p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                      Critério de sucesso
                    </p>
                    <p className="mt-2 break-words text-[13px] font-semibold leading-5 text-slate-700">
                      {etapa.criterio}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Link
                      href={etapa.href}
                      className="inline-flex min-h-[46px] items-center justify-center rounded-[14px] border border-emerald-200 bg-white px-4 text-center text-[12px] font-extrabold text-emerald-800 transition hover:bg-emerald-50"
                    >
                      {etapa.acao}
                    </Link>

                    <button
                      type="button"
                      onClick={() => alternarEtapa(etapa.id)}
                      className={`inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[14px] px-4 text-center text-[12px] font-extrabold transition ${
                        concluida
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-[#137a3d] text-white hover:bg-[#0f6934]"
                      }`}
                    >
                      {concluida ? <CheckCircle2 size={16} /> : <BadgeCheck size={16} />}
                      {concluida ? "Etapa validada" : "Marcar como validada"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className={`mt-5 rounded-[28px] border p-5 shadow-sm md:p-6 ${
          finalizada
            ? "border-emerald-200 bg-emerald-50/70"
            : tudoValidado
              ? "border-emerald-200 bg-white"
              : "border-amber-200 bg-amber-50/55"
        }`}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] ${
                finalizada || tudoValidado
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {finalizada || tudoValidado ? (
                <CheckCircle2 size={23} />
              ) : (
                <CircleAlert size={23} />
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#b28735]">
                Decisão da rodada
              </p>
              <h2 className="mt-1 break-words text-[22px] font-extrabold tracking-[-0.03em] text-slate-950">
                {finalizada
                  ? "Homologação operacional concluída nesta rodada"
                  : tudoValidado
                    ? "As sete etapas foram validadas"
                    : `${restantes} etapa${restantes === 1 ? "" : "s"} ainda precisa${restantes === 1 ? "" : "m"} de validação`}
              </h2>
              <p className="mt-2 max-w-[820px] break-words text-[13px] leading-6 text-slate-500">
                {finalizada
                  ? "O roteiro foi concluído pelo responsável desta sessão. Mantenha as quatro certificações automáticas aprovadas antes da decisão definitiva de produção."
                  : tudoValidado
                    ? "Revise o conjunto uma última vez e confirme a conclusão desta rodada de homologação operacional."
                    : "Não conclua a homologação enquanto existir etapa pendente. Abra o módulo correspondente, execute o teste e valide apenas depois de confirmar o resultado."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModal("FINALIZAR")}
            disabled={!tudoValidado || finalizada}
            className="inline-flex min-h-[50px] shrink-0 items-center justify-center gap-2 rounded-[16px] bg-[#137a3d] px-6 text-[13px] font-extrabold text-white transition hover:bg-[#0f6934] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            <BadgeCheck size={17} />
            {finalizada ? "Rodada concluída" : "Concluir homologação"}
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4 text-[12px] leading-5 text-slate-500">
        <p>
          O progresso continua protegido neste navegador para evitar perda acidental. A conclusão e o reinício da rodada também são registrados na auditoria central da empresa para que o Gate de liberação reconheça o resultado em qualquer sessão administrativa.
        </p>
        {persistenciaErro ? (
          <p className="mt-2 font-extrabold text-amber-700">
            {persistenciaErro}
          </p>
        ) : null}
      </section>

      {modal ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0b2417]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[520px] overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="border-b border-slate-100 p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] ${
                    modal === "FINALIZAR"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {modal === "FINALIZAR" ? (
                    <BadgeCheck size={23} />
                  ) : (
                    <RefreshCcw size={22} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#b28735]">
                    Confirmação da homologação
                  </p>
                  <h3 className="mt-1 break-words text-[23px] font-extrabold tracking-[-0.04em] text-slate-950">
                    {modal === "FINALIZAR"
                      ? "Concluir esta rodada?"
                      : "Reiniciar esta rodada?"}
                  </h3>
                  <p className="mt-2 text-[13px] leading-6 text-slate-500">
                    {modal === "FINALIZAR"
                      ? "Confirme somente se as sete etapas foram realmente executadas e validadas no fluxo operacional."
                      : "As marcações atuais serão removidas deste navegador e a homologação voltará para 0%."}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {modal === "FINALIZAR" ? (
                <div className="rounded-[18px] border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-emerald-700">
                    Resumo da rodada
                  </p>
                  <p className="mt-2 text-[14px] font-extrabold text-emerald-950">
                    7 de 7 etapas validadas
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-emerald-800/70">
                    Responsável: {usuarioNome}
                  </p>
                </div>
              ) : (
                <div className="rounded-[18px] border border-amber-100 bg-amber-50 p-4 text-[13px] leading-5 text-amber-800">
                  Esta ação não altera nenhuma operação do sistema. Ela limpa somente o progresso manual desta rodada no navegador atual.
                </div>
              )}

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="min-h-[48px] rounded-[14px] border border-slate-200 bg-white px-4 text-[13px] font-extrabold text-slate-600 transition hover:bg-slate-50"
                >
                  Voltar e revisar
                </button>
                <button
                  type="button"
                  onClick={modal === "FINALIZAR" ? confirmarFinalizacao : confirmarReinicio}
                  className={`min-h-[48px] rounded-[14px] px-4 text-[13px] font-extrabold text-white transition ${
                    modal === "FINALIZAR"
                      ? "bg-[#137a3d] hover:bg-[#0f6934]"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {modal === "FINALIZAR"
                    ? "Confirmar conclusão"
                    : "Confirmar reinício"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
