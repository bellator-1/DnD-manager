import type { Store } from './storage'

// Passaggio dal vecchio salvataggio nel browser alla cartella: copia i file senza sovrascrivere nulla di esistente. L'elenco delle campagne si unisce.
export type Entry = [string, string]
const PREFIX = 'dnd:'
export const browserEntryCount = () => Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).length
export const browserEntries = (): Entry[] => Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).map(k => [k.slice(PREFIX.length), localStorage.getItem(k) ?? ''] as Entry)
export const clearBrowserData = () => { for (const k of Object.keys(localStorage).filter(k => k.startsWith(PREFIX))) localStorage.removeItem(k) }

const asArray = (t: string | null): any[] => { try { const a = JSON.parse(t ?? '[]'); return Array.isArray(a) ? a : [] } catch { return [] } }

export async function migrateEntries(entries: Entry[], target: Store) {
  let copied = 0, skipped = 0
  for (const [path, v] of entries) {
    if (path === 'index.json') {
      const have = asArray(await target.read(path))
      await target.write(path, JSON.stringify([...have, ...asArray(v).filter(x => !have.some(y => y.id === x.id))], null, 2))
      copied++; continue
    }
    const isBlob = v.startsWith('data:') && !path.endsWith('.img') // nel browser le immagini erano testo (data URL)
    const exists = isBlob ? (await target.readBlob(path)) !== null : (await target.read(path)) !== null
    if (exists) { skipped++; continue }
    if (isBlob) await target.writeBlob(path, await (await fetch(v)).blob())
    else await target.write(path, v)
    copied++
  }
  return { copied, skipped }
}
export const migrateFromBrowser = (target: Store) => migrateEntries(browserEntries(), target)
