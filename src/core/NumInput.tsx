import { InputHTMLAttributes, KeyboardEvent, useEffect, useRef, useState } from 'react'
import { clampNum, parseDraft } from './numeric'

type P = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'min' | 'max'> & {
  value: number | null | undefined
  onCommit: (n: number) => void
  min?: number
  max?: number
}

// Campo numerico che non "salta a 0" mentre si scrive: tiene il testo in una bozza locale e salva solo quando la bozza è un numero valido.
// Il campo si può svuotare e riscrivere; a fine modifica (blur) un campo rimasto vuoto diventa 0, a meno che il dato non esistesse ancora.
// Frecce su/giù: ±1 (con Maiusc ±10), come i campi numerici del browser.
export function NumInput({ value, onCommit, min, max, onFocus, onBlur, onKeyDown, ...rest }: P) {
  const shown = value === null || value === undefined ? '' : String(value)
  const [txt, setTxt] = useState(shown)
  const editing = useRef(false)
  useEffect(() => { if (!editing.current) setTxt(shown) }, [shown])

  const key = (e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
    e.preventDefault()
    const base = parseDraft(txt) ?? value ?? 0
    const n = clampNum(base + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1), min, max)
    setTxt(String(n)); onCommit(n)
  }
  return (
    <input {...rest} type="text" inputMode={min !== undefined && min >= 0 ? 'numeric' : undefined} autoComplete="off" value={txt}
      onFocus={e => { editing.current = true; onFocus?.(e) }}
      onChange={e => {
        const t = e.target.value
        if (!/^[+-]?\d*[.,]?\d*$/.test(t)) return // niente lettere
        setTxt(t)
        const n = parseDraft(t)
        if (n !== null) onCommit(clampNum(n, min, max))
      }}
      onBlur={e => {
        editing.current = false
        const n = parseDraft(txt)
        if (n !== null) { const v = clampNum(n, min, max); setTxt(String(v)); if (v !== value) onCommit(v) }
        else if (value === null || value === undefined) setTxt('')
        else { const v = clampNum(0, min, max); setTxt(String(v)); if (v !== value) onCommit(v) }
        onBlur?.(e)
      }}
      onKeyDown={key} />
  )
}
