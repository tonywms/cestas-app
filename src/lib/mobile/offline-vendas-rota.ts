// V105.2 — negociação de venda e bipagem persistidas no dispositivo.
export type VendaRotaOfflineDados = {
  rotaClienteId: number;
  clienteId: number;
  cargaId: number;
  tipoCestaId: number;
  quantidade: number;
  valorTotalEsperado: number;
  tipoVenda: "AVISTA" | "SALDO_ABERTO" | "CREDIARIO";
  formaPagamento: string;
  valorEntrada: number;
  quantidadeParcelas: number | null;
  primeiroVencimento: string | null;
  observacao: string;
  modoControle: "QUANTIDADE" | "VOLUME";
  exigirBipagem: boolean;
  codigosVolume: string[];
};
export type VendaRotaOffline = {
  id: string; empresaId: string; usuarioId: string;
  criadoEm: string; status: "rascunho" | "pendente" | "conflito";
  erro: string | null; clienteNome: string; dados: VendaRotaOfflineDados;
};
export const EVENTO_VENDAS_OFFLINE = "cestas:vendas-rota-offline";
const DB_NAME = "cestas-app-vendas-rota-offline-v1052";
const STORE = "vendas_rota";

function abrir(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Armazenamento offline indisponível neste navegador."));
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Erro ao abrir armazenamento local."));
    req.onblocked = () => reject(new Error("Feche outras abas antigas do aplicativo."));
  });
}

async function transacao<T>(
  modo: IDBTransactionMode, fn: (store: IDBObjectStore, done: (r: T) => void) => void,
): Promise<T> {
  const db = await abrir();
  return new Promise<T>((resolve, reject) => {
    let result!: T;
    const tx = db.transaction(STORE, modo);
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error("Falha na gravação offline.")); };
    tx.onabort = () => { db.close(); reject(new Error("Operação offline não gravada: verifique a fila.")); };
    try { fn(tx.objectStore(STORE), x => { result = x; }); }
    catch (e) { tx.abort(); reject(e); }
  });
}

export async function listarVendasRotaOffline(empresaId: string, usuarioId: string): Promise<VendaRotaOffline[]> {
  const todos = await transacao<VendaRotaOffline[]>("readonly", (store, done) => {
    const req = store.getAll();
    req.onsuccess = () => done(req.result as VendaRotaOffline[]);
  });
  return todos.filter(v => v.empresaId === empresaId && v.usuarioId === usuarioId)
    .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
}

export async function salvarRascunhoVendaOffline(registro: VendaRotaOffline): Promise<void> {
  await transacao<void>("readwrite", (store, done) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const existentes = req.result as VendaRotaOffline[];
      if (existentes.some(v => v.empresaId === registro.empresaId &&
          v.usuarioId === registro.usuarioId && v.dados.rotaClienteId === registro.dados.rotaClienteId)) {
        store.transaction.abort();
        return;
      }
      const insert = store.add(registro);
      insert.onsuccess = () => done(undefined);
    };
  });
  window.dispatchEvent(new Event(EVENTO_VENDAS_OFFLINE));
}

export async function atualizarCodigosRascunhoVendaOffline(id: string, codigos: string[]): Promise<void> {
  await transacao<void>("readwrite", (store, done) => {
    const req = store.get(id);
    req.onsuccess = () => {
      const item = req.result as VendaRotaOffline | undefined;
      if (!item || item.status !== "rascunho" ||
        codigos.length > item.dados.quantidade || new Set(codigos).size !== codigos.length ||
        codigos.some(s => !s.trim() || s.length > 120)) {
        store.transaction.abort();
        return;
      }
      const put = store.put({
        ...item, dados: { ...item.dados, codigosVolume: codigos },
      } as VendaRotaOffline);
      put.onsuccess = () => done(undefined);
    };
  });
  window.dispatchEvent(new Event(EVENTO_VENDAS_OFFLINE));
}

export async function concluirRascunhoVendaOffline(id: string, codigos: string[]): Promise<void> {
  await transacao<void>("readwrite", (store, done) => {
    const req = store.get(id);
    req.onsuccess = () => {
      const item = req.result as VendaRotaOffline | undefined;
      if (!item || item.status !== "rascunho") { store.transaction.abort(); return; }
      const normalizados = codigos.map(s => s.trim().toUpperCase());
      if (item.dados.exigirBipagem && (normalizados.length !== item.dados.quantidade ||
          new Set(normalizados).size !== normalizados.length || normalizados.some(s => !s))) {
        store.transaction.abort(); return;
      }
      if (!item.dados.exigirBipagem && normalizados.length) { store.transaction.abort(); return; }
      const put = store.put({
        ...item, status: "pendente",
        dados: { ...item.dados, codigosVolume: normalizados },
      } as VendaRotaOffline);
      put.onsuccess = () => done(undefined);
    };
  });
  window.dispatchEvent(new Event(EVENTO_VENDAS_OFFLINE));
}

export async function confirmarVendaOffline(id: string): Promise<void> {
  await transacao<void>("readwrite", (store, done) => {
    const req = store.delete(id);
    req.onsuccess = () => done(undefined);
  });
  window.dispatchEvent(new Event(EVENTO_VENDAS_OFFLINE));
}

export async function marcarConflitoVendaOffline(id: string, erro: string): Promise<void> {
  await transacao<void>("readwrite", (store, done) => {
    const req = store.get(id);
    req.onsuccess = () => {
      const item = req.result as VendaRotaOffline | undefined;
      if (!item) { done(undefined); return; }
      const put = store.put({ ...item, status: "conflito", erro: erro.slice(0, 350) } as VendaRotaOffline);
      put.onsuccess = () => done(undefined);
    };
  });
  window.dispatchEvent(new Event(EVENTO_VENDAS_OFFLINE));
}
