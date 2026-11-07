import { describe, expect, it } from 'vitest'
import { collect, findInPages, norm, search, toDoc } from './search'

const docs = [
  toDoc('notes', { id: '1', name: 'Il drago rosso', body: 'Vive sulla montagna di Karak', tags: ['bestiario'] }),
  toDoc('npcs', { id: '2', name: 'Karak il fabbro', descrizione: 'Un nano che forgia spade' }),
  toDoc('items', { id: '3', name: 'Spada del tramonto', descrizione: 'Forgiata da Karak, perché serviva' }),
]

describe('search', () => {
  it('ignora accenti e maiuscole', () => {
    expect(norm('Perché')).toBe('perche')
    expect(search(docs, 'PERCHE').map(h => h.doc.id)).toEqual(['3'])
  })
  it('richiede tutte le parole', () => {
    expect(search(docs, 'karak nano').map(h => h.doc.id)).toEqual(['2'])
    expect(search(docs, 'karak zzz').length).toBe(0)
  })
  it('il titolo pesa più del testo', () => { expect(search(docs, 'karak')[0].doc.id).toBe('2') })
  it('trova nei tag', () => { expect(search(docs, 'bestiario')[0].doc.id).toBe('1') })
  it('query vuota non restituisce nulla', () => { expect(search(docs, '   ').length).toBe(0) })
  it('il frammento contiene la parola cercata', () => { expect(search(docs, 'forgia')[0].snippet.includes('forgia')).toBe(true) })
})

describe('collect', () => {
  it('salta identificatori, immagini e forme', () => {
    const t = collect({ id: 'abc', name: 'Mappa', immagini: [{ src: 'x.png' }], layers: [{ name: 'Confini' }], note: 'testo' })
    expect(t).toEqual(['Mappa', 'testo'])
  })
})

describe('findInPages', () => {
  const pages = ['Capitolo uno: i nani', 'Le spade magiche e gli incantesimi', 'Fine']
  it('restituisce i numeri di pagina da 1', () => { expect(findInPages(pages, 'incantesimi').map(r => r.page)).toEqual([2]) })
  it('richiede tutte le parole nella stessa pagina', () => {
    expect(findInPages(pages, 'nani spade').length).toBe(0)
    expect(findInPages(pages, 'nani capitolo').map(r => r.page)).toEqual([1])
  })
})
