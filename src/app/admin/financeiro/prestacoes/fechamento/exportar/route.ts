import { NextRequest,NextResponse } from "next/server";
import * as XLSX from "@e965/xlsx";
import {getCurrentUserProfile} from "@/lib/auth/get-current-user";
import {PERMISSOES,temPermissao} from "@/lib/auth/permissions";
import {createClient} from "@/lib/supabase/server";
import {
 type ResumoCreditosV114,type PrestacaoCDV114,hojeV114,numeroV114,
 resumoPrestacoesV114,periodoValidoV114,horarioV114
} from "@/lib/financeiro/fechamento-cd-v114";
const seguro=(s:string)=>/^[\s]*[=+\-@\t\r]/.test(s)?"'"+s:s;
export async function GET(req:NextRequest){
  const usuario=await getCurrentUserProfile();
  if(!usuario||!usuario.ativo)return new NextResponse("Sessão inválida.",{status:401});
  if(!usuario.isPlatformAdmin&&!temPermissao(usuario.permissoes,PERMISSOES.FINANCEIRO_AUDITAR))
    return new NextResponse("Acesso financeiro não autorizado.",{status:403});
  const inicio=String(req.nextUrl.searchParams.get("inicio")??"");
  const fim=String(req.nextUrl.searchParams.get("fim")??"");
  if(!periodoValidoV114(inicio,fim,hojeV114()))
    return new NextResponse("Período inválido. Escolha até 91 dias.",{status:400});
  const supabase=await createClient();
  const [c,p]=await Promise.all([
    supabase.rpc("listar_creditos_corporativos_v110",{
      p_empresa_id:usuario.empresa.id,p_inicio:inicio,p_fim:fim
    }),
    supabase.rpc("listar_prestacoes_v109",{p_empresa_id:usuario.empresa.id})
  ]);
  if(c.error||p.error)return new NextResponse("Erro ao buscar o fechamento financeiro.",{status:422});
  const creditos=(c.data??{}) as ResumoCreditosV114;
  const prestacoes=(Array.isArray(p.data)?p.data:[]) as PrestacaoCDV114[];
  if(prestacoes.length>=100||creditos.detalhe_limitado)
    return new NextResponse("Limite de registros atingido: reduza o período. Nenhum Excel parcial será emitido.",{status:422});
  const r=resumoPrestacoesV114(prestacoes,inicio,fim);
  const wb=XLSX.utils.book_new();
  const resumo:(string|number)[][]=[
    ["CESTAS APP | FECHAMENTO FINANCEIRO DO CD"],
    ["Empresa",seguro(usuario.empresa.nomeFantasia??"Empresa")],
    ["Período inicial",inicio],["Período final",fim],
    ["PIX/cartão empresa: registrado",numeroV114(creditos.total)],
    ["PIX/cartão empresa: confirmado",numeroV114(creditos.valor_conciliado)],
    ["PIX/cartão empresa: pendente",numeroV114(creditos.valor_pendente)],
    ["Quantidade de créditos empresariais",numeroV114(creditos.transacoes)],
    ["Prestações que cruzam o período",r.quantidade],
    ["Dinheiro físico em prestações",r.dinheiroEsperado],
    ["PIX do entregador em prestações",r.pixEntregador],
    ["Cartão do entregador em prestações",r.cartaoEntregador],
    ["Dinheiro confirmado pelo CD",r.dinheiroConferido],
    ["PIX do entregador confirmado",r.pixConferido],
    ["Cartão do entregador confirmado",r.cartaoConferido],
    ["Taxas de cartão autorizadas",r.taxasAutorizadas],
    ["Saldo pendente dinheiro",r.pendenteDinheiro],
    ["Saldo pendente PIX do entregador",r.pendentePix],
    ["Saldo pendente cartão do entregador",r.pendenteCartao],
    ["Critério","Créditos corporativos usam a data de recebimento. Prestações usam intervalo sobreposto."],
    ["Nota","Créditos da empresa e repasses de entregadores não são somados como uma nova entrada."],
    ["Nota","Prestações não enviadas não estão incluídas. Confirmações bancárias são manuais."],
  ];
  const resumoWs=XLSX.utils.aoa_to_sheet(resumo);
  resumoWs["!cols"]=[{wch:49},{wch:91}];
  for(const idx of [5,6,7,10,11,12,13,14,15,16,17,18,19]){
    const cell=resumoWs[`B${idx}`];if(cell)cell.z='"R$" #,##0.00';
  }
  XLSX.utils.book_append_sheet(wb,resumoWs,"Resumo CD");
  const linhasCredito:(string|number)[][]=[[
    "Recebido em (Fortaleza)","Tipo","Origem","Nº origem","Cliente","Entregador",
    "Valor (R$)","Situação","Conferido em (Fortaleza)","Referência registrada"
  ]];
  for(const m of creditos.movimentos??[]){
    linhasCredito.push([
      horarioV114(m.recebido_at),m.forma,m.origem,numeroV114(m.origem_id),
      seguro(m.cliente_nome),seguro(m.entregador_nome??""),numeroV114(m.valor),
      m.conciliado?"CONFIRMADO PELO CD":"PENDENTE",
      m.conciliado_at?horarioV114(m.conciliado_at):"",
      m.referencia?.startsWith("CONF-MANUAL-CD-")?"Confirmação manual do CD":seguro(m.referencia??"")
    ]);
  }
  const wCredito=XLSX.utils.aoa_to_sheet(linhasCredito);
  wCredito["!cols"]=[{wch:23},{wch:13},{wch:15},{wch:14},{wch:43},{wch:30},
    {wch:18},{wch:24},{wch:23},{wch:42}];
  wCredito["!autofilter"]={ref:`A1:J${linhasCredito.length}`};
  for(let i=2;i<=linhasCredito.length;i++){const cell=wCredito[`G${i}`];if(cell)cell.z='"R$" #,##0.00';}
  XLSX.utils.book_append_sheet(wb,wCredito,"Créditos empresa");

  const linhasPrest:(string|number)[][]=[[
    "Protocolo","Entregador","Início","Fim","Situação","Dinheiro devido",
    "PIX entregador devido","Cartão entregador devido","Dinheiro confirmado",
    "PIX confirmado","Cartão confirmado","Taxas autorizadas",
    "Pendente dinheiro","Pendente PIX","Pendente cartão"
  ]];
  for(const m of r.filtradas)linhasPrest.push([
    m.id,seguro(m.entregador_nome),m.inicio,m.fim,m.status,
    numeroV114(m.valores_esperados?.dinheiro),numeroV114(m.valores_esperados?.pix_entregador),
    numeroV114(m.valores_esperados?.cartao_entregador),numeroV114(m.dinheiro_conferido),
    numeroV114(m.pix_conferido),numeroV114(m.cartao_conferido),
    numeroV114(m.taxas_autorizadas),numeroV114(m.pendente_dinheiro),
    numeroV114(m.pendente_pix),numeroV114(m.pendente_cartao)
  ]);
  const wPrest=XLSX.utils.aoa_to_sheet(linhasPrest);
  wPrest["!cols"]=Array.from({length:15},()=>({wch:22}));
  wPrest["!cols"][1]={wch:34};
  wPrest["!autofilter"]={ref:`A1:O${linhasPrest.length}`};
  for(let i=2;i<=linhasPrest.length;i++){
    for(let col=5;col<15;col++){
      const column=XLSX.utils.encode_col(col),cell=wPrest[`${column}${i}`];
      if(cell)cell.z='"R$" #,##0.00';
    }
  }
  XLSX.utils.book_append_sheet(wb,wPrest,"Prestações entregadores");
  const bytes=XLSX.write(wb,{type:"buffer",bookType:"xlsx"});
  return new NextResponse(new Uint8Array(bytes),{status:200,headers:{
    "Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition":`attachment; filename="CESTAS_FECHAMENTO_CD_${inicio}_${fim}.xlsx"`,
    "Cache-Control":"private, no-store, max-age=0",
    "X-Content-Type-Options":"nosniff"
  }});
}
