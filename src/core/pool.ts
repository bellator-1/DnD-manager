import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Entity, Kind, repo } from './repo'

// Elenco di tutti gli elementi di un tipo (es. gli oggetti), letto una volta e condiviso tra i blocchi della scheda che ne hanno bisogno.
// Si rilegge quando passano pochi secondi o quando qualcosa di quel tipo cambia (useEntities chiama invalidatePool).
const TTL = 4000
const cache = new Map<string, { at: number; p: Promise<Entity[]> }>()
export const invalidatePool = (cid: string, kind: Kind) => { cache.delete(`${cid}/${kind}`) }
export function getPool<T extends Entity = Entity>(cid: string, kind: Kind): Promise<T[]> {
  const k = `${cid}/${kind}`, hit = cache.get(k)
  if (hit && Date.now() - hit.at < TTL) return hit.p as Promise<T[]>
  const p = repo.list<T>(cid, kind)
  cache.set(k, { at: Date.now(), p })
  p.catch(() => cache.delete(k))
  return p
}

export function usePool<T extends Entity = Entity>(kind: Kind): Record<string, T> {
  const { cid = '' } = useParams()
  const [byId, setById] = useState<Record<string, T>>({})
  useEffect(() => {
    let alive = true
    getPool<T>(cid, kind).then(l => { if (alive) setById(Object.fromEntries(l.map(e => [e.id, e]))) }).catch(() => {})
    return () => { alive = false }
  }, [cid, kind])
  return byId
}
