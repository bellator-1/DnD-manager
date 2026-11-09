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
