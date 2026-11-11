import { ReactNode, useEffect, useRef, useState } from 'react'

// Pulsante ⓘ che apre una piccola guida. Si chiude con Esc o cliccando fuori.
export function Info({ title, children, align = 'left' }: { title: string; children: ReactNode; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', down); window.addEventListener('keydown', key)
    return () => { window.removeEventListener('mousedown', down); window.removeEventListener('keydown', key) }
  }, [open])
  return (
    <span ref={box} className="relative inline-block">
      <button type="button" className={`btn px-2 ${open ? 'border-brass text-brass' : ''}`} aria-expanded={open} aria-label={`Guida: ${title}`} title={`Guida: ${title}`} onClick={() => setOpen(o => !o)}>ⓘ</button>
      {open && (
        <div role="region" aria-label={title} className={`absolute top-full z-50 mt-1 max-h-[70vh] w-[min(28rem,90vw)] space-y-2 overflow-y-auto rounded-lg border border-edge bg-panel p-3 text-sm leading-relaxed shadow-xl shadow-black/40 ${align === 'right' ? 'right-0' : 'left-0'}`}>
          <h4 className="font-display text-base text-brass">{title}</h4>
          {children}
        </div>
      )}
    </span>
  )
}
