import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { alertDialog, confirmDialog, promptDialog } from '../../core/dialog'
import { delHandle, ensurePermission, getHandle, setHandle } from '../../core/handles'
import { tracked } from '../../core/saveStatus'
import { findInPages, highlightRanges, norm } from '../../core/search'
import { SidePanel, usePersisted } from '../../core/SidePanel'
import { store } from '../../core/storage'
import { useEntities } from '../../core/useEntities'
import { Manual } from './model'
import { OutlineItem, describeError, destToPage, extractAll, flattenOutline, loadPdf, renderTextLayer } from './pdf'
import { NumInput } from '../../core/NumInput'

// Lettore dei manuali: carichi il PDF che possiedi e l'app lo legge in locale (sommario, ricerca nel testo, segnalibri, ultima pagina).
// Il PDF non viene modificato né copiato fuori dal tuo computer, e non entra nei backup.
function Viewer({ m, update, onDelete, initialPage }: { m: Manual; update: (m: Manual) => void; onDelete: () => void; initialPage?: number }) {
  const { cid = '' } = useParams()
  const [doc, setDoc] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'missing' | 'permission' | 'error' | 'ok'>('loading')
  const [ask, setAsk] = useState<any>(null) // maniglia che attende il permesso di lettura
  const [page, setPage] = useState(initialPage ?? m.last ?? 1)
  const [scale, setScale] = useState(m.zoom || 1.2)
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [panel, patchPanel] = usePersisted('ui:manualpanel', { tab: 'sommario' })
  const [pages, setPages] = useState<string[] | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [q, setQ] = useState('')
  const [err, setErr] = useState<{ text: string; detail: string } | null>(null)
  const [layerTick, setLayerTick] = useState(0) // cambia quando lo strato di testo della pagina è pronto
  const canvas = useRef<HTMLCanvasElement>(null)
  const pageBox = useRef<HTMLDivElement>(null)
  const layerEl = useRef<HTMLDivElement>(null)
  const layerDivs = useRef<HTMLElement[]>([])
  const chain = useRef<Promise<unknown>>(Promise.resolve()) // i disegni della pagina si fanno uno alla volta
  const seq = useRef(0) // numero dell'ultimo tentativo di apertura: i risultati vecchi si scartano
  const wrap = useRef<HTMLDivElement>(null)
  const refile = useRef<HTMLInputElement>(null)
  const stop = useRef(false)
  const bookmarks = m.bookmarks ?? []

  // Il PDF si trova dove l'utente l'ha messo (maniglia salvata nel browser) oppure nella copia dentro la cartella dei dati.
  // Gli errori veri (file in uso, permesso negato…) non vanno scambiati con «file non trovato»: si restituiscono a parte.
  const fetchBlob = async (): Promise<Blob | 'missing' | { ask: any } | { error: unknown }> => {
    if (m.source === 'handle') {
      const h = await getHandle(`pdf:${m.id}`).catch(() => null)
      if (!h) return 'missing'
      let ok = false
      try { ok = await ensurePermission(h, 'read', false) } catch (e) { return { error: e } }
      if (!ok) return { ask: h }
      try { return await h.getFile() } catch (e) { return (e as Error).name === 'NotFoundError' ? 'missing' : { error: e } }
    }
    return (await store().readBlob(`${cid}/manual-files/${m.file}`)) ?? 'missing'
  }
  const load = async () => {
    const my = ++seq.current
    setStatus('loading'); setErr(null)
    try {
      const got = await fetchBlob()
      if (my !== seq.current) return
      if (got === 'missing') { setStatus('missing'); return }
      if ('ask' in got) { setAsk(got.ask); setStatus('permission'); return }
      if ('error' in got) throw got.error
      const d = await loadPdf(await got.arrayBuffer())
      if (my !== seq.current) { d.destroy?.(); return } // un tentativo più recente ha preso il posto di questo
      setDoc(d); setStatus('ok')
      if (m.pages !== d.numPages) update({ ...m, pages: d.numPages })
      flattenOutline(d).then(setOutline).catch(() => {})
      const idx = await store().read(`${cid}/manual-files/${m.id}.index.json`)
      if (idx) { try { setPages(JSON.parse(idx)) } catch { /* indice corrotto: si rifà */ } }
    } catch (e) {
      if (my !== seq.current) return
      console.error('[manuale] apertura non riuscita', e)
      const d = describeError(e)
      setErr({ text: d.text, detail: d.detail })
      setStatus(d.problem === 'notfound' ? 'missing' : 'error')
    }
  }
  useEffect(() => { load(); return () => { seq.current++; stop.current = true } }, [])
  useEffect(() => () => { doc?.destroy?.() }, [doc]) // libera il lettore quando si cambia o chiude il manuale

  const total = doc?.numPages ?? m.pages ?? 1
  const go = (n: number) => setPage(Math.min(total, Math.max(1, Math.round(n) || 1)))
  const fit = async () => {
    if (!doc || !wrap.current) return
    const p = await doc.getPage(Math.min(page, doc.numPages))
    setScale(+Math.max(0.3, Math.min(4, (wrap.current.clientWidth - 32) / p.getViewport({ scale: 1 }).width)).toFixed(2))
  }
  useEffect(() => { if (doc && !m.zoom) fit() }, [doc]) // senza zoom salvato si adatta alla larghezza
  // Impostazioni del manuale (ultima pagina e zoom) salvate nella sua scheda.
  useEffect(() => { if (doc && (page !== m.last || Math.abs(scale - (m.zoom ?? 0)) > 0.001)) update({ ...m, last: page, zoom: scale }) }, [page, scale, doc])
  // Disegno della pagina: canvas + strato di testo trasparente (selezione, copia, evidenziazione).
  // I disegni si accodano: due render insieme sullo stesso canvas darebbero errore e lascerebbero la pagina bianca.
  useEffect(() => {
    if (!doc || !canvas.current || !layerEl.current || !pageBox.current) return
    let alive = true
    let task: any
    let tl: { cancel: () => void } | null = null
    const prev = chain.current
    chain.current = (async () => {
      await prev.catch(() => {})
      if (!alive) return
      const p = await doc.getPage(Math.min(Math.max(1, page), doc.numPages))
      if (!alive) return
      const vp = p.getViewport({ scale }), dpr = window.devicePixelRatio || 1
      const c = canvas.current!, host = layerEl.current!, box = pageBox.current!
      c.width = Math.floor(vp.width * dpr); c.height = Math.floor(vp.height * dpr)
      c.style.width = `${vp.width}px`; c.style.height = `${vp.height}px`
      box.style.width = `${vp.width}px`; box.style.height = `${vp.height}px`; box.style.setProperty('--scale-factor', String(vp.scale))
      host.replaceChildren(); layerDivs.current = []
      task = p.render({ canvasContext: c.getContext('2d')!, viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined })
      await task.promise
      if (!alive) return
      const t = await renderTextLayer(p, vp, host)
      if (!alive) { t.cancel(); return }
      tl = t; layerDivs.current = t.divs; setLayerTick(n => n + 1)
    })().catch((e: any) => { if (e?.name !== 'RenderingCancelledException') console.error('[manuale] disegno della pagina', e) })
    return () => { alive = false; task?.cancel(); tl?.cancel() }
  }, [doc, page, scale])

  // Evidenzia sulla pagina le parole cercate (ogni parola; le parole spezzate tra due righe non si evidenziano).
  useEffect(() => {
    const toks = norm(q).split(/\s+/).filter(Boolean)
    for (const el of layerDivs.current) {
      const text = el.dataset.plain ?? (el.dataset.plain = el.textContent ?? '')
      const rs = toks.length ? highlightRanges(text, toks) : []
      if (!rs.length) { if (el.firstElementChild) el.textContent = text; continue }
      el.textContent = ''
      let at = 0
      for (const [a, b] of rs) {
        if (a > at) el.append(text.slice(at, a))
        const mk = document.createElement('mark'); mk.className = 'pdf-hit'; mk.textContent = text.slice(a, b); el.append(mk); at = b
      }
      if (at < text.length) el.append(text.slice(at))
    }
    if (toks.length && panel.tab === 'cerca') layerEl.current?.querySelector('mark')?.scrollIntoView({ block: 'center', inline: 'nearest' })
  }, [q, layerTick])

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
  const addBookmark = async () => {
    const label = (await promptDialog('Nome del segnalibro', `Pagina ${page}`))?.trim()
    if (label) update({ ...m, bookmarks: [...bookmarks, { page, label }].sort((a, b) => a.page - b.page) })
  }
  const relink = async () => {
    try {
      const [h] = await (window as any).showOpenFilePicker({ types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }], multiple: false })
      const f: File = await h.getFile()
      if (m.source === 'handle') { await setHandle(`pdf:${m.id}`, h); update({ ...m, file: f.name }) }
      else await tracked(store().writeBlob(`${cid}/manual-files/${m.file}`, f))
      load()
    } catch (e) { if ((e as Error).name !== 'AbortError') alertDialog(`Impossibile ricollegare il PDF: ${(e as Error).message}`) }
  }
  const allow = async () => { try { if (ask && (await ensurePermission(ask, 'read', true))) load() } catch (e) { alertDialog((e as Error).message) } }
  const tab = (id: string, label: string) => <button key={id} className={`rounded-md border px-2 py-1 transition-colors ${panel.tab === id ? 'border-brass bg-ink text-brass' : 'border-edge bg-raised hover:border-brass'}`} aria-pressed={panel.tab === id} onClick={() => patchPanel({ tab: panel.tab === id ? '' : id })}>{label}</button>

  if (status !== 'ok') return (
    <div className="space-y-3 p-6">
      <h2 className="font-display text-xl text-brass">{m.name}</h2>
      {status === 'loading' && <p className="opacity-70">Apro il PDF…</p>}
      {status === 'error' && <>
        <p className="text-danger">{err?.text ?? 'Impossibile aprire il PDF.'}</p>
        {err && <details className="text-xs opacity-70"><summary className="cursor-pointer">Dettagli tecnici</summary><code className="break-all">{err.detail}</code></details>}
      </>}
      {status === 'permission' && <><p>Il browser vuole il tuo consenso per leggere di nuovo «{m.file}». Il file non viene copiato né modificato.</p><button className="btn" onClick={allow}>Consenti la lettura</button></>}
      {status === 'missing' && <p>Non trovo più il PDF «{m.file}» (spostato, eliminato, oppure aperto da un altro browser). Scegli di nuovo il file per ricollegarlo: segnalibri, ultima pagina e zoom restano.</p>}
      {(status === 'missing' || status === 'error') && <div className="flex flex-wrap gap-2">
        {status === 'error' && <button className="btn" onClick={load}>Riprova</button>}
        <button className="btn" onClick={relink}>Scegli di nuovo il PDF</button>
      </div>}
      {status !== 'loading' && <button className="btn" onClick={onDelete}>Elimina il manuale</button>}
    </div>
  )

  return (
    <div className="flex h-full min-h-0 flex-col" onKeyDown={e => { if ((e.target as HTMLElement).tagName === 'INPUT') return; if (e.key === 'ArrowRight' || e.key === 'PageDown') go(page + 1); if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(page - 1) }}>
      <div className="flex flex-wrap items-center gap-1 border-b border-line bg-panel px-3 py-1.5">
        <input className="field w-52 font-display" value={m.name} onChange={e => update({ ...m, name: e.target.value })} aria-label="Nome del manuale" />
        <button className="btn" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Pagina precedente">◀</button>
        <NumInput className="field w-16 px-1 text-center" min={1} max={total} value={page} onCommit={n => go(n)} aria-label="Numero di pagina" />
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
        <div ref={wrap} className="min-w-0 flex-1 overflow-auto bg-ink p-4" tabIndex={0}>
          <div ref={pageBox} className="relative mx-auto shadow-xl">
            <canvas ref={canvas} className="block" aria-label={`Pagina ${page} di ${m.name}`} />
            {/* Testo selezionabile: durante la selezione la classe «selecting» evita salti del cursore fuori dal testo. */}
            <div ref={layerEl} className="textLayer" onPointerDown={e => { const el = e.currentTarget; el.classList.add('selecting'); window.addEventListener('pointerup', () => el.classList.remove('selecting'), { once: true }) }} />
          </div>
        </div>
        {panel.tab && (
          <aside className="w-72 shrink-0 space-y-2 overflow-y-auto border-l border-line bg-panel p-2 text-sm">
            {panel.tab === 'sommario' && (outline.length
              ? <ul className="space-y-0.5">{outline.map((it, i) => <li key={i} style={{ paddingLeft: it.depth * 12 }}><button className="w-full rounded-md border border-edge bg-raised px-2 py-0.5 text-left hover:border-brass hover:text-brass" onClick={() => destToPage(doc, it.dest).then(p => p && go(p))}>{it.title}</button></li>)}</ul>
              : <p className="opacity-60">Questo PDF non ha un sommario. Usa la ricerca o i segnalibri.</p>)}
            {panel.tab === 'cerca' && (
              <>
                {!pages && progress === null && <><p className="opacity-80">Per cercare nel testo l'app deve leggere il PDF una volta (può richiedere un po' per un manuale lungo). Il testo resta sul tuo computer.</p><button className="btn w-full" onClick={buildIndex}>Prepara la ricerca</button></>}
                {progress !== null && <><p role="status">Leggo il PDF… pagina {progress} di {total}</p><button className="btn" onClick={() => { stop.current = true }}>Interrompi</button></>}
                {pages && <>
                  {pages.every(p => !p) && <p className="text-danger">Il PDF non contiene testo selezionabile (probabilmente è una scansione): la ricerca non è disponibile.</p>}
                  <input className="field" placeholder="Cerca nel manuale…" aria-label="Cerca nel manuale" value={q} onChange={e => setQ(e.target.value)} />
                  {q.trim() && <p className="text-xs opacity-60">{results.length ? `${results.length}${results.length >= 60 ? '+' : ''} pagine` : 'Nessun risultato'}</p>}
                  <ul className="space-y-1">{results.map(r => <li key={r.page}><button className="block w-full rounded-md border border-edge bg-raised px-2 py-0.5 text-left hover:border-brass" onClick={() => go(r.page)}><b className="text-brass">pag. {r.page}</b><span className="block truncate text-xs opacity-70">{r.snippet}</span></button></li>)}</ul>
                </>}
              </>
            )}
            {panel.tab === 'segnalibri' && (
              <>
                <button className="btn w-full" onClick={addBookmark}>＋ Segnalibro alla pagina {page}</button>
                <ul className="space-y-1">{bookmarks.map((b, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <button className="min-w-0 flex-1 truncate rounded-md border border-edge bg-raised px-2 py-0.5 text-left hover:border-brass hover:text-brass" onClick={() => go(b.page)}><b>pag. {b.page}</b> {b.label}</button>
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

  // «Collega»: il PDF resta dov'è; si salva solo la maniglia, che il browser ricorda. «Copia»: una copia dentro la cartella dei dati.
  const link = async () => {
    try {
      const [h] = await (window as any).showOpenFilePicker({ types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }], multiple: false })
      const f: File = await h.getFile()
      const e = await create({ name: f.name.replace(/\.pdf$/i, ''), file: f.name, source: 'handle', pages: 0, last: 1, bookmarks: [] })
      await setHandle(`pdf:${e.id}`, h)
      setSel(e.id)
    } catch (e) { if ((e as Error).name !== 'AbortError') alertDialog(`Impossibile collegare il PDF: ${(e as Error).message}`) }
  }
  const copy = async (f: File) => {
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { alertDialog('Scegli un file PDF.'); return }
    try {
      const name = `${crypto.randomUUID()}.pdf`
      await tracked(store().writeBlob(`${cid}/manual-files/${name}`, f))
      setSel((await create({ name: f.name.replace(/\.pdf$/i, ''), file: name, source: 'copy', pages: 0, last: 1, bookmarks: [] })).id)
    } catch (e) { alertDialog(`Impossibile copiare il PDF: ${(e as Error).message}`) }
  }
  const del = async () => {
    if (!m || !(await confirmDialog(`Eliminare il manuale «${m.name}» dall'app? Il tuo PDF originale non viene toccato.`, { danger: true }))) return
    if (m.source === 'handle') await delHandle(`pdf:${m.id}`).catch(() => {})
    else await store().remove(`${cid}/manual-files/${m.file}`)
    await store().remove(`${cid}/manual-files/${m.id}.index.json`)
    await remove(m.id, { hard: true }); setSel(null) // i manuali non passano dal cestino: il file copiato sarebbe già stato tolto
  }
  return (
    <div className="flex h-full min-h-0">
      <SidePanel id="manuals" title="Manuali">
        <div className="space-y-2 p-2">
          <input ref={file} type="file" accept="application/pdf" hidden onChange={e => { const f = e.target.files?.[0]; if (f) copy(f); e.target.value = '' }} />
          <button className="btn w-full" onClick={link}>Collega un PDF…</button>
          <button className="btn w-full" onClick={() => file.current?.click()}>Copia un PDF nella cartella…</button>
          <p className="text-xs opacity-60">«Collega» lascia il PDF dove sta e l'app si ricorda dove trovarlo (il browser può chiederti il permesso a ogni apertura). «Copia» ne fa una copia nella cartella dei dati. In nessun caso entra nei backup.</p>
          <ul className="space-y-1">{items.map(x => (
            <li key={x.id}><button onClick={() => setSel(x.id)} className={`w-full rounded-md border px-2 py-1 text-left transition-colors ${x.id === sel ? 'border-brass bg-ink text-brass' : 'border-edge bg-raised hover:border-brass'}`}>{x.name || '(senza nome)'}{x.pages ? <span className="ml-1 text-xs opacity-60">{x.pages} pag.</span> : null}<span className="ml-1 text-xs opacity-60">{x.source === 'handle' ? '· collegato' : '· copia'}</span></button></li>
          ))}</ul>
        </div>
      </SidePanel>
      <section className="min-w-0 flex-1">
        {m ? <Viewer key={m.id} m={m} update={update} onDelete={del} initialPage={Number(sp.get('p')) || undefined} /> : <p className="p-6 opacity-60">Scegli un manuale o importa un PDF.</p>}
      </section>
    </div>
  )
}
