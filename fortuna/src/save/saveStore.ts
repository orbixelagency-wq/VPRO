/**
 * Guardado en IndexedDB: varias ranuras, autoguardado, metadatos para el menú y
 * copia de seguridad de la ranura anterior para protegerse de la corrupción.
 */
import type { SaveMeta } from '../worker/protocol';

const DB_NAME = 'fortuna';
const DB_VERSION = 1;
const STORE = 'saves';
export const AUTOSAVE_SLOT = 'auto';

export interface SaveRecord {
  slot: string;
  savedAt: number;
  meta: SaveMeta;
  state: string;
  backup?: string;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'slot' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function listSaves(): Promise<SaveRecord[]> {
  try {
    const all = await tx<SaveRecord[]>('readonly', (s) => s.getAll() as IDBRequest<SaveRecord[]>);
    return all.sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

export async function writeSave(slot: string, state: string, meta: SaveMeta): Promise<void> {
  let backup: string | undefined;
  try {
    const prev = await tx<SaveRecord | undefined>(
      'readonly',
      (s) => s.get(slot) as IDBRequest<SaveRecord | undefined>,
    );
    backup = prev?.state;
  } catch {
    backup = undefined;
  }
  const record: SaveRecord = { slot, savedAt: Date.now(), meta, state, backup };
  await tx('readwrite', (s) => s.put(record));
}

export async function readSave(slot: string): Promise<SaveRecord | undefined> {
  return tx<SaveRecord | undefined>(
    'readonly',
    (s) => s.get(slot) as IDBRequest<SaveRecord | undefined>,
  );
}

export async function deleteSave(slot: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(slot));
}

/** Exporta una partida como fichero descargable. */
export function exportSave(record: SaveRecord): void {
  const blob = new Blob([JSON.stringify({ format: 'fortuna-save', ...record })], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fortuna-${record.meta.playerName}-${record.meta.date.replace(/\s+/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
