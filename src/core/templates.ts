import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useParams } from 'react-router-dom'
import type { Root } from './tree'
import { persist } from './saving'
import { beginSave, endSave } from './saveStatus'
import { store } from './storage'

// Modelli di scheda: un modello è un layout con un nome. Un elemento (es. un personaggio) può usarne uno al posto del layout predefinito.
// L'elenco dei nomi sta in <campagna>/templates.json, raggruppato per «famiglia» di schede (es. «character»); i layout stanno in
// <campagna>/layouts/<chiave>@<id modello>.json, accanto a quelli predefiniti. Le schede ricordano il modello nel campo «modello».
export interface Template { id: string; name: string }
export type Manifest = Record<string, Template[]>
export const templateKey = (layoutKey: string, id?: string) => (id ? `${layoutKey}@${id}` : layoutKey)

// Operazioni pure sull'elenco (testabili senza archivio).
export const addTemplate = (m: Manifest, group: string, t: Template): Manifest => ({ ...m, [group]: [...(m[group] ?? []), t] })
export const renameTemplate = (m: Manifest, group: string, id: string, name: string): Manifest => ({ ...m, [group]: (m[group] ?? []).map(t => (t.id === id ? { ...t, name } : t)) })
export const removeTemplate = (m: Manifest, group: string, id: string): Manifest => ({ ...m, [group]: (m[group] ?? []).filter(t => t.id !== id) })

// Elenco condiviso tra tutte le schermate: se lo crei da una scheda, la pagina «Nuova scheda» lo vede subito.
let cache: { cid: string; loaded: boolean; data: Manifest } = { cid: '', loaded: false, data: {} }
const subs = new Set<() => void>()
const emit = (next: typeof cache) => { cache = next; subs.forEach(f => f()) }
let loading = ''

async function load(cid: string) {
  if (loading === cid) return
  loading = cid
  let data: Manifest = {}
  try { const t = await store().read(`${cid}/templates.json`); if (t) { const d = JSON.parse(t); if (d && typeof d === 'object') data = d } } catch { /* file corrotto: elenco vuoto */ }
  if (loading === cid) emit({ cid, loaded: true, data })
}

async function save(cid: string, data: Manifest) {
  emit({ cid, loaded: true, data })
  beginSave()
  try { await persist(`${cid}/templates.json`, () => store().write(`${cid}/templates.json`, JSON.stringify(data, null, 2))); endSave() } catch (e) { endSave(e); throw e }
}

export function useTemplates(group: string | undefined) {
  const { cid = '' } = useParams()
  const snap = useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => cache)
  useEffect(() => { if (group && (snap.cid !== cid || !snap.loaded)) { if (snap.cid !== cid) emit({ cid, loaded: false, data: {} }); load(cid) } }, [cid, group])
  const mine = snap.cid === cid ? snap : { cid, loaded: false, data: {} as Manifest }
  const list = group ? mine.data[group] ?? [] : []

  // Crea un modello copiando i layout indicati (chiave del layout → sezioni) e restituisce il suo id.
  const create = useCallback(async (name: string, layouts: Record<string, Root[]>) => {
    if (!group) throw new Error('Questa scheda non supporta i modelli.')
    const id = Math.random().toString(36).slice(2, 8)
    for (const [key, roots] of Object.entries(layouts)) await store().write(`${cid}/layouts/${templateKey(key, id)}.json`, JSON.stringify({ version: 3, roots }, null, 2))
    await save(cid, addTemplate(cache.data, group, { id, name }))
    return id
  }, [cid, group])
  const rename = useCallback((id: string, name: string) => group ? save(cid, renameTemplate(cache.data, group, id, name)) : Promise.resolve(), [cid, group])
  const remove = useCallback(async (id: string) => {
    if (!group) return
    for (const n of await store().list(`${cid}/layouts`)) if (n.endsWith(`@${id}.json`)) await store().remove(`${cid}/layouts/${n}`)
    await save(cid, removeTemplate(cache.data, group, id))
  }, [cid, group])
  return { list, loaded: mine.loaded, create, rename, remove }
}
