export const instant = false;

import {
  ArrowLeft,
  Banknote,
  Boxes,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  Filter,
  History,
  PackageCheck,
  RefreshCcw,
  RotateCcw,
  Truck,
  UserRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import RelatorioExportActions from "../../relatorios/RelatorioExportActions";

type PageProps = {
  searchParams: Promise<{
    data?: string;
    inicio?: string;
    fim?: string;
    entregador?: string;
    salvo?: string;
    nome?: string;
  }>;
};

type ResumoEntregador = {
  id: string;
  nome: string;
  cargas: number;
  cargasAbertas: number;
  carregado: number;
  entregueCarga: number;
  retornado: number;
  avariado: number;
  saldoCarga: number;
  entregasDia: number;
  vendas: number;
  vendaTotal: number;
  avista: number;
  crediario: number;
  crediarioPrazo: number;
  recebido: number;
  dinheiro: number;
  pix: number;
  cartao: number;
  transferencia: number;
  outro: number;
  recebimentosVenda: number;
  recebimentosParcelas: number;
};

function hojeFortaleza() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const mapa = new Map(partes.map((parte) => [parte.type, parte.value]));

  return `${mapa.get("year")}-${mapa.get("month")}-${mapa.get("day")}`;
}

function dataValida(valor?: string) {
  return Boolean(valor && /^\d{4}-\d{2}-\d{2}$/.test(valor));
}

function dataBR(valor: string) {
  const [ano, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${ano}`;
}

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function numero(valor: unknown) {
  const convertido = Number(valor ?? 0);
  return Number.isFinite(convertido) ? convertido : 0;
}

function somarForma(
  resumo: ResumoEntregador,
  forma: unknown,
  valor: unknown,
) {
  const valorNumero = numero(valor);
  const formaTexto = String(forma ?? "OUTRO").toUpperCase();

  resumo.recebido += valorNumero;

  if (formaTexto === "DINHEIRO") resumo.dinheiro += valorNumero;
  else if (formaTexto === "PIX") resumo.pix += valorNumero;
  else if (formaTexto === "CARTAO") resumo.cartao += valorNumero;
  else if (formaTexto === "TRANSFERENCIA") resumo.transferencia += valorNumero;
  else resumo.outro += valorNumero;
}

export default async function FechamentoDiarioPage({
  searchParams,
}: PageProps) {
  const usuario = await getCurrentUserProfile();

  if (!usuario || !usuario.ativo) {
    redirect("/");
  }

  const autorizado =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo === "ADMINISTRADOR" ||
    usuario.perfilCodigo === "GESTOR" ||
    usuario.perfilCodigo === "FINANCEIRO";

  if (!autorizado) {
    redirect("/admin");
  }

  const params = await searchParams;
  const hoje = hojeFortaleza();

  let dataInicio = dataValida(params.inicio)
    ? String(params.inicio)
    : dataValida(params.data)
      ? String(params.data)
      : hoje;

  let dataFim = dataValida(params.fim)
    ? String(params.fim)
    : dataValida(params.data)
      ? String(params.data)
      : dataInicio;

  if (dataInicio > dataFim) {
    [dataInicio, dataFim] = [dataFim, dataInicio];
  }

  const periodoLabel =
    dataInicio === dataFim
      ? dataBR(dataInicio)
      : `${dataBR(dataInicio)} a ${dataBR(dataFim)}`;

  const supabase = await createClient();

  const [membrosResult, perfisResult] = await Promise.all([
    supabase
      .from("empresa_usuarios")
      .select("usuario_id, perfil_id, ativo")
      .eq("empresa_id", usuario.empresa.id)
      .eq("ativo", true),

    supabase
      .from("perfis")
      .select("id, codigo, nome")
      .eq("ativo", true),
  ]);

  const perfilEntregadorIds = new Set(
    (perfisResult.data ?? [])
      .filter((perfil) => String(perfil.codigo) === "ENTREGADOR")
      .map((perfil) => Number(perfil.id)),
  );

  const entregadorIds = (membrosResult.data ?? [])
    .filter((membro) => perfilEntregadorIds.has(Number(membro.perfil_id)))
    .map((membro) => String(membro.usuario_id));

  const usuariosResult =
    entregadorIds.length > 0
      ? await supabase
          .from("usuarios")
          .select("id, nome, email, ativo")
          .in("id", entregadorIds)
      : { data: [] as Array<{ id: string; nome: string; email: string | null; ativo: boolean }> };

  const entregadores = (usuariosResult.data ?? [])
    .map((item) => ({
      id: String(item.id),
      nome: String(item.nome ?? "Entregador"),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const filtroEntregador =
    params.entregador &&
    entregadores.some((item) => item.id === params.entregador)
      ? params.entregador
      : "TODOS";

  const inicioPeriodo = `${dataInicio}T00:00:00-03:00`;
  const fimPeriodo = `${dataFim}T23:59:59.999-03:00`;

  let cargasQuery = supabase
    .from("cargas")
    .select("id, codigo, entregador_id, status, data_carga")
    .eq("empresa_id", usuario.empresa.id)
    .gte("data_carga", dataInicio)
    .lte("data_carga", dataFim);

  let vendasQuery = supabase
    .from("vendas")
    .select(
      "id, entregador_id, tipo_venda, valor_total, valor_entrada, forma_pagamento, created_at",
    )
    .eq("empresa_id", usuario.empresa.id)
    .gte("created_at", inicioPeriodo)
    .lte("created_at", fimPeriodo);

  let entregasQuery = supabase
    .from("entregas")
    .select("id, entregador_id, entregue_at")
    .eq("empresa_id", usuario.empresa.id)
    .gte("entregue_at", inicioPeriodo)
    .lte("entregue_at", fimPeriodo);

  let vendaRecebimentosQuery = supabase
    .from("venda_recebimentos")
    .select("id, recebido_por, valor, forma_pagamento, created_at")
    .eq("empresa_id", usuario.empresa.id)
    .gte("created_at", inicioPeriodo)
    .lte("created_at", fimPeriodo);

  let pagamentosQuery = supabase
    .from("pagamentos")
    .select("id, recebido_por, valor, forma_pagamento, created_at")
    .eq("empresa_id", usuario.empresa.id)
    .gte("created_at", inicioPeriodo)
    .lte("created_at", fimPeriodo);

  if (filtroEntregador !== "TODOS") {
    cargasQuery = cargasQuery.eq("entregador_id", filtroEntregador);
    vendasQuery = vendasQuery.eq("entregador_id", filtroEntregador);
    entregasQuery = entregasQuery.eq("entregador_id", filtroEntregador);
    vendaRecebimentosQuery = vendaRecebimentosQuery.eq(
      "recebido_por",
      filtroEntregador,
    );
    pagamentosQuery = pagamentosQuery.eq("recebido_por", filtroEntregador);
  }

  const [
    cargasResult,
    vendasResult,
    entregasResult,
    vendaRecebimentosResult,
    pagamentosResult,
  ] = await Promise.all([
    cargasQuery,
    vendasQuery,
    entregasQuery,
    vendaRecebimentosQuery,
    pagamentosQuery,
  ]);

  const cargas = cargasResult.data ?? [];
  const cargaIds = cargas.map((carga) => Number(carga.id));

  const cargaItensResult =
    cargaIds.length > 0
      ? await supabase
          .from("carga_itens")
          .select(
            "carga_id, quantidade_carregada, quantidade_entregue, quantidade_retornada, quantidade_avariada",
          )
          .eq("empresa_id", usuario.empresa.id)
          .in("carga_id", cargaIds)
      : {
          data: [] as Array<{
            carga_id: number;
            quantidade_carregada: number | null;
            quantidade_entregue: number | null;
            quantidade_retornada: number | null;
            quantidade_avariada: number | null;
          }>,
        };

  const nomePorId = new Map(entregadores.map((item) => [item.id, item.nome]));

  const idsNoResumo =
    filtroEntregador === "TODOS"
      ? entregadores.map((item) => item.id)
      : [filtroEntregador];

  const resumoMap = new Map<string, ResumoEntregador>();

  for (const id of idsNoResumo) {
    resumoMap.set(id, {
      id,
      nome: nomePorId.get(id) ?? "Entregador",
      cargas: 0,
      cargasAbertas: 0,
      carregado: 0,
      entregueCarga: 0,
      retornado: 0,
      avariado: 0,
      saldoCarga: 0,
      entregasDia: 0,
      vendas: 0,
      vendaTotal: 0,
      avista: 0,
      crediario: 0,
      crediarioPrazo: 0,
      recebido: 0,
      dinheiro: 0,
      pix: 0,
      cartao: 0,
      transferencia: 0,
      outro: 0,
      recebimentosVenda: 0,
      recebimentosParcelas: 0,
    });
  }

  const cargaEntregador = new Map<number, string>();

  for (const carga of cargas) {
    const entregadorId = String(carga.entregador_id);
    cargaEntregador.set(Number(carga.id), entregadorId);

    const resumo = resumoMap.get(entregadorId);
    if (!resumo) continue;

    resumo.cargas += 1;

    if (String(carga.status).toUpperCase() !== "FINALIZADA") {
      resumo.cargasAbertas += 1;
    }
  }

  for (const item of cargaItensResult.data ?? []) {
    const entregadorId = cargaEntregador.get(Number(item.carga_id));
    if (!entregadorId) continue;

    const resumo = resumoMap.get(entregadorId);
    if (!resumo) continue;

    resumo.carregado += numero(item.quantidade_carregada);
    resumo.entregueCarga += numero(item.quantidade_entregue);
    resumo.retornado += numero(item.quantidade_retornada);
    resumo.avariado += numero(item.quantidade_avariada);
  }

  for (const resumo of resumoMap.values()) {
    resumo.saldoCarga = Math.max(
      0,
      resumo.carregado -
        resumo.entregueCarga -
        resumo.retornado -
        resumo.avariado,
    );
  }

  for (const entrega of entregasResult.data ?? []) {
    const resumo = resumoMap.get(String(entrega.entregador_id));
    if (resumo) resumo.entregasDia += 1;
  }

  for (const venda of vendasResult.data ?? []) {
    const resumo = resumoMap.get(String(venda.entregador_id));
    if (!resumo) continue;

    const total = numero(venda.valor_total);
    const entrada = numero(venda.valor_entrada);
    const tipo = String(venda.tipo_venda ?? "").toUpperCase();

    resumo.vendas += 1;
    resumo.vendaTotal += total;

    if (tipo === "AVISTA") {
      resumo.avista += total;
    } else if (tipo === "CREDIARIO") {
      resumo.crediario += total;
      resumo.crediarioPrazo += Math.max(0, total - entrada);
    }
  }

  for (const recebimento of vendaRecebimentosResult.data ?? []) {
    const resumo = resumoMap.get(String(recebimento.recebido_por));
    if (!resumo) continue;

    const valor = numero(recebimento.valor);
    resumo.recebimentosVenda += valor;
    somarForma(resumo, recebimento.forma_pagamento, valor);
  }

  for (const pagamento of pagamentosResult.data ?? []) {
    const resumo = resumoMap.get(String(pagamento.recebido_por));
    if (!resumo) continue;

    const valor = numero(pagamento.valor);
    resumo.recebimentosParcelas += valor;
    somarForma(resumo, pagamento.forma_pagamento, valor);
  }

  const resumos = Array.from(resumoMap.values()).sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  );

  const fechamentosResult =
    idsNoResumo.length > 0
      ? await supabase
          .from("fechamentos_entregador")
          .select(
            "id, entregador_id, status, diferenca_total, conferido_at",
          )
          .eq("empresa_id", usuario.empresa.id)
          .eq("data_inicio", dataInicio)
          .eq("data_fim", dataFim)
          .in("entregador_id", idsNoResumo)
      : {
          data: [] as Array<{
            id: number;
            entregador_id: string;
            status: string;
            diferenca_total: number | null;
            conferido_at: string | null;
          }>,
        };

  const fechamentoMap = new Map(
    (fechamentosResult.data ?? []).map((item) => [
      String(item.entregador_id),
      item,
    ]),
  );

  const total = resumos.reduce(
    (acc, item) => ({
      cargas: acc.cargas + item.cargas,
      carregado: acc.carregado + item.carregado,
      entregueCarga: acc.entregueCarga + item.entregueCarga,
      retornado: acc.retornado + item.retornado,
      avariado: acc.avariado + item.avariado,
      saldoCarga: acc.saldoCarga + item.saldoCarga,
      entregasDia: acc.entregasDia + item.entregasDia,
      vendas: acc.vendas + item.vendas,
      vendaTotal: acc.vendaTotal + item.vendaTotal,
      avista: acc.avista + item.avista,
      crediario: acc.crediario + item.crediario,
      crediarioPrazo: acc.crediarioPrazo + item.crediarioPrazo,
      recebido: acc.recebido + item.recebido,
      dinheiro: acc.dinheiro + item.dinheiro,
      pix: acc.pix + item.pix,
      cartao: acc.cartao + item.cartao,
      transferencia: acc.transferencia + item.transferencia,
      outro: acc.outro + item.outro,
    }),
    {
      cargas: 0,
      carregado: 0,
      entregueCarga: 0,
      retornado: 0,
      avariado: 0,
      saldoCarga: 0,
      entregasDia: 0,
      vendas: 0,
      vendaTotal: 0,
      avista: 0,
      crediario: 0,
      crediarioPrazo: 0,
      recebido: 0,
      dinheiro: 0,
      pix: 0,
      cartao: 0,
      transferencia: 0,
      outro: 0,
    },
  );

  const linhasExportacao = resumos.map((item) => ({
    entregador: item.nome,
    cargas: item.cargas,
    carregado: item.carregado,
    entregue: item.entregueCarga,
    retornado: item.retornado,
    avariado: item.avariado,
    saldoCarga: item.saldoCarga,
    entregasDia: item.entregasDia,
    vendas: item.vendas,
    vendaTotal: moeda(item.vendaTotal),
    avista: moeda(item.avista),
    crediario: moeda(item.crediario),
    crediarioPrazo: moeda(item.crediarioPrazo),
    recebido: moeda(item.recebido),
    dinheiro: moeda(item.dinheiro),
    pix: moeda(item.pix),
    cartao: moeda(item.cartao),
    transferencia: moeda(item.transferencia),
    outro: moeda(item.outro),
    prestacao:
      fechamentoMap.get(item.id)?.status === "CONFERIDO"
        ? "Conferido"
        : fechamentoMap.get(item.id)?.status === "COM_DIVERGENCIA"
          ? "Com divergência"
          : "Pendente",
  }));

  return (
    <main className="app-premium min-h-screen px-4 py-6 text-[#142018] md:px-6 md:py-8">
      <div className="mx-auto max-w-[1280px]">
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
                Financeiro operacional
              </p>
              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Fechamento diário
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/financeiro/fechamento/historico"
              className="flex h-10 items-center gap-2 rounded-[13px] border border-emerald-100 bg-emerald-50 px-4 text-[8px] font-black text-emerald-800"
            >
              <History size={14} />
              Histórico
            </Link>

            <RelatorioExportActions
              nomeArquivo={`fechamento_${dataInicio}_${dataFim}`}
            titulo="Fechamento por período e entregador"
            subtitulo={`${usuario.empresa.nomeFantasia} • ${periodoLabel}`}
            colunas={[
              { chave: "entregador", titulo: "Entregador" },
              { chave: "carregado", titulo: "Carregado" },
              { chave: "entregue", titulo: "Entregue" },
              { chave: "retornado", titulo: "Retornado" },
              { chave: "avariado", titulo: "Avariado" },
              { chave: "saldoCarga", titulo: "Saldo carga" },
              { chave: "vendas", titulo: "Vendas" },
              { chave: "vendaTotal", titulo: "Venda total" },
              { chave: "recebido", titulo: "Recebido" },
              { chave: "dinheiro", titulo: "Dinheiro" },
              { chave: "pix", titulo: "PIX" },
              { chave: "cartao", titulo: "Cartão" },
              { chave: "crediarioPrazo", titulo: "Crediário a prazo" },
              { chave: "prestacao", titulo: "Prestação" },
            ]}
            linhas={linhasExportacao}
            resumo={[
              { label: "Período", valor: periodoLabel },
              { label: "Vendas", valor: total.vendas },
              { label: "Venda total", valor: moeda(total.vendaTotal) },
              { label: "Recebido no período", valor: moeda(total.recebido) },
              { label: "Dinheiro", valor: moeda(total.dinheiro) },
              { label: "Saldo de carga", valor: total.saldoCarga },
              ]}
            />
          </div>
        </header>

        {params.salvo === "1" && (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-[18px] border border-emerald-200 bg-emerald-50 px-5 py-4">
            <div className="flex items-center gap-3 text-emerald-800">
              <CheckCircle2 size={18} />
              <div>
                <p className="text-[9px] font-black">
                  Prestação de contas salva com sucesso.
                </p>
                <p className="mt-0.5 text-[7px] text-emerald-700/70">
                  {params.nome
                    ? `${params.nome} foi atualizado no período ${periodoLabel}.`
                    : `Fechamento atualizado no período ${periodoLabel}.`}
                </p>
              </div>
            </div>

            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[7px] font-black uppercase text-emerald-700">
              Conferência registrada
            </span>
          </div>
        )}

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.035]" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
              <ClipboardCheck size={16} />
              Prestação de contas
            </div>

            <h2 className="mt-4 text-[32px] font-black tracking-[-0.055em]">
              A operação do entregador em uma única conferência
              <span className="text-[#f4b13f]">.</span>
            </h2>

            <p className="mt-3 max-w-3xl text-[11px] leading-6 text-white/65">
              Carga, entregas, vendas e recebimentos consolidados no período selecionado. Para fechar um único dia, informe a mesma data no início e no final. Os valores são calculados a partir dos registros reais do sistema e ainda não representam um aceite físico de caixa.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi label="Venda total" valor={moeda(total.vendaTotal)} />
              <Kpi label="Recebido no período" valor={moeda(total.recebido)} />
              <Kpi label="Crediário a prazo" valor={moeda(total.crediarioPrazo)} />
              <Kpi
                label="Saldo em carga"
                valor={String(total.saldoCarga)}
                alerta={total.saldoCarga > 0}
              />
            </div>
          </div>
        </section>

        <section className="card-premium mt-5 rounded-[30px] p-5">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
            <Filter size={15} />
            Filtros
          </div>

          <form className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1.5fr_auto]">
            <label>
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Data inicial
              </span>
              <input
                type="date"
                name="inicio"
                defaultValue={dataInicio}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 px-3 text-[10px] font-semibold"
              />
            </label>

            <label>
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Data final
              </span>
              <input
                type="date"
                name="fim"
                defaultValue={dataFim}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 px-3 text-[10px] font-semibold"
              />
            </label>

            <label>
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Entregador
              </span>
              <select
                name="entregador"
                defaultValue={filtroEntregador}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[10px] font-semibold"
              >
                <option value="TODOS">Todos os entregadores</option>
                {entregadores.map((entregador) => (
                  <option key={entregador.id} value={entregador.id}>
                    {entregador.nome}
                  </option>
                ))}
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
                href="/admin/financeiro/fechamento"
                className="flex h-11 items-center gap-2 rounded-[14px] border border-slate-200 bg-white px-4 text-[9px] font-black text-slate-500"
              >
                <RefreshCcw size={14} />
                Hoje
              </Link>
            </div>
          </form>

          <div className="mt-3 flex items-center justify-between rounded-[14px] bg-[#f6f9f6] px-4 py-3">
            <p className="text-[8px] font-semibold text-slate-500">
              Período atual: <span className="font-black text-[#176f3c]">{periodoLabel}</span>
            </p>
            <p className="text-[7px] text-slate-400">
              Para um único dia, use a mesma data no início e no final.
            </p>
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <MiniCard icon={<Truck size={16} />} label="Carregado" valor={String(total.carregado)} />
          <MiniCard icon={<PackageCheck size={16} />} label="Entregue carga" valor={String(total.entregueCarga)} />
          <MiniCard icon={<RotateCcw size={16} />} label="Retornado" valor={String(total.retornado)} />
          <MiniCard icon={<Boxes size={16} />} label="Avariado" valor={String(total.avariado)} />
          <MiniCard icon={<CheckCircle2 size={16} />} label="Entregas período" valor={String(total.entregasDia)} />
          <MiniCard icon={<CircleDollarSign size={16} />} label="Vendas" valor={String(total.vendas)} />
        </section>

        <section className="card-premium mt-5 rounded-[30px] p-5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
              Conciliação
            </p>
            <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
              Por entregador
            </h3>
            <p className="mt-1 text-[8px] text-slate-400">
              Valores de recebimento incluem vendas registradas em campo e cobranças de parcelas recebidas pelo usuário no período. A coluna Prestação mostra se o financeiro já conferiu formalmente o período.
            </p>
          </div>

          <div className="mt-5 overflow-hidden rounded-[20px] border border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1760px] table-fixed border-collapse text-center">
                <colgroup>
                  <col className="w-[150px]" />
                  <col className="w-[72px]" />
                  <col className="w-[82px]" />
                  <col className="w-[82px]" />
                  <col className="w-[82px]" />
                  <col className="w-[82px]" />
                  <col className="w-[72px]" />
                  <col className="w-[82px]" />
                  <col className="w-[72px]" />
                  <col className="w-[100px]" />
                  <col className="w-[92px]" />
                  <col className="w-[92px]" />
                  <col className="w-[100px]" />
                  <col className="w-[92px]" />
                  <col className="w-[92px]" />
                  <col className="w-[92px]" />
                  <col className="w-[92px]" />
                  <col className="w-[116px]" />
                  <col className="w-[116px]" />
                </colgroup>
                <thead className="bg-[#f6f9f6]">
                  <tr>
                    {[
                      "Entregador",
                      "Carga",
                      "Carregado",
                      "Entregue",
                      "Retornado",
                      "Avariado",
                      "Saldo",
                      "Entregas",
                      "Vendas",
                      "Venda total",
                      "À vista",
                      "Crediário",
                      "Recebido",
                      "Dinheiro",
                      "PIX",
                      "Cartão",
                      "Transf.",
                      "Prestação",
                      "Ação",
                    ].map((titulo) => (
                      <th
                        key={titulo}
                        className="whitespace-nowrap px-2 py-3 text-center text-[7px] font-black uppercase tracking-[0.08em] text-slate-400"
                      >
                        {titulo}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {resumos.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-slate-100 bg-white hover:bg-[#fbfdfb]"
                    >
                      <td className="px-2 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                            <UserRound size={14} />
                          </div>
                          <div>
                            <p className="text-[9px] font-black">{item.nome}</p>
                            <p className="mt-0.5 text-[6px] text-slate-400">
                              {item.cargasAbertas > 0
                                ? `${item.cargasAbertas} carga(s) aberta(s)`
                                : "Sem carga aberta"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <Numero valor={item.cargas} />
                      <Numero valor={item.carregado} />
                      <Numero valor={item.entregueCarga} />
                      <Numero valor={item.retornado} />
                      <Numero valor={item.avariado} />
                      <Numero valor={item.saldoCarga} alerta={item.saldoCarga > 0} />
                      <Numero valor={item.entregasDia} />
                      <Numero valor={item.vendas} />
                      <Valor valor={item.vendaTotal} destaque />
                      <Valor valor={item.avista} />
                      <Valor valor={item.crediario} />
                      <Valor valor={item.recebido} destaque />
                      <Valor valor={item.dinheiro} />
                      <Valor valor={item.pix} />
                      <Valor valor={item.cartao} />
                      <Valor valor={item.transferencia} />
                      <td className="px-3 py-4 text-center">
                        {(() => {
                          const fechamento = fechamentoMap.get(item.id);

                          if (!fechamento) {
                            return (
                              <span className="inline-flex h-9 w-[96px] items-center justify-center rounded-[12px] bg-slate-100 px-3 text-center text-[7px] font-black uppercase text-slate-500">
                                Pendente
                              </span>
                            );
                          }

                          if (fechamento.status === "CONFERIDO") {
                            return (
                              <span className="inline-flex h-9 w-[96px] items-center justify-center rounded-[12px] bg-emerald-100 px-3 text-center text-[7px] font-black uppercase text-emerald-700">
                                Conferido
                              </span>
                            );
                          }

                          return (
                            <span className="inline-flex h-9 w-[96px] items-center justify-center rounded-[12px] bg-red-100 px-3 text-center text-[7px] font-black uppercase text-red-700">
                              Divergência
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-4 text-center">
                        <Link
                          href={`/admin/financeiro/fechamento/${item.id}?inicio=${dataInicio}&fim=${dataFim}`}
                          className="inline-flex h-9 w-[96px] items-center justify-center rounded-[12px] bg-[#176f3c] px-3 text-center text-[7px] font-black text-white"
                        >
                          {fechamentoMap.has(item.id) ? "Revisar" : "Conferir"}
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {resumos.length === 0 && (
                    <tr>
                      <td
                        colSpan={19}
                        className="px-5 py-14 text-center text-[10px] text-slate-400"
                      >
                        Nenhum entregador ativo encontrado para esta empresa.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Forma icon={<Banknote size={17} />} label="Dinheiro" valor={total.dinheiro} />
          <Forma icon={<WalletCards size={17} />} label="PIX" valor={total.pix} />
          <Forma icon={<CreditCard size={17} />} label="Cartão" valor={total.cartao} />
          <Forma icon={<CircleDollarSign size={17} />} label="Transferência" valor={total.transferencia} />
          <Forma icon={<CalendarDays size={17} />} label="Crediário a prazo" valor={total.crediarioPrazo} />
        </section>
      </div>
    </main>
  );
}

function Kpi({
  label,
  valor,
  alerta = false,
}: {
  label: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <div
      className={
        alerta
          ? "rounded-[19px] border border-amber-400/40 bg-amber-400/[0.10] px-4 py-3.5"
          : "rounded-[19px] border border-white/10 bg-white/[0.07] px-4 py-3.5"
      }
    >
      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>
      <p className={alerta ? "mt-1.5 text-[17px] font-black text-amber-200" : "mt-1.5 text-[17px] font-black text-white"}>
        {valor}
      </p>
    </div>
  );
}

function MiniCard({
  icon,
  label,
  valor,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="card-premium rounded-[22px] p-4">
      <div className="text-emerald-700">{icon}</div>
      <p className="mt-3 text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-[19px] font-black">{valor}</p>
    </div>
  );
}

function Numero({
  valor,
  alerta = false,
}: {
  valor: number;
  alerta?: boolean;
}) {
  return (
    <td
      className={
        alerta
          ? "px-2 py-4 text-center text-[9px] font-black tabular-nums text-amber-700"
          : "px-2 py-4 text-center text-[9px] font-black tabular-nums text-slate-700"
      }
    >
      {valor}
    </td>
  );
}

function Valor({
  valor,
  destaque = false,
}: {
  valor: number;
  destaque?: boolean;
}) {
  return (
    <td
      className={
        destaque
          ? "whitespace-nowrap px-2 py-4 text-center text-[9px] font-black tabular-nums text-emerald-700"
          : "whitespace-nowrap px-2 py-4 text-center text-[8px] font-bold tabular-nums text-slate-600"
      }
    >
      {moeda(valor)}
    </td>
  );
}

function Forma({
  icon,
  label,
  valor,
}: {
  icon: React.ReactNode;
  label: string;
  valor: number;
}) {
  return (
    <div className="card-premium rounded-[24px] p-5">
      <div className="text-emerald-700">{icon}</div>
      <p className="mt-4 text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-[18px] font-black">{moeda(valor)}</p>
    </div>
  );
}
