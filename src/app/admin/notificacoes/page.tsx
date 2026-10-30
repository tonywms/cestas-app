export const instant = false;

import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Boxes,
  Eye,
  RotateCcw,
  CircleDollarSign,
  Clock3,
  Filter,
  PackageX,
  RefreshCcw,
  Route,
  ShieldCheck,
  Truck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import {
  abrirNotificacao,
  marcarNotificacaoResolvida,
  marcarNotificacaoVista,
  reabrirNotificacao,
} from "./actions";

type PageProps = {
  searchParams: Promise<{
    categoria?: string;
    severidade?: string;
    estado?: string;
  }>;
};

type Alerta = {
  id: string;
  categoria: "ESTOQUE" | "FINANCEIRO" | "CARGA" | "OCORRENCIA" | "USUARIOS";
  severidade: "CRITICO" | "ATENCAO" | "INFO";
  titulo: string;
  descricao: string;
  detalhe: string;
  dataIso: string;
  href: string;
};

function dataBR(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(new Date(valor));
}

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function diasAtraso(vencimento: string, hoje: string) {
  const a = new Date(`${vencimento}T12:00:00`);
  const b = new Date(`${hoje}T12:00:00`);
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000));
}

function severidadePeso(valor: Alerta["severidade"]) {
  if (valor === "CRITICO") return 3;
  if (valor === "ATENCAO") return 2;
  return 1;
}

function categoriaLabel(categoria: Alerta["categoria"]) {
  const mapa = {
    ESTOQUE: "Estoque",
    FINANCEIRO: "Financeiro",
    CARGA: "Cargas",
    OCORRENCIA: "Ocorrências",
    USUARIOS: "Usuários",
  };

  return mapa[categoria];
}

function categoriaIcone(categoria: Alerta["categoria"]) {
  if (categoria === "ESTOQUE") return <Boxes size={17} />;
  if (categoria === "FINANCEIRO") return <CircleDollarSign size={17} />;
  if (categoria === "CARGA") return <Truck size={17} />;
  if (categoria === "OCORRENCIA") return <Route size={17} />;
  return <UserRound size={17} />;
}

function severidadeClasses(severidade: Alerta["severidade"]) {
  if (severidade === "CRITICO") {
    return {
      borda: "border-red-200",
      fundo: "bg-red-50/60",
      icone: "bg-red-100 text-red-700",
      badge: "bg-red-100 text-red-700",
    };
  }

  if (severidade === "ATENCAO") {
    return {
      borda: "border-amber-200",
      fundo: "bg-amber-50/55",
      icone: "bg-amber-100 text-amber-700",
      badge: "bg-amber-100 text-amber-700",
    };
  }

  return {
    borda: "border-sky-100",
    fundo: "bg-sky-50/45",
    icone: "bg-sky-100 text-sky-700",
    badge: "bg-sky-100 text-sky-700",
  };
}

export default async function NotificacoesPage({ searchParams }: PageProps) {
  const usuario = await getCurrentUserProfile();

  if (!usuario || !usuario.ativo) {
    redirect("/");
  }

  if (usuario.perfilCodigo === "ENTREGADOR") {
    redirect("/mobile");
  }

  const filtros = await searchParams;
  const categoriaFiltro = filtros.categoria ?? "TODAS";
  const severidadeFiltro = filtros.severidade ?? "TODAS";
  const estadoFiltro = filtros.estado ?? "TODOS";

  const supabase = await createClient();
  const hoje = new Date();
  const hojeIso = hoje.toISOString().slice(0, 10);
  const inicio30 = new Date();
  inicio30.setDate(hoje.getDate() - 30);

  const [
    estoqueResult,
    parcelasResult,
    clientesResult,
    cargasResult,
    ocorrenciasResult,
    empresaResult,
    membrosResult,
  ] = await Promise.all([
    supabase
      .from("estoque_central_saldos")
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
      .eq("empresa_id", usuario.empresa.id),

    supabase
      .from("parcelas")
      .select("id, cliente_id, vencimento, valor, valor_pago, status")
      .eq("empresa_id", usuario.empresa.id)
      .eq("status", "ABERTA")
      .lt("vencimento", hojeIso)
      .order("vencimento"),

    supabase
      .from("clientes")
      .select("id, codigo, nome")
      .eq("empresa_id", usuario.empresa.id),

    supabase
      .from("cargas")
      .select("id, codigo, status, data_carga, created_at")
      .eq("empresa_id", usuario.empresa.id)
      .neq("status", "FINALIZADA")
      .order("created_at", { ascending: true }),

    supabase
      .from("ocorrencias")
      .select(`
        id,
        rota_id,
        cliente_id,
        tipo,
        descricao,
        requer_reagendamento,
        created_at
      `)
      .eq("empresa_id", usuario.empresa.id)
      .eq("requer_reagendamento", true)
      .gte("created_at", inicio30.toISOString())
      .order("created_at", { ascending: false }),

    supabase
      .from("empresas")
      .select("limite_usuarios")
      .eq("id", usuario.empresa.id)
      .maybeSingle(),

    supabase
      .from("empresa_usuarios")
      .select("usuario_id", { count: "exact", head: true })
      .eq("empresa_id", usuario.empresa.id)
      .eq("ativo", true),
  ]);

  const estadosResult = await supabase
    .from("notification_user_state")
    .select("alert_key, status, visto_at, resolvido_at")
    .eq("empresa_id", usuario.empresa.id)
    .eq("usuario_id", usuario.id);

  const clientesMap = new Map(
    (clientesResult.data ?? []).map((cliente) => [
      Number(cliente.id),
      {
        codigo: String(cliente.codigo ?? ""),
        nome: String(cliente.nome ?? "Cliente"),
      },
    ]),
  );

  const alertas: Alerta[] = [];

  for (const item of estoqueResult.data ?? []) {
    const saldo = Number(item.quantidade ?? 0);
    const minimo = Number(item.estoque_minimo ?? 0);
    const tipoRaw = Array.isArray(item.tipos_cesta)
      ? item.tipos_cesta[0]
      : item.tipos_cesta;

    const nome = String(tipoRaw?.nome ?? "Tipo de cesta");
    const codigo = String(tipoRaw?.codigo ?? "");

    if (saldo === 0) {
      alertas.push({
        id: `ESTOQUE-ZERADO-${item.tipo_cesta_id}`,
        categoria: "ESTOQUE",
        severidade: "CRITICO",
        titulo: `${nome} está sem estoque`,
        descricao:
          "O saldo central chegou a zero e novas cargas deste tipo podem ser bloqueadas.",
        detalhe: `${codigo} • saldo 0 • mínimo ${minimo}`,
        dataIso: String(item.updated_at ?? hoje.toISOString()),
        href: "/admin/estoque?estoque=baixo",
      });
    } else if (minimo > 0 && saldo <= minimo) {
      alertas.push({
        id: `ESTOQUE-BAIXO-${item.tipo_cesta_id}`,
        categoria: "ESTOQUE",
        severidade: "ATENCAO",
        titulo: `${nome} abaixo do estoque mínimo`,
        descricao:
          "O saldo central está no limite configurado. Considere realizar uma nova entrada de estoque.",
        detalhe: `${codigo} • saldo ${saldo} • mínimo ${minimo}`,
        dataIso: String(item.updated_at ?? hoje.toISOString()),
        href: "/admin/estoque?estoque=baixo",
      });
    }
  }

  for (const parcela of parcelasResult.data ?? []) {
    const saldo = Math.max(
      0,
      Number(parcela.valor ?? 0) - Number(parcela.valor_pago ?? 0),
    );

    if (saldo <= 0) continue;

    const atraso = diasAtraso(String(parcela.vencimento), hojeIso);
    const cliente = clientesMap.get(Number(parcela.cliente_id));

    alertas.push({
      id: `PARCELA-${parcela.id}`,
      categoria: "FINANCEIRO",
      severidade: atraso >= 30 ? "CRITICO" : "ATENCAO",
      titulo: `${cliente?.nome ?? "Cliente"} possui parcela vencida`,
      descricao:
        atraso >= 30
          ? "A cobrança está em atraso prolongado e merece tratamento prioritário."
          : "Existe valor em aberto após o vencimento.",
      detalhe: `${atraso} dia(s) em atraso • ${moeda(saldo)}`,
      dataIso: `${parcela.vencimento}T12:00:00-03:00`,
      href: "/admin/financeiro?faixa=vencidas",
    });
  }

  for (const carga of cargasResult.data ?? []) {
    const criadaEm = new Date(String(carga.created_at ?? carga.data_carga));
    const idadeDias = Math.max(
      0,
      Math.floor((hoje.getTime() - criadaEm.getTime()) / 86400000),
    );

    alertas.push({
      id: `CARGA-${carga.id}`,
      categoria: "CARGA",
      severidade: idadeDias >= 2 ? "ATENCAO" : "INFO",
      titulo: `Carga ${carga.codigo} ainda está ${String(carga.status).toLowerCase()}`,
      descricao:
        idadeDias >= 2
          ? "Esta carga permanece aberta há mais tempo que o esperado. Verifique a operação do entregador."
          : "A carga ainda faz parte da operação em andamento.",
      detalhe: `${idadeDias} dia(s) aberta • status ${carga.status}`,
      dataIso: String(carga.created_at ?? `${carga.data_carga}T12:00:00-03:00`),
      href: `/admin/cargas/${carga.id}`,
    });
  }

  for (const ocorrencia of ocorrenciasResult.data ?? []) {
    const cliente = clientesMap.get(Number(ocorrencia.cliente_id));

    alertas.push({
      id: `OCORRENCIA-${ocorrencia.id}`,
      categoria: "OCORRENCIA",
      severidade: "ATENCAO",
      titulo: cliente?.nome
        ? `Reagendamento pendente para ${cliente.nome}`
        : "Ocorrência com reagendamento pendente",
      descricao:
        String(ocorrencia.descricao ?? "").trim() ||
        "A ocorrência registrada em campo exige nova tentativa ou acompanhamento.",
      detalhe: `Tipo: ${String(ocorrencia.tipo ?? "ocorrência")}`,
      dataIso: String(ocorrencia.created_at),
      href: "/admin/rotas",
    });
  }

  const limiteUsuarios = Number(empresaResult.data?.limite_usuarios ?? 10);
  const usuariosAtivos = membrosResult.count ?? 0;
  const disponiveis = Math.max(0, limiteUsuarios - usuariosAtivos);

  if (disponiveis === 0) {
    alertas.push({
      id: "USUARIOS-LIMITE",
      categoria: "USUARIOS",
      severidade: "ATENCAO",
      titulo: "Limite de usuários atingido",
      descricao:
        "A empresa não possui mais posições disponíveis para novos colaboradores.",
      detalhe: `${usuariosAtivos} ativo(s) de ${limiteUsuarios} contratado(s)`,
      dataIso: hoje.toISOString(),
      href: "/admin/usuarios",
    });
  } else if (disponiveis <= 2) {
    alertas.push({
      id: "USUARIOS-PROXIMO-LIMITE",
      categoria: "USUARIOS",
      severidade: "INFO",
      titulo: "Poucas posições de usuário disponíveis",
      descricao:
        "A empresa está próxima do limite contratado de acessos.",
      detalhe: `${disponiveis} posição(ões) disponível(is)`,
      dataIso: hoje.toISOString(),
      href: "/admin/usuarios",
    });
  }

  alertas.sort((a, b) => {
    const severidade =
      severidadePeso(b.severidade) - severidadePeso(a.severidade);

    if (severidade !== 0) return severidade;

    return new Date(b.dataIso).getTime() - new Date(a.dataIso).getTime();
  });

  const estadosMap = new Map(
    (estadosResult.data ?? []).map((item) => [
      String(item.alert_key),
      {
        status: String(item.status),
        vistoAt: item.visto_at ? String(item.visto_at) : null,
        resolvidoAt: item.resolvido_at ? String(item.resolvido_at) : null,
      },
    ]),
  );

  const alertasComEstado = alertas.map((alerta) => {
    const estadoSalvo = estadosMap.get(alerta.id);

    return {
      ...alerta,
      estado:
        estadoSalvo?.status === "RESOLVIDO"
          ? "RESOLVIDO"
          : estadoSalvo?.status === "VISTO"
            ? "VISTO"
            : "NOVO",
      vistoAt: estadoSalvo?.vistoAt ?? null,
      resolvidoAt: estadoSalvo?.resolvidoAt ?? null,
    } as Alerta & {
      estado: "NOVO" | "VISTO" | "RESOLVIDO";
      vistoAt: string | null;
      resolvidoAt: string | null;
    };
  });

  const alertasFiltrados = alertasComEstado.filter((alerta) => {
    if (
      categoriaFiltro !== "TODAS" &&
      alerta.categoria !== categoriaFiltro
    ) {
      return false;
    }

    if (
      severidadeFiltro !== "TODAS" &&
      alerta.severidade !== severidadeFiltro
    ) {
      return false;
    }

    if (
      estadoFiltro !== "TODOS" &&
      alerta.estado !== estadoFiltro
    ) {
      return false;
    }

    return true;
  });

  const novos = alertasComEstado.filter((item) => item.estado === "NOVO").length;
  const vistos = alertasComEstado.filter((item) => item.estado === "VISTO").length;
  const resolvidos = alertasComEstado.filter(
    (item) => item.estado === "RESOLVIDO",
  ).length;

  return (
    <main className="app-premium min-h-screen px-4 py-6 text-[#142018] md:px-6 md:py-8">
      <div className="mx-auto max-w-[1180px]">
        <header className="glass flex items-center justify-between gap-4 rounded-[28px] px-5 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-[#176f3c]"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#b07a12]">
                Monitoramento
              </p>
              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Notificações
              </h1>
            </div>
          </div>

          <Link
            href="/admin/notificacoes"
            className="flex h-11 items-center gap-2 rounded-[14px] border border-emerald-100 bg-white px-4 text-[9px] font-black text-[#176f3c]"
          >
            <RefreshCcw size={15} />
            Atualizar
          </Link>
        </header>

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.035]" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
              <Bell size={16} />
              Central de atenção
            </div>

            <h2 className="mt-4 text-[32px] font-black tracking-[-0.055em]">
              O que precisa da sua atenção agora
              <span className="text-[#f4b13f]">.</span>
            </h2>

            <p className="mt-3 max-w-3xl text-[11px] leading-6 text-white/65">
              Alertas calculados a partir da operação real da {usuario.empresa.nomeFantasia}. Esta central não mistura dados de outras empresas.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi label="Alertas ativos" valor={String(alertasComEstado.length)} />
              <Kpi label="Novos" valor={String(novos)} alerta={novos > 0} />
              <Kpi label="Vistos" valor={String(vistos)} warning={vistos > 0} />
              <Kpi label="Resolvidos" valor={String(resolvidos)} />
            </div>
          </div>
        </section>

        <section className="card-premium mt-5 rounded-[30px] p-5">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
            <Filter size={15} />
            Filtros
          </div>

          <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <label>
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Categoria
              </span>
              <select
                name="categoria"
                defaultValue={categoriaFiltro}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[10px] font-semibold"
              >
                <option value="TODAS">Todas</option>
                <option value="ESTOQUE">Estoque</option>
                <option value="FINANCEIRO">Financeiro</option>
                <option value="CARGA">Cargas</option>
                <option value="OCORRENCIA">Ocorrências</option>
                <option value="USUARIOS">Usuários</option>
              </select>
            </label>

            <label>
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Severidade
              </span>
              <select
                name="severidade"
                defaultValue={severidadeFiltro}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[10px] font-semibold"
              >
                <option value="TODAS">Todas</option>
                <option value="CRITICO">Crítico</option>
                <option value="ATENCAO">Atenção</option>
                <option value="INFO">Informativo</option>
              </select>
            </label>


            <label>
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Estado
              </span>
              <select
                name="estado"
                defaultValue={estadoFiltro}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[10px] font-semibold"
              >
                <option value="TODOS">Todos</option>
                <option value="NOVO">Novos</option>
                <option value="VISTO">Vistos</option>
                <option value="RESOLVIDO">Resolvidos</option>
              </select>
            </label>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex h-11 items-center gap-2 rounded-[14px] bg-[#176f3c] px-4 text-[9px] font-black text-white"
              >
                <Filter size={14} />
                Aplicar
              </button>

              <Link
                href="/admin/notificacoes"
                className="flex h-11 items-center rounded-[14px] border border-slate-200 bg-white px-4 text-[9px] font-black text-slate-500"
              >
                Limpar
              </Link>
            </div>
          </form>
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-5">
          {(["ESTOQUE", "FINANCEIRO", "CARGA", "OCORRENCIA", "USUARIOS"] as const).map(
            (categoria) => {
              const total = alertasComEstado.filter(
                (item) => item.categoria === categoria,
              ).length;

              return (
                <Link
                  key={categoria}
                  href={`/admin/notificacoes?categoria=${categoria}`}
                  className="card-premium rounded-[22px] p-4"
                >
                  <div className="text-emerald-700">
                    {categoriaIcone(categoria)}
                  </div>
                  <p className="mt-3 text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">
                    {categoriaLabel(categoria)}
                  </p>
                  <p className="mt-1 text-[20px] font-black">{total}</p>
                </Link>
              );
            },
          )}
        </section>

        <section className="card-premium mt-5 rounded-[30px] p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
                Pendências
              </p>
              <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                Alertas ativos
              </h3>
              <p className="mt-1 text-[8px] text-slate-400">
                {alertasFiltrados.length} alerta(s) no filtro atual. Os mais críticos aparecem primeiro.
              </p>
            </div>

            {novos === 0 && vistos === 0 && (
              <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-[8px] font-black text-emerald-700">
                <ShieldCheck size={14} />
                Nenhum alerta pendente de tratamento
              </div>
            )}
          </div>

          <div className="mt-5 space-y-3">
            {alertasFiltrados.map((alerta) => {
              const classes = severidadeClasses(alerta.severidade);

              return (
                <article
                  key={alerta.id}
                  className={`rounded-[22px] border ${classes.borda} ${classes.fundo} p-4`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${classes.icone}`}
                      >
                        {categoriaIcone(alerta.categoria)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-1 text-[6px] font-black uppercase ${classes.badge}`}
                          >
                            {alerta.severidade === "CRITICO"
                              ? "Crítico"
                              : alerta.severidade === "ATENCAO"
                                ? "Atenção"
                                : "Informativo"}
                          </span>

                          <span
                            className={
                              alerta.estado === "NOVO"
                                ? "rounded-full bg-red-100 px-2 py-1 text-[6px] font-black uppercase text-red-700"
                                : alerta.estado === "VISTO"
                                  ? "rounded-full bg-sky-100 px-2 py-1 text-[6px] font-black uppercase text-sky-700"
                                  : "rounded-full bg-emerald-100 px-2 py-1 text-[6px] font-black uppercase text-emerald-700"
                            }
                          >
                            {alerta.estado === "NOVO"
                              ? "Novo"
                              : alerta.estado === "VISTO"
                                ? "Visto"
                                : "Resolvido"}
                          </span>

                          <span className="text-[6px] font-black uppercase tracking-[0.12em] text-slate-400">
                            {categoriaLabel(alerta.categoria)}
                          </span>
                        </div>

                        <h4 className="mt-2 text-[12px] font-black">
                          {alerta.titulo}
                        </h4>

                        <p className="mt-1 max-w-[680px] text-[8px] leading-4 text-slate-500">
                          {alerta.descricao}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[7px] text-slate-400">
                          <span>{alerta.detalhe}</span>
                          <span className="flex items-center gap-1">
                            <Clock3 size={11} />
                            {dataBR(alerta.dataIso)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      {alerta.estado === "NOVO" && (
                        <form action={marcarNotificacaoVista}>
                          <input type="hidden" name="alert_key" value={alerta.id} />
                          <button
                            type="submit"
                            className="flex h-10 items-center justify-center gap-2 rounded-[13px] border border-sky-100 bg-sky-50 px-3 text-[8px] font-black text-sky-700"
                          >
                            <Eye size={13} />
                            Marcar visto
                          </button>
                        </form>
                      )}

                      {alerta.estado !== "RESOLVIDO" ? (
                        <form action={marcarNotificacaoResolvida}>
                          <input type="hidden" name="alert_key" value={alerta.id} />
                          <button
                            type="submit"
                            className="flex h-10 items-center justify-center gap-2 rounded-[13px] border border-emerald-100 bg-emerald-50 px-3 text-[8px] font-black text-emerald-700"
                          >
                            <CheckCircle2 size={13} />
                            Resolver
                          </button>
                        </form>
                      ) : (
                        <form action={reabrirNotificacao}>
                          <input type="hidden" name="alert_key" value={alerta.id} />
                          <button
                            type="submit"
                            className="flex h-10 items-center justify-center gap-2 rounded-[13px] border border-slate-200 bg-white px-3 text-[8px] font-black text-slate-600"
                          >
                            <RotateCcw size={13} />
                            Reabrir
                          </button>
                        </form>
                      )}

                      <form action={abrirNotificacao}>
                        <input type="hidden" name="alert_key" value={alerta.id} />
                        <input type="hidden" name="href" value={alerta.href} />
                        <button
                          type="submit"
                          className="flex h-10 items-center justify-center gap-2 rounded-[13px] border border-white/70 bg-white px-4 text-[8px] font-black text-[#176f3c] shadow-sm"
                        >
                          Abrir rotina
                          <ArrowUpRight size={14} />
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              );
            })}

            {alertasFiltrados.length === 0 && (
              <div className="rounded-[22px] bg-[#f6f9f6] p-12 text-center">
                <ShieldCheck size={30} className="mx-auto text-emerald-600" />
                <p className="mt-3 text-[11px] font-black">
                  Nenhum alerta encontrado
                </p>
                <p className="mt-1 text-[8px] text-slate-400">
                  Não há pendências para os filtros selecionados.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Kpi({
  label,
  valor,
  alerta = false,
  warning = false,
}: {
  label: string;
  valor: string;
  alerta?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={
        alerta
          ? "rounded-[19px] border border-red-400/40 bg-red-400/[0.10] px-4 py-3.5"
          : warning
            ? "rounded-[19px] border border-amber-400/40 bg-amber-400/[0.10] px-4 py-3.5"
            : "rounded-[19px] border border-white/10 bg-white/[0.07] px-4 py-3.5"
      }
    >
      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>
      <p
        className={
          alerta
            ? "mt-1.5 text-[18px] font-black text-red-200"
            : warning
              ? "mt-1.5 text-[18px] font-black text-amber-200"
              : "mt-1.5 text-[18px] font-black text-white"
        }
      >
        {valor}
      </p>
    </div>
  );
}
