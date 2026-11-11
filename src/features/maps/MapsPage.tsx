import { PointerEvent as RPE, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { nid } from '../../core/layouts'
import { SidePanel, usePersisted } from '../../core/SidePanel'
import { store } from '../../core/storage'
import { saveImage, useImageUrl } from '../../core/images'
import { tracked } from '../../core/saveStatus'
import { useEntities } from '../../core/useEntities'
import { Layer, MapDoc, Pt, Shape, newLayers } from './model'
import { alertDialog, confirmDialog, promptDialog } from '../../core/dialog'
import { Info } from '../../core/Info'

type Tool = 'pan' | 'pen' | 'route' | 'area' | 'marker' | 'erase'
const TOOLS: [Tool, string, string][] = [
  ['pan', 'Mano', 'Trascina per spostare la mappa, rotella per lo zoom; clic su una forma per selezionarla'],
  ['pen', 'Penna', 'Tieni premuto e disegna a mano libera'],
  ['route', 'Rotta', 'Clic per ogni tappa; doppio clic o Invio per finire, Esc per annullare'],
  ['area', 'Confine', 'Clic per ogni vertice; doppio clic o Invio per chiudere, Esc per annullare'],
  ['marker', 'Segnaposto', 'Clic dove metterlo'],
  ['erase', 'Gomma', 'Clic su una forma per cancellarla'],
]
function MapsHelp() {
  return (
    <>
      <p>Disegna sopra la tua immagine: le forme sono vettoriali (restano nitide a ogni zoom) e stanno in <b>livelli</b> che puoi mostrare, nascondere ed eliminare.</p>
      <ul className="list-disc space-y-1 pl-5">
        {TOOLS.map(([t, l, h]) => <li key={t}><b>{l}</b>: {h}.</li>)}
        <li><b>Livelli</b>: si disegna sul livello attivo (✎). Usa «Livelli» per aggiungerne, rinominarli o cambiare colore.</li>
        <li><b>Loop orizzontale</b>: per mappe del mondo che si ripetono ai lati; le rotte attraversano il bordo senza salti.</li>
        <li><b>↶ ↷</b> annullano e ripetono (Ctrl+Z, Ctrl+Maiusc+Z). <b>Adatta</b> riporta la mappa tutta in vista.</li>
      </ul>
    </>
  )
}

interface Draft { type: 'route' | 'area' | 'pen'; pts: Pt[] }

// Forme in SVG sopra l'immagine (invece di un canvas): selezione e cancellazione sono immediate e il tratto resta nitido a ogni zoom.
function MapView({ m, src, update, onDelete }: { m: MapDoc; src: string | null; update: (m: MapDoc) => void; onDelete: () => void }) {
  const [tool, setTool] = useState<Tool>('pan')
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [cursor, setCursor] = useState<Pt | null>(null)
  const [selShape, setSelShape] = useState<string | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [panel, patchPanel] = usePersisted('ui:maplayers', { open: true })
  const box = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<{ x0: number; y0: number; vx: number; vy: number } | null>(null)
  const moved = useRef(false)
  const fitted = useRef(false)
  const activeId = m.layers.some(l => l.id === m.active) ? m.active : m.layers[0]?.id

  const wrap = (v: { x: number; y: number; k: number }) => {
    if (!m.loop) return v
    const p = m.w * v.k; let x = v.x % p; if (x > 0) x -= p
    return { ...v, x }
  }
  const fit = () => {
    if (!size.w) return
    const k = m.loop ? size.h / m.h : Math.min(size.w / m.w, size.h / m.h)
    setView({ k, x: m.loop ? 0 : (size.w - m.w * k) / 2, y: (size.h - m.h * k) / 2 })
  }
  useEffect(() => {
    const el = box.current; if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el); return () => ro.disconnect()
  }, [])
  useEffect(() => { if (size.w && !fitted.current) { fitted.current = true; fit() } }, [size.w])
  useEffect(() => { // zoom con la rotella attorno al cursore (listener nativo: deve poter chiamare preventDefault)
    const el = svg.current; if (!el) return
    const h = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect(), cx = e.clientX - r.left, cy = e.clientY - r.top
      setView(v => {
        const kmin = m.loop ? size.w / (2.5 * m.w) : 0.05
        const k = Math.min(20, Math.max(kmin, v.k * (e.deltaY < 0 ? 1.15 : 1 / 1.15))), f = k / v.k
        return wrap({ k, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f })
      })
    }
    el.addEventListener('wheel', h, { passive: false }); return () => el.removeEventListener('wheel', h)
  }, [m.loop, m.w, size.w])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return }
      if (e.key === 'Escape') { setDraft(null); setCursor(null) }
      if (e.key === 'Enter') finish()
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  })

  // Cronologia delle modifiche ai livelli e alle forme (le raffiche ravvicinate, come scrivere un'etichetta, contano come un passo).
  const past = useRef<{ layers: Layer[]; active: string }[]>([])
  const future = useRef<{ layers: Layer[]; active: string }[]>([])
  const lastCommit = useRef(0)
  const [, bump] = useState(0)
  const commit = (next: MapDoc, merge = false) => {
    const now = Date.now()
    if (!(merge && now - lastCommit.current < 800)) { past.current = [...past.current.slice(-49), { layers: m.layers, active: m.active }]; future.current = []; bump(n => n + 1) }
    lastCommit.current = now
    update(next)
  }
  const undo = () => { const p = past.current.pop(); if (!p) return; future.current.push({ layers: m.layers, active: m.active }); update({ ...m, ...p }); bump(n => n + 1) }
  const redo = () => { const f = future.current.pop(); if (!f) return; past.current.push({ layers: m.layers, active: m.active }); update({ ...m, ...f }); bump(n => n + 1) }
  const setLayers = (f: (ls: Layer[]) => Layer[], merge = false) => commit({ ...m, layers: f(m.layers) }, merge)
  const addShape = (s: Omit<Shape, 'id'>) => setLayers(ls => ls.map(l => (l.id === activeId ? { ...l, shapes: [...l.shapes, { ...s, id: nid() }] } : l)))
  const delShape = (id: string) => { setLayers(ls => ls.map(l => ({ ...l, shapes: l.shapes.filter(s => s.id !== id) }))); setSelShape(null) }
  const patchShape = (id: string, p: Partial<Shape>) => setLayers(ls => ls.map(l => ({ ...l, shapes: l.shapes.map(s => (s.id === id ? { ...s, ...p } : s)) })), true)
  const patchLayer = (id: string, p: Partial<Layer>) => setLayers(ls => ls.map(l => (l.id === id ? { ...l, ...p } : l)), true)

  const toWorld = (e: { clientX: number; clientY: number }): Pt => {
    const r = svg.current!.getBoundingClientRect()
    return [(e.clientX - r.left - view.x) / view.k, (e.clientY - r.top - view.y) / view.k]
  }
  // Con la mappa in loop ogni punto sceglie la copia più vicina al precedente, così le rotte attraversano il bordo senza salti.
  const norm = (p: Pt, prev?: Pt): Pt => {
    const y = Math.min(m.h, Math.max(0, p[1]))
    if (!m.loop) return [Math.min(m.w, Math.max(0, p[0])), y]
    if (!prev) return [((p[0] % m.w) + m.w) % m.w, y]
    return [prev[0] + ((((p[0] - prev[0] + m.w / 2) % m.w) + m.w) % m.w) - m.w / 2, y]
  }
  const finish = () => {
    if (!draft) return
    const eps = 3 / view.k
    const pts = draft.pts.filter((p, i) => i === 0 || Math.hypot(p[0] - draft.pts[i - 1][0], p[1] - draft.pts[i - 1][1]) > eps)
    if (pts.length >= (draft.type === 'area' ? 3 : 2)) addShape({ type: draft.type, pts })
    setDraft(null); setCursor(null)
  }

  const down = (e: RPE<SVGSVGElement>) => {
    if (e.button === 1 || tool === 'pan') {
      moved.current = false
      drag.current = { x0: e.clientX, y0: e.clientY, vx: view.x, vy: view.y }
      e.currentTarget.setPointerCapture(e.pointerId); return
    }
    if (e.button !== 0) return
    const p = toWorld(e)
    if (tool === 'pen') { setDraft({ type: 'pen', pts: [norm(p)] }); e.currentTarget.setPointerCapture(e.pointerId) }
    else if (tool === 'route' || tool === 'area') setDraft(d => (d && d.type === tool ? { ...d, pts: [...d.pts, norm(p, d.pts[d.pts.length - 1])] } : { type: tool, pts: [norm(p)] }))
    else if (tool === 'marker') { const pt = norm(p); promptDialog('Nome del segnaposto').then(label => { if (label !== null) addShape({ type: 'marker', pts: [pt], label }) }) }
  }
  const move = (e: RPE<SVGSVGElement>) => {
    const dg = drag.current
    if (dg) {
      const dx = e.clientX - dg.x0, dy = e.clientY - dg.y0
      if (Math.hypot(dx, dy) > 3) moved.current = true
      setView(v => wrap({ ...v, x: dg.vx + dx, y: dg.vy + dy })); return
    }
    if (!draft) return
    const last = draft.pts[draft.pts.length - 1], q = norm(toWorld(e), last)
    if (draft.type === 'pen') { if (Math.hypot(q[0] - last[0], q[1] - last[1]) > 3 / view.k) setDraft({ ...draft, pts: [...draft.pts, q] }) }
    else setCursor(q)
  }
  const up = () => { drag.current = null; if (draft?.type === 'pen') finish() }

  const el = (s: Shape, color: string, w: number, op = 1) => {
    const pts = s.pts.map(p => p.join(',')).join(' ')
    return s.type === 'area'
      ? <polygon points={pts} fill={color} fillOpacity={0.22 * op} stroke={color} strokeOpacity={op} strokeWidth={w} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      : <polyline points={pts} fill="none" stroke={color} strokeOpacity={op} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={s.type === 'route' ? '10 6' : undefined} vectorEffect="non-scaling-stroke" />
  }
  const tag = (s: Shape, x: number, y: number, dx = 4, dy = -6) => (
    <text transform={`translate(${x} ${y}) scale(${1 / view.k})`} x={dx} y={dy} fontSize={14} fill="#fff" stroke="#000" strokeWidth={3} paintOrder="stroke">{s.label}</text>
  )
  const layersEl = m.layers.filter(l => l.visible).map(l => (
    <g key={l.id}>{l.shapes.map(s => (
      <g key={s.id} style={{ cursor: tool === 'erase' ? 'crosshair' : 'pointer' }}
        onPointerDown={e => { if (tool === 'erase') { e.stopPropagation(); delShape(s.id) } }}
        onClick={() => { if (tool === 'pan' && !moved.current) setSelShape(s.id) }}>
        {s.type === 'marker' ? (
          <g transform={`translate(${s.pts[0][0]} ${s.pts[0][1]}) scale(${1 / view.k})`}>
            {selShape === s.id && <circle r={12} fill="none" stroke="#fff" strokeWidth={2} />}
            <circle r={7} fill={l.color} stroke="#000" strokeWidth={1.5} />
            {s.label && <text x={12} y={5} fontSize={14} fill="#fff" stroke="#000" strokeWidth={3} paintOrder="stroke">{s.label}</text>}
          </g>
        ) : (<>
          {s.type !== 'area' && <polyline points={s.pts.map(p => p.join(',')).join(' ')} fill="none" stroke="transparent" strokeWidth={14} vectorEffect="non-scaling-stroke" />}
          {selShape === s.id && el(s, '#fff', 7, 0.6)}
          {el(s, l.color, s.type === 'area' ? 2 : 3)}
          {s.label && tag(s, s.pts[0][0], s.pts[0][1])}
        </>)}
      </g>
    ))}</g>
  ))
  const activeColor = m.layers.find(l => l.id === activeId)?.color ?? '#fff'
  const draftEl = draft && (
    <g pointerEvents="none">
      {el({ id: 'd', type: draft.type, pts: cursor && draft.type !== 'pen' ? [...draft.pts, cursor] : draft.pts }, activeColor, 3, 0.8)}
      {draft.type !== 'pen' && draft.pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={4 / view.k} fill={activeColor} />)}
    </g>
  )
  const sh = m.layers.flatMap(l => l.shapes).find(s => s.id === selShape)
  const tiles = m.loop ? [-1, 0, 1, 2, 3] : [0]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-line bg-panel px-3 py-1.5">
        <input className="field w-48 font-display" value={m.name} onChange={e => update({ ...m, name: e.target.value })} aria-label="Nome della mappa" />
        {TOOLS.map(([t, l]) => <button key={t} className={`btn ${tool === t ? 'border-brass bg-brass text-ink' : ''}`} aria-pressed={tool === t} onClick={() => { setTool(t); setDraft(null); setCursor(null) }}>{l}</button>)}
        <Info title="Come si usano le mappe"><MapsHelp /></Info>
        <span className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={m.loop} onChange={e => { update({ ...m, loop: e.target.checked }); setTimeout(fit, 0) }} />Loop orizzontale</label>
          <button className="btn disabled:opacity-40" disabled={!past.current.length} onClick={undo} title="Annulla (Ctrl+Z)">↶</button>
          <button className="btn disabled:opacity-40" disabled={!future.current.length} onClick={redo} title="Ripeti (Ctrl+Maiusc+Z)">↷</button>
          <button className="btn" onClick={fit}>Adatta</button>
          <button className="btn" onClick={() => patchPanel({ open: !panel.open })}>{panel.open ? 'Nascondi livelli' : 'Livelli'}</button>
          <button className="btn" onClick={onDelete}>Elimina mappa</button>
        </span>
      </div>
      <p role="status" className="border-b border-line bg-raised px-3 py-1 text-sm"><b className="text-brass">{TOOLS.find(t => t[0] === tool)![1]}:</b> {TOOLS.find(t => t[0] === tool)![2]}</p>
      <div className="flex min-h-0 flex-1">
        <div ref={box} className="relative min-w-0 flex-1 overflow-hidden bg-ink">
          <svg ref={svg} className={`h-full w-full touch-none ${tool === 'pan' ? 'cursor-grab' : 'cursor-crosshair'}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onDoubleClick={finish}>
            <defs>{src && <image id="mapimg" href={src} width={m.w} height={m.h} />}</defs>
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              {tiles.map(i => (
                <g key={i} transform={`translate(${i * m.w} 0)`}>
                  {src ? <use href="#mapimg" /> : <rect width={m.w} height={m.h} fill="#222" />}
                  {layersEl}{draftEl}
                </g>
              ))}
            </g>
          </svg>
          {!src && <p className="absolute left-4 top-4 text-sm opacity-70">Caricamento dell'immagine…</p>}
        </div>
        {panel.open && (
          <aside className="w-64 shrink-0 space-y-3 overflow-y-auto border-l border-line bg-panel p-2">
            <h3 className="font-display text-brass">Livelli</h3>
            <ul className="space-y-1">{m.layers.map(l => (
              <li key={l.id} className="flex items-center gap-1">
                <input type="checkbox" checked={l.visible} title="Visibile" aria-label={`Mostra ${l.name}`} onChange={e => patchLayer(l.id, { visible: e.target.checked })} />
                <input type="color" className="h-7 w-7 shrink-0 cursor-pointer border-0 bg-transparent p-0" value={l.color} aria-label={`Colore di ${l.name}`} onChange={e => patchLayer(l.id, { color: e.target.value })} />
                <input className="field min-w-0 px-1" value={l.name} aria-label="Nome del livello" onChange={e => patchLayer(l.id, { name: e.target.value })} />
                <button className={`btn px-1.5 py-0 ${l.id === activeId ? 'border-brass bg-brass text-ink' : ''}`} title="Livello attivo: qui si disegna" aria-pressed={l.id === activeId} onClick={() => update({ ...m, active: l.id })}>✎</button>
                <button className="btn px-1.5 py-0" title="Elimina il livello" onClick={async () => { if (await confirmDialog(`Eliminare il livello «${l.name}» e le sue forme?`, { danger: true })) setLayers(ls => ls.filter(x => x.id !== l.id)) }}>✕</button>
              </li>
            ))}</ul>
            <button className="btn w-full" onClick={() => { const id = nid(); commit({ ...m, active: id, layers: [...m.layers, { id, name: 'Nuovo livello', color: '#9b8cff', visible: true, shapes: [] }] }) }}>+ Livello</button>
            {sh && (
              <div className="space-y-1 border-t border-line pt-2 text-sm">
                <h3 className="font-display text-brass">Forma selezionata</h3>
                <input className="field" placeholder="Etichetta" value={sh.label ?? ''} onChange={e => patchShape(sh.id, { label: e.target.value })} />
                <div className="flex gap-1"><button className="btn grow" onClick={() => delShape(sh.id)}>Elimina forma</button><button className="btn" onClick={() => setSelShape(null)}>Deseleziona</button></div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}

export function MapsPage() {
  const { cid = '' } = useParams()
  const { items, update, create, remove } = useEntities<MapDoc>('maps')
  const [sp] = useSearchParams()
  const [sel, setSel] = useState<string | null>(sp.get('sel'))
  const file = useRef<HTMLInputElement>(null)
  useEffect(() => { const s = sp.get('sel'); if (s) setSel(s) }, [sp])
  const m = items.find(x => x.id === sel)
  const src = useImageUrl(m?.image)
  useEffect(() => { // migrazione delle mappe della 0.7: immagine da testo (data URL) a file vero
    if (!m || m.image) return
    let live = true
    ;(async () => {
      const t = await store().read(`${cid}/maps/${m.id}.img`)
      if (!t || !live) return
      const image = await saveImage(cid, await (await fetch(t)).blob())
      update({ ...m, image }); await store().remove(`${cid}/maps/${m.id}.img`)
    })().catch(() => { /* resta com'era */ })
    return () => { live = false }
  }, [cid, m?.id, m?.image])

  const upload = async (f: File) => {
    try {
      const bmp = await createImageBitmap(f); const w = bmp.width, h = bmp.height; bmp.close()
      const image = await saveImage(cid, f) // le mappe restano all'originale, senza riduzioni
      setSel((await create({ name: f.name.replace(/\.[^.]+$/, ''), w, h, loop: false, layers: newLayers(), active: '', image })).id)
    } catch (e) { alertDialog(`Impossibile importare l'immagine: ${(e as Error).message}. Nel salvataggio del browser le immagini grandi non entrano: usa «Usa una cartella sul disco».`) }
  }
  const del = async () => {
    if (!m || !(await confirmDialog(`Eliminare la mappa «${m.name}»? Finisce nel cestino e si può ripristinare (l'immagine resta dov'è).`, { danger: true, ok: 'Sposta nel cestino' }))) return
    await remove(m.id); setSel(null)
  }

  return (
    <div className="flex h-full min-h-0">
      <SidePanel id="maps" title="Mappe">
        <div className="space-y-2 p-2">
          <input ref={file} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
          <button className="btn w-full" onClick={() => file.current?.click()}>Importa immagine…</button>
          <ul className="space-y-1">{items.map(x => (
            <li key={x.id}><button onClick={() => setSel(x.id)} className={`w-full rounded px-2 py-1 text-left ${x.id === sel ? 'bg-ink text-brass' : 'hover:text-brass'}`}>{x.name || '(senza nome)'}</button></li>
          ))}</ul>
          {!items.length && <p className="text-sm opacity-60">Importa una mappa scaricata (PNG, JPG, WebP).</p>}
        </div>
      </SidePanel>
      <section className="min-w-0 flex-1">
        {m ? <MapView key={m.id} m={m} src={src} update={update} onDelete={del} /> : <p className="p-6 opacity-60">Scegli una mappa o importane una.</p>}
      </section>
    </div>
  )
}
