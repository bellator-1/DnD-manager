import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { beginSave, endSave } from './saveStatus'
import { store } from './storage'

// Un singolo documento JSON per campagna (es. «combat/current.json»), con salvataggio ritardato tracciato dall'indicatore.
export function useDoc<T>(rel: string, init: T) {
  const { cid = '' } = useParams()
  const [doc, setDoc] = useState<T>(init)
  const [loaded, setLoaded] = useState(false)
  const timer = useRef(0)
  useEffect(() => {
    setLoaded(false)
    store().read(`${cid}/${rel}`).then(t => {
      if (t) { try { setDoc(JSON.parse(t)) } catch { /* file corrotto: restano i valori iniziali */ } }
      setLoaded(true)
    })
  }, [cid, rel])
  const save = (next: T) => {
    setDoc(next)
    if (timer.current) window.clearTimeout(timer.current); else beginSave()
    timer.current = window.setTimeout(() => {
      timer.current = 0
      store().write(`${cid}/${rel}`, JSON.stringify(next, null, 2)).then(() => endSave(), e => endSave(e))
    }, 400)
  }
  return [doc, save, loaded] as const
}
