export const instant = false;

// V106 — Carga = recebimento do CD. Nao e uma tela de venda nem de estoque.
// O detalhamento de origem continua persistido em cargas/cesta_volumes.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Barcode, CheckCircle2, PackageCheck, AlertTriangle } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

type Registro = {
  id: number;
  codigo: string;
  data_carga: string | null;
  status: string;
  recebida_at: string | null;
};

const formato = (data: string | null) => {
  if (!data) return "—";
  const d = data.substring(0, 10).split("-");
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : data;
};

export default async function CargasRecebimentoPage() {
  const usuario = await getCurrentUserProfile();
  if (!usuario || !usuario.ativo) redirect("/");
  if (!usuario.isPlatformAdmin && !temPermissao(usuario.permissoes, PERMISSOES.CARGA_VISUALIZAR)) {
    redirect("/mobile/sem-acesso");
  }

  const supabase = await createClient();
  const { data: cargas, error: erroCargas, count } = await supabase.from("cargas")
    .select("id,codigo,data_carga,status,recebida_at", { count: "exact" })
    .eq("empresa_id", usuario.empresa.id)
    .eq("entregador_id", usuario.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const registros: Registro[] = cargas ?? [];
  const ids = registros.map(c => Number(c.id));
  const { data: itens, error: erroItens } = ids.length
    ? await supabase.from("carga_itens")
        .select("carga_id,quantidade_carregada", { count: "exact" })
        .eq("empresa_id", usuario.empresa.id)
        .in("carga_id", ids)
        .limit(1000)
    : { data: [], error: null };

  const totalPorCarga = new Map<number, number>();
  for (const item of itens ?? []) {
    const id = Number(item.carga_id);
    totalPorCarga.set(id, (totalPorCarga.get(id) ?? 0) + Number(item.quantidade_carregada ?? 0));
  }

  const exigeBipagem = usuario.configuracao.modoControleCarga === "VOLUME" &&
    usuario.configuracao.exigirBipagemCarga;
  const podeReceber = usuario.isPlatformAdmin ||
    temPermissao(usuario.permissoes, PERMISSOES.CARGA_RECEBER);
  const podeBipar = usuario.isPlatformAdmin ||
    temPermissao(usuario.permissoes, PERMISSOES.CARGA_BIPAR_VOLUME);
  const pendentes = registros.filter(c => c.recebida_at == null && ["ABERTA", "EM_ROTA"].includes(c.status));
  const recebidas = registros.filter(c => c.recebida_at != null);

  return (
    <main className="min-h-dvh bg-[#eaf2ec] text-[#142018]">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f7faf7] pb-10">
        <header className="bg-[#0c6637] px-5 pb-7 pt-5 text-white">
          <div className="flex items-center gap-3">
            <Link href="/mobile" aria-label="Voltar" className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/20 bg-white/10">
              <ArrowLeft size={19}/>
            </Link>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-200">Centro de Distribuição</p>
              <h1 className="text-xl font-black">Receber cargas</h1>
            </div>
          </div>
          <p className="mt-4 text-[12px] leading-5 text-emerald-100">
            Receba as cestas enviadas pelo CD. Confira os volumes quando a empresa exigir.
            Venda, entrega e devolução não são realizadas nesta rotina.
          </p>
        </header>

        <section className="space-y-4 p-4">
          {erroCargas || erroItens || (count ?? 0) > registros.length ? (
            <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              {!erroCargas && !erroItens ? "A lista foi limitada às 100 cargas mais recentes. Consulte o administrador para o histórico completo."
                : "Não foi possível consultar todas as informações. Atualize a página antes de confirmar qualquer recebimento."}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[20px] bg-white p-4 shadow-sm">
              <p className="text-[10px] font-extrabold text-slate-500">A receber do CD</p>
              <p className="mt-1 text-3xl font-black text-amber-800">{pendentes.length}</p>
            </div>
            <div className="rounded-[20px] bg-white p-4 shadow-sm">
              <p className="text-[10px] font-extrabold text-slate-500">Recebimentos confirmados</p>
              <p className="mt-1 text-3xl font-black text-emerald-800">{recebidas.length}</p>
            </div>
          </div>

          <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-[12px] font-black text-emerald-950">Depois de receber, as cestas ficam no seu estoque móvel.</p>
            <p className="mt-1 text-[11px] leading-5 text-emerald-800">Você não precisa manter uma carga selecionada para vender. A carga original fica somente para rastrear os volumes.</p>
            <Link href="/mobile/estoque" className="mt-3 flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-800 text-[12px] font-black text-white">
              Consultar meu estoque móvel
            </Link>
          </div>

          <h2 className="pt-2 text-sm font-black">Cargas aguardando recebimento</h2>
          {pendentes.length === 0 && !erroCargas ? (
            <p className="rounded-2xl bg-white p-4 text-[12px] text-slate-600">Nenhuma carga pendente nesta lista.</p>
          ) : null}
          {pendentes.map(carga => (
            <article key={carga.id} className="rounded-[22px] border border-amber-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[16px] font-black">Carga nº {carga.id}</h3>
                  <p className="mt-1 text-[10px] text-slate-500">{carga.codigo}</p>
                  <p className="mt-1 text-[10px] text-slate-500">Emitida em {formato(carga.data_carga)}</p>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1.5 text-[10px] font-black text-amber-900">A conferir</span>
              </div>
              <p className="mt-3 text-[12px] font-semibold text-slate-700">Enviadas pelo CD: {erroItens ? "—" : totalPorCarga.get(carga.id) ?? 0} cesta(s)</p>
              {exigeBipagem && podeReceber && podeBipar ? (
                <Link href={`/mobile/carga/receber?cargaId=${carga.id}`}
                  className="mt-4 flex min-h-[50px] items-center justify-center gap-2 rounded-[14px] bg-emerald-800 px-3 text-[12px] font-black text-white">
                  <Barcode size={17}/> Bipar volumes recebidos
                </Link>
              ) : exigeBipagem ? (
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-[11px] text-amber-900">A empresa exige bipagem. Solicite a permissão de recebimento ao responsável.</p>
              ) : (
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600">
                  Conferência sem bipagem configurada. A confirmação explícita e as recusas parciais serão habilitadas com a atualização segura do recebimento no banco.
                </p>
              )}
              <p className="mt-3 text-[10px] leading-5 text-slate-500">
                Se houver avaria, divergência ou recebimento parcial, não confirme volumes que você não recebeu.
                A finalização com justificativa depende da nova transação de recebimento.
              </p>
            </article>
          ))}

          <h2 className="pt-2 text-sm font-black">Recebimentos registrados</h2>
          {recebidas.length === 0 && !erroCargas && (
            <p className="rounded-2xl bg-white p-4 text-xs text-slate-600">Ainda não há cargas com recebimento confirmado.</p>
          )}
          {recebidas.slice(0,30).map(carga => (
            <article key={carga.id} className="flex items-center justify-between gap-3 rounded-[20px] bg-white p-4 shadow-sm">
              <div>
                <p className="text-[13px] font-black">Carga nº {carga.id}</p>
                <p className="mt-1 text-[10px] text-slate-500">{formato(carga.data_carga)} · {erroItens ? "—" : totalPorCarga.get(carga.id) ?? 0} cesta(s) enviadas</p>
              </div>
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={18} />
                <span className="text-[10px] font-black">Recebida</span>
              </div>
            </article>
          ))}
          <p className="text-[10px] leading-5 text-slate-500">
            Históricos de entrega e movimentos de volume continuam rastreáveis pela carga de origem.
          </p>
        </section>
      </div>
    </main>
  );
}
