import { ReactNode, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { rollEvent } from '../features/dice/DiceMenu'
import { NumInput } from './NumInput'
import { getPath } from './path'
import { Kind, repo } from './repo'
import type { BlockDef, Setter } from './SheetView'

// Blocco "elenco di righe" (attacchi, danni, azioni, incantesimi, inventario…): percorso dei dati + colonne.
// Con `link` ogni riga può essere anche un collegamento a un elemento dell'archivio: mostra il nome (apre la pagina) e un riassunto.
export interface Col { key: string; label: string; w?: string; num?: boolean; roll?: 'attack' | 'dice'; options?: [string, string][] } // options: la colonna è un menu a scelta
export type RowCtx = { c: any; set: Setter; patchRow: (p: Record<string, any>) => void }
export interface LinkOpt { kind: Kind; noun: string; filter?: (e: any) => boolean; qty?: boolean; summary: (e: any) => ReactNode; actions?: (e: any, row: Record<string, any>, ctx: RowCtx) => ReactNode } // actions: pulsanti in più accanto al nome (es. «Attivo», «Lancia»)
const ROUTE: Record<string, string> = { items: 'oggetti', characters: 'schede', npcs: 'png', maps: 'mappe', notes: 'note' }
const expr = (kind: 'attack' | 'dice', v: unknown) => (kind === 'attack' ? `1d20${+(v as number) >= 0 ? '+' : ''}${+(v as number) || 0}` : String(v ?? ''))

function RowsView({ c, set, path, cols, noun, link }: { c: any; set: Setter; path: string; cols: Col[]; noun: string; link?: LinkOpt }) {
  const { cid = '' } = useParams()
  const nav = useNavigate()
  const [pool, setPool] = useState<any[]>([])
  useEffect(() => { if (link) repo.list<any>(cid, link.kind).then(l => setPool(l.filter(link.filter ?? (() => true)))) }, [cid])
  const rows: Record<string, any>[] = getPath(c, path) ?? []
  const put = (next: Record<string, any>[]) => set(path, next)
  const patch = (i: number, p: Record<string, any>) => put(rows.map((x, k) => (k === i ? { ...x, ...p } : x)))

  return (
    <div className="space-y-1 text-sm">
      {rows.map((r, i) => {
        if (link && r.ref) {
          const e = pool.find(x => x.id === r.ref)
          return (
            <div key={i} className="rounded border border-line p-1.5">
              <div className="flex items-center gap-2">
                {e ? <button className="font-display text-brass hover:underline" title="Apri la pagina" onClick={() => nav(`/c/${cid}/${ROUTE[link.kind]}?sel=${e.id}`)}>{e.name}</button> : <span className="opacity-60">(elemento non trovato)</span>}
                {e && link.actions?.(e, r, { c, set, patchRow: p => patch(i, p) })}
                {link.qty && <NumInput className="field ml-auto w-16 px-1 text-center" min={0} aria-label="Quantità" value={r.qta ?? 1} onCommit={n => patch(i, { qta: n })} />}
                <button className={`btn px-1 py-0 ${link.qty ? '' : 'ml-auto'}`} title="Rimuovi dall'elenco" aria-label="Rimuovi dall'elenco" onClick={() => put(rows.filter((_, k) => k !== i))}>✕</button>
              </div>
              {e && <div className="mt-1 text-xs opacity-80">{link.summary(e)}</div>}
            </div>
          )
        }
        return (
          <div key={i} className="flex items-center gap-1">
            {cols.map(col => (
              <span key={col.key} className="flex min-w-0 items-center gap-0.5" style={{ flex: col.w ?? '1' }}>
                {col.options
                  ? <select className="field min-w-0 px-1" aria-label={col.label} value={r[col.key] ?? ''} onChange={e => patch(i, { [col.key]: e.target.value })}>
                      <option value="">{col.label}</option>
                      {col.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  : col.num
                  ? <NumInput className="field min-w-0 px-1" placeholder={col.label} aria-label={col.label} value={r[col.key] === '' ? undefined : r[col.key]} onCommit={n => patch(i, { [col.key]: n })} />
                  : <input className="field min-w-0 px-1" type="text" placeholder={col.label} aria-label={col.label} value={r[col.key] ?? ''} onChange={e => patch(i, { [col.key]: e.target.value })} />}
                {col.roll && <button className="btn px-1 py-0" title="Tira" onClick={() => rollEvent(expr(col.roll!, r[col.key]), r.nome)}>⚄</button>}
              </span>
            ))}
            <button className="btn px-1 py-0" title="Rimuovi" aria-label="Rimuovi la riga" onClick={() => put(rows.filter((_, k) => k !== i))}>✕</button>
          </div>
        )
      })}
      <div className="flex flex-wrap gap-1">
        <button className="btn" onClick={() => put([...rows, {}])}>+ Aggiungi {noun}</button>
        {link && (
          <select className="field w-auto grow" value="" aria-label={`Aggiungi dall'archivio: ${link.noun}`} onChange={e => e.target.value && put([...rows, { ref: e.target.value }])}>
            <option value="">+ Dall'archivio ({link.noun})…</option>
            {pool.map(x => <option key={x.id} value={x.id}>{x.name || '(senza nome)'}</option>)}
          </select>
        )}
      </div>
    </div>
  )
}

export const rowsBlock = (label: string, path: string, cols: Col[], noun = 'riga', link?: LinkOpt): BlockDef => ({
  label,
  C: ({ c, set }) => <RowsView c={c} set={set} path={path} cols={cols} noun={noun} link={link} />,
})
