import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { beginSave, endSave } from './saveStatus'
import { store } from './storage'

export type Cfg = Record<string, any>
// Un layout è un albero: sezioni (group) che contengono campi, blocchi pronti, testi e altre sezioni.
export interface Node { id: string; type: string; title?: string; cols?: number; cfg?: Cfg; children?: Node[] }
// Solo le sezioni di primo livello hanno una posizione sulla griglia a 12 colonne.
export type Root = Node & { x: number; y: number; w: number; h: number; auto?: boolean } // auto: l'altezza segue il contenuto
export interface FieldDef { path: string; label: string; input: 'text' | 'number' | 'check' | 'area' | 'select'; options?: [string, string][] }
export const nid = () => Math.random().toString(36).slice(2, 8)

// Modifica (o elimina, se fn restituisce null) il nodo con quell'id ovunque si trovi nell'albero.
export function edit<N extends Node>(list: N[], id: string, fn: (n: N) => N | null): N[] {
  const out: N[] = []
  for (const n of list) {
    if (n.id === id) { const r = fn(n); if (r) out.push(r) }
    else out.push(n.children ? { ...n, children: edit(n.children, id, fn as any) } : n)
  }
  return out
}
export function move<N extends Node>(list: N[], id: string, d: -1 | 1): N[] {
  const i = list.findIndex(n => n.id === id)
  if (i < 0) return list.map(n => (n.children ? { ...n, children: move(n.children, id, d) } : n))
  const j = i + d
  if (j < 0 || j >= list.length) return list
  const c = [...list]; [c[i], c[j]] = [c[j], c[i]]; return c
}

// Un file per tipo di scheda e per campagna: <cid>/layouts/<key>.json. Versione 3: griglia con righe da 16 px.
// I file della versione 2 (righe da 48 px) vengono convertiti; quelli precedenti ignorati.
export function useLayoutDoc(key: string, defaults: Root[]) {
  const { cid = '' } = useParams()
  const [roots, setState] = useState(defaults)
  const ref = useRef(defaults)
  const loaded = useRef(false)
  const timer = useRef(0)
  const apply = (r: Root[]) => { ref.current = r; setState(r) }

  useEffect(() => {
    loaded.current = false
    apply(defaults)
    store().read(`${cid}/layouts/${key}.json`).then(t => {
      if (t) {
        try {
          const d = JSON.parse(t)
          if (d?.version === 3 && Array.isArray(d.roots)) apply(d.roots)
          else if (d?.version === 2 && Array.isArray(d.roots)) apply(d.roots.map((r: Root) => ({ ...r, y: r.y * 3, h: r.h * 3, auto: true })))
        } catch { /* file corrotto: restano i default */ }
      }
      loaded.current = true
    })
  }, [cid, key])

  // Accetta un nuovo elenco oppure una funzione sull'elenco più recente (utile quando più sezioni cambiano insieme).
  const save = (f: Root[] | ((prev: Root[]) => Root[])) => {
    const next = typeof f === 'function' ? f(ref.current) : f
    if (next === ref.current) return
    apply(next)
    if (!loaded.current) return
    if (timer.current) window.clearTimeout(timer.current); else beginSave()
    timer.current = window.setTimeout(() => {
      timer.current = 0
      store().write(`${cid}/layouts/${key}.json`, JSON.stringify({ version: 3, roots: next }, null, 2)).then(() => endSave(), e => endSave(e))
    }, 400)
  }
  return [roots, save] as const
}
