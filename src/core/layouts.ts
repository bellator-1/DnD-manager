import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { beginSave, endSave } from './saveStatus'
import { persist } from './saving'
import { store } from './storage'
import type { Root } from './tree'

// Le operazioni pure sull'albero stanno in tree.ts (testabili senza React); qui si riesportano per non cambiare gli import.
export type { Cfg, Node, Root } from './tree'
export { edit, move, reorderRoot } from './tree'
export interface FieldDef { path: string; label: string; input: 'text' | 'number' | 'check' | 'area' | 'select'; options?: [string, string][] }
export const nid = () => Math.random().toString(36).slice(2, 8)

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
      persist(`${cid}/layouts/${key}`, () => store().write(`${cid}/layouts/${key}.json`, JSON.stringify({ version: 3, roots: next }, null, 2))).then(() => endSave(), e => endSave(e))
    }, 400)
  }
  return [roots, save] as const
}
