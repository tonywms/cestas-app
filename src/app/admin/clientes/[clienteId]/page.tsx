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
import { redirect } from "next/navigation";

import {
  getCurrentUserProfile,
} from "@/lib/auth/get-current-user";

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
    entregasResult,
    ocorrenciasResult,
    liberacoesResult,
    enderecosResult,
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

  const totalPago =
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

  /* =======================================================
     TIMELINE 360
  ======================================================= */

  type TimelineItem = {
    data: string;
    tipo:
      | "CONTRATO"
      | "PAGAMENTO"
      | "ENTREGA"
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
        `${item.quantidade_parcelas} parcela(s) • ${item.status}`,

      valor:
        moeda(
          Number(
            item.valor_total,
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
        `Carga #${item.carga_id}`,
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

  timeline.sort(
    (a, b) =>
      new Date(
        b.data,
      ).getTime() -
      new Date(
        a.data,
      ).getTime(),
  );

  const timelineRecente =
    timeline.slice(
      0,
      12,
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

      <div className="mx-auto max-w-[1180px]">

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

            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

              <HeroKpi
                label="Saldo em aberto"
                valor={
                  moeda(
                    saldoAberto,
                  )
                }
              />

              <HeroKpi
                label="Total pago"
                valor={
                  moeda(
                    totalPago,
                  )
                }
              />

              <HeroKpi
                label="Entregas"
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

        {/* =================================================
            RESUMO
        ================================================= */}

        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

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
              <ReceiptText size={19} />
            }
            label="Parcelas vencidas"
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
                label="Total contratado"
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
                    totalPago,
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
                  Contratos e parcelas
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
                  descricao="Este cliente ainda não possui crediário."
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
                                Início {dataBR(contrato.data_inicio)}
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
                              label="Parcelas"
                              valor={
                                `${pagas}/${parcelasContrato.length}`
                              }
                            />

                            <Mini
                              label="1º venc."
                              valor={
                                dataBR(
                                  contrato.primeiro_vencimento,
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

        {/* =================================================
            TIMELINE
        ================================================= */}

        <section className="card-premium mt-5 rounded-[30px] p-6">

          <div className="flex items-start justify-between gap-4">

            <div className="flex items-start gap-3">

              <div className="icon-emerald flex h-12 w-12 items-center justify-center rounded-[16px]">
                <History size={21} />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                  Histórico 360°
                </p>

                <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                  Linha do tempo do cliente
                </h3>
              </div>

            </div>

            <span className="rounded-full bg-slate-50 px-3 py-2 text-[8px] font-black text-slate-500">
              {timeline.length} evento(s)
            </span>

          </div>

          <div className="relative mt-6 space-y-4 before:absolute before:bottom-7 before:left-[22px] before:top-7 before:border-l-2 before:border-dashed before:border-emerald-200 before:content-['']">

            {timelineRecente.length ===
              0 ? (
              <Empty
                titulo="Sem histórico"
                descricao="Os eventos do cliente aparecerão aqui automaticamente."
              />
            ) : (
              timelineRecente.map(
                (
                  item,
                  index,
                ) => (
                  <Timeline
                    key={
                      `${item.tipo}-${item.data}-${index}`
                    }
                    item={item}
                  />
                ),
              )
            )}

          </div>

        </section>

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