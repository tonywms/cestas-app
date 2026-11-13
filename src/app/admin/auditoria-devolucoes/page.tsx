export const instant = false;

// V126: auditoria somente leitura, sem RPC de movimentacao e sem alteracao de estoque.
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle, ArrowLeft, ArrowUpRight, CheckCircle2,
  ClipboardCheck, PackageCheck, ScanBarcode, ShieldCheck, Truck,
} from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { temPerfilGestao } from "@/lib/gestao/indicadores-v119";
import { createClient } from "@/lib/supabase/server";

type Carga = { id: number; codigo: string; status: string; created_at: string; finalizada_at: string | null };
type Item = { carga_id: number; quantidade_carregada: number; quantidade_entregue: number; quantidade_retornada: number; quantidade_avariada: number };
type Volume = { carga_id: number | null; codigo_volume: string; status: string };
type Movimento = { carga_id: number | null; tipo_movimento: string; quantidade: number };
type Props = { searchParams: Promise<{ carga?: string }> };

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

  const { carga: cargaTexto } = await searchParams;
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
        .select("carga_id,quantidade_carregada,quantidade_entregue,quantidade_retornada,quantidade_avariada", { count: "exact" })
        .eq("empresa_id", empresaId).in("carga_id", ids).limit(3000),
      db.from("movimentacoes_estoque")
        .select("carga_id,tipo_movimento,quantidade", { count: "exact" })
        .eq("empresa_id", empresaId).in("carga_id", ids)
        .in("tipo_movimento", ["RETORNO_CARGA_CENTRAL", "AVARIA_CARGA"]).limit(3000),
      modoVolume
        ? db.from("cesta_volumes")
          .select("carga_id,codigo_volume,status", { count: "exact" })
          .eq("empresa_id", empresaId).in("carga_id", ids).limit(3000)
        : Promise.resolve({ data: [], error: null, count: 0 }),
    ]);

  const erroConsulta = Boolean(cargasResult.error || itensResult?.error || movimentosResult?.error || volumesResult?.error);
  const incompleto = [itensResult, movimentosResult, volumesResult].some((r) => (r?.count ?? 0) > 3000);
  const itens = (itensResult?.data ?? []) as Item[];
  const movimentos = (movimentosResult?.data ?? []) as Movimento[];
  const volumes = (volumesResult?.data ?? []) as Volume[];

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
    const confiavel = encerrada && relacionados.length > 0 &&
      emPosse === 0 && retornado === retornoEstoque && avariado === baixaAvaria &&
      (!modoVolume || (volumesNormais === retornado && volumesAvariados === avariado));
    const divergencia = encerrada && !confiavel;
    return { carga, carregado, entregue, retornado, avariado, emPosse,
      retornoEstoque, baixaAvaria, volumesNormais, volumesAvariados, volumesCarga,
      encerrada, confiavel, divergencia };
  }) : [];

  const finalizadas = resumo.filter((r) => r.encerrada).length;
  const divergentes = resumo.filter((r) => r.divergencia).length;
  const retornos = resumo.reduce((s, r) => s + r.retornado, 0);
  const avarias = resumo.reduce((s, r) => s + r.avariado, 0);

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
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-200">Auditoria operacional · V126</p>
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
          <button type="submit" className="h-11 rounded-xl bg-[#0f6336] px-5 text-xs font-black text-white">Consultar</button>
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
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumo de conferência">
              <Bloco titulo="Cargas finalizadas" valor={finalizadas} detalhe="Nas últimas cargas consultadas" />
              <Bloco titulo="Retorno normal" valor={retornos} detalhe="Quantidade classificada para o CD" />
              <Bloco titulo="Volumes ou cestas avariadas" valor={avarias} detalhe="Não reintegradas ao estoque central" />
              <Bloco titulo="Divergências" valor={divergentes} detalhe="Cargas finalizadas com diferenças de registro" />
            </section>

            <div className="rounded-[18px] border border-emerald-200 bg-[#f4faf6] p-4 text-xs leading-6 text-[#486150]">
              <p className="font-black text-emerald-950">Como interpretar os números</p>
              Fechar uma carga devolve todo o saldo não entregue: parte pode retornar normalmente, parte pode ser avaria.
              Somente o retorno normal gera entrada no estoque central. Esta auditoria compara registros de carga,
              movimentos de estoque e, quando obrigatório, a classificação dos volumes.
              Ela não substitui uma contagem física do estoque.
            </div>

            <section className="space-y-3" aria-label="Resultados por carga">
              {resumo.length === 0 ? (
                <div className="rounded-[22px] border border-[#c9ddcf] bg-white p-6 text-sm text-slate-600">
                  Nenhuma carga encontrada para o filtro informado.
                </div>
              ) : resumo.map((r) => (
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
                    <Bloco titulo="Retornadas" valor={r.retornado} detalhe="CD: " + r.retornoEstoque + " movimentadas" />
                    <Bloco titulo="Avarias" valor={r.avariado} detalhe="Baixa: " + r.baixaAvaria + " movimentadas" />
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
