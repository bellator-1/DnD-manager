import { describe, expect, it } from 'vitest'
import { roll } from './roll'

// Sostituisce Math.random con una sequenza fissa per rendere i tiri prevedibili.
const withRandom = (values: number[], f: () => void) => {
  const orig = Math.random; let i = 0
  Math.random = () => values[i++ % values.length]
  try { f() } finally { Math.random = orig }
}

describe('roll', () => {
  it('somma dadi e modificatore', () => withRandom([0.5, 0], () => {
    const r = roll('2d6+3') // d6: 1+floor(0.5*6)=4 e 1+floor(0)=1
    expect(r.total).toBe(4 + 1 + 3)
    expect(r.terms.length).toBe(2)
  }))
  it('sottrae i termini negativi', () => withRandom([0.99], () => { expect(roll('1d20-2').total).toBe(20 - 2) }))
  it('vantaggio tiene il dado più alto', () => withRandom([0, 0.99], () => {
    const r = roll('2d20kh1')
    expect(r.total).toBe(20)
    expect(r.terms[0].dice![0].drop).toBe(true)
  }))
  it('svantaggio tiene il dado più basso', () => withRandom([0, 0.99], () => { expect(roll('2d20kl1').total).toBe(1) }))
  it('segnala critico e fallimento critico con un solo d20', () => {
    withRandom([0.99], () => { expect(roll('1d20').crit).toBe('max') })
    withRandom([0], () => { expect(roll('1d20+5').crit).toBe('min') })
  })
  it('nessun critico se i d20 tenuti sono più di uno', () => withRandom([0.99], () => { expect(roll('2d20').crit).toBe(undefined) }))
  it('rifiuta le espressioni non valide', () => {
    expect(() => roll('abc')).toThrow()
    expect(() => roll('2d')).toThrow()
    expect(() => roll('')).toThrow()
  })
  it('limita il numero di dadi', () => {
    expect(() => roll('101d6')).toThrow()
    expect(() => roll('100d6+100d6+100d6+1d6')).toThrow()
  })
})
