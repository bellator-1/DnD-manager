import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { removeImage, saveImage, useImageUrl } from '../../core/images'
import type { BlockDef, Setter } from '../../core/SheetView'

// Blocco «Immagini»: galleria con didascalie, salvata nel campo «immagini» (nomi dei file in <campagna>/images/). Le foto grandi vengono ridotte a 1600 px.
interface Img { src: string; cap?: string }

function Thumb({ name, onOpen }: { name: string; onOpen: (url: string) => void }) {
  const url = useImageUrl(name)
  return url
    ? <button className="block w-full" title="Ingrandisci" onClick={() => onOpen(url)}><img src={url} alt="" className="h-28 w-full rounded object-cover" /></button>
    : <div className="h-28 rounded bg-ink" />
}

function ImagesView({ c, set }: { c: any; set: Setter }) {
  const { cid = '' } = useParams()
  const file = useRef<HTMLInputElement>(null)
  const [big, setBig] = useState<string | null>(null)
  const list: Img[] = c.immagini ?? []
  useEffect(() => {
    if (!big) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setBig(null)
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [big])
  const add = async (files: FileList) => {
    try {
      const names = await Promise.all([...files].filter(f => f.type.startsWith('image/')).map(f => saveImage(cid, f, 1600)))
      set('immagini', [...list, ...names.map(src => ({ src }))])
    } catch (e) { alert(`Impossibile salvare l'immagine: ${(e as Error).message}`) }
  }
  const del = (i: number) => { const x = list[i]; set('immagini', list.filter((_, k) => k !== i)); removeImage(cid, x.src).catch(() => {}) }
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {list.map((im, i) => (
          <div key={im.src} className="space-y-1">
            <Thumb name={im.src} onOpen={setBig} />
            <div className="flex gap-1">
              <input className="field min-w-0 px-1 text-xs" placeholder="Didascalia" aria-label="Didascalia" value={im.cap ?? ''} onChange={e => set('immagini', list.map((x, k) => (k === i ? { ...x, cap: e.target.value } : x)))} />
              <button className="btn px-1.5 py-0" title="Rimuovi l'immagine" aria-label="Rimuovi l'immagine" onClick={() => confirm("Rimuovere l'immagine?") && del(i)}>✕</button>
            </div>
          </div>
        ))}
      </div>
      <input ref={file} type="file" accept="image/*" multiple hidden onChange={e => { if (e.target.files) add(e.target.files); e.target.value = '' }} />
      <button className="btn" onClick={() => file.current?.click()}>+ Aggiungi immagini</button>
      {big && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setBig(null)}><img src={big} alt="" className="max-h-full max-w-full rounded" /></div>}
    </div>
  )
}

export const imagesBlock: BlockDef = { label: 'Immagini', C: ({ c, set }) => <ImagesView c={c} set={set} /> }
