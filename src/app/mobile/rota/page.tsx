import { rotuloTecnico } from "@/lib/ui/rotulo-tecnico";

export const instant = false;

import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  MapPin,
  MapPinned,
  Navigation,
  Plus,
  Route,
  Sparkles,
  Square,
  WalletCards,
} from "lucide-react";

import Link from "next/link";
import { redirect } from "next/navigation";


import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";

import {
  requirePermission,
} from "@/lib/auth/require-permission";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  encerrarMinhaRota,
  iniciarMinhaRota,
} from "./actions";

import ItinerarioRota, {
  type ItinerarioRotaItem,
} from "./ItinerarioRota";

/* =========================================================
   FORMATAR DATA
========================================================= */

function formatarData(
  data: string,
) {
  const [ano, mes, dia] =
    data.split("-");

  if (!ano || !mes || !dia) {
    return data;
  }

  return `${dia}/${mes}/${ano}`;
}

/* =========================================================
   RÓTULOS BONITOS PARA OS STATUS
========================================================= */

function rotuloStatus(
  status: string,
) {
  const mapa: Record<
    string,
    string
  > = {
    PLANEJADA: "Planejada",
    EM_ROTA: "Em rota",
    FINALIZADA: "Finalizada",
    PENDENTE: "Pendente",
    EM_ATENDIMENTO: "Em atendimento",
    ENTREGUE: "Entregue",
    AUSENTE: "Cliente ausente",
    RECUSADO: "Recusado",
    CANCELADO: "Cancelado",
  };

  return mapa[status] ?? rotuloTecnico(status);
}

/* =========================================================
   PÁGINA
========================================================= */

type Props = {
  searchParams:
    Promise<{
      erro?: string;
      ok?: string;
    }>;
};

export default async function MinhaRotaPage({
  searchParams,
}: Props) {
  /* PERMISSÃO */

  const usuario =
    await requirePermission(
      PERMISSOES.ROTA_VISUALIZAR,
    );

  const params =
    await searchParams;

  const mensagemErro =
    params.erro?.trim() ||
    null;

  const mensagemOk =
    params.ok?.trim() ||
    null;

  const podeGerenciarRotaPropria =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ROTA_MOBILE_GERENCIAR_PROPRIA,
    );

  const podeRegistrarPagamento =
    usuario.configuracao.permitirPagamentoMobile &&
    (
      usuario.isPlatformAdmin ||
      temPermissao(
        usuario.permissoes,
        PERMISSOES.PAGAMENTO_REGISTRAR,
      )
    );

  const supabase =
    await createClient();

  // V106.1: a rota pertence ao entregador. Nao ha selecao, conferencia
  // nem finalizacao de carga para consultar o itinerario.
  const { data: rota, error: rotaError } = await supabase
    .from("rotas")
    .select("id,codigo,data_rota,status,observacao,origem,carga_id")
    .eq("empresa_id", usuario.empresa.id)
    .eq("entregador_id", usuario.id)
    .in("status", ["PLANEJADA", "EM_ROTA"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (rotaError) console.error("V106.1: erro ao consultar rota do entregador:", rotaError.message);

  const rotaPlanejada = rota?.status === "PLANEJADA";
  const rotaEmOperacao = rota?.status === "EM_ROTA";

  if (!rota) {
    return (
      <main className="app-premium min-h-dvh text-[#142018]">
        <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f7faf7]/90 shadow-[0_0_70px_rgba(17,63,33,0.14)]">
          <header className="hero-premium grain px-5 pb-8 pt-5 text-white">
            <div className="flex items-center justify-between">
              <Link href="/mobile" aria-label="Voltar" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                <ArrowLeft size={19}/>
              </Link>
              <h1 className="text-[17px] font-black">Minha Rota</h1>
              <Route size={21}/>
            </div>
            <p className="mt-5 text-[12px] text-white/80">Seus atendimentos e itinerário, sem vínculo obrigatório com nenhuma carga.</p>
          </header>
          <section className="p-5">
            {mensagemErro && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-[11px] font-semibold text-red-800">{mensagemErro}</p>}
            {rotaError ? (
              <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[12px] text-red-800">
                Não foi possível consultar suas rotas. Atualize a página para tentar novamente.
              </p>
            ) : (
              <div className="rounded-[26px] bg-white p-6 text-center shadow-sm">
                <MapPinned size={30} className="mx-auto text-emerald-700"/>
                <h2 className="mt-4 text-xl font-black">Nenhuma rota em andamento</h2>
                <p className="mt-3 text-[12px] leading-6 text-slate-600">
                  Você pode atender clientes e vender usando o estoque móvel sem criar uma rota.
                  As cargas recebidas não determinam o itinerário.
                </p>
                <Link href="/mobile/estoque" className="mt-5 flex min-h-[50px] items-center justify-center rounded-2xl bg-emerald-800 px-4 text-[12px] font-black text-white">
                  Ver meu estoque e vender
                </Link>
                <Link href="/mobile/clientes" className="mt-2 flex min-h-[48px] items-center justify-center rounded-2xl border border-emerald-200 text-[12px] font-bold text-emerald-800">
                  Consultar clientes
                </Link>
                {podeGerenciarRotaPropria && (
                  <form action={iniciarMinhaRota} className="mt-3">
                    <button type="submit" className="flex min-h-[50px] w-full items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-50 px-4 text-[12px] font-black text-emerald-900">
                      Iniciar nova rota sem carga
                    </button>
                  </form>
                )}
                <p className="mt-4 text-[10px] leading-5 text-slate-500">
                  O itinerário pertence ao entregador. Criar uma rota não altera seu estoque
                  nem vincula uma carga de recebimento.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  /* ITENS DA ROTA */

  const {
    data: itens,
    error: itensError,
  } = await supabase
    .from("rota_clientes")
    .select(`
      id,
      cliente_id,
      sequencia,
      status,
      observacao,
      atendido_at,
      endereco_logradouro,
      endereco_numero,
      endereco_complemento,
      endereco_bairro,
      endereco_cidade,
      endereco_uf,
      endereco_cep
    `)
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq("rota_id", rota.id)
    .order("sequencia", {
      ascending: true,
    });

  if (itensError) {
    console.error(
      "Erro ao consultar clientes da rota:",
      itensError,
    );
  }

  const listaItens =
    itens ?? [];

  /* CLIENTES */

  const clienteIds =
    listaItens.map(
      (item) => item.cliente_id,
    );

  const {
    data: clientes,
    error: clientesError,
  } =
    clienteIds.length > 0
      ? await supabase
          .from("clientes")
          .select(`
            id,
            codigo,
            nome,
            telefone,
            logradouro,
            numero,
            bairro,
            cidade,
            uf
          `)
          .eq(
            "empresa_id",
            usuario.empresa.id,
          )
          .in("id", clienteIds)
      : {
          data: [],
          error: null,
        };

  if (clientesError) {
    console.error(
      "Erro ao consultar dados dos clientes:",
      clientesError,
    );
  }

  const clientesMap = new Map(
    (clientes ?? []).map(
      (cliente) => [
        cliente.id,
        cliente,
      ],
    ),
  );

  /* VENDA OBRIGATÓRIA DA ROTA MOBILE */

  const rotaClienteIds =
    listaItens.map((item) =>
      Number(item.id),
    );

  const fluxosPendentesResult =
    rota.origem === "MOBILE" &&
    rotaClienteIds.length > 0
      ? await supabase
          .from("venda_fluxos_campo")
          .select(`
            id,
            rota_cliente_id,
            status
          `)
          .eq(
            "empresa_id",
            usuario.empresa.id,
          )
          .eq(
            "entregador_id",
            usuario.id,
          )
          .eq(
            "status",
            "AGUARDANDO_ENTREGA",
          )
          .in(
            "rota_cliente_id",
            rotaClienteIds,
          )
      : {
          data: [],
          error: null,
        };

  if (fluxosPendentesResult.error) {
    console.error(
      "Erro ao consultar operações de venda pendentes:",
      fluxosPendentesResult.error,
    );
  }

  const fluxoPendentePorParada =
    new Map(
      (
        fluxosPendentesResult.data ??
        []
      ).map(
        (item) => [
          Number(
            item.rota_cliente_id,
          ),
          Number(
            item.id,
          ),
        ],
      ),
    );

  const entregasResult =
    rota.origem === "MOBILE" &&
    rotaClienteIds.length > 0
      ? await supabase
          .from("entregas")
          .select(`
            id,
            rota_cliente_id,
            status
          `)
          .eq(
            "empresa_id",
            usuario.empresa.id,
          )
          .eq(
            "entregador_id",
            usuario.id,
          )
          .eq(
            "status",
            "CONCLUIDA",
          )
          .in(
            "rota_cliente_id",
            rotaClienteIds,
          )
      : {
          data: [],
          error: null,
        };

  if (entregasResult.error) {
    console.error(
      "Erro ao consultar entregas da rota mobile:",
      entregasResult.error,
    );
  }

  const entregasRota =
    entregasResult.data ?? [];

  const entregaIds =
    entregasRota.map((item) =>
      Number(item.id),
    );

  const vendasResult =
    entregaIds.length > 0
      ? await supabase
          .from("vendas")
          .select(`
            id,
            entrega_id
          `)
          .eq(
            "empresa_id",
            usuario.empresa.id,
          )
          .in(
            "entrega_id",
            entregaIds,
          )
      : {
          data: [],
          error: null,
        };

  if (vendasResult.error) {
    console.error(
      "Erro ao consultar vendas da rota mobile:",
      vendasResult.error,
    );
  }

  const entregaPorParada = new Map(
    entregasRota
      .filter((item) =>
        item.rota_cliente_id !== null,
      )
      .map((item) => [
        Number(item.rota_cliente_id),
        Number(item.id),
      ]),
  );

  const entregasComVenda = new Set(
    (vendasResult.data ?? []).map(
      (item) =>
        Number(item.entrega_id),
    ),
  );

  const vendaPendenteParadaIds =
    new Set(
      listaItens
        .filter((item) => {
          if (
            rota.origem !== "MOBILE" ||
            item.status !== "ENTREGUE"
          ) {
            return false;
          }

          const entregaId =
            entregaPorParada.get(
              Number(item.id),
            );

          return (
            !!entregaId &&
            !entregasComVenda.has(
              entregaId,
            )
          );
        })
        .map((item) =>
          Number(item.id),
        ),
    );

  const rotaMobile =
    rota.origem ===
    "MOBILE";

  /* =========================================================
     V49 - CHECKLIST DE ENCERRAMENTO
     ---------------------------------------------------------
     Consolida as pendências em uma lista operacional curta.
     A ordem é intencional: operação já iniciada vem antes de
     uma nova ação, evitando o entregador abandonar fluxo pela metade.
  ========================================================= */

  type PendenciaEncerramento = {
    id: string;
    cliente: string;
    detalhe: string;
    acao: string;
    href: string;
    tipo:
      | "ENTREGA"
      | "FINANCEIRO"
      | "COBRANCA"
      | "ATENDIMENTO";
  };

  const pendenciasEncerramento:
    PendenciaEncerramento[] =
    listaItens.flatMap<PendenciaEncerramento>(
      (item):
        PendenciaEncerramento[] => {
        const cliente =
          clientesMap.get(
            item.cliente_id,
          );

        if (!cliente) {
          return [];
        }

        const paradaId =
          Number(item.id);

        const fluxoPendenteId =
          fluxoPendentePorParada.get(
            paradaId,
          ) ?? null;

        const entregaId =
          entregaPorParada.get(
            paradaId,
          ) ?? null;

        const vendaPendente =
          vendaPendenteParadaIds.has(
            paradaId,
          );

        const cobrancaRota =
          String(
            item.observacao ??
              "",
          ).startsWith(
            "[COBRANCA]",
          );

        if (
          fluxoPendenteId !==
          null
        ) {
          return [
            {
              id:
                `fluxo-${paradaId}`,
              cliente:
                cliente.nome,
              detalhe:
                "Venda informada; falta bipar e concluir a entrega.",
              acao:
                "Finalizar entrega",
              href:
                `/mobile/vendas/finalizar?fluxoId=${fluxoPendenteId}`,
              tipo:
                "ENTREGA",
            },
          ];
        }

        if (
          vendaPendente &&
          entregaId
        ) {
          return [
            {
              id:
                `financeiro-${paradaId}`,
              cliente:
                cliente.nome,
              detalhe:
                "A entrega existe, mas o financeiro ainda não foi concluído.",
              acao:
                "Informar pagamento",
              href:
                `/mobile/vendas/nova?entregaId=${entregaId}`,
              tipo:
                "FINANCEIRO",
            },
          ];
        }

        if (
          item.status !==
            "PENDENTE" &&
          item.status !==
            "EM_ATENDIMENTO"
        ) {
          return [];
        }

        if (cobrancaRota) {
          return [
            {
              id:
                `cobranca-${paradaId}`,
              cliente:
                cliente.nome,
              detalhe:
                "Cobrança adicionada à rota e ainda não recebida.",
              acao:
                "Receber cliente",
              href:
                `/mobile/recebimentos/${cliente.id}?rotaClienteId=${paradaId}`,
              tipo:
                "COBRANCA",
            },
          ];
        }

        return [
          {
            id:
              `atendimento-${paradaId}`,
            cliente:
              cliente.nome,
            detalhe:
              rotaMobile
                ? "Cliente ainda precisa ter venda/pagamento informado."
                : "Cliente ainda precisa ser atendido ou ter ocorrência registrada.",
            acao:
              rotaMobile
                ? "Atender cliente"
                : "Abrir atendimento",
            href:
              rotaMobile
                ? `/mobile/vendas/preparar?rotaClienteId=${paradaId}`
                : `/mobile/entregas/nova?rotaClienteId=${paradaId}`,
            tipo:
              "ATENDIMENTO",
          },
        ];
      },
    );

  const totalPendenciasEncerramento =
    pendenciasEncerramento.length;

  const pendenciasDestaque =
    pendenciasEncerramento.slice(
      0,
      3,
    );

  /* INDICADORES */

  const total =
    listaItens.length;

  const pendentesOperacionais =
    listaItens.filter(
      (item) =>
        item.status === "PENDENTE" ||
        item.status === "EM_ATENDIMENTO",
    ).length;

  const vendasPendentes =
    vendaPendenteParadaIds.size;

  const pendentes =
    totalPendenciasEncerramento;

  const processados =
    Math.max(
      0,
      total - pendentes,
    );

  const restantes =
    pendentes;

  const percentual =
    total > 0
      ? Math.round(
          (processados / total) * 100,
        )
      : 0;

  const finalizada =
    rota.status === "FINALIZADA";

  const vendaMobileBloqueada =
    rotaMobile &&
    !podeRegistrarPagamento;

  /* =========================================================
     V50 - ITINERÁRIO OPERACIONAL COMPACTO
     ---------------------------------------------------------
     Toda a regra continua no Server Component. O componente
     cliente recebe somente dados já resolvidos e faz busca,
     filtros e paginação instantaneamente, sem nova consulta.
  ========================================================= */

  const itensItinerario:
    ItinerarioRotaItem[] =
    listaItens.flatMap<ItinerarioRotaItem>(
      (item): ItinerarioRotaItem[] => {
        const cliente =
          clientesMap.get(
            item.cliente_id,
          );

        if (!cliente) {
          return [];
        }

        const paradaId =
          Number(item.id);

        const entregaId =
          entregaPorParada.get(
            paradaId,
          ) ?? null;

        const vendaPendente =
          vendaPendenteParadaIds.has(
            paradaId,
          );

        const fluxoPendenteId =
          fluxoPendentePorParada.get(
            paradaId,
          ) ?? null;

        const aguardandoEntregaVenda =
          fluxoPendenteId !==
          null;

        const cobrancaRota =
          String(
            item.observacao ??
              "",
          ).startsWith(
            "[COBRANCA]",
          );

        const processado =
          item.status !==
            "PENDENTE" &&
          item.status !==
            "EM_ATENDIMENTO" &&
          !vendaPendente &&
          !aguardandoEntregaVenda;

        const logradouroRota =
          item.endereco_logradouro ??
          cliente.logradouro;

        const numeroRota =
          item.endereco_numero ??
          cliente.numero;

        const bairroRota =
          item.endereco_bairro ??
          cliente.bairro;

        const cidadeRota =
          item.endereco_cidade ??
          cliente.cidade;

        const ufRota =
          item.endereco_uf ??
          cliente.uf;

        const endereco =
          [
            logradouroRota,
            numeroRota,
          ]
            .filter(Boolean)
            .join(", ");

        const enderecoCompleto =
          `${
            endereco ||
            "Endereço não informado"
          }${
            bairroRota
              ? ` - ${bairroRota}`
              : ""
          }`;

        const queryMapa =
          encodeURIComponent(
            [
              endereco,
              bairroRota,
              cidadeRota,
              ufRota,
            ]
              .filter(Boolean)
              .join(", "),
          );

        let categoria:
          ItinerarioRotaItem["categoria"] =
          "ATENDIMENTO";

        let situacao =
          processado
            ? rotuloStatus(
                item.status,
              )
            : "Aguardando";

        let acaoLabel:
          string | null =
          null;

        let acaoHref:
          string | null =
          null;

        if (
          aguardandoEntregaVenda &&
          fluxoPendenteId
        ) {
          categoria =
            "ENTREGA";
          situacao =
            "Aguardando bipagem";
          acaoLabel =
            "Finalizar";
          acaoHref =
            `/mobile/vendas/finalizar?fluxoId=${fluxoPendenteId}`;
        } else if (
          vendaPendente &&
          entregaId
        ) {
          categoria =
            "FINANCEIRO";
          situacao =
            "Pagamento pendente";
          acaoLabel =
            "Pagamento";
          acaoHref =
            `/mobile/vendas/nova?entregaId=${entregaId}`;
        } else if (
          cobrancaRota
        ) {
          categoria =
            "COBRANCA";
          situacao =
            processado
              ? "Cobrança concluída"
              : "Cobrança pendente";

          if (!processado) {
            acaoLabel =
              "Receber";
            acaoHref =
              `/mobile/recebimentos/${cliente.id}?rotaClienteId=${paradaId}`;
          }
        } else if (
          !processado
        ) {
          categoria =
            "ATENDIMENTO";
          situacao =
            rotaMobile
              ? "Aguardando venda"
              : "Aguardando atendimento";
          acaoLabel =
            rotaMobile
              ? "Atender"
              : "Atender";
          acaoHref =
            rotaMobile
              ? `/mobile/vendas/preparar?rotaClienteId=${paradaId}`
              : `/mobile/entregas/nova?rotaClienteId=${paradaId}`;
        } else {
          categoria =
            cobrancaRota
              ? "COBRANCA"
              : "CONCLUIDO";
        }

        if (
          !rotaEmOperacao &&
          !processado
        ) {
          situacao =
            "Aguardando início da rota";
          acaoLabel =
            null;
          acaoHref =
            null;
        }

        return [
          {
            id:
              paradaId,
            sequencia:
              Number(
                item.sequencia,
              ),
            clienteId:
              Number(
                cliente.id,
              ),
            nome:
              String(
                cliente.nome ??
                  "Cliente",
              ),
            codigo:
              String(
                cliente.codigo ??
                  "",
              ),
            telefone:
              String(
                cliente.telefone ??
                  "",
              ),
            bairro:
              String(
                bairroRota ??
                  "",
              ),
            endereco:
              enderecoCompleto,
            mapaHref:
              queryMapa
                ? `https://www.google.com/maps/search/?api=1&query=${queryMapa}`
                : null,
            processado,
            categoria,
            situacao,
            statusOriginal:
              String(
                item.status ??
                  "",
              ),
            acaoLabel:
              finalizada
                ? null
                : acaoLabel,
            acaoHref:
              finalizada
                ? null
                : acaoHref,
          },
        ];
      },
    );

  /* TELA */

  return (
    <main className="app-premium min-h-dvh text-[#142018]">

      <div className="mx-auto min-h-dvh w-full max-w-[480px] overflow-hidden bg-[#f7faf7]/90 shadow-[0_0_70px_rgba(17,63,33,0.14)]">

        {/* =================================================
            HERO
        ================================================= */}

        <header className="hero-premium grain relative overflow-hidden px-4 pb-5 pt-4 text-white sm:px-5 sm:pb-7 sm:pt-5">

          <div className="pointer-events-none absolute -right-20 -top-20 h-[210px] w-[210px] rounded-full border-[30px] border-white/[0.04]" />

          <div className="pointer-events-none absolute -bottom-20 -left-16 h-[180px] w-[180px] rounded-full bg-white/[0.035]" />

          <div className="animate-orb pointer-events-none absolute right-8 top-28 h-32 w-32 rounded-full bg-[#f4b13f]/[0.14] blur-3xl" />

          {/* TOPBAR */}

          <div className="relative z-10 flex items-center justify-between">

            <Link
              href="/mobile"
              aria-label="Voltar"
              className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/15 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl transition active:scale-95"
            >
              <ArrowLeft size={19} />
            </Link>

            <div className="text-center">

              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#a8d8b7]">
                Operação
              </p>

              <h1 className="mt-0.5 text-[17px] font-black tracking-[-0.03em]">
                Minha Rota
              </h1>

            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/15 bg-white/10">
              <Route size={19} />
            </div>

          </div>

          {/* IDENTIFICAÇÃO */}

          <div className="relative z-10 mt-4">

            <div className="flex items-start justify-between gap-4">

              <div>

                <div className="flex items-center gap-2">

                  <Navigation
                    size={14}
                    className="text-[#f4b13f]"
                  />

                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#a8d8b7]">
                    {rota.codigo}
                  </p>

                </div>

                <h2 className="mt-2 text-[28px] font-black leading-none tracking-[-0.05em] sm:text-[32px]">
                  <span className="text-gold">
                    {total}
                  </span>{" "}
                  cliente
                  {total === 1 ? "" : "s"}
                </h2>

                <div className="mt-2 flex items-center gap-2 text-white/65">

                  <Clock3 size={14} />

                  <span className="text-[11px] font-semibold">
                    {formatarData(
                      rota.data_rota,
                    )}
                  </span>

                </div>

              </div>

              <span
                className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] ${
                  finalizada
                    ? "border-[#f4b13f]/60 bg-[#f4b13f] text-[#3b2600] shadow-[0_8px_20px_rgba(244,177,63,0.35)]"
                    : "border-white/20 bg-white/10 text-white backdrop-blur"
                }`}
              >
                {rotuloStatus(
                  rota.status,
                )}
              </span>

            </div>

            {/* PROGRESSO */}

            <div className="mt-4 rounded-[20px] border border-white/15 bg-white/[0.09] p-3 backdrop-blur-xl">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/55">
                    Progresso
                  </p>

                  <p className="mt-1 text-[12px] font-bold text-white">
                    {processados} de {total}{" "}
                    concluído
                    {total === 1 ? "" : "s"}
                  </p>

                </div>

                <div className="text-[24px] font-black tracking-[-0.04em]">
                  {percentual}%
                </div>

              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/20">

                <div
                  className="relative h-full rounded-full bg-[linear-gradient(90deg,#f4b13f,#ffe3a1)] shadow-[0_0_18px_rgba(244,177,63,0.55)] transition-all duration-700"
                  style={{
                    width: `${percentual}%`,
                  }}
                />

              </div>

            </div>

            {/* KPIs */}

            <div className="mt-2.5 grid grid-cols-3 gap-2">

              <HeroKpi
                label="Total"
                valor={total}
              />

              <HeroKpi
                label="Processados"
                valor={processados}
              />

              <HeroKpi
                label="Pendentes"
                valor={restantes}
              />

            </div>

          </div>

        </header>

        {/* =================================================
            CONTEÚDO
        ================================================= */}

        <div className="px-4 pb-10 pt-4 sm:px-5 sm:pt-5">

          {/* FINALIZADA */}

          {finalizada && (
            <div className="animate-pop relative mb-6 overflow-hidden rounded-[26px] border border-emerald-200 bg-[linear-gradient(135deg,#ecfdf3,#ffffff)] p-5 shadow-[0_20px_50px_-30px_rgba(16,185,129,0.55)]">

              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#f4b13f]/15" />

              <div className="relative flex items-center gap-4">

                <div className="icon-emerald flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[18px]">
                  <CircleCheckBig size={25} />
                </div>

                <div>

                  <div className="flex items-center gap-1.5">

                    <Sparkles
                      size={13}
                      className="text-[#d58b0a]"
                    />

                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b07a12]">
                      Operação concluída
                    </p>

                  </div>

                  <h3 className="mt-1 text-[19px] font-black tracking-[-0.03em]">
                    Rota finalizada
                  </h3>

                  <p className="mt-1 text-[12px] leading-5 text-slate-500">
                    Todos os clientes desta rota foram
                    processados com sucesso.
                  </p>

                </div>

              </div>

            </div>
          )}

          {mensagemErro && (
            <div className="mb-5 rounded-[20px] border border-red-100 bg-red-50 px-4 py-3 text-[11px] font-bold leading-5 text-red-700">
              {mensagemErro}
            </div>
          )}

          {mensagemOk && (
            <div className="mb-5 rounded-[20px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-[11px] font-bold leading-5 text-emerald-700">
              {mensagemOk}
            </div>
          )}

          {!finalizada && rotaPlanejada && (
            <section className="mb-5 rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-[11px] font-black text-emerald-950">Rota planejada para este entregador</p>
              <p className="mt-2 text-[11px] leading-5 text-emerald-800">
                Os atendimentos desta rota não dependem de uma carga. Iniciar a jornada
                não devolve, transfere nem movimenta cestas do estoque móvel.
              </p>
              {podeGerenciarRotaPropria && (
                <form action={iniciarMinhaRota} className="mt-4">
                  <button type="submit" className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-emerald-800 px-4 text-[12px] font-black text-white">
                    Iniciar rota do entregador
                  </button>
                </form>
              )}
              <Link href="/mobile/estoque" className="mt-2 flex min-h-[44px] items-center justify-center rounded-xl border border-emerald-200 bg-white px-3 text-[11px] font-bold text-emerald-900">
                Meu estoque móvel
              </Link>
            </section>
          )}

          {!finalizada && rotaEmOperacao && (
            <section className="mb-5 space-y-2.5">

              {totalPendenciasEncerramento >
              0 ? (
                <div className="overflow-hidden rounded-[20px] border border-amber-200 bg-[linear-gradient(145deg,#fff9ed,#ffffff)] shadow-[0_18px_36px_-30px_rgba(217,145,21,0.42)]">

                  <div className="flex items-start gap-3 border-b border-amber-100 px-3.5 py-3.5">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-amber-100 text-amber-700">
                      <Clock3
                        size={18}
                      />
                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-amber-700">
                        Antes de encerrar
                      </p>

                      <h3 className="mt-1 text-[15px] font-black tracking-[-0.03em]">
                        {totalPendenciasEncerramento}{" "}
                        {totalPendenciasEncerramento === 1
                          ? "ação pendente"
                          : "ações pendentes"}
                      </h3>

                      <p className="mt-1 text-[8px] leading-4 text-slate-500">
                        Resolva diretamente daqui. A rota só libera o encerramento quando tudo estiver concluído.
                      </p>

                    </div>

                  </div>

                  <div className="divide-y divide-amber-100">

                    {pendenciasDestaque.map(
                      (pendencia) => (
                        <div
                          key={
                            pendencia.id
                          }
                          className="flex items-center gap-3 px-3.5 py-2.5"
                        >

                          <div className="min-w-0 flex-1">

                            <p className="truncate text-[11px] font-black">
                              {
                                pendencia.cliente
                              }
                            </p>

                            <p className="mt-0.5 line-clamp-2 text-[8px] leading-4 text-slate-400">
                              {
                                pendencia.detalhe
                              }
                            </p>

                          </div>

                          <Link
                            href={
                              pendencia.href
                            }
                            className="flex h-[36px] shrink-0 items-center justify-center gap-1.5 rounded-[12px] bg-[#176f3c] px-3 text-[8px] font-black text-white shadow-sm"
                          >
                            {
                              pendencia.acao
                            }
                            <ChevronRight
                              size={13}
                            />
                          </Link>

                        </div>
                      ),
                    )}

                  </div>

                  {totalPendenciasEncerramento >
                    pendenciasDestaque.length && (
                    <a
                      href="#itinerario-rota"
                      className="flex h-[42px] items-center justify-center border-t border-amber-100 text-[9px] font-black text-amber-800"
                    >
                      Ver mais {totalPendenciasEncerramento - pendenciasDestaque.length} pendência(s) na rota
                    </a>
                  )}

                </div>
              ) : rotaMobile ? (
                <div className="overflow-hidden rounded-[24px] border border-emerald-200 bg-[linear-gradient(145deg,#effbf3,#ffffff)] p-4 shadow-[0_18px_40px_-30px_rgba(16,185,129,0.45)]">

                  <div className="flex items-center gap-3">

                    <div className="icon-emerald flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]">
                      <CircleCheckBig
                        size={20}
                      />
                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-600">
                        Checklist concluído
                      </p>

                      <h3 className="mt-1 text-[15px] font-black">
                        Rota pronta para encerrar
                      </h3>

                      <p className="mt-0.5 text-[8px] leading-4 text-slate-400">
                        Não existem atendimentos, cobranças ou vendas pendentes.
                      </p>

                    </div>

                  </div>

                  <form
                    action={
                      encerrarMinhaRota
                    }
                    className="mt-4"
                  >
                    <input
                      type="hidden"
                      name="rota_id"
                      value={
                        rota.id
                      }
                    />

                    <button
                      type="submit"
                      className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,#1f8a4c,#0d5d31)] text-[11px] font-black text-white shadow-[0_14px_28px_rgba(23,111,60,0.24)] transition active:scale-[0.985]"
                    >
                      <Square
                        size={15}
                      />
                      Finalizar minha rota
                    </button>

                  </form>

                </div>
              ) : null}

              <Link
                href="/mobile/estoque"
                className="flex h-[48px] w-full items-center justify-center gap-2 rounded-[15px] border border-emerald-200 bg-white text-[10px] font-black text-[#176f3c] shadow-[0_8px_20px_rgba(17,63,33,0.06)] transition active:scale-[0.985]"
              >
                <Plus
                  size={16}
                />
                Atender cliente com meu estoque
              </Link>

            </section>
          )}

          {vendaMobileBloqueada && (
            <div className="mb-5 rounded-[20px] border border-red-200 bg-red-50 px-4 py-4 text-[11px] font-bold leading-5 text-red-800">
              Esta rota foi criada no mobile e exige venda em campo, mas o pagamento mobile está desabilitado ou sem permissão para este usuário. Novas entregas ficam bloqueadas até a configuração ser corrigida.
            </div>
          )}

          {/* =================================================
              V50 - ITINERÁRIO INTELIGENTE COMPACTO
          ================================================= */}

          <section
            id="itinerario-rota"
            className="scroll-mt-3"
          >
            <ItinerarioRota
              itens={
                itensItinerario
              }
              totalRota={
                total
              }
              finalizada={
                finalizada
              }
            />
          </section>

          {/* VOLTAR */}

          <Link
            href="/mobile"
            className="glass mt-6 flex h-[54px] w-full items-center justify-center gap-2 rounded-[18px] text-[13px] font-black text-[#176f3c] transition active:scale-[0.985]"
          >
            <ArrowLeft size={16} />

            Voltar ao início
          </Link>

        </div>

      </div>

    </main>
  );
}

/* =========================================================
   KPI DO HERO
========================================================= */

function HeroKpi({
  label,
  valor,
}: {
  label: string;
  valor: number;
}) {
  return (
    <div className="rounded-[16px] border border-white/15 bg-white/[0.09] px-3 py-2.5 backdrop-blur-xl">

      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/55">
        {label}
      </p>

      <p className="mt-1 text-[20px] font-black tracking-[-0.04em] text-white">
        {valor}
      </p>

    </div>
  );
}