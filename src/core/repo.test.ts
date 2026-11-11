import { describe, expect, it } from 'vitest'
import { MemoryStore } from './memoryStore'
import { repo } from './repo'
import { setStore } from './storage'

describe('repo', () => {
  it('l\'elenco delle campagne corrotto o mancante diventa una lista vuota', async () => {
    const s = new MemoryStore(); setStore(s)
    expect(await repo.campaigns()).toEqual([])
    await s.write('index.json', '{non valido')
    expect(await repo.campaigns()).toEqual([])
  })
  it('elenca gli elementi in ordine alfabetico saltando file non validi e non JSON', async () => {
    const s = new MemoryStore(); setStore(s)
    await s.write('c/notes/1.json', JSON.stringify({ id: '1', name: 'Zeta' }))
    await s.write('c/notes/2.json', JSON.stringify({ id: '2', name: 'Alfa' }))
    await s.write('c/notes/3.json', 'rotto')
    await s.write('c/notes/4.txt', 'non json')
    expect((await repo.list<any>('c', 'notes')).map(e => e.name)).toEqual(['Alfa', 'Zeta'])
  })
  it('salva e rimuove un elemento', async () => {
    const s = new MemoryStore(); setStore(s)
    await repo.save('c', 'items', { id: 'x', name: 'Spada', schemaVersion: 1, updatedAt: 0 })
    expect((await repo.list<any>('c', 'items')).length).toBe(1)
    await repo.remove('c', 'items', 'x')
    expect((await repo.list<any>('c', 'items')).length).toBe(0)
  })
})

describe('cestino', () => {
  const mk = (id: string, name: string, extra: object = {}) => ({ id, name, schemaVersion: 1, updatedAt: 0, ...extra })
  it('eliminare sposta nel cestino e ripristinare rimette tutto com\'era', async () => {
    const s = new MemoryStore(); setStore(s)
    await repo.save('c', 'items', mk('x', 'Spada', { danni: [{ dado: '1d8' }] }))
    await repo.remove('c', 'items', 'x')
    expect((await repo.list<any>('c', 'items')).length).toBe(0)
    const t = await repo.trash.list('c')
    expect(t.length).toBe(1)
    expect(t[0].kind).toBe('items')
    expect(t[0].entity.name).toBe('Spada')
    await repo.trash.restore('c', 'items', 'x')
    const back = await repo.list<any>('c', 'items')
    expect(back.length).toBe(1)
    expect(back[0].danni).toEqual([{ dado: '1d8' }])
    expect((await repo.trash.list('c')).length).toBe(0)
  })
  it('elimina definitivamente e svuota', async () => {
    const s = new MemoryStore(); setStore(s)
    await repo.save('c', 'notes', mk('a', 'A')); await repo.save('c', 'maps', mk('b', 'B'))
    await repo.remove('c', 'notes', 'a'); await repo.remove('c', 'maps', 'b')
    expect((await repo.trash.list('c')).length).toBe(2)
    await repo.trash.purge('c', 'notes', 'a')
    expect((await repo.trash.list('c')).map(t => t.kind)).toEqual(['maps'])
    await repo.trash.empty('c')
    expect((await repo.trash.list('c')).length).toBe(0)
  })
  it('removeHard non passa dal cestino', async () => {
    const s = new MemoryStore(); setStore(s)
    await repo.save('c', 'manuals', mk('m', 'Manuale'))
    await repo.removeHard('c', 'manuals', 'm')
    expect((await repo.trash.list('c')).length).toBe(0)
  })
  it('i file di versioni precedenti si aggiornano alla lettura', async () => {
    const s = new MemoryStore(); setStore(s)
    await s.write('c/characters/1.json', JSON.stringify({ id: '1', name: 'Vecchio', schemaVersion: 1 }))
    const l = await repo.list<any>('c', 'characters')
    expect(l[0].abilitaExtra).toEqual({})
    expect(l[0].schemaVersion).toBe(2)
  })
  it('un file di una versione futura non si riscrive', async () => {
    const s = new MemoryStore(); setStore(s)
    let msg = ''
    try { await repo.save('c', 'characters', mk('f', 'Futuro', { schemaVersion: 99 })) } catch (e) { msg = (e as Error).message }
    expect(msg).toContain('versione più recente')
    expect(await s.read('c/characters/f.json')).toBeNull()
  })
})
