import { PointerEvent as ReactPointerEvent, ReactNode, useState } from 'react'

// Stato dell'interfaccia ricordato tra una sessione e l'altra (solo preferenze di visualizzazione, nel browser).
export function usePersisted<T extends object>(key: string, init: T) {
  const [v, set] = useState<T>(() => { try { return { ...init, ...JSON.parse(localStorage.getItem(key) ?? '{}') } } catch { return init } })
  const patch = (p: Partial<T>) => set(s => { const n = { ...s, ...p }; try { localStorage.setItem(key, JSON.stringify(n)) } catch { /* ignora */ } return n })
  return [v, patch] as const
}

// Barra laterale comprimibile e ridimensionabile trascinando il bordo destro.
export function SidePanel({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const [s, patch] = usePersisted('ui:side:' + id, { open: true, w: 240 })
  const drag = (e: ReactPointerEvent) => {
    e.preventDefault()
    const x0 = e.clientX, w0 = s.w
    const mv = (ev: PointerEvent) => patch({ w: Math.min(520, Math.max(160, w0 + ev.clientX - x0)) })
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', () => window.removeEventListener('pointermove', mv), { once: true })
  }
  if (!s.open) return (
    <aside className="shrink-0 border-r border-line bg-panel">
      <button className="btn m-1 px-2 py-0" title={`Mostra ${title}`} onClick={() => patch({ open: true })}>›</button>
    </aside>
  )
  return (
    <aside className="relative flex shrink-0 flex-col border-r border-line bg-panel" style={{ width: s.w }}>
      <div className="flex items-center justify-between px-2 py-1">
        <span className="font-display text-brass">{title}</span>
        <button className="btn px-2 py-0" title="Nascondi" onClick={() => patch({ open: false })}>‹</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-brass/40" onPointerDown={drag} />
    </aside>
  )
}
