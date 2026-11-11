import { Entity } from '../../core/repo'
import { FieldDef } from '../../core/layouts'

// Solo DATI e regole di calcolo. Nessuna informazione su dove/come vengono mostrati.
export const ABILITIES = ['for', 'des', 'cos', 'int', 'sag', 'car'] as const
export type Ability = (typeof ABILITIES)[number]
export const ABILITY_LABEL: Record<Ability, string> = { for: 'Forza', des: 'Destrezza', cos: 'Costituzione', int: 'Intelligenza', sag: 'Saggezza', car: 'Carisma' }

export const SKILLS: { key: string; label: string; ab: Ability }[] = [
  { key: 'acrobazia', label: 'Acrobazia', ab: 'des' }, { key: 'addestrare', label: 'Addestrare Animali', ab: 'sag' },
  { key: 'arcano', label: 'Arcano', ab: 'int' }, { key: 'atletica', label: 'Atletica', ab: 'for' },
  { key: 'furtivita', label: 'Furtività', ab: 'des' }, { key: 'indagare', label: 'Indagare', ab: 'int' },
  { key: 'inganno', label: 'Inganno', ab: 'car' }, { key: 'intimidire', label: 'Intimidire', ab: 'car' },
  { key: 'intuizione', label: 'Intuizione', ab: 'sag' }, { key: 'medicina', label: 'Medicina', ab: 'sag' },
  { key: 'natura', label: 'Natura', ab: 'int' }, { key: 'percezione', label: 'Percezione', ab: 'sag' },
  { key: 'persuasione', label: 'Persuasione', ab: 'car' }, { key: 'rapidita', label: 'Rapidità di Mano', ab: 'des' },
  { key: 'religione', label: 'Religione', ab: 'int' }, { key: 'sopravvivenza', label: 'Sopravvivenza', ab: 'sag' },
  { key: 'spettacolo', label: 'Spettacolo', ab: 'car' }, { key: 'storia', label: 'Storia', ab: 'int' },
]

export type Prof = 0 | 1 | 2 // 0 nessuna, 1 competenza, 2 maestria

// Campi di testo lungo: [chiave, etichetta]. Aggiungerne uno qui lo rende subito disponibile nel layout.
export const TEXTS: [string, string][] = [
  ['privilegiClasse', 'Privilegi di classe'], ['trattiSpecie', 'Tratti della specie'], ['talenti', 'Talenti'],
  ['armature', 'Addestramento armature'], ['armi', 'Addestramento armi'], ['strumenti', 'Addestramento strumenti'], ['lingue', 'Linguaggi'],
  ['attacchi', 'Armi e trucchetti di danno'], ['incantesimiNoti', 'Incantesimi'], ['equipaggiamento', 'Equipaggiamento'],
  ['aspetto', 'Aspetto'], ['personalita', 'Tratti caratteriali'], ['ideali', 'Ideali'], ['legami', 'Legami'], ['difetti', 'Difetti'],
  ['storia', 'Storia del personaggio'], ['note', 'Note'],
]
const COINS = { mr: 'Rame', ma: 'Argento', me: 'Electrum', mo: 'Oro', mp: 'Platino' }

export interface Character extends Entity {
  modello?: string // id del modello di scheda in uso (vuoto = predefinito)
  abilitaExtra?: Record<string, { ab?: Ability; add?: Ability[]; flat?: number }> // bonus personalizzati per abilità/tiri salvezza (vedi rules.ts)
  opzioni?: { effetti?: boolean } // applica gli effetti degli oggetti/magie attivi
  background: string; classe: string; sottoclasse: string; specie: string; livello: number; pe: number
  abilita: Record<Ability, number>
  tiriSalvezza: Record<Ability, boolean>
  competenze: Record<string, Prof>
  ca: number; velocita: number; taglia: string; ispirazione: boolean; esaurimento: number
  pf: { max: number; attuali: number; temp: number }
  dadiVita: { tipo: string; totali: number; usati: number }
  tiriMorte: { successi: number; fallimenti: number }
  incantesimi: { car: string }
  slot: Record<string, { max: number; usati: number; liv?: number }> // chiavi "1"…"9" e "patto" (Magia del Patto: liv = livello degli slot)
  monete: Record<keyof typeof COINS, number>
  note: string
  extra: Record<string, unknown> // campi personalizzati creati dal layout
  [text: string]: unknown
}

export const newCharacter = (name: string) => ({
  name, background: '', classe: '', sottoclasse: '', specie: '', livello: 1, pe: 0,
  abilita: { for: 10, des: 10, cos: 10, int: 10, sag: 10, car: 10 },
  tiriSalvezza: { for: false, des: false, cos: false, int: false, sag: false, car: false },
  competenze: {}, abilitaExtra: {}, opzioni: { effetti: false }, ca: 10, velocita: 9, taglia: 'Media', ispirazione: false, esaurimento: 0,
  pf: { max: 1, attuali: 1, temp: 0 }, dadiVita: { tipo: 'd8', totali: 1, usati: 0 }, tiriMorte: { successi: 0, fallimenti: 0 },
  incantesimi: { car: '' },
  slot: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => [String(l), { max: 0, usati: 0 }])),
  monete: { mr: 0, ma: 0, me: 0, mo: 0, mp: 0 },
  attacchiLista: [], incantesimiLista: [], inventarioLista: [], collegamenti: [], immagini: [], ritratto: '', condizioni: [], relazioni: [],
  extra: {}, ...Object.fromEntries(TEXTS.map(([k]) => [k, ''])),
}) as unknown as Omit<Character, keyof Entity> & { name: string }

const f = (path: string, label: string, input: FieldDef['input'] = 'text', options?: [string, string][]): FieldDef => ({ path, label, input, options })
const opts = (xs: string[]) => xs.map(x => [x, x] as [string, string])
// Catalogo dei dati che il layout può mostrare come campo.
export const FIELDS: FieldDef[] = [
  f('name', 'Nome'), f('background', 'Background'), f('classe', 'Classe'), f('sottoclasse', 'Sottoclasse'), f('specie', 'Specie'),
  f('livello', 'Livello', 'number'), f('pe', 'Punti Esperienza', 'number'),
  f('ca', 'Classe Armatura', 'number'), f('velocita', 'Velocità (m)', 'number'),
  f('taglia', 'Taglia', 'select', opts(['Minuscola', 'Piccola', 'Media', 'Grande', 'Enorme', 'Mastodontica'])),
  f('ispirazione', 'Ispirazione Eroica', 'check'), f('esaurimento', 'Esaurimento', 'number'),
  f('pf.attuali', 'PF attuali', 'number'), f('pf.max', 'PF massimi', 'number'), f('pf.temp', 'PF temporanei', 'number'),
  f('dadiVita.tipo', 'Dado Vita', 'select', opts(['d6', 'd8', 'd10', 'd12'])), f('dadiVita.totali', 'Dadi Vita totali', 'number'), f('dadiVita.usati', 'Dadi Vita usati', 'number'),
  f('tiriMorte.successi', 'Tiri morte: successi', 'number'), f('tiriMorte.fallimenti', 'Tiri morte: fallimenti', 'number'),
  f('incantesimi.car', 'Caratteristica da incantatore', 'select', [['', '—'], ...ABILITIES.map(a => [a, ABILITY_LABEL[a]] as [string, string])]),
  ...(Object.entries(COINS)).map(([k, l]) => f('monete.' + k, 'Monete: ' + l.toLowerCase(), 'number')),
  ...TEXTS.map(([k, l]) => f(k, l, 'area')),
]

export const mod = (score: number) => Math.floor((score - 10) / 2)
export const bonusCompetenza = (lv: number) => Math.ceil(lv / 4) + 1
export const bonusAbilita = (c: Character, a: Ability, prof: Prof) => mod(c.abilita[a]) + prof * bonusCompetenza(c.livello)
export const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`)
