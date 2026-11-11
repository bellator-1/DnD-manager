import { describe, expect, it } from 'vitest'
import { Character, newCharacter } from './model'
import { applyEffects, collectEffects, skillBonus } from './rules'

const mk = (over: Record<string, unknown> = {}) => ({ ...newCharacter('T'), id: 'c', ...over }) as unknown as Character
const scores = { for: 10, des: 14, cos: 12, int: 16, sag: 18, car: 8 }

describe('bonus personalizzati', () => {
  it('senza extra è modificatore + competenza', () => {
    expect(skillBonus(5, scores, 'int', 1)).toBe(3 + 3)
    expect(skillBonus(5, scores, 'int', 0)).toBe(3)
    expect(skillBonus(1, scores, 'car', 0)).toBe(-1)
  })
  it('Arcano + Saggezza: somma i due modificatori', () => {
    expect(skillBonus(5, scores, 'int', 1, { add: ['sag'] })).toBe(3 + 3 + 4)
  })
  it('un\'altra caratteristica al posto di quella base e un bonus fisso', () => {
    expect(skillBonus(1, scores, 'for', 0, { ab: 'des' })).toBe(2)
    expect(skillBonus(1, scores, 'for', 0, { flat: 2 })).toBe(2)
    expect(skillBonus(1, scores, 'for', 2, { ab: 'sag', flat: -1 })).toBe(4 + 4 - 1)
  })
  it('ignora caratteristiche sconosciute e somma gli effetti piatti', () => {
    expect(skillBonus(1, scores, 'des', 0, { add: ['xx' as any] })).toBe(2)
    expect(skillBonus(1, scores, 'des', 0, undefined, 1)).toBe(3)
  })
})

describe('effetti di oggetti e magie', () => {
  const items = {
    scudo: { name: 'Scudo +1', effetti: [{ target: 'ca', op: '+', valore: 1 }] },
    cintura: { name: 'Cintura', effetti: [{ target: 'for', op: '=', valore: 19 }] },
    armatura: { name: 'Armatura magica', effetti: [{ target: 'ca', op: '=', valore: 13 }, { target: 'ca', op: '+', valore: 2 }, { target: 'boh', op: '+', valore: 9 }] },
    vuoto: { name: 'Corda' },
  }
  it('conta solo le righe attive e gli effetti validi', () => {
    const c = mk({ inventarioLista: [{ ref: 'scudo', on: true }, { ref: 'cintura' }, { ref: 'vuoto', on: true }], incantesimiLista: [{ ref: 'armatura', on: true }] })
    const a = collectEffects(c, items)
    expect(a.map(x => `${x.from}:${x.effect.target}`)).toEqual(['Armatura magica:ca', 'Armatura magica:ca', 'Scudo +1:ca']) // prima gli incantesimi, poi l'inventario
  })
  it('somma i bonus; «imposta a» vale solo se più alto, poi si sommano i bonus', () => {
    const c = mk({ ca: 10, inventarioLista: [{ ref: 'scudo', on: true }], incantesimiLista: [{ ref: 'armatura', on: true }] })
    const e = applyEffects(c, collectEffects(c, items))
    expect(e.ca).toBe(13 + 1 + 2) // imposta a 13 (10 < 13), poi +1 e +2
    expect(e.changed.ca).toBe(true)
    expect(e.changed.velocita).toBe(false)
    const alta = mk({ ca: 18, incantesimiLista: [{ ref: 'armatura', on: true }] })
    expect(applyEffects(alta, collectEffects(alta, items)).ca).toBe(18 + 2) // 13 non supera 18
  })
  it('punteggi: imposta a (cintura) cambia il modificatore ma non il dato base', () => {
    const c = mk({ inventarioLista: [{ ref: 'cintura', on: true }] })
    c.abilita.for = 12
    const e = applyEffects(c, collectEffects(c, items))
    expect(e.ab.for).toBe(19)
    expect(c.abilita.for).toBe(12)
  })
  it('senza effetti attivi tutto resta com\'è', () => {
    const c = mk({ ca: 15, velocita: 9 })
    const e = applyEffects(c, [])
    expect([e.ca, e.velocita, e.iniziativa, e.ts]).toEqual([15, 9, 0, 0])
  })
  it('la stessa riga ripetuta non conta due volte; valori non numerici si ignorano', () => {
    const c = mk({ inventarioLista: [{ ref: 'scudo', on: true }, { ref: 'scudo', on: true }] })
    expect(collectEffects(c, items).length).toBe(1)
    expect(collectEffects(mk({ inventarioLista: [{ ref: 'x', on: true }] }), { x: { name: 'x', effetti: [{ target: 'ca', valore: 'abc' }] } }).length).toBe(0)
  })
})
