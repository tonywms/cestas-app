export const instant = false;

// V106: cargas nao sao selecionadas para vendas. Esta rota antiga agora
// encaminha para a lista de cargas a receber do CD.
import { redirect } from "next/navigation";

export default async function LegadoSelecionarCarga() {
  redirect("/mobile/carga");
}
