import { MouseEvent, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { exportCampaign, importCampaign, scanOrphanImages } from './core/backup'
import { removeImage } from './core/images'
import { browserEntryCount, clearBrowserData, migrateFromBrowser } from './core/migrate'
import { fmtSize } from './core/orphans'
import { Campaign, repo } from './core/repo'
import { SaveIndicator, savingNow, tracked } from './core/saveStatus'
import { usePersisted } from './core/SidePanel'
import { chooseFolder, folderName, store } from './core/storage'
import { ThemeToggle } from './core/Theme'
import { DiceMenu } from './features/dice/DiceMenu'
import { SearchPalette } from './features/search/SearchPalette'
import { alertDialog, confirmDialog } from './core/dialog'

export function CampaignsPage() {
  const [list, setList] = useState<Campaign[]>([])
  const [name, setName] = useState('')
  const [del, setDel] = useState<Campaign | null>(null)
  const [typed, setTyped] = useState('')
  const [legacy, setLegacy] = useState(() => browserEntryCount())
  const nav = useNavigate()
  const file = useRef<HTMLInputElement>(null)
  const load = () => repo.campaigns().then(setList)
  useEffect(() => { load() }, [])
  const add = async () => {
    if (!name.trim()) return
    await tracked(repo.saveCampaigns([...list, { id: crypto.randomUUID(), name: name.trim() }])); setName(''); load()
  }
  const importFile = async (f: File) => { try { await importCampaign(f); load() } catch (e) { alertDialog((e as Error).message) } }
  const migrate = async () => {
    try {
      const r = await migrateFromBrowser(store())
      await load()
      if (await confirmDialog(`Copiati ${r.copied} file${r.skipped ? ` (${r.skipped} già presenti nella cartella)` : ''}. Vuoi cancellare ora i dati dal browser?\nConsiglio: rispondi No finché non hai verificato che le campagne compaiano qui sotto.`, { title: 'Migrazione completata', danger: true, ok: 'Cancella dal browser' })) clearBrowserData()
      setLegacy(browserEntryCount())
    } catch (e) { alertDialog(`Migrazione non riuscita: ${(e as Error).message}`) }
  }
  const cleanImages = async (c: Campaign) => {
    if (savingNow()) { alertDialog('Ci sono salvataggi in corso: riprova tra un momento.'); return }
    try {
      const { orphans, bytes } = await scanOrphanImages(c.id)
      if (!orphans.length) { alertDialog('Nessuna immagine inutilizzata.', 'Pulizia delle immagini'); return }
      if (!(await confirmDialog(`Trovate ${orphans.length} immagini inutilizzate (${fmtSize(bytes)}). Eliminarle definitivamente?\nConsiglio: scarica prima un backup.`, { danger: true }))) return
      for (const n of orphans) await removeImage(c.id, n)
    } catch (e) { alertDialog(`Pulizia non riuscita: ${(e as Error).message}`) }
  }
  const close = () => { setDel(null); setTyped('') }
  const confirmDelete = async () => {
    if (!del || typed !== 'CONFERMA') return
    await store().removeDir(del.id)
    await repo.saveCampaigns(list.filter(c => c.id !== del.id))
    close(); load()
  }
  // Le azioni secondarie stanno in un menu: dopo il clic si richiude.
  const act = (e: MouseEvent<HTMLButtonElement>, f: () => unknown) => { e.currentTarget.closest('details')?.removeAttribute('open'); f() }

  return (
    <>
      <main id="main" className="mx-auto max-w-5xl px-6 py-10">
        <header className="flex flex-wrap items-center gap-4">
          <h1 className="flex items-center gap-3 text-4xl text-brass"><img src="/favicon.svg" alt="" className="h-11 w-11" />D&amp;D manage</h1>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Cartella dei dati</span>
            <b className="rounded-md border border-edge px-2 py-1">{folderName()}</b>
            <button className="btn" title="Scegli un'altra cartella per i dati" onClick={async () => { try { await chooseFolder(); await load() } catch (e) { if ((e as Error).name !== 'AbortError') alertDialog((e as Error).message) } }}>Cambia</button>
            <ThemeToggle />
          </div>
        </header>

        {legacy > 0 && (
          <div role="status" className="mt-6 rounded-lg border border-brass bg-panel p-4 text-sm">
            <p>Ho trovato {legacy} file salvati nel browser da versioni precedenti: copiali nella cartella dei dati per non perderli.</p>
            <button className="btn btn-primary mt-3" onClick={migrate}>Copia nella cartella</button>
          </div>
        )}

        <section aria-labelledby="camp" className="mt-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 id="camp" className="text-2xl">Le tue campagne</h2>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = '' }} />
            <button className="btn" onClick={() => file.current?.click()}>Importa un backup…</button>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map(c => (
              <li key={c.id} className="flex min-h-36 flex-col justify-between gap-6 rounded-xl border border-line bg-panel p-4 shadow-sm shadow-black/20">
                <h3 className="break-words text-xl">{c.name}</h3>
                <div className="flex items-center gap-2">
                  <button className="btn btn-primary grow" onClick={() => nav(`/c/${c.id}`)}>Apri</button>
                  <details className="relative">
                    <summary className="btn cursor-pointer list-none" aria-label={`Altre azioni per ${c.name}`}>⋯</summary>
                    <div className="absolute right-0 z-10 mt-1 w-60 rounded-lg border border-edge bg-panel p-1 shadow-xl shadow-black/40">
                      <button className="menu-item" onClick={e => act(e, () => exportCampaign(c).catch(err => alertDialog((err as Error).message)))}>Scarica un backup (JSON)</button>
                      <button className="menu-item" onClick={e => act(e, () => cleanImages(c))}>Elimina le immagini inutilizzate</button>
                      <button className="menu-item text-danger" onClick={e => act(e, () => setDel(c))}>Elimina la campagna…</button>
                    </div>
                  </details>
                </div>
              </li>
            ))}
            <li className="flex min-h-36 flex-col justify-center gap-3 rounded-xl border border-dashed border-edge p-4">
              <label htmlFor="new-camp" className="text-sm text-muted">{list.length ? 'Nuova campagna' : 'Crea la tua prima campagna'}</label>
              <input id="new-camp" className="field" placeholder="Nome della campagna" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
              <button className="btn" onClick={add} disabled={!name.trim()}>Crea campagna</button>
            </li>
          </ul>
        </section>
      </main>

      {del && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={e => e.target === e.currentTarget && close()}>
          <div role="dialog" aria-modal="true" aria-label="Elimina campagna" className="dialog w-[min(28rem,100%)] space-y-3 p-5">
            <h2 className="text-xl text-danger">Eliminare «{del.name}»?</h2>
            <p className="text-sm">Verranno cancellati per sempre schede, note, oggetti, PNG, mappe e layout di questa campagna. Per confermare scrivi <b>CONFERMA</b> in maiuscolo.</p>
            <input autoFocus className="field" value={typed} onChange={e => setTyped(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmDelete()} aria-label="Scrivi CONFERMA" />
            <div className="flex justify-end gap-2">
              <button className="btn" onClick={close}>Annulla</button>
              <button className="btn btn-danger" disabled={typed !== 'CONFERMA'} onClick={confirmDelete}>Elimina definitivamente</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Sezioni raggruppate in menu a tendina: per cambiare i gruppi basta modificare questo elenco.
const GROUPS: { label: string; tabs: [string, string][] }[] = [
  { label: 'Giocatore', tabs: [['schede', 'Schede'], ['note', 'Note']] },
  { label: 'Elementi di gioco', tabs: [['oggetti', 'Oggetti e magie'], ['mappe', 'Mappe'], ['manuali', 'Manuali']] },
  { label: 'Strumenti', tabs: [['cestino', 'Cestino']] },
  { label: 'Master', tabs: [['png', 'PNG e creature'], ['relazioni', 'Relazioni'], ['master', 'Spazio del master'], ['combattimento', 'Combattimento'], ['sessioni', 'Sessioni']] },
]
const TABS = GROUPS.flatMap(g => g.tabs)

function NavMenu({ cid, seg }: { cid: string; seg: string }) {
  const [open, setOpen] = useState<string | null>(null)
  const box = useRef<HTMLElement>(null)
  useEffect(() => { setOpen(null) }, [seg])
  useEffect(() => {
    if (!open) return
    const down = (e: globalThis.MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(null) }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    window.addEventListener('mousedown', down); window.addEventListener('keydown', key)
    return () => { window.removeEventListener('mousedown', down); window.removeEventListener('keydown', key) }
  }, [open])
  return (
    <nav ref={box} className="flex gap-1" aria-label="Sezioni">
      {GROUPS.map(g => {
        const active = g.tabs.some(([p]) => p === seg)
        return (
          <div key={g.label} className="relative">
            <button className={`min-h-8 rounded-md px-3 text-sm ${active ? 'bg-raised text-brass' : 'hover:bg-raised'}`} aria-haspopup="menu" aria-expanded={open === g.label} onClick={() => setOpen(open === g.label ? null : g.label)}>{g.label} ▾</button>
            {open === g.label && (
              <ul role="menu" className="absolute left-0 top-full z-40 mt-1 min-w-56 rounded-lg border border-edge bg-panel p-1 shadow-xl shadow-black/40">
                {g.tabs.map(([p, l]) => (
                  <li key={p} role="none"><NavLink role="menuitem" to={`/c/${cid}/${p}`} className={({ isActive }) => `menu-item ${isActive ? 'bg-raised text-brass' : ''}`}>{l}</NavLink></li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )
}

// Header: nome della campagna, categorie (espanso) o sezione corrente (ridotto). A destra: ricerca, dadi, tema, «Cambia campagna» (separato dal menu) e riduci/espandi.
export function CampaignLayout() {
  const { cid } = useParams()
  const { pathname } = useLocation()
  const [h, patch] = usePersisted('ui:header', { open: true })
  const [searchOpen, setSearchOpen] = useState(false)
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(o => !o) } }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [])
  const [name, setName] = useState('')
  useEffect(() => { repo.campaigns().then(l => setName(l.find(c => c.id === cid)?.name ?? '')) }, [cid])
  const seg = pathname.split('/')[3] ?? ''
  const current = TABS.find(([p]) => p === seg)?.[1] ?? ''
  return (
    <div className="flex h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-brass focus:px-3 focus:py-1 focus:text-onbrass">Vai al contenuto</a>
      <header className="shrink-0 border-b border-line bg-panel">
        <div className="flex items-center gap-4 px-4 py-1.5">
          <span className="flex items-center gap-2 text-lg text-brass"><img src="/favicon.svg" alt="" className="h-6 w-6" />{name}</span>
          <SaveIndicator />
          {h.open ? <NavMenu cid={cid ?? ''} seg={seg} /> : <span className="text-sm text-muted">{current}</span>}
          <div className="ml-auto flex items-center gap-3">
            <button className="btn" title="Cerca nella campagna (Ctrl+K)" onClick={() => setSearchOpen(true)}>⌕ Cerca</button>
            <DiceMenu />
            <ThemeToggle />
            <div className="flex items-center gap-3 border-l border-line pl-4">
              <Link to="/" title="Torna alla scelta della campagna" className="btn">⇦ Cambia campagna</Link>
              <button className="btn" title={h.open ? 'Riduci il menu' : 'Espandi il menu'} aria-label={h.open ? 'Riduci il menu' : 'Espandi il menu'} onClick={() => patch({ open: !h.open })}>{h.open ? '▲' : '▼'}</button>
            </div>
          </div>
        </div>
      </header>
      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
      <main id="main" tabIndex={-1} className="min-h-0 flex-1 overflow-hidden focus:outline-none"><Outlet /></main>
    </div>
  )
}
