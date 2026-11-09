import { describe, expect, it } from 'vitest'
import { MemoryStore } from './memoryStore'
import { migrateEntries } from './migrate'

// 1 pixel PNG trasparente come data URL
const DATA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

describe('migrazione dal browser', () => {
  it('copia i testi, trasforma le immagini in file e non sovrascrive', async () => {
    const t = new MemoryStore()
    await t.write('c1/notes/esiste.json', 'originale')
    const r = await migrateEntries([['c1/notes/esiste.json', 'dal browser'], ['c1/notes/nuova.json', '{"a":1}'], ['c1/images/i.png', DATA], ['c1/maps/m.img', DATA]], t)
    expect(r).toEqual({ copied: 3, skipped: 1 })
    expect(await t.read('c1/notes/esiste.json')).toBe('originale')
    expect(await t.read('c1/notes/nuova.json')).toBe('{"a":1}')
    expect((await t.readBlob('c1/images/i.png'))!.type).toBe('image/png') // diventa un file vero
    expect(await t.read('c1/maps/m.img')).toBe(DATA) // il vecchio formato delle mappe resta testo: lo converte l'app all'apertura
  })
  it('unisce l\'elenco delle campagne senza duplicati', async () => {
    const t = new MemoryStore()
    await t.write('index.json', JSON.stringify([{ id: 'a', name: 'A' }]))
    await migrateEntries([['index.json', JSON.stringify([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }])]], t)
    expect(JSON.parse((await t.read('index.json'))!).map((c: any) => c.id)).toEqual(['a', 'b'])
  })
})
