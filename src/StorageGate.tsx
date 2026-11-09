import { ReactNode, useEffect, useState } from 'react'
import { ensurePermission, getHandle } from './core/handles'
import { chooseFolder, hasFsApi, setFolder } from './core/storage'

type Phase = { k: 'checking' } | { k: 'unsupported' } | { k: 'choose' } | { k: 'reopen'; h: any } | { k: 'ready' }

// Porta d'ingresso: senza una cartella dei dati l'app non parte. Se la cartella è già stata scelta la riapre da sola; se il browser chiede di nuovo il permesso basta un clic.
export function StorageGate({ children }: { children: ReactNode }) {
  const [p, setP] = useState<Phase>({ k: 'checking' })
  const [err, setErr] = useState('')
  useEffect(() => {
    ;(async () => {
      if (!hasFsApi()) return setP({ k: 'unsupported' })
      const h = await getHandle('root').catch(() => null)
      if (!h) return setP({ k: 'choose' })
      if (await ensurePermission(h, 'readwrite', false).catch(() => false)) { setFolder(h); setP({ k: 'ready' }) } else setP({ k: 'reopen', h })
    })()
  }, [])
  const choose = async () => { try { await chooseFolder(); setP({ k: 'ready' }) } catch (e) { if ((e as Error).name !== 'AbortError') setErr((e as Error).message) } }
  const reopen = async (h: any) => {
    try { if (await ensurePermission(h, 'readwrite', true)) { setFolder(h); setP({ k: 'ready' }) } else setErr('Permesso non concesso: senza, l\'app non può leggere la cartella.') } catch (e) { setErr((e as Error).message) }
  }
  if (p.k === 'ready') return <>{children}</>
  return (
    <main id="main" className="mx-auto max-w-xl px-6 py-16">
      <h1 className="flex items-center gap-3 text-4xl text-brass"><img src="/favicon.svg" alt="" className="h-12 w-12" />D&amp;D manage</h1>
      <div className="mt-8 space-y-4 rounded-xl border border-line bg-panel p-6">
        {p.k === 'checking' && <p className="text-muted">Cerco la tua cartella…</p>}
        {p.k === 'unsupported' && <p>Questo browser non permette di salvare i dati in una cartella del tuo computer, e D&amp;D manage ne ha bisogno. Aprilo con <b>Chrome</b> o <b>Edge</b>.</p>}
        {p.k === 'choose' && <>
          <h2 className="text-xl">Scegli dove salvare le campagne</h2>
          <p>Tutto viene salvato in una cartella del tuo computer: sono file normali, che puoi copiare, sincronizzare o tenere sotto controllo di versione. Scegli (o crea) la cartella: l'app se la ricorderà.</p>
          <button className="btn btn-primary" onClick={choose}>Scegli la cartella dei dati</button>
        </>}
        {p.k === 'reopen' && <>
          <h2 className="text-xl">Riapri la tua cartella</h2>
          <p>Cartella dei dati: <b>{p.h.name}</b>. Il browser chiede di nuovo il permesso di usarla.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={() => reopen(p.h)}>Riapri la cartella</button>
            <button className="btn" onClick={choose}>Usa un'altra cartella</button>
          </div>
        </>}
        {err && <p role="alert" className="text-danger">{err}</p>}
      </div>
    </main>
  )
}
