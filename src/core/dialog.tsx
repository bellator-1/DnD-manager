import { ReactNode, useEffect, useRef, useState } from 'react'

// Finestre dell'app al posto di confirm/alert/prompt del browser: stesso aspetto del resto, tastiera (Invio/Esc), focus gestito.
// Si usano con await: if (await confirmDialog('Eliminare?', { danger: true })) …
type Req = { kind: 'confirm' | 'alert' | 'prompt'; message: ReactNode | string; title?: string; danger?: boolean; ok?: string; def?: string; resolve: (v: any) => void }
let push: ((r: Req) => void) | null = null

export const confirmDialog = (message: string, o: { title?: string; danger?: boolean; ok?: string } = {}) =>
  new Promise<boolean>(resolve => (push ? push({ kind: 'confirm', message, ...o, resolve }) : resolve(window.confirm(message))))
export const alertDialog = (message: string, title?: string) =>
  new Promise<void>(resolve => (push ? push({ kind: 'alert', message, title, resolve: () => resolve() }) : (window.alert(message), resolve())))
export const promptDialog = (message: string, def = '') =>
  new Promise<string | null>(resolve => (push ? push({ kind: 'prompt', message, def, resolve }) : resolve(window.prompt(message, def))))

export function DialogHost() {
  const [queue, setQueue] = useState<Req[]>([])
  useEffect(() => { push = r => setQueue(q => [...q, r]); return () => { push = null } }, [])
  const cur = queue[0]
  const [text, setText] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const last = useRef<Element | null>(null)
  useEffect(() => {
    if (!cur) return
    last.current = document.activeElement
    setText(cur.def ?? '')
    const el = box.current
    const first = cur.kind === 'prompt' ? el?.querySelector('input') : cur.kind === 'confirm' && cur.danger ? el?.querySelector('[data-cancel]') : el?.querySelector('[data-ok]')
    // Dopo il rendering, così il testo iniziale del campo è già presente quando lo si seleziona.
    const t = window.setTimeout(() => { (first as HTMLElement | null)?.focus(); if (cur.kind === 'prompt') (first as HTMLInputElement | null)?.select() }, 0)
    return () => { window.clearTimeout(t); (last.current as HTMLElement | null)?.focus?.() }
  }, [cur])
  if (!cur) return null

  const close = (v: unknown) => { cur.resolve(v); setQueue(q => q.slice(1)) }
  const cancel = () => close(cur.kind === 'confirm' ? false : cur.kind === 'prompt' ? null : undefined)
  const ok = () => close(cur.kind === 'confirm' ? true : cur.kind === 'prompt' ? text : undefined)
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel() }
    else if (e.key === 'Tab') { // il focus resta dentro la finestra
      const f = [...(box.current?.querySelectorAll<HTMLElement>('button, input') ?? [])]
      if (!f.length) return
      const i = f.indexOf(document.activeElement as HTMLElement)
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus() } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus() }
    }
  }
  const title = cur.title ?? (cur.kind === 'alert' ? 'Attenzione' : cur.danger ? 'Conferma eliminazione' : cur.kind === 'prompt' ? 'Inserisci un nome' : 'Conferma')
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onMouseDown={e => e.target === e.currentTarget && cancel()}>
      <div ref={box} role={cur.kind === 'alert' ? 'alertdialog' : 'dialog'} aria-modal="true" aria-label={title} className="dialog w-[min(28rem,100%)] space-y-3 p-5" onKeyDown={keys}>
        <h2 className={`flex items-center gap-2 text-xl ${cur.danger || cur.kind === 'alert' ? 'text-danger' : 'text-brass'}`}>
          <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full border border-current text-base">{cur.danger || cur.kind === 'alert' ? '!' : cur.kind === 'prompt' ? '✎' : '?'}</span>{title}
        </h2>
        <p className="whitespace-pre-line text-sm leading-relaxed">{cur.message}</p>
        {cur.kind === 'prompt' && <input className="field" value={text} aria-label={String(cur.message)} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ok() } }} />}
        <div className="flex justify-end gap-2">
          {cur.kind !== 'alert' && <button data-cancel className="btn" onClick={cancel}>Annulla</button>}
          <button data-ok className={`btn ${cur.danger ? 'btn-danger' : 'btn-primary'}`} onClick={ok}>{cur.ok ?? (cur.kind === 'alert' ? 'Ho capito' : cur.danger ? 'Elimina' : 'Conferma')}</button>
        </div>
      </div>
    </div>
  )
}
