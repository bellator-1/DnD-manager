import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Kind, repo } from '../../core/repo'
import { Doc, search, toDoc } from '../../core/search'

// Ricerca globale (Ctrl+K): titoli, testi e tag di tutti gli elementi della campagna. Si carica all'apertura, non c'è nessun indice da mantenere.
const KINDS: Kind[] = ['characters', 'npcs', 'items', 'maps', 'notes', 'sessions', 'manuals']
const ROUTE: Record<string, string> = { characters: 'schede', npcs: 'png', items: 'oggetti', spells: 'oggetti', maps: 'mappe', notes: 'note', sessions: 'sessioni', manuals: 'manuali' }
const LABEL: Record<string, string> = { characters: 'Scheda', npcs: 'PNG', items: 'Oggetto', spells: 'Magia', maps: 'Mappa', notes: 'Nota', sessions: 'Sessione', manuals: 'Manuale' }

export function SearchPalette({ onClose }: { onClose: () => void }) {
  const { cid = '' } = useParams()
  const nav = useNavigate()
  const [docs, setDocs] = useState<Doc[] | null>(null)
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    Promise.all(KINDS.map(k => repo.list<any>(cid, k))).then(ls => setDocs(ls.flatMap((l, n) => l.map(e => toDoc(KINDS[n] === 'items' && e.tipo === 'magia' ? 'spells' : KINDS[n], e)))))
    input.current?.focus()
  }, [cid])
  const hits = useMemo(() => (docs ? search(docs, q) : []), [docs, q])
  useEffect(() => setI(0), [q])
  const go = (d: Doc) => { nav(`/c/${cid}/${ROUTE[d.kind]}?sel=${d.id}`); onClose() }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh]" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Cerca nella campagna" className="w-[min(40rem,100%)] dialog p-3"
        onKeyDown={e => { if (e.key === 'Escape') onClose() }}>
        <input ref={input} className="field text-lg" role="combobox" aria-expanded={hits.length > 0} aria-controls="search-results" aria-activedescendant={hits[i] ? `hit-${i}` : undefined}
          placeholder="Cerca in schede, note, oggetti, PNG, mappe, sessioni…" value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setI(n => Math.min(hits.length - 1, n + 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setI(n => Math.max(0, n - 1)) }
            else if (e.key === 'Enter' && hits[i]) go(hits[i].doc)
          }} />
        <ul id="search-results" role="listbox" className="mt-2 max-h-[55vh] overflow-y-auto">
          {hits.map((h, n) => (
            <li key={h.doc.kind + h.doc.id} id={`hit-${n}`} role="option" aria-selected={n === i}>
              <button className={`block w-full rounded px-2 py-1.5 text-left ${n === i ? 'bg-ink' : 'hover:bg-ink'}`} onMouseEnter={() => setI(n)} onClick={() => go(h.doc)}>
                <span className="mr-2 text-xs text-brass">{LABEL[h.doc.kind]}</span><b>{h.doc.title || '(senza nome)'}</b>
                {h.doc.tags.length > 0 && <span className="ml-2 text-xs opacity-60">{h.doc.tags.map(t => '#' + t).join(' ')}</span>}
                <span className="block truncate text-xs opacity-70">{h.snippet}</span>
              </button>
            </li>
          ))}
        </ul>
        {!docs && <p className="p-2 text-sm opacity-60">Carico la campagna…</p>}
        {docs && !q.trim() && <p className="p-2 text-sm opacity-60">Scrivi per cercare. Frecce per scegliere, Invio per aprire, Esc per chiudere.</p>}
        {docs && q.trim() && !hits.length && <p className="p-2 text-sm opacity-60">Nessun risultato.</p>}
      </div>
    </div>
  )
}
