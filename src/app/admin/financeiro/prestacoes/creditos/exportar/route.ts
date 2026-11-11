import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "@e965/xlsx";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Movimento = {
  origem: string; origem_id: number; cliente_nome: string; cliente_id: number;
  recebido_at: string; entregador_nome?: string; forma: string; valor: number;
  conciliado: boolean; conciliado_at: string | null; referencia: string | null;
  prestacao_id: number | null;
};
type Resumo = {
  transacoes: number; total: number; pendentes: number; valor_pendente: number;
  conciliados: number; valor_conciliado: number; detalhe_limitado: boolean;
  movimentos: Movimento[];
};
const padrao = /^\d{4}-\d{2}-\d{2}$/;
function diaHoje() {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza",
    year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const v = Object.fromEntries(p.map(x=>[x.type,x.value]));
  return `${v.year}-${v.month}-${v.day}`;
}
function tipoTexto(s: string): string {
  // Evitar interpretação de conteúdo de cliente como fórmula de planilha.
  return /^[\s]*[=+\-@\t\r]/.test(s) ? "'" + s : s;
}
function status(v: Movimento) { return v.conciliado ? "CONCILIADO" : "PENDENTE"; }
function passou(v: Movimento, s: string, forma: string, busca: string) {
  if (s!=="TODOS" && status(v)!==s) return false;
  if (forma!=="TODOS" && v.forma!==forma) return false;
  const alvo = `${v.cliente_nome} ${v.entregador_nome??""} ${v.origem} ${v.origem_id} ${v.referencia??""}`.toLocaleLowerCase("pt-BR");
  return alvo.includes(busca.toLocaleLowerCase("pt-BR"));
}
export async function GET(request: NextRequest) {
  const usuario = await getCurrentUserProfile();
  if (!usuario || !usuario.ativo) return new NextResponse("Não autenticado.",{status:401});
  if (!usuario.isPlatformAdmin && !temPermissao(usuario.permissoes,PERMISSOES.FINANCEIRO_AUDITAR))
    return new NextResponse("Sem autorização para exportar o financeiro.",{status:403});

  const q=request.nextUrl.searchParams;
  const hoje=diaHoje(),inicio=q.get("inicio")??hoje,fim=q.get("fim")??hoje;
  if (!padrao.test(inicio)||!padrao.test(fim))
    return new NextResponse("Datas inválidas.",{status:400});

  const situacao=q.get("situacao")??"TODOS";
  const forma=q.get("forma")??"TODOS";
  const busca=(q.get("busca")??"").trim().slice(0,100);
  if (!["TODOS","PENDENTE","CONCILIADO"].includes(situacao) ||
      !["TODOS","PIX","CARTAO"].includes(forma))
    return new NextResponse("Filtros inválidos.",{status:400});

  const supabase=await createClient();
  const {data,error}=await supabase.rpc("listar_creditos_corporativos_v110",{
    p_empresa_id:usuario.empresa.id,p_inicio:inicio,p_fim:fim
  });
  if (error) return new NextResponse("Não foi possível consultar o extrato financeiro.",{status:422});
  const resumo=(data??{}) as Partial<Resumo>;
  if (resumo.detalhe_limitado) return new NextResponse(
    "O período tem mais de 250 transações. Reduza o intervalo para exportar um demonstrativo completo.",
    {status:422}
  );

  const todos=Array.isArray(resumo.movimentos)?resumo.movimentos:[];
  const linhas=todos.filter(m=>passou(m,situacao,forma,busca));
  const totalVisivel=linhas.reduce((sum,m)=>sum+Number(m.valor??0),0);
  const pendenteVisivel=linhas.filter(m=>!m.conciliado).reduce((sum,m)=>sum+Number(m.valor??0),0);
  const wb=XLSX.utils.book_new();
  const cabecalho=["CESTAS APP | FECHAMENTO FINANCEIRO DO CD","", "", "", ""];
  const resumoAoa:(string|number)[][]=[
    cabecalho,
    ["Empresa",tipoTexto(usuario.empresa.nome??"Empresa")],
    ["Data inicial",inicio],
    ["Data final",fim],
    ["Situação",situacao],
    ["Meio de pagamento",forma],
    ["Busca",tipoTexto(busca||"Todas")],
    ["Créditos registrados (período)",Number(resumo.total??0)],
    ["Créditos ainda não conciliados (período)",Number(resumo.valor_pendente??0)],
    ["Créditos conciliados (período)",Number(resumo.valor_conciliado??0)],
    ["Quantidade total de transações",Number(resumo.transacoes??0)],
    ["Transações após filtros",linhas.length],
    ["Valor das transações filtradas",Math.round(totalVisivel*100)/100],
    ["Pendente após filtros",Math.round(pendenteVisivel*100)/100],
    ["Observação","Recebimento registrado não significa crédito conciliado no banco."],
    ["Observação","Transações corporativas não são repasses do entregador."],
  ];
  const resumoWs=XLSX.utils.aoa_to_sheet(resumoAoa);
  resumoWs["!cols"]=[{wch:49},{wch:84},{wch:15},{wch:15},{wch:15}];
  for (const linha of [7,8,9,12,13]) {
    const cell=resumoWs["B"+(linha+1)];
    if (cell) cell.z='"R$" #,##0.00';
  }
  XLSX.utils.book_append_sheet(wb,resumoWs,"Resumo");

  const dados:(string|number)[][]=[
    ["Data e hora Fortaleza","Origem","Nº origem","Cliente","Código cliente","Operador",
      "Forma","Valor (R$)","Situação","Conferido em Fortaleza","Referência bancária/NSU","Protocolo prestação"],
    ...linhas.map(m=>([
      new Date(m.recebido_at).toLocaleString("pt-BR",{timeZone:"America/Fortaleza",dateStyle:"short",timeStyle:"short"}),
      m.origem, Number(m.origem_id), tipoTexto(m.cliente_nome), Number(m.cliente_id),
      tipoTexto(m.entregador_nome??""),m.forma,Number(m.valor),status(m),
      m.conciliado_at?new Date(m.conciliado_at).toLocaleString("pt-BR",{timeZone:"America/Fortaleza",dateStyle:"short",timeStyle:"short"}):"",
      tipoTexto(m.referencia??""), m.prestacao_id??""
    ])),
  ];
  const ws=XLSX.utils.aoa_to_sheet(dados);
  ws["!cols"]=[{wch:21},{wch:14},{wch:12},{wch:42},{wch:14},{wch:30},{wch:12},
    {wch:17},{wch:17},{wch:22},{wch:48},{wch:21}];
  ws["!autofilter"]={ref:`A1:L${Math.max(1,dados.length)}`};
  for(let i=2;i<=dados.length;i++){
    const cell=ws["H"+i]; if(cell)cell.z='"R$" #,##0.00';
  }
  XLSX.utils.book_append_sheet(wb,ws,"Recebimentos");
  const bytes=XLSX.write(wb,{bookType:"xlsx",type:"buffer"});
  return new NextResponse(new Uint8Array(bytes),{
    status:200,headers:{
      "Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":`attachment; filename="CESTAS_CD_CONCILIACAO_${inicio}_${fim}.xlsx"`,
      "Cache-Control":"private, no-store, max-age=0",
      "X-Content-Type-Options":"nosniff"
    }
  });
}
