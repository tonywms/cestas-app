// V105 — fila persistente de entregas. IDs fixos são mantidos até ACK do Supabase.
export type DadosEntregaOffline = {
  modo: "QUANTIDADE" | "VOLUME";
  cargaId: number;
  clienteId: number;
  tipoCestaId: number;
  quantidade: number;
  codigosVolume: string[];
  rotaClienteId: number | null;
  observacao: string;
};
export type EntregaPendenteOffline = {
  id: string; empresaId: string; usuarioId: string; criadoEm: string;
  status: "pendente" | "conflito"; erro: string | null;
  clienteNome: string; cargaCodigo: string;
  dados: DadosEntregaOffline;
};

const DB_NAME = "cestas-app-entregas-offline-v105";
const STORE = "entregas_pendentes";
export const EVENTO_ENTREGAS_OFFLINE = "cestas:entregas-offline-alteradas";

function abrirDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("O aparelho não disponibiliza armazenamento persistente."));
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Falha no armazenamento local."));
    req.onblocked = () => reject(new Error("Feche outras abas antigas do aplicativo."));
  });
}

async function transacao<T>(
  modo: IDBTransactionMode,
  exec: (store: IDBObjectStore, concluir: (x: T) => void) => void,
): Promise<T> {
  const db = await abrirDb();
  return new Promise((resolve, reject) => {
    let result!: T;
    const tx = db.transaction(STORE, modo);
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error("Erro de gravação local.")); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("Gravação local cancelada.")); };
    try { exec(tx.objectStore(STORE), (data) => { result = data; }); }
    catch (e) { tx.abort(); reject(e); }
  });
}

export async function listarEntregasOffline(empresaId: string, usuarioId: string):
  Promise<EntregaPendenteOffline[]> {
  const todas = await transacao<EntregaPendenteOffline[]>("readonly", (store, done) => {
    const req = store.getAll();
    req.onsuccess = () => done(req.result as EntregaPendenteOffline[]);
  });
  return todas.filter(x => x.empresaId === empresaId && x.usuarioId === usuarioId)
    .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
}

export async function salvarEntregaOffline(
  registro: EntregaPendenteOffline, saldoCapturado: number,
): Promise<void> {
  // Concorrencia de abas protegida pela transacao readwrite indivisivel.
  await transacao<void>("readwrite", (store, done) => {
    const todos = store.getAll();
    todos.onsuccess = () => {
      const anteriores = (todos.result as EntregaPendenteOffline[]).filter(x =>
        x.empresaId === registro.empresaId && x.usuarioId === registro.usuarioId &&
        x.dados.cargaId === registro.dados.cargaId &&
        x.dados.tipoCestaId === registro.dados.tipoCestaId,
      );
      const reservados = anteriores.reduce((s, x) => s + x.dados.quantidade, 0);
      if (!Number.isFinite(saldoCapturado) || saldoCapturado < registro.dados.quantidade + reservados) {
        store.transaction.abort();
        return;
      }
      if (registro.dados.codigosVolume.length) {
        const usados = new Set(anteriores.flatMap(x => x.dados.codigosVolume));
        if (registro.dados.codigosVolume.some(c => usados.has(c))) {
          store.transaction.abort();
          return;
        }
      }
      const salvo = store.add(registro);
      salvo.onsuccess = () => done(undefined);
    };
  }).catch(err => {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Saldo reservado por entregas pendentes ou volume já bipado. Confira a fila.");
    }
    throw err;
  });
  window.dispatchEvent(new Event(EVENTO_ENTREGAS_OFFLINE));
}

export async function confirmarEntregaOffline(id: string): Promise<void> {
  await transacao<void>("readwrite", (store, done) => {
    const req = store.delete(id);
    req.onsuccess = () => done(undefined);
  });
  window.dispatchEvent(new Event(EVENTO_ENTREGAS_OFFLINE));
}

export async function marcarConflitoEntregaOffline(id: string, erro: string): Promise<void> {
  await transacao<void>("readwrite", (store, done) => {
    const busca = store.get(id);
    busca.onsuccess = () => {
      const item = busca.result as EntregaPendenteOffline | undefined;
      if (!item) { done(undefined); return; }
      const req = store.put({ ...item, status: "conflito", erro: erro.slice(0, 350) });
      req.onsuccess = () => done(undefined);
    };
  });
  window.dispatchEvent(new Event(EVENTO_ENTREGAS_OFFLINE));
}
