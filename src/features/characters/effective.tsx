import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { usePool } from '../../core/pool'
import type { RowCtx } from '../../core/Rows'
import type { Setter } from '../../core/SheetView'
import { Character } from './model'
import { Effective, applyEffects, collectEffects } from './rules'

// Valori della scheda con gli effetti di oggetti e magie ATTIVI (se l'utente ha acceso l'opzione nel blocco «Effetti»). Altrimenti coincidono con i dati base.
export function useEffective(c: Character): Effective {
  const items = usePool<any>('items')
  const on = !!c.opzioni?.effetti
  return useMemo(() => applyEffects(c, on ? collectEffects(c, items) : []), [c, items, on])
}

// «Attivo»: compare solo sugli elementi che hanno effetti. È la scelta dell'utente: l'app non decide da sola cosa è indossato o in uso.
export const itemActions = (e: any, r: Record<string, any>, { patchRow }: RowCtx): ReactNode =>
  e.effetti?.length ? (
    <label className="flex items-center gap-1 text-xs" title="Applica gli effetti di questo elemento alla scheda (se l'opzione «Effetti» è accesa)">
      <input type="checkbox" checked={!!r.on} onChange={ev => patchRow({ on: ev.target.checked })} />Attivo
    </label>
  ) : null

// «Lancia»: sceglie lo slot (dal livello della magia in su, o il Patto) e lo segna come usato. Non impedisce nulla: se non ci sono slot lo dice.
function CastButton({ e, c, set }: { e: any; c: Character; set: Setter }) {
  const lv = Number(e.livello) || 0
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const box = useRef<HTMLSpanElement>(null)
  useEffect(() => { if (!msg) return; const t = window.setTimeout(() => setMsg(''), 6000); return () => window.clearTimeout(t) }, [msg])
  useEffect(() => {
    if (!open) return
    const d = (ev: MouseEvent) => { if (!box.current?.contains(ev.target as Node)) setOpen(false) }
    const k = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', d); window.addEventListener('keydown', k)
    return () => { window.removeEventListener('mousedown', d); window.removeEventListener('keydown', k) }
  }, [open])
  if (lv < 1) return null

  const opts: { key: string; label: string; free: number }[] = []
  for (let l = lv; l <= 9; l++) { const s = c.slot?.[String(l)]; if ((s?.max ?? 0) > 0) opts.push({ key: String(l), label: `Livello ${l}`, free: s!.max - (s!.usati ?? 0) }) }
  const p = c.slot?.patto
  if ((p?.max ?? 0) > 0 && (p?.liv ?? 1) >= lv) opts.push({ key: 'patto', label: `Patto (livello ${p!.liv ?? 1})`, free: p!.max - (p!.usati ?? 0) })
  const cast = (o: (typeof opts)[number]) => {
    if (o.free < 1) return
    set(`slot.${o.key}.usati`, (c.slot?.[o.key]?.usati ?? 0) + 1)
    setMsg(`${e.name}: usato uno slot ${o.label.toLowerCase()}, ne restano ${o.free - 1}.`); setOpen(false)
  }
  return (
    <span ref={box} className="relative inline-flex flex-wrap items-center gap-1">
      <button className="btn px-2 py-0 text-xs" aria-haspopup="menu" aria-expanded={open} title="Spende uno slot e lo segna come usato" onClick={() => setOpen(o => !o)}>Lancia ▾</button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-1 w-56 rounded-lg border border-edge bg-panel p-1 shadow-xl shadow-black/40">
          {opts.length ? opts.map(o => (
            <button key={o.key} role="menuitem" disabled={o.free < 1} className="flex w-full justify-between rounded px-2 py-1 text-left text-sm hover:bg-raised disabled:opacity-40" onClick={() => cast(o)}>
              <span>{o.label}</span><span className="text-muted">{o.free} liberi</span>
            </button>
          )) : <p className="p-2 text-xs text-muted">Nessuno slot di livello {lv} o superiore: imposta i totali nel blocco degli slot.</p>}
        </div>
      )}
      {msg && <span role="status" className="basis-full text-xs text-good">{msg}</span>}
    </span>
  )
}
export const spellActions = (e: any, r: Record<string, any>, ctx: RowCtx): ReactNode => (
  <>{itemActions(e, r, ctx)}<CastButton e={e} c={ctx.c} set={ctx.set} /></>
)
