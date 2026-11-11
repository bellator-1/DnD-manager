import { describe, expect, it } from 'vitest'
import { clampNum, parseDraft } from './numeric'

describe('parseDraft', () => {
  it('numeri completi, anche con virgola o segno', () => {
    expect(parseDraft('12')).toBe(12)
    expect(parseDraft('-3')).toBe(-3)
    expect(parseDraft('2,5')).toBe(2.5)
    expect(parseDraft(' 7 ')).toBe(7)
    expect(parseDraft('0')).toBe(0)
  })
  it('una bozza incompleta non è un numero: il campo non salta a 0 mentre si scrive', () => {
    for (const t of ['', ' ', '-', '+', '.', '-.', ',']) expect(parseDraft(t)).toBe(null)
  })
  it('testo non numerico', () => {
    expect(parseDraft('abc')).toBe(null)
    expect(parseDraft('1e')).toBe(null)
  })
})

describe('clampNum', () => {
  it('rispetta minimo e massimo, se presenti', () => {
    expect(clampNum(5, 1, 3)).toBe(3)
    expect(clampNum(0, 1, 3)).toBe(1)
    expect(clampNum(2, 1, 3)).toBe(2)
    expect(clampNum(-9)).toBe(-9)
    expect(clampNum(50, undefined, 30)).toBe(30)
  })
})
