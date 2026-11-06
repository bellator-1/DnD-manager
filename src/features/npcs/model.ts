import { f, opts } from '../../core/layoutKit'
import { FieldDef } from '../../core/layouts'
import { Entity } from '../../core/repo'

export interface Npc extends Entity {
  tipo: 'PNG' | 'Animale' | 'Creatura'
  abilita: Record<string, number>
  pf: { max: number; attuali: number; temp: number }
  azioni: { nome?: string; bonus?: number; danni?: string; tipo?: string }[]
  extra: Record<string, unknown>
  [field: string]: unknown
}

const TEXT_KEYS = ['creatura', 'allineamento', 'gs', 'ruolo', 'atteggiamento', 'velocita', 'sensi', 'linguaggi', 'abilitaTesto', 'tiriSalvezzaTesto', 'resistenze', 'immunita', 'vulnerabilita', 'tratti', 'reazioni', 'azioniLeggendarie', 'descrizione', 'note']

export const newNpc = (tipo: Npc['tipo']) => ({
  name: tipo === 'PNG' ? 'Nuovo PNG' : tipo === 'Animale' ? 'Nuovo animale' : 'Nuova creatura', tipo, taglia: 'Media', ca: 10,
  abilita: { for: 10, des: 10, cos: 10, int: 10, sag: 10, car: 10 }, tiriSalvezza: {},
  pf: { max: 1, attuali: 1, temp: 0 }, azioni: [], collegamenti: [], immagini: [], extra: {}, ...Object.fromEntries(TEXT_KEYS.map(k => [k, ''])),
}) as unknown as Omit<Npc, keyof Entity> & { name: string }

// Versione semplificata della scheda del giocatore: niente livelli di classe, abilità, slot…
export const NPC_FIELDS: FieldDef[] = [
  f('name', 'Nome'), f('tipo', 'Categoria', 'select', opts(['PNG', 'Animale', 'Creatura'])), f('creatura', 'Tipo di creatura'),
  f('taglia', 'Taglia', 'select', opts(['Minuscola', 'Piccola', 'Media', 'Grande', 'Enorme', 'Mastodontica'])),
  f('allineamento', 'Allineamento'), f('gs', 'Grado Sfida / livello'), f('ruolo', 'Ruolo o professione'), f('atteggiamento', 'Atteggiamento'),
  f('ca', 'Classe Armatura', 'number'), f('pf.attuali', 'PF attuali', 'number'), f('pf.max', 'PF massimi', 'number'), f('pf.temp', 'PF temporanei', 'number'),
  f('velocita', 'Velocità'), f('sensi', 'Sensi'), f('linguaggi', 'Linguaggi'), f('abilitaTesto', 'Abilità'), f('tiriSalvezzaTesto', 'Tiri salvezza'),
  f('resistenze', 'Resistenze'), f('immunita', 'Immunità'), f('vulnerabilita', 'Vulnerabilità'),
  f('tratti', 'Tratti', 'area'), f('reazioni', 'Reazioni', 'area'), f('azioniLeggendarie', 'Azioni leggendarie', 'area'),
  f('descrizione', 'Descrizione', 'area'), f('note', 'Note', 'area'),
]
