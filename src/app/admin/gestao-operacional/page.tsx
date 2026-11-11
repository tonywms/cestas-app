export const instant = false;
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { obterVisao, periodo, temPerfilGestao } from "@/lib/gestao/indicadores-v119";
import PainelGestaoV119 from "@/components/gestao/PainelGestaoV119";

type Props = { searchParams: Promise<{ dias?: string }> };
export default async function GestaoOperacionalV119({ searchParams }: Props) {
  const usuario = await getCurrentUserProfile();
  if (!usuario || !usuario.ativo) redirect("/");
  if (!temPerfilGestao(usuario)) redirect("/admin");
  const { dias } = await searchParams;
  try {
    const visao = await obterVisao(usuario.empresa.id, dias);
    return <PainelGestaoV119 visao={visao} nome={usuario.empresa.nomeFantasia} dias={periodo(dias).dias}/>;
  } catch (e) {
    console.error("[V119] Falha em leitura gerencial", e);
    return <main className="app-premium min-h-screen p-6"><h1 className="text-2xl font-black">Centro de gestão</h1><p role="alert" className="mt-4 rounded-xl bg-red-50 p-5 text-sm text-red-800">Indicadores temporariamente indisponíveis. Nenhum dado foi modificado.</p></main>;
  }
}
