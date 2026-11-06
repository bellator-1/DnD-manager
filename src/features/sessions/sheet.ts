import { kit } from '../../core/layoutKit'
import { KindDef } from '../../core/SheetView'
import { imagesBlock } from '../shared/Images'
import { linksBlock } from '../shared/Links'
import { SESSION_FIELDS } from './model'

const { fld, blk, grp } = kit('ss', SESSION_FIELDS)
export const SESSION_KIND: KindDef = {
  blocks: { links: linksBlock, images: imagesBlock },
  fields: SESSION_FIELDS,
  defaults: [
    grp('Intestazione', 3, [fld('name'), fld('numero'), fld('data')], 0, 0, 12),
    grp('Riassunto', 1, [fld('riassunto')], 0, 8, 6),
    grp('Eventi e decisioni', 1, [fld('eventi')], 6, 8, 6),
    grp('Da preparare', 1, [fld('prossimi')], 0, 24, 12),
    grp('Collegamenti', 1, [blk('links')], 0, 34, 12),
    grp('Immagini', 1, [blk('images')], 0, 44, 12),
  ],
}
