import { describe, expect, it } from 'vitest'
import { buildExport, importCampaign, scanOrphanImages } from './backup'
import { MemoryStore } from './memoryStore'
import { repo } from './repo'
import { setStore } from './storage'

const png = (...bytes: number[]) => new Blob([new Uint8Array(bytes)], { type: 'image/png' })
const bytesOf = async (b: Blob | null) => [...new Uint8Array(await b!.arrayBuffer())]

async function seeded() {
  const s = new MemoryStore()
  setStore(s)
  await repo.saveCampaigns([{ id: 'c1', name: 'Camp' }])
  await s.write('c1/characters/a.json', JSON.stringify({ id: 'a', name: 'Aria', immagini: [{ src: 'img1.png' }] }))
  await s.writeBlob('c1/images/img1.png', png(1, 2, 3, 4))
  await s.writeBlob('c1/images/zzz.png', png(9, 9))
  await s.write('c1/manual-files/m.index.json', 'testo del manuale')
  await s.writeBlob('c1/manual-files/m.pdf', new Blob(['%PDF']))
  return s
}

describe('backup', () => {
  it('esporta file e immagini ma non i PDF dei manuali né il loro testo', async () => {
    await seeded()
    const d = JSON.parse(await buildExport({ id: 'c1', name: 'Camp' }))
    expect(Object.keys(d.files).sort()).toEqual(['characters/a.json', 'images/img1.png', 'images/zzz.png'])
    expect(d.binary.sort()).toEqual(['images/img1.png', 'images/zzz.png'])
  })

  it('importa in una campagna nuova, con file e immagini identici', async () => {
    const s = await seeded()
    const json = await buildExport({ id: 'c1', name: 'Camp' })
    const c2 = await importCampaign(new File([json], 'b.json'))
    expect(c2.name).toBe('Camp (importata)')
    expect(c2.id === 'c1').toBe(false)
    expect((await repo.campaigns()).length).toBe(2)
    expect(JSON.parse((await s.read(`${c2.id}/characters/a.json`))!).name).toBe('Aria')
    expect(await bytesOf(await s.readBlob(`${c2.id}/images/img1.png`))).toEqual([1, 2, 3, 4])
    expect(await bytesOf(await s.readBlob('c1/images/img1.png'))).toEqual([1, 2, 3, 4]) // l'originale non cambia
  })

  it('rifiuta file che non sono backup', async () => {
    await seeded()
    await expect(importCampaign(new File(['{"x":1}'], 'x.json'))).rejects.toThrow()
    await expect(importCampaign(new File(['non json'], 'x.json'))).rejects.toThrow()
  })

  it('ignora i percorsi pericolosi', async () => {
    const s = await seeded()
    const evil = JSON.stringify({ format: 'dnd-manage-campaign', version: 2, campaign: { name: 'X' }, binary: [], files: { '../evil.json': '{}', '/abs.json': '{}', 'ok.json': '{}' } })
    const c = await importCampaign(new File([evil], 'e.json'))
    expect(s.keys().some(k => k.includes('..') || k.includes('evil') || k.includes('abs'))).toBe(false)
    expect(await s.read(`${c.id}/ok.json`)).toBe('{}')
  })

  it('se l\'importazione fallisce non lascia niente a metà', async () => {
    class Boom extends MemoryStore { async write(p: string, c: string) { if (p.endsWith('boom.json')) throw new Error('disco pieno'); return super.write(p, c) } }
    const s = new Boom(); setStore(s)
    await repo.saveCampaigns([])
    const before = s.keys()
    const bad = JSON.stringify({ format: 'dnd-manage-campaign', version: 2, campaign: { name: 'B' }, binary: [], files: { 'a.json': '{}', 'boom.json': '{}' } })
    await expect(importCampaign(new File([bad], 'b.json'))).rejects.toThrow()
    expect(s.keys()).toEqual(before)
    expect((await repo.campaigns()).length).toBe(0)
  })

  it('trova le immagini che nessun file usa più', async () => {
    await seeded()
    const r = await scanOrphanImages('c1')
    expect(r.orphans).toEqual(['zzz.png'])
    expect(r.bytes).toBe(2)
  })
})
