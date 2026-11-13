export const instant = false;

// V126: auditoria somente leitura, sem RPC de movimentacao e sem alteracao de estoque.
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle, ArrowLeft, ArrowUpRight, CheckCircle2,
  ClipboardCheck, History, PackageCheck, ScanBarcode, ShieldCheck, Truck,
} from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { temPerfilGestao } from "@/lib/gestao/indicadores-v119";
import { createClient } from "@/lib/supabase/server";
import ExportarAuditoriaCsv, { type AuditoriaCsvLinha } from "./ExportarAuditoriaCsv";

type Carga = { id: number; codigo: string; status: string; created_at: string; finalizada_at: string | null };
type Item = { carga_id: number; tipo_cesta_id: number; quantidade_carregada: number; quantidade_entregue: number; quantidade_retornada: number; quantidade_avariada: number };
type Volume = { carga_id: number | null; tipo_cesta_id: number; codigo_volume: string; status: string };
type Movimento = { id: number; carga_id: number | null; tipo_cesta_id: number; tipo_movimento: string; quantidade: number; created_at: string; observacao: string | null };
type Props = { searchParams: Promise<{ carga?: string; situacao?: string }> };

function numero(valor: unknown) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}
function dataPt(valor: string | null) {
  if (!valor) return "Ainda não finalizada";
  const dt = new Date(valor);
  return Number.isNaN(dt.getTime())
    ? "Data indisponível"
    : dt.toLocaleString("pt-BR", { timeZone: "America/Fortaleza", dateStyle: "short", timeStyle: "short" });
}
function Bloco({ titulo, valor, detalhe }: { titulo: string; valor: number; detalhe: string }) {
  return (
    <div className="rounded-[19px] border border-[#c9ddcf] bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-[#506857]">{titulo}</p>
      <p className="mt-2 text-[27px] font-black tabular-nums leading-none text-[#103e24]">{valor}</p>
      <p className="mt-2 text-xs leading-5 text-[#657667]">{detalhe}</p>
    </div>
  );
}

export default async function AuditoriaDevolucoesV126({ searchParams }: Props) {
  const usuario = await getCurrentUserProfile();
  if (!usuario || !usuario.ativo) redirect("/");
  if (!temPerfilGestao(usuario)) redirect("/admin");

  const { carga: cargaTexto, situacao: situacaoTexto } = await searchParams;
  const situacao = ["todas", "divergentes", "conciliadas", "nao-finalizadas"].includes(situacaoTexto ?? "")
    ? situacaoTexto!
    : "todas";
  const filtroValido = typeof cargaTexto === "string" && /^[1-9]\d{0,8}$/.test(cargaTexto);
  const cargaFiltrada = filtroValido ? Number(cargaTexto) : null;
  const modoVolume = usuario.configuracao.modoControleCarga === "VOLUME";
  const db = await createClient();
  const empresaId = usuario.empresa.id;

  let busca = db.from("cargas")
    .select("id,codigo,status,created_at,finalizada_at")
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (cargaFiltrada !== null) busca = busca.eq("id", cargaFiltrada);

  const cargasResult = await busca;
  const cargas = (cargasResult.data ?? []) as Carga[];
  const ids = cargas.map((c) => c.id);
  const semCarga = ids.length === 0;

  const [itensResult, movimentosResult, volumesResult] = semCarga
    ? [null, null, null]
    : await Promise.all([
      db.from("carga_itens")
        .select("carga_id,tipo_cesta_id,quantidade_carregada,quantidade_entregue,quantidade_retornada,quantidade_avariada", { count: "exact" })
        .eq("empresa_id", empresaId).in("carga_id", ids).limit(3000),
      db.from("movimentacoes_estoque")
        .select("id,carga_id,tipo_cesta_id,tipo_movimento,quantidade,created_at,observacao", { count: "exact" })
        .eq("empresa_id", empresaId).in("carga_id", ids)
        .in("tipo_movimento", ["RETORNO_CARGA_CENTRAL", "AVARIA_CARGA"])
        .order("created_at", { ascending: false }).limit(3000),
      modoVolume
        ? db.from("cesta_volumes")
          .select("carga_id,tipo_cesta_id,codigo_volume,status", { count: "exact" })
          .eq("empresa_id", empresaId).in("carga_id", ids).limit(3000)
        : Promise.resolve({ data: [], error: null, count: 0 }),
    ]);

  const erroConsulta = Boolean(cargasResult.error || itensResult?.error || movimentosResult?.error || volumesResult?.error);
  const incompleto = [itensResult, movimentosResult, volumesResult].some((r) => (r?.count ?? 0) > 3000);
  const itens = (itensResult?.data ?? []) as Item[];
  const movimentos = (movimentosResult?.data ?? []) as Movimento[];
  const volumes = (volumesResult?.data ?? []) as Volume[];

  // V128: identifica os tipos reais de cesta sem consultar outras empresas.
  // Erro ao ler o cadastro nao mascara divergencias: exibe o ID do tipo.
  const tipoIds = Array.from(new Set([
    ...itens.map((i) => numero(i.tipo_cesta_id)),
    ...movimentos.map((m) => numero(m.tipo_cesta_id)),
    ...volumes.map((v) => numero(v.tipo_cesta_id)),
  ])).filter((id) => Number.isInteger(id) && id > 0);
  const tiposResult = !erroConsulta && !incompleto && tipoIds.length
    ? await db.from("tipos_cesta").select("id,nome,codigo")
      .eq("empresa_id", empresaId).in("id", tipoIds).limit(3000)
    : null;
  const nomePorTipo = new Map(
    (tiposResult?.data ?? []).map((tipo) => [
      numero(tipo.id),
      String(tipo.nome || tipo.codigo || ("Tipo nº " + tipo.id)),
    ]),
  );

  const resumo = !erroConsulta && !incompleto ? cargas.map((carga) => {
    const relacionados = itens.filter((i) => i.carga_id === carga.id);
    const movimentosCarga = movimentos.filter((m) => m.carga_id === carga.id);
    const volumesCarga = volumes.filter((v) => v.carga_id === carga.id);
    const total = (campo: keyof Omit<Item, "carga_id">) =>
      relacionados.reduce((soma, item) => soma + numero(item[campo]), 0);
    const carregado = total("quantidade_carregada");
    const entregue = total("quantidade_entregue");
    const retornado = total("quantidade_retornada");
    const avariado = total("quantidade_avariada");
    const emPosse = carregado - entregue - retornado - avariado;
    const movimento = (tipo: string) =>
      movimentosCarga.filter((m) => m.tipo_movimento === tipo)
        .reduce((soma, m) => soma + numero(m.quantidade), 0);
    const retornoEstoque = movimento("RETORNO_CARGA_CENTRAL");
    const baixaAvaria = movimento("AVARIA_CARGA");
    const volumesNormais = volumesCarga.filter((v) => v.status === "RETORNADO").length;
    const volumesAvariados = volumesCarga.filter((v) => v.status === "AVARIADO").length;
    const encerrada = carga.status === "FINALIZADA";
    // V128: totais iguais podem ocultar erros que se compensam entre SKUs.
    // Compara cada tipo de cesta com suas movimentacoes e volumes fisicos.
    const idsTipoCarga = Array.from(new Set([
      ...relacionados.map((i) => numero(i.tipo_cesta_id)),
      ...movimentosCarga.map((m) => numero(m.tipo_cesta_id)),
      ...volumesCarga.map((v) => numero(v.tipo_cesta_id)),
    ])).sort((a, b) => a - b);
    const porTipo = idsTipoCarga.map((tipoId) => {
      const itensTipo = relacionados.filter((i) => numero(i.tipo_cesta_id) === tipoId);
      const movimentosTipo = movimentosCarga.filter((m) => numero(m.tipo_cesta_id) === tipoId);
      const volumesTipo = volumesCarga.filter((v) => numero(v.tipo_cesta_id) === tipoId);
      const somaItem = (chave: keyof Omit<Item, "carga_id" | "tipo_cesta_id">) =>
        itensTipo.reduce((soma, i) => soma + numero(i[chave]), 0);
      const somaMovimento = (tipo: string) => movimentosTipo
        .filter((m) => m.tipo_movimento === tipo)
        .reduce((soma, m) => soma + numero(m.quantidade), 0);
      const carregadasTipo = somaItem("quantidade_carregada");
      const entreguesTipo = somaItem("quantidade_entregue");
      const retornadasTipo = somaItem("quantidade_retornada");
      const avariadasTipo = somaItem("quantidade_avariada");
      const posseTipo = carregadasTipo - entreguesTipo - retornadasTipo - avariadasTipo;
      const retornoMovimento = somaMovimento("RETORNO_CARGA_CENTRAL");
      const avariaMovimento = somaMovimento("AVARIA_CARGA");
      const retornadosFisicos = volumesTipo.filter((v) => v.status === "RETORNADO").length;
      const avariadosFisicos = volumesTipo.filter((v) => v.status === "AVARIADO").length;
      const alertas: string[] = [];
      if (encerrada) {
        if (!itensTipo.length) alertas.push("Movimentação/volume sem item correspondente na carga.");
        if (posseTipo !== 0) alertas.push(`Saldo não conciliado neste tipo: ${posseTipo}.`);
        if (retornadasTipo !== retornoMovimento)
          alertas.push(`Retorno: carga informa ${retornadasTipo}, estoque registra ${retornoMovimento}.`);
        if (avariadasTipo !== avariaMovimento)
          alertas.push(`Avaria: carga informa ${avariadasTipo}, movimentações registram ${avariaMovimento}.`);
        if (modoVolume && retornadosFisicos !== retornadasTipo)
          alertas.push(`Volumes RETORNADO: ${retornadosFisicos}; quantidade retornada: ${retornadasTipo}.`);
        if (modoVolume && avariadosFisicos !== avariadasTipo)
          alertas.push(`Volumes AVARIADO: ${avariadosFisicos}; quantidade avariada: ${avariadasTipo}.`);
      }
      return {
        tipoId, nome: nomePorTipo.get(tipoId) ?? `Tipo de cesta nº ${tipoId}`,
        carregadasTipo, entreguesTipo, retornadasTipo, avariadasTipo, posseTipo,
        retornoMovimento, avariaMovimento, retornadosFisicos, avariadosFisicos, alertas,
      };
    });
    const divergenciaTipo = porTipo.some((tipo) => tipo.alertas.length > 0);
    const confiavel = encerrada && relacionados.length > 0 &&
      emPosse === 0 && retornado === retornoEstoque && avariado === baixaAvaria &&
      (!modoVolume || (volumesNormais === retornado && volumesAvariados === avariado)) &&
      !divergenciaTipo;
    const divergencia = encerrada && !confiavel;
    return { carga, carregado, entregue, retornado, avariado, emPosse,
      retornoEstoque, baixaAvaria, volumesNormais, volumesAvariados, volumesCarga,
      porTipo, movimentosCarga, encerrada, confiavel, divergencia };
  }) : [];

  // V130: o filtro age somente sobre as ultimas 20 cargas carregadas,
  // para nao prometer que este painel representa todo o historico.
  const resumoFiltrado = resumo.filter((r) =>
    situacao === "divergentes" ? r.divergencia
    : situacao === "conciliadas" ? r.confiavel
    : situacao === "nao-finalizadas" ? !r.encerrada
    : true,
  );
  const finalizadas = resumoFiltrado.filter((r) => r.encerrada).length;
  const divergentes = resumoFiltrado.filter((r) => r.divergencia).length;
  const retornos = resumoFiltrado.reduce((s, r) => s + r.retornado, 0);
  const avarias = resumoFiltrado.reduce((s, r) => s + r.avariado, 0);
  const linhasCsv: AuditoriaCsvLinha[] = resumoFiltrado.flatMap((r) =>
    r.porTipo.map((tipo) => ({
      cargaId: r.carga.id,
      cargaCodigo: r.carga.codigo,
      statusCarga: r.carga.status,
      dataFechamento: dataPt(r.carga.finalizada_at),
      conciliacao: r.divergencia ? "Divergente" : r.confiavel ? "Conciliada" : "Nao finalizada",
      tipoId: tipo.tipoId,
      tipoNome: tipo.nome,
      carregadas: tipo.carregadasTipo,
      entregues: tipo.entreguesTipo,
      retornadas: tipo.retornadasTipo,
      entradaCd: tipo.retornoMovimento,
      avariadas: tipo.avariadasTipo,
      baixaAvaria: tipo.avariaMovimento,
      saldoPosse: tipo.posseTipo,
      volumesRetornados: modoVolume ? tipo.retornadosFisicos : null,
      volumesAvariados: modoVolume ? tipo.avariadosFisicos : null,
      alertas: tipo.alertas.join(" | "),
    })),
  );

  return (
    <main className="app-premium min-h-screen px-4 py-6 text-[#142018] md:px-8">
      <div className="mx-auto max-w-[1320px] space-y-5">
        <header className="hero-premium grain rounded-[28px] p-6 text-white">
          <Link prefetch={false} href="/admin" className="inline-flex items-center gap-2 text-xs font-black text-emerald-100">
            <ArrowLeft size={16} /> Central de gestão
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ClipboardCheck size={28} />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-200">Auditoria operacional · V130</p>
              <h1 className="mt-1 text-[26px] font-black tracking-tight">Conciliação de devoluções e avarias</h1>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-xs leading-6 text-emerald-100">
            Conferência de cargas, retornos ao estoque central e baixas por avaria. Consulta exclusivamente de leitura.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-black">
            <ShieldCheck size={15} /> Dados restritos à empresa · {modoVolume ? "Controle por volume" : "Controle por quantidade"}
          </span>
        </header>

        <form method="get" className="flex flex-wrap items-end gap-3 rounded-[22px] border border-[#c9ddcf] bg-white p-4">
          <div className="flex-1">
            <label htmlFor="filtro-carga" className="text-xs font-black">Localizar uma carga pelo número</label>
            <input id="filtro-carga" name="carga" inputMode="numeric" pattern="[0-9]*"
              defaultValue={cargaFiltrada ?? ""} placeholder="Ex.: 10"
              className="mt-2 block h-11 w-full rounded-xl border border-[#c9ddcf] bg-[#f8fbf9] px-4 text-sm outline-none focus:border-emerald-600" />
          </div>
          <div className="min-w-[190px] flex-1">
            <label htmlFor="filtro-situacao" className="text-xs font-black">Situação da conciliação</label>
            <select id="filtro-situacao" name="situacao" defaultValue={situacao}
              className="mt-2 block h-11 w-full rounded-xl border border-[#c9ddcf] bg-[#f8fbf9] px-3 text-xs font-bold text-emerald-950 focus:border-emerald-600">
              <option value="todas">Todas as situações</option>
              <option value="divergentes">Com divergência</option>
              <option value="conciliadas">Conciliadas</option>
              <option value="nao-finalizadas">Não finalizadas</option>
            </select>
          </div>
          <button type="submit" className="h-11 rounded-xl bg-[#0f6336] px-5 text-xs font-black text-white">Filtrar</button>
          <Link href="/admin/auditoria-devolucoes" className="inline-flex h-11 items-center rounded-xl border border-[#c9ddcf] bg-white px-4 text-xs font-black text-emerald-800">Últimas 20</Link>
        </form>

        {erroConsulta ? (
          <p role="alert" className="rounded-[20px] border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-900">
            Não foi possível concluir todas as leituras. Nenhum indicador foi calculado e nenhum dado foi alterado.
          </p>
        ) : incompleto ? (
          <p role="alert" className="rounded-[20px] border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-900">
            Limite de consulta atingido. Para evitar resultados parciais, informe o número de uma carga e consulte novamente.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#d4e5d8] bg-white/75 px-4 py-3">
              <p className="text-[11px] font-semibold text-[#516955]">
                Exibindo <strong>{resumoFiltrado.length}</strong> de <strong>{resumo.length}</strong> carga(s) consultadas,
                entre as últimas 20. Filtros e exportação se aplicam somente a este conjunto.
              </p>
              <ExportarAuditoriaCsv linhas={linhasCsv} />
            </div>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumo de conferência">
              <Bloco titulo="Cargas finalizadas" valor={finalizadas} detalhe="No conjunto filtrado" />
              <Bloco titulo="Retorno normal" valor={retornos} detalhe="Quantidade classificada para o CD" />
              <Bloco titulo="Volumes ou cestas avariadas" valor={avarias} detalhe="Não reintegradas ao estoque central" />
              <Bloco titulo="Divergências" valor={divergentes} detalhe="Diferenças no conjunto filtrado" />
            </section>

            <div className="rounded-[18px] border border-emerald-200 bg-[#f4faf6] p-4 text-xs leading-6 text-[#486150]">
              <p className="font-black text-emerald-950">Como interpretar os números</p>
              Fechar uma carga devolve todo o saldo não entregue: parte pode retornar normalmente, parte pode ser avaria.
              Somente o retorno normal gera entrada no estoque central. Esta auditoria compara registros de carga,
              movimentos de estoque por tipo de cesta e, quando obrigatório, a classificação física dos volumes.
              Abra o histórico de movimentações para conferir data, quantidade e justificativa de avaria.
              Ela não substitui uma contagem física do estoque.
            </div>

            <section className="space-y-3" aria-label="Resultados por carga">
              {resumoFiltrado.length === 0 ? (
                <div className="rounded-[22px] border border-[#c9ddcf] bg-white p-6 text-sm text-slate-600">
                  Nenhuma carga encontrada para os filtros informados nas últimas 20 cargas consultadas.
                </div>
              ) : resumoFiltrado.map((r) => (
                <article key={r.carga.id} className="rounded-[24px] border border-[#c9ddcf] bg-white p-5 shadow-[0_8px_25px_rgba(17,63,33,.04)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">{r.carga.codigo}</p>
                      <h2 className="mt-1 text-xl font-black">Carga nº {r.carga.id}</h2>
                      <p className="mt-1 text-xs text-slate-500">{dataPt(r.carga.finalizada_at)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={r.divergencia
                        ? "rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-black text-amber-900"
                        : r.confiavel
                          ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-800"
                          : "rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black text-slate-700"}>
                        {r.divergencia ? "Revisar divergência" : r.confiavel ? "Registros conciliados" : "Carga " + r.carga.status.toLowerCase()}
                      </span>
                      <Link href={"/admin/cargas/" + r.carga.id} className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-2 text-[10px] font-black text-emerald-800">
                        Ver carga <ArrowUpRight size={14}/>
                      </Link>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 grid-cols-2 md:grid-cols-4">
                    <Bloco titulo="Carregadas" valor={r.carregado} detalhe="Quantidade de origem" />
                    <Bloco titulo="Entregues" valor={r.entregue} detalhe="Saída por entrega" />
                    <Bloco titulo="Retornadas" valor={r.retornado} detalhe={"CD: " + r.retornoEstoque + " movimentadas"} />
                    <Bloco titulo="Avarias" valor={r.avariado} detalhe={"Baixa: " + r.baixaAvaria + " movimentadas"} />
                  </div>
                  {r.divergencia && (
                    <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900">
                      <AlertTriangle size={16} className="shrink-0"/>
                      Os registros não conferem. Verifique as movimentações antes de ajustar estoque. Nenhuma correção foi aplicada automaticamente.
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-[#54725d]">
                    <span className="inline-flex items-center gap-1"><Truck size={15}/> Em posse: {r.emPosse}</span>
                    <span className="inline-flex items-center gap-1"><PackageCheck size={15}/> Retorno ao CD: {r.retornoEstoque}</span>
                    <span className="inline-flex items-center gap-1"><CheckCircle2 size={15}/> Baixa por avaria: {r.baixaAvaria}</span>
                  </div>
                  <details className="mt-4 rounded-[18px] border border-[#bfd8c7] bg-[#f6faf7]">
                    <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-4 text-xs font-black text-emerald-950">
                      <span className="flex items-center gap-2">
                        <ClipboardCheck size={17} /> Conferência por tipo de cesta ({r.porTipo.length})
                      </span>
                      <span className={r.porTipo.some((tipo) => tipo.alertas.length > 0) ? "text-amber-800" : "text-emerald-700"}>
                        {r.porTipo.some((tipo) => tipo.alertas.length > 0) ? "Diferenças encontradas" : "Detalhar movimentos"}
                      </span>
                    </summary>
                    <div className="space-y-3 border-t border-[#d7e6da] p-3">
                      {!r.porTipo.length ? (
                        <p className="rounded-xl bg-white p-3 text-xs text-slate-600">
                          Nenhum item, volume ou movimento associado a esta carga.
                        </p>
                      ) : r.porTipo.map((tipo) => (
                        <div key={tipo.tipoId} className="rounded-[16px] border border-[#d5e4d9] bg-white p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Tipo nº {tipo.tipoId}</p>
                              <h3 className="mt-1 text-sm font-black text-emerald-950">{tipo.nome}</h3>
                            </div>
                            <span className={tipo.alertas.length
                              ? "rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-black text-amber-900"
                              : "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-900"}>
                              {tipo.alertas.length ? "Revisar tipo" : r.encerrada ? "Sem diferença neste tipo" : "Carga em andamento"}
                            </span>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-xl bg-[#f5faf6] p-3">
                              <p className="text-[10px] font-bold text-slate-600">Cestas carregadas / entregues</p>
                              <p className="mt-1 text-lg font-black text-[#16452a]">{tipo.carregadasTipo} / {tipo.entreguesTipo}</p>
                            </div>
                            <div className="rounded-xl bg-[#f1f8f3] p-3">
                              <p className="text-[10px] font-bold text-slate-600">Retorno / entrada no CD</p>
                              <p className="mt-1 text-lg font-black text-emerald-800">{tipo.retornadasTipo} / {tipo.retornoMovimento}</p>
                              {modoVolume && <p className="mt-1 text-[10px] text-slate-500">Volumes retornados: {tipo.retornadosFisicos}</p>}
                            </div>
                            <div className="rounded-xl bg-amber-50 p-3">
                              <p className="text-[10px] font-bold text-amber-900">Avaria / baixa registrada</p>
                              <p className="mt-1 text-lg font-black text-amber-900">{tipo.avariadasTipo} / {tipo.avariaMovimento}</p>
                              {modoVolume && <p className="mt-1 text-[10px] text-amber-800">Volumes avariados: {tipo.avariadosFisicos}</p>}
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-[10px] font-bold text-slate-600">Saldo restante em posse</p>
                              <p className="mt-1 text-lg font-black text-slate-800">{tipo.posseTipo}</p>
                            </div>
                          </div>
                          {tipo.alertas.length > 0 && (
                            <div role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                              <p className="flex items-center gap-2 text-xs font-black text-amber-900">
                                <AlertTriangle size={15} /> Divergências deste tipo
                              </p>
                              <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] font-semibold text-amber-900">
                                {tipo.alertas.map((alerta) => <li key={alerta}>{alerta}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                  <details className="mt-3 overflow-hidden rounded-[18px] border border-[#c5ddcc] bg-[#f6faf7]">
                    <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-4 text-xs font-black text-emerald-950">
                      <span className="inline-flex items-center gap-2">
                        <History size={17} /> Histórico de movimentações ({r.movimentosCarga.length})
                      </span>
                      <span className="text-[10px] font-bold text-[#5f7c67]">Comprovantes e justificativas</span>
                    </summary>
                    <div className="space-y-3 border-t border-[#d7e7dc] p-3">
                      {r.movimentosCarga.length === 0 ? (
                        <div className="rounded-[14px] bg-white p-4 text-xs leading-5 text-slate-600">
                          Não existem lançamentos de retorno ou avaria para esta carga.
                          Isso é esperado enquanto a carga estiver aberta e não houver fechamento.
                        </div>
                      ) : r.movimentosCarga.map((mov) => {
                        const avaria = mov.tipo_movimento === "AVARIA_CARGA";
                        return (
                          <div key={mov.id} className="rounded-[16px] border border-[#d4e4d9] bg-white p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-500">
                                  Movimento nº {mov.id} · {dataPt(mov.created_at)}
                                </p>
                                <h3 className="mt-2 text-[13px] font-black text-emerald-950">
                                  {avaria ? "Baixa por avaria" : "Retorno ao estoque central"}
                                </h3>
                                <p className="mt-1 text-[11px] font-semibold text-slate-600">
                                  {nomePorTipo.get(numero(mov.tipo_cesta_id)) ?? ("Tipo de cesta nº " + mov.tipo_cesta_id)}
                                </p>
                              </div>
                              <div className={avaria
                                ? "rounded-[13px] border border-amber-200 bg-amber-50 px-4 py-3 text-right text-amber-900"
                                : "rounded-[13px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-right text-emerald-900"}>
                                <p className="text-[9px] font-black uppercase tracking-wider">Quantidade</p>
                                <p className="mt-1 text-[23px] font-black tabular-nums leading-none">{numero(mov.quantidade)}</p>
                              </div>
                            </div>
                            {mov.observacao?.trim() ? (
                              <div className={avaria
                                ? "mt-3 rounded-xl bg-amber-50 px-3 py-3"
                                : "mt-3 rounded-xl bg-[#f4faf6] px-3 py-3"}>
                                <p className="text-[10px] font-black text-slate-700">
                                  {avaria ? "Justificativa registrada" : "Observação do lançamento"}
                                </p>
                                <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-5 text-slate-700">
                                  {mov.observacao}
                                </p>
                              </div>
                            ) : avaria ? (
                              <p className="mt-3 text-[11px] font-bold text-amber-800">
                                A movimentação de avaria não possui justificativa textual neste registro.
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                      <p className="px-1 text-[10px] leading-5 text-[#5f7c67]">
                        Lançamentos extraídos das movimentações de estoque desta empresa. A visualização não edita nem confirma movimentações.
                      </p>
                    </div>
                  </details>
                  {modoVolume && (
                    <details className="mt-4 rounded-[16px] border border-[#d8e7dc] bg-[#f7faf8]">
                      <summary className="cursor-pointer px-4 py-3 text-xs font-black text-emerald-900">
                        <span className="inline-flex items-center gap-2"><ScanBarcode size={15}/> Ver volumes físicos ({r.volumesCarga.length}) · Retornados: {r.volumesNormais} · Avariados: {r.volumesAvariados}</span>
                      </summary>
                      <div className="max-h-64 space-y-2 overflow-auto border-t border-[#d8e7dc] px-4 py-3">
                        {r.volumesCarga.length ? r.volumesCarga.map((v) => (
                          <div key={v.codigo_volume} className="flex justify-between gap-3 rounded-xl bg-white px-3 py-2 text-[11px]">
                            <span className="min-w-0 break-all font-bold">{v.codigo_volume}</span>
                            <span className="shrink-0 font-black text-emerald-900">{v.status.replaceAll("_", " ")}</span>
                          </div>
                        )) : <p className="text-xs text-slate-500">Sem volumes vinculados encontrados.</p>}
                      </div>
                    </details>
                  )}
                </article>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
