import Image from '@tiptap/extension-image'
import { imageUrl } from '../../core/images'

// Portato da Lorekeeper. Le opzioni dell'immagine stanno nel "title" markdown come coppie chiave=valore separate da ';':
//   ![](img:<nome file> "align=left;w=40")
// Chiavi sconosciute vengono conservate a ogni salvataggio, quindi si possono aggiungere opzioni senza rompere i file esistenti.
// Il file sta in <campagna>/images/<nome file>.
const ALIGNS = ['left', 'center', 'right', 'full']
export type ImgOpts = { align: string; w: number; [k: string]: string | number }

export const parseImg = (t?: string | null): ImgOpts => {
  const o: any = { align: 'center', w: 60 }
  const s = (t || '').trim()
  if (s.includes('=')) s.split(';').forEach(kv => { const [k, ...v] = kv.split('='); if (k.trim()) o[k.trim()] = v.join('=').trim() })
  o.align = ALIGNS.includes(o.align) ? o.align : 'center'
  o.w = Math.min(100, Math.max(10, +o.w || 60))
  return o
}
export const stringifyImg = (o: ImgOpts) => Object.entries(o).map(([k, v]) => `${k}=${v}`).join(';')

let cid = ''
export const setImageCampaign = (c: string) => { cid = c }

export const AssetImage = Image.extend({
  addNodeView() {
    return ({ node }) => {
      let cur = node
      const dom = document.createElement('div')
      dom.className = 'img-wrap'
      const img = document.createElement('img')
      img.draggable = false
      const src = node.attrs.src as string
      if (src.startsWith('img:')) imageUrl(cid, src.slice(4)).then(u => (img.src = u), () => (img.alt = 'Immagine non trovata'))
      else img.src = src
      dom.append(img)
      const apply = () => {
        const o = parseImg(cur.attrs.title)
        dom.dataset.align = o.align
        dom.style.width = o.align === 'full' ? '100%' : o.w + '%'
      }
      apply()
      return {
        dom,
        update: n => { if (n.type !== cur.type) return false; cur = n; apply(); return true },
        selectNode: () => dom.classList.add('sel'),
        deselectNode: () => dom.classList.remove('sel'),
      }
    }
  },
})
