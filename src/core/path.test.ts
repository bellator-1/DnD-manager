import { describe, expect, it } from 'vitest'
import { getPath, setPath } from './path'

describe('path', () => {
  it('legge percorsi annidati e restituisce undefined se mancano', () => {
    expect(getPath({ a: { b: 1 } }, 'a.b')).toBe(1)
    expect(getPath({}, 'a.b')).toBe(undefined)
  })
  it('setPath restituisce una copia e non modifica l\'originale', () => {
    const o = { a: { b: 1 } }
    const n = setPath(o, 'a.b', 2)
    expect(o.a.b).toBe(1)
    expect(n.a.b).toBe(2)
  })
  it('crea i livelli mancanti', () => { expect(setPath({}, 'x.y.z', 5)).toEqual({ x: { y: { z: 5 } } }) })
})
