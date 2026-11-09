import { describe, expect, it } from 'vitest'
import { imageUrl, removeImage, saveImage } from './images'
import { MemoryStore } from './memoryStore'
import { setStore } from './storage'

describe('images', () => {
  it('salva un\'immagine come file nella cartella images con estensione giusta', async () => {
    const s = new MemoryStore(); setStore(s)
    const name = await saveImage('c', new Blob([new Uint8Array([7, 7])], { type: 'image/png' }))
    expect(name.endsWith('.png')).toBe(true)
    expect(s.keys()).toEqual([`c/images/${name}`])
  })
  it('rimuove il file', async () => {
    const s = new MemoryStore(); setStore(s)
    const name = await saveImage('c', new Blob(['x'], { type: 'image/webp' }))
    await removeImage('c', name)
    expect(s.keys()).toEqual([])
  })
  it('riusa lo stesso URL per la stessa immagine e segnala quelle mancanti', async () => {
    const s = new MemoryStore(); setStore(s)
    const name = await saveImage('c', new Blob(['x'], { type: 'image/jpeg' }))
    const a = await imageUrl('c', name), b = await imageUrl('c', name)
    expect(a).toBe(b)
    await expect(imageUrl('c', 'non-esiste.png')).rejects.toThrow()
  })
})
