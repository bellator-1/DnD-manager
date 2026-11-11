import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { alertDialog, confirmDialog } from '../../core/dialog'
import { Kind, TrashItem, repo } from '../../core/repo'
import { tracked } from '../../core/saveStatus'

const LABEL: Record<string, string> = { characters: 'Schede', npcs: 'PNG e creature', items: 'Oggetti e magie', notes: 'Note', maps: 'Mappe', sessions: 'Sessioni', manuals: 'Manuali' }

// Cestino: tutto ciò che elimini finisce qui e si può ripristinare. Si svuota solo a mano.
export function TrashPage() {
  const { cid = '' } = useParams()
  const [list, setList] = useState<TrashItem[] | null>(null)
  const load = () => repo.trash.list(cid).then(setList)
  useEffect(() => { load() }, [cid])

  const restore = async (t: TrashItem) => {
    try { await tracked(repo.trash.restore(cid, t.kind, t.entity.id)); load() } catch (e) { alertDialog((e as Error).message, 'Ripristino non riuscito') }
  }
  const purge = async (t: TrashItem) => {
    if (!(await confirmDialog(`Eliminare definitivamente «${t.entity.name}»? Non si potrà più recuperare.`, { danger: true, ok: 'Elimina per sempre' }))) return
    await tracked(repo.trash.purge(cid, t.kind, t.entity.id)); load()
  }
  const empty = async () => {
    if (!list?.length || !(await confirmDialog(`Svuotare il cestino? Verranno eliminati definitivamente ${list.length} elementi.\nLe immagini che non usa più nessuno si tolgono poi dalla schermata delle campagne («Elimina le immagini inutilizzate»).`, { danger: true, ok: 'Svuota' }))) return
    await tracked(repo.trash.empty(cid)); load()
  }

  const kinds = [...new Set((list ?? []).map(t => t.kind))] as Kind[]
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="mr-auto font-display text-2xl text-brass">Cestino</h1>
          <button className="btn btn-danger" disabled={!list?.length} onClick={empty}>Svuota il cestino</button>
        </div>
        <p className="text-sm text-muted">Gli elementi eliminati restano qui finché non li ripristini o non svuoti il cestino. Le loro immagini non vengono toccate.</p>
        {list === null && <p className="opacity-60">Carico…</p>}
        {list?.length === 0 && <p className="rounded-lg border border-dashed border-edge p-6 text-center opacity-70">Il cestino è vuoto.</p>}
        {kinds.map(k => (
          <section key={k}>
            <h2 className="mb-1 text-sm text-muted">{LABEL[k] ?? k}</h2>
            <ul className="space-y-1">
              {list!.filter(t => t.kind === k).map(t => (
                <li key={t.entity.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2">
                  <span className="min-w-0 flex-1 truncate font-display">{t.entity.name || '(senza nome)'}{(t.entity as any).tipo === 'magia' && <span className="ml-2 text-xs text-muted">magia</span>}</span>
                  <span className="text-xs text-muted">eliminato il {new Date(t.deletedAt).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  <button className="btn" onClick={() => restore(t)}>Ripristina</button>
                  <button className="btn btn-danger" onClick={() => purge(t)}>Elimina per sempre</button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
