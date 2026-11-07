import { ReactNode, useEffect, useRef, useState } from 'react'
import { bundleImages, download, imageNames, restoreImages, safe } from '../../core/backup'
import { removeImage } from '../../core/images'
import { useParams, useSearchParams } from 'react-router-dom'
import { SidePanel } from '../../core/SidePanel'
import { Entity, Kind } from '../../core/repo'
import { KindDef, SheetView } from '../../core/SheetView'
import { useEntities } from '../../core/useEntities'

export interface Maker<T> { label: string; make: (items: T[]) => Omit<T, keyof Entity> & { name: string } }

// Pagina archivio + scheda, uguale per personaggi, PNG, oggetti e magie: barra laterale comprimibile e scheda a layout libero.
export function EntityPage<T extends Entity>({ kind, noun, makers, sheet, group, extra, sort }: {
  kind: Kind; noun: string; makers: Maker<T>[]
  sheet: (e: T) => { layoutKey: string; def: KindDef }
  group?: (e: T) => string
  sort?: (a: T, b: T) => number
  extra?: (e: T) => ReactNode
}) {
  const { items, update, create, remove } = useEntities<T>(kind)
  const [sp] = useSearchParams()
  const { cid = '' } = useParams()
  const [sel, setSel] = useState<string | null>(sp.get('sel'))
  const [q, setQ] = useState('')
  useEffect(() => { const s = sp.get('sel'); if (s) setSel(s) }, [sp])
  const cur = items.find(x => x.id === sel)
  const shown = items.filter(x => x.name.toLowerCase().includes(q.toLowerCase())).sort(sort ?? (() => 0))
  const groups = group ? [...new Set(shown.map(group))] : ['']
  const sh = cur ? sheet(cur) : null
  const file = useRef<HTMLInputElement>(null)
  // La scheda si esporta con le sue immagini incorporate; l'importazione le salva come file nuovi e aggiorna i nomi.
  const exportOne = async () => {
    if (!cur) return
    try { download(`${safe(cur.name)}.json`, JSON.stringify({ format: 'dnd-manage-entity', kind, data: cur, images: await bundleImages(cid, imageNames(cur)) }, null, 2)) }
    catch (e) { alert(`Esportazione non riuscita: ${(e as Error).message}`) }
  }
  const importOne = async (f: File) => {
    try {
      const d = JSON.parse(await f.text())
      if (d?.format !== 'dnd-manage-entity' || d.kind !== kind || !d.data) throw new Error(`Questo file non contiene ${noun.toLowerCase()}.`)
      const { id: _i, schemaVersion: _s, updatedAt: _u, ...rest } = d.data
      const map = await restoreImages(cid, d.images ?? {})
      if (Array.isArray(rest.immagini)) rest.immagini = rest.immagini.filter((i: any) => map[i.src]).map((i: any) => ({ ...i, src: map[i.src] }))
      if (typeof rest.ritratto === 'string') rest.ritratto = map[rest.ritratto] ?? ''
      setSel((await create(rest)).id)
    } catch (e) { alert(e instanceof SyntaxError ? 'Il file non è un JSON valido.' : (e as Error).message) }
  }

  return (
    <div className="flex h-full min-h-0">
      <SidePanel id={kind} title={noun}>
        <div className="space-y-2 p-2">
          <div className="flex flex-wrap gap-1">{makers.map(m => <button key={m.label} className="btn grow" onClick={async () => setSel((await create(m.make(items))).id)}>{m.label}</button>)}</div>
          <input className="field" placeholder="Cerca…" value={q} onChange={e => setQ(e.target.value)} aria-label="Cerca" />
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) importOne(f); e.target.value = '' }} />
          <button className="btn w-full" title="Aggiungi da un file JSON esportato" onClick={() => file.current?.click()}>Importa JSON…</button>
          {groups.map(g => (
            <div key={g}>
              {g && <h3 className="mb-1 mt-2 text-sm opacity-60">{g}</h3>}
              <ul className="space-y-1">{shown.filter(x => !group || group(x) === g).map(x => (
                <li key={x.id}><button onClick={() => setSel(x.id)} className={`w-full rounded px-2 py-1 text-left ${x.id === sel ? 'bg-ink text-brass' : 'hover:text-brass'}`}>{x.name || '(senza nome)'}</button></li>
              ))}</ul>
            </div>
          ))}
          {!items.length && <p className="text-sm opacity-60">Ancora niente: creane uno.</p>}
        </div>
      </SidePanel>
      <section className="min-w-0 flex-1 overflow-y-auto p-4">
        {cur && sh ? (
          <>
            <div className="mb-3 flex items-center gap-2">
              {extra?.(cur)}
              <button className="btn ml-auto" title="Scarica questa scheda come file JSON" onClick={exportOne}>Esporta</button>
              <button className="btn" onClick={() => confirm(`Eliminare «${cur.name}»?`) && (imageNames(cur).filter(n => !items.some(x => x.id !== cur.id && imageNames(x).includes(n))).forEach(n => removeImage(cid, n).catch(() => {})), remove(cur.id), setSel(null))}>Elimina</button>
            </div>
            <SheetView layoutKey={sh.layoutKey} kind={sh.def} data={cur} onChange={update} />
          </>
        ) : <p className="opacity-60">Scegli un elemento dall'elenco o creane uno nuovo.</p>}
      </section>
    </div>
  )
}
