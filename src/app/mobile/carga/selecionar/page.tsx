export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { escolherCargaMobile } from "./actions";

type Props = { searchParams?: Promise<{ erro?: string }> };

export default async function SelecionarCargaMobilePage({ searchParams }: Props) {
  const usuario = await getCurrentUserProfile();
  if (!usuario) redirect("/");
  if (!usuario.isPlatformAdmin && !temPermissao(usuario.permissoes, PERMISSOES.CARGA_VISUALIZAR)) {
    redirect("/mobile/sem-acesso");
  }
  const supabase = await createClient();
  const { data: cargas, error } = await supabase.from("cargas")
    .select("id,codigo,status,data_carga")
    .eq("empresa_id", usuario.empresa.id)
    .eq("entregador_id", usuario.id)
    .in("status", ["ABERTA", "EM_ROTA"])
    .order("created_at", { ascending: false })
    .limit(1000);
  const { data: atual } = await supabase.rpc("mobile_obter_carga_escolhida", {
    p_empresa_id: usuario.empresa.id,
  });
  const params = searchParams ? await searchParams : {};
  return (
    <main className="min-h-dvh bg-[#eaf2ec] text-[#15271a]">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f7faf7]">
        <header className="bg-[#116b38] p-5 text-white">
          <Link href="/mobile/carga" className="text-xs font-bold text-emerald-100">Voltar</Link>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-widest text-emerald-200">Estoque móvel</p>
          <h1 className="mt-1 text-2xl font-black">Selecionar carga</h1>
          <p className="mt-2 text-xs text-emerald-100">Escolha qual carga será usada nas operações do entregador.</p>
        </header>
        <section className="space-y-3 p-4">
          {params.erro && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{params.erro}</div>}
          {error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-xs text-rose-700">Não foi possível consultar as cargas. Atualize a página.</div>}
          {!error && (cargas ?? []).length === 0 && <div className="rounded-xl bg-white p-5 text-sm">Não há cargas abertas para este entregador.</div>}
          {(cargas ?? []).map(carga => (
            <form key={carga.id} action={escolherCargaMobile} className="rounded-[20px] border border-emerald-100 bg-white p-4 shadow-sm">
              <input type="hidden" name="carga_id" value={carga.id} />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-black">Carga nº {carga.id}</p>
                  <p className="mt-1 text-xs text-slate-600">{carga.codigo}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">{carga.status === "EM_ROTA" ? "Em rota" : "Aberta"}</span>
              </div>
              <button type="submit" className="mt-4 w-full rounded-xl bg-[#116b38] px-4 py-3 text-xs font-black text-white">
                {Number(atual) === carga.id ? "Carga atual — selecionar novamente" : "Usar esta carga"}
              </button>
            </form>
          ))}
          <p className="text-[11px] text-slate-500">A escolha não transfere cestas nem altera saldos. Operações e rotas usam a carga selecionada.</p>
        </section>
      </div>
    </main>
  );
}
