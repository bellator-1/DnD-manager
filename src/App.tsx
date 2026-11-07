import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { exportCampaign, importCampaign } from './core/backup'
import { Campaign, repo } from './core/repo'
import { SaveIndicator, tracked } from './core/saveStatus'
import { usePersisted } from './core/SidePanel'
import { hasFsApi, pickFolder, store } from './core/storage'
import { DiceMenu } from './features/dice/DiceMenu'

export function CampaignsPage() {
  const [list, setList] = useState<Campaign[]>([])
  const [name, setName] = useState('')
  const [del, setDel] = useState<Campaign | null>(null)
  const [typed, setTyped] = useState('')
  const nav = useNavigate()
  const file = useRef<HTMLInputElement>(null)
  const load = () => repo.campaigns().then(setList)
  useEffect(() => { load() }, [])
  const add = async () => {
    if (!name.trim()) return
    await tracked(repo.saveCampaigns([...list, { id: crypto.randomUUID(), name: name.trim() }])); setName(''); load()
  }
  const importFile = async (f: File) => { try { await importCampaign(f); load() } catch (e) { alert((e as Error).message) } }
  const close = () => { setDel(null); setTyped('') }
  const confirmDelete = async () => {
    if (!del || typed !== 'CONFERMA') return
    await store().removeDir(del.id)
    await repo.saveCampaigns(list.filter(c => c.id !== del.id))
    close(); load()
  }
  return (
    <>
      <main className="mx-auto max-w-xl p-8">
        <h1 className="flex items-center gap-3 font-display text-4xl text-brass"><img src="/favicon.svg" alt="" className="h-10 w-10" />D&amp;D manage</h1>
        <h2 className="mt-1 opacity-70">Le tue campagne</h2>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = '' }} />
        <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn" onClick={() => file.current?.click()}>Importa campagna (JSON)…</button>
        {hasFsApi() && <button className="btn" onClick={async () => { await pickFolder(); load() }}>Usa una cartella sul disco</button>}
        </div>
        <ul className="mt-6 space-y-2">
          {list.map(c => (
            <li key={c.id} className="flex gap-2">
              <button className="btn w-full text-left" onClick={() => nav(`/c/${c.id}`)}>{c.name}</button>
              <button className="btn shrink-0" title="Scarica un backup di questa campagna (JSON)" onClick={() => exportCampaign(c).catch(e => alert((e as Error).message))}>Esporta</button>
              <button className="btn shrink-0" title="Elimina la campagna" aria-label={`Elimina ${c.name}`} onClick={() => setDel(c)}>Elimina</button>
            </li>
          ))}
          {!list.length && <li className="opacity-60">Nessuna campagna: creane una qui sotto.</li>}
        </ul>
        <div className="mt-6 flex gap-2">
          <input className="field" placeholder="Nome della campagna" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
          <button className="btn" onClick={add}>Crea campagna</button>
        </div>
      </main>
      {del && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={e => e.target === e.currentTarget && close()}>
          <div role="dialog" aria-modal="true" aria-label="Elimina campagna" className="w-[min(28rem,100%)] space-y-3 rounded border border-line bg-panel p-5 shadow-2xl">
            <h2 className="font-display text-xl text-red-400">Eliminare «{del.name}»?</h2>
            <p className="text-sm">Verranno cancellati per sempre schede, note, oggetti, PNG, mappe e layout di questa campagna. Per confermare scrivi <b>CONFERMA</b> in maiuscolo.</p>
            <input autoFocus className="field" value={typed} onChange={e => setTyped(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmDelete()} aria-label="Scrivi CONFERMA" />
            <div className="flex justify-end gap-2">
              <button className="btn" onClick={close}>Annulla</button>
              <button className="btn border-red-400 text-red-400 disabled:opacity-40" disabled={typed !== 'CONFERMA'} onClick={confirmDelete}>Elimina definitivamente</button>
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
  { label: 'Elementi di gioco', tabs: [['oggetti', 'Oggetti e magie'], ['mappe', 'Mappe']] },
  { label: 'Master', tabs: [['png', 'PNG e creature'], ['master', 'Spazio del master'], ['combattimento', 'Combattimento'], ['sessioni', 'Sessioni']] },
]
const TABS = GROUPS.flatMap(g => g.tabs)

function NavMenu({ cid, seg }: { cid: string; seg: string }) {
  const [open, setOpen] = useState<string | null>(null)
  const box = useRef<HTMLElement>(null)
  useEffect(() => { setOpen(null) }, [seg])
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(null) }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    window.addEventListener('mousedown', down); window.addEventListener('keydown', key)
    return () => { window.removeEventListener('mousedown', down); window.removeEventListener('keydown', key) }
  }, [open])
  return (
    <nav ref={box} className="flex gap-1" aria-label="Sezioni">
      {GROUPS.map(g => (
        <div key={g.label} className="relative">
          <button className={`rounded px-3 py-1 ${g.tabs.some(([p]) => p === seg) ? 'bg-ink text-brass' : 'hover:text-brass'}`} aria-haspopup="menu" aria-expanded={open === g.label} onClick={() => setOpen(open === g.label ? null : g.label)}>{g.label} ▾</button>
          {open === g.label && (
            <ul role="menu" className="absolute left-0 top-full z-40 mt-1 min-w-52 rounded border border-line bg-panel p-1 shadow-xl">
              {g.tabs.map(([p, l]) => (
                <li key={p} role="none"><NavLink role="menuitem" to={`/c/${cid}/${p}`} className={({ isActive }) => `block rounded px-3 py-1.5 ${isActive ? 'bg-ink text-brass' : 'hover:bg-ink hover:text-brass'}`}>{l}</NavLink></li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </nav>
  )
}

// Header: nome della campagna, categorie (espanso) o sezione corrente (ridotto). A destra: dadi, «Cambia campagna» (separato dal menu) e riduci/espandi.
export function CampaignLayout() {
  const { cid } = useParams()
  const { pathname } = useLocation()
  const [h, patch] = usePersisted('ui:header', { open: true })
  const [name, setName] = useState('')
  useEffect(() => { repo.campaigns().then(l => setName(l.find(c => c.id === cid)?.name ?? '')) }, [cid])
  const seg = pathname.split('/')[3] ?? ''
  const current = TABS.find(([p]) => p === seg)?.[1] ?? ''
  return (
    <div className="flex h-screen flex-col">
      <header className="shrink-0 border-b border-line bg-panel">
        <div className="flex items-center gap-4 px-4 py-1">
          <span className="font-display text-lg text-brass">{name}</span>
          <SaveIndicator />
          {h.open ? <NavMenu cid={cid ?? ''} seg={seg} /> : <span className="text-sm opacity-70">{current}</span>}
          <div className="ml-auto flex items-center gap-4">
            <DiceMenu />
            <div className="flex items-center gap-3 border-l border-line pl-4">
              <Link to="/" title="Torna alla scelta della campagna" className="rounded border border-line px-3 py-1 text-sm opacity-80 hover:border-brass hover:text-brass">⇦ Cambia campagna</Link>
              <button className="btn px-2 py-0" title={h.open ? 'Riduci il menu' : 'Espandi il menu'} onClick={() => patch({ open: !h.open })}>{h.open ? '▲' : '▼'}</button>
            </div>
          </div>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden"><Outlet /></main>
    </div>
  )
}
