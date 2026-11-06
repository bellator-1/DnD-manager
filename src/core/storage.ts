// Unico punto che conosce DOVE vivono i file. Il resto dell'app usa solo questa interfaccia.
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

class LocalStore implements Store {
  private k = (p: string) => 'dnd:' + p
  async read(p: string) { return localStorage.getItem(this.k(p)) }
  async write(p: string, c: string) { localStorage.setItem(this.k(p), c) }
  async list(dir: string) {
    const pre = this.k(dir + '/')
    return Object.keys(localStorage).filter(k => k.startsWith(pre)).map(k => k.slice(pre.length)).filter(n => !n.includes('/'))
  }
  async remove(p: string) { localStorage.removeItem(this.k(p)) }
  async removeDir(dir: string) { const pre = this.k(dir + '/'); Object.keys(localStorage).filter(k => k.startsWith(pre)).forEach(k => localStorage.removeItem(k)) }
  async readBlob(p: string) { const t = localStorage.getItem(this.k(p)); return t ? (await fetch(t)).blob() : null }
  async writeBlob(p: string, b: Blob) {
    const t = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = () => rej(r.error); r.readAsDataURL(b) })
    localStorage.setItem(this.k(p), t) // nel browser le immagini restano testo (limite ~5 MB): per file veri serve la cartella su disco
  }
  async listAll(dir: string) { const pre = this.k(dir + '/'); return Object.keys(localStorage).filter(k => k.startsWith(pre)).map(k => k.slice(4)) }
}

// Cartella reale su disco (Chrome/Edge): File System Access API.
class FsStore implements Store {
  constructor(private root: any) {}
  private async dir(parts: string[], create: boolean) {
    let d = this.root
    for (const s of parts) d = await d.getDirectoryHandle(s, { create })
    return d
  }
  private split(p: string) { const parts = p.split('/'); return { parts, name: parts.pop()! } }
  async read(p: string) {
    try { const { parts, name } = this.split(p); const d = await this.dir(parts, false)
      return await (await (await d.getFileHandle(name)).getFile()).text() } catch { return null }
  }
  async write(p: string, c: string) {
    const { parts, name } = this.split(p); const d = await this.dir(parts, true)
    const w = await (await d.getFileHandle(name, { create: true })).createWritable()
    await w.write(c); await w.close()
  }
  async list(dir: string) {
    try { const d = await this.dir(dir.split('/'), false); const out: string[] = []
      for await (const k of (d as any).keys()) out.push(k); return out } catch { return [] }
  }
  async remove(p: string) { try { const { parts, name } = this.split(p); await (await this.dir(parts, false)).removeEntry(name) } catch {} }
  async removeDir(dir: string) { try { await this.root.removeEntry(dir, { recursive: true }) } catch { /* già assente */ } }
  async readBlob(p: string) {
    try { const { parts, name } = this.split(p); const d = await this.dir(parts, false); return await (await d.getFileHandle(name)).getFile() as Blob } catch { return null }
  }
  async writeBlob(p: string, b: Blob) {
    const { parts, name } = this.split(p); const d = await this.dir(parts, true)
    const w = await (await d.getFileHandle(name, { create: true })).createWritable()
    await w.write(b); await w.close()
  }
  async listAll(dir: string) {
    const out: string[] = []
    const walk = async (h: any, base: string) => {
      for await (const [name, handle] of h.entries()) { if (handle.kind === 'directory') await walk(handle, `${base}/${name}`); else out.push(`${base}/${name}`) }
    }
    try { await walk(await this.dir(dir.split('/'), false), dir) } catch { /* cartella assente */ }
    return out
  }
}

let current: Store = new LocalStore()
export const store = () => current
export const hasFsApi = () => 'showDirectoryPicker' in window
export async function pickFolder() {
  current = new FsStore(await (window as any).showDirectoryPicker({ mode: 'readwrite' }))
}
