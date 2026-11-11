// CESTAS_V119 - Leituras executivas segregadas por empresa. SEM MUTACOES.
import { createClient } from "@/lib/supabase/server";

export type Zona = { nome: string; cidade: string; atendimentos: number; vendedores: number };
export type Vendedor = { id: string; nome: string; entregas: number; vendas: number; faturamento: number; ocorrencias: number };
export type Visita = { id: number; data: string; nomeCliente: string; bairro: string; cidade: string; vendedor: string };
export type Visao = {
  inicio: string;
  fim: string;
  limiteAtingido: boolean;
  entregas: number;
  vendas: number;
  faturamento: number;
  pagamentos: number;
  recebido: number;
  ocorrencias: number;
  cargasAbertas: number;
  bairros: Zona[];
  equipe: Vendedor[];
  visitas: Visita[];
  serie: { data: string; entregas: number }[];
};

export function diaFortaleza(data = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(data);
  const mapa = Object.fromEntries(partes.map(item => [item.type, item.value]));
  return `${mapa.year}-${mapa.month}-${mapa.day}`;
}
export function deslocarDia(dia: string, dias: number): string {
  const data = new Date(`${dia}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}
export function dataValida(dia: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false;
  const data = new Date(`${dia}T12:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().startsWith(dia);
}
export function periodo(dias: string | undefined): { inicio: string; fim: string; dias: number } {
  const n = dias === "7" ? 7 : dias === "90" ? 90 : 30;
  const fim = diaFortaleza();
  return { inicio: deslocarDia(fim, -(n - 1)), fim, dias: n };
}
export const dinheiro = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
export const dataHora = (v: string) => new Date(v).toLocaleString("pt-BR", { timeZone: "America/Fortaleza", dateStyle: "short", timeStyle: "short" });
export const dataBr = (v: string) => v.split("-").reverse().join("/");
export function temPerfilGestao(u: { perfilCodigo: string; isPlatformAdmin: boolean }): boolean {
  return u.isPlatformAdmin || u.perfilCodigo === "GESTOR" || u.perfilCodigo === "ADMINISTRADOR";
}

function unico<T>(a: T[]): T | undefined { return a[0]; }
function txt(v: unknown): string { return String(v ?? "").trim(); }
function num(v: unknown): number { const n = Number(v); return Number.isFinite(n) ? n : 0; }

type EntregaRow = { id: number; entregador_id: string; cliente_id: number; status: string; entregue_at: string | null };
type VendaRow = { id: number; entregador_id: string; valor_total: number; status: string; created_at: string };
type PagamentoRow = { id: number; valor: number; created_at: string };
type OcorrenciaRow = { id: number; entregador_id: string; created_at: string };
type CargaRow = { id: number; status: string };
type ClienteRow = { id: number; nome: string; bairro: string | null; cidade: string | null };
type MembroRow = { usuario_id: string; ativo: boolean; usuarios: { id: string; nome: string; ativo: boolean } | { id: string; nome: string; ativo: boolean }[] | null; perfis: { codigo: string } | { codigo: string }[] | null };

// Limites conscientes: nao usar dados parciais como total auditavel sem exibir aviso.
export async function obterVisao(empresaId: string, dias: string | undefined): Promise<Visao> {
  const { inicio, fim } = periodo(dias);
  const inicioIso = `${inicio}T00:00:00-03:00`;
  const fimIso = `${fim}T23:59:59.999-03:00`;
  const db = await createClient();
  const [e, v, p, o, c, cli, membros] = await Promise.all([
    db.from("entregas").select("id,entregador_id,cliente_id,status,entregue_at", { count: "exact" })
      .eq("empresa_id", empresaId).eq("status", "CONCLUIDA").gte("entregue_at", inicioIso).lte("entregue_at", fimIso)
      .order("entregue_at", { ascending: false }).limit(2000),
    db.from("vendas").select("id,entregador_id,valor_total,status,created_at", { count: "exact" })
      .eq("empresa_id", empresaId).gte("created_at", inicioIso).lte("created_at", fimIso).limit(2000),
    db.from("pagamentos").select("id,valor,created_at", { count: "exact" })
      .eq("empresa_id", empresaId).gte("created_at", inicioIso).lte("created_at", fimIso).limit(2000),
    db.from("ocorrencias").select("id,entregador_id,created_at", { count: "exact" })
      .eq("empresa_id", empresaId).gte("created_at", inicioIso).lte("created_at", fimIso).limit(2000),
    db.from("cargas").select("id,status", { count: "exact" }).eq("empresa_id", empresaId).neq("status", "FINALIZADA").limit(2000),
    db.from("clientes").select("id,nome,bairro,cidade", { count: "exact" }).eq("empresa_id", empresaId).limit(5000),
    db.from("empresa_usuarios").select("usuario_id,ativo,usuarios!inner(id,nome,ativo),perfis!inner(codigo)")
      .eq("empresa_id", empresaId).limit(2000),
  ]);
  const falhas = [e, v, p, o, c, cli, membros].filter(r => r.error).map(r => r.error?.message ?? "Consulta falhou");
  if (falhas.length) throw new Error(`CESTAS_V119_CONSULTA_INDISPONIVEL: ${falhas.join("; ")}`);
  const entregas = (e.data ?? []) as EntregaRow[];
  const vendas = (v.data ?? []) as VendaRow[];
  const pagamentos = (p.data ?? []) as PagamentoRow[];
  const ocorrencias = (o.data ?? []) as OcorrenciaRow[];
  const cargas = (c.data ?? []) as CargaRow[];
  const clientes = (cli.data ?? []) as ClienteRow[];
  const vinculos = (membros.data ?? []) as unknown as MembroRow[];
  const mapaClientes = new Map(clientes.map(item => [Number(item.id), item]));
  const nomes = new Map<string, string>();
  const motoristas = new Set<string>();
  for (const m of vinculos) {
    const pessoa = Array.isArray(m.usuarios) ? unico(m.usuarios) : m.usuarios;
    const perfil = Array.isArray(m.perfis) ? unico(m.perfis) : m.perfis;
    if (!pessoa || !m.ativo || !pessoa.ativo) continue;
    nomes.set(txt(m.usuario_id), pessoa.nome);
    if (perfil?.codigo === "ENTREGADOR") motoristas.add(txt(m.usuario_id));
  }
  const equipes = new Map<string, Vendedor>();
  function integrante(id: string): Vendedor {
    if (!equipes.has(id)) equipes.set(id, { id, nome: nomes.get(id) ?? "Entregador", entregas: 0, vendas: 0, faturamento: 0, ocorrencias: 0 });
    return equipes.get(id)!;
  }
  for (const id of motoristas) integrante(id);
  const areas = new Map<string, { nome: string; cidade: string; atendimentos: number; ids: Set<string> }>();
  const visitas: Visita[] = [];
  for (const item of entregas) {
    const id = txt(item.entregador_id); integrante(id).entregas += 1;
    const cliente = mapaClientes.get(Number(item.cliente_id));
    const bairro = txt(cliente?.bairro) || "Bairro não informado";
    const cidade = txt(cliente?.cidade) || "Cidade não informada";
    const chave = `${cidade.toLocaleLowerCase("pt-BR")}::${bairro.toLocaleLowerCase("pt-BR")}`;
    if (!areas.has(chave)) areas.set(chave, { nome: bairro, cidade, atendimentos: 0, ids: new Set<string>() });
    const a = areas.get(chave)!; a.atendimentos++; if (id) a.ids.add(id);
    if (visitas.length < 40 && item.entregue_at) visitas.push({ id: Number(item.id), data: item.entregue_at,
      nomeCliente: txt(cliente?.nome) || "Cliente", bairro, cidade, vendedor: nomes.get(id) ?? "Entregador" });
  }
  for (const venda of vendas) {
    const m = integrante(txt(venda.entregador_id));
    m.vendas++; m.faturamento += num(venda.valor_total);
  }
  for (const ocorrencia of ocorrencias) integrante(txt(ocorrencia.entregador_id)).ocorrencias++;
  const serie = Array.from({ length: Math.min(7, periodo(dias).dias) }, (_, i) => ({ data: deslocarDia(fim, i - Math.min(7, periodo(dias).dias) + 1), entregas: 0 }));
  const serieMap = new Map(serie.map(x => [x.data, x]));
  for (const item of entregas) {
    if (item.entregue_at) {
      const d = diaFortaleza(new Date(item.entregue_at)); const registro = serieMap.get(d);
      if (registro) registro.entregas++;
    }
  }
  return {
    inicio, fim,
    limiteAtingido: [e, v, p, o, c, cli, membros].some((r, i) => (r.count ?? 0) > ([2000,2000,2000,2000,2000,5000,2000][i])),
    entregas: entregas.length, vendas: vendas.length, faturamento: vendas.reduce((s,x)=>s+num(x.valor_total),0),
    pagamentos: pagamentos.length, recebido: pagamentos.reduce((s,x)=>s+num(x.valor),0),
    ocorrencias: ocorrencias.length, cargasAbertas: cargas.length,
    bairros: [...areas.values()].map(x => ({ nome:x.nome, cidade:x.cidade, atendimentos:x.atendimentos, vendedores:x.ids.size }))
      .sort((a,b) => b.atendimentos - a.atendimentos || a.nome.localeCompare(b.nome,"pt-BR")),
    equipe: [...equipes.values()].sort((a,b) => b.entregas-a.entregas || b.vendas-a.vendas || a.nome.localeCompare(b.nome,"pt-BR")),
    visitas,
    serie,
  };
}
