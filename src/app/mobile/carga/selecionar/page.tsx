export const instant = false;

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import SeletorCargasClient, { type CargaOperacionalResumo } from "./SeletorCargasClient";

type Props = { searchParams?: Promise<{ erro?: string }> };

type Totais = {
  carregadas: number;
  entregues: number;
  retornadas: number;
  avariadas: number;
};

function numeroNaoNegativo(valor: unknown): number {
  const resultado = Number(valor ?? 0);
  return Number.isFinite(resultado) ? Math.max(0, resultado) : 0;
}

export default async function SelecionarCargaMobilePage({ searchParams }: Props) {
  const usuario = await getCurrentUserProfile();
  if (!usuario) redirect("/");
  if (!usuario.isPlatformAdmin && !temPermissao(usuario.permissoes, PERMISSOES.CARGA_VISUALIZAR)) {
    redirect("/mobile/sem-acesso");
  }

  const supabase = await createClient();
  const [cargasResult, escolhaResult, rotasResult] = await Promise.all([
    supabase
      .from("cargas")
      .select("id,codigo,status,data_carga,recebida_at", { count: "exact" })
      .eq("empresa_id", usuario.empresa.id)
      .eq("entregador_id", usuario.id)
      .in("status", ["ABERTA", "EM_ROTA"])
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.rpc("mobile_obter_carga_escolhida", { p_empresa_id: usuario.empresa.id }),
    supabase
      .from("rotas")
      .select("codigo,carga_id,status")
      .eq("empresa_id", usuario.empresa.id)
      .eq("entregador_id", usuario.id)
      .in("status", ["PLANEJADA", "EM_ROTA"])
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const cargasBrutas = cargasResult.data ?? [];
  const ids = cargasBrutas.map((carga) => Number(carga.id)).filter(Number.isSafeInteger);

  const saldosResult = ids.length
    ? await supabase
        .from("carga_itens")
        .select("carga_id,quantidade_carregada,quantidade_entregue,quantidade_retornada,quantidade_avariada", { count: "exact" })
        .eq("empresa_id", usuario.empresa.id)
        .in("carga_id", ids)
        .limit(5000)
    : null;

  // O PostgREST pode impor limite de linhas mesmo com .limit(5000).
  // Nao mostrar saldos incompletos como se fossem corretos.
  const saldosCompletos = !saldosResult?.error && (
    ids.length === 0 || (
      saldosResult?.count != null &&
      saldosResult.count === (saldosResult.data?.length ?? 0)
    )
  );
  const listaTruncada = (cargasResult.count ?? 0) > cargasBrutas.length;
  const totaisPorCarga = new Map<number, Totais>();
  if (saldosCompletos) {
    for (const item of saldosResult?.data ?? []) {
      const cargaId = Number(item.carga_id);
      if (!Number.isSafeInteger(cargaId)) continue;
      const atual = totaisPorCarga.get(cargaId) ?? {
        carregadas: 0,
        entregues: 0,
        retornadas: 0,
        avariadas: 0,
      };
      atual.carregadas += numeroNaoNegativo(item.quantidade_carregada);
      atual.entregues += numeroNaoNegativo(item.quantidade_entregue);
      atual.retornadas += numeroNaoNegativo(item.quantidade_retornada);
      atual.avariadas += numeroNaoNegativo(item.quantidade_avariada);
      totaisPorCarga.set(cargaId, atual);
    }
  }

  // V95_STATUS_FECHAMENTO_POR_CARGA: consultar rotas vinculadas para distinguir rota encerrada
  // de uma carga ainda sem fechamento de estoque. Nao supor estado quando a
  // consulta falhar ou for truncada; as permissoes sao filtradas por tenant.
  const historicoRotas = ids.length
    ? await supabase
        .from("rotas")
        .select("carga_id,status", { count: "exact" })
        .eq("empresa_id", usuario.empresa.id)
        .eq("entregador_id", usuario.id)
        .in("carga_id", ids)
        .in("status", ["PLANEJADA", "EM_ROTA", "FINALIZADA"])
        .limit(5000)
    : null;
  const historicoConfiavel = ids.length === 0 || (
    historicoRotas != null &&
    !historicoRotas.error &&
    historicoRotas.count != null &&
    historicoRotas.count === (historicoRotas.data?.length ?? 0)
  );
  const idsRotaEncerrada = new Set<number>();
  const idsRotaAindaAtiva = new Set<number>();
  if (historicoConfiavel) {
    for (const rota of historicoRotas?.data ?? []) {
      const id = Number(rota.carga_id);
      if (!Number.isSafeInteger(id)) continue;
      if (rota.status === "FINALIZADA") idsRotaEncerrada.add(id);
      if (rota.status === "PLANEJADA" || rota.status === "EM_ROTA") idsRotaAindaAtiva.add(id);
    }
  }

  // V93: cada carga informa se a conferencia fisica precisa ser concluida.
  const exigeBipagemFisica = usuario.configuracao.modoControleCarga === "VOLUME" && usuario.configuracao.exigirBipagemCarga;

  const cargas: CargaOperacionalResumo[] = cargasBrutas.map((carga) => {
    const id = Number(carga.id);
    const totais = totaisPorCarga.get(id);
    return {
      id,
      codigo: String(carga.codigo ?? ""),
      status: String(carga.status) === "EM_ROTA" ? "EM_ROTA" : "ABERTA",
      dataCarga: typeof carga.data_carga === "string" ? carga.data_carga : null,
      conferenciaPendente: exigeBipagemFisica && !Boolean(carga.recebida_at),
      fechamentoPendente: historicoConfiavel && String(carga.status) === "EM_ROTA" &&
        idsRotaEncerrada.has(id) && !idsRotaAindaAtiva.has(id),
      carregadas: totais?.carregadas ?? null,
      entregues: totais?.entregues ?? null,
      retornadas: totais?.retornadas ?? null,
      avariadas: totais?.avariadas ?? null,
    };
  });

  const rotaVinculada = !rotasResult.error
    ? (rotasResult.data ?? []).find((rota) => rota.carga_id != null)
    : undefined;
  const rotaEmAndamento = rotaVinculada
    ? { codigo: String(rotaVinculada.codigo), cargaId: Number(rotaVinculada.carga_id) }
    : null;

  const params = searchParams ? await searchParams : {};
  const errorMessage = params.erro ?? null;
  const erroLeitura = cargasResult.error
    ? "Não foi possível consultar as cargas. Atualize a página."
    : escolhaResult.error
      ? "Não foi possível identificar a carga selecionada. Confira a conexão e atualize a página."
      : null;

  return (
    <main className="min-h-dvh bg-[#eaf2ec] text-[#15271a]">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f7faf7]">
        {/* V96_1_SETA_VOLTAR_MOBILE: navegacao consistente com as demais telas mobile. */}
        <header className="bg-[#116b38] px-5 pb-5 pt-4 text-white">
          <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
            <Link
              href="/mobile/carga"
              aria-label="Voltar para Minha Carga"
              title="Voltar para Minha Carga"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/10 transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ArrowLeft size={19} aria-hidden="true" />
            </Link>
            <div className="text-center">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-emerald-200">Estoque móvel</p>
              <h1 className="mt-1 text-sm font-extrabold">Selecionar carga</h1>
            </div>
            <span className="h-11 w-11" aria-hidden="true" />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-emerald-100">
            Receba qualquer carga atribuída ao seu usuário, mesmo com uma rota aberta. Cada carga mantém o próprio saldo e histórico; a rota não bloqueia o seu estoque.
          </p>
        </header>
        <section className="space-y-3 p-4">
          {errorMessage && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold leading-relaxed text-rose-800">
              {errorMessage}
            </div>
          )}
          {erroLeitura && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold leading-relaxed text-rose-800">
              {erroLeitura}
            </div>
          )}
          {listaTruncada && (
            <div role="status" className="rounded-xl bg-amber-50 p-3 text-[11px] text-amber-900">
              Existem mais cargas que o limite desta consulta. Consulte a gestão de cargas para localizar cargas antigas.
            </div>
          )}
          {!saldosCompletos && (
            <div role="status" className="rounded-xl bg-amber-50 p-3 text-[11px] text-amber-900">
              Os saldos detalhados não estão disponíveis agora. A seleção de cargas continua protegida pelo banco.
            </div>
          )}
          {!cargasResult.error && !escolhaResult.error && (
            <SeletorCargasClient
              cargas={cargas}
              cargaAtualId={escolhaResult.data == null ? null : Number(escolhaResult.data)}
              rotaEmAndamento={rotaEmAndamento}
              saldosDisponiveis={saldosCompletos}
            />
          )}
        </section>
      </div>
    </main>
  );
}
