import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Pulsante ⓘ (o altra etichetta) che apre una piccola guida. Si chiude con Esc o cliccando fuori.
// Il pannello è fuori dalla sezione che lo contiene (portale sul body) e posizionato sullo schermo: non viene mai tagliato dai bordi della sezione.
type Pos = { left: number; width: number; top?: number; bottom?: number; maxH: number }
export function Info({ title, children, align = 'left', label = 'ⓘ' }: { title: string; children: ReactNode; align?: 'left' | 'right'; label?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<Pos | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  const place = () => {
    const b = btn.current; if (!b) return
    const r = b.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight
    const width = Math.min(448, vw - 16)
    const left = Math.max(8, Math.min(align === 'right' ? r.right - width : r.left, vw - width - 8))
    const below = vh - r.bottom - 12, above = r.top - 12
    const down = below >= 240 || below >= above // se sotto c'è poco spazio si apre verso l'alto
    setPos({ left, width, maxH: Math.max(160, down ? below : above), ...(down ? { top: r.bottom + 4 } : { bottom: vh - r.top + 4 }) })
  }
  useLayoutEffect(() => { if (open) place() }, [open])
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => { const t = e.target as Node; if (!panel.current?.contains(t) && !btn.current?.contains(t)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus() } }
    window.addEventListener('mousedown', down); window.addEventListener('keydown', key)
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('mousedown', down); window.removeEventListener('keydown', key); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open])

  return (
    <span className="inline-block">
      <button ref={btn} type="button" className={`btn px-2 ${open ? 'border-brass text-brass' : ''}`} aria-expanded={open} aria-label={`Guida: ${title}`} title={`Guida: ${title}`} onClick={() => setOpen(o => !o)}>{label}</button>
      {open && pos && createPortal(
        <div ref={panel} role="region" aria-label={title} className="fixed z-[90] space-y-2 overflow-y-auto rounded-lg border border-edge bg-panel p-3 text-sm leading-relaxed shadow-xl shadow-black/40"
          style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH }}>
          <h4 className="font-display text-base text-brass">{title}</h4>
          {children}
        </div>, document.body)}
    </span>
  )
}
