import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CONDITIONS } from '../../core/conditions'
import { Kind } from '../../core/repo'
import { useDoc } from '../../core/useDoc'
import { useEntities } from '../../core/useEntities'
import { roll } from '../dice/roll'

interface Fighter { id: string; name: string; init: number; mod: number; pf: number; max: number; ca: number; cond: string[]; ref?: { kind: Kind; id: string } }
interface Combat { round: number; active: string | null; fighters: Fighter[] }
const EMPTY: Combat = { round: 1, active: null, fighters: [] }
const modOf = (score: number) => Math.floor((score - 10) / 2)
const initRoll = (mod: number) => roll(`1d20${mod >= 0 ? '+' : ''}${mod}`).total
const num = (v: string) => (Number.isFinite(+v) ? +v : 0)

// Tracciatore di combattimento: iniziativa, turni e round, PF con danni/cure rapidi, condizioni. Lo stato è un file della campagna (combat/current.json).
// I PF del tracciatore sono una copia di lavoro: la scheda originale non viene modificata.
export function CombatPage() {
  const { cid = '' } = useParams()
  const nav = useNavigate()
  const [cb, save] = useDoc<Combat>('combat/current.json', EMPTY)
  const chars = useEntities<any>('characters')
  const npcs = useEntities<any>('npcs')
  const [amount, setAmount] = useState(1)
  const [qty, setQty] = useState(1)
  const [pick, setPick] = useState('')
  const [manual, setManual] = useState('')

  const order = [...cb.fighters].sort((a, b) => b.init - a.init || b.mod - a.mod || a.name.localeCompare(b.name))
  const setFighters = (fighters: Fighter[], extra: Partial<Combat> = {}) => save({ ...cb, ...extra, fighters })
  const patch = (id: string, p: Partial<Fighter>) => setFighters(cb.fighters.map(f => (f.id === id ? { ...f, ...p } : f)))
  const hit = (f: Fighter, d: number) => patch(f.id, { pf: Math.max(0, Math.min(f.max, f.pf + d)) })
  const remove = (id: string) => setFighters(cb.fighters.filter(f => f.id !== id), cb.active === id ? { active: null } : {})

  const addFrom = (kind: Kind, e: any) => {
    const already = cb.fighters.filter(f => f.ref?.id === e.id).length
    const mod = modOf(e.abilita?.des ?? 10)
    const made: Fighter[] = Array.from({ length: qty }, (_, i) => ({
      id: crypto.randomUUID(), name: already + qty > 1 ? `${e.name} ${already + i + 1}` : e.name, init: initRoll(mod), mod,
      pf: e.pf?.attuali ?? e.pf?.max ?? 10, max: e.pf?.max ?? 10, ca: e.ca ?? 10, cond: [], ref: { kind, id: e.id },
    }))
    setFighters([...cb.fighters, ...made])
  }
  const addPicked = () => {
    const [kind, id] = pick.split(':')
    const e = (kind === 'characters' ? chars.items : npcs.items).find((x: any) => x.id === id)
    if (e) { addFrom(kind as Kind, e); setPick('') }
  }
  const addManual = () => {
    if (!manual.trim()) return
    setFighters([...cb.fighters, { id: crypto.randomUUID(), name: manual.trim(), init: initRoll(0), mod: 0, pf: 10, max: 10, ca: 10, cond: [] }])
    setManual('')
  }
  const rollAll = () => save({ ...cb, round: 1, active: null, fighters: cb.fighters.map(f => ({ ...f, init: initRoll(f.mod) })) })
  const next = () => {
    if (!order.length) return
    const i = order.findIndex(f => f.id === cb.active), j = (i + 1) % order.length
    save({ ...cb, active: order[j].id, round: i >= 0 && j === 0 ? cb.round + 1 : cb.round })
  }
  const open = (r: NonNullable<Fighter['ref']>) => nav(`/c/${cid}/${r.kind === 'characters' ? 'schede' : 'png'}?sel=${r.id}`)

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-5xl space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="mr-2 font-display text-2xl text-brass">Round {cb.round}</h1>
          <button className="btn border-brass text-brass disabled:opacity-40" disabled={!order.length} onClick={next}>▶ {cb.active ? 'Turno successivo' : 'Inizia'}</button>
          <button className="btn disabled:opacity-40" disabled={!order.length} onClick={rollAll} title="Ritira l'iniziativa di tutti e riparte dal round 1">⚄ Tira iniziativa per tutti</button>
          <label className="ml-auto flex items-center gap-1 text-sm">Danni / cure
            <input className="field w-16 px-1 text-center" type="number" min={1} value={amount} onChange={e => setAmount(Math.max(1, num(e.target.value)))} aria-label="Quantità di danni o cure" />
          </label>
          <button className="btn disabled:opacity-40" disabled={!order.length} onClick={() => confirm('Terminare il combattimento e svuotare l\'elenco?') && save(EMPTY)}>Nuovo combattimento</button>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded border border-line bg-panel p-2 text-sm">
          <select className="field w-64" value={pick} onChange={e => setPick(e.target.value)} aria-label="Aggiungi dall'archivio">
            <option value="">+ Dall'archivio…</option>
            {chars.items.length > 0 && <optgroup label="Personaggi">{chars.items.map((e: any) => <option key={e.id} value={`characters:${e.id}`}>{e.name}</option>)}</optgroup>}
            {npcs.items.length > 0 && <optgroup label="PNG e creature">{npcs.items.map((e: any) => <option key={e.id} value={`npcs:${e.id}`}>{e.name}</option>)}</optgroup>}
          </select>
          <label className="flex items-center gap-1">×<input className="field w-14 px-1 text-center" type="number" min={1} max={30} value={qty} onChange={e => setQty(Math.min(30, Math.max(1, num(e.target.value))))} aria-label="Quanti" /></label>
          <button className="btn disabled:opacity-40" disabled={!pick} onClick={addPicked}>Aggiungi</button>
          <span className="mx-2 opacity-40">|</span>
          <input className="field w-48" placeholder="Nome (manuale)" value={manual} onChange={e => setManual(e.target.value)} onKeyDown={e => e.key === 'Enter' && addManual()} />
          <button className="btn" onClick={addManual}>Aggiungi</button>
        </div>

        {!order.length && <p className="opacity-60">Nessun combattente: aggiungine dall'archivio (l'iniziativa viene tirata da sola) o a mano.</p>}
        <ul className="space-y-2">
          {order.map(f => {
            const ratio = f.max ? Math.max(0, Math.min(1, f.pf / f.max)) : 0
            return (
              <li key={f.id} className={`rounded border p-2 ${f.id === cb.active ? 'border-brass bg-panel' : 'border-line'} ${f.pf === 0 ? 'opacity-60' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-4 text-brass" aria-hidden>{f.id === cb.active ? '▶' : ''}</span>
                  <input className="field w-44 font-display" value={f.name} onChange={e => patch(f.id, { name: e.target.value })} aria-label="Nome" />
                  <label className="flex items-center gap-1 text-xs">Iniz.<input className="field w-14 px-1 text-center" type="number" value={f.init} onChange={e => patch(f.id, { init: num(e.target.value) })} /></label>
                  <button className="btn px-1.5 py-0" title="Ritira l'iniziativa" aria-label="Ritira l'iniziativa" onClick={() => patch(f.id, { init: initRoll(f.mod) })}>⚄</button>
                  <label className="flex items-center gap-1 text-xs">CA<input className="field w-14 px-1 text-center" type="number" value={f.ca} onChange={e => patch(f.id, { ca: num(e.target.value) })} /></label>
                  <label className="flex items-center gap-1 text-xs">PF
                    <input className="field w-16 px-1 text-center" type="number" value={f.pf} onChange={e => patch(f.id, { pf: Math.max(0, num(e.target.value)) })} aria-label="PF attuali" />/
                    <input className="field w-16 px-1 text-center" type="number" value={f.max} onChange={e => patch(f.id, { max: Math.max(1, num(e.target.value)) })} aria-label="PF massimi" />
                  </label>
                  <span className="ml-auto flex items-center gap-1">
                    <button className="btn px-2" onClick={() => hit(f, -amount)}>− {amount}</button>
                    <button className="btn px-2" onClick={() => hit(f, amount)}>+ {amount}</button>
                    {f.ref && <button className="btn px-1.5 py-0" title="Apri la scheda" aria-label="Apri la scheda" onClick={() => open(f.ref!)}>↗</button>}
                    <button className="btn px-1.5 py-0" title="Rimuovi dal combattimento" aria-label="Rimuovi dal combattimento" onClick={() => remove(f.id)}>✕</button>
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <div className="h-2 w-40 overflow-hidden rounded bg-ink" role="img" aria-label={`PF ${f.pf} su ${f.max}`}>
                    <div className={`h-full ${ratio > 0.5 ? 'bg-green-600' : ratio > 0.25 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${ratio * 100}%` }} />
                  </div>
                  {f.cond.map(c => (
                    <span key={c} className="inline-flex items-center rounded border border-line text-xs">
                      <span className="px-1.5">{c}</span>
                      <button className="px-1 opacity-60 hover:opacity-100" aria-label={`Togli ${c}`} onClick={() => patch(f.id, { cond: f.cond.filter(x => x !== c) })}>✕</button>
                    </span>
                  ))}
                  <select className="field w-auto px-1 text-xs" value="" aria-label="Aggiungi condizione" onChange={e => e.target.value && patch(f.id, { cond: [...f.cond, e.target.value] })}>
                    <option value="">+ Condizione</option>
                    {CONDITIONS.filter(c => !f.cond.includes(c)).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
