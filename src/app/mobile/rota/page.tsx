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
  Play,
  Plus,
  Route,
  Sparkles,
  Square,
} from "lucide-react";

import Link from "next/link";

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

/* =========================================================
   DATA LOCAL
========================================================= */

function dataFortaleza() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "America/Fortaleza",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(new Date());
}

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

  return (
    mapa[status] ??
    status
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/^\w/, (c) =>
        c.toUpperCase(),
      )
  );
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

  const supabase =
    await createClient();

  const {
    data: cargaAtiva,
    error: cargaAtivaError,
  } =
    await supabase
      .from("cargas")
      .select(`
        id,
        codigo,
        status,
        recebida_at
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
          "ABERTA",
          "EM_ROTA",
        ],
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .limit(1)
      .maybeSingle();

  if (cargaAtivaError) {
    console.error(
      "Erro ao consultar carga ativa:",
      cargaAtivaError,
    );
  }

  const cargaPronta =
    !!cargaAtiva &&
    (
      !usuario.configuracao
        .exigirBipagemCarga ||
      !!cargaAtiva.recebida_at
    );

  /* PROCURA ROTA ATIVA */

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
      observacao,
      origem,
      carga_id
    `)
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "entregador_id",
      usuario.id,
    )
    .in("status", [
      "PLANEJADA",
      "EM_ROTA",
    ])
    .order("data_rota", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  if (rotaAtivaError) {
    console.error(
      "Erro ao consultar rota ativa:",
      rotaAtivaError,
    );
  }

    /* =========================================================
     ROTA ATUAL = SOMENTE ROTA ATIVA
     ---------------------------------------------------------
     Uma rota FINALIZADA e historico, nao operacao atual.
     Sem PLANEJADA/EM_ROTA, a tela deve decidir pelo estado
     da carga: abastecer, receber/conferir ou iniciar rota.
  ========================================================= */

  const rota =
    rotaAtiva;

  /* SEM ROTA */

  if (!rota) {
    const precisaReceberCarga =
      !!cargaAtiva &&
      usuario.configuracao
        .exigirBipagemCarga &&
      !cargaAtiva.recebida_at;

    /*
     * Se a carga já está EM_ROTA, significa que uma jornada
     * foi iniciada com ela. Sem rota ativa neste momento,
     * a jornada foi encerrada e o próximo passo é fechar
     * a carga, informando eventual retorno/avaria.
     */
    const jornadaEncerrada =
      !!cargaAtiva &&
      cargaAtiva.status === "EM_ROTA";

    const titulo =
      !cargaAtiva
        ? "Abasteça o carro primeiro"
        : jornadaEncerrada
          ? "Jornada encerrada"
          : precisaReceberCarga
            ? "Receba sua carga"
            : "Pronto para sair?";

    const texto =
      !cargaAtiva
        ? "Sua rota nasce a partir do estoque móvel. Receba uma carga antes de iniciar a jornada."
        : jornadaEncerrada
          ? "Sua rota foi encerrada. Agora finalize a carga e informe qualquer retorno ou avaria antes de iniciar uma nova jornada."
          : precisaReceberCarga
            ? "A carga já está vinculada ao seu usuário, mas a conferência física precisa ser concluída."
            : "Sua carga está pronta. Inicie a jornada e adicione os clientes conforme for atendendo em campo.";

    return (
      <main className="app-premium min-h-dvh text-[#142018]">
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-[#f7faf7]/90 shadow-[0_0_70px_rgba(17,63,33,0.14)]">

          <header className="hero-premium grain relative overflow-hidden px-5 pb-10 pt-5 text-white">

            <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full border-[30px] border-white/[0.04]" />

            <div className="animate-orb pointer-events-none absolute right-10 top-16 h-32 w-32 rounded-full bg-[#f4b13f]/[0.14] blur-3xl" />

            <div className="relative z-10 flex items-center justify-between">

              <Link
                href="/mobile"
                aria-label="Voltar"
                className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/10 backdrop-blur-xl transition active:scale-95"
              >
                <ArrowLeft size={19} />
              </Link>

              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#a8d8b7]">
                  Operação
                </p>
                <h1 className="mt-1 text-lg font-black tracking-[-0.03em]">
                  Minha Rota
                </h1>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/10">
                <Route size={19} />
              </div>

            </div>

          </header>

          <section className="flex flex-1 items-start px-5 py-7">

            <div className="card-premium animate-pop w-full overflow-hidden rounded-[30px] p-7 text-center">

              <div className="icon-emerald mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-[22px]">
                <MapPinned size={30} />
              </div>

              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.22em] text-[#b07a12]">
                Jornada do entregador
              </p>

              <h2 className="mt-2 text-[24px] font-black tracking-[-0.04em]">
                {titulo}
              </h2>

              <p className="mx-auto mt-3 max-w-[320px] text-[13px] leading-6 text-slate-500">
                {texto}
              </p>

              {mensagemErro && (
                <div className="mt-5 rounded-[18px] border border-red-100 bg-red-50 px-4 py-3 text-left text-[11px] font-bold leading-5 text-red-700">
                  {mensagemErro}
                </div>
              )}

              {mensagemOk && (
                <div className="mt-5 rounded-[18px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-left text-[11px] font-bold leading-5 text-emerald-700">
                  {mensagemOk}
                </div>
              )}

              {cargaAtiva && (
                <div className="mt-6 rounded-[20px] border border-emerald-100 bg-[#f3faf5] p-4 text-left">
                  <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#b07a12]">
                    Carga vinculada
                  </p>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-black">
                        {cargaAtiva.codigo}
                      </p>

                      <p className="mt-1 text-[10px] font-semibold text-slate-400">
                        Estoque móvel do entregador
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[9px] font-black uppercase text-emerald-700">
                      {cargaAtiva.status.replaceAll("_", " ")}
                    </span>
                  </div>
                </div>
              )}

              {!cargaAtiva && (
                <Link
                  href="/mobile/carga"
                  className="mt-7 flex h-[54px] w-full items-center justify-center gap-2 rounded-[17px] bg-[linear-gradient(135deg,#1f8a4c,#0d5d31)] text-[13px] font-black text-white shadow-[0_14px_30px_rgba(23,111,60,0.28)] transition active:scale-[0.985]"
                >
                  <PackageCheck size={17} />
                  Ir para Minha carga
                </Link>
              )}

              {precisaReceberCarga && (
                <Link
                  href="/mobile/carga/receber"
                  className="mt-7 flex h-[54px] w-full items-center justify-center gap-2 rounded-[17px] bg-[linear-gradient(135deg,#1f8a4c,#0d5d31)] text-[13px] font-black text-white shadow-[0_14px_30px_rgba(23,111,60,0.28)] transition active:scale-[0.985]"
                >
                  <PackageCheck size={17} />
                  Receber e conferir carga
                </Link>
              )}

              {jornadaEncerrada && (
                <div className="mt-7 space-y-3">
                  <Link
                    href="/mobile/carga/fechar"
                    className="flex h-[58px] w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#1f8a4c,#0d5d31)] text-[13px] font-black text-white shadow-[0_16px_32px_rgba(23,111,60,0.30)] transition active:scale-[0.985]"
                  >
                    <PackageCheck size={18} />
                    Finalizar carga / Informar retorno
                  </Link>

                  <Link
                    href="/mobile/carga"
                    className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[16px] border border-emerald-100 bg-white text-[11px] font-black text-[#176f3c]"
                  >
                    Ver Minha Carga
                  </Link>
                </div>
              )}

              {cargaPronta &&
                !jornadaEncerrada &&
                podeGerenciarRotaPropria && (
                  <form
                    action={
                      iniciarMinhaRota
                    }
                    className="mt-7"
                  >
                    <button
                      type="submit"
                      className="flex h-[58px] w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#1f8a4c,#0d5d31)] text-[13px] font-black text-white shadow-[0_16px_32px_rgba(23,111,60,0.30)] transition active:scale-[0.985]"
                    >
                      <Play
                        size={18}
                        fill="currentColor"
                      />
                      Iniciar minha rota
                    </button>
                  </form>
                )}

              {cargaPronta &&
                !jornadaEncerrada &&
                !podeGerenciarRotaPropria && (
                  <div className="mt-7 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-bold leading-5 text-amber-800">
                    Seu perfil ainda não possui permissão para iniciar a própria rota.
                  </div>
                )}

              <Link
                href="/mobile"
                className="mt-3 flex h-[50px] w-full items-center justify-center gap-2 rounded-[16px] border border-emerald-100 bg-white text-[11px] font-black text-[#176f3c]"
              >
                <ArrowLeft size={16} />
                Voltar ao início
              </Link>

            </div>

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

  /* INDICADORES */

  const total =
    listaItens.length;

  const entregues =
    listaItens.filter(
      (item) =>
        item.status === "ENTREGUE",
    ).length;

  const pendentes =
    listaItens.filter(
      (item) =>
        item.status === "PENDENTE" ||
        item.status === "EM_ATENDIMENTO",
    ).length;

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

  const rotaMobile =
    rota.origem ===
    "MOBILE";

  /* TELA */

  return (
    <main className="app-premium min-h-dvh text-[#142018]">

      <div className="mx-auto min-h-dvh w-full max-w-[480px] overflow-hidden bg-[#f7faf7]/90 shadow-[0_0_70px_rgba(17,63,33,0.14)]">

        {/* =================================================
            HERO
        ================================================= */}

        <header className="hero-premium grain relative overflow-hidden px-5 pb-9 pt-5 text-white">

          <div className="pointer-events-none absolute -right-20 -top-20 h-[210px] w-[210px] rounded-full border-[30px] border-white/[0.04]" />

          <div className="pointer-events-none absolute -bottom-20 -left-16 h-[180px] w-[180px] rounded-full bg-white/[0.035]" />

          <div className="animate-orb pointer-events-none absolute right-8 top-28 h-32 w-32 rounded-full bg-[#f4b13f]/[0.14] blur-3xl" />

          {/* TOPBAR */}

          <div className="relative z-10 flex items-center justify-between">

            <Link
              href="/mobile"
              aria-label="Voltar"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl transition active:scale-95"
            >
              <ArrowLeft size={19} />
            </Link>

            <div className="text-center">

              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#a8d8b7]">
                Operação
              </p>

              <h1 className="mt-1 text-lg font-black tracking-[-0.03em]">
                Minha Rota
              </h1>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/10">
              <Route size={19} />
            </div>

          </div>

          {/* IDENTIFICAÇÃO */}

          <div className="relative z-10 mt-7">

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

                <h2 className="mt-3 text-[34px] font-black leading-none tracking-[-0.05em]">
                  <span className="text-gold">
                    {total}
                  </span>{" "}
                  cliente
                  {total === 1 ? "" : "s"}
                </h2>

                <div className="mt-3 flex items-center gap-2 text-white/65">

                  <Clock3 size={14} />

                  <span className="text-[12px] font-semibold">
                    {formatarData(
                      rota.data_rota,
                    )}
                  </span>

                </div>

              </div>

              <span
                className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.1em] ${
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

            <div className="mt-7 rounded-[24px] border border-white/15 bg-white/[0.09] p-4 backdrop-blur-xl">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
                    Progresso
                  </p>

                  <p className="mt-1 text-[14px] font-bold text-white">
                    {processados} de {total}{" "}
                    concluído
                    {total === 1 ? "" : "s"}
                  </p>

                </div>

                <div className="text-[28px] font-black tracking-[-0.04em]">
                  {percentual}%
                </div>

              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/20">

                <div
                  className="relative h-full rounded-full bg-[linear-gradient(90deg,#f4b13f,#ffe3a1)] shadow-[0_0_18px_rgba(244,177,63,0.55)] transition-all duration-700"
                  style={{
                    width: `${percentual}%`,
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
                valor={entregues}
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

        <div className="px-5 pb-10 pt-6">

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

          {!finalizada && (
            <section className="mb-6 space-y-3">
              <Link
                href="/mobile/clientes?modo=venda"
                className="flex h-[58px] w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#1f8a4c,#0d5d31)] text-[13px] font-black text-white shadow-[0_16px_30px_rgba(23,111,60,0.26)] transition active:scale-[0.985]"
              >
                <Plus size={18} />
                Novo atendimento
              </Link>

              {rotaMobile && (
                <form
                  action={
                    encerrarMinhaRota
                  }
                >
                  <input
                    type="hidden"
                    name="rota_id"
                    value={rota.id}
                  />

                  <button
                    type="submit"
                    disabled={
                      pendentes > 0
                    }
                    className="flex h-[54px] w-full items-center justify-center gap-2 rounded-[17px] border border-slate-200 bg-white text-[12px] font-black text-slate-600 transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <Square size={16} />
                    {pendentes > 0
                      ? `${pendentes} atendimento(s) pendente(s)`
                      : "Encerrar minha rota"}
                  </button>

                  {pendentes > 0 && (
                    <p className="mt-2 text-center text-[9px] font-semibold leading-4 text-slate-400">
                      Conclua ou registre ocorrência nos atendimentos pendentes antes de encerrar.
                    </p>
                  )}
                </form>
              )}
            </section>
          )}

          {/* TÍTULO LISTA */}

          <div className="mb-5 flex items-end justify-between">

            <div>

              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b07a12]">
                Itinerário
              </p>

              <h3 className="mt-1 text-[22px] font-black tracking-[-0.04em]">
                Sequência de clientes
              </h3>

            </div>

            <span className="rounded-full border border-[#dceade] bg-white px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-[#176f3c] shadow-[0_6px_16px_rgba(17,63,33,0.06)]">
              {total} parada
              {total === 1 ? "" : "s"}
            </span>

          </div>

          {/* CLIENTES (com linha de itinerário) */}

          {listaItens.length === 0 ? (
            <section className="rounded-[26px] border border-dashed border-emerald-200 bg-emerald-50/40 p-7 text-center">
              <MapPinned
                size={28}
                className="mx-auto text-[#176f3c]"
              />

              <h4 className="mt-3 text-[16px] font-black">
                Rota iniciada
              </h4>

              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                Nenhum cliente foi adicionado ainda. Use “Novo atendimento” conforme encontrar clientes em campo.
              </p>
            </section>
          ) : (
          <section className="relative space-y-4 before:absolute before:bottom-8 before:left-[46px] before:top-8 before:border-l-2 before:border-dashed before:border-emerald-300/70 before:content-['']">

            {listaItens.map(
              (item, index) => {
                const cliente =
                  clientesMap.get(
                    item.cliente_id,
                  );

                if (!cliente) {
                  return null;
                }

                const processado =
                  item.status !==
                    "PENDENTE" &&
                  item.status !==
                    "EM_ATENDIMENTO";

                /*
                 * ENDEREÇO CONGELADO DA ROTA
                 *
                 * A rota usa primeiro o snapshot salvo em rota_clientes.
                 * O cadastro atual do cliente é apenas fallback para registros
                 * antigos que ainda não possuam snapshot.
                 */
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

                const endereco = [
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

                return (
                  <article
                    key={item.id}
                    style={{
                      animationDelay: `${
                        index * 80
                      }ms`,
                    }}
                    className={`animate-fade-up relative overflow-hidden rounded-[28px] p-5 ${
                      processado
                        ? "border border-emerald-200 bg-[linear-gradient(145deg,#f0fbf4,#ffffff)] shadow-[0_18px_40px_-28px_rgba(16,185,129,0.55)]"
                        : "card-premium"
                    }`}
                  >

                    <div
                      className={`absolute inset-x-0 top-0 h-[3px] ${
                        processado
                          ? "bg-[linear-gradient(90deg,#16a05d,#8ee9b2)]"
                          : "bg-[linear-gradient(90deg,#f4b13f,#176f3c)]"
                      }`}
                    />

                    {/* CABEÇALHO DO CARD */}

                    <div className="flex items-center gap-3.5">

                      <div
                        className={`flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[18px] ${
                          processado
                            ? "icon-emerald"
                            : "border border-[#f4b13f]/40 bg-[#fff8e8] text-[#b07a12] shadow-[0_8px_18px_rgba(244,177,63,0.2)]"
                        }`}
                      >
                        {processado ? (
                          <CheckCircle2 size={24} />
                        ) : (
                          <span className="text-[20px] font-black">
                            {item.sequencia}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">

                        <h4 className="truncate text-[19px] font-black tracking-[-0.035em]">
                          {cliente.nome}
                        </h4>

                        <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                          {cliente.codigo}
                        </p>

                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.06em] ${
                          processado
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {processado
                          ? rotuloStatus(
                              item.status,
                            )
                          : "Aguardando"}
                      </span>

                    </div>

                    {/* ENDEREÇO (largura total) */}

                    <div className="mt-4 flex items-center gap-3 rounded-[18px] bg-[#f4f8f5] p-3.5">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-white text-[#176f3c] shadow-sm">
                        <MapPin size={17} />
                      </div>

                      <div className="min-w-0 flex-1">

                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                          Endereço
                        </p>

                        <p className="mt-0.5 text-[13px] font-semibold leading-5 text-slate-700">
                          {enderecoCompleto}
                        </p>

                      </div>

                      {!processado &&
                        !finalizada && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${queryMapa}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Abrir no mapa"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#176f3c] text-white shadow-[0_8px_18px_rgba(23,111,60,0.3)] transition active:scale-90"
                          >
                            <Navigation size={16} />
                          </a>
                        )}

                    </div>

                    {/* MICRO INFO */}

                    <div className="mt-3 grid grid-cols-2 gap-2.5">

                      <div className="rounded-[16px] border border-slate-100 bg-white px-3.5 py-3">

                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                          Parada
                        </p>

                        <p className="mt-1 text-[14px] font-black">
                          #{item.sequencia}
                        </p>

                      </div>

                      <div className="rounded-[16px] border border-slate-100 bg-white px-3.5 py-3">

                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                          Situação
                        </p>

                        <p
                          className={`mt-1 text-[14px] font-black ${
                            processado
                              ? "text-emerald-700"
                              : "text-amber-700"
                          }`}
                        >
                          {processado
                            ? rotuloStatus(
                                item.status,
                              )
                            : "Aguardando"}
                        </p>

                      </div>

                    </div>

                    {/* AÇÃO */}

                    {!processado &&
                      !finalizada && (
                        <Link
                          href={`/mobile/entregas/nova?rotaClienteId=${item.id}`}
                          className="mt-5 flex h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#1f8a4c,#0d5d31)] text-[13px] font-black text-white shadow-[0_16px_30px_rgba(23,111,60,0.30)] transition active:scale-[0.985]"
                        >
                          <PackageCheck size={18} />

                          Atender cliente

                          <ChevronRight size={17} />
                        </Link>
                      )}

                    {processado && (
                      <div className="mt-5 flex h-[50px] items-center justify-center gap-2 rounded-[16px] border border-emerald-100 bg-emerald-50 text-[12px] font-black text-emerald-700">

                        <CheckCircle2 size={17} />

                        Atendimento processado

                      </div>
                    )}

                  </article>
                );
              },
            )}

          </section>
          )}

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
    <div className="rounded-[18px] border border-white/15 bg-white/[0.09] px-3.5 py-3 backdrop-blur-xl">

      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/55">
        {label}
      </p>

      <p className="mt-1 text-[24px] font-black tracking-[-0.04em] text-white">
        {valor}
      </p>

    </div>
  );
}