import { useEffect, useRef } from 'react'
import { SheetView } from '../../core/SheetView'
import { useEntities } from '../../core/useEntities'
import { MasterDoc, newMaster } from './model'
import { MASTER_KIND } from './sheet'

export function MasterPage() {
  const { items, update, create, loaded } = useEntities<MasterDoc>('master')
  const made = useRef(false)
  useEffect(() => { if (loaded && !items.length && !made.current) { made.current = true; create(newMaster()) } }, [loaded, items.length])
  const doc = items[0]
  return (
    <div className="h-full overflow-y-auto p-4">
      {doc ? <SheetView layoutKey="master" kind={MASTER_KIND} data={doc} onChange={update} /> : <p className="opacity-60">Preparo lo spazio del master…</p>}
    </div>
  )
}
