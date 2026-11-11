import { describe, expect, it } from 'vitest'
import { addTemplate, removeTemplate, renameTemplate, templateKey } from './templates'

describe('modelli', () => {
  it('chiave del layout: senza modello è quella predefinita', () => {
    expect(templateKey('character')).toBe('character')
    expect(templateKey('character', 'k3f')).toBe('character@k3f')
  })
  it('aggiunge, rinomina ed elimina senza toccare gli altri gruppi', () => {
    const m0 = { npc: [{ id: 'n', name: 'Mostro' }] }
    const m1 = addTemplate(m0, 'character', { id: 'a', name: 'Senza platino' })
    expect(m1.character).toEqual([{ id: 'a', name: 'Senza platino' }])
    expect(m1.npc).toBe(m0.npc)
    const m2 = renameTemplate(m1, 'character', 'a', 'Campagna X')
    expect(m2.character[0].name).toBe('Campagna X')
    expect(m1.character[0].name).toBe('Senza platino') // l'originale non cambia
    expect(removeTemplate(m2, 'character', 'a').character).toEqual([])
    expect(removeTemplate(m2, 'altro', 'a').altro).toEqual([])
  })
})
