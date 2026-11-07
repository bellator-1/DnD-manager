import { describe, expect, it } from 'vitest'
import { Folder, childrenOf, descendants, pathOf, removeFolder, wouldCycle } from './folders'

const f = (id: string, name: string, parent = ''): Folder => ({ id, name, parent, open: true })
const fs = [f('a', 'Maghi'), f('b', 'Gilda', 'a'), f('c', 'Archivio', 'b'), f('d', 'Bardi')]

describe('folders', () => {
  it('elenca i figli in ordine alfabetico', () => { expect(childrenOf(fs, '').map(x => x.id)).toEqual(['d', 'a'].sort((x, y) => fs.find(z => z.id === x)!.name.localeCompare(fs.find(z => z.id === y)!.name))) })
  it('trova tutte le discendenti', () => { expect(descendants(fs, 'a').sort()).toEqual(['a', 'b', 'c']) })
  it('costruisce il percorso', () => { expect(pathOf(fs, 'c')).toBe('Maghi / Gilda / Archivio') })
  it('eliminando una cartella le sottocartelle salgono di un livello', () => {
    const r = removeFolder(fs, 'b')
    expect(r.reparent).toBe('a')
    expect(r.folders.find(x => x.id === 'c')!.parent).toBe('a')
    expect(r.folders.some(x => x.id === 'b')).toBe(false)
  })
  it('riconosce i cicli', () => {
    expect(wouldCycle(fs, 'a', 'c')).toBe(true)
    expect(wouldCycle(fs, 'a', 'd')).toBe(false)
  })
})
