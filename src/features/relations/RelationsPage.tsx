import { PointerEvent as RPE, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useEntities } from '../../core/useEntities'
import { Rel } from '../shared/Relations'
import { layoutGraph } from './graph'

const W = 900, H = 560

// Grafo delle relazioni tra personaggi e PNG. Le relazioni si inseriscono dal blocco «Relazioni» di ogni scheda; qui si vedono tutte insieme.
// I nodi si possono trascinare per sistemarli (la posizione non viene salvata); un clic apre la scheda.
export function RelationsPage() {
  const { cid = '' } = useParams()
  const nav = useNavigate()
  const chars = useEntities<any>('characters')
  const npcs = useEntities<any>('npcs')
  const [tipo, setTipo] = useState('')
  const [offs, setOffs] = useState<Record<string, { x: number; y: number }>>({})
  const [drag, setDrag] = useState<string | null>(null)
  const moved = useRef(false)
  const svg = useRef<SVGSVGElement>(null)

  const people = useMemo(() => [
    ...chars.items.map((e: any) => ({ id: e.id as string, name: e.name as string, kind: 'characters' as const, rel: (e.relazioni ?? []) as Rel[] })),
    ...npcs.items.map((e: any) => ({ id: e.id as string, name: e.name as string, kind: 'npcs' as const, rel: (e.relazioni ?? []) as Rel[] })),
  ], [chars.items, npcs.items])
  const byId = useMemo(() => new Map(people.map(p => [p.id, p])), [people])
  const tipi = useMemo(() => [...new Set(people.flatMap(p => p.rel.map(r => r.tipo.trim()).filter(Boolean)))].sort(), [people])

  // Una linea per coppia di persone (qualunque sia il verso), con i tipi uniti nell'etichetta.
  const pairs = useMemo(() => {
    const m = new Map<string, { a: string; b: string; tipi: Set<string> }>()
    for (const p of people) for (const r of p.rel) {
      if (!byId.has(r.id) || (tipo && r.tipo.trim() !== tipo)) continue
      const key = [p.id, r.id].sort().join('|')
      const e = m.get(key) ?? { a: p.id, b: r.id, tipi: new Set<string>() }
      if (r.tipo.trim()) e.tipi.add(r.tipo.trim())
      m.set(key, e)
    }
    return [...m.values()]
  }, [people, byId, tipo])
  const ids = useMemo(() => [...new Set(pairs.flatMap(e => [e.a, e.b]))], [pairs])
  const base = useMemo(() => layoutGraph(ids, pairs.map(e => [e.a, e.b] as [string, string]), W, H), [ids, pairs])
  const at = (id: string) => offs[id] ?? base.get(id)!

  const toSvg = (e: RPE<SVGSVGElement>) => { const r = svg.current!.getBoundingClientRect(); return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height } }
  const go = (id: string) => { const p = byId.get(id); if (p) nav(`/c/${cid}/${p.kind === 'characters' ? 'schede' : 'png'}?sel=${id}`) }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-5xl space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl text-brass">Relazioni</h1>
          <label className="flex items-center gap-1 text-sm">Mostra
            <select className="field w-auto" value={tipo} onChange={e => setTipo(e.target.value)}><option value="">Tutte</option>{tipi.map(t => <option key={t}>{t}</option>)}</select>
          </label>
          <span className="ml-auto flex items-center gap-3 text-xs opacity-80">
            <span><span className="mr-1 inline-block h-3 w-3 rounded-full" style={{ background: 'rgb(var(--c-brass))' }} />Personaggio</span>
            <span><span className="mr-1 inline-block h-3 w-3 rounded-full" style={{ background: 'rgb(var(--c-info))' }} />PNG / creatura</span>
          </span>
        </div>
        {!ids.length ? <p className="opacity-60">Nessuna relazione da mostrare: aggiungile dal blocco «Relazioni» di una scheda o di un PNG (nelle schede già salvate si inserisce da «Modifica layout»).</p> : (
          <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none rounded border border-line bg-panel" role="img" aria-label="Grafo delle relazioni"
            onPointerMove={e => { if (drag) { moved.current = true; setOffs(o => ({ ...o, [drag]: toSvg(e) })) } }} onPointerUp={() => setDrag(null)} onPointerLeave={() => setDrag(null)}>
            {pairs.map(e => {
              const a = at(e.a), b = at(e.b)
              return (
                <g key={e.a + e.b}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} style={{ stroke: 'rgb(var(--c-edge))' }} strokeWidth={2} />
                  {e.tipi.size > 0 && <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} textAnchor="middle" fontSize={12} style={{ fill: 'rgb(var(--c-paper))', stroke: 'rgb(var(--c-panel))' }} strokeWidth={3} paintOrder="stroke">{[...e.tipi].join(' · ')}</text>}
                </g>
              )
            })}
            {ids.map(id => {
              const p = byId.get(id)!, pt = at(id)
              return (
                <g key={id} transform={`translate(${pt.x} ${pt.y})`} style={{ cursor: 'grab' }}
                  onPointerDown={e => { e.preventDefault(); moved.current = false; setDrag(id) }} onClick={() => { if (!moved.current) go(id) }}>
                  <circle r={22} style={{ fill: p.kind === 'characters' ? 'rgb(var(--c-brass))' : 'rgb(var(--c-info))', stroke: 'rgb(var(--c-panel))' }} strokeWidth={3} />
                  <text y={40} textAnchor="middle" fontSize={14} style={{ fill: 'rgb(var(--c-paper))', stroke: 'rgb(var(--c-panel))' }} strokeWidth={3} paintOrder="stroke">{p.name}</text>
                </g>
              )
            })}
          </svg>
        )}
        {ids.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer opacity-80">Elenco testuale delle relazioni</summary>
            <ul className="mt-1 space-y-0.5">{pairs.map(e => <li key={e.a + e.b}>{byId.get(e.a)!.name} — {[...e.tipi].join(', ') || 'relazione senza tipo'} — {byId.get(e.b)!.name}</li>)}</ul>
          </details>
        )}
      </div>
    </div>
  )
}
