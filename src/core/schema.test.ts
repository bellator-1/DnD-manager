import { describe, expect, it } from 'vitest'
import { currentVersion, isFromFuture, migrateEntity } from './schema'

describe('migrazioni', () => {
  it('un personaggio della versione 1 riceve i campi nuovi senza perdere i suoi dati', () => {
    const old = { id: 'a', name: 'Aria', schemaVersion: 1, classe: 'Mago', abilita: { for: 8 } }
    const m = migrateEntity<any>('characters', old)
    expect(m.schemaVersion).toBe(currentVersion('characters'))
    expect(m.abilitaExtra).toEqual({})
    expect(m.classe).toBe('Mago')
    expect(m.abilita).toEqual({ for: 8 })
    expect(old.schemaVersion).toBe(1) // l'originale non si modifica
  })
  it('manca schemaVersion: si tratta come versione 1', () => {
    expect(migrateEntity<any>('items', { id: 'x', name: 'Spada' }).effetti).toEqual([])
  })
  it('un elemento già aggiornato non cambia', () => {
    const cur = { id: 'a', name: 'A', schemaVersion: currentVersion('items'), effetti: [{ target: 'ca' }] }
    expect(migrateEntity('items', cur)).toBe(cur)
  })
  it('un tipo senza migrazioni resta com\'è', () => {
    const e = { id: 'n', name: 'Nota', schemaVersion: 1 }
    expect(migrateEntity('notes', e)).toBe(e)
  })
  it('un file di una versione futura non si tocca e si riconosce', () => {
    const f = { id: 'a', name: 'A', schemaVersion: currentVersion('characters') + 3, nuovo: 1 }
    expect(isFromFuture('characters', f)).toBe(true)
    expect(migrateEntity('characters', f)).toBe(f)
    expect(isFromFuture('characters', { schemaVersion: 1 })).toBe(false)
  })
})
