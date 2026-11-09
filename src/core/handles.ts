// Maniglie di cartelle e file (File System Access API) salvate in IndexedDB: il browser si ricorda dove sono e chiede solo il permesso a ogni nuova sessione.
const DB = 'dnd-manage', STORE = 'handles'
const open = () => new Promise<IDBDatabase>((res, rej) => {
  const r = indexedDB.open(DB, 1)
  r.onupgradeneeded = () => r.result.createObjectStore(STORE)
  r.onsuccess = () => res(r.result)
  r.onerror = () => rej(r.error)
})
const run = async <T,>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>) => {
  const db = await open()
  return new Promise<T>((res, rej) => { const r = f(db.transaction(STORE, mode).objectStore(STORE)); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
}
export const getHandle = (key: string) => run<any>('readonly', s => s.get(key)).then(v => v ?? null)
export const setHandle = (key: string, h: any) => run('readwrite', s => s.put(h, key))
export const delHandle = (key: string) => run('readwrite', s => s.delete(key))

// Con ask=false controlla soltanto; con ask=true chiede il permesso (va chiamato dentro un clic).
export async function ensurePermission(h: any, mode: 'read' | 'readwrite', ask: boolean): Promise<boolean> {
  const o = { mode }
  if ((await h.queryPermission(o)) === 'granted') return true
  return ask && (await h.requestPermission(o)) === 'granted'
}
