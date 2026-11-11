import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { setPath } from '../../core/path'
import { Entity } from '../../core/repo'
import { norm } from '../../core/search'
import { SidePanel, usePersisted } from '../../core/SidePanel'
import { useDoc } from '../../core/useDoc'
import { useEntities } from '../../core/useEntities'
import { LinksBlock } from '../shared/Links'
import Editor from './Editor'
import { Folder, childrenOf, pathOf, removeFolder } from './folders'
import { LinkTarget } from './wikilink'
import { confirmDialog, promptDialog } from '../../core/dialog'

export interface Note extends Entity { body: string; folder?: string; tags?: string[] }
const ROUTES: Record<string, string> = { characters: 'schede', items: 'oggetti', npcs: 'png', maps: 'mappe' }
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

export function NotesPage() {
  const { cid = '' } = useParams()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const { items, update, create, remove } = useEntities<Note>('notes')
  const chars = useEntities<Entity>('characters')
  const objs = useEntities<Entity>('items')
  const npcs = useEntities<Entity>('npcs')
  const maps = useEntities<Entity>('maps')
  const [fd, saveFd] = useDoc<{ folders: Folder[] }>('notes-folders.json', { folders: [] })
  const folders = fd.folders
  const [sel, setSel] = useState<string | null>(sp.get('sel'))
  const [q, setQ] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [lp, patchLp] = usePersisted('ui:notelinks', { open: true })
  useEffect(() => { const s = sp.get('sel'); if (s) setSel(s) }, [sp])
  const cur = items.find(n => n.id === sel)
  const folderIds = useMemo(() => new Set(folders.map(f => f.id)), [folders])
  const folderOf = (n: Note) => (folderIds.has(n.folder ?? '') ? (n.folder as string) : '') // note con cartella eliminata o mancante: radice
  const allTags = useMemo(() => {
    const m = new Map<string, number>()
    for (const n of items) for (const t of n.tags ?? []) m.set(t, (m.get(t) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [items])

  const t = (list: Entity[], kind: LinkTarget['kind']) => list.map(n => ({ id: n.id, title: n.name, kind }))
  const targets: LinkTarget[] = [...t(items, 'notes'), ...t(chars.items, 'characters'), ...t(objs.items, 'items'), ...t(npcs.items, 'npcs'), ...t(maps.items, 'maps')]
  const open = (kind: string, id: string) => (kind === 'notes' ? setSel(id) : ROUTES[kind] && nav(`/c/${cid}/${ROUTES[kind]}?sel=${id}`))

  const setFolders = (next: Folder[]) => saveFd({ folders: next })
  const openFolder = (id: string) => id && setFolders(folders.map(f => (f.id === id ? { ...f, open: true } : f)))
  const newNote = async (folder: string) => { openFolder(folder); setSel((await create({ name: 'Nuova nota', body: '', folder, tags: [] })).id) }
  const newFolder = async (parent: string) => {
    const name = (await promptDialog('Nome della cartella'))?.trim()
    if (name) setFolders([...folders.map(f => (f.id === parent ? { ...f, open: true } : f)), { id: crypto.randomUUID(), name, parent, open: true }])
  }
  const rename = async (f: Folder) => { const name = (await promptDialog('Nome della cartella', f.name))?.trim(); if (name) setFolders(folders.map(x => (x.id === f.id ? { ...x, name } : x))) }
  const delFolder = async (f: Folder) => {
    if (!(await confirmDialog(`Eliminare la cartella «${f.name}»? Le note e le sottocartelle non vengono cancellate: salgono di un livello.`, { danger: true }))) return
    const r = removeFolder(folders, f.id)
    items.filter(n => n.folder === f.id).forEach(n => update({ ...n, folder: r.reparent }))
    setFolders(r.folders)
  }
  const addTags = () => {
    if (!cur) return
    const fresh = tagInput.split(',').map(x => x.trim().replace(/^#/, '')).filter(Boolean)
    const have = cur.tags ?? []
    const next = [...have]
    for (const x of fresh) if (!next.some(y => same(x, y))) next.push(x)
    if (next.length !== have.length) update({ ...cur, tags: next })
    setTagInput('')
  }

  const filtering = !!q.trim() || !!tag
  const shown = items.filter(n => (!tag || (n.tags ?? []).some(x => same(x, tag))) && (!q.trim() || norm(n.name).includes(norm(q.trim()))))
  const noteRow = (n: Note, depth: number, hint?: string) => (
    <li key={n.id} style={{ paddingLeft: depth * 12 }}>
      <button onClick={() => setSel(n.id)} className={`w-full rounded px-2 py-1 text-left ${n.id === sel ? 'bg-ink text-brass' : 'hover:text-brass'}`}>
        {n.name || '(senza titolo)'}{hint && <span className="ml-1 text-xs opacity-60">{hint}</span>}
      </button>
    </li>
  )
  const tree = (parent: string, depth: number): ReactNode[] => [
    ...childrenOf(folders, parent).map(f => (
      <li key={f.id}>
        <div className="flex items-center gap-1" style={{ paddingLeft: depth * 12 }}>
          <button className="w-5 shrink-0" aria-expanded={f.open} title={f.open ? 'Comprimi' : 'Espandi'} onClick={() => setFolders(folders.map(x => (x.id === f.id ? { ...x, open: !x.open } : x)))}>{f.open ? '▾' : '▸'}</button>
          <span className="min-w-0 flex-1 truncate font-display">{f.name}</span>
          <button className="btn px-1.5 py-0 text-xs" title="Nuova nota qui" aria-label={`Nuova nota in ${f.name}`} onClick={() => newNote(f.id)}>＋</button>
          <button className="btn px-1.5 py-0 text-xs" title="Nuova sottocartella" aria-label={`Nuova sottocartella in ${f.name}`} onClick={() => newFolder(f.id)}>⊞</button>
          <button className="btn px-1.5 py-0 text-xs" title="Rinomina" aria-label={`Rinomina ${f.name}`} onClick={() => rename(f)}>✎</button>
          <button className="btn px-1.5 py-0 text-xs" title="Elimina la cartella" aria-label={`Elimina ${f.name}`} onClick={() => delFolder(f)}>✕</button>
        </div>
        {f.open && <ul className="space-y-1">{tree(f.id, depth + 1)}</ul>}
      </li>
    )),
    ...items.filter(n => folderOf(n) === parent).map(n => noteRow(n, depth)),
  ]

  return (
    <div className="flex h-full min-h-0">
      <SidePanel id="notes" title="Note">
        <div className="space-y-2 p-2">
          <div className="flex gap-1">
            <button className="btn grow" onClick={() => newNote('')}>Nuova nota</button>
            <button className="btn" title="Nuova cartella" onClick={() => newFolder('')}>＋ Cartella</button>
          </div>
          <input className="field" placeholder="Cerca nel titolo…" aria-label="Cerca nel titolo" value={q} onChange={e => setQ(e.target.value)} />
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1" role="group" aria-label="Filtra per tag">
              {allTags.map(([x, n]) => (
                <button key={x} aria-pressed={!!tag && same(tag, x)} className={`rounded border px-1.5 text-xs ${tag && same(tag, x) ? 'border-brass bg-brass text-ink' : 'border-line hover:border-brass'}`} onClick={() => setTag(tag && same(tag, x) ? null : x)}>#{x} {n}</button>
              ))}
            </div>
          )}
          <ul className="space-y-1">
            {filtering
              ? <>{shown.map(n => noteRow(n, 0, folderOf(n) ? pathOf(folders, folderOf(n)) : undefined))}{!shown.length && <li className="text-sm opacity-60">Nessuna nota trovata.</li>}</>
              : tree('', 0)}
          </ul>
        </div>
      </SidePanel>
      <section className="flex min-h-0 min-w-0 flex-1 gap-3 p-4">
        {cur ? (
          <>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
              <div className="flex gap-2">
                <input className="field font-display text-2xl" value={cur.name} onChange={e => update({ ...cur, name: e.target.value })} aria-label="Titolo" />
                <button className="btn shrink-0" onClick={async () => { if (await confirmDialog(`Eliminare «${cur.name}»?`, { danger: true })) { remove(cur.id); setSel(null) } }}>Elimina</button>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="flex items-center gap-1">Cartella
                  <select className="field w-auto" value={folderOf(cur)} onChange={e => update({ ...cur, folder: e.target.value })}>
                    <option value="">(nessuna)</option>
                    {[...folders].sort((a, b) => pathOf(folders, a.id).localeCompare(pathOf(folders, b.id))).map(f => <option key={f.id} value={f.id}>{pathOf(folders, f.id)}</option>)}
                  </select>
                </label>
                <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Tag della nota">
                  {(cur.tags ?? []).map(x => (
                    <span key={x} className="inline-flex items-center rounded border border-line text-xs">
                      <span className="px-1.5">#{x}</span>
                      <button className="px-1 opacity-60 hover:opacity-100" aria-label={`Togli il tag ${x}`} onClick={() => update({ ...cur, tags: (cur.tags ?? []).filter(y => y !== x) })}>✕</button>
                    </span>
                  ))}
                  <input list="note-tags" className="field w-32 px-1 text-xs" placeholder="+ tag (invio)" aria-label="Aggiungi un tag" value={tagInput}
                    onChange={e => setTagInput(e.target.value)} onBlur={addTags}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTags() } }} />
                  <datalist id="note-tags">{allTags.map(([x]) => <option key={x} value={x} />)}</datalist>
                </div>
              </div>
              <Editor id={cur.id} body={cur.body} targets={targets} onOpen={open} onChange={body => update({ ...cur, body })} />
            </div>
            {lp.open ? (
              <aside className="w-64 shrink-0 space-y-2 overflow-y-auto rounded border border-line bg-panel p-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-brass">Collegamenti</h3>
                  <button className="btn px-2 py-0" title="Nascondi" onClick={() => patchLp({ open: false })}>›</button>
                </div>
                <LinksBlock c={cur} set={(p, v) => update(setPath(cur, p, v))} cfg={{}} />
              </aside>
            ) : <button className="btn h-fit px-2 py-1" title="Mostra i collegamenti" onClick={() => patchLp({ open: true })}>‹ Collegamenti</button>}
          </>
        ) : <p className="opacity-60">Scegli una nota o creane una nuova.</p>}
      </section>
    </div>
  )
}
