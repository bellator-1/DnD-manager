import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { tracked } from '../../core/saveStatus'
import { findInPages } from '../../core/search'
import { SidePanel, usePersisted } from '../../core/SidePanel'
import { store } from '../../core/storage'
import { useEntities } from '../../core/useEntities'
import { Manual } from './model'
import { OutlineItem, destToPage, extractAll, flattenOutline, loadPdf } from './pdf'

// Lettore dei manuali: carichi il PDF che possiedi e l'app lo legge in locale (sommario, ricerca nel testo, segnalibri, ultima pagina).
// Il PDF non viene modificato né copiato fuori dal tuo computer, e non entra nei backup.
function Viewer({ m, update, onDelete, initialPage }: { m: Manual; update: (m: Manual) => void; onDelete: () => void; initialPage?: number }) {
  const { cid = '' } = useParams()
  const [doc, setDoc] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'missing' | 'error' | 'ok'>('loading')
  const [page, setPage] = useState(initialPage ?? m.last ?? 1)
  const [scale, setScale] = useState(1.2)
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [panel, patchPanel] = usePersisted('ui:manualpanel', { tab: 'sommario' })
  const [pages, setPages] = useState<string[] | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [q, setQ] = useState('')
  const canvas = useRef<HTMLCanvasElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const refile = useRef<HTMLInputElement>(null)
  const stop = useRef(false)
  const bookmarks = m.bookmarks ?? []

  const load = async () => {
    setStatus('loading')
    const blob = await store().readBlob(`${cid}/manual-files/${m.file}`)
    if (!blob) { setStatus('missing'); return }
    try {
      const d = await loadPdf(await blob.arrayBuffer())
      setDoc(d); setStatus('ok')
      if (m.pages !== d.numPages) update({ ...m, pages: d.numPages })
      flattenOutline(d).then(setOutline).catch(() => {})
      const idx = await store().read(`${cid}/manual-files/${m.id}.index.json`)
      if (idx) { try { setPages(JSON.parse(idx)) } catch { /* indice corrotto: si rifà */ } }
    } catch { setStatus('error') }
  }
  useEffect(() => { load(); return () => { stop.current = true } }, [])

  const total = doc?.numPages ?? m.pages ?? 1
  const go = (n: number) => setPage(Math.min(total, Math.max(1, Math.round(n) || 1)))
  const fit = async () => {
    if (!doc || !wrap.current) return
    const p = await doc.getPage(Math.min(page, doc.numPages))
    setScale(Math.max(0.3, Math.min(4, (wrap.current.clientWidth - 32) / p.getViewport({ scale: 1 }).width)))
  }
  useEffect(() => { if (doc) fit() }, [doc])
  useEffect(() => { if (doc && page !== m.last) update({ ...m, last: page }) }, [page])
  useEffect(() => {
    if (!doc || !canvas.current) return
    let alive = true
    let task: any
    ;(async () => {
      const p = await doc.getPage(Math.min(Math.max(1, page), doc.numPages))
      if (!alive) return
      const vp = p.getViewport({ scale }), dpr = window.devicePixelRatio || 1
      const c = canvas.current!
      c.width = Math.floor(vp.width * dpr); c.height = Math.floor(vp.height * dpr)
      c.style.width = `${vp.width}px`; c.style.height = `${vp.height}px`
      task = p.render({ canvasContext: c.getContext('2d')!, viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined })
      await task.promise
    })().catch(() => { /* rendering annullato dal cambio di pagina o di zoom */ })
    return () => { alive = false; task?.cancel() }
  }, [doc, page, scale])

  const buildIndex = async () => {
    if (!doc) return
    stop.current = false; setProgress(0)
    try {
      const out = await extractAll(doc, setProgress, () => stop.current)
      setPages(out)
      await tracked(store().write(`${cid}/manual-files/${m.id}.index.json`, JSON.stringify(out)))
    } catch { /* interrotto */ } finally { setProgress(null) }
  }
  const results = useMemo(() => (pages && q.trim() ? findInPages(pages, q) : []), [pages, q])
  const addBookmark = () => {
    const label = prompt('Nome del segnalibro', `Pagina ${page}`)?.trim()
    if (label) update({ ...m, bookmarks: [...bookmarks, { page, label }].sort((a, b) => a.page - b.page) })
  }
  const reattach = async (f: File) => { try { await tracked(store().writeBlob(`${cid}/manual-files/${m.file}`, f)); load() } catch (e) { alert(`Impossibile salvare il PDF: ${(e as Error).message}`) } }
  const tab = (id: string, label: string) => <button key={id} className={`rounded px-2 py-1 ${panel.tab === id ? 'bg-ink text-brass' : 'hover:text-brass'}`} aria-pressed={panel.tab === id} onClick={() => patchPanel({ tab: panel.tab === id ? '' : id })}>{label}</button>

  if (status !== 'ok') return (
    <div className="space-y-3 p-6">
      <h2 className="font-display text-xl text-brass">{m.name}</h2>
      {status === 'loading' && <p className="opacity-70">Apro il PDF…</p>}
      {status === 'error' && <p className="text-red-400">Impossibile aprire il PDF: il file potrebbe essere danneggiato o protetto.</p>}
      {status === 'missing' && <p>Il file PDF non è presente su questo computer (i PDF dei manuali non sono inclusi nei backup). Scegli di nuovo il file per ricollegarlo: segnalibri e ultima pagina restano.</p>}
      {status !== 'loading' && <><input ref={refile} type="file" accept="application/pdf" hidden onChange={e => { const f = e.target.files?.[0]; if (f) reattach(f); e.target.value = '' }} /><button className="btn" onClick={() => refile.current?.click()}>Scegli di nuovo il PDF</button> <button className="btn" onClick={onDelete}>Elimina il manuale</button></>}
    </div>
  )

  return (
    <div className="flex h-full min-h-0 flex-col" onKeyDown={e => { if ((e.target as HTMLElement).tagName === 'INPUT') return; if (e.key === 'ArrowRight' || e.key === 'PageDown') go(page + 1); if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(page - 1) }}>
      <div className="flex flex-wrap items-center gap-1 border-b border-line bg-panel px-3 py-1.5">
        <input className="field w-52 font-display" value={m.name} onChange={e => update({ ...m, name: e.target.value })} aria-label="Nome del manuale" />
        <button className="btn" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Pagina precedente">◀</button>
        <input className="field w-16 px-1 text-center" type="number" min={1} max={total} value={page} onChange={e => go(+e.target.value)} aria-label="Numero di pagina" />
        <span className="text-sm opacity-70">/ {total}</span>
        <button className="btn" onClick={() => go(page + 1)} disabled={page >= total} aria-label="Pagina successiva">▶</button>
        <span className="mx-2 opacity-30">|</span>
        <button className="btn" onClick={() => setScale(s => Math.max(0.3, +(s - 0.2).toFixed(2)))} aria-label="Riduci lo zoom">−</button>
        <span className="w-12 text-center text-sm">{Math.round(scale * 100)}%</span>
        <button className="btn" onClick={() => setScale(s => Math.min(4, +(s + 0.2).toFixed(2)))} aria-label="Aumenta lo zoom">+</button>
        <button className="btn" onClick={fit}>Adatta</button>
        <span className="ml-auto flex items-center gap-1">{tab('sommario', 'Sommario')}{tab('cerca', 'Cerca')}{tab('segnalibri', 'Segnalibri')}<button className="btn" onClick={onDelete}>Elimina</button></span>
      </div>
      <div className="flex min-h-0 flex-1">
        <div ref={wrap} className="min-w-0 flex-1 overflow-auto bg-ink p-4" tabIndex={0}><canvas ref={canvas} className="mx-auto block shadow-xl" aria-label={`Pagina ${page} di ${m.name}`} /></div>
        {panel.tab && (
          <aside className="w-72 shrink-0 space-y-2 overflow-y-auto border-l border-line bg-panel p-2 text-sm">
            {panel.tab === 'sommario' && (outline.length
              ? <ul className="space-y-0.5">{outline.map((it, i) => <li key={i} style={{ paddingLeft: it.depth * 12 }}><button className="w-full rounded px-1 py-0.5 text-left hover:text-brass" onClick={() => destToPage(doc, it.dest).then(p => p && go(p))}>{it.title}</button></li>)}</ul>
              : <p className="opacity-60">Questo PDF non ha un sommario. Usa la ricerca o i segnalibri.</p>)}
            {panel.tab === 'cerca' && (
              <>
                {!pages && progress === null && <><p className="opacity-80">Per cercare nel testo l'app deve leggere il PDF una volta (può richiedere un po' per un manuale lungo). Il testo resta sul tuo computer.</p><button className="btn w-full" onClick={buildIndex}>Prepara la ricerca</button></>}
                {progress !== null && <><p role="status">Leggo il PDF… pagina {progress} di {total}</p><button className="btn" onClick={() => { stop.current = true }}>Interrompi</button></>}
                {pages && <>
                  {pages.every(p => !p) && <p className="text-red-400">Il PDF non contiene testo selezionabile (probabilmente è una scansione): la ricerca non è disponibile.</p>}
                  <input className="field" placeholder="Cerca nel manuale…" aria-label="Cerca nel manuale" value={q} onChange={e => setQ(e.target.value)} />
                  {q.trim() && <p className="text-xs opacity-60">{results.length ? `${results.length}${results.length >= 60 ? '+' : ''} pagine` : 'Nessun risultato'}</p>}
                  <ul className="space-y-1">{results.map(r => <li key={r.page}><button className="block w-full rounded px-1 py-0.5 text-left hover:bg-ink" onClick={() => go(r.page)}><b className="text-brass">pag. {r.page}</b><span className="block truncate text-xs opacity-70">{r.snippet}</span></button></li>)}</ul>
                </>}
              </>
            )}
            {panel.tab === 'segnalibri' && (
              <>
                <button className="btn w-full" onClick={addBookmark}>＋ Segnalibro alla pagina {page}</button>
                <ul className="space-y-1">{bookmarks.map((b, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <button className="min-w-0 flex-1 truncate rounded px-1 py-0.5 text-left hover:text-brass" onClick={() => go(b.page)}><b>pag. {b.page}</b> {b.label}</button>
                    <button className="btn px-1.5 py-0" aria-label={`Elimina il segnalibro ${b.label}`} onClick={() => update({ ...m, bookmarks: bookmarks.filter((_, k) => k !== i) })}>✕</button>
                  </li>
                ))}</ul>
                {!bookmarks.length && <p className="opacity-60">Nessun segnalibro.</p>}
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}

export function ManualsPage() {
  const { cid = '' } = useParams()
  const [sp] = useSearchParams()
  const { items, update, create, remove } = useEntities<Manual>('manuals')
  const [sel, setSel] = useState<string | null>(sp.get('sel'))
  useEffect(() => { const s = sp.get('sel'); if (s) setSel(s) }, [sp])
  const file = useRef<HTMLInputElement>(null)
  const m = items.find(x => x.id === sel)

  const upload = async (f: File) => {
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { alert('Scegli un file PDF.'); return }
    try {
      const name = `${crypto.randomUUID()}.pdf`
      await tracked(store().writeBlob(`${cid}/manual-files/${name}`, f))
      setSel((await create({ name: f.name.replace(/\.pdf$/i, ''), file: name, pages: 0, last: 1, bookmarks: [] })).id)
    } catch (e) { alert(`Impossibile salvare il PDF: ${(e as Error).message}. Nel salvataggio del browser i file grandi non entrano: usa «Usa una cartella sul disco».`) }
  }
  const del = async () => {
    if (!m || !confirm(`Eliminare il manuale «${m.name}» dall'app? Il tuo PDF originale non viene toccato.`)) return
    await store().remove(`${cid}/manual-files/${m.file}`)
    await store().remove(`${cid}/manual-files/${m.id}.index.json`)
    await remove(m.id); setSel(null)
  }
  return (
    <div className="flex h-full min-h-0">
      <SidePanel id="manuals" title="Manuali">
        <div className="space-y-2 p-2">
          <input ref={file} type="file" accept="application/pdf" hidden onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
          <button className="btn w-full" onClick={() => file.current?.click()}>Importa un PDF…</button>
          <p className="text-xs opacity-60">Carica i manuali che possiedi. Restano sul tuo computer e non entrano nei backup.</p>
          <ul className="space-y-1">{items.map(x => (
            <li key={x.id}><button onClick={() => setSel(x.id)} className={`w-full rounded px-2 py-1 text-left ${x.id === sel ? 'bg-ink text-brass' : 'hover:text-brass'}`}>{x.name || '(senza nome)'}{x.pages ? <span className="ml-1 text-xs opacity-60">{x.pages} pag.</span> : null}</button></li>
          ))}</ul>
        </div>
      </SidePanel>
      <section className="min-w-0 flex-1">
        {m ? <Viewer key={m.id} m={m} update={update} onDelete={del} initialPage={Number(sp.get('p')) || undefined} /> : <p className="p-6 opacity-60">Scegli un manuale o importa un PDF.</p>}
      </section>
    </div>
  )
}
