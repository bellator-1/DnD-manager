import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { repo } from '../../core/repo'
import type { BlockDef, Setter } from '../../core/SheetView'

// Relazioni tra personaggi e PNG («Alleato», «Nemico», «Famiglia»…): il tipo è libero, i suggerimenti sono solo un aiuto.
export interface Rel { id: string; tipo: string; nota?: string }
export const REL_PRESETS = ['Alleato', 'Amico', 'Famiglia', 'Amore', 'Mentore', 'Allievo', 'Rivale', 'Nemico', 'Datore di lavoro', 'Sottoposto', 'Debitore', 'Sconosciuto']
interface Person { id: string; name: string; kind: 'characters' | 'npcs'; rel: Rel[] }

function RelationsView({ c, set }: { c: any; set: Setter }) {
  const { cid = '' } = useParams()
  const nav = useNavigate()
  const [people, setPeople] = useState<Person[]>([])
  useEffect(() => {
    let on = true
    Promise.all([repo.list<any>(cid, 'characters'), repo.list<any>(cid, 'npcs')]).then(([a, b]) => on && setPeople([
      ...a.map(e => ({ id: e.id, name: e.name, kind: 'characters' as const, rel: e.relazioni ?? [] })),
      ...b.map(e => ({ id: e.id, name: e.name, kind: 'npcs' as const, rel: e.relazioni ?? [] })),
    ]))
    return () => { on = false }
  }, [cid, c.id])
  const mine: Rel[] = c.relazioni ?? []
  const by = new Map<string, Person>(people.map(p => [p.id, p] as [string, Person]))
  const go = (p: Person) => nav(`/c/${cid}/${p.kind === 'characters' ? 'schede' : 'png'}?sel=${p.id}`)
  const patch = (i: number, x: Partial<Rel>) => set('relazioni', mine.map((r, k) => (k === i ? { ...r, ...x } : r)))
  const incoming = people.filter(p => p.id !== c.id && p.rel.some(r => r.id === c.id))
  const free = people.filter(p => p.id !== c.id && !mine.some(r => r.id === p.id))
  return (
    <div className="space-y-2 text-sm">
      {mine.map((r, i) => {
        const p = by.get(r.id)
        return (
          <div key={r.id} className="flex flex-wrap items-center gap-1">
            {p ? <button className="font-display text-brass hover:underline" onClick={() => go(p)}>{p.name}</button> : <span className="opacity-60">(non trovato)</span>}
            <input className="field w-36 px-1" list="rel-tipi" placeholder="Tipo" aria-label="Tipo di relazione" value={r.tipo} onChange={e => patch(i, { tipo: e.target.value })} />
            <input className="field min-w-0 flex-1 px-1" placeholder="Nota" aria-label="Nota sulla relazione" value={r.nota ?? ''} onChange={e => patch(i, { nota: e.target.value })} />
            <button className="btn px-1.5 py-0" title="Rimuovi" aria-label="Rimuovi la relazione" onClick={() => set('relazioni', mine.filter((_, k) => k !== i))}>✕</button>
          </div>
        )
      })}
      {!mine.length && <p className="opacity-60">Nessuna relazione.</p>}
      <datalist id="rel-tipi">{REL_PRESETS.map(x => <option key={x} value={x} />)}</datalist>
      <select className="field" value="" aria-label="Aggiungi una relazione" onChange={e => e.target.value && set('relazioni', [...mine, { id: e.target.value, tipo: '' }])}>
        <option value="">+ Aggiungi una relazione…</option>
        {free.map(p => <option key={p.id} value={p.id}>{p.name || '(senza nome)'} ({p.kind === 'characters' ? 'personaggio' : 'PNG'})</option>)}
      </select>
      {incoming.length > 0 && (
        <div>
          <div className="mb-1 text-xs opacity-60">Indicato da</div>
          <div className="flex flex-wrap gap-1">{incoming.map(p => (
            <button key={p.id} className="rounded border border-line px-2 py-0.5 hover:text-brass" onClick={() => go(p)}>{p.name} <span className="text-xs opacity-60">{p.rel.find(r => r.id === c.id)?.tipo}</span></button>
          ))}</div>
        </div>
      )}
    </div>
  )
}
export const relationsBlock: BlockDef = { label: 'Relazioni', C: ({ c, set }) => <RelationsView c={c} set={set} /> }
