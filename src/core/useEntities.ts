import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Entity, Kind, repo } from './repo'
import { beginSave, endSave, tracked } from './saveStatus'

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
      repo.save(cid, kind, e).then(() => endSave(), err => endSave(err))
    }, 500))
  }, [cid, kind])

  const create = async (init: Omit<T, keyof Entity> & { name: string }) => {
    const e = { ...init, id: crypto.randomUUID(), schemaVersion: 1, updatedAt: Date.now() } as unknown as T
    await tracked(repo.save(cid, kind, e)); setItems(l => [...l, e]); return e
  }
  const remove = async (id: string) => { await tracked(repo.remove(cid, kind, id)); setItems(l => l.filter(x => x.id !== id)) }
  return { items, update, create, remove, loaded }
}
