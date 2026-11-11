export const instant = false;

// V106: estoque do entregador = soma das cargas recebidas, independente de rota.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, PackageCheck, ShoppingBag, Truck, Info } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { getEstoqueMovelMulticargas } from "@/services/cargas/get-estoque-movel-multicargas";
import { createClient } from "@/lib/supabase/server";
import { iniciarVendaEstoque } from "./actions";

export default async function EstoqueEntregadorPage() {
  const usuario = await getCurrentUserProfile();
  if (!usuario || !usuario.ativo) redirect("/");
  const podeVer = usuario.isPlatformAdmin || temPermissao(usuario.permissoes, PERMISSOES.CARGA_VISUALIZAR);
  if (!podeVer) redirect("/mobile/sem-acesso");
  const podeVender = usuario.isPlatformAdmin ||
    (temPermissao(usuario.permissoes, PERMISSOES.ENTREGA_REALIZAR) &&
      usuario.configuracao.permitirPagamentoMobile &&
      temPermissao(usuario.permissoes, PERMISSOES.PAGAMENTO_REGISTRAR));

  const exigeConferenciaFisica = usuario.configuracao.modoControleCarga === "VOLUME" &&
    usuario.configuracao.exigirBipagemCarga;
  const estoque = await getEstoqueMovelMulticargas({
    empresaId: usuario.empresa.id,
    entregadorId: usuario.id,
    exigeConferenciaFisica,
  });
  const supabase = await createClient();
  const recebidas = estoque.cargas.filter(c => c.recebida && c.saldo > 0);
  const ids = recebidas.map(c => c.id);
  const { data: itens, error: erroItens, count } = ids.length
    ? await supabase.from("carga_itens")
        .select("tipo_cesta_id,quantidade_carregada,quantidade_entregue,quantidade_retornada,quantidade_avariada", {count:"exact"})
        .eq("empresa_id", usuario.empresa.id)
        .in("carga_id", ids)
        .limit(5000)
    : { data: [], error: null, count: 0 };

  const saldosPorTipo = new Map<number, number>();
  const tiposConfiaveis = !erroItens && count === (itens?.length ?? 0);
  if (tiposConfiaveis) {
    for (const item of itens ?? []) {
      const id = Number(item.tipo_cesta_id);
      const saldo = Math.max(0,
        Number(item.quantidade_carregada ?? 0) -
        Number(item.quantidade_entregue ?? 0) -
        Number(item.quantidade_retornada ?? 0) -
        Number(item.quantidade_avariada ?? 0));
      saldosPorTipo.set(id, (saldosPorTipo.get(id) ?? 0) + saldo);
    }
  }
  const { data: tipos, error: erroTipos } = tiposConfiaveis && saldosPorTipo.size
    ? await supabase.from("tipos_cesta").select("id,nome,codigo")
        .eq("empresa_id", usuario.empresa.id).in("id", [...saldosPorTipo.keys()])
    : { data: [], error: null };
  const mostrarDetalhe = tiposConfiaveis && !erroTipos;

  return (
    <main className="min-h-dvh bg-[#eaf2ec] text-[#142018]">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f7faf7] pb-10">
        <header className="bg-[#0d6637] px-5 pb-7 pt-5 text-white">
          <div className="flex items-center gap-3">
            <Link href="/mobile" aria-label="Voltar" className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/20 bg-white/10"><ArrowLeft size={19} /></Link>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-200">Entregador</p>
              <h1 className="text-xl font-black">Meu estoque móvel</h1>
            </div>
          </div>
          <p className="mt-4 text-[12px] leading-5 text-emerald-100">
            Aqui ficam todas as cestas recebidas do CD e ainda disponíveis para entrega, somadas em um único estoque.
          </p>
        </header>
        <section className="space-y-4 p-4">
          <div className="rounded-[26px] border border-emerald-200 bg-emerald-50 px-5 py-6">
            <p className="text-[11px] font-black uppercase tracking-[0.15em] text-emerald-800">Total disponível</p>
            <p className="mt-2 text-[46px] font-black leading-none tabular-nums text-emerald-950">
              {estoque.saldoTotal === null ? "—" : estoque.saldoTotal}
            </p>
            <p className="mt-2 text-[12px] font-semibold text-emerald-800">cestas no seu estoque móvel</p>
            {estoque.erro && (
              <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-[11px] font-semibold text-amber-900">{estoque.erro}</p>
            )}
            {!estoque.erro && podeVender && (estoque.saldoTotal ?? 0) > 0 && (
              <form action={iniciarVendaEstoque} className="mt-4">
                <button type="submit" className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[15px] bg-emerald-800 px-4 text-[13px] font-black text-white">
                  <ShoppingBag size={18} /> Vender cesta
                </button>
              </form>
            )}
          </div>

          {estoque.pendentes > 0 && (
            <Link href="/mobile/carga" className="flex items-center gap-3 rounded-[20px] border border-amber-200 bg-amber-50 p-4">
              <Truck className="shrink-0 text-amber-800" size={20}/>
              <div>
                <p className="text-[12px] font-black text-amber-950">{estoque.pendentes} carga(s) ainda não recebida(s)</p>
                <p className="mt-1 text-[10px] text-amber-900">Essas cestas não foram incluídas no saldo do seu estoque.</p>
              </div>
            </Link>
          )}

          <section className="rounded-[22px] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <PackageCheck size={19} className="text-emerald-700"/>
              <h2 className="text-[14px] font-black">Cestas por tipo</h2>
            </div>
            {!mostrarDetalhe ? (
              <p role="status" className="mt-3 text-[11px] text-amber-900">Não foi possível conferir o detalhamento completo do estoque. Atualize antes de iniciar uma operação.</p>
            ) : (tipos ?? []).length === 0 ? (
              <p className="mt-3 text-[11px] text-slate-500">Nenhuma cesta disponível nos recebimentos registrados.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {(tipos ?? []).map(tipo => (
                  <div key={tipo.id} className="flex items-center justify-between gap-3 rounded-[14px] bg-[#f5faf7] px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-[12px] font-black">{tipo.nome}</p>
                      <p className="text-[10px] text-slate-500">{tipo.codigo}</p>
                    </div>
                    <p className="text-[20px] font-black tabular-nums text-emerald-800">{saldosPorTipo.get(Number(tipo.id)) ?? 0}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
          <div className="rounded-[20px] border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <Info size={17} className="text-emerald-700"/>
              <h2 className="text-[12px] font-black">Rastreabilidade preservada</h2>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-600">
              Cada volume conserva o código e a carga que o CD gerou. O saldo do entregador é consolidado;
              a origem fica no histórico e não precisa ser escolhida para consultar seu estoque.
            </p>
            <Link href="/mobile/carga" className="mt-3 inline-flex text-[11px] font-black text-emerald-800 underline underline-offset-2">
              Ver recebimentos do CD
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
