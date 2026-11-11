import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Entity, Kind, repo } from './repo'
import { currentVersion } from './schema'
import { beginSave, endSave, tracked } from './saveStatus'
import { persist } from './saving'
import { invalidatePool } from './pool'

// CRUD generico con salvataggio ritardato: riusato da schede, note, oggetti, PNG, mappe. Ogni salvataggio in attesa è tracciato dall'indicatore.
export function useEntities<T extends Entity>(kind: Kind) {
  const { cid = '' } = useParams()
  const [items, setItems] = useState<T[]>([])
  const [loaded, setLoaded] = useState(false)
  const timers = useRef(new Map<string, number>())

  useEffect(() => { setLoaded(false); repo.list<T>(cid, kind).then(l => { setItems(l); setLoaded(true) }) }, [cid, kind])

  const update = useCallback((e: T) => {
    setItems(l => l.map(x => (x.id === e.id ? e : x)))
    const t = timers.current.get(e.id)
    if (t) window.clearTimeout(t); else beginSave()
    timers.current.set(e.id, window.setTimeout(() => {
      timers.current.delete(e.id)
      persist(`${cid}/${kind}/${e.id}`, () => repo.save(cid, kind, e)).then(() => { invalidatePool(cid, kind); endSave() }, err => endSave(err)) // se fallisce, riprova da sola e poi resta nel pulsante «Riprova»
    }, 500))
  }, [cid, kind])

  const create = async (init: Omit<T, keyof Entity> & { name: string }) => {
    const e = { ...init, id: crypto.randomUUID(), schemaVersion: currentVersion(kind), updatedAt: Date.now() } as unknown as T
    await tracked(repo.save(cid, kind, e)); invalidatePool(cid, kind); setItems(l => [...l, e]); return e
  }
  // hard: elimina davvero (senza passare dal cestino): serve a chi ha file propri da togliere insieme, come i manuali.
  const remove = async (id: string, opts: { hard?: boolean } = {}) => {
    const t = timers.current.get(id)
    if (t) { window.clearTimeout(t); timers.current.delete(id); endSave() } // un salvataggio in attesa non deve ricreare il file appena eliminato
    await tracked(opts.hard ? repo.removeHard(cid, kind, id) : repo.remove(cid, kind, id)); invalidatePool(cid, kind); setItems(l => l.filter(x => x.id !== id))
  }
  return { items, update, create, remove, loaded }
}
