import { useState } from 'react'
import { CONDITIONS } from '../../core/conditions'
import type { Cfg } from '../../core/layouts'
import { NumInput } from '../../core/NumInput'
import type { BlockDef, Setter } from '../../core/SheetView'
import { roll } from '../dice/roll'
import { Character, mod } from './model'

type P = { c: Character; set: Setter; cfg: Cfg; patch: (f: (d: any) => any) => void }

// «Modalità gioco»: azioni rapide, tutte facoltative. Ogni valore resta modificabile a mano e nulla scatta da solo.

// Danni e cure rapidi: i PF temporanei assorbono per primi i danni.
const PlayHp = ({ c, set, patch }: P) => {
  const [amount, setAmount] = useState(1)
  const pf = c.pf ?? { max: 1, attuali: 1, temp: 0 }
  const hit = (d: number) => patch(x => {
    const p = x.pf ?? pf
    let temp = p.temp ?? 0, cur = p.attuali ?? 0
    if (d < 0) { const soak = Math.min(temp, -d); temp -= soak; cur = Math.max(0, cur + d + soak) } else cur = Math.min(p.max, cur + d)
    return { ...x, pf: { ...p, temp, attuali: cur } }
  })
  const ratio = pf.max ? Math.max(0, Math.min(1, pf.attuali / pf.max)) : 0
  const saves = (k: 'successi' | 'fallimenti') => (
    <div className="flex items-center gap-1">
      <span className="w-20 text-xs opacity-70">{k === 'successi' ? 'Successi' : 'Fallimenti'}</span>
      {[0, 1, 2].map(i => {
        const n = c.tiriMorte?.[k] ?? 0
        return <button key={i} className={`h-6 w-6 rounded-full border ${i < n ? (k === 'successi' ? 'border-green-500 bg-green-600' : 'border-red-500 bg-red-600') : 'border-line'}`} aria-label={`${k} ${i + 1}`} aria-pressed={i < n} onClick={() => set(`tiriMorte.${k}`, i + 1 === n ? i : i + 1)} />
      })}
    </div>
  )
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <NumInput className="field w-20 px-1 text-center font-display text-3xl" value={pf.attuali} aria-label="PF attuali" onCommit={n => set('pf.attuali', n)} />
        <span className="text-xl opacity-60">/</span>
        <NumInput className="field w-16 px-1 text-center text-lg" value={pf.max} aria-label="PF massimi" onCommit={n => set('pf.max', n)} />
        <label className="ml-auto flex items-center gap-1 text-xs opacity-80">Temp.<NumInput className="field w-14 px-1 text-center" value={pf.temp ?? 0} aria-label="PF temporanei" onCommit={n => set('pf.temp', n)} /></label>
      </div>
      <div className="h-2 overflow-hidden rounded bg-ink" role="img" aria-label={`PF ${pf.attuali} su ${pf.max}`}>
        <div className={`h-full ${ratio > 0.5 ? 'bg-green-600' : ratio > 0.25 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${ratio * 100}%` }} />
      </div>
      <div className="flex items-center gap-1">
        <button className="btn grow" onClick={() => hit(-amount)}>− Danni</button>
        <NumInput className="field w-16 px-1 text-center" min={1} value={amount} aria-label="Quantità" onCommit={n => setAmount(Math.max(1, n))} />
        <button className="btn grow" onClick={() => hit(amount)}>+ Cure</button>
      </div>
      {pf.attuali === 0 && <div className="space-y-1 rounded border border-line p-2"><div className="text-xs text-danger">A 0 PF: tiri contro morte</div>{saves('successi')}{saves('fallimenti')}</div>}
    </div>
  )
}

// Riposi: il breve permette di spendere un dado vita; il lungo applica solo le voci che lasci spuntate.
const Rest = ({ c, patch }: P) => {
  const [mode, setMode] = useState<'short' | 'long' | null>(null)
  const [opt, setOpt] = useState({ pf: true, temp: true, slot: true, dv: true, morte: true })
  const [msg, setMsg] = useState('')
  const dv = c.dadiVita ?? { tipo: 'd8', totali: 1, usati: 0 }
  const spend = () => {
    if (dv.usati >= dv.totali) { setMsg('Nessun dado vita disponibile.'); return }
    const m = mod(c.abilita?.cos ?? 10)
    const r = roll(`1${dv.tipo}${m >= 0 ? '+' : ''}${m}`)
    const heal = Math.max(0, r.total)
    patch(x => ({ ...x, dadiVita: { ...(x.dadiVita ?? dv), usati: (x.dadiVita?.usati ?? dv.usati) + 1 }, pf: { ...x.pf, attuali: Math.min(x.pf.max, x.pf.attuali + heal) } }))
    setMsg(`Dado vita: ${r.total} → ${heal} PF recuperati`)
  }
  const applyLong = () => {
    patch(x => {
      const y = { ...x }
      if (opt.pf) y.pf = { ...y.pf, attuali: y.pf.max }
      if (opt.temp) y.pf = { ...y.pf, temp: 0 }
      if (opt.slot) y.slot = Object.fromEntries(Object.entries(y.slot ?? {}).map(([k, v]) => [k, { ...(v as object), usati: 0 }]))
      if (opt.dv) { const d = y.dadiVita ?? dv; y.dadiVita = { ...d, usati: Math.max(0, d.usati - Math.max(1, Math.floor(d.totali / 2))) } }
      if (opt.morte) y.tiriMorte = { successi: 0, fallimenti: 0 }
      return y
    })
    setMsg('Riposo lungo applicato.'); setMode(null)
  }
  const box = (k: keyof typeof opt, label: string) => <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={opt[k]} onChange={e => setOpt({ ...opt, [k]: e.target.checked })} />{label}</label>
  return (
    <div className="space-y-2 text-sm">
      <div className="flex gap-1">
        <button className={`btn grow ${mode === 'short' ? 'border-brass text-brass' : ''}`} aria-pressed={mode === 'short'} onClick={() => setMode(mode === 'short' ? null : 'short')}>Riposo breve</button>
        <button className={`btn grow ${mode === 'long' ? 'border-brass text-brass' : ''}`} aria-pressed={mode === 'long'} onClick={() => setMode(mode === 'long' ? null : 'long')}>Riposo lungo</button>
      </div>
      {mode === 'short' && (
        <div className="space-y-1 rounded border border-line p-2">
          <div>Dadi vita disponibili: <b>{Math.max(0, dv.totali - dv.usati)}</b> / {dv.totali} ({dv.tipo})</div>
          <button className="btn" onClick={spend}>Spendi un dado vita</button>
          {(c.slot?.patto?.max ?? 0) > 0 && <button className="btn ml-1" onClick={() => { patch(x => ({ ...x, slot: { ...x.slot, patto: { ...x.slot?.patto, usati: 0 } } })); setMsg('Slot del Patto ripristinati.') }}>Ripristina gli slot del Patto</button>}
          <p className="text-xs opacity-60">Il resto (capacità a ricarica breve, ecc.) lo gestisci a mano.</p>
        </div>
      )}
      {mode === 'long' && (
        <div className="space-y-1 rounded border border-line p-2">
          {box('pf', 'Ripristina tutti i PF')}{box('temp', 'Azzera i PF temporanei')}{box('slot', 'Azzera gli slot incantesimo usati')}
          {box('dv', 'Recupera dadi vita (metà del totale)')}{box('morte', 'Azzera i tiri contro morte')}
          <button className="btn" onClick={applyLong}>Applica</button>
        </div>
      )}
      {msg && <p role="status" className="text-xs opacity-80">{msg}</p>}
    </div>
  )
}

const Conditions = ({ c, set }: P) => {
  const list = (c.condizioni as string[] | undefined) ?? []
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {list.map(x => (
          <span key={x} className="inline-flex items-center rounded border border-line text-xs">
            <span className="px-1.5">{x}</span>
            <button className="px-1 opacity-60 hover:opacity-100" aria-label={`Togli ${x}`} onClick={() => set('condizioni', list.filter(y => y !== x))}>✕</button>
          </span>
        ))}
        {!list.length && <span className="text-sm opacity-60">Nessuna condizione.</span>}
      </div>
      <select className="field w-auto text-xs" value="" aria-label="Aggiungi condizione" onChange={e => e.target.value && set('condizioni', [...list, e.target.value])}>
        <option value="">+ Condizione</option>
        {CONDITIONS.filter(x => !list.includes(x)).map(x => <option key={x}>{x}</option>)}
      </select>
    </div>
  )
}

export const playBlocks: Record<string, BlockDef> = {
  playhp: { label: 'PF in gioco (danni e cure)', C: PlayHp },
  rest: { label: 'Riposi', C: Rest },
  conditions: { label: 'Condizioni', C: Conditions },
}
