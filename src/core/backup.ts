import { tracked } from './saveStatus'
import { Campaign, repo } from './repo'
import { saveImage } from './images'
import { unusedImages } from './orphans'
import { store } from './storage'

// Backup: una campagna = un solo file JSON con tutti i suoi file (schede, note, oggetti, PNG, mappe, sessioni, combattimento, layout).
// Le immagini (cartella images/) sono file binari: nel backup diventano testo base64 e tornano file all'importazione.
const FORMAT = 'dnd-manage-campaign'
export const safe = (s: string) => s.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60) || 'file'
const isBin = (rel: string) => rel.startsWith('images/')
const toDataUrl = async (b: Blob) => {
  const u8 = new Uint8Array(await b.arrayBuffer())
  let s = ''
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000))
  return `data:${b.type || 'application/octet-stream'};base64,${btoa(s)}`
}

// Immagini usate da una scheda (galleria + ritratto), per esportarle insieme e per eliminarle insieme alla scheda.
export const imageNames = (e: any): string[] =>
  [...(Array.isArray(e?.immagini) ? e.immagini.map((i: any) => i?.src) : []), e?.ritratto].filter((n): n is string => typeof n === 'string' && !!n)
export async function bundleImages(cid: string, names: string[]) {
  const out: Record<string, string> = {}
  for (const n of names) { const b = await store().readBlob(`${cid}/images/${n}`); if (b) out[n] = await toDataUrl(b) }
  return out
}
// Salva le immagini incorporate come file nuovi e restituisce la mappa vecchio nome → nuovo nome.
export async function restoreImages(cid: string, images: Record<string, string>) {
  const map: Record<string, string> = {}
  for (const [n, url] of Object.entries(images)) if (typeof url === 'string' && url.startsWith('data:')) map[n] = await saveImage(cid, await (await fetch(url)).blob())
  return map
}

export function download(name: string, text: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// Testo JSON del backup (separato dal download per poterlo verificare).
export async function buildExport(c: Campaign): Promise<string> {
  const files: Record<string, string> = {}
  const binary: string[] = []
  for (const p of await store().listAll(c.id)) {
    const rel = p.slice(c.id.length + 1)
    if (rel.startsWith('manual-files/')) continue // i PDF dei manuali (e il loro testo indicizzato) restano sul tuo computer: sono tuoi e pesanti, non vanno nei backup
    if (isBin(rel)) { const b = await store().readBlob(p); if (b) { files[rel] = await toDataUrl(b); binary.push(rel) } }
    else { const t = await store().read(p); if (t !== null) files[rel] = t }
  }
  return JSON.stringify({ format: FORMAT, version: 2, exportedAt: new Date().toISOString(), campaign: { name: c.name }, binary, files })
}
export async function exportCampaign(c: Campaign) { download(`${safe(c.name)}.dnd.json`, await buildExport(c)) }

// L'importazione crea sempre una campagna nuova (nuovo id): non sovrascrive mai niente di esistente. Legge anche i backup della 0.7.
export async function importCampaign(file: File): Promise<Campaign> {
  let d: any
  try { d = JSON.parse(await file.text()) } catch { throw new Error('Il file non è un JSON valido.') }
  if (d?.format !== FORMAT || typeof d.files !== 'object' || !d.files) throw new Error('Il file non è un backup di D&D manage.')
  const list = await repo.campaigns()
  const id = crypto.randomUUID()
  const base = String(d.campaign?.name ?? 'Campagna importata')
  const c: Campaign = { id, name: list.some(x => x.name === base) ? `${base} (importata)` : base }
  const bin = new Set<string>(Array.isArray(d.binary) ? d.binary : [])
  try { await tracked((async () => {
    for (const [rel, text] of Object.entries(d.files)) {
      if (typeof text !== 'string' || /(^|\/)\.\.(\/|$)|^\//.test(rel)) continue
      if (bin.has(rel)) { if (text.startsWith('data:')) await store().writeBlob(`${id}/${rel}`, await (await fetch(text)).blob()) }
      else await store().write(`${id}/${rel}`, text)
    }
    await repo.saveCampaigns([...list, c])
  })()) } catch (e) { await store().removeDir(id).catch(() => {}); throw e } // niente cartelle a metà se l'importazione fallisce
  return c
}

// Immagini in images/ che non compaiono in nessun file di testo della campagna (schede, note, mappe, sessioni…). Non elimina niente: restituisce l'elenco.
export async function scanOrphanImages(cid: string) {
  const prefix = `${cid}/images/`
  const all = await store().listAll(cid)
  const names = all.filter(p => p.startsWith(prefix)).map(p => p.slice(prefix.length))
  const texts: string[] = []
  for (const p of all) {
    if (p.startsWith(prefix) || p.startsWith(`${cid}/manual-files/`) || p.endsWith('.img')) continue
    const t = await store().read(p)
    if (t) texts.push(t)
  }
  const orphans = unusedImages(names, texts)
  let bytes = 0
  for (const n of orphans) bytes += (await store().readBlob(prefix + n))?.size ?? 0
  return { orphans, bytes }
}
