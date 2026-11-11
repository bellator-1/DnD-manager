import { setHandle } from './handles'

// Tutti i dati stanno in una cartella scelta dall'utente (File System Access API: Chrome o Edge). Il resto dell'app usa solo questa interfaccia.
export interface Store {
  read(path: string): Promise<string | null>
  write(path: string, content: string): Promise<void>
  list(dir: string): Promise<string[]>
  remove(path: string): Promise<void>
  removeDir(dir: string): Promise<void>
  readBlob(path: string): Promise<Blob | null>
  writeBlob(path: string, blob: Blob): Promise<void>
  listAll(dir: string): Promise<string[]> // tutti i file sotto la cartella, anche nelle sottocartelle (percorsi completi)
}

class FsStore implements Store {
  constructor(private root: any) {}
  private async dir(parts: string[], create: boolean) {
    let d = this.root
    for (const s of parts) d = await d.getDirectoryHandle(s, { create })
    return d
  }
  private split(p: string) { const parts = p.split('/'); return { parts, name: parts.pop()! } }
  async read(p: string) {
    try { const { parts, name } = this.split(p); const d = await this.dir(parts, false); return await (await (await d.getFileHandle(name)).getFile()).text() } catch { return null }
  }
  async write(p: string, c: string) {
    const { parts, name } = this.split(p); const d = await this.dir(parts, true)
    const w = await (await d.getFileHandle(name, { create: true })).createWritable()
    await w.write(c); await w.close()
  }
  async readBlob(p: string) {
    try { const { parts, name } = this.split(p); const d = await this.dir(parts, false); return (await (await d.getFileHandle(name)).getFile()) as Blob } catch { return null }
  }
  async writeBlob(p: string, b: Blob) {
    const { parts, name } = this.split(p); const d = await this.dir(parts, true)
    const w = await (await d.getFileHandle(name, { create: true })).createWritable()
    await w.write(b); await w.close()
  }
  async list(dir: string) {
    try { const d = await this.dir(dir.split('/'), false); const out: string[] = []; for await (const k of (d as any).keys()) out.push(k); return out } catch { return [] }
  }
  async remove(p: string) { try { const { parts, name } = this.split(p); await (await this.dir(parts, false)).removeEntry(name) } catch { /* già assente */ } }
  async removeDir(dir: string) { try { const { parts, name } = this.split(dir); await (await this.dir(parts, false)).removeEntry(name, { recursive: true }) } catch { /* già assente */ } }
  async listAll(dir: string) {
    const out: string[] = []
    const walk = async (h: any, base: string) => {
      for await (const [name, handle] of h.entries()) { if (handle.kind === 'directory') await walk(handle, `${base}/${name}`); else out.push(`${base}/${name}`) }
    }
    try { await walk(await this.dir(dir.split('/'), false), dir) } catch { /* cartella assente */ }
    return out
  }
}

let current: Store | null = null
let label = ''
export const store = (): Store => { if (!current) throw new Error('Nessuna cartella selezionata'); return current }
export const setStore = (s: Store | null, name = '') => { current = s; label = name } // usato anche dai test, con un archivio in memoria
export const setFolder = (root: any) => setStore(new FsStore(root), root.name)
export const folderName = () => label
export const hasFsApi = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window

// Fa scegliere la cartella dei dati e la ricorda: alla prossima apertura l'app la riapre da sola (il browser può richiedere di nuovo il permesso).
export async function chooseFolder() {
  const h = await (window as any).showDirectoryPicker({ mode: 'readwrite', id: 'dnd-manage' })
  await setHandle('root', h)
  setFolder(h)
  return h
}
