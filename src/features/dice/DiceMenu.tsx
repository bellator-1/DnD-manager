import { useEffect, useRef, useState } from 'react'
import { usePersisted } from '../../core/SidePanel'
import { roll, RollResult } from './roll'
import { promptDialog } from '../../core/dialog'
import { NumInput } from '../../core/NumInput'

// Qualsiasi componente può lanciare: rollEvent('1d20+3', 'Percezione'). Se il pannello è chiuso compare un avviso con il risultato.
export const rollEvent = (expr: string, label?: string) => window.dispatchEvent(new CustomEvent('roll', { detail: { expr, label } }))
const DICE = [4, 6, 8, 10, 12, 20, 100]
type Mode = 'n' | 'a' | 'd'

function poolExpr(pool: Record<number, number>, mode: Mode, mod: number) {
  const parts: string[] = []
  for (const f of DICE) {
    const n = pool[f] ?? 0
    if (f === 20 && mode !== 'n') { const k = Math.max(n, 1); parts.push(`${k + 1}d20k${mode === 'a' ? 'h' : 'l'}${k}`) }
    else if (n) parts.push(`${n}d${f}`)
  }
  return parts.length ? parts.join('+') + (mod ? (mod > 0 ? '+' : '-') + Math.abs(mod) : '') : ''
}

function Result({ r }: { r: RollResult }) {
  const tone = r.crit === 'max' ? 'text-good' : r.crit === 'min' ? 'text-danger' : 'text-brass'
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className={`font-display text-5xl ${tone}`}>{r.total}</span>
        <span className="text-sm opacity-70">{r.label ? r.label + ' · ' : ''}{r.expr}{r.crit === 'max' ? ' · Critico!' : r.crit === 'min' ? ' · Fallimento critico' : ''}</span>
      </div>
      <div className="mt-2 max-h-44 space-y-1 overflow-auto text-sm">
        {r.terms.map((t, i) => (
          <div key={i} className="flex flex-wrap items-center gap-1">
            <span className="w-16 shrink-0 opacity-60">{t.sign < 0 ? '−' : ''}{t.label}</span>
            {t.dice?.map((d, j) => (
              <span key={j} className={`rounded border px-1.5 ${d.drop ? 'border-line line-through opacity-40' : d.v === t.faces ? 'border-brass text-brass' : d.v === 1 ? 'border-danger/60 text-danger' : 'border-line'}`}>{d.v}</span>
            ))}
            <span className="ml-auto opacity-70">= {t.sign < 0 ? '−' : ''}{t.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DiceMenu() {
  const [open, setOpen] = useState(false)
  const [pool, setPool] = useState<Record<number, number>>({})
  const [mode, setMode] = useState<Mode>('n')
  const [mod, setMod] = useState(0)
  const [expr, setExpr] = useState('')
  const [log, setLog] = useState<RollResult[]>([])
  const [toast, setToast] = useState<RollResult | null>(null)
  const [err, setErr] = useState('')
  const [ui, patch] = usePersisted('ui:dice', { presets: [] as { name: string; expr: string }[] })
  const openRef = useRef(open); openRef.current = open
  const timer = useRef(0)

  const go = (e: string, label?: string) => {
    try { const r = roll(e, label); setLog(l => [r, ...l].slice(0, 30)); setErr(''); return r } catch (x) { setErr((x as Error).message); return null }
  }
  useEffect(() => {
    const h = (ev: Event) => {
      const { expr: e, label } = (ev as CustomEvent<{ expr: string; label?: string }>).detail
      const r = go(e, label)
      if (r && !openRef.current) { setToast(r); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setToast(null), 6000) }
    }
    window.addEventListener('roll', h); return () => window.removeEventListener('roll', h)
  }, [])
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [open])

  const add = (f: number, d: number) => setPool(p => ({ ...p, [f]: Math.min(100, Math.max(0, (p[f] ?? 0) + d)) }))
  const built = poolExpr(pool, mode, mod)
  const save = async () => { const e = built || expr.trim(); const name = e && await promptDialog('Nome del tiro (es. Palla di fuoco)'); if (name) patch({ presets: [...ui.presets, { name, expr: e }] }) }

  return (
    <>
      <button className="btn border-brass font-display text-brass" onClick={() => setOpen(true)}>⚄ Dadi</button>
      {toast && !open && (
        <button className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded border border-brass bg-panel px-5 py-3 text-left shadow-xl" onClick={() => setToast(null)} title="Chiudi">
          <Result r={toast} />
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={e => e.target === e.currentTarget && setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Tira i dadi" className="max-h-[92vh] w-[min(48rem,100%)] space-y-4 overflow-y-auto overflow-x-hidden dialog p-5">
            <div className="flex items-center justify-between"><h2 className="font-display text-2xl text-brass">Tira i dadi</h2><button className="btn px-2 py-0" onClick={() => setOpen(false)} aria-label="Chiudi">✕</button></div>

            <div className="grid grid-cols-4 gap-2 md:grid-cols-7">
              {DICE.map(f => (
                <div key={f} className="min-w-0 rounded border border-line p-2 text-center">
                  <button className="w-full font-display text-xl text-brass" onClick={() => add(f, 1)} title={`Aggiungi un d${f}`}>d{f}</button>
                  <NumInput className="field mt-1 px-1 text-center" min={0} max={100} value={pool[f] ?? 0} aria-label={`Quanti d${f}`} onCommit={n => setPool(p => ({ ...p, [f]: Math.min(100, Math.max(0, n)) }))} />
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    <button className="btn px-0 py-0" onClick={() => add(f, -1)} aria-label={`Togli un d${f}`}>−</button>
                    <button className="btn px-0 py-0" onClick={() => add(f, 1)} aria-label={`Aggiungi un d${f}`}>+</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="flex overflow-hidden rounded border border-line">
                {([['n', 'Normale'], ['a', 'Vantaggio'], ['d', 'Svantaggio']] as [Mode, string][]).map(([m, l]) => (
                  <button key={m} className={`px-3 py-1 ${mode === m ? 'bg-brass text-ink' : 'hover:text-brass'}`} aria-pressed={mode === m} onClick={() => setMode(m)}>{l}</button>
                ))}
              </div>
              <label className="flex items-center gap-1">Modificatore
                <button className="btn px-2 py-0" onClick={() => setMod(v => v - 1)} aria-label="Diminuisci">−</button>
                <NumInput className="field w-16 text-center" value={mod} aria-label="Modificatore" onCommit={n => setMod(n)} />
                <button className="btn px-2 py-0" onClick={() => setMod(v => v + 1)} aria-label="Aumenta">+</button>
              </label>
              <button className="btn ml-auto" onClick={() => { setPool({}); setMode('n'); setMod(0) }}>Azzera</button>
            </div>

            <div className="flex gap-2">
              <button className="btn grow border-brass py-2 font-display text-lg text-brass disabled:opacity-40" disabled={!built} onClick={() => go(built)}>Tira {built || '— scegli i dadi'}</button>
              <button className="btn" onClick={save} title="Salva questo tiro tra i preferiti">★ Salva</button>
            </div>

            {err && <p className="text-sm text-danger">{err}</p>}
            {log[0] && <div className="rounded border border-line bg-ink p-3"><Result r={log[0]} /></div>}

            <div className="flex gap-2">
              <input className="field" placeholder="Oppure scrivi un'espressione: 8d6+2d8+5, 4d6kh3…" value={expr} onChange={e => setExpr(e.target.value)} onKeyDown={e => e.key === 'Enter' && expr && go(expr)} aria-label="Espressione dadi" />
              <button className="btn" onClick={() => expr && go(expr)}>Tira</button>
            </div>

            {ui.presets.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {ui.presets.map((p, i) => (
                  <span key={i} className="inline-flex items-center rounded border border-line text-sm">
                    <button className="px-2 py-0.5 hover:text-brass" onClick={() => go(p.expr, p.name)} title={p.expr}>★ {p.name}</button>
                    <button className="px-1 opacity-60 hover:opacity-100" aria-label={`Rimuovi ${p.name}`} onClick={() => patch({ presets: ui.presets.filter((_, k) => k !== i) })}>✕</button>
                  </span>
                ))}
              </div>
            )}

            {log.length > 0 && (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-sm opacity-60">Cronologia{log.length > 1 ? ' (clic per ripetere)' : ''}</h3>
                  <button className="btn px-2 py-0 text-xs" onClick={() => setLog([])}>Cancella cronologia</button>
                </div>
                {log.length > 1 && (
                  <ul className="max-h-28 space-y-0.5 overflow-y-auto rounded border border-line p-1 text-sm">
                    {log.slice(1, 16).map(r => (
                      <li key={r.at + r.expr}><button className="flex w-full gap-2 rounded px-1 text-left hover:bg-ink" onClick={() => go(r.expr, r.label)}>
                        <b className="w-10 text-right text-brass">{r.total}</b><span className="truncate opacity-70">{r.label ? r.label + ' · ' : ''}{r.expr}</span></button></li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
