// Salvataggi con nuovo tentativo. Un salvataggio che fallisce (file in uso, disco pieno, permesso scaduto) si riprova da solo qualche volta;
// se continua a fallire resta in elenco e l'utente può riprovare con il pulsante, senza perdere le modifiche rimaste in memoria.
const failed = new Map<string, () => Promise<unknown>>()
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(f => f())
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export const failedCount = () => failed.size
export const onFailedChange = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }

// `key` identifica il file: un salvataggio più recente dello stesso file sostituisce quello fallito.
export async function persist(key: string, fn: () => Promise<unknown>, delays: number[] = [400, 1200]): Promise<void> {
  let err: unknown
  for (let i = 0; i <= delays.length; i++) {
    try { await fn(); if (failed.delete(key)) notify(); return } catch (e) { err = e; if (i < delays.length) await sleep(delays[i]) }
  }
  failed.set(key, fn); notify()
  throw err
}

// Riprova tutti i salvataggi falliti. Restituisce quanti sono riusciti e quanti no.
export async function retryFailed(delays: number[] = [0]): Promise<{ ok: number; ko: number }> {
  let ok = 0, ko = 0
  for (const [key, fn] of [...failed]) { try { await persist(key, fn, delays); ok++ } catch { ko++ } }
  return { ok, ko }
}
export const resetFailed = () => { failed.clear(); notify() } // per i test
