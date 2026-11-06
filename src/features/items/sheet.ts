import { kit } from '../../core/layoutKit'
import { rowsBlock } from '../../core/Rows'
import { BlockDef, KindDef } from '../../core/SheetView'
import { imagesBlock } from '../shared/Images'
import { linksBlock } from '../shared/Links'
import { ITEM_FIELDS } from './model'

const blocks: Record<string, BlockDef> = {
  links: linksBlock,
  images: imagesBlock,
  damage: rowsBlock('Danni ed effetti', 'danni', [
    { key: 'nome', label: 'Nome', w: '3' }, { key: 'dado', label: 'Dado (es. 2d6+3)', w: '3', roll: 'dice' }, { key: 'tipo', label: 'Tipo', w: '2' }], 'danno'),
}

const o = kit('io', ITEM_FIELDS)
export const OBJECT_KIND: KindDef = {
  blocks, fields: ITEM_FIELDS,
  defaults: [
    o.grp('Intestazione', 4, ['name', 'categoria', 'rarita', 'sintonia', 'valore', 'peso'].map(o.fld), 0, 0, 12),
    o.grp('Descrizione', 1, [o.fld('descrizione')], 0, 8, 8),
    o.grp('Danni ed effetti', 1, [o.blk('damage')], 8, 8, 4),
    o.grp('Note', 1, [o.fld('note')], 0, 30, 12),
    o.grp('Collegamenti', 1, [o.blk('links')], 0, 60, 12),
    o.grp('Immagini', 1, [o.blk('images')], 0, 70, 12),
  ],
}

const m = kit('im', ITEM_FIELDS)
export const SPELL_KIND: KindDef = {
  blocks, fields: ITEM_FIELDS,
  defaults: [
    m.grp('Intestazione', 4, ['name', 'livello', 'scuola', 'concentrazione', 'rituale', 'classi'].map(m.fld), 0, 0, 12),
    m.grp('Lancio', 1, ['tempoLancio', 'gittata', 'componenti', 'durata'].map(m.fld), 0, 8, 4),
    m.grp('Descrizione', 1, [m.fld('descrizione'), m.fld('livelliSuperiori')], 4, 8, 8),
    m.grp('Danni ed effetti', 1, [m.blk('damage')], 0, 30, 4),
    m.grp('Note', 1, [m.fld('note')], 4, 30, 8),
    m.grp('Collegamenti', 1, [m.blk('links')], 0, 60, 12),
    m.grp('Immagini', 1, [m.blk('images')], 0, 70, 12),
  ],
}
