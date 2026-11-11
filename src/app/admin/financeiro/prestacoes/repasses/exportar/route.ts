// V118 | Exportação somente leitura do ledger já confirmado.
import {getCurrentUserProfile} from "@/lib/auth/get-current-user";
import {PERMISSOES,temPermissao} from "@/lib/auth/permissions";
import {createClient} from "@/lib/supabase/server";
import {aplicar,dataHora,extrair,filtrosDe,nomeForma,protocolo} from "@/lib/financeiro/repasses-consulta-v118";
export const instant=false;
function coluna(v:string|number){
  let s=String(v).replace(/[\r\n\u0000-\u001f]/g," ");
  if(/^\s*[=+\-@]/.test(s))s="'"+s;
  return '"'+s.replaceAll('"','""')+'"';
}
export async function GET(request:Request):Promise<Response>{
  const usuario=await getCurrentUserProfile();
  if(!usuario||!usuario.ativo)return new Response("Não autenticado.",{status:401});
  if(!usuario.isPlatformAdmin&&!temPermissao(usuario.permissoes,PERMISSOES.FINANCEIRO_AUDITAR))
    return new Response("Acesso negado.",{status:403});
  const filtros=filtrosDe(Object.fromEntries(new URL(request.url).searchParams.entries()));
  const supabase=await createClient();
  const {data,error}=await supabase.rpc("listar_prestacoes_v109",{p_empresa_id:usuario.empresa.id});
  if(error)return new Response("Consulta financeira indisponível.",{status:503});
  const itens=aplicar(extrair(data,usuario.empresa.id),filtros);
  if(itens.length>20000)return new Response("Refine os filtros para até 20.000 repasses.",{status:413});
  const linhas=[["Protocolo","Prestação","Entregador","Período início","Período fim",
    "Confirmação em Fortaleza","Forma","Valor R$","Taxa autorizada R$","Referência"].map(coluna).join(";")];
  for(const r of itens)linhas.push([protocolo(r.id),r.prestacaoId,r.entregadorNome,r.inicio,r.fim,
    dataHora(r.confirmadoAt),nomeForma(r.forma),r.valor.toFixed(2).replace(".",","),
    r.taxa.toFixed(2).replace(".",","),r.referencia??""].map(coluna).join(";"));
  return new Response("\uFEFF"+linhas.join("\r\n")+"\r\n",{
    headers:{"Content-Type":"text/csv; charset=utf-8",
      "Content-Disposition":'attachment; filename="repasses_confirmados_cd_v118.csv"',
      "Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff"}
  });
}
