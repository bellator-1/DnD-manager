import { describe, expect, it } from 'vitest'
import { kit } from './layoutKit'

describe('kit', () => {
  it('gli id sono prefisso + contatore, e skip riserva id senza creare nodi', () => {
    const k = kit('x', [{ path: 'a', label: 'A', input: 'text' }])
    expect(k.blk('hp').id).toBe('x0')
    k.skip(3)
    expect(k.blk('hp').id).toBe('x4')
    expect(k.fld('a').id).toBe('x5')
  })
})
