import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPath } from '../../core/path'
import { Kind, repo } from '../../core/repo'
import type { BlockDef, Setter } from '../../core/SheetView'

// Collegamenti tra qualsiasi coppia di elementi. Una lista vive in un percorso dei dati: «collegamenti» (blocco classico, con «Collegato da»)
// oppure «liste.<id del blocco>» (elenchi indipendenti, usati nello spazio del master).
export interface Link { kind: Kind; id: string }
const KINDS: Kind[] = ['characters', 'npcs', 'items', 'maps', 'notes', 'sessions', 'manuals']
const ROUTE: Record<string, string> = { characters: 'schede', npcs: 'png', items: 'oggetti', maps: 'mappe', notes: 'note', sessions: 'sessioni', manuals: 'manuali' }
const GROUPS: [string, string][] = [['characters', 'Personaggi'], ['npcs', 'PNG e creature'], ['items', 'Oggetti'], ['spells', 'Magie'], ['maps', 'Mappe'], ['notes', 'Note'], ['sessions', 'Sessioni'], ['manuals', 'Manuali']]
const SHORT: Record<string, string> = { characters: 'Scheda', npcs: 'PNG', items: 'Oggetto', spells: 'Magia', maps: 'Mappa', notes: 'Nota', sessions: 'Sessione', manuals: 'Manuale' }
interface T { kind: Kind; id: string; name: string; group: string; links: Link[]; meta: string }

const metaOf = (k: Kind, e: any) =>
  k === 'characters' ? [e.classe, e.livello && `Liv. ${e.livello}`].filter(Boolean).join(' ')
  : k === 'npcs' ? [e.tipo, e.gs && `GS ${e.gs}`].filter(Boolean).join(' · ')
  : k === 'items' ? (e.tipo === 'magia' ? (e.livello === 0 ? 'Trucchetto' : `Liv. ${e.livello}`) : [e.categoria, e.rarita].filter(Boolean).join(' · '))
  : k === 'sessions' ? (e.numero ? `n. ${e.numero}` : '') : ''

export function LinkList({ c, set, path, only, back }: { c: any; set: Setter; path: string; only?: string; back?: boolean }) {
  const { cid = '' } = useParams()
  const nav = useNavigate()
  const [all, setAll] = useState<T[]>([])
  useEffect(() => {
    let on = true
    Promise.all(KINDS.map(k => repo.list<any>(cid, k))).then(ls => on && setAll(ls.flatMap((l, i) => l.map(e => ({
      kind: KINDS[i], id: e.id, name: e.name, group: KINDS[i] === 'items' && e.tipo === 'magia' ? 'spells' : KINDS[i], links: e.collegamenti ?? [], meta: metaOf(KINDS[i], e),
    })))))
    return () => { on = false }
  }, [cid, c.id])

  const mine: Link[] = getPath(c, path) ?? []
  const byId = new Map<string, T>(all.map(t => [t.id, t] as [string, T]))
  const go = (k: string, id: string) => nav(`/c/${cid}/${ROUTE[k]}?sel=${id}`)
  const backs = back ? all.filter(t => t.id !== c.id && t.links.some(l => l.id === c.id) && !mine.some(l => l.id === t.id)) : []
  const free = all.filter(t => t.id !== c.id && !mine.some(l => l.id === t.id) && (!only || t.group === only))

  const chip = (k: string, id: string, onRemove?: () => void) => {
    const t = byId.get(id)
    return (
      <span key={id} className="inline-flex items-center rounded border border-line text-sm">
        <button className="px-2 py-0.5 hover:text-brass" onClick={() => go(k, id)}>
          <span className="mr-1 text-xs opacity-60">{SHORT[t?.group ?? k]}</span>{t?.name ?? '(non trovato)'}
          {t?.meta && <span className="ml-1 text-xs opacity-60">{t.meta}</span>}
        </button>
        {onRemove && <button className="px-1 opacity-60 hover:opacity-100" aria-label="Scollega" title="Scollega" onClick={onRemove}>✕</button>}
      </span>
    )
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {mine.map(l => chip(l.kind, l.id, () => set(path, mine.filter(x => x.id !== l.id))))}
        {!mine.length && <span className="text-sm opacity-60">Nessun collegamento.</span>}
      </div>
      <select className="field" value="" aria-label="Collega a…" onChange={e => { const t = byId.get(e.target.value); if (t) set(path, [...mine, { kind: t.kind, id: t.id }]) }}>
        <option value="">+ Collega a…</option>
        {GROUPS.map(([g, l]) => { const xs = free.filter(t => t.group === g); return xs.length ? <optgroup key={g} label={l}>{xs.map(t => <option key={t.id} value={t.id}>{t.name || '(senza nome)'}</option>)}</optgroup> : null })}
      </select>
      {backs.length > 0 && <div><div className="mb-1 text-xs opacity-60">Collegato da</div><div className="flex flex-wrap gap-1">{backs.map(t => chip(t.kind, t.id))}</div></div>}
    </div>
  )
}

export function LinksBlock({ c, set }: { c: any; set: Setter; cfg?: any }) {
  return <LinkList c={c} set={set} path="collegamenti" back />
}
export const linksBlock: BlockDef = { label: 'Collegamenti', C: LinksBlock }

// Elenco indipendente: ogni blocco ha il suo percorso («liste.<id>»), quindi se ne possono mettere quanti si vuole; il filtro limita cosa si può aggiungere.
export const linkListBlock: BlockDef = {
  label: 'Elenco di collegamenti',
  C: ({ c, set, cfg }) => <LinkList c={c} set={set} path={`liste.${cfg.nodeId}`} only={cfg.filter || undefined} />,
  cfg: { filter: '' },
  props: [{ key: 'filter', label: 'Mostra solo', options: [['', 'Tutto'], ...GROUPS] }],
}
