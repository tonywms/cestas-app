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
  PackageCheck,
  Route,
  Sparkles,
} from "lucide-react";

import Link from "next/link";

import {
  PERMISSOES,
} from "@/lib/auth/permissions";

import {
  requirePermission,
} from "@/lib/auth/require-permission";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   DATA LOCAL
========================================================= */

function dataFortaleza() {
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

/* =========================================================
   FORMATAR DATA
========================================================= */

function formatarData(
  data: string,
) {
  const [
    ano,
    mes,
    dia,
  ] = data.split("-");

  if (
    !ano ||
    !mes ||
    !dia
  ) {
    return data;
  }

  return `${dia}/${mes}/${ano}`;
}

/* =========================================================
   PÁGINA
========================================================= */

export default async function MinhaRotaPage() {
  /*
   * =======================================================
   * PERMISSÃO
   * =======================================================
   */

  const usuario =
    await requirePermission(
      PERMISSOES.ROTA_VISUALIZAR,
    );

  const supabase =
    await createClient();

  /*
   * =======================================================
   * PROCURA ROTA ATIVA
   * =======================================================
   */

  const {
    data: rotaAtiva,
    error: rotaAtivaError,
  } = await supabase
    .from("rotas")
    .select(`
      id,
      codigo,
      data_rota,
      status,
      observacao
    `)
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "entregador_id",
      usuario.id,
    )
    .in(
      "status",
      [
        "PLANEJADA",
        "EM_ROTA",
      ],
    )
    .order(
      "data_rota",
      {
        ascending:
          true,
      },
    )
    .limit(1)
    .maybeSingle();

  if (
    rotaAtivaError
  ) {
    console.error(
      "Erro ao consultar rota ativa:",
      rotaAtivaError,
    );
  }

  /*
   * =======================================================
   * SE ACABOU DE FINALIZAR, MOSTRA A ROTA FINALIZADA DO DIA
   * =======================================================
   */

  let rota =
    rotaAtiva;

  if (!rota) {
    const {
      data:
        rotaFinalizada,

      error:
        rotaFinalizadaError,
    } = await supabase
      .from("rotas")
      .select(`
        id,
        codigo,
        data_rota,
        status,
        observacao
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
        "FINALIZADA",
      )
      .eq(
        "data_rota",
        dataFortaleza(),
      )
      .order(
        "finalizada_at",
        {
          ascending:
            false,
        },
      )
      .limit(1)
      .maybeSingle();

    if (
      rotaFinalizadaError
    ) {
      console.error(
        "Erro ao consultar rota finalizada:",
        rotaFinalizadaError,
      );
    }

    rota =
      rotaFinalizada;
  }

  /*
   * =======================================================
   * SEM ROTA
   * =======================================================
   */

  if (!rota) {
    return (
      <main className="min-h-dvh bg-[#eaf2ec] text-[#142018]">
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-[#f7faf7] shadow-[0_0_70px_rgba(17,63,33,0.12)]">

          <header className="relative overflow-hidden bg-[linear-gradient(155deg,#176b3a,#105f33_48%,#0b4d29)] px-5 pb-9 pt-5 text-white">

            <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full border-[30px] border-white/[0.035]" />

            <div className="relative z-10 flex items-center justify-between">

              <Link
                href="/mobile"
                className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/10 backdrop-blur-xl"
              >
                <ArrowLeft
                  size={19}
                />
              </Link>

              <div className="text-center">

                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
                  Operação
                </p>

                <h1 className="mt-1 text-lg font-black">
                  Minha Rota
                </h1>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/10">
                <Route
                  size={19}
                />
              </div>

            </div>

          </header>

          <section className="flex flex-1 items-start px-5 py-7">

            <div className="w-full overflow-hidden rounded-[30px] border border-black/[0.04] bg-white p-7 text-center shadow-[0_24px_60px_-30px_rgba(17,63,33,0.22)]">

              <div className="mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-[22px] bg-[#eaf5ed] text-[#176b3a]">
                <MapPinned
                  size={30}
                />
              </div>

              <p className="mt-6 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-700">
                Operação
              </p>

              <h2 className="mt-2 text-[24px] font-black tracking-[-0.04em]">
                Nenhuma rota ativa
              </h2>

              <p className="mx-auto mt-3 max-w-[300px] text-[12px] leading-6 text-slate-400">
                Quando uma rota for atribuída ao seu usuário,
                os clientes e a sequência de atendimento
                aparecerão aqui automaticamente.
              </p>

              <Link
                href="/mobile"
                className="mt-7 flex h-[52px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#176f3c] text-xs font-black text-white shadow-[0_14px_30px_rgba(23,111,60,0.20)]"
              >
                <ArrowLeft
                  size={17}
                />

                Voltar ao início
              </Link>

            </div>

          </section>

        </div>
      </main>
    );
  }

  /*
   * =======================================================
   * ITENS DA ROTA
   * =======================================================
   */

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
      atendido_at
    `)
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "rota_id",
      rota.id,
    )
    .order(
      "sequencia",
      {
        ascending:
          true,
      },
    );

  if (
    itensError
  ) {
    console.error(
      "Erro ao consultar clientes da rota:",
      itensError,
    );
  }

  const listaItens =
    itens ?? [];

  /*
   * =======================================================
   * CLIENTES
   * =======================================================
   */

  const clienteIds =
    listaItens.map(
      (item) =>
        item.cliente_id,
    );

  const {
    data: clientes,
    error: clientesError,
  } =
    clienteIds.length >
    0
      ? await supabase
          .from(
            "clientes",
          )
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
          .in(
            "id",
            clienteIds,
          )
      : {
          data: [],
          error: null,
        };

  if (
    clientesError
  ) {
    console.error(
      "Erro ao consultar dados dos clientes:",
      clientesError,
    );
  }

  const clientesMap =
    new Map(
      (
        clientes ??
        []
      ).map(
        (
          cliente,
        ) => [
          cliente.id,
          cliente,
        ],
      ),
    );

  /*
   * =======================================================
   * INDICADORES
   * =======================================================
   */

  const total =
    listaItens.length;

  const entregues =
    listaItens.filter(
      (item) =>
        item.status ===
        "ENTREGUE",
    ).length;

  const restantes =
    Math.max(
      0,
      total -
        entregues,
    );

  const percentual =
    total > 0
      ? Math.round(
          (
            entregues /
            total
          ) *
            100,
        )
      : 0;

  const finalizada =
    rota.status ===
    "FINALIZADA";

  /*
   * =======================================================
   * TELA
   * =======================================================
   */

  return (
    <main className="min-h-dvh bg-[#e9f1eb] text-[#142018]">

      <div className="mx-auto min-h-dvh w-full max-w-[480px] overflow-hidden bg-[#f7faf7] shadow-[0_0_70px_rgba(17,63,33,0.14)]">

        {/* =================================================
            HERO
        ================================================= */}

        <header className="relative overflow-hidden bg-[linear-gradient(150deg,#17733f_0%,#0f6536_48%,#084825_100%)] px-5 pb-8 pt-5 text-white">

          <div className="pointer-events-none absolute -right-20 -top-20 h-[210px] w-[210px] rounded-full border-[30px] border-white/[0.035]" />

          <div className="pointer-events-none absolute -bottom-20 -left-16 h-[180px] w-[180px] rounded-full bg-white/[0.035]" />

          <div className="pointer-events-none absolute right-16 top-32 h-24 w-24 rounded-full bg-emerald-300/10 blur-3xl" />

          {/* TOPBAR */}

          <div className="relative z-10 flex items-center justify-between">

            <Link
              href="/mobile"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition active:scale-95"
            >
              <ArrowLeft
                size={19}
              />
            </Link>

            <div className="text-center">

              <p className="text-[8px] font-black uppercase tracking-[0.24em] text-emerald-200">
                Operação
              </p>

              <h1 className="mt-1 text-lg font-black tracking-[-0.03em]">
                Minha Rota
              </h1>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.08]">
              <Route
                size={19}
              />
            </div>

          </div>

          {/* IDENTIFICAÇÃO */}

          <div className="relative z-10 mt-7">

            <div className="flex items-start justify-between gap-4">

              <div>

                <div className="flex items-center gap-2">

                  <Navigation
                    size={14}
                    className="text-emerald-200"
                  />

                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200">
                    {rota.codigo}
                  </p>

                </div>

                <h2 className="mt-3 text-[30px] font-black leading-none tracking-[-0.05em]">
                  {total} cliente
                  {total === 1
                    ? ""
                    : "s"}
                </h2>

                <div className="mt-3 flex items-center gap-2 text-white/55">

                  <Clock3
                    size={13}
                  />

                  <span className="text-[10px] font-semibold">
                    {formatarData(
                      rota.data_rota,
                    )}
                  </span>

                </div>

              </div>

              <span
                className={`rounded-full border px-4 py-2 text-[8px] font-black uppercase tracking-[0.12em] ${
                  finalizada
                    ? "border-white bg-white text-[#176f3c]"
                    : "border-white/10 bg-white/10 text-white"
                }`}
              >
                {rota.status}
              </span>

            </div>

            {/* PROGRESSO */}

            <div className="mt-7 rounded-[22px] border border-white/10 bg-white/[0.07] p-4 backdrop-blur-xl">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/45">
                    Progresso
                  </p>

                  <p className="mt-1 text-[12px] font-bold text-white">
                    {entregues} de{" "}
                    {total} concluído
                    {total === 1
                      ? ""
                      : "s"}
                  </p>

                </div>

                <div className="text-[22px] font-black tracking-[-0.04em]">
                  {percentual}%
                </div>

              </div>

              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-black/10">

                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#9ff6bd,#ffffff)] shadow-[0_0_15px_rgba(255,255,255,0.25)] transition-all duration-500"
                  style={{
                    width:
                      `${percentual}%`,
                  }}
                />

              </div>

            </div>

            {/* KPIs */}

            <div className="mt-3 grid grid-cols-3 gap-2.5">

              <HeroKpi
                label="Total"
                valor={total}
              />

              <HeroKpi
                label="Entregues"
                valor={
                  entregues
                }
              />

              <HeroKpi
                label="Restantes"
                valor={
                  restantes
                }
              />

            </div>

          </div>

        </header>

        {/* =================================================
            CONTEÚDO
        ================================================= */}

        <div className="px-5 pb-10 pt-5">

          {/* FINALIZADA */}

          {finalizada && (
            <div className="relative mb-5 overflow-hidden rounded-[26px] border border-emerald-200 bg-[linear-gradient(135deg,#ecfdf3,#ffffff)] p-5 shadow-[0_20px_50px_-30px_rgba(16,185,129,0.45)]">

              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-100/60" />

              <div className="relative flex items-start gap-4">

                <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[18px] bg-[#159653] text-white shadow-[0_12px_25px_rgba(21,150,83,0.22)]">

                  <CircleCheckBig
                    size={24}
                  />

                </div>

                <div>

                  <div className="flex items-center gap-2">

                    <Sparkles
                      size={13}
                      className="text-emerald-600"
                    />

                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-600">
                      Operação concluída
                    </p>

                  </div>

                  <h3 className="mt-2 text-[17px] font-black tracking-[-0.03em] text-[#142018]">
                    Rota finalizada
                  </h3>

                  <p className="mt-2 text-[10px] leading-5 text-slate-500">
                    Todos os clientes desta rota foram
                    processados com sucesso.
                  </p>

                </div>

              </div>

            </div>
          )}

          {/* TÍTULO LISTA */}

          <div className="mb-4 flex items-end justify-between">

            <div>

              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700">
                Itinerário
              </p>

              <h3 className="mt-1 text-[19px] font-black tracking-[-0.035em]">
                Sequência de clientes
              </h3>

            </div>

            <span className="rounded-full bg-[#eaf5ed] px-3 py-2 text-[8px] font-black uppercase tracking-[0.1em] text-[#176f3c]">
              {total} parada
              {total === 1
                ? ""
                : "s"}
            </span>

          </div>

          {/* CLIENTES */}

          <section className="space-y-4">

            {listaItens.map(
              (item) => {
                const cliente =
                  clientesMap.get(
                    item.cliente_id,
                  );

                if (
                  !cliente
                ) {
                  return null;
                }

                const concluido =
                  item.status ===
                  "ENTREGUE";

                const endereco =
                  [
                    cliente.logradouro,
                    cliente.numero,
                  ]
                    .filter(
                      Boolean,
                    )
                    .join(
                      ", ",
                    );

                return (
                  <article
                    key={
                      item.id
                    }
                    className={`relative overflow-hidden rounded-[28px] border p-5 transition ${
                      concluido
                        ? "border-emerald-200 bg-[linear-gradient(145deg,#f0fbf4,#ffffff)] shadow-[0_18px_40px_-30px_rgba(16,185,129,0.45)]"
                        : "border-black/[0.045] bg-white shadow-[0_22px_55px_-32px_rgba(17,63,33,0.25)]"
                    }`}
                  >

                    <div
                      className={`absolute inset-x-0 top-0 h-[3px] ${
                        concluido
                          ? "bg-[linear-gradient(90deg,#16a05d,#8ee9b2)]"
                          : "bg-[linear-gradient(90deg,#176f3c,#81d49e)]"
                      }`}
                    />

                    <div className="flex items-start gap-4">

                      {/* ORDEM */}

                      <div
                        className={`flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[18px] shadow-sm ${
                          concluido
                            ? "bg-[#159653] text-white"
                            : "bg-[#eaf5ed] text-[#176f3c]"
                        }`}
                      >
                        {concluido ? (
                          <CheckCircle2
                            size={23}
                          />
                        ) : (
                          <span className="text-[18px] font-black">
                            {
                              item.sequencia
                            }
                          </span>
                        )}
                      </div>

                      {/* DADOS */}

                      <div className="min-w-0 flex-1">

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            <h4 className="truncate text-[18px] font-black tracking-[-0.035em]">
                              {
                                cliente.nome
                              }
                            </h4>

                            <p className="mt-1 text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                              {
                                cliente.codigo
                              }
                            </p>

                          </div>

                          <span
                            className={`shrink-0 rounded-full px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] ${
                              concluido
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {
                              item.status
                            }
                          </span>

                        </div>

                        {/* ENDEREÇO */}

                        <div className="mt-4 rounded-[18px] bg-[#f7f9f7] p-3.5">

                          <div className="flex items-start gap-2.5">

                            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-white text-[#176f3c] shadow-sm">

                              <MapPin
                                size={13}
                              />

                            </div>

                            <div>

                              <p className="text-[7px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Endereço
                              </p>

                              <p className="mt-1 text-[10px] font-semibold leading-5 text-slate-600">
                                {endereco ||
                                  "Endereço não informado"}

                                {cliente.bairro
                                  ? ` - ${cliente.bairro}`
                                  : ""}
                              </p>

                            </div>

                          </div>

                        </div>

                        {/* MICRO INFO */}

                        <div className="mt-3 grid grid-cols-2 gap-2">

                          <div className="rounded-[14px] border border-slate-100 bg-white px-3 py-2.5">

                            <p className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-400">
                              Parada
                            </p>

                            <p className="mt-1 text-[10px] font-black">
                              #{item.sequencia}
                            </p>

                          </div>

                          <div className="rounded-[14px] border border-slate-100 bg-white px-3 py-2.5">

                            <p className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-400">
                              Situação
                            </p>

                            <p className="mt-1 text-[10px] font-black">
                              {concluido
                                ? "Concluído"
                                : "Aguardando"}
                            </p>

                          </div>

                        </div>

                      </div>

                    </div>

                    {/* AÇÃO */}

                    {!concluido &&
                      !finalizada && (
                        <Link
                          href={`/mobile/entregas/nova?rotaClienteId=${item.id}`}
                          className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-[17px] bg-[linear-gradient(135deg,#197a43,#105f33)] text-xs font-black text-white shadow-[0_14px_28px_rgba(23,111,60,0.22)] transition active:scale-[0.985]"
                        >
                          <PackageCheck
                            size={17}
                          />

                          Atender cliente

                          <ChevronRight
                            size={16}
                          />
                        </Link>
                      )}

                    {concluido && (
                      <div className="mt-5 flex h-[48px] items-center justify-center gap-2 rounded-[16px] border border-emerald-100 bg-emerald-50 text-[10px] font-black text-emerald-700">

                        <CheckCircle2
                          size={16}
                        />

                        Atendimento concluído

                      </div>
                    )}

                  </article>
                );
              },
            )}

          </section>

          {/* VOLTAR */}

          <Link
            href="/mobile"
            className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-[17px] border border-emerald-100 bg-white text-xs font-black text-[#176f3c] shadow-[0_12px_30px_-24px_rgba(17,63,33,0.30)] transition active:scale-[0.985]"
          >
            <ArrowLeft
              size={16}
            />

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
    <div className="rounded-[18px] border border-white/10 bg-white/[0.07] px-3 py-3 backdrop-blur-xl">

      <p className="text-[7px] font-black uppercase tracking-[0.16em] text-white/45">
        {label}
      </p>

      <p className="mt-1 text-[20px] font-black tracking-[-0.04em] text-white">
        {valor}
      </p>

    </div>
  );
}