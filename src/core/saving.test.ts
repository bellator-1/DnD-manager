import { describe, expect, it } from 'vitest'
import { failedCount, persist, resetFailed, retryFailed } from './saving'

describe('salvataggi con nuovo tentativo', () => {
  it('riprova da solo e poi riesce', async () => {
    resetFailed()
    let n = 0
    await persist('k', async () => { if (++n < 3) throw new Error('occupato') }, [0, 0])
    expect(n).toBe(3)
    expect(failedCount()).toBe(0)
  })
  it('se continua a fallire resta in elenco e si può riprovare', async () => {
    resetFailed()
    let ok = false, thrown = false
    try { await persist('f', async () => { if (!ok) throw new Error('disco pieno') }, [0]) } catch { thrown = true }
    expect(thrown).toBe(true)
    expect(failedCount()).toBe(1)
    ok = true
    const r = await retryFailed([0])
    expect(r.ok).toBe(1)
    expect(r.ko).toBe(0)
    expect(failedCount()).toBe(0)
  })
  it('un salvataggio più recente dello stesso file sostituisce quello fallito', async () => {
    resetFailed()
    try { await persist('x', async () => { throw new Error('a') }, []) } catch { /* previsto */ }
    expect(failedCount()).toBe(1)
    await persist('x', async () => {}, [])
    expect(failedCount()).toBe(0)
  })
})
