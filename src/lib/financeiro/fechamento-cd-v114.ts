// V114: leitura e totalização de fontes já registradas. NÃO grava valores.
export type CreditoCDV114 = {
  origem:string; origem_id:number; cliente_nome:string; entregador_nome:string;
  recebido_at:string; forma:string; valor:number; conciliado:boolean;
  referencia:string|null; conciliado_at:string|null;
};
export type ResumoCreditosV114 = {
  total:number;valor_conciliado:number;valor_pendente:number;transacoes:number;
  conciliados:number;pendentes:number;detalhe_limitado:boolean;
  movimentos:CreditoCDV114[];
};
export type PrestacaoCDV114 = {
  id:number;entregador_nome:string;inicio:string;fim:string;status:string;
  enviado_at:string;dinheiro_declarado:number;pix_declarado:number;cartao_declarado:number;
  dinheiro_conferido:number;pix_conferido:number;cartao_conferido:number;
  taxas_autorizadas:number;pendente_dinheiro:number;pendente_pix:number;
  pendente_cartao:number;valores_esperados:{
    dinheiro?:number;pix_entregador?:number;cartao_entregador?:number;
    pix_empresa?:number;cartao_empresa?:number;total?:number;
  };
};
export const numeroV114=(v:unknown):number=>Number.isFinite(Number(v))?Number(v):0;
export const moedaV114=(v:unknown):string=>new Intl.NumberFormat("pt-BR",{
  currency:"BRL",style:"currency"
}).format(numeroV114(v));
export const dataBrV114=(s:string):string=>/^\d{4}-\d{2}-\d{2}$/.test(s)?
  s.split("-").reverse().join("/"):s;
export const horarioV114=(s:string):string=>new Date(s).toLocaleString("pt-BR",{
  timeZone:"America/Fortaleza",dateStyle:"short",timeStyle:"short",
});
export function hojeV114():string{
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Fortaleza",
    year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const d=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return `${d.year}-${d.month}-${d.day}`;
}
export function periodoValidoV114(inicio:string,fim:string,hoje:string):boolean{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(inicio)||!/^\d{4}-\d{2}-\d{2}$/.test(fim)||
     inicio>fim||fim>hoje)return false;
  const a=Date.parse(inicio+"T12:00:00Z"),b=Date.parse(fim+"T12:00:00Z");
  return Number.isFinite(a)&&Number.isFinite(b)&&(b-a)/86400000<=90&&
    (Date.parse(hoje+"T12:00:00Z")-a)/86400000<=366;
}
export function resumoPrestacoesV114(prestacoes:PrestacaoCDV114[],inicio:string,fim:string){
  const filtradas=prestacoes.filter(p=>p.inicio<=fim&&p.fim>=inicio);
  return {
    filtradas,
    quantidade:filtradas.length,
    emAberto:filtradas.filter(p=>p.status!=="CONFERIDA").length,
    dinheiroEsperado:filtradas.reduce((v,p)=>v+numeroV114(p.valores_esperados?.dinheiro),0),
    pixEntregador:filtradas.reduce((v,p)=>v+numeroV114(p.valores_esperados?.pix_entregador),0),
    cartaoEntregador:filtradas.reduce((v,p)=>v+numeroV114(p.valores_esperados?.cartao_entregador),0),
    dinheiroConferido:filtradas.reduce((v,p)=>v+numeroV114(p.dinheiro_conferido),0),
    pixConferido:filtradas.reduce((v,p)=>v+numeroV114(p.pix_conferido),0),
    cartaoConferido:filtradas.reduce((v,p)=>v+numeroV114(p.cartao_conferido),0),
    taxasAutorizadas:filtradas.reduce((v,p)=>v+numeroV114(p.taxas_autorizadas),0),
    pendenteDinheiro:filtradas.reduce((v,p)=>v+numeroV114(p.pendente_dinheiro),0),
    pendentePix:filtradas.reduce((v,p)=>v+numeroV114(p.pendente_pix),0),
    pendenteCartao:filtradas.reduce((v,p)=>v+numeroV114(p.pendente_cartao),0),
  };
}
