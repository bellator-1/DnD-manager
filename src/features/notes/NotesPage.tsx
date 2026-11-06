import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { setPath } from '../../core/path'
import { SidePanel, usePersisted } from '../../core/SidePanel'
import { Entity } from '../../core/repo'
import { useEntities } from '../../core/useEntities'
import { LinksBlock } from '../shared/Links'
import Editor from './Editor'
import { LinkTarget } from './wikilink'

export interface Note extends Entity { body: string }
const ROUTES: Record<string, string> = { characters: 'schede', items: 'oggetti', npcs: 'png', maps: 'mappe' }

export function NotesPage() {
  const { cid = '' } = useParams()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const { items, update, create, remove } = useEntities<Note>('notes')
  const chars = useEntities<Entity>('characters')
  const objs = useEntities<Entity>('items')
  const npcs = useEntities<Entity>('npcs')
  const maps = useEntities<Entity>('maps')
  const [sel, setSel] = useState<string | null>(sp.get('sel'))
  const [lp, patchLp] = usePersisted('ui:notelinks', { open: true })
  useEffect(() => { const s = sp.get('sel'); if (s) setSel(s) }, [sp])
  const cur = items.find(n => n.id === sel)
  const t = (list: Entity[], kind: LinkTarget['kind']) => list.map(n => ({ id: n.id, title: n.name, kind }))
  const targets: LinkTarget[] = [...t(items, 'notes'), ...t(chars.items, 'characters'), ...t(objs.items, 'items'), ...t(npcs.items, 'npcs'), ...t(maps.items, 'maps')]
  const open = (kind: string, id: string) => (kind === 'notes' ? setSel(id) : ROUTES[kind] && nav(`/c/${cid}/${ROUTES[kind]}?sel=${id}`))

  return (
    <div className="flex h-full min-h-0">
      <SidePanel id="notes" title="Note">
        <div className="space-y-2 p-2">
          <button className="btn w-full" onClick={async () => setSel((await create({ name: 'Nuova nota', body: '' })).id)}>Nuova nota</button>
          <ul className="space-y-1">{items.map(n => (
            <li key={n.id}><button onClick={() => setSel(n.id)} className={`w-full rounded px-2 py-1 text-left ${n.id === sel ? 'bg-ink text-brass' : 'hover:text-brass'}`}>{n.name || '(senza titolo)'}</button></li>
          ))}</ul>
        </div>
      </SidePanel>
      <section className="flex min-h-0 min-w-0 flex-1 gap-3 p-4">
        {cur ? (
          <>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
              <div className="flex gap-2">
                <input className="field font-display text-2xl" value={cur.name} onChange={e => update({ ...cur, name: e.target.value })} aria-label="Titolo" />
                <button className="btn shrink-0" onClick={() => confirm(`Eliminare «${cur.name}»?`) && (remove(cur.id), setSel(null))}>Elimina</button>
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
