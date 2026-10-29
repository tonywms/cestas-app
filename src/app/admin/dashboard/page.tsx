export const instant = false;

import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Clock3,
  CreditCard,
  MapPinned,
  PackageCheck,
  Route,
  Truck,
  UserRound,
  UsersRound,
} from "lucide-react";

import {
  Hero,
  Kpi,
  KpiGrid,
  ModuleHeader,
  QuickLink,
  formatMoney,
} from "@/components/admin/PremiumModuleUi";

import {
  getCurrentUserProfile,
} from "@/lib/auth/get-current-user";

import {
  createClient,
} from "@/lib/supabase/server";

type PageProps = {
  searchParams:
    Promise<{
      periodo?: string;
    }>;
};

function hojeFortaleza() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Fortaleza",
      year:
        "numeric",
      month:
        "2-digit",
      day:
        "2-digit",
    },
  ).format(
    new Date(),
  );
}

function deslocarData(
  dataTexto: string,
  dias: number,
) {
  const data =
    new Date(
      `${dataTexto}T12:00:00Z`,
    );

  data.setUTCDate(
    data.getUTCDate() +
      dias,
  );

  return data
    .toISOString()
    .slice(
      0,
      10,
    );
}

function dataLocal(
  valor:
    string |
    null,
) {
  if (!valor) {
    return null;
  }

  const data =
    new Date(
      valor,
    );

  if (
    Number.isNaN(
      data.getTime(),
    )
  ) {
    return valor.slice(
      0,
      10,
    );
  }

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Fortaleza",
      year:
        "numeric",
      month:
        "2-digit",
      day:
        "2-digit",
    },
  ).format(
    data,
  );
}

function dataHora(
  valor:
    string |
    null,
) {
  if (!valor) {
    return "—";
  }

  const data =
    new Date(
      valor,
    );

  if (
    Number.isNaN(
      data.getTime(),
    )
  ) {
    return valor;
  }

  return data.toLocaleString(
    "pt-BR",
    {
      timeZone:
        "America/Fortaleza",
      day:
        "2-digit",
      month:
        "2-digit",
      year:
        "numeric",
      hour:
        "2-digit",
      minute:
        "2-digit",
    },
  );
}

function percentual(
  parte: number,
  total: number,
) {
  if (
    total <=
    0
  ) {
    return 0;
  }

  return Math.round(
    (
      parte /
      total
    ) *
      100,
  );
}

function statusRotaLabel(
  status: string,
) {
  switch (
    status
  ) {
    case "PLANEJADA":
      return "Planejada";
    case "EM_ROTA":
      return "Em rota";
    case "FINALIZADA":
      return "Finalizada";
    default:
      return status;
  }
}

export default async function DashboardPage({
  searchParams,
}: PageProps) {
  const usuario =
    await getCurrentUserProfile();

  if (
    !usuario ||
    !usuario.ativo
  ) {
    redirect(
      "/",
    );
  }

  if (
    usuario.perfilCodigo ===
    "ENTREGADOR"
  ) {
    redirect(
      "/mobile",
    );
  }

  const filtros =
    await searchParams;

  const periodo =
    filtros.periodo ===
      "7" ||
    filtros.periodo ===
      "90"
      ? Number(
          filtros.periodo,
        )
      : 30;

  const hoje =
    hojeFortaleza();

  const inicio =
    deslocarData(
      hoje,
      -(
        periodo -
        1
      ),
    );

  const inicioIso =
    `${inicio}T00:00:00-03:00`;

  const fimIso =
    `${hoje}T23:59:59-03:00`;

  const supabase =
    await createClient();

  const [
    clientesResult,
    estoqueResult,
    rotasResult,
    rotaClientesResult,
    entregasResult,
    entregaItensResult,
    ocorrenciasResult,
    parcelasResult,
    pagamentosResult,
    cargasResult,
    volumesEmCargaResult,
    volumesDisponiveisResult,
    volumesEntreguesResult,
    volumesRetornadosResult,
    volumesAvariadosResult,
    volumesTotalResult,
    membrosResult,
  ] =
    await Promise.all([
      supabase
        .from("clientes")
        .select(`
          id,
          codigo,
          nome,
          ativo
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        ),

      supabase
        .from(
          "estoque_central_saldos",
        )
        .select(`
          tipo_cesta_id,
          quantidade,
          estoque_minimo,
          updated_at,
          tipos_cesta!inner (
            codigo,
            nome
          )
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        ),

      supabase
        .from("rotas")
        .select(`
          id,
          codigo,
          data_rota,
          status,
          entregador_id,
          iniciada_at,
          finalizada_at,
          created_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .gte(
          "data_rota",
          inicio,
        )
        .lte(
          "data_rota",
          hoje,
        )
        .order(
          "data_rota",
          {
            ascending:
              false,
          },
        ),

      supabase
        .from(
          "rota_clientes",
        )
        .select(`
          id,
          rota_id,
          cliente_id,
          status,
          atendido_at,
          created_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .gte(
          "created_at",
          inicioIso,
        )
        .lte(
          "created_at",
          fimIso,
        ),

      supabase
        .from("entregas")
        .select(`
          id,
          carga_id,
          entregador_id,
          cliente_id,
          status,
          entregue_at,
          created_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .gte(
          "entregue_at",
          inicioIso,
        )
        .lte(
          "entregue_at",
          fimIso,
        )
        .order(
          "entregue_at",
          {
            ascending:
              false,
          },
        ),

      supabase
        .from(
          "entrega_itens",
        )
        .select(`
          entrega_id,
          quantidade,
          created_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .gte(
          "created_at",
          inicioIso,
        )
        .lte(
          "created_at",
          fimIso,
        ),

      supabase
        .from(
          "ocorrencias",
        )
        .select(`
          id,
          rota_id,
          cliente_id,
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
        .gte(
          "created_at",
          inicioIso,
        )
        .lte(
          "created_at",
          fimIso,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        ),

      supabase
        .from("parcelas")
        .select(`
          id,
          cliente_id,
          vencimento,
          valor,
          valor_pago,
          status
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .in(
          "status",
          [
            "ABERTA",
            "PARCIAL",
          ],
        ),

      supabase
        .from(
          "pagamentos",
        )
        .select(`
          id,
          cliente_id,
          recebido_por,
          valor,
          forma_pagamento,
          created_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .gte(
          "created_at",
          inicioIso,
        )
        .lte(
          "created_at",
          fimIso,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        ),

      supabase
        .from("cargas")
        .select(`
          id,
          codigo,
          status,
          data_carga,
          entregador_id,
          recebida_at,
          finalizada_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .gte(
          "data_carga",
          inicio,
        )
        .lte(
          "data_carga",
          hoje,
        ),

      supabase
        .from("cesta_volumes")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", usuario.empresa.id)
        .eq("status", "EM_CARGA"),

      supabase
        .from("cesta_volumes")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", usuario.empresa.id)
        .eq("status", "DISPONIVEL"),

      supabase
        .from("cesta_volumes")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", usuario.empresa.id)
        .eq("status", "ENTREGUE"),

      supabase
        .from("cesta_volumes")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", usuario.empresa.id)
        .eq("status", "RETORNADO"),

      supabase
        .from("cesta_volumes")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", usuario.empresa.id)
        .eq("status", "AVARIADO"),

      supabase
        .from("cesta_volumes")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", usuario.empresa.id),

      supabase
        .from(
          "empresa_usuarios",
        )
        .select(`
          usuario_id,
          ativo,
          usuarios!inner (
            id,
            nome,
            ativo
          ),
          perfis!inner (
            codigo,
            nome
          )
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        ),
    ]);

  const clientes =
    clientesResult.data ??
    [];

  const estoque =
    estoqueResult.data ??
    [];

  const rotas =
    rotasResult.data ??
    [];

  const rotaClientes =
    rotaClientesResult.data ??
    [];

  const entregas =
    entregasResult.data ??
    [];

  const entregaItens =
    entregaItensResult.data ??
    [];

  const ocorrencias =
    ocorrenciasResult.data ??
    [];

  const parcelas =
    parcelasResult.data ??
    [];

  const pagamentos =
    pagamentosResult.data ??
    [];

  const cargas =
    cargasResult.data ??
    [];

  const volumesEmCarga =
    volumesEmCargaResult.count ??
    0;

  const volumesDisponiveis =
    volumesDisponiveisResult.count ??
    0;

  const volumesEntregues =
    volumesEntreguesResult.count ??
    0;

  const volumesRetornados =
    volumesRetornadosResult.count ??
    0;

  const volumesAvariados =
    volumesAvariadosResult.count ??
    0;

  const volumesTotal =
    volumesTotalResult.count ??
    0;

  const modoVolume =
    usuario.configuracao
      .modoControleCarga ===
    "VOLUME";

  const membros =
    membrosResult.data ??
    [];

  const clientesMap =
    new Map(
      clientes.map(
        (
          cliente,
        ) => [
          Number(
            cliente.id,
          ),
          String(
            cliente.nome,
          ),
        ],
      ),
    );

  const usuariosMap =
    new Map<
      string,
      string
    >();

  for (
    const membro of
      membros
  ) {
    const raw =
      membro.usuarios;

    const pessoa =
      Array.isArray(
        raw,
      )
        ? raw[0]
        : raw;

    if (
      pessoa?.id
    ) {
      usuariosMap.set(
        String(
          pessoa.id,
        ),
        String(
          pessoa.nome,
        ),
      );
    }
  }

  const clientesAtivos =
    clientes.filter(
      (
        cliente,
      ) =>
        cliente.ativo,
    ).length;

  const estoqueTotal =
    estoque.reduce(
      (
        total,
        item,
      ) =>
        total +
        Number(
          item.quantidade ??
            0,
        ),
      0,
    );

  const estoqueAbaixo =
    estoque.filter(
      (
        item,
      ) =>
        Number(
          item.quantidade ??
            0,
        ) <=
        Number(
          item.estoque_minimo ??
            0,
        ),
    ).length;

  const estoqueZerado =
    estoque.filter(
      (
        item,
      ) =>
        Number(
          item.quantidade ??
            0,
        ) <=
        0,
    ).length;

  const rotasPlanejadas =
    rotas.filter(
      (
        rota,
      ) =>
        rota.status ===
        "PLANEJADA",
    ).length;

  const rotasEmRota =
    rotas.filter(
      (
        rota,
      ) =>
        rota.status ===
        "EM_ROTA",
    ).length;

  const rotasFinalizadas =
    rotas.filter(
      (
        rota,
      ) =>
        rota.status ===
        "FINALIZADA",
    ).length;

  const paradasEntregues =
    rotaClientes.filter(
      (
        parada,
      ) =>
        parada.status ===
        "ENTREGUE",
    ).length;

  const paradasAusentes =
    rotaClientes.filter(
      (
        parada,
      ) =>
        parada.status ===
        "AUSENTE",
    ).length;

  const paradasPendentes =
    rotaClientes.filter(
      (
        parada,
      ) =>
        parada.status ===
        "PENDENTE",
    ).length;

  const paradasProcessadas =
    paradasEntregues +
    paradasAusentes;

  const taxaEntrega =
    percentual(
      paradasEntregues,
      paradasProcessadas,
    );

  const entregasConcluidas =
    entregas.filter(
      (
        entrega,
      ) =>
        entrega.status ===
        "CONCLUIDA",
    ).length;

  const cestasEntregues =
    entregaItens.reduce(
      (
        total,
        item,
      ) =>
        total +
        Number(
          item.quantidade ??
            0,
        ),
      0,
    );

  const reagendamentos =
    ocorrencias.filter(
      (
        ocorrencia,
      ) =>
        ocorrencia.requer_reagendamento,
    ).length;

  const cargasAbertas =
    cargas.filter(
      (
        carga,
      ) =>
        carga.status !==
        "FINALIZADA",
    ).length;

  const saldoAberto =
    parcelas.reduce(
      (
        total,
        parcela,
      ) =>
        total +
        Math.max(
          0,
          Number(
            parcela.valor ??
              0,
          ) -
            Number(
              parcela.valor_pago ??
                0,
            ),
        ),
      0,
    );

  const parcelasVencidas =
    parcelas.filter(
      (
        parcela,
      ) => {
        const saldo =
          Math.max(
            0,
            Number(
              parcela.valor ??
                0,
            ) -
              Number(
                parcela.valor_pago ??
                  0,
              ),
          );

        return (
          saldo >
            0 &&
          String(
            parcela.vencimento,
          ) <
            hoje
        );
      },
    );

  const saldoVencido =
    parcelasVencidas.reduce(
      (
        total,
        parcela,
      ) =>
        total +
        Math.max(
          0,
          Number(
            parcela.valor ??
              0,
          ) -
            Number(
              parcela.valor_pago ??
                0,
            ),
        ),
      0,
    );

  const recebidoPeriodo =
    pagamentos.reduce(
      (
        total,
        pagamento,
      ) =>
        total +
        Number(
          pagamento.valor ??
            0,
        ),
      0,
    );

  const usuariosAtivos =
    membros.filter(
      (
        membro,
      ) => {
        const raw =
          membro.usuarios;

        const pessoa =
          Array.isArray(
            raw,
          )
            ? raw[0]
            : raw;

        return (
          membro.ativo &&
          pessoa?.ativo
        );
      },
    ).length;

  const entregadoresAtivos =
    membros.filter(
      (
        membro,
      ) => {
        const rawUsuario =
          membro.usuarios;

        const pessoa =
          Array.isArray(
            rawUsuario,
          )
            ? rawUsuario[0]
            : rawUsuario;

        const rawPerfil =
          membro.perfis;

        const perfil =
          Array.isArray(
            rawPerfil,
          )
            ? rawPerfil[0]
            : rawPerfil;

        return (
          membro.ativo &&
          pessoa?.ativo &&
          perfil?.codigo ===
            "ENTREGADOR"
        );
      },
    ).length;

  const ultimosDias =
    Array.from(
      {
        length:
          Math.min(
            7,
            periodo,
          ),
      },
      (
        _,
        index,
      ) =>
        deslocarData(
          hoje,
          -(
            Math.min(
              7,
              periodo,
            ) -
            1 -
            index
          ),
        ),
    );

  const serie =
    ultimosDias.map(
      (
        data,
      ) => {
        const entregasDia =
          entregas.filter(
            (
              entrega,
            ) =>
              dataLocal(
                entrega.entregue_at,
              ) ===
              data,
          ).length;

        const ocorrenciasDia =
          ocorrencias.filter(
            (
              ocorrencia,
            ) =>
              dataLocal(
                ocorrencia.created_at,
              ) ===
              data,
          ).length;

        const recebidoDia =
          pagamentos
            .filter(
              (
                pagamento,
              ) =>
                dataLocal(
                  pagamento.created_at,
                ) ===
                data,
            )
            .reduce(
              (
                total,
                pagamento,
              ) =>
                total +
                Number(
                  pagamento.valor ??
                    0,
                ),
              0,
            );

        return {
          data,
          entregas:
            entregasDia,
          ocorrencias:
            ocorrenciasDia,
          recebido:
            recebidoDia,
        };
      },
    );

  const maxEntregas =
    Math.max(
      1,
      ...serie.map(
        (
          item,
        ) =>
          item.entregas,
      ),
    );

  const atividade =
    [
      ...entregas.map(
        (
          entrega,
        ) => ({
          tipo:
            "ENTREGA" as const,
          data:
            entrega.entregue_at ??
            entrega.created_at,
          titulo:
            `Entrega para ${clientesMap.get(Number(entrega.cliente_id)) ?? "Cliente"}`,
          detalhe:
            usuariosMap.get(
              String(
                entrega.entregador_id,
              ),
            ) ??
            "Entregador",
        }),
      ),

      ...ocorrencias.map(
        (
          ocorrencia,
        ) => ({
          tipo:
            "OCORRENCIA" as const,
          data:
            ocorrencia.created_at,
          titulo:
            ocorrencia.tipo ||
            "Ocorrência",
          detalhe:
            clientesMap.get(
              Number(
                ocorrencia.cliente_id,
              ),
            ) ??
            "Cliente",
        }),
      ),

      ...pagamentos.map(
        (
          pagamento,
        ) => ({
          tipo:
            "PAGAMENTO" as const,
          data:
            pagamento.created_at,
          titulo:
            `Pagamento de ${formatMoney(Number(pagamento.valor ?? 0))}`,
          detalhe:
            clientesMap.get(
              Number(
                pagamento.cliente_id,
              ),
            ) ??
            "Cliente",
        }),
      ),
    ]
      .sort(
        (
          a,
          b,
        ) =>
          new Date(
            b.data ??
              0,
          ).getTime() -
          new Date(
            a.data ??
              0,
          ).getTime(),
      )
      .slice(
        0,
        8,
      );

  const alertas = [
    {
      titulo:
        "Estoque abaixo do mínimo",
      valor:
        estoqueAbaixo,
      detalhe:
        `${estoqueZerado} tipo(s) zerado(s)`,
      href:
        "/admin/estoque?estoque=baixo",
      alerta:
        estoqueAbaixo >
        0,
    },
    {
      titulo:
        "Parcelas vencidas",
      valor:
        parcelasVencidas.length,
      detalhe:
        formatMoney(
          saldoVencido,
        ),
      href:
        "/admin/financeiro?faixa=vencidas",
      alerta:
        parcelasVencidas.length >
        0,
    },
    {
      titulo:
        "Ocorrências no período",
      valor:
        ocorrencias.length,
      detalhe:
        `${reagendamentos} com reagendamento`,
      href:
        "/admin/rotas",
      alerta:
        ocorrencias.length >
        0,
    },
    {
      titulo:
        "Cargas em aberto",
      valor:
        cargasAbertas,
      detalhe:
        `${cargas.length} carga(s) no período`,
      href:
        "/admin/cargas",
      alerta:
        cargasAbertas >
        0,
    },
  ];

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto max-w-[1280px]">
        <ModuleHeader
          eyebrow="Executivo"
          title="Dashboard da operação"
          actions={
            <Link
              href="/admin"
              className="rounded-[14px] border border-emerald-100 bg-white px-4 py-3 text-[12px] font-extrabold text-emerald-800"
            >
              Central de Gestão
            </Link>
          }
        />

        <Hero
          eyebrow="Visão consolidada"
          title="A empresa em uma única tela."
          description={`Indicadores reais de ${inicio.split("-").reverse().join("/")} até ${hoje.split("-").reverse().join("/")}.`}
        >
          <KpiGrid>
            <Kpi
              label="Clientes ativos"
              value={
                clientesAtivos
              }
            />

            <Kpi
              label="Estoque central"
              value={
                estoqueTotal
              }
              warning={
                estoqueAbaixo >
                0
              }
            />

            <Kpi
              label="Entregas"
              value={
                entregasConcluidas
              }
              highlight
              subtitle={`${cestasEntregues} cesta(s)`}
            />

            <Kpi
              label="Taxa de entrega"
              value={`${taxaEntrega}%`}
              warning={
                taxaEntrega <
                  90 &&
                paradasProcessadas >
                  0
              }
            />

            <Kpi
              label="A receber"
              value={
                formatMoney(
                  saldoAberto,
                )
              }
            />

            <Kpi
              label="Vencido"
              value={
                formatMoney(
                  saldoVencido,
                )
              }
              warning={
                saldoVencido >
                0
              }
            />
          </KpiGrid>
        </Hero>

        <section className="mt-6 rounded-[26px] border border-white/90 bg-white/80 p-4 shadow-[0_16px_40px_rgba(17,63,33,0.06)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
                Período
              </p>

              <p className="mt-1 text-[13px] font-bold text-slate-500">
                Todos os indicadores abaixo respeitam o intervalo selecionado, exceto saldos atuais.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <QuickLink
                href="/admin/dashboard?periodo=7"
                active={
                  periodo ===
                  7
                }
              >
                7 dias
              </QuickLink>

              <QuickLink
                href="/admin/dashboard?periodo=30"
                active={
                  periodo ===
                  30
                }
              >
                30 dias
              </QuickLink>

              <QuickLink
                href="/admin/dashboard?periodo=90"
                active={
                  periodo ===
                  90
                }
              >
                90 dias
              </QuickLink>
            </div>
          </div>
        </section>

        <section className="mt-7 card-premium overflow-hidden rounded-[30px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
                Estoque em movimento
              </p>

              <h2 className="mt-1 text-[24px] font-black tracking-[-0.04em]">
                Pulso da operação
              </h2>

              <p className="mt-1 max-w-2xl text-[12px] text-slate-500">
                {modoVolume
                  ? "Visão atual dos volumes físicos: em rua, entregues, retornados e avariados."
                  : "Esta empresa trabalha por quantidade. O estoque móvel é acompanhado pelas cargas e entregas, sem QR Code individual."}
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                href="/admin/cargas"
                className="flex h-[44px] items-center gap-2 rounded-[14px] bg-emerald-50 px-4 text-[11px] font-extrabold text-emerald-800"
              >
                <Truck size={16} />
                Cargas
              </Link>

              {modoVolume && (
                <Link
                  href="/admin/volumes"
                  className="flex h-[44px] items-center gap-2 rounded-[14px] bg-[#176f3c] px-4 text-[11px] font-extrabold text-white"
                >
                  <Boxes size={16} />
                  Volumes
                </Link>
              )}
            </div>
          </div>

          {modoVolume ? (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <PulseCard label="Em carga" value={volumesEmCarga} tone="blue" />
                <PulseCard label="Disponíveis" value={volumesDisponiveis} tone="green" />
                <PulseCard label="Entregues" value={volumesEntregues} tone="default" />
                <PulseCard label="Retornados" value={volumesRetornados} tone="violet" />
                <PulseCard label="Avariados" value={volumesAvariados} tone="amber" />
                <PulseCard label="Histórico" value={volumesTotal} tone="dark" />
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                <div className="rounded-[20px] bg-blue-50 p-5">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-blue-500">
                    Estoque em rua
                  </p>
                  <p className="mt-2 text-[28px] font-black text-blue-800">
                    {volumesEmCarga}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-blue-500">
                    volume(s) ainda sob responsabilidade dos entregadores
                  </p>
                </div>

                <div className="rounded-[20px] bg-emerald-50 p-5">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-emerald-500">
                    Conversão física
                  </p>
                  <p className="mt-2 text-[28px] font-black text-emerald-800">
                    {percentual(volumesEntregues, Math.max(1, volumesEntregues + volumesRetornados + volumesAvariados))}%
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-emerald-500">
                    dos volumes encerrados terminaram como entrega
                  </p>
                </div>

                <div className={`rounded-[20px] p-5 ${volumesAvariados > 0 ? "bg-amber-50" : "bg-[#f5f8f5]"}`}>
                  <p className={`text-[9px] font-extrabold uppercase tracking-[0.15em] ${volumesAvariados > 0 ? "text-amber-600" : "text-slate-400"}`}>
                    Atenção operacional
                  </p>
                  <p className={`mt-2 text-[28px] font-black ${volumesAvariados > 0 ? "text-amber-800" : "text-slate-700"}`}>
                    {volumesAvariados}
                  </p>
                  <p className={`mt-1 text-[11px] font-bold ${volumesAvariados > 0 ? "text-amber-600" : "text-slate-400"}`}>
                    volume(s) atualmente classificados como avaria
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <PulseCard label="Estoque central" value={estoqueTotal} tone="green" />
              <PulseCard label="Cargas em aberto" value={cargasAbertas} tone="blue" />
              <PulseCard label="Cestas entregues" value={cestasEntregues} tone="default" />
            </div>
          )}
        </section>

        <section className="mt-7 grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
          <div className="card-premium rounded-[30px] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
                  Operação
                </p>

                <h2 className="mt-1 text-[24px] font-black tracking-[-0.04em]">
                  Ritmo dos últimos dias
                </h2>

                <p className="mt-1 text-[12px] text-slate-500">
                  Entregas concluídas por dia e ocorrências registradas.
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-emerald-50 text-emerald-700">
                <PackageCheck
                  size={22}
                />
              </div>
            </div>

            <div className="mt-7 grid grid-cols-7 gap-2 sm:gap-3">
              {serie.map(
                (
                  item,
                ) => {
                  const altura =
                    Math.max(
                      10,
                      Math.round(
                        (
                          item.entregas /
                          maxEntregas
                        ) *
                          100,
                      ),
                    );

                  return (
                    <div
                      key={
                        item.data
                      }
                      className="flex min-w-0 flex-col items-center"
                    >
                      <div className="flex h-[180px] w-full items-end justify-center rounded-[18px] bg-[#f5f8f5] px-2 pb-3">
                        <div
                          className="w-full max-w-[48px] rounded-[12px] bg-[linear-gradient(180deg,#27a35b,#0f6336)] shadow-[0_10px_20px_rgba(23,111,60,0.18)]"
                          style={{
                            height:
                              `${altura}%`,
                          }}
                        />
                      </div>

                      <p className="mt-2 text-[11px] font-black text-slate-600">
                        {
                          item.entregas
                        }
                      </p>

                      <p className="mt-1 text-[10px] font-bold text-slate-400">
                        {item.data
                          .slice(
                            5,
                          )
                          .split(
                            "-",
                          )
                          .reverse()
                          .join(
                            "/",
                          )}
                      </p>

                      {item.ocorrencias >
                      0 ? (
                        <span className="mt-1 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-black text-amber-700">
                          {
                            item.ocorrencias
                          } oc.
                        </span>
                      ) : null}
                    </div>
                  );
                },
              )}
            </div>
          </div>

          <div className="card-premium rounded-[30px] p-6">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
              Rotas
            </p>

            <h2 className="mt-1 text-[24px] font-black tracking-[-0.04em]">
              Saúde da execução
            </h2>

            <div className="mt-6 space-y-3">
              <ResumoLinha
                label="Planejadas"
                value={
                  rotasPlanejadas
                }
                icon={
                  <Clock3 size={17} />
                }
              />

              <ResumoLinha
                label="Em rota"
                value={
                  rotasEmRota
                }
                icon={
                  <Truck size={17} />
                }
              />

              <ResumoLinha
                label="Finalizadas"
                value={
                  rotasFinalizadas
                }
                icon={
                  <Route size={17} />
                }
                tone="green"
              />

              <ResumoLinha
                label="Paradas entregues"
                value={
                  paradasEntregues
                }
                icon={
                  <PackageCheck size={17} />
                }
                tone="green"
              />

              <ResumoLinha
                label="Ausentes"
                value={
                  paradasAusentes
                }
                icon={
                  <AlertTriangle size={17} />
                }
                tone={
                  paradasAusentes >
                  0
                    ? "amber"
                    : "default"
                }
              />

              <ResumoLinha
                label="Pendentes"
                value={
                  paradasPendentes
                }
                icon={
                  <MapPinned size={17} />
                }
              />
            </div>

            <Link
              href="/admin/rotas"
              className="mt-5 flex h-[48px] items-center justify-between rounded-[15px] bg-emerald-50 px-4 text-[12px] font-extrabold text-emerald-800"
            >
              Abrir rotas
              <ArrowUpRight
                size={16}
              />
            </Link>
          </div>
        </section>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {alertas.map(
            (
              alerta,
            ) => (
              <Link
                key={
                  alerta.titulo
                }
                href={
                  alerta.href
                }
                className={`rounded-[24px] border p-5 shadow-[0_14px_34px_rgba(17,63,33,0.05)] transition hover:-translate-y-1 ${
                  alerta.alerta
                    ? "border-amber-200 bg-[#fffaf0]"
                    : "border-emerald-100 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                      Atenção
                    </p>

                    <p className="mt-2 text-[14px] font-black">
                      {
                        alerta.titulo
                      }
                    </p>
                  </div>

                  <AlertTriangle
                    size={19}
                    className={
                      alerta.alerta
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }
                  />
                </div>

                <p className={`mt-5 text-[28px] font-black ${
                  alerta.alerta
                    ? "text-amber-700"
                    : "text-emerald-700"
                }`}>
                  {
                    alerta.valor
                  }
                </p>

                <p className="mt-1 text-[11px] font-bold text-slate-400">
                  {
                    alerta.detalhe
                  }
                </p>
              </Link>
            ),
          )}
        </section>

        <section className="mt-7 grid gap-4 xl:grid-cols-2">
          <div className="card-premium rounded-[30px] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
                  Financeiro
                </p>

                <h2 className="mt-1 text-[24px] font-black tracking-[-0.04em]">
                  Posição financeira
                </h2>
              </div>

              <CircleDollarSign
                size={24}
                className="text-emerald-700"
              />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <MetricCard
                label="Saldo em aberto"
                value={
                  formatMoney(
                    saldoAberto,
                  )
                }
              />

              <MetricCard
                label="Saldo vencido"
                value={
                  formatMoney(
                    saldoVencido,
                  )
                }
                warning={
                  saldoVencido >
                  0
                }
              />

              <MetricCard
                label={`Recebido em ${periodo} dias`}
                value={
                  formatMoney(
                    recebidoPeriodo,
                  )
                }
                positive
              />

              <MetricCard
                label="Parcelas vencidas"
                value={
                  String(
                    parcelasVencidas.length,
                  )
                }
                warning={
                  parcelasVencidas.length >
                  0
                }
              />
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link
                href="/admin/financeiro"
                className="flex h-[48px] items-center justify-between rounded-[15px] bg-emerald-50 px-4 text-[12px] font-extrabold text-emerald-800"
              >
                Abrir Financeiro
                <ArrowUpRight size={16} />
              </Link>

              <Link
                href="/admin/credito"
                className="flex h-[48px] items-center justify-between rounded-[15px] bg-[#fff7e3] px-4 text-[12px] font-extrabold text-[#9a6508]"
              >
                Abrir Crédito
                <CreditCard size={16} />
              </Link>
            </div>
          </div>

          <div className="card-premium rounded-[30px] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
                  Estrutura
                </p>

                <h2 className="mt-1 text-[24px] font-black tracking-[-0.04em]">
                  Capacidade operacional
                </h2>
              </div>

              <UsersRound
                size={24}
                className="text-emerald-700"
              />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <MetricCard
                label="Usuários ativos"
                value={
                  String(
                    usuariosAtivos,
                  )
                }
              />

              <MetricCard
                label="Entregadores ativos"
                value={
                  String(
                    entregadoresAtivos,
                  )
                }
                positive
              />

              <MetricCard
                label="Cargas em aberto"
                value={
                  String(
                    cargasAbertas,
                  )
                }
                warning={
                  cargasAbertas >
                  0
                }
              />

              <MetricCard
                label="Tipos abaixo do mínimo"
                value={
                  String(
                    estoqueAbaixo,
                  )
                }
                warning={
                  estoqueAbaixo >
                  0
                }
              />
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link
                href="/admin/usuarios"
                className="flex h-[48px] items-center justify-between rounded-[15px] bg-emerald-50 px-4 text-[12px] font-extrabold text-emerald-800"
              >
                Usuários
                <UserRound size={16} />
              </Link>

              <Link
                href="/admin/estoque"
                className="flex h-[48px] items-center justify-between rounded-[15px] bg-emerald-50 px-4 text-[12px] font-extrabold text-emerald-800"
              >
                Estoque
                <Boxes size={16} />
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-7 card-premium rounded-[30px] p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b07a12]">
                Atividade recente
              </p>

              <h2 className="mt-1 text-[24px] font-black tracking-[-0.04em]">
                O que acabou de acontecer?
              </h2>

              <p className="mt-1 text-[12px] text-slate-500">
                Entregas, pagamentos e ocorrências mais recentes do período selecionado.
              </p>
            </div>

            <span className="rounded-full bg-emerald-50 px-4 py-2 text-[11px] font-black text-emerald-700">
              {
                atividade.length
              } evento(s)
            </span>
          </div>

          {atividade.length ===
          0 ? (
            <div className="mt-5 rounded-[22px] bg-slate-50 p-8 text-center text-[13px] font-bold text-slate-400">
              Nenhuma atividade encontrada neste período.
            </div>
          ) : (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {atividade.map(
                (
                  item,
                  index,
                ) => {
                  const icon =
                    item.tipo ===
                    "ENTREGA" ? (
                      <PackageCheck size={18} />
                    ) : item.tipo ===
                      "PAGAMENTO" ? (
                      <CircleDollarSign size={18} />
                    ) : (
                      <AlertTriangle size={18} />
                    );

                  return (
                    <div
                      key={`${item.tipo}-${item.data}-${index}`}
                      className="flex items-start gap-4 rounded-[20px] border border-slate-100 bg-white p-4"
                    >
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${
                        item.tipo ===
                        "OCORRENCIA"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {
                          icon
                        }
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-black">
                          {
                            item.titulo
                          }
                        </p>

                        <p className="mt-1 text-[11px] font-bold text-slate-400">
                          {
                            item.detalhe
                          }
                        </p>
                      </div>

                      <p className="shrink-0 text-right text-[10px] font-bold text-slate-400">
                        {dataHora(
                          item.data,
                        )}
                      </p>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function PulseCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone:
    | "default"
    | "green"
    | "blue"
    | "violet"
    | "amber"
    | "dark";
}) {
  const classes =
    tone === "green"
      ? "border-emerald-100 bg-emerald-50 text-emerald-800"
      : tone === "blue"
        ? "border-blue-100 bg-blue-50 text-blue-800"
        : tone === "violet"
          ? "border-violet-100 bg-violet-50 text-violet-800"
          : tone === "amber"
            ? "border-amber-100 bg-amber-50 text-amber-800"
            : tone === "dark"
              ? "border-slate-200 bg-slate-800 text-white"
              : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <div className={`rounded-[19px] border px-4 py-4 ${classes}`}>
      <p className="text-[8px] font-black uppercase tracking-[0.14em] opacity-60">
        {label}
      </p>
      <p className="mt-2 text-[24px] font-black">
        {value}
      </p>
    </div>
  );
}

function ResumoLinha({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?:
    | "default"
    | "green"
    | "amber";
}) {
  const classes =
    tone ===
    "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone ===
        "amber"
        ? "bg-amber-50 text-amber-700"
        : "bg-[#f5f8f5] text-slate-600";

  return (
    <div className={`flex items-center justify-between rounded-[17px] px-4 py-3 ${classes}`}>
      <div className="flex items-center gap-3">
        {
          icon
        }

        <span className="text-[12px] font-extrabold">
          {
            label
          }
        </span>
      </div>

      <span className="text-[18px] font-black">
        {
          value
        }
      </span>
    </div>
  );
}

function MetricCard({
  label,
  value,
  warning = false,
  positive = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
  positive?: boolean;
}) {
  return (
    <div className={`rounded-[20px] border p-4 ${
      warning
        ? "border-amber-200 bg-[#fffaf0]"
        : positive
          ? "border-emerald-100 bg-emerald-50/60"
          : "border-slate-100 bg-[#f8faf8]"
    }`}>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
        {
          label
        }
      </p>

      <p className={`mt-2 text-[22px] font-black ${
        warning
          ? "text-amber-700"
          : positive
            ? "text-emerald-700"
            : "text-[#142018]"
      }`}>
        {
          value
        }
      </p>
    </div>
  );
}