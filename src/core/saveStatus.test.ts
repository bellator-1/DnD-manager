import { describe, expect, it } from 'vitest'
import { beginSave, endSave, saveSnapshot, savingNow, tracked } from './saveStatus'

describe('saveStatus', () => {
  it('conta i salvataggi in corso', () => {
    beginSave(); beginSave()
    expect(saveSnapshot().pending).toBe(2)
    expect(savingNow()).toBe(true)
    endSave(); endSave()
    expect(savingNow()).toBe(false)
  })
  it('ricorda l\'errore finché un salvataggio non riesce', async () => {
    await expect(tracked(Promise.reject(new Error('disco pieno')))).rejects.toThrow()
    expect(saveSnapshot().error).toBe('disco pieno')
    expect(saveSnapshot().pending).toBe(0)
    await tracked(Promise.resolve())
    expect(saveSnapshot().error).toBe(null)
  })
})
