export const instant = false;

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Filter,
  MapPin,
  Route,
  Search,
  Truck,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import RelatorioExportActions from "../RelatorioExportActions";
import RotasCardsClient, { type RotaCardItem } from "./RotasCardsClient";

type PageProps = {
  searchParams: Promise<{
    de?: string;
    ate?: string;
    entregador?: string;
    status?: string;
    busca?: string;
  }>;
};

type RotaRow = {
  id: number;
  codigo: string;
  entregador_id: string;
  data_rota: string;
  status: string;
  observacao: string | null;
  iniciada_at: string | null;
  finalizada_at: string | null;
  origem: string;
  carga_id: number | null;
};

type RotaClienteRow = {
  id: number;
  rota_id: number;
  cliente_id: number;
  sequencia: number;
  status: string;
  observacao: string | null;
  atendido_at: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string | null;
};

type ClienteRow = {
  id: number;
  nome: string;
  codigo: string;
};

function dataIsoLocal(data: Date) {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dataBR(valor: string) {
  const [ano, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(valor: string | null) {
  if (!valor) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(new Date(valor));
}

function duracaoMinutos(inicio: string | null, fim: string | null) {
  if (!inicio || !fim) return null;

  const inicioMs = new Date(inicio).getTime();
  const fimMs = new Date(fim).getTime();

  if (!Number.isFinite(inicioMs) || !Number.isFinite(fimMs) || fimMs < inicioMs) {
    return null;
  }

  return Math.round((fimMs - inicioMs) / 60000);
}

function formatarDuracao(minutos: number | null) {
  if (minutos == null) return "—";

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  if (horas <= 0) return `${resto} min`;
  return `${horas}h ${String(resto).padStart(2, "0")}min`;
}

function rotuloStatus(status: string) {
  const mapa: Record<string, string> = {
    PLANEJADA: "Planejada",
    EM_ROTA: "Em rota",
    FINALIZADA: "Finalizada",
    CANCELADA: "Cancelada",
  };

  return mapa[status] ?? status.replaceAll("_", " ");
}

export default async function RelatorioRotasPage({
  searchParams,
}: PageProps) {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const params = await searchParams;

  const hoje = new Date();
  const inicioPadrao = new Date();
  inicioPadrao.setDate(hoje.getDate() - 29);

  const de = params.de || dataIsoLocal(inicioPadrao);
  const ate = params.ate || dataIsoLocal(hoje);
  const entregadorFiltro = params.entregador || "TODOS";
  const statusFiltro = params.status || "TODOS";
  const busca = (params.busca || "").trim().toLowerCase();

  const supabase = await createClient();

  const [usuariosResult, clientesResult] = await Promise.all([
    supabase.from("usuarios").select("id, nome, ativo").eq("ativo", true),
    supabase
      .from("clientes")
      .select("id, nome, codigo")
      .eq("empresa_id", usuario.empresa.id),
  ]);

  const usuariosMap = new Map(
    (usuariosResult.data ?? []).map((item) => [
      String(item.id),
      String(item.nome),
    ]),
  );

  const clientesMap = new Map<number, ClienteRow>(
    ((clientesResult.data ?? []) as ClienteRow[]).map((item) => [
      Number(item.id),
      item,
    ]),
  );

  let rotasQuery = supabase
    .from("rotas")
    .select(
      "id, codigo, entregador_id, data_rota, status, observacao, iniciada_at, finalizada_at, origem, carga_id",
    )
    .eq("empresa_id", usuario.empresa.id)
    .gte("data_rota", de)
    .lte("data_rota", ate)
    .order("data_rota", { ascending: false })
    .order("created_at", { ascending: false });

  if (entregadorFiltro !== "TODOS") {
    rotasQuery = rotasQuery.eq("entregador_id", entregadorFiltro);
  }

  if (statusFiltro !== "TODOS") {
    rotasQuery = rotasQuery.eq("status", statusFiltro);
  }

  const rotasResult = await rotasQuery.limit(3000);
  let rotas = (rotasResult.data ?? []) as RotaRow[];

  const idsRotas = rotas.map((rota) => Number(rota.id));
  let paradas: RotaClienteRow[] = [];

  if (idsRotas.length > 0) {
    const paradasResult = await supabase
      .from("rota_clientes")
      .select(
        "id, rota_id, cliente_id, sequencia, status, observacao, atendido_at, endereco_bairro, endereco_cidade",
      )
      .eq("empresa_id", usuario.empresa.id)
      .in("rota_id", idsRotas)
      .order("sequencia");

    paradas = (paradasResult.data ?? []) as RotaClienteRow[];
  }

  const paradasPorRota = new Map<number, RotaClienteRow[]>();

  for (const parada of paradas) {
    const rotaId = Number(parada.rota_id);
    const lista = paradasPorRota.get(rotaId) ?? [];
    lista.push(parada);
    paradasPorRota.set(rotaId, lista);
  }

  if (busca) {
    rotas = rotas.filter((rota) => {
      const entregador = usuariosMap.get(rota.entregador_id) ?? "";
      const paradasRota = paradasPorRota.get(Number(rota.id)) ?? [];

      const clientes = paradasRota
        .map((parada) => clientesMap.get(Number(parada.cliente_id))?.nome ?? "")
        .join(" ");

      const bairros = paradasRota
        .map((parada) => parada.endereco_bairro ?? "")
        .join(" ");

      const texto = [
        rota.codigo,
        rota.origem,
        rota.carga_id ? `carga ${rota.carga_id}` : "",
        rota.observacao,
        entregador,
        clientes,
        bairros,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return texto.includes(busca);
    });
  }

  const idsRotasFiltradas = new Set(rotas.map((rota) => Number(rota.id)));
  const paradasFiltradas = paradas.filter((parada) =>
    idsRotasFiltradas.has(Number(parada.rota_id)),
  );

  const totalRotas = rotas.length;
  const planejadas = rotas.filter((rota) => rota.status === "PLANEJADA").length;
  const emRota = rotas.filter((rota) => rota.status === "EM_ROTA").length;
  const finalizadas = rotas.filter((rota) => rota.status === "FINALIZADA").length;

  const totalParadas = paradasFiltradas.length;
  const paradasEntregues = paradasFiltradas.filter(
    (parada) => parada.status === "ENTREGUE",
  ).length;
  const paradasAusentes = paradasFiltradas.filter(
    (parada) => parada.status === "AUSENTE",
  ).length;
  const paradasPendentes = paradasFiltradas.filter(
    (parada) => parada.status === "PENDENTE",
  ).length;

  const taxaAtendimento =
    totalParadas > 0 ? (paradasEntregues / totalParadas) * 100 : 0;

  const duracoesFinalizadas = rotas
    .filter((rota) => rota.status === "FINALIZADA")
    .map((rota) => duracaoMinutos(rota.iniciada_at, rota.finalizada_at))
    .filter((valor): valor is number => valor != null && valor > 0);

  const tempoMedioMin =
    duracoesFinalizadas.length > 0
      ? Math.round(
          duracoesFinalizadas.reduce((total, item) => total + item, 0) /
            duracoesFinalizadas.length,
        )
      : null;

  const minutosFinalizados = rotas
    .filter((rota) => rota.status === "FINALIZADA")
    .reduce((total, rota) => {
      const duracao = duracaoMinutos(rota.iniciada_at, rota.finalizada_at);
      return total + (duracao ?? 0);
    }, 0);

  const entreguesEmRotasFinalizadas = rotas
    .filter((rota) => rota.status === "FINALIZADA")
    .reduce((total, rota) => {
      const lista = paradasPorRota.get(Number(rota.id)) ?? [];
      return total + lista.filter((parada) => parada.status === "ENTREGUE").length;
    }, 0);

  const produtividadeHora =
    minutosFinalizados > 0
      ? entreguesEmRotasFinalizadas / (minutosFinalizados / 60)
      : 0;

  const entregadoresIds = Array.from(
    new Set(rotas.map((rota) => rota.entregador_id)),
  );

  const produtividadePorEntregador = entregadoresIds
    .map((entregadorId) => {
      const rotasEntregador = rotas.filter(
        (rota) => rota.entregador_id === entregadorId,
      );

      const ids = new Set(rotasEntregador.map((rota) => Number(rota.id)));

      const paradasEntregador = paradasFiltradas.filter((parada) =>
        ids.has(Number(parada.rota_id)),
      );

      const entregues = paradasEntregador.filter(
        (parada) => parada.status === "ENTREGUE",
      ).length;

      const ausentes = paradasEntregador.filter(
        (parada) => parada.status === "AUSENTE",
      ).length;

      const duracaoTotal = rotasEntregador.reduce((total, rota) => {
        const duracao = duracaoMinutos(rota.iniciada_at, rota.finalizada_at);
        return total + (duracao ?? 0);
      }, 0);

      return {
        id: entregadorId,
        nome: usuariosMap.get(entregadorId) ?? "Entregador",
        rotas: rotasEntregador.length,
        paradas: paradasEntregador.length,
        entregues,
        ausentes,
        taxa:
          paradasEntregador.length > 0
            ? (entregues / paradasEntregador.length) * 100
            : 0,
        produtividade:
          duracaoTotal > 0 ? entregues / (duracaoTotal / 60) : 0,
      };
    })
    .sort((a, b) => b.entregues - a.entregues);

  const linhasExportacao = rotas.map((rota) => {
    const lista = paradasPorRota.get(Number(rota.id)) ?? [];
    const entregues = lista.filter((parada) => parada.status === "ENTREGUE").length;
    const ausentes = lista.filter((parada) => parada.status === "AUSENTE").length;
    const pendentes = lista.filter((parada) => parada.status === "PENDENTE").length;
    const duracao = duracaoMinutos(rota.iniciada_at, rota.finalizada_at);

    return {
      data: dataBR(rota.data_rota),
      rota: rota.codigo,
      entregador: usuariosMap.get(rota.entregador_id) ?? "Entregador",
      status: rotuloStatus(rota.status),
      origem: rota.origem,
      carga: rota.carga_id ? `#${rota.carga_id}` : "",
      paradas: lista.length,
      entregues,
      ausentes,
      pendentes,
      inicio: formatarDataHora(rota.iniciada_at),
      fim: formatarDataHora(rota.finalizada_at),
      duracao: formatarDuracao(duracao),
    };
  });

  const rotasCards: RotaCardItem[] = rotas.map((rota) => {
    const lista = paradasPorRota.get(Number(rota.id)) ?? [];
    const entregues = lista.filter((parada) => parada.status === "ENTREGUE").length;
    const ausentes = lista.filter((parada) => parada.status === "AUSENTE").length;
    const pendentes = lista.filter((parada) => parada.status === "PENDENTE").length;
    const duracao = duracaoMinutos(rota.iniciada_at, rota.finalizada_at);

    return {
      id: Number(rota.id),
      codigo: rota.codigo,
      data: dataBR(rota.data_rota),
      entregador: usuariosMap.get(rota.entregador_id) ?? "Entregador",
      status: rota.status,
      statusLabel: rotuloStatus(rota.status),
      origem: rota.origem ?? "",
      carga: rota.carga_id ? `Carga #${rota.carga_id}` : "",
      observacao: rota.observacao ?? "",
      inicio: formatarDataHora(rota.iniciada_at),
      fim: formatarDataHora(rota.finalizada_at),
      duracao: formatarDuracao(duracao),
      paradas: lista.length,
      entregues,
      ausentes,
      pendentes,
      taxa: lista.length > 0 ? (entregues / lista.length) * 100 : 0,
      clientes: lista.map((parada) => {
        const cliente = clientesMap.get(Number(parada.cliente_id));

        return {
          sequencia: Number(parada.sequencia),
          cliente: cliente?.nome ?? "Cliente",
          codigoCliente: cliente?.codigo ?? "",
          status: parada.status,
          bairro: parada.endereco_bairro ?? "",
          cidade: parada.endereco_cidade ?? "",
          atendidoEm: formatarDataHora(parada.atendido_at),
          observacao: parada.observacao ?? "",
        };
      }),
    };
  });

  const periodoLabel = `${dataBR(de)} a ${dataBR(ate)}`;

  return (
    <main className="app-premium min-h-screen px-4 py-6 text-[#142018] md:px-6 md:py-8">
      <div className="mx-auto max-w-[1240px]">
        <header className="glass flex items-center justify-between gap-4 rounded-[28px] px-5 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/relatorios"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-[#176f3c]"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#b07a12]">
                Operação
              </p>
              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Rotas e produtividade
              </h1>
            </div>
          </div>

          <RelatorioExportActions
            nomeArquivo={`rotas_produtividade_${de}_${ate}`}
            titulo="Relatório de rotas e produtividade"
            subtitulo={`Período: ${periodoLabel}`}
            colunas={[
              { chave: "data", titulo: "Data" },
              { chave: "rota", titulo: "Rota" },
              { chave: "entregador", titulo: "Entregador" },
              { chave: "status", titulo: "Status" },
              { chave: "origem", titulo: "Origem" },
              { chave: "carga", titulo: "Carga" },
              { chave: "paradas", titulo: "Paradas" },
              { chave: "entregues", titulo: "Entregues" },
              { chave: "ausentes", titulo: "Ausentes" },
              { chave: "pendentes", titulo: "Pendentes" },
              { chave: "inicio", titulo: "Início" },
              { chave: "fim", titulo: "Fim" },
              { chave: "duracao", titulo: "Duração" },
            ]}
            linhas={linhasExportacao}
            resumo={[
              { label: "Rotas", valor: totalRotas },
              { label: "Finalizadas", valor: finalizadas },
              { label: "Em rota", valor: emRota },
              { label: "Paradas", valor: totalParadas },
              { label: "Entregues", valor: paradasEntregues },
              { label: "Ausentes", valor: paradasAusentes },
              { label: "Taxa de atendimento", valor: `${taxaAtendimento.toFixed(1)}%` },
              { label: "Tempo médio", valor: formatarDuracao(tempoMedioMin) },
            ]}
          />
        </header>

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.035]" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
              <Route size={16} />
              Execução de campo
            </div>

            <h2 className="mt-4 text-[32px] font-black tracking-[-0.055em]">
              Da rota planejada ao resultado
              <span className="text-[#f4b13f]">.</span>
            </h2>

            <p className="mt-3 max-w-3xl text-[11px] leading-6 text-white/65">
              Consolidação de rotas, paradas e produtividade entre {periodoLabel}.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-6">
              <Kpi label="Rotas" valor={String(totalRotas)} />
              <Kpi label="Planejadas" valor={String(planejadas)} />
              <Kpi label="Em rota" valor={String(emRota)} />
              <Kpi label="Finalizadas" valor={String(finalizadas)} />
              <Kpi label="Atendimento" valor={`${taxaAtendimento.toFixed(0)}%`} />
              <Kpi
                label="Tempo médio"
                valor={tempoMedioMin == null ? "—" : formatarDuracao(tempoMedioMin)}
              />
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-4">
          <ResumoCard
            icon={<MapPin size={17} />}
            label="Paradas no período"
            valor={String(totalParadas)}
            detalhe={`${paradasEntregues} entregues`}
          />
          <ResumoCard
            icon={<CheckCircle2 size={17} />}
            label="Entregues"
            valor={String(paradasEntregues)}
            detalhe={`${taxaAtendimento.toFixed(1)}% das paradas`}
          />
          <ResumoCard
            icon={<XCircle size={17} />}
            label="Ausentes"
            valor={String(paradasAusentes)}
            detalhe={`${paradasPendentes} pendente(s)`}
          />
          <ResumoCard
            icon={<Clock3 size={17} />}
            label="Produtividade"
            valor={produtividadeHora > 0 ? produtividadeHora.toFixed(2) : "—"}
            detalhe="entregas por hora em rotas finalizadas"
          />
        </section>

        <section className="card-premium mt-5 rounded-[30px] p-5">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
            <Filter size={15} />
            Filtros
          </div>

          <form className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1.2fr_1.1fr_1.2fr_auto]">
            <label className="block">
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                De
              </span>
              <input
                name="de"
                type="date"
                defaultValue={de}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 px-3 text-[10px] font-semibold outline-none focus:border-emerald-400"
              />
            </label>

            <label className="block">
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Até
              </span>
              <input
                name="ate"
                type="date"
                defaultValue={ate}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 px-3 text-[10px] font-semibold outline-none focus:border-emerald-400"
              />
            </label>

            <label className="block">
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Entregador
              </span>
              <select
                name="entregador"
                defaultValue={entregadorFiltro}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[10px] font-semibold outline-none focus:border-emerald-400"
              >
                <option value="TODOS">Todos</option>
                {Array.from(usuariosMap.entries()).map(([id, nome]) => (
                  <option key={id} value={id}>
                    {nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Status
              </span>
              <select
                name="status"
                defaultValue={statusFiltro}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[10px] font-semibold outline-none focus:border-emerald-400"
              >
                <option value="TODOS">Todos</option>
                <option value="PLANEJADA">Planejada</option>
                <option value="EM_ROTA">Em rota</option>
                <option value="FINALIZADA">Finalizada</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </label>

            <label className="block">
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Busca
              </span>
              <div className="relative mt-1">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  name="busca"
                  defaultValue={params.busca ?? ""}
                  placeholder="Rota, cliente, bairro..."
                  className="h-11 w-full rounded-[14px] border border-slate-200 pl-10 pr-3 text-[10px] font-semibold outline-none focus:border-emerald-400"
                />
              </div>
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
                href="/admin/relatorios/rotas"
                className="flex h-11 items-center rounded-[14px] border border-slate-200 bg-white px-4 text-[9px] font-black text-slate-500"
              >
                Limpar
              </Link>
            </div>
          </form>
        </section>

        <section className="card-premium mt-5 rounded-[30px] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="icon-emerald flex h-11 w-11 items-center justify-center rounded-[14px]">
                <UsersRound size={19} />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
                  Equipe
                </p>
                <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                  Produtividade
                </h3>
                <p className="mt-1 text-[8px] leading-4 text-slate-400">
                  Agora a produtividade fica abaixo dos filtros e libera o histórico para usar toda a largura.
                </p>
              </div>
            </div>

            <Link
              href="/admin/rotas"
              className="hidden h-11 items-center justify-center gap-2 rounded-[14px] border border-emerald-100 bg-emerald-50 px-4 text-[9px] font-black text-emerald-800 md:flex"
            >
              <Truck size={15} />
              Abrir operação de rotas
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {produtividadePorEntregador.map((item, index) => (
              <article
                key={item.id}
                className="rounded-[20px] border border-slate-100 bg-[#fbfdfb] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-emerald-50 text-[10px] font-black text-emerald-700">
                      {index + 1}
                    </div>

                    <div>
                      <p className="text-[10px] font-black">{item.nome}</p>
                      <p className="mt-1 text-[8px] text-slate-400">
                        {item.rotas} rota(s) • {item.paradas} parada(s)
                      </p>
                    </div>
                  </div>

                  <span className="text-[15px] font-black text-emerald-700">
                    {item.taxa.toFixed(0)}%
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <MiniCard label="Entregues" valor={item.entregues} />
                  <MiniCard label="Ausentes" valor={item.ausentes} />
                  <MiniCard
                    label="Ent./hora"
                    valor={
                      item.produtividade > 0
                        ? item.produtividade.toFixed(2)
                        : "—"
                    }
                  />
                </div>
              </article>
            ))}
          </div>

          {produtividadePorEntregador.length === 0 && (
            <div className="mt-5 rounded-[20px] bg-[#f6f9f6] p-10 text-center">
              <UserRound size={26} className="mx-auto text-slate-300" />
              <p className="mt-3 text-[10px] font-black">
                Sem produtividade no período
              </p>
            </div>
          )}

          <Link
            href="/admin/rotas"
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-emerald-100 bg-emerald-50 text-[9px] font-black text-emerald-800 md:hidden"
          >
            <Truck size={15} />
            Abrir operação de rotas
          </Link>
        </section>

        <section className="card-premium mt-5 rounded-[30px] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
                Histórico operacional
              </p>
              <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                Rotas do período
              </h3>
              <p className="mt-1 text-[8px] text-slate-400">
                Cards compactos ocupando toda a largura. Clique em uma rota para abrir todos os detalhes.
              </p>
            </div>

            <span className="rounded-full bg-emerald-50 px-3 py-2 text-[8px] font-black text-emerald-700">
              {rotas.length} rota(s)
            </span>
          </div>

          <div className="mt-5">
            {rotas.length === 0 ? (
              <div className="rounded-[20px] bg-[#f6f9f6] p-12 text-center">
                <Route size={28} className="mx-auto text-slate-300" />
                <p className="mt-3 text-[11px] font-black">
                  Nenhuma rota encontrada
                </p>
                <p className="mt-1 text-[9px] text-slate-400">
                  Ajuste os filtros para consultar outro período.
                </p>
              </div>
            ) : (
              <RotasCardsClient rotas={rotasCards} />
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
}: {
  label: string;
  valor: string;
}) {
  return (
    <div className="rounded-[19px] border border-white/10 bg-white/[0.07] px-4 py-3.5 backdrop-blur">
      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>
      <p className="mt-1.5 text-[20px] font-black text-white">{valor}</p>
    </div>
  );
}

function ResumoCard({
  icon,
  label,
  valor,
  detalhe,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
  detalhe: string;
}) {
  return (
    <div className="card-premium rounded-[24px] p-5">
      <div className="text-emerald-700">{icon}</div>
      <p className="mt-4 text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-[23px] font-black tracking-[-0.04em]">{valor}</p>
      <p className="mt-1 text-[8px] text-slate-400">{detalhe}</p>
    </div>
  );
}

function MiniCard({
  label,
  valor,
}: {
  label: string;
  valor: string | number;
}) {
  return (
    <div className="rounded-[13px] bg-[#f5f8f5] px-3 py-2">
      <p className="text-[6px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-[10px] font-black">{valor}</p>
    </div>
  );
}
