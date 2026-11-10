// V104: fila persistente no IndexedDB (somente browser, sem envio ate ACK do servidor).
export const CAMPOS_CLIENTE = [
  "nome", "cpf_cnpj", "telefone", "logradouro", "numero", "complemento",
  "bairro", "cidade", "uf", "cep",
] as const;
export type CampoCliente = (typeof CAMPOS_CLIENTE)[number];
export type DadosCliente = Record<CampoCliente, string>;
export type RegistroClienteOffline = {
  id: string;
  empresaId: string;
  usuarioId: string;
  criadoEm: string;
  status: "pendente" | "conflito";
  erro: string | null;
  dados: DadosCliente;
};

const DB = "cestas-app-offline-v104";
const STORE = "clientes_pendentes";

function abrir(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Este navegador não permite armazenar operações offline."));
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Falha ao abrir armazenamento local."));
  });
}

async function executar<T>(
  modo: IDBTransactionMode,
  executarNaLoja: (loja: IDBObjectStore, concluir: (valor: T) => void) => void,
): Promise<T> {
  const db = await abrir();
  return new Promise<T>((resolve, reject) => {
    let resultado!: T;
    let finalizado = false;
    const tx = db.transaction(STORE, modo);
    tx.oncomplete = () => { db.close(); resolve(resultado); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error("Falha ao salvar no aparelho.")); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("Armazenamento local cancelado.")); };
    try {
      executarNaLoja(tx.objectStore(STORE), (valor) => {
        if (!finalizado) { resultado = valor; finalizado = true; }
      });
    } catch (erro) {
      tx.abort();
      reject(erro);
    }
  });
}

export async function salvarClienteOffline(registro: RegistroClienteOffline): Promise<void> {
  await executar<void>("readwrite", (loja, concluir) => {
    const req = loja.add(registro);
    req.onsuccess = () => concluir(undefined);
  });
  window.dispatchEvent(new Event("cestas:clientes-offline-alterados"));
}

export async function listarClientesOffline(empresaId: string, usuarioId: string): Promise<RegistroClienteOffline[]> {
  const itens = await executar<RegistroClienteOffline[]>("readonly", (loja, concluir) => {
    const req = loja.getAll();
    req.onsuccess = () => concluir(req.result as RegistroClienteOffline[]);
  });
  return itens.filter((v) => v.empresaId === empresaId && v.usuarioId === usuarioId)
    .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
}

export async function removerClienteOffline(id: string): Promise<void> {
  await executar<void>("readwrite", (loja, concluir) => {
    const req = loja.delete(id);
    req.onsuccess = () => concluir(undefined);
  });
  window.dispatchEvent(new Event("cestas:clientes-offline-alterados"));
}

export async function conflitoClienteOffline(id: string, erro: string): Promise<void> {
  await executar<void>("readwrite", (loja, concluir) => {
    const req = loja.get(id);
    req.onsuccess = () => {
      const atual = req.result as RegistroClienteOffline | undefined;
      if (!atual) { concluir(undefined); return; }
      const reqSalvar = loja.put({ ...atual, status: "conflito", erro: erro.slice(0, 300) });
      reqSalvar.onsuccess = () => concluir(undefined);
    };
  });
  window.dispatchEvent(new Event("cestas:clientes-offline-alterados"));
}
