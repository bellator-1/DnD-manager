import { PointerEvent as RPE, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { removeImage, saveImage, useImageUrl } from '../../core/images'
import type { Cfg } from '../../core/layouts'
import type { BlockDef, Setter } from '../../core/SheetView'

// «Immagini»: galleria nel campo «immagini» (nomi dei file in <campagna>/images/). Le foto grandi vengono ridotte a 1600 px.
// Cosa si vede (didascalie, pulsante aggiungi, pulsante elimina, ridimensionamento) si sceglie dal layout manager, nelle impostazioni ⚙ del blocco.
interface Img { src: string; cap?: string; w?: number } // w = larghezza in % della riga
const clampW = (w: number) => Math.min(100, Math.max(10, Math.round(w)))

function Tile({ im, cfg, onChange, onDelete, onOpen }: { im: Img; cfg: Cfg; onChange: (p: Partial<Img>) => void; onDelete: () => void; onOpen: (url: string) => void }) {
  const url = useImageUrl(im.src)
  const box = useRef<HTMLDivElement>(null)
  const w = im.w ?? 33
  const drag = (e: RPE) => {
    e.preventDefault(); e.stopPropagation()
    const row = box.current!.parentElement!.getBoundingClientRect().width, x0 = e.clientX
    const mv = (ev: PointerEvent) => onChange({ w: clampW(w + ((ev.clientX - x0) / row) * 100) })
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', () => window.removeEventListener('pointermove', mv), { once: true })
  }
  return (
    <div ref={box} className="space-y-1" style={{ flex: `0 0 calc(${w}% - 0.5rem)`, maxWidth: 'calc(100% - 0.5rem)' }}>
      <div className="relative">
        {url
          ? <button className="block w-full" title="Ingrandisci" onClick={() => onOpen(url)}><img src={url} alt={im.cap ?? ''} className="block h-auto w-full rounded" /></button>
          : <div className="aspect-square rounded bg-ink" />}
        {cfg.resize && <span className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize bg-brass/80" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} title="Trascina per ridimensionare" onPointerDown={drag} />}
      </div>
      {(cfg.caption || cfg.resize || cfg.del) && (
        <div className="flex items-center gap-1">
          {cfg.caption && <input className="field min-w-0 px-1 text-xs" placeholder="Didascalia" aria-label="Didascalia" value={im.cap ?? ''} onChange={e => onChange({ cap: e.target.value })} />}
          {cfg.resize && <>
            <button className="btn px-1.5 py-0" title="Riduci" aria-label="Riduci l'immagine" onClick={() => onChange({ w: clampW(w - 10) })}>−</button>
            <button className="btn px-1.5 py-0" title="Ingrandisci" aria-label="Ingrandisci l'immagine" onClick={() => onChange({ w: clampW(w + 10) })}>+</button>
          </>}
          {cfg.del && <button className="btn px-1.5 py-0" title="Rimuovi l'immagine" aria-label="Rimuovi l'immagine" onClick={() => confirm("Rimuovere l'immagine?") && onDelete()}>✕</button>}
        </div>
      )}
    </div>
  )
}

function ImagesView({ c, set, cfg }: { c: any; set: Setter; cfg: Cfg }) {
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
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {list.map((im, i) => (
          <Tile key={im.src} im={im} cfg={cfg} onOpen={setBig}
            onChange={p => set('immagini', list.map((x, k) => (k === i ? { ...x, ...p } : x)))}
            onDelete={() => { set('immagini', list.filter((_, k) => k !== i)); removeImage(cid, im.src).catch(() => {}) }} />
        ))}
      </div>
      {cfg.add && <>
        <input ref={file} type="file" accept="image/*" multiple hidden onChange={e => { if (e.target.files) add(e.target.files); e.target.value = '' }} />
        <button className="btn" onClick={() => file.current?.click()}>+ Aggiungi immagini</button>
      </>}
      {!list.length && !cfg.add && <p className="text-sm opacity-60">Nessuna immagine.</p>}
      {big && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setBig(null)}><img src={big} alt="" className="max-h-full max-w-full rounded" /></div>}
    </div>
  )
}

export const imagesBlock: BlockDef = {
  label: 'Immagini',
  cfg: { caption: true, add: true, del: true, resize: true },
  C: ({ c, set, cfg }) => <ImagesView c={c} set={set} cfg={cfg} />,
  props: [
    { key: 'caption', label: 'Mostra le didascalie' },
    { key: 'add', label: 'Mostra il pulsante «aggiungi immagini»' },
    { key: 'del', label: 'Mostra il pulsante elimina' },
    { key: 'resize', label: 'Permetti il ridimensionamento' },
  ],
}

// «Ritratto»: un'immagine incorniciata di base per le schede (campo «ritratto»). Clic per scegliere o cambiare; si mette accanto all'intestazione.
function PortraitView({ c, set, cfg }: { c: any; set: Setter; cfg: Cfg }) {
  const { cid = '' } = useParams()
  const file = useRef<HTMLInputElement>(null)
  const url = useImageUrl(c.ritratto || undefined)
  const pick = async (f: File) => {
    try {
      const name = await saveImage(cid, f, 1200)
      if (c.ritratto) removeImage(cid, c.ritratto).catch(() => {})
      set('ritratto', name)
    } catch (e) { alert(`Impossibile salvare l'immagine: ${(e as Error).message}`) }
  }
  return (
    <div className="space-y-1">
      <button className="relative block aspect-[3/4] w-full overflow-hidden rounded-lg border-4 border-double border-brass bg-ink" title={c.ritratto ? 'Cambia il ritratto' : 'Aggiungi un ritratto'} onClick={() => file.current?.click()}>
        {url ? <img src={url} alt="Ritratto" className="h-full w-full object-cover" /> : <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-sm opacity-60">＋ Ritratto</span>}
      </button>
      <input ref={file} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = '' }} />
      {c.ritratto && cfg.del && <button className="btn w-full py-0 text-xs" onClick={() => { removeImage(cid, c.ritratto).catch(() => {}); set('ritratto', '') }}>Rimuovi il ritratto</button>}
    </div>
  )
}
export const portraitBlock: BlockDef = {
  label: 'Ritratto',
  cfg: { del: true },
  C: ({ c, set, cfg }) => <PortraitView c={c} set={set} cfg={cfg} />,
  props: [{ key: 'del', label: 'Mostra il pulsante rimuovi' }],
}
