import { FC, ReactNode, useEffect, useRef, useState } from 'react'
import GridLayout, { WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { confirmDialog } from './dialog'
import { Info } from './Info'
import { Cfg, FieldDef, Node, Root, edit, move, nid, reorderRoot, useLayoutDoc } from './layouts'
import { NumInput } from './NumInput'
import { getPath, setPath } from './path'
import { useMedia } from './useMedia'

const Grid = WidthProvider(GridLayout)
const ROW = 8, GAP = 8 // una riga della griglia = 16 px
export type Setter = (path: string, v: unknown) => void
export interface PropDef { key: string; label: string; options?: [string, string][] } // con options = menu, senza = casella
export interface BlockDef { label: string; C: FC<{ c: any; set: Setter; cfg: Cfg; patch: (f: (d: any) => any) => void }>; cfg?: Cfg; props?: PropDef[] }
// Un "tipo di scheda" (personaggio, PNG, oggetto…) fornisce solo: blocchi pronti, catalogo dei campi e layout di default.
export interface KindDef { blocks: Record<string, BlockDef>; fields: FieldDef[]; defaults: Root[] }
interface Ctx { kind: KindDef; data: any; isClosed: (id: string) => boolean; toggleFold: (id: string) => void; set: Setter; patch: (f: (d: any) => any) => void; editing: boolean; open: string | null; setOpen: (id: string | null) => void; mut: (f: (r: Root[]) => Root[]) => void }

function Field({ cfg, data, set }: { cfg: Cfg; data: any; set: Setter }) {
  const v = getPath(data, cfg.path)
  if (cfg.input === 'check') return <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!v} onChange={e => set(cfg.path, e.target.checked)} />{cfg.label}</label>
  return (
    <label className="block text-sm"><span className="text-xs text-muted">{cfg.label}</span>
      {cfg.input === 'area' ? <textarea className="field min-h-20" rows={4} value={v ?? ''} onChange={e => set(cfg.path, e.target.value)} />
        : cfg.input === 'select' ? <select className="field" value={v ?? ''} onChange={e => set(cfg.path, e.target.value)}>{(cfg.options ?? []).map(([o, l]: [string, string]) => <option key={o} value={o}>{l}</option>)}</select>
        : cfg.input === 'number' ? <NumInput className="field" value={typeof v === 'number' ? v : v === undefined || v === null || v === '' ? 0 : Number(v) || 0} onCommit={n => set(cfg.path, n)} />
        : <input className="field" type="text" value={v ?? ''} onChange={e => set(cfg.path, e.target.value)} />}
    </label>
  )
}

function Panel({ n, ctx, root }: { n: Node; ctx: Ctx; root?: boolean }) {
  const upd = (p: Partial<Node> & { auto?: boolean }) => ctx.mut(r => edit(r, n.id, x => ({ ...x, ...p })))
  const cfg = (p: Cfg) => upd({ cfg: { ...n.cfg, ...p } })
  const def = ctx.kind.blocks[n.type]
  const merged = { ...def?.cfg, ...n.cfg }
  const row = 'flex items-center justify-between gap-2'
  return (
    <div className="my-1 space-y-1 rounded border border-line bg-ink p-2 text-sm">
      {n.type === 'group' && <>
        <label className={row}>Titolo<input className="field w-40" value={n.title ?? ''} onChange={e => upd({ title: e.target.value })} /></label>
        <label className={row}>Colonne<select className="field w-20" value={n.cols ?? 1} onChange={e => upd({ cols: +e.target.value })}>{[1, 2, 3, 4, 5, 6].map(k => <option key={k}>{k}</option>)}</select></label>
        {root && <label className="flex items-center gap-2"><input type="checkbox" checked={(n as Root).auto !== false} onChange={e => upd({ auto: e.target.checked })} />Altezza automatica</label>}
      </>}
      {n.type === 'text' && <textarea className="field" rows={3} value={n.cfg?.text ?? ''} onChange={e => cfg({ text: e.target.value })} />}
      {n.type === 'field' && <>
        <label className={row}>Dato<select className="field w-44" value={n.cfg?.path} onChange={e => { const f = ctx.kind.fields.find(x => x.path === e.target.value); if (f) cfg({ path: f.path, label: f.label, input: f.input, options: f.options }) }}>
          {!ctx.kind.fields.some(f => f.path === n.cfg?.path) && <option value={n.cfg?.path}>Campo personalizzato</option>}
          {ctx.kind.fields.map(f => <option key={f.path} value={f.path}>{f.label}</option>)}
        </select></label>
        <label className={row}>Etichetta<input className="field w-44" value={n.cfg?.label ?? ''} onChange={e => cfg({ label: e.target.value })} /></label>
        <label className={row}>Tipo<select className="field w-44" value={n.cfg?.input} onChange={e => cfg({ input: e.target.value })}>
          {[['text', 'Testo breve'], ['area', 'Testo lungo'], ['number', 'Numero'], ['check', 'Casella']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          {n.cfg?.input === 'select' && <option value="select">Scelta</option>}
        </select></label>
      </>}
      {def?.props?.map(p => p.options
        ? <label key={p.key} className={row}>{p.label}<select className="field w-44" value={merged[p.key] ?? ''} onChange={e => cfg({ [p.key]: e.target.value })}>{p.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        : <label key={p.key} className="flex items-center gap-2"><input type="checkbox" checked={!!merged[p.key]} onChange={e => cfg({ [p.key]: e.target.checked })} />{p.label}</label>)}
    </div>
  )
}

function NodeView({ n, ctx, root }: { n: Node; ctx: Ctx; root?: boolean }) {
  const { editing, open, setOpen, mut, kind } = ctx
  const def = kind.blocks[n.type]
  const add = (type: string) => {
    const id = nid()
    const f0 = kind.fields[0]
    const node: Node = type === 'custom' ? { id, type: 'field', cfg: { path: 'extra.' + id, label: 'Nuovo campo', input: 'text' } }
      : type === 'field' ? { id, type: 'field', cfg: { path: f0.path, label: f0.label, input: f0.input, options: f0.options } }
      : type === 'group' ? { id, type: 'group', title: 'Nuova sottosezione', cols: 1, children: [] }
      : type === 'text' ? { id, type: 'text', cfg: { text: 'Testo' } }
      : { id, type, cfg: { ...kind.blocks[type].cfg } }
    mut(r => edit(r, n.id, g => ({ ...g, children: [...(g.children ?? []), node] })))
    setOpen(id)
  }
  const remove = async () => { if (!n.children?.length || await confirmDialog('Eliminare la sezione e il suo contenuto?', { danger: true })) mut(r => edit(r, n.id, () => null)) }

  let body
  if (n.type === 'group') body = (
    <>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${n.cols ?? 1}, minmax(0, 1fr))` }}>
        {n.children?.map(c => <NodeView key={c.id} n={c} ctx={ctx} />)}
      </div>
      {editing && (
        <select className="field mt-2" value="" onChange={e => e.target.value && add(e.target.value)} aria-label="Aggiungi elemento">
          <option value="">+ Aggiungi…</option>
          <option value="field">Campo esistente</option><option value="custom">Campo personalizzato</option>
          <option value="group">Sottosezione</option><option value="text">Testo fisso</option>
          {Object.entries(kind.blocks).map(([t, b]) => <option key={t} value={t}>{b.label}</option>)}
        </select>
      )}
    </>
  )
  else if (n.type === 'field') body = <Field cfg={n.cfg ?? {}} data={ctx.data} set={ctx.set} />
  else if (n.type === 'text') body = <p className="whitespace-pre-wrap text-sm">{n.cfg?.text}</p>
  else if (def) body = <def.C c={ctx.data} set={ctx.set} cfg={{ ...def.cfg, ...n.cfg, nodeId: n.id }} patch={ctx.patch} />
  else body = <p className="text-xs text-danger">Blocco sconosciuto: {n.type}</p>

  const label = n.type === 'group' ? n.title || '(senza titolo)' : editing ? (def?.label ?? (n.type === 'text' ? 'Testo' : 'Campo')) : ''
  return (
    <div className={`${n.type === 'group' && !root ? 'rounded-md border border-line bg-ink/40 p-2.5' : ''} ${editing ? 'outline-dashed outline-1 outline-brass/40' : ''}`}>
      {(label || editing) && (
        <div className={`${root ? 'mb-2 border-b border-line pb-1.5' : 'mb-1'} flex items-center justify-between gap-2 ${root && editing ? 'drag cursor-move' : ''}`}>
          <h3 className={`flex min-w-0 items-center gap-2 text-brass ${root ? 'text-base' : 'text-sm'}`}>
            {root && !editing && n.type === 'group' && <button className="btn h-6 min-h-6 w-6 min-w-6 shrink-0 px-0 text-base leading-none" aria-expanded={true} aria-label={`Comprimi la sezione ${label}`} title="Comprimi la sezione" onClick={() => ctx.toggleFold(n.id)}>−</button>}
            <span className="truncate">{root && editing ? '⠿ ' : ''}{label}</span>
          </h3>
          {editing && (
            <span className="no-drag flex shrink-0 gap-1 text-xs">
              <button className="btn px-1 py-0" title="Impostazioni" onClick={() => setOpen(open === n.id ? null : n.id)}>⚙</button>
              {!root ? (<>
                <button className="btn px-1 py-0" title="Sposta su" onClick={() => mut(r => move(r, n.id, -1))}>↑</button>
                <button className="btn px-1 py-0" title="Sposta giù" onClick={() => mut(r => move(r, n.id, 1))}>↓</button>
              </>) : (<>
                <button className="btn px-1 py-0" title="Porta in cima" onClick={() => mut(r => reorderRoot(r, n.id, 'top'))}>⤒</button>
                <button className="btn px-1 py-0" title="Su" onClick={() => mut(r => reorderRoot(r, n.id, 'up'))}>↑</button>
                <button className="btn px-1 py-0" title="Giù" onClick={() => mut(r => reorderRoot(r, n.id, 'down'))}>↓</button>
                <button className="btn px-1 py-0" title="Porta in fondo" onClick={() => mut(r => reorderRoot(r, n.id, 'bottom'))}>⤓</button>
              </>)}
              <button className="btn px-1 py-0" title="Elimina" onClick={remove}>✕</button>
            </span>
          )}
        </div>
      )}
      {editing && open === n.id && <Panel n={n} ctx={ctx} root={root} />}
      {body}
    </div>
  )
}

// Contenitore di una sezione di primo livello. Con altezza automatica misura il contenuto e adatta la riga della griglia.
function FitBox({ auto, h, onFit, children }: { auto: boolean; h: number; onFit: (h: number) => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const cb = useRef(onFit); cb.current = onFit
  useEffect(() => {
    const el = ref.current
    if (!el || !auto) return
    const run = () => { const need = Math.max(2, Math.ceil((el.offsetHeight + 3 + GAP) / (ROW + GAP))); if (need !== h) cb.current(need) }
    run()
    const ro = new ResizeObserver(run)
    ro.observe(el)
    return () => ro.disconnect()
  }, [auto, h])
  return <div className="h-full overflow-auto"><div ref={ref} className="p-3">{children}</div></div>
}

// Sezione compressa: solo il titolo, con (+) per riaprirla.
function FoldedCard({ title, onOpen }: { title?: string; onOpen: () => void }) {
  return (
    <button className="flex h-full w-full items-center gap-2 rounded-lg border border-line bg-panel px-3 text-left hover:border-brass" aria-expanded={false} aria-label={`Espandi la sezione ${title ?? ''}`} onClick={onOpen}>
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-edge bg-raised leading-none text-brass" aria-hidden>+</span>
      <span className="truncate font-display text-brass">{title || '(senza titolo)'}</span>
    </button>
  )
}

function LayoutHelp() {
  return (
    <>
      <p>La scheda è fatta di <b>sezioni</b>. Ogni sezione contiene campi, blocchi pronti (PF, slot, abilità…), testi e sottosezioni. Il layout è tuo: i dati restano gli stessi, cambia solo come li vedi.</p>
      <ul className="list-disc space-y-1 pl-5">
        <li><b>− / +</b> accanto al titolo comprime o riapre una sezione. Lo ricorda il browser; nella modifica del layout le sezioni sono sempre aperte.</li>
        <li><b>Modifica layout</b>: trascina il titolo ⠿ per spostare una sezione, trascina i bordi per ridimensionarla (fino a 12 colonne).</li>
        <li><b>⚙ Impostazioni</b> di una sezione: titolo, numero di colonne e «Altezza automatica» (l'altezza segue il contenuto; se ridimensioni a mano si disattiva).</li>
        <li><b>+ Aggiungi…</b> dentro una sezione: un campo esistente, un campo personalizzato, una sottosezione, un testo fisso o un blocco pronto. Ogni elemento ha ⚙, ↑ ↓ ed ✕.</li>
        <li><b>Blocchi</b> con opzioni (⚙): ad esempio gli slot incantesimo si possono mostrare tutti, solo i livelli con slot o come Magia del Patto.</li>
        <li><b>⇅ Riordina sezioni</b> mostra solo i titoli per spostarle senza scorrere. <b>↶ ↷</b> annullano e ripetono le modifiche al layout (Ctrl+Z, Ctrl+Maiusc+Z).</li>
        <li><b>Ripristina layout</b> torna a quello di partenza: cancella solo il layout, non i dati.</li>
      </ul>
    </>
  )
}

export function SheetView<T>({ layoutKey, kind, data, onChange }: { layoutKey: string; kind: KindDef; data: T; onChange: (next: T) => void }) {
  const [roots, setRoots] = useLayoutDoc(layoutKey, kind.defaults)
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const narrow = useMedia('(max-width: 767px)') // su schermi stretti le sezioni si impilano una sotto l'altra
  const [compact, setCompact] = useState(false) // «Riordina sezioni»: solo i titoli, per spostarle senza scorrere
  // Sezioni compresse con (+/−): preferenza di visualizzazione ricordata nel browser, non fa parte del layout. Durante la modifica sono sempre aperte.
  const foldKey = 'ui:fold:' + layoutKey
  const readFold = () => { try { return new Set<string>(JSON.parse(localStorage.getItem(foldKey) ?? '[]')) } catch { return new Set<string>() } }
  const [closed, setClosed] = useState(readFold)
  useEffect(() => { setClosed(readFold()) }, [foldKey])
  const toggleFold = (id: string) => setClosed(s => {
    const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id)
    try { localStorage.setItem(foldKey, JSON.stringify([...n])) } catch { /* ignora */ }
    return n
  })
  useEffect(() => { if (!editing) setCompact(false) }, [editing])
  // Cronologia delle modifiche al layout (struttura, spostamenti, dimensioni). Le raffiche ravvicinate (es. digitare un titolo) contano come un passo.
  const past = useRef<Root[][]>([])
  const future = useRef<Root[][]>([])
  const lastSnap = useRef(0)
  const [, bump] = useState(0)
  const snap = () => {
    const now = Date.now()
    if (now - lastSnap.current > 700) { past.current = [...past.current.slice(-49), roots]; future.current = []; bump(n => n + 1) }
    lastSnap.current = now
  }
  const undo = () => { const p = past.current.pop(); if (!p) return; future.current.push(roots); setRoots(p); bump(n => n + 1) }
  const redo = () => { const f = future.current.pop(); if (!f) return; past.current.push(roots); setRoots(f); bump(n => n + 1) }
  useEffect(() => { past.current = []; future.current = [] }, [layoutKey])
  useEffect(() => {
    if (!editing) return
    const k = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName) || !(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      else if (key === 'y' || (key === 'z' && e.shiftKey)) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  })
  const isClosed = (id: string) => !editing && closed.has(id)
  const anyClosed = roots.some(r => isClosed(r.id))
  const ctx: Ctx = { kind, data, isClosed, toggleFold, set: (p, v) => onChange(setPath(data, p, v)), patch: f => onChange(f(data)), editing, open, setOpen, mut: f => { snap(); setRoots(f) } }

  const addSection = (top: boolean) => {
    const id = nid()
    snap()
    setRoots(rs => { const s: Root = { id, type: 'group', title: 'Nuova sezione', cols: 1, children: [], x: 0, y: 9999, w: 12, h: 6, auto: true }; return top ? reorderRoot([...rs, s], id, 'top') : [...rs, s] })
    setOpen(id); setCompact(false)
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button className="btn" onClick={() => setEditing(e => !e)}>{editing ? 'Fine modifica' : 'Modifica layout'}</button>
        <Info title="Come funziona il layout"><LayoutHelp /></Info>
        {editing && <>
          <button className="btn disabled:opacity-40" disabled={!past.current.length} onClick={undo} title="Annulla (Ctrl+Z)">↶ Annulla</button>
          <button className="btn disabled:opacity-40" disabled={!future.current.length} onClick={redo} title="Ripeti (Ctrl+Maiusc+Z)">↷ Ripeti</button>
          <button className="btn" onClick={() => addSection(true)}>+ Sezione in cima</button>
          <button className="btn" onClick={() => addSection(false)}>+ Sezione in fondo</button>
          <button className={`btn ${compact ? 'border-brass bg-brass text-ink' : ''}`} aria-pressed={compact} title="Mostra solo i titoli per spostare le sezioni senza scorrere la pagina" onClick={() => setCompact(c => !c)}>⇅ Riordina sezioni</button>
          <button className="btn" onClick={async () => { if (await confirmDialog('Ripristinare il layout di default? Le tue modifiche al layout andranno perse (i dati della scheda no).', { danger: true, ok: 'Ripristina' })) { snap(); setRoots(kind.defaults) } }}>Ripristina layout</button>
          <span className="text-xs opacity-60">Trascina il titolo ⠿ per spostare · trascina i bordi per ridimensionare (larghezza fino a 12 colonne)</span>
        </>}
      </div>
      {narrow ? (
        <div className="space-y-3">
          {[...roots].sort((a, b) => a.y - b.y || a.x - b.x).map(r => (
            isClosed(r.id)
              ? <FoldedCard key={r.id} title={r.title} onOpen={() => toggleFold(r.id)} />
              : <div key={r.id} className={`rounded-lg border bg-panel p-3 shadow-sm shadow-black/20 ${editing ? 'border-brass' : 'border-line'}`}><NodeView n={r} ctx={ctx} root /></div>
          ))}
        </div>
      ) : (
      <Grid layout={roots.map(r => ({ i: r.id, x: r.x, y: r.y, w: r.w, h: compact || isClosed(r.id) ? 3 : r.h, minW: 2 }))} cols={12} rowHeight={ROW} margin={[GAP, GAP]}
        isDraggable={editing} isResizable={editing && !compact} draggableCancel=".no-drag" onDragStart={snap} onResizeStart={snap} resizeHandles={['s', 'e', 'w', 'se', 'sw']} draggableHandle=".drag"
        onResizeStop={(_l, old, item) => { if (old.h !== item.h) setRoots(rs => rs.map(r => (r.id === item.i ? { ...r, auto: false } : r))) }}
        onLayoutChange={l => anyClosed ? undefined : setRoots(rs => { // con sezioni compresse le posizioni non si salvano: sono solo transitorie
          const m = new Map<string, { x: number; y: number; w: number; h: number }>(l.map(i => [i.i, i] as [string, any]))
          let changed = false
          const next = rs.map(r => {
            const i = m.get(r.id)
            const h = compact ? r.h : i?.h
            if (!i || (i.x === r.x && i.y === r.y && i.w === r.w && h === r.h)) return r
            changed = true; return { ...r, x: i.x, y: i.y, w: i.w, h: h as number }
          })
          return changed ? next : rs
        })}>
        {roots.map(r => compact ? (
          <div key={r.id} className="rounded-lg border border-brass bg-panel">
            <div className="drag flex h-full cursor-move items-center gap-2 px-3">
              <span aria-hidden>⠿</span>
              <span className="truncate font-display text-brass">{r.title || '(senza titolo)'}</span>
              <span className="no-drag ml-auto flex shrink-0 gap-1 text-xs">
                {([['top', '⤒', 'In cima'], ['up', '↑', 'Su'], ['down', '↓', 'Giù'], ['bottom', '⤓', 'In fondo']] as const).map(([how, sym, t]) => (
                  <button key={how} className="btn px-1.5 py-0" title={t} aria-label={`${t}: ${r.title ?? ''}`} onClick={() => ctx.mut(rs => reorderRoot(rs, r.id, how))}>{sym}</button>
                ))}
              </span>
            </div>
          </div>
        ) : isClosed(r.id) ? (
          <div key={r.id}><FoldedCard title={r.title} onOpen={() => toggleFold(r.id)} /></div>
        ) : (
          <div key={r.id} className={`rounded-lg border bg-panel shadow-sm shadow-black/20 ${editing ? 'border-brass' : 'border-line'}`}>
            <FitBox auto={r.auto !== false} h={r.h} onFit={h => setRoots(rs => rs.map(x => (x.id === r.id && x.auto !== false && x.h !== h ? { ...x, h } : x)))}>
              <NodeView n={r} ctx={ctx} root />
            </FitBox>
          </div>
        ))}
      </Grid>
      )}
    </div>
  )
}
