import { currentVersion, isFromFuture, migrateEntity } from './schema'
import { store } from './storage'

export type Kind = 'characters' | 'npcs' | 'items' | 'notes' | 'maps' | 'master' | 'sessions' | 'manuals'
export interface Entity { id: string; name: string; schemaVersion: number; updatedAt: number }
export interface Campaign { id: string; name: string }

const json = <T,>(t: string | null, d: T): T => { try { return t ? JSON.parse(t) : d } catch { return d } }

export interface TrashItem { kind: Kind; entity: Entity; deletedAt: number }
const TRASH_KINDS: Kind[] = ['characters', 'npcs', 'items', 'notes', 'maps', 'sessions', 'manuals']

export const repo = {
  async campaigns() { return json<Campaign[]>(await store().read('index.json'), []) },
  async saveCampaigns(c: Campaign[]) { await store().write('index.json', JSON.stringify(c, null, 2)) },
  async list<T extends Entity>(cid: string, kind: Kind) {
    const out: T[] = []
    for (const n of await store().list(`${cid}/${kind}`)) {
      if (!n.endsWith('.json')) continue
      const e = json<T | null>(await store().read(`${cid}/${kind}/${n}`), null)
      if (e) out.push(migrateEntity<T>(kind, e)) // i file di versioni precedenti si aggiornano in memoria; il file cambia solo al prossimo salvataggio
    }
    return out.sort((a, b) => a.name.localeCompare(b.name))
  },
  save(cid: string, kind: Kind, e: Entity) {
    if (isFromFuture(kind, e)) return Promise.reject(new Error('Questo elemento è stato salvato da una versione più recente di D&D manage: aggiorna l\'app prima di modificarlo, così non si perdono dati.'))
    return store().write(`${cid}/${kind}/${e.id}.json`, JSON.stringify({ ...e, schemaVersion: currentVersion(kind), updatedAt: Date.now() }, null, 2))
  },
  // Eliminare = spostare nel cestino (<campagna>/trash/<tipo>/<id>.json): si può ripristinare finché non lo si svuota. Le immagini restano dove sono.
  async remove(cid: string, kind: Kind, id: string) {
    const t = await store().read(`${cid}/${kind}/${id}.json`)
    const e = json<Entity | null>(t, null)
    if (e) await store().write(`${cid}/trash/${kind}/${id}.json`, JSON.stringify({ kind, deletedAt: Date.now(), entity: e }, null, 2))
    await store().remove(`${cid}/${kind}/${id}.json`)
  },
  removeHard: (cid: string, kind: Kind, id: string) => store().remove(`${cid}/${kind}/${id}.json`),
  trash: {
    async list(cid: string): Promise<TrashItem[]> {
      const out: TrashItem[] = []
      for (const kind of TRASH_KINDS) for (const n of await store().list(`${cid}/trash/${kind}`)) {
        const w = json<{ entity?: Entity; deletedAt?: number } | null>(await store().read(`${cid}/trash/${kind}/${n}`), null)
        if (w?.entity?.id) out.push({ kind, entity: w.entity, deletedAt: w.deletedAt ?? 0 })
      }
      return out.sort((a, b) => b.deletedAt - a.deletedAt)
    },
    async restore(cid: string, kind: Kind, id: string) {
      const w = json<{ entity?: Entity } | null>(await store().read(`${cid}/trash/${kind}/${id}.json`), null)
      if (!w?.entity) throw new Error('Elemento non trovato nel cestino.')
      if (await store().read(`${cid}/${kind}/${id}.json`)) throw new Error('Esiste già un elemento con lo stesso identificativo.')
      await store().write(`${cid}/${kind}/${id}.json`, JSON.stringify(w.entity, null, 2))
      await store().remove(`${cid}/trash/${kind}/${id}.json`)
    },
    purge: (cid: string, kind: Kind, id: string) => store().remove(`${cid}/trash/${kind}/${id}.json`),
    empty: (cid: string) => store().removeDir(`${cid}/trash`),
  },
}
