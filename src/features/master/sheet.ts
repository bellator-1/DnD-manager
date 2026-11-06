import { kit } from '../../core/layoutKit'
import { KindDef } from '../../core/SheetView'
import { linkListBlock } from '../shared/Links'
import { MASTER_FIELDS } from './model'

// Lo spazio del master usa lo stesso motore delle schede: sezioni libere, ognuna con elenchi di collegamenti (anche più elenchi per sezione) e campi di testo.
const { fld, blk, grp } = kit('mm', MASTER_FIELDS)
const sec = (title: string, filter: string, x: number, y: number, w: number) => grp(title, 1, [blk('linklist', { filter })], x, y, w)

export const MASTER_KIND: KindDef = {
  blocks: { linklist: linkListBlock },
  fields: MASTER_FIELDS,
  defaults: [
    grp('Appunti del master', 1, [fld('appunti')], 0, 0, 12),
    sec('Personaggi', 'characters', 0, 10, 4), sec('PNG e creature', 'npcs', 4, 10, 4), sec('Mappe', 'maps', 8, 10, 4),
    sec('Oggetti', 'items', 0, 24, 4), sec('Magie', 'spells', 4, 24, 4), sec('Note', 'notes', 8, 24, 4),
    sec('Sessioni', 'sessions', 0, 38, 12),
  ],
}
