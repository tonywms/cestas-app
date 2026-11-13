// V118 | Leitura de repasses já confirmados, segregada por empresa.
export type FormaRepasse = "DINHEIRO" | "PIX" | "CARTAO";
export type Repasse = {
  id:number; prestacaoId:number; entregadorId:string; entregadorNome:string;
  inicio:string; fim:string; forma:FormaRepasse; valor:number; taxa:number;
  referencia:string|null; confirmadoAt:string; dataLocal:string;
};
export type Filtros = { inicio:string; fim:string; entregador:string; forma:string; busca:string };
type Registro=Record<string,unknown>;
const obj=(x:unknown):x is Registro=>!!x&&typeof x==="object"&&!Array.isArray(x);
const dinheiro=(x:unknown)=>{ const n=Number(x); return Number.isFinite(n)&&n>=0?Math.round(n*100)/100:0; };
const id=(x:unknown)=>{const n=Number(x);return Number.isSafeInteger(n)&&n>0?n:null;};
const dataOk=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s+"T12:00:00Z").getTime()) &&
  new Date(s+"T12:00:00Z").toISOString().startsWith(s);
const localDia=(s:string)=>{
  const d=new Date(s);
  const partes=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Fortaleza",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(d);
  const mapa=Object.fromEntries(partes.map(p=>[p.type,p.value]));
  return mapa.year+"-"+mapa.month+"-"+mapa.day;
};
export const brl=(n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n);
export const dataHora=(s:string)=>new Date(s).toLocaleString("pt-BR",{timeZone:"America/Fortaleza",dateStyle:"short",timeStyle:"short"});
export const diaBr=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)?s.split("-").reverse().join("/"):"—";
export const nomeForma=(forma:string)=>forma==="DINHEIRO"?"Dinheiro físico":forma==="PIX"?"PIX do entregador":"Cartão do entregador";
export const protocolo=(id:number)=>"RP-"+String(id).padStart(6,"0");
export function filtrosDe(q:Record<string,string|undefined>):Filtros {
  const inicio=String(q.inicio??"").slice(0,10),fim=String(q.fim??"").slice(0,10);
  const forma=String(q.forma??"").toUpperCase();
  return {inicio:dataOk(inicio)?inicio:"",fim:dataOk(fim)?fim:"",
    entregador:String(q.entregador??"").slice(0,80),
    forma:["DINHEIRO","PIX","CARTAO"].includes(forma)?forma:"",
    busca:String(q.busca??"").trim().slice(0,80)};
}
export function extrair(data:unknown,empresaId:string):Repasse[] {
  if(!Array.isArray(data))return [];
  const resultado:Repasse[]=[],vistos=new Set<number>();
  for(const p of data){
    if(!obj(p)||p.empresa_id!==empresaId||!Array.isArray(p.repasses))continue;
    const prestacaoId=id(p.id);if(!prestacaoId)continue;
    for(const r of p.repasses){
      if(!obj(r))continue;
      const rid=id(r.id),forma=String(r.forma??""),valor=dinheiro(r.valor);
      const confirmadoAt=String(r.confirmado_at??"");
      if(!rid||vistos.has(rid)||valor<=0||!["DINHEIRO","PIX","CARTAO"].includes(forma)||
        !Number.isFinite(new Date(confirmadoAt).getTime()))continue;
      vistos.add(rid);
      resultado.push({id:rid,prestacaoId,entregadorId:String(p.entregador_id??""),
        entregadorNome:String(p.entregador_nome??"Entregador"),inicio:String(p.inicio??""),
        fim:String(p.fim??""),forma:forma as FormaRepasse,valor,
        taxa:dinheiro(r.taxa_cartao_autorizada),referencia:r.referencia==null?null:String(r.referencia),
        confirmadoAt,dataLocal:localDia(confirmadoAt)});
    }
  }
  return resultado.sort((a,b)=>b.confirmadoAt.localeCompare(a.confirmadoAt)||b.id-a.id);
}
const semAcentos=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
export function aplicar(itens:Repasse[],f:Filtros):Repasse[] {
  const busca=semAcentos(f.busca);
  return itens.filter(r=>(!f.inicio||r.dataLocal>=f.inicio)&&(!f.fim||r.dataLocal<=f.fim)&&
    (!f.entregador||r.entregadorId===f.entregador)&&(!f.forma||r.forma===f.forma)&&
    (!busca||semAcentos(r.entregadorNome+" "+protocolo(r.id)+" "+r.prestacaoId+" "+(r.referencia??"")).includes(busca)));
}
export function queryFiltros(f:Filtros):URLSearchParams{
  const q=new URLSearchParams();
  for(const k of ["inicio","fim","entregador","forma","busca"] as const){if(f[k])q.set(k,f[k]);}
  return q;
}
