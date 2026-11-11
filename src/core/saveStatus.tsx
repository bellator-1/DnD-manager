import { useEffect, useSyncExternalStore } from 'react'
import { failedCount, onFailedChange, retryFailed } from './saving'

// Contatore globale dei salvataggi in corso o in attesa: alimenta l'indicatore in alto e l'avviso se si chiude la pagina con modifiche non salvate.
let pending = 0, error: string | null = null, last = 0
let snap: { pending: number; error: string | null; last: number; failed: number } = { pending, error, last, failed: 0 }
const subs = new Set<() => void>()
const emit = () => { snap = { pending, error, last, failed: failedCount() }; subs.forEach(f => f()) }
onFailedChange(emit)

export const saveSnapshot = () => snap
export const savingNow = () => pending > 0
export const beginSave = () => { pending++; emit() }
export const endSave = (err?: unknown) => {
  pending = Math.max(0, pending - 1)
  if (err) error = err instanceof Error && err.message ? err.message : 'errore sconosciuto'
  else { error = null; last = Date.now() }
  emit()
}
export async function tracked<T>(p: Promise<T>): Promise<T> {
  beginSave()
  try { const r = await p; endSave(); return r } catch (e) { endSave(e); throw e }
}

export function SaveIndicator() {
  const s = useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => snap)
  const busy = s.pending > 0
  const unsaved = busy || s.failed > 0 // anche i salvataggi falliti contengono modifiche che esistono solo in memoria
  useEffect(() => {
    if (!unsaved) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h)
  }, [unsaved])
  return (
    <span role="status" aria-live="polite" className={`flex items-center gap-2 text-xs ${s.error ? 'text-danger' : 'opacity-70'}`}>
      {s.error ? `⚠ Non salvato: ${s.error}` : busy ? 'Salvataggio…' : s.last ? '✓ Salvato' : ''}
      {s.failed > 0 && !busy && <button className="btn min-h-6 px-2 py-0 text-xs" onClick={async () => { beginSave(); const r = await retryFailed(); endSave(r.ko ? `${r.ko} salvataggi non riusciti` : undefined) }}>Riprova</button>}
    </span>
  )
}
