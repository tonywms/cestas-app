export const instant = false;
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { obterVisao, periodo, temPerfilGestao } from "@/lib/gestao/indicadores-v119";
import CestasMobileShellV119_3 from "@/components/mobile/CestasMobileShellV119_3";
import PainelGestorMobileV119_3 from "@/components/mobile/PainelGestorMobileV119_3";

type Props = { searchParams: Promise<{ dias?: string }> };
// V119.3: visão gerencial usa o shell do coletor original, sem alterar a versão web.
export default async function GestaoMobileV119_3({ searchParams }: Props) {
  const usuario = await getCurrentUserProfile();
  if (!usuario || !usuario.ativo) redirect("/");
  if (!temPerfilGestao(usuario)) redirect("/mobile/sem-acesso");
  const { dias } = await searchParams;
  try {
    const visao = await obterVisao(usuario.empresa.id, dias);
    return <PainelGestorMobileV119_3 visao={visao} nome={usuario.empresa.nomeFantasia} dias={periodo(dias).dias}/>;
  } catch (erro) {
    console.error("[V119.3] Leitura gestao mobile indisponivel", erro);
    return <CestasMobileShellV119_3 modo="gestor" titulo="Painel do gestor" etiqueta="Central de gestão" subtitulo={usuario.empresa.nomeFantasia}>
      <div role="alert" className="card-premium rounded-[24px] bg-white p-6 text-sm font-semibold text-red-800">Não foi possível carregar os indicadores. Tente novamente quando a conexão estiver estável. Nenhum registro foi alterado.</div>
    </CestasMobileShellV119_3>;
  }
}
