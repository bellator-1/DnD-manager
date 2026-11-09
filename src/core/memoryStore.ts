import type { Store } from './storage'

// Archivio in memoria con la stessa interfaccia della cartella su disco: serve ai test (e a chi vuole provare le funzioni senza toccare file veri).
export class MemoryStore implements Store {
  files = new Map<string, string | Blob>()
  async read(p: string) { const v = this.files.get(p); return typeof v === 'string' ? v : null }
  async write(p: string, c: string) { this.files.set(p, c) }
  async readBlob(p: string) { const v = this.files.get(p); return v === undefined ? null : typeof v === 'string' ? new Blob([v]) : v }
  async writeBlob(p: string, b: Blob) { this.files.set(p, b) }
  async list(dir: string) {
    const pre = dir + '/', out = new Set<string>()
    for (const k of this.files.keys()) if (k.startsWith(pre)) out.add(k.slice(pre.length).split('/')[0])
    return [...out]
  }
  async remove(p: string) { this.files.delete(p) }
  async removeDir(dir: string) { for (const k of [...this.files.keys()]) if (k.startsWith(dir + '/')) this.files.delete(k) }
  async listAll(dir: string) { return [...this.files.keys()].filter(k => k.startsWith(dir + '/')).sort() }
  keys() { return [...this.files.keys()].sort() }
}
