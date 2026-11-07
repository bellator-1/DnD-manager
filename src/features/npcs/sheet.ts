import { kit } from '../../core/layoutKit'
import { rowsBlock } from '../../core/Rows'
import { BlockDef, KindDef } from '../../core/SheetView'
import { ABILITIES, ABILITY_LABEL } from '../characters/model'
import { AbilityBlock, HpBlock } from '../characters/sheet'
import { itemSummary } from '../items/summary'
import { imagesBlock, portraitBlock } from '../shared/Images'
import { linksBlock } from '../shared/Links'
import { NPC_FIELDS } from './model'

// Riusa i blocchi della scheda del giocatore (stessi percorsi dati: abilita, pf) più un elenco di azioni.
const blocks: Record<string, BlockDef> = {
  ability: { label: 'Caratteristica', C: AbilityBlock, cfg: { ability: 'for', save: false, skills: false },
    props: [{ key: 'ability', label: 'Caratteristica', options: ABILITIES.map(a => [a, ABILITY_LABEL[a]] as [string, string]) }] },
  hp: { label: 'Punti ferita', C: HpBlock },
  links: linksBlock,
  images: imagesBlock,
  portrait: portraitBlock,
  actions: rowsBlock('Azioni', 'azioni', [
    { key: 'nome', label: 'Nome', w: '3' }, { key: 'bonus', label: 'Att.', num: true, roll: 'attack', w: '2' },
    { key: 'danni', label: 'Danni', roll: 'dice', w: '3' }, { key: 'tipo', label: 'Tipo', w: '2' }], 'azione', { kind: 'items', noun: 'armi, oggetti o magie', summary: itemSummary }),
}

const { fld, blk, sub, grp } = kit('np', NPC_FIELDS)
export const NPC_KIND: KindDef = {
  blocks, fields: NPC_FIELDS,
  defaults: [
    grp('Intestazione', 3, ['name', 'tipo', 'creatura', 'taglia', 'allineamento', 'gs', 'ruolo', 'atteggiamento'].map(fld), 0, 0, 9),
    grp('Ritratto', 1, [blk('portrait')], 9, 0, 3),
    grp('Statistiche', 1, [blk('hp'), sub('Stato', 2, [fld('ca'), fld('velocita')])], 0, 8, 4),
    grp('Caratteristiche', 3, ABILITIES.map(a => blk('ability', { ability: a, save: false, skills: false })), 4, 8, 8),
    grp('Azioni', 1, [blk('actions'), fld('reazioni'), fld('azioniLeggendarie')], 0, 24, 6),
    grp('Tratti e difese', 1, ['tratti', 'resistenze', 'immunita', 'vulnerabilita', 'sensi', 'linguaggi', 'abilitaTesto', 'tiriSalvezzaTesto'].map(fld), 6, 24, 6),
    grp('Descrizione e note', 2, [fld('descrizione'), fld('note')], 0, 50, 12),
    grp('Collegamenti', 1, [blk('links')], 0, 80, 12),
    grp('Immagini', 1, [blk('images')], 0, 90, 12),
  ],
}
