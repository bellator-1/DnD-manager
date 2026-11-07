import { describe, expect, it } from 'vitest'
import { Node, Root, edit, move, reorderRoot } from './tree'

const leaf = (id: string): Node => ({ id, type: 'field' })
const tree: Node[] = [{ id: 'a', type: 'group', children: [leaf('a1'), leaf('a2')] }, leaf('b')]
const root = (id: string, x: number, y: number): Root => ({ id, type: 'group', x, y, w: 12, h: 6 })
const at = (rs: Root[], id: string) => rs.find(r => r.id === id)!

describe('edit', () => {
  it('modifica un nodo annidato senza toccare l\'originale', () => {
    const out = edit(tree, 'a2', n => ({ ...n, title: 'x' }))
    expect(out[0].children![1].title).toBe('x')
    expect(tree[0].children![1].title).toBe(undefined)
  })
  it('elimina il nodo se la funzione restituisce null', () => {
    expect(edit(tree, 'a1', () => null)[0].children!.length).toBe(1)
  })
})

describe('move', () => {
  it('scambia con il fratello successivo e precedente', () => {
    expect(move(tree[0].children!, 'a1', 1).map(n => n.id)).toEqual(['a2', 'a1'])
    expect(move(tree[0].children!, 'a2', -1).map(n => n.id)).toEqual(['a2', 'a1'])
  })
  it('non esce dai bordi', () => {
    const kids = tree[0].children!
    expect(move(kids, 'a1', -1)).toBe(kids)
  })
  it('funziona anche su nodi annidati', () => {
    expect(move(tree, 'a2', -1)[0].children!.map(n => n.id)).toEqual(['a2', 'a1'])
  })
})

describe('reorderRoot', () => {
  const rs = [root('a', 0, 0), root('b', 0, 7), root('c', 0, 14)]
  it('top: la sezione va in cima e le altre scendono', () => {
    const out = reorderRoot(rs, 'c', 'top')
    expect([at(out, 'c').y, at(out, 'a').y, at(out, 'b').y]).toEqual([0, 7, 14])
  })
  it('bottom: va in fondo', () => {
    const out = reorderRoot(rs, 'a', 'bottom')
    expect(at(out, 'a').y).toBe(9999)
    expect(at(out, 'b').y).toBe(7)
  })
  it('up: scambia la posizione con la precedente', () => {
    const out = reorderRoot(rs, 'b', 'up')
    expect([at(out, 'b').y, at(out, 'a').y]).toEqual([0, 7])
  })
  it('up sulla prima e id sconosciuto non cambiano nulla', () => {
    expect(reorderRoot(rs, 'a', 'up')).toBe(rs)
    expect(reorderRoot(rs, 'zz', 'top')).toBe(rs)
  })
})
