import { describe, expect, it } from 'vitest'
import { fmtSize, unusedImages } from './orphans'

describe('unusedImages', () => {
  it('segnala solo le immagini mai citate', () => {
    const texts = ['{"ritratto":"aaa.webp"}', 'Una nota con ![](img:bbb.png "w=40")']
    expect(unusedImages(['aaa.webp', 'bbb.png', 'ccc.jpg'], texts)).toEqual(['ccc.jpg'])
  })
  it('senza testi tutte sono inutilizzate', () => { expect(unusedImages(['x.png'], [])).toEqual(['x.png']) })
})
describe('fmtSize', () => {
  it('formatta le dimensioni', () => {
    expect(fmtSize(512)).toBe('512 B')
    expect(fmtSize(2048)).toBe('2 KB')
    expect(fmtSize(3 * 1048576)).toBe('3.0 MB')
  })
})
