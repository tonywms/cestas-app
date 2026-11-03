export const instant = false;

import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileText,
  History,
  MapPin,
  PackageCheck,
  Pencil,
  Phone,
  ReceiptText,
  Route,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
} from "lucide-react";

import Link from "next/link";
import { TimelineCliente } from "./TimelineCliente";
import { redirect } from "next/navigation";

import {
  getCurrentUserProfile,
} from "@/lib/auth/get-current-user";

import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";

import {
  avaliarCredito,
  dataLimiteAtraso,
  POLITICA_CREDITO_PADRAO,
  type PoliticaCredito,
} from "@/lib/credito/avaliar-credito";

import {
  createClient,
} from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    clienteId: string;
  }>;
};

function moeda(valor: number) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    },
  ).format(valor);
}

function dataBR(
  valor:
    string | null | undefined,
) {
  if (!valor) {
    return "—";
  }

  const data =
    valor.includes("T")
      ? new Date(valor)
      : new Date(
          `${valor}T12:00:00`,
        );

  if (
    Number.isNaN(
      data.getTime(),
    )
  ) {
    return valor;
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeZone:
        "America/Fortaleza",
    },
  ).format(data);
}

function dataHora(
  valor:
    string | null | undefined,
) {
  if (!valor) {
    return "—";
  }

  const data =
    new Date(valor);

  if (
    Number.isNaN(
      data.getTime(),
    )
  ) {
    return valor;
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone:
        "America/Fortaleza",
    },
  ).format(data);
}

function hojeFortaleza() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Fortaleza",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(new Date());
}

function textoOcorrencia(
  tipo:
    string,
) {
  const nomes:
    Record<string, string> = {
      CLIENTE_AUSENTE:
        "Cliente ausente",
      RECUSA:
        "Cliente recusou",
      ENDERECO_INCORRETO:
        "Endereço incorreto",
      OUTRO:
        "Outra ocorrência",
    };

  return (
    nomes[tipo] ??
    tipo
  );
}

export default async function Cliente360Page({
  params,
}: PageProps) {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  /* V59_ACOES_EXECUTIVAS - PERMISSOES */
  const podeGerenciarRota =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo ===
      "ADMINISTRADOR" ||
    usuario.perfilCodigo ===
      "GESTOR" ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ROTA_GERENCIAR,
    );

  const podeRegistrarPagamento =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo ===
      "ADMINISTRADOR" ||
    usuario.perfilCodigo ===
      "GESTOR" ||
    usuario.perfilCodigo ===
      "FINANCEIRO" ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.PAGAMENTO_REGISTRAR,
    );

  const {
    clienteId:
      clienteIdTexto,
  } = await params;

  const clienteId =
    Number(
      clienteIdTexto,
    );

  if (
    !Number.isInteger(
      clienteId,
    ) ||
    clienteId <= 0
  ) {
    redirect(
      "/admin/clientes",
    );
  }

  const supabase =
    await createClient();

  const [
    clienteResult,
    configResult,
    contratosResult,
    parcelasResult,
    pagamentosResult,
    vendaRecebimentosResult,
    entregasResult,
    ocorrenciasResult,
    liberacoesResult,
    enderecosResult,
    rotaClientesResult,
  ] =
    await Promise.all([
      supabase
        .from("clientes")
        .select(`
          id,
          codigo,
          nome,
          cpf_cnpj,
          telefone,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          uf,
          cep,
          ativo,
          created_at,
          updated_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "id",
          clienteId,
        )
        .maybeSingle(),

      supabase
        .from(
          "empresa_configuracoes",
        )
        .select(`
          credito_alerta_qtd_atrasos,
          credito_bloqueio_qtd_atrasos,
          credito_dias_tolerancia,
          credito_permitir_excecao,
          credito_validade_excecao_dias
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .maybeSingle(),

      supabase
        .from(
          "contratos",
        )
        .select(`
          id,
          codigo,
          valor_total,
          quantidade_parcelas,
          modalidade,
          proxima_visita_sugerida,
          frequencia_dias,
          data_inicio,
          primeiro_vencimento,
          status,
          observacao,
          created_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "cliente_id",
          clienteId,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        ),

      supabase
        .from(
          "parcelas",
        )
        .select(`
          id,
          contrato_id,
          numero,
          vencimento,
          valor,
          valor_pago,
          status,
          paga_at,
          created_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "cliente_id",
          clienteId,
        )
        .order(
          "vencimento",
          {
            ascending: true,
          },
        ),

      supabase
        .from(
          "pagamentos",
        )
        .select(`
          id,
          parcela_id,
          recebido_por,
          valor,
          forma_pagamento,
          observacao,
          created_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "cliente_id",
          clienteId,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        ),

      supabase
        .from(
          "venda_recebimentos",
        )
        .select(`
          id,
          venda_id,
          recebido_por,
          tipo,
          valor,
          forma_pagamento,
          observacao,
          created_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "cliente_id",
          clienteId,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        ),

      supabase
        .from(
          "entregas",
        )
        .select(`
          id,
          carga_id,
          entregador_id,
          rota_cliente_id,
          status,
          entregue_at,
          observacao,
          created_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "cliente_id",
          clienteId,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        ),

      supabase
        .from(
          "ocorrencias",
        )
        .select(`
          id,
          rota_id,
          rota_cliente_id,
          entregador_id,
          tipo,
          descricao,
          requer_reagendamento,
          created_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "cliente_id",
          clienteId,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        ),

      supabase
        .from(
          "credito_liberacoes",
        )
        .select(`
          id,
          liberado_por,
          motivo,
          valido_ate,
          status,
          revogado_at,
          motivo_revogacao,
          created_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "cliente_id",
          clienteId,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        ),

      supabase
        .from(
          "cliente_enderecos",
        )
        .select(`
          id,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          uf,
          cep,
          origem,
          motivo,
          valido_de,
          valido_ate,
          ativo,
          created_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "cliente_id",
          clienteId,
        )
        .order(
          "valido_de",
          {
            ascending: false,
          },
        ),

      /* V67_ROTAS_CLIENTE_360_DATA */
      supabase
        .from("rota_clientes")
        .select(`
          id,
          rota_id,
          sequencia,
          status,
          observacao,
          atendido_at,
          created_at,
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
        .eq(
          "cliente_id",
          clienteId,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        )
        .limit(50),

    ]);

  if (
    clienteResult.error ||
    !clienteResult.data
  ) {
    redirect(
      "/admin/clientes",
    );
  }

  const cliente =
    clienteResult.data;

  const contratos =
    contratosResult.data ??
    [];

  const parcelas =
    parcelasResult.data ??
    [];

  const pagamentos =
    pagamentosResult.data ??
    [];

  const vendaRecebimentos =
    vendaRecebimentosResult.data ??
    [];

  const entregas =
    entregasResult.data ??
    [];

  const ocorrencias =
    ocorrenciasResult.data ??
    [];

  const liberacoes =
    liberacoesResult.data ??
    [];

  const enderecos =
    enderecosResult.data ??
    [];

  /* V67_ROTAS_CLIENTE_360_MODEL */
  const rotaClientes =
    rotaClientesResult.data ??
    [];

  const rotaIdsCliente =
    Array.from(
      new Set(
        rotaClientes
          .map((item) =>
            Number(item.rota_id),
          )
          .filter((id) =>
            Number.isInteger(id) &&
            id > 0,
          ),
      ),
    );

  const rotasClienteResult =
    rotaIdsCliente.length > 0
      ? await supabase
          .from("rotas")
          .select(`
            id,
            codigo,
            entregador_id,
            data_rota,
            status,
            observacao,
            iniciada_at,
            finalizada_at,
            created_at,
            origem,
            carga_id
          `)
          .eq(
            "empresa_id",
            usuario.empresa.id,
          )
          .in(
            "id",
            rotaIdsCliente,
          )
          .order(
            "data_rota",
            {
              ascending: false,
            },
          )
          .limit(50)
      : {
          data: [],
          error: null,
        };

  const rotasCliente =
    rotasClienteResult.data ??
    [];

  const rotaPorId =
    new Map(
      rotasCliente.map(
        (item) => [
          Number(item.id),
          item,
        ],
      ),
    );

  const historicoRotas =
    rotaClientes
      .map((parada) => ({
        parada,
        rota:
          rotaPorId.get(
            Number(parada.rota_id),
          ) ?? null,
      }))
      .filter(
        (
          item,
        ): item is {
          parada: (typeof rotaClientes)[number];
          rota: (typeof rotasCliente)[number];
        } =>
          item.rota !== null,
      )
      .sort((a, b) => {
        const dataA =
          a.parada.atendido_at ??
          a.rota.finalizada_at ??
          a.rota.iniciada_at ??
          a.parada.created_at;

        const dataB =
          b.parada.atendido_at ??
          b.rota.finalizada_at ??
          b.rota.iniciada_at ??
          b.parada.created_at;

        return (
          new Date(dataB).getTime() -
          new Date(dataA).getTime()
        );
      });

  const rotasAtivasCliente =
    historicoRotas.filter(
      ({ rota }) =>
        rota.status === "PLANEJADA" ||
        rota.status === "EM_ROTA",
    ).length;

  const paradasConcluidasCliente =
    historicoRotas.filter(
      ({ parada }) =>
        parada.status === "ENTREGUE",
    ).length;

  const statusRotaLabel:
    Record<string, string> = {
      PLANEJADA: "Planejada",
      EM_ROTA: "Em rota",
      FINALIZADA: "Finalizada",
      CANCELADA: "Cancelada",
    };

  const statusParadaLabel:
    Record<string, string> = {
      PENDENTE: "Pendente",
      ENTREGUE: "Concluída",
      AUSENTE: "Ausente",
      RECUSADA: "Recusada",
      CANCELADA: "Cancelada",
    };

  /* V56_CLIENTE_360_EXECUTIVO - VENDAS */
  const vendasResult =
    await supabase
      .from("vendas")
      .select(`
        id,
        codigo,
        tipo_venda,
        valor_total,
        valor_entrada,
        forma_pagamento,
        status,
        created_at
      `)
      .eq("empresa_id", usuario.empresa.id)
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false })
      .limit(50);

  const vendas =
    vendasResult.data ??
    [];

  /* =======================================================
     ITENS ENTREGUES
  ======================================================= */

  const entregaIds =
    entregas.map(
      (item) =>
        item.id,
    );

  const entregaItensResult =
    entregaIds.length > 0
      ? await supabase
          .from(
            "entrega_itens",
          )
          .select(`
            id,
            entrega_id,
            quantidade
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

  const entregaItens =
    entregaItensResult.data ??
    [];

  /* =======================================================
     CRÉDITO
  ======================================================= */

  const config =
    configResult.data;

  const politica:
    PoliticaCredito = {
      alertaQtdAtrasos:
        config
          ?.credito_alerta_qtd_atrasos ??
        POLITICA_CREDITO_PADRAO
          .alertaQtdAtrasos,

      bloqueioQtdAtrasos:
        config
          ?.credito_bloqueio_qtd_atrasos ??
        POLITICA_CREDITO_PADRAO
          .bloqueioQtdAtrasos,

      diasTolerancia:
        config
          ?.credito_dias_tolerancia ??
        POLITICA_CREDITO_PADRAO
          .diasTolerancia,

      permitirExcecao:
        config
          ?.credito_permitir_excecao ??
        POLITICA_CREDITO_PADRAO
          .permitirExcecao,

      validadeExcecaoDias:
        config
          ?.credito_validade_excecao_dias ??
        POLITICA_CREDITO_PADRAO
          .validadeExcecaoDias,
    };

  const hoje =
    hojeFortaleza();

  const limiteAtraso =
    dataLimiteAtraso(
      hoje,
      politica.diasTolerancia,
    );

  const parcelasEmAberto =
    parcelas.filter(
      (item) =>
        item.status ===
          "ABERTA" ||
        item.status ===
          "PARCIAL",
    );

  const parcelasVencidas =
    parcelasEmAberto.filter(
      (item) =>
        item.vencimento <
        limiteAtraso,
    );

  const agora =
    new Date();

  const liberacaoAtivaRaw =
    liberacoes.find(
      (item) =>
        item.status ===
          "ATIVA" &&
        new Date(
          item.valido_ate,
        ).getTime() >
          agora.getTime(),
    );

  const liberacaoAtiva =
    liberacaoAtivaRaw
      ? {
          id:
            liberacaoAtivaRaw.id,

          motivo:
            liberacaoAtivaRaw.motivo,

          validoAte:
            liberacaoAtivaRaw.valido_ate,
        }
      : null;

  const avaliacaoCredito =
    avaliarCredito({
      qtdAtrasos:
        parcelasVencidas.length,

      politica,

      liberacaoAtiva,
    });

  /* =======================================================
     FINANCEIRO
  ======================================================= */

  const contratosValidos =
    contratos.filter(
      (item) =>
        item.status !==
        "CANCELADO",
    );

  const contratosAtivos =
    contratos.filter(
      (item) =>
        item.status ===
        "ATIVO",
    );

  const contratosFlexiveis =
    contratosAtivos.filter(
      (item) =>
        item.modalidade ===
        "SALDO_ABERTO",
    );

  const proximaVisitaFlexivel =
    contratosFlexiveis
      .map((item) =>
        item.proxima_visita_sugerida,
      )
      .filter((item): item is string =>
        Boolean(item),
      )
      .sort()[0] ?? null;

  const totalContratado =
    contratosValidos.reduce(
      (
        total,
        item,
      ) =>
        total +
        Number(
          item.valor_total,
        ),
      0,
    );

  const totalPagamentosParcelas =
    pagamentos.reduce(
      (
        total,
        item,
      ) =>
        total +
        Number(
          item.valor,
        ),
      0,
    );

  const entradasVendas =
    vendaRecebimentos.filter(
      (item) =>
        String(
          item.tipo ??
          "",
        ).toUpperCase() ===
          "ENTRADA" &&
        Number(
          item.valor ??
          0,
        ) > 0,
    );

  const totalEntradasVendas =
    entradasVendas.reduce(
      (
        total,
        item,
      ) =>
        total +
        Number(
          item.valor ??
          0,
        ),
      0,
    );

  const totalRecebido =
    totalEntradasVendas +
    totalPagamentosParcelas;

  const saldoAberto =
    parcelasEmAberto.reduce(
      (
        total,
        item,
      ) =>
        total +
        (
          Number(
            item.valor,
          ) -
          Number(
            item.valor_pago,
          )
        ),
      0,
    );

  const proximoVencimento =
    parcelasEmAberto
      .filter(
        (item) =>
          item.vencimento >=
          hoje,
      )
      .sort(
        (a, b) =>
          a.vencimento.localeCompare(
            b.vencimento,
          ),
      )[0] ??
    null;

  /* V59_ACOES_EXECUTIVAS - CONTEXTO */
  const parcelaPrioritaria =
    [
      ...parcelasEmAberto,
    ]
      .sort(
        (a, b) => {
          const aVencida =
            String(
              a.vencimento,
            ) < hoje;

          const bVencida =
            String(
              b.vencimento,
            ) < hoje;

          if (
            aVencida !==
            bVencida
          ) {
            return aVencida
              ? -1
              : 1;
          }

          const porData =
            String(
              a.vencimento,
            ).localeCompare(
              String(
                b.vencimento,
              ),
            );

          if (
            porData !==
            0
          ) {
            return porData;
          }

          return (
            Number(
              a.numero ??
              0,
            ) -
            Number(
              b.numero ??
              0,
            )
          );
        },
      )[0] ??
    null;

  const saldoParcelaPrioritaria =
    parcelaPrioritaria
      ? Math.max(
          0,
          Number(
            parcelaPrioritaria.valor ??
            0,
          ) -
            Number(
              parcelaPrioritaria.valor_pago ??
              0,
            ),
        )
      : 0;

  const telefoneSomenteDigitos =
    String(
      cliente.telefone ??
      "",
    ).replace(
      /\D/g,
      "",
    );

  const whatsappNumero =
    telefoneSomenteDigitos.length >=
      10 &&
    telefoneSomenteDigitos.length <=
      13
      ? telefoneSomenteDigitos.startsWith(
          "55",
        )
        ? telefoneSomenteDigitos
        : `55${telefoneSomenteDigitos}`
      : null;

  const temAcoesExecutivas =
    podeGerenciarRota ||
    (
      podeRegistrarPagamento &&
      parcelaPrioritaria
    ) ||
    Boolean(
      whatsappNumero,
    );

  /* =======================================================
     LOGÍSTICA
  ======================================================= */

  const entregasConcluidas =
    entregas.filter(
      (item) =>
        item.status ===
        "CONCLUIDA",
    );

  const quantidadeEntregue =
    entregaItens.reduce(
      (
        total,
        item,
      ) =>
        total +
        Number(
          item.quantidade,
        ),
      0,
    );

  const ocorrenciasReagendar =
    ocorrencias.filter(
      (item) =>
        item.requer_reagendamento,
    ).length;

  /* V56_CLIENTE_360_EXECUTIVO - INDICADORES */
  const vendasValidas =
    vendas.filter(
      (item) =>
        item.status !==
        "CANCELADA",
    );

  const totalVendido =
    vendasValidas.reduce(
      (total, item) =>
        total +
        Number(item.valor_total ?? 0),
      0,
    );

  const ticketMedio =
    vendasValidas.length > 0
      ? totalVendido / vendasValidas.length
      : 0;

  const ultimaVenda =
    vendasValidas[0] ?? null;

  const proximaAcao =
    parcelasVencidas.length > 0
      ? {
          titulo: "Cobrança prioritária",
          descricao: `${parcelasVencidas.length} parcela(s) vencida(s). Regularize antes de ampliar o crédito.`,
          acao: "Abrir financeiro",
          href: `/admin/financeiro?cliente=${cliente.id}`,
          tone: "amber",
        }
      : ocorrenciasReagendar > 0
        ? {
            titulo: "Reagendar atendimento",
            descricao: `${ocorrenciasReagendar} ocorrência(s) ainda pedem nova visita.`,
            acao: "Abrir rotas",
            href: "/admin/rotas",
            tone: "amber",
          }
        : saldoAberto > 0
          ? {
              titulo: "Acompanhar saldo",
              descricao: `Cliente possui ${moeda(saldoAberto)} em aberto, sem atraso crítico.`,
              acao: "Abrir financeiro",
              href: `/admin/financeiro?cliente=${cliente.id}`,
              tone: "green",
            }
          : {
              titulo: "Cliente regular",
              descricao: "Sem cobrança vencida ou ocorrência operacional pendente.",
              acao: "Ver carteira",
              href: "/admin/clientes",
              tone: "green",
            };

  /* =======================================================
     TIMELINE 360
  ======================================================= */

  type TimelineItem = {
    data: string;
    tipo:
      | "CONTRATO"
      | "VENDA"
      | "PAGAMENTO"
      | "ENTREGA"
      | "ROTA"
      | "OCORRENCIA"
      | "CREDITO";
    titulo: string;
    descricao: string;
    valor?: string;
  };

  const timeline:
    TimelineItem[] = [];

  for (
    const item of contratos
  ) {
    timeline.push({
      data:
        item.created_at,

      tipo:
        "CONTRATO",

      titulo:
        `Contrato ${item.codigo}`,

      descricao:
        item.modalidade === "SALDO_ABERTO"
          ? `Saldo em aberto • ${item.status}${item.proxima_visita_sugerida ? ` • próxima visita ${dataBR(item.proxima_visita_sugerida)}` : ""}`
          : `${item.quantidade_parcelas} parcela(s) • ${item.status}`,

      valor:
        moeda(
          Number(
            item.valor_total,
          ),
        ),
    });
  }

  for (
    const item of entradasVendas
  ) {
    timeline.push({
      data:
        item.created_at,

      tipo:
        "VENDA",

      titulo:
        "Entrada da venda",

      descricao:
        `${item.forma_pagamento ?? "Forma não informada"} • venda #${item.venda_id}`,

      valor:
        moeda(
          Number(
            item.valor ??
            0,
          ),
        ),
    });
  }

  for (
    const item of pagamentos
  ) {
    timeline.push({
      data:
        item.created_at,

      tipo:
        "PAGAMENTO",

      titulo:
        "Pagamento recebido",

      descricao:
        item.forma_pagamento,

      valor:
        moeda(
          Number(
            item.valor,
          ),
        ),
    });
  }

  for (
    const item of entregas
  ) {
    timeline.push({
      data:
        item.entregue_at ??
        item.created_at,

      tipo:
        "ENTREGA",

      titulo:
        item.status ===
          "CONCLUIDA"
          ? "Entrega concluída"
          : `Entrega ${item.status}`,

      descricao:
        item.observacao ??
        `Carga nº ${item.carga_id}`,
    });
  }

  for (
    const item of ocorrencias
  ) {
    timeline.push({
      data:
        item.created_at,

      tipo:
        "OCORRENCIA",

      titulo:
        textoOcorrencia(
          item.tipo,
        ),

      descricao:
        item.descricao ??
        (
          item.requer_reagendamento
            ? "Requer reagendamento"
            : "Ocorrência operacional"
        ),
    });
  }

  for (
    const item of liberacoes
  ) {
    timeline.push({
      data:
        item.created_at,

      tipo:
        "CREDITO",

      titulo:
        item.status ===
          "ATIVA"
          ? "Crédito liberado por exceção"
          : "Exceção de crédito registrada",

      descricao:
        item.motivo,
    });
  }

  /* V67_ROTAS_CLIENTE_360_TIMELINE */
  for (
    const item of historicoRotas
  ) {
    const dataEvento =
      item.parada.atendido_at ??
      item.rota.finalizada_at ??
      item.rota.iniciada_at ??
      item.parada.created_at;

    const rotaStatus =
      statusRotaLabel[
        item.rota.status
      ] ??
      item.rota.status;

    const paradaStatus =
      statusParadaLabel[
        item.parada.status
      ] ??
      item.parada.status;

    timeline.push({
      data: dataEvento,
      tipo: "ROTA",
      titulo: `Rota ${item.rota.codigo}`,
      descricao:
        `Parada nº ${item.parada.sequencia} • ${rotaStatus} / ${paradaStatus}`,
    });
  }

  timeline.sort(
    (a, b) =>
      new Date(
        b.data,
      ).getTime() -
      new Date(
        a.data,
      ).getTime(),
  );


  const endereco =
    [
      cliente.logradouro,
      cliente.numero,
    ]
      .filter(Boolean)
      .join(", ");

  const localizacao =
    [
      cliente.bairro,
      cliente.cidade,
      cliente.uf,
    ]
      .filter(Boolean)
      .join(" • ");

  return (
    <main className="app-premium min-h-screen px-4 py-6 text-[#142018] md:px-6 md:py-8">

      <div className="mx-auto w-full">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="glass flex items-center justify-between gap-4 rounded-[28px] px-5 py-4">

          <div className="flex items-center gap-4">

            <Link
              href="/admin/clientes"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-[#176f3c]"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#b07a12]">
                Comercial
              </p>

              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Cliente 360°
              </h1>
            </div>

          </div>

          <div className="hidden items-center gap-2 md:flex">

            <Link
              href={`/admin/clientes/${cliente.id}/editar`}
              className="flex h-11 items-center gap-2 rounded-[14px] border border-emerald-100 bg-white px-4 text-[9px] font-black text-[#176f3c]"
            >
              <Pencil size={15} />
              Editar cliente
            </Link>

            <Link
              href={`/admin/financeiro?cliente=${cliente.id}`}
              className="flex h-11 items-center gap-2 rounded-[14px] border border-emerald-100 bg-white px-4 text-[9px] font-black text-[#176f3c]"
            >
              <CircleDollarSign size={15} />
              Financeiro
            </Link>

            <Link
              href={`/admin/credito?cliente=${cliente.id}`}
              className="flex h-11 items-center gap-2 rounded-[14px] bg-[#176f3c] px-4 text-[9px] font-black text-white"
            >
              <CreditCard size={15} />
              Crédito
            </Link>

          </div>

        </header>

        {/* =================================================
            HERO
        ================================================= */}

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">

          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.035]" />

          <div className="relative z-10">

            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">

              <div className="flex min-w-0 items-start gap-4">

                <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[19px] border border-white/10 bg-white/10">
                  <UserRound size={27} />
                </div>

                <div className="min-w-0">

                  <div className="flex items-center gap-2">

                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200">
                      {cliente.codigo}
                    </p>

                    <span className={`rounded-full px-3 py-1 text-[7px] font-black uppercase ${
                      cliente.ativo
                        ? "bg-white text-[#176f3c]"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {cliente.ativo
                        ? "Ativo"
                        : "Inativo"}
                    </span>

                  </div>

                  <h2 className="mt-2 truncate text-[31px] font-black tracking-[-0.055em]">
                    {cliente.nome}
                    <span className="text-[#f4b13f]">.</span>
                  </h2>

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-white/60">

                    {cliente.telefone && (
                      <span className="flex items-center gap-1.5">
                        <Phone size={12} />
                        {cliente.telefone}
                      </span>
                    )}

                    {(endereco || localizacao) && (
                      <span className="flex items-center gap-1.5">
                        <MapPin size={12} />
                        {endereco}
                        {localizacao
                          ? ` • ${localizacao}`
                          : ""}
                      </span>
                    )}

                  </div>

                </div>

              </div>

              <CreditoHeroBadge
                status={
                  avaliacaoCredito.statusEfetivo
                }
              />

            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

              <HeroKpi
                label="Saldo em aberto"
                valor={
                  moeda(
                    saldoAberto,
                  )
                }
              />

              <HeroKpi
                label="Próxima visita"
                valor={
                  proximaVisitaFlexivel
                    ? dataBR(proximaVisitaFlexivel)
                    : "—"
                }
              />

              <HeroKpi
                label="Total recebido"
                valor={
                  moeda(
                    totalRecebido,
                  )
                }
              />

              <HeroKpi
                label="Atendimentos"
                valor={
                  String(
                    entregasConcluidas.length,
                  )
                }
              />

              <HeroKpi
                label="Ocorrências"
                valor={
                  String(
                    ocorrencias.length,
                  )
                }
                alerta={
                  ocorrencias.length >
                  0
                }
              />

            </div>

          </div>

        </section>

        {/* V59_ACOES_EXECUTIVAS */}
        {temAcoesExecutivas ? (
          <section className="mt-4 rounded-[22px] border border-emerald-100 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#b07a12]">
                  Ações rápidas
                </p>
                <p className="mt-0.5 text-[9px] font-semibold text-slate-400">
                  Execute a próxima operação sem procurar o cliente novamente.
                </p>
              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[7px] font-black uppercase tracking-[0.08em] text-emerald-700">
                Cliente {cliente.codigo}
              </span>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {podeGerenciarRota ? (
                <Link
                  href={`/admin/rotas/nova?cliente=${cliente.id}`}
                  className="group flex min-h-[74px] items-center gap-3 rounded-[16px] border border-emerald-100 bg-[#f7fcf8] px-4 py-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-emerald-100 text-emerald-700">
                    <Route size={17} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black text-slate-700">
                      Adicionar à rota
                    </p>
                    <p className="mt-1 text-[8px] font-medium leading-4 text-slate-400">
                      Abre uma nova rota com este cliente já selecionado.
                    </p>
                  </div>

                  <ChevronRight
                    size={14}
                    className="shrink-0 text-emerald-600"
                  />
                </Link>
              ) : null}

              {podeRegistrarPagamento &&
              parcelaPrioritaria ? (
                <Link
                  href={`/admin/financeiro/receber/${parcelaPrioritaria.id}`}
                  className={`group flex min-h-[74px] items-center gap-3 rounded-[16px] border px-4 py-3 ${
                    String(
                      parcelaPrioritaria.vencimento,
                    ) < hoje
                      ? "border-amber-200 bg-amber-50"
                      : "border-sky-100 bg-sky-50"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${
                      String(
                        parcelaPrioritaria.vencimento,
                      ) < hoje
                        ? "bg-amber-100 text-amber-700"
                        : "bg-sky-100 text-sky-700"
                    }`}
                  >
                    <ReceiptText size={17} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black text-slate-700">
                      Receber {moeda(saldoParcelaPrioritaria)}
                    </p>
                    <p className="mt-1 text-[8px] font-medium leading-4 text-slate-400">
                      Parcela {parcelaPrioritaria.numero} • venc. {dataBR(parcelaPrioritaria.vencimento)}
                    </p>
                  </div>

                  <ChevronRight
                    size={14}
                    className="shrink-0 text-slate-500"
                  />
                </Link>
              ) : null}

              {whatsappNumero ? (
                <a
                  href={`https://wa.me/${whatsappNumero}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex min-h-[74px] items-center gap-3 rounded-[16px] border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-slate-100 text-slate-600">
                    <Phone size={17} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black text-slate-700">
                      Falar com cliente
                    </p>
                    <p className="mt-1 truncate text-[8px] font-medium text-slate-400">
                      WhatsApp • {cliente.telefone}
                    </p>
                  </div>

                  <ChevronRight
                    size={14}
                    className="shrink-0 text-slate-400"
                  />
                </a>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* =================================================
            RESUMO
        ================================================= */}

        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">

          <ResumoCard
            icon={
              <FileText size={19} />
            }
            label="Contratos ativos"
            valor={
              String(
                contratosAtivos.length,
              )
            }
            detalhe={
              `${contratos.length} contrato(s) no histórico`
            }
          />

          <ResumoCard
            icon={
              <CalendarClock size={19} />
            }
            label="Visita sugerida"
            valor={
              proximaVisitaFlexivel
                ? dataBR(proximaVisitaFlexivel)
                : "—"
            }
            detalhe={
              contratosFlexiveis.length > 0
                ? `${contratosFlexiveis.length} saldo(s) flexível(is) ativo(s)`
                : "Sem saldo flexível ativo"
            }
          />

          <ResumoCard
            icon={
              <ReceiptText size={19} />
            }
            label="Cobranças vencidas"
            valor={
              String(
                parcelasVencidas.length,
              )
            }
            detalhe={
              proximoVencimento
                ? `Próximo: ${dataBR(proximoVencimento.vencimento)}`
                : "Sem próximo vencimento"
            }
            alerta={
              parcelasVencidas.length >
              0
            }
          />

          <ResumoCard
            icon={
              <PackageCheck size={19} />
            }
            label="Cestas entregues"
            valor={
              String(
                quantidadeEntregue,
              )
            }
            detalhe={
              `${entregasConcluidas.length} entrega(s) concluída(s)`
            }
          />

          <ResumoCard
            icon={
              <Route size={19} />
            }
            label="Reagendamentos"
            valor={
              String(
                ocorrenciasReagendar,
              )
            }
            detalhe="Ocorrências que pedem nova visita"
            alerta={
              ocorrenciasReagendar >
              0
            }
          />

        </section>

        {/* =================================================
            CADASTRO + CRÉDITO
        ================================================= */}

        {/* V56_CLIENTE_360_EXECUTIVO */}
        <section className="mt-4 grid gap-4 xl:grid-cols-[.85fr_1.45fr]">
          <div className={`rounded-[24px] border p-5 ${proximaAcao.tone === "amber" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${proximaAcao.tone === "amber" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                <Sparkles size={17} />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#b07a12]">Próxima ação</p>
                <h3 className="mt-1 text-[17px] font-black tracking-[-0.035em]">{proximaAcao.titulo}</h3>
                <p className="mt-1.5 text-[10px] font-medium leading-4 text-slate-600">{proximaAcao.descricao}</p>
              </div>
            </div>

            <Link
              href={proximaAcao.href}
              className={`mt-4 flex h-10 w-full items-center justify-center rounded-[12px] text-[9px] font-black ${proximaAcao.tone === "amber" ? "bg-amber-600 text-white" : "bg-[#176f3c] text-white"}`}
            >
              {proximaAcao.acao}
              <ChevronRight size={14} className="ml-1" />
            </Link>
          </div>

          <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#b07a12]">Comercial</p>
                <h3 className="mt-1 text-[17px] font-black tracking-[-0.035em]">Histórico de vendas</h3>
                <p className="mt-1 text-[9px] text-slate-400">Até 50 vendas recentes deste cliente.</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-emerald-50 text-emerald-700">
                <CircleDollarSign size={17} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
              <Mini label="Vendas" valor={String(vendasValidas.length)} />
              <Mini label="Total vendido" valor={moeda(totalVendido)} />
              <Mini label="Ticket médio" valor={moeda(ticketMedio)} />
              <Mini label="Última venda" valor={ultimaVenda ? dataBR(ultimaVenda.created_at) : "—"} />
            </div>

            <div className="mt-4 overflow-hidden rounded-[16px] border border-slate-100">
              {vendasValidas.length === 0 ? (
                <div className="px-4 py-5 text-center">
                  <p className="text-[10px] font-black text-slate-600">Nenhuma venda registrada</p>
                  <p className="mt-1 text-[8px] text-slate-400">As próximas vendas deste cliente aparecerão aqui.</p>
                </div>
              ) : (
                vendasValidas.slice(0, 5).map((venda, index) => (
                  <div
                    key={venda.id}
                    className={`grid gap-2 px-3 py-2.5 sm:grid-cols-[1.15fr_.85fr_.85fr_.75fr] sm:items-center ${index > 0 ? "border-t border-slate-100" : ""}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-black text-slate-700">{venda.codigo}</p>
                      <p className="mt-0.5 text-[8px] font-medium text-slate-400">{dataHora(venda.created_at)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[7px] font-black uppercase tracking-[0.08em] text-slate-400">Venda</p>
                      <p className="mt-0.5 truncate text-[9px] font-bold text-slate-600">{venda.tipo_venda ?? "—"}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[7px] font-black uppercase tracking-[0.08em] text-slate-400">Pagamento</p>
                      <p className="mt-0.5 truncate text-[9px] font-bold text-slate-600">{venda.forma_pagamento ?? "—"}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[7px] font-black uppercase tracking-[0.08em] text-slate-400">Valor</p>
                      <p className="mt-0.5 text-[10px] font-black text-emerald-700">{moeda(Number(venda.valor_total ?? 0))}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.15fr]">

          <div className="card-premium rounded-[30px] p-6">

            <div className="flex items-start gap-3">

              <div className="icon-emerald flex h-12 w-12 items-center justify-center rounded-[16px]">
                <UserRound size={21} />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                  Cadastro
                </p>

                <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                  Dados do cliente
                </h3>
              </div>

            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">

              <Info
                label="CPF / CNPJ"
                valor={
                  cliente.cpf_cnpj ??
                  "Não informado"
                }
              />

              <Info
                label="Telefone"
                valor={
                  cliente.telefone ??
                  "Não informado"
                }
              />

              <Info
                label="Endereço"
                valor={
                  endereco ||
                  "Não informado"
                }
              />

              <Info
                label="Bairro"
                valor={
                  cliente.bairro ??
                  "Não informado"
                }
              />

              <Info
                label="Cidade / UF"
                valor={
                  [
                    cliente.cidade,
                    cliente.uf,
                  ]
                    .filter(Boolean)
                    .join(" / ") ||
                  "Não informado"
                }
              />

              <Info
                label="CEP"
                valor={
                  cliente.cep ??
                  "Não informado"
                }
              />

            </div>

            <div className="mt-4 rounded-[18px] bg-[#f5f8f5] p-4">

              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Cliente desde
              </p>

              <p className="mt-1 text-[11px] font-black">
                {dataBR(
                  cliente.created_at,
                )}
              </p>

            </div>

          </div>

          <div className={`relative overflow-hidden rounded-[30px] border p-6 shadow-[0_22px_55px_-32px_rgba(17,63,33,0.18)] ${
            avaliacaoCredito.statusEfetivo ===
            "BLOQUEADO"
              ? "border-red-200 bg-[linear-gradient(145deg,#fff5f5,#ffffff)]"
              : avaliacaoCredito.statusEfetivo ===
                "LIBERADO_EXCECAO"
                ? "border-sky-200 bg-[linear-gradient(145deg,#f2f9ff,#ffffff)]"
                : avaliacaoCredito.statusEfetivo ===
                  "ALERTA"
                  ? "border-amber-200 bg-[linear-gradient(145deg,#fffaf0,#ffffff)]"
                  : "border-emerald-200 bg-[linear-gradient(145deg,#f0fbf4,#ffffff)]"
          }`}>

            <div className="flex items-start justify-between gap-4">

              <div className="flex items-start gap-3">

                <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-white text-[#176f3c] shadow-sm">
                  <ShieldCheck size={21} />
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                    Crédito
                  </p>

                  <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                    Situação financeira
                  </h3>
                </div>

              </div>

              <CreditoHeroBadge
                status={
                  avaliacaoCredito.statusEfetivo
                }
              />

            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">

              <InfoNumero
                label="Saldo aberto"
                valor={
                  moeda(
                    saldoAberto,
                  )
                }
              />

              <InfoNumero
                label="Vencidas"
                valor={
                  String(
                    parcelasVencidas.length,
                  )
                }
                alerta={
                  parcelasVencidas.length >
                  0
                }
              />

              <InfoNumero
                label="Total financiado"
                valor={
                  moeda(
                    totalContratado,
                  )
                }
              />

              <InfoNumero
                label="Total recebido"
                valor={
                  moeda(
                    totalRecebido,
                  )
                }
              />

            </div>

            {liberacaoAtiva && (
              <div className="mt-4 rounded-[18px] border border-sky-200 bg-sky-50 p-4">

                <div className="flex items-start gap-3">

                  <ShieldCheck
                    size={18}
                    className="mt-0.5 shrink-0 text-sky-700"
                  />

                  <div>
                    <p className="text-[9px] font-black text-sky-800">
                      Exceção gerencial ativa
                    </p>

                    <p className="mt-1 text-[10px] leading-5 text-sky-700/75">
                      {liberacaoAtiva.motivo}
                    </p>

                    <p className="mt-2 text-[8px] font-black text-sky-700">
                      Válida até {dataHora(liberacaoAtiva.validoAte)}
                    </p>
                  </div>

                </div>

              </div>
            )}

            <Link
              href={`/admin/credito?cliente=${cliente.id}`}
              className="mt-5 flex h-[50px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#176f3c] text-[10px] font-black text-white"
            >
              <CreditCard size={16} />
              Abrir Gestão de Crédito
              <ChevronRight size={15} />
            </Link>

          </div>

        </section>

        {/* =================================================
            CONTRATOS + OPERAÇÃO
        ================================================= */}

        <section className="mt-5 grid gap-5 xl:grid-cols-2">

          <div className="card-premium rounded-[30px] p-6">

            <div className="flex items-start justify-between gap-4">

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                  Financeiro
                </p>

                <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                  Contratos e carteira
                </h3>
              </div>

              <WalletCards
                size={22}
                className="text-[#176f3c]"
              />

            </div>

            <div className="mt-5 space-y-3">

              {contratos.length === 0 ? (
                <Empty
                  titulo="Nenhum contrato"
                  descricao="Este cliente ainda não possui parcelado ou saldo em aberto."
                />
              ) : (
                contratos
                  .slice(
                    0,
                    4,
                  )
                  .map(
                    (
                      contrato,
                    ) => {
                      const parcelasContrato =
                        parcelas.filter(
                          (item) =>
                            item.contrato_id ===
                            contrato.id,
                        );

                      const pagas =
                        parcelasContrato.filter(
                          (item) =>
                            item.status ===
                            "PAGA",
                        ).length;

                      return (
                        <div
                          key={
                            contrato.id
                          }
                          className="rounded-[20px] border border-slate-100 bg-[#fbfdfb] p-4"
                        >

                          <div className="flex items-start justify-between gap-4">

                            <div>
                              <p className="text-[10px] font-black text-[#176f3c]">
                                {contrato.codigo}
                              </p>

                              <p className="mt-1 text-[9px] text-slate-400">
                                {contrato.modalidade === "SALDO_ABERTO" ? "Saldo flexível" : "Parcelado"} • início {dataBR(contrato.data_inicio)}
                              </p>
                            </div>

                            <span className={`rounded-full px-3 py-1.5 text-[7px] font-black uppercase ${
                              contrato.status ===
                              "QUITADO"
                                ? "bg-emerald-100 text-emerald-700"
                                : contrato.status ===
                                  "CANCELADO"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}>
                              {contrato.status}
                            </span>

                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-2">

                            <Mini
                              label="Valor"
                              valor={
                                moeda(
                                  Number(
                                    contrato.valor_total,
                                  ),
                                )
                              }
                            />

                            <Mini
                              label={
                                contrato.modalidade === "SALDO_ABERTO"
                                  ? "Cobrança"
                                  : "Parcelas"
                              }
                              valor={
                                contrato.modalidade === "SALDO_ABERTO"
                                  ? (contrato.status === "QUITADO" ? "Quitado" : "Flexível")
                                  : `${pagas}/${parcelasContrato.length}`
                              }
                            />

                            <Mini
                              label={
                                contrato.modalidade === "SALDO_ABERTO"
                                  ? "Próx. visita"
                                  : "1º venc."
                              }
                              valor={
                                dataBR(
                                  contrato.modalidade === "SALDO_ABERTO"
                                    ? contrato.proxima_visita_sugerida
                                    : contrato.primeiro_vencimento,
                                )
                              }
                            />

                          </div>

                        </div>
                      );
                    },
                  )
              )}

            </div>

          </div>

          <div className="card-premium rounded-[30px] p-6">

            <div className="flex items-start justify-between gap-4">

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                  Operação
                </p>

                <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                  Entregas e ocorrências
                </h3>
              </div>

              <PackageCheck
                size={22}
                className="text-[#176f3c]"
              />

            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">

              <InfoNumero
                label="Entregas concluídas"
                valor={
                  String(
                    entregasConcluidas.length,
                  )
                }
              />

              <InfoNumero
                label="Cestas entregues"
                valor={
                  String(
                    quantidadeEntregue,
                  )
                }
              />

              <InfoNumero
                label="Ocorrências"
                valor={
                  String(
                    ocorrencias.length,
                  )
                }
                alerta={
                  ocorrencias.length >
                  0
                }
              />

              <InfoNumero
                label="Reagendar"
                valor={
                  String(
                    ocorrenciasReagendar,
                  )
                }
                alerta={
                  ocorrenciasReagendar >
                  0
                }
              />

            </div>

            <div className="mt-4 space-y-3">

              {ocorrencias
                .slice(
                  0,
                  3,
                )
                .map(
                  (
                    item,
                  ) => (
                    <div
                      key={
                        item.id
                      }
                      className="rounded-[18px] border border-amber-100 bg-amber-50/70 p-4"
                    >

                      <div className="flex items-start gap-3">

                        <AlertTriangle
                          size={17}
                          className="mt-0.5 shrink-0 text-amber-600"
                        />

                        <div>
                          <p className="text-[10px] font-black text-amber-900">
                            {textoOcorrencia(item.tipo)}
                          </p>

                          <p className="mt-1 text-[9px] leading-5 text-amber-800/65">
                            {item.descricao ??
                              "Sem observação."}
                          </p>

                          <p className="mt-1 text-[8px] text-amber-700/60">
                            {dataHora(item.created_at)}
                          </p>
                        </div>

                      </div>

                    </div>
                  ),
                )}

              {ocorrencias.length ===
                0 && (
                <Empty
                  titulo="Operação limpa"
                  descricao="Nenhuma ocorrência registrada para este cliente."
                />
              )}

            </div>

          </div>

        </section>

        {/* =================================================
            HISTÓRICO DE ENDEREÇOS
        ================================================= */}

        <section className="card-premium mt-5 rounded-[30px] p-6">

          <div className="flex items-start justify-between gap-4">

            <div className="flex items-start gap-3">

              <div className="icon-emerald flex h-12 w-12 items-center justify-center rounded-[16px]">
                <MapPin size={21} />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                  Endereços
                </p>

                <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                  Histórico de localização
                </h3>

                <p className="mt-1 text-[9px] text-slate-400">
                  Alterações futuras não modificam o endereço congelado de rotas já criadas.
                </p>
              </div>

            </div>

            <span className="rounded-full bg-emerald-50 px-3 py-2 text-[8px] font-black text-[#176f3c]">
              {enderecos.length} versão(ões)
            </span>

          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">

            {enderecos.length === 0 ? (
              <Empty
                titulo="Sem histórico de endereço"
                descricao="O primeiro endereço aparecerá automaticamente após a próxima atualização."
              />
            ) : (
              enderecos.map(
                (item) => {
                  const linha1 =
                    [
                      item.logradouro,
                      item.numero,
                    ]
                      .filter(Boolean)
                      .join(", ");

                  const linha2 =
                    [
                      item.bairro,
                      item.cidade,
                      item.uf,
                    ]
                      .filter(Boolean)
                      .join(" • ");

                  return (
                    <div
                      key={item.id}
                      className={`relative overflow-hidden rounded-[20px] border p-4 ${
                        item.ativo
                          ? "border-emerald-200 bg-[linear-gradient(145deg,#f1fbf5,#ffffff)]"
                          : "border-slate-100 bg-[#fbfdfb]"
                      }`}
                    >

                      {item.ativo && (
                        <div className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#16a05d,#8ee9b2)]" />
                      )}

                      <div className="flex items-start justify-between gap-4">

                        <div className="flex min-w-0 items-start gap-3">

                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${
                            item.ativo
                              ? "bg-[#176f3c] text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            <MapPin size={17} />
                          </div>

                          <div className="min-w-0">
                            <p className="text-[11px] font-black">
                              {linha1 || "Endereço não informado"}
                            </p>

                            <p className="mt-1 text-[9px] text-slate-400">
                              {linha2 || "Localização complementar não informada"}
                            </p>

                            {item.cep && (
                              <p className="mt-1 text-[8px] font-bold text-slate-400">
                                CEP {item.cep}
                              </p>
                            )}
                          </div>

                        </div>

                        <span className={`shrink-0 rounded-full px-3 py-1.5 text-[7px] font-black uppercase ${
                          item.ativo
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {item.ativo
                            ? "Atual"
                            : "Anterior"}
                        </span>

                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">

                        <Mini
                          label="Válido desde"
                          valor={dataHora(item.valido_de)}
                        />

                        <Mini
                          label="Válido até"
                          valor={
                            item.valido_ate
                              ? dataHora(item.valido_ate)
                              : "Atual"
                          }
                        />

                      </div>

                      <p className="mt-3 text-[8px] leading-4 text-slate-400">
                        {item.motivo ?? "Alteração registrada automaticamente."}
                      </p>

                    </div>
                  );
                },
              )
            )}

          </div>

        </section>

        {/* V67_ROTAS_CLIENTE_360_UI */}
        <section className="card-premium mt-5 rounded-[30px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="icon-emerald flex h-12 w-12 items-center justify-center rounded-[16px]">
                <Route size={21} />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                  Jornada operacional
                </p>
                <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                  Rotas do cliente
                </h3>
                <p className="mt-1 text-[9px] text-slate-400">
                  Participações recentes, sequência da parada e endereço congelado no planejamento.
                </p>
              </div>
            </div>

            <Link
              href="/admin/rotas"
              className="flex h-10 items-center gap-2 rounded-[13px] border border-emerald-100 bg-white px-4 text-[8px] font-black text-[#176f3c]"
            >
              Ver todas as rotas
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <Mini
              label="Participações"
              valor={String(historicoRotas.length)}
            />
            <Mini
              label="Ativas"
              valor={String(rotasAtivasCliente)}
            />
            <Mini
              label="Concluídas"
              valor={String(paradasConcluidasCliente)}
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-[18px] border border-slate-100">
            {historicoRotas.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-[10px] font-black text-slate-600">
                  Nenhuma rota registrada
                </p>
                <p className="mt-1 text-[8px] text-slate-400">
                  Quando este cliente entrar em uma rota, o histórico operacional aparecerá aqui.
                </p>
              </div>
            ) : (
              historicoRotas
                .slice(0, 8)
                .map(({ rota, parada }, index) => {
                  const enderecoCongelado =
                    [
                      [
                        parada.endereco_logradouro,
                        parada.endereco_numero,
                      ]
                        .filter(Boolean)
                        .join(", "),
                      [
                        parada.endereco_bairro,
                        parada.endereco_cidade,
                        parada.endereco_uf,
                      ]
                        .filter(Boolean)
                        .join(" • "),
                    ]
                      .filter(Boolean)
                      .join(" • ");

                  const rotaLabel =
                    statusRotaLabel[
                      rota.status
                    ] ??
                    rota.status;

                  const paradaLabel =
                    statusParadaLabel[
                      parada.status
                    ] ??
                    parada.status;

                  return (
                    <div
                      key={parada.id}
                      className={`grid gap-3 px-4 py-3 md:grid-cols-[1.15fr_.75fr_.75fr_1.55fr_auto] md:items-center ${
                        index > 0
                          ? "border-t border-slate-100"
                          : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-black text-slate-700">
                          {rota.codigo}
                        </p>
                        <p className="mt-0.5 text-[8px] font-medium text-slate-400">
                          {dataBR(rota.data_rota)}
                          {" • "}
                          parada nº {parada.sequencia}
                        </p>
                      </div>

                      <div>
                        <p className="text-[7px] font-black uppercase tracking-[0.08em] text-slate-400">
                          Rota
                        </p>
                        <p className="mt-0.5 text-[9px] font-bold text-slate-600">
                          {rotaLabel}
                        </p>
                      </div>

                      <div>
                        <p className="text-[7px] font-black uppercase tracking-[0.08em] text-slate-400">
                          Atendimento
                        </p>
                        <p className="mt-0.5 text-[9px] font-bold text-slate-600">
                          {paradaLabel}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[7px] font-black uppercase tracking-[0.08em] text-slate-400">
                          Endereço planejado
                        </p>
                        <p className="mt-0.5 truncate text-[9px] font-semibold text-slate-600">
                          {enderecoCongelado ||
                            "Endereço não informado"}
                        </p>
                      </div>

                      <Link
                        href={`/admin/rotas/${rota.id}`}
                        className="flex h-9 items-center justify-center rounded-[11px] bg-[#176f3c] px-3 text-[8px] font-black text-white"
                      >
                        Abrir
                      </Link>
                    </div>
                  );
                })
            )}
          </div>
        </section>

        {/* V57_TIMELINE_INTELIGENTE */}
        <TimelineCliente timeline={timeline} />

      </div>

    </main>
  );
}

/* =========================================================
   COMPONENTES
========================================================= */

function CreditoHeroBadge({
  status,
}: {
  status:
    | "LIBERADO"
    | "ALERTA"
    | "BLOQUEADO"
    | "LIBERADO_EXCECAO";
}) {
  if (
    status ===
    "BLOQUEADO"
  ) {
    return (
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-100 px-4 py-2 text-[8px] font-black uppercase text-red-700">
        <ShieldAlert size={12} />
        Bloqueado
      </span>
    );
  }

  if (
    status ===
    "ALERTA"
  ) {
    return (
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#f4b13f] px-4 py-2 text-[8px] font-black uppercase text-[#4d3100]">
        <AlertTriangle size={12} />
        Alerta
      </span>
    );
  }

  if (
    status ===
    "LIBERADO_EXCECAO"
  ) {
    return (
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-sky-100 px-4 py-2 text-[8px] font-black uppercase text-sky-700">
        <ShieldCheck size={12} />
        Exceção
      </span>
    );
  }

  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[8px] font-black uppercase text-[#176f3c]">
      <CheckCircle2 size={12} />
      Liberado
    </span>
  );
}

function HeroKpi({
  label,
  valor,
  alerta = false,
}: {
  label: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-[19px] border border-white/10 bg-white/[0.07] px-4 py-3.5 backdrop-blur">
      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>

      <p className={`mt-1.5 truncate text-[15px] font-black ${
        alerta
          ? "text-[#ffd67d]"
          : "text-white"
      }`}>
        {valor}
      </p>
    </div>
  );
}

function ResumoCard({
  icon,
  label,
  valor,
  detalhe,
  alerta = false,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
  detalhe: string;
  alerta?: boolean;
}) {
  return (
    <div className="card-premium rounded-[24px] p-5">

      <div className="flex items-start justify-between">

        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>

          <p className={`mt-2 text-[27px] font-black tracking-[-0.05em] ${
            alerta
              ? "text-amber-700"
              : ""
          }`}>
            {valor}
          </p>
        </div>

        <div className={`flex h-10 w-10 items-center justify-center rounded-[14px] ${
          alerta
            ? "bg-amber-50 text-amber-700"
            : "bg-emerald-50 text-[#176f3c]"
        }`}>
          {icon}
        </div>

      </div>

      <p className="mt-3 text-[9px] leading-4 text-slate-400">
        {detalhe}
      </p>

    </div>
  );
}

function Info({
  label,
  valor,
}: {
  label: string;
  valor: string;
}) {
  return (
    <div className="rounded-[17px] border border-slate-100 bg-[#fbfdfb] px-4 py-3.5">

      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 break-words text-[11px] font-black">
        {valor}
      </p>

    </div>
  );
}

function InfoNumero({
  label,
  valor,
  alerta = false,
}: {
  label: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <div className={`rounded-[17px] border px-4 py-3.5 ${
      alerta
        ? "border-amber-200 bg-amber-50"
        : "border-slate-100 bg-white/90"
    }`}>

      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p className={`mt-1.5 text-[15px] font-black ${
        alerta
          ? "text-amber-700"
          : ""
      }`}>
        {valor}
      </p>

    </div>
  );
}

function Mini({
  label,
  valor,
}: {
  label: string;
  valor: string;
}) {
  return (
    <div className="rounded-[14px] border border-slate-100 bg-white px-3 py-2.5">

      <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-[9px] font-black">
        {valor}
      </p>

    </div>
  );
}

function Empty({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao: string;
}) {
  return (
    <div className="rounded-[20px] bg-[#f6f9f6] p-6 text-center">

      <Sparkles
        size={20}
        className="mx-auto text-[#176f3c]"
      />

      <p className="mt-3 text-[11px] font-black">
        {titulo}
      </p>

      <p className="mt-1 text-[9px] leading-4 text-slate-400">
        {descricao}
      </p>

    </div>
  );
}

function Timeline({
  item,
}: {
  item: {
    data: string;
    tipo:
      | "CONTRATO"
      | "VENDA"
      | "PAGAMENTO"
      | "ENTREGA"
      | "OCORRENCIA"
      | "CREDITO";
    titulo: string;
    descricao: string;
    valor?: string;
  };
}) {
  const config = {
    CONTRATO: {
      icon:
        <FileText size={15} />,
      classe:
        "bg-sky-100 text-sky-700",
    },

    VENDA: {
      icon:
        <WalletCards size={15} />,
      classe:
        "bg-cyan-100 text-cyan-700",
    },

    PAGAMENTO: {
      icon:
        <Banknote size={15} />,
      classe:
        "bg-emerald-100 text-emerald-700",
    },

    ENTREGA: {
      icon:
        <PackageCheck size={15} />,
      classe:
        "bg-[#eaf5ed] text-[#176f3c]",
    },

    OCORRENCIA: {
      icon:
        <AlertTriangle size={15} />,
      classe:
        "bg-amber-100 text-amber-700",
    },

    CREDITO: {
      icon:
        <ShieldCheck size={15} />,
      classe:
        "bg-violet-100 text-violet-700",
    },
  }[item.tipo];

  return (
    <div className="relative z-10 flex gap-4">

      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ring-4 ring-white ${config.classe}`}>
        {config.icon}
      </div>

      <div className="min-w-0 flex-1 rounded-[20px] border border-black/[0.04] bg-white p-4 shadow-[0_10px_30px_rgba(17,63,33,0.05)]">

        <div className="flex items-start justify-between gap-4">

          <div className="min-w-0">
            <p className="truncate text-[11px] font-black">
              {item.titulo}
            </p>

            <p className="mt-1 text-[9px] leading-4 text-slate-400">
              {item.descricao}
            </p>
          </div>

          {item.valor && (
            <p className="shrink-0 text-[11px] font-black text-[#176f3c]">
              {item.valor}
            </p>
          )}

        </div>

        <div className="mt-2 flex items-center gap-1.5 text-[8px] font-semibold text-slate-400">
          <Clock3 size={11} />
          {dataHora(item.data)}
        </div>

      </div>

    </div>
  );
}
