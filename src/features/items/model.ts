import { f, opts } from '../../core/layoutKit'
import { FieldDef } from '../../core/layouts'
import { Entity } from '../../core/repo'

export type DamageRow = { nome?: string; dado?: string; tipo?: string }
export interface Item extends Entity {
  tipo: 'oggetto' | 'magia'
  danni: DamageRow[]
  extra: Record<string, unknown> // campi personalizzati creati dal layout
  [field: string]: unknown
}

export const newItem = (tipo: Item['tipo']) => ({
  name: tipo === 'magia' ? 'Nuova magia' : 'Nuovo oggetto', tipo, categoria: '', rarita: 'Comune', sintonia: false, valore: '', peso: '', descrizione: '', note: '',
  livello: 0, scuola: 'Evocazione', tempoLancio: '', gittata: '', componenti: '', durata: '', concentrazione: false, rituale: false, classi: '', livelliSuperiori: '',
  danni: [], collegamenti: [], immagini: [], extra: {},
}) as unknown as Omit<Item, keyof Entity> & { name: string }

// Catalogo dei dati disponibili come campo (oggetti e magie condividono lo stesso catalogo; il layout sceglie cosa mostrare).
export const ITEM_FIELDS: FieldDef[] = [
  f('name', 'Nome'), f('tipo', 'Tipo', 'select', [['oggetto', 'Oggetto'], ['magia', 'Magia']]), f('categoria', 'Categoria'),
  f('rarita', 'Rarità', 'select', opts(['Comune', 'Non comune', 'Rara', 'Molto rara', 'Leggendaria', 'Artefatto'])),
  f('sintonia', 'Richiede sintonia', 'check'), f('valore', 'Valore'), f('peso', 'Peso'),
  f('livello', 'Livello (0 = trucchetto)', 'number'),
  f('scuola', 'Scuola', 'select', opts(['Abiurazione', 'Ammaliamento', 'Divinazione', 'Evocazione', 'Illusione', 'Invocazione', 'Necromanzia', 'Trasmutazione'])),
  f('tempoLancio', 'Tempo di lancio'), f('gittata', 'Gittata'), f('componenti', 'Componenti'), f('durata', 'Durata'),
  f('concentrazione', 'Concentrazione', 'check'), f('rituale', 'Rituale', 'check'), f('classi', 'Classi'),
  f('descrizione', 'Descrizione', 'area'), f('livelliSuperiori', 'Ai livelli superiori', 'area'), f('note', 'Note', 'area'),
]
