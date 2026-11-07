import { store } from './storage'

export type Kind = 'characters' | 'npcs' | 'items' | 'notes' | 'maps' | 'master' | 'sessions' | 'manuals'
export interface Entity { id: string; name: string; schemaVersion: number; updatedAt: number }
export interface Campaign { id: string; name: string }

const json = <T,>(t: string | null, d: T): T => { try { return t ? JSON.parse(t) : d } catch { return d } }

export const repo = {
  async campaigns() { return json<Campaign[]>(await store().read('index.json'), []) },
  async saveCampaigns(c: Campaign[]) { await store().write('index.json', JSON.stringify(c, null, 2)) },
  async list<T extends Entity>(cid: string, kind: Kind) {
    const out: T[] = []
    for (const n of await store().list(`${cid}/${kind}`)) {
      if (!n.endsWith('.json')) continue
      const e = json<T | null>(await store().read(`${cid}/${kind}/${n}`), null)
      if (e) out.push(e)
    }
    return out.sort((a, b) => a.name.localeCompare(b.name))
  },
  save: (cid: string, kind: Kind, e: Entity) =>
    store().write(`${cid}/${kind}/${e.id}.json`, JSON.stringify({ ...e, updatedAt: Date.now() }, null, 2)),
  remove: (cid: string, kind: Kind, id: string) => store().remove(`${cid}/${kind}/${id}.json`),
}
