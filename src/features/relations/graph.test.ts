import { describe, expect, it } from 'vitest'
import { layoutGraph } from './graph'

describe('layoutGraph', () => {
  it('gestisce grafi vuoti e con un solo nodo', () => {
    expect(layoutGraph([], [], 800, 500).size).toBe(0)
    expect(layoutGraph(['a'], [], 800, 500).size).toBe(1)
  })
  it('tiene i nodi dentro i margini e senza NaN', () => {
    const ids = ['a', 'b', 'c', 'd', 'e']
    const pos = layoutGraph(ids, [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e']], 800, 500)
    for (const p of pos.values()) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true)
      expect(p.x >= 40 && p.x <= 760 && p.y >= 40 && p.y <= 460).toBe(true)
    }
  })
  it('avvicina i nodi collegati rispetto a quelli isolati', () => {
    const pos = layoutGraph(['a', 'b', 'c'], [['a', 'b']], 800, 500)
    const d = (u: string, v: string) => Math.hypot(pos.get(u)!.x - pos.get(v)!.x, pos.get(u)!.y - pos.get(v)!.y)
    expect(d('a', 'b') < d('a', 'c')).toBe(true)
  })
  it('è deterministico', () => {
    const run = () => [...layoutGraph(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']], 800, 500).values()].map(p => Math.round(p.x) + ',' + Math.round(p.y)).join(';')
    expect(run()).toBe(run())
  })
})
