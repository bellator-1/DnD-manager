import { useEffect } from 'react'
import { usePersisted } from './SidePanel'

// Tema scuro o chiaro: la scelta si ricorda; finché non scegli segue il sistema.
const systemLight = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: light)').matches
export function ThemeToggle() {
  const [s, patch] = usePersisted('ui:theme', { t: '' })
  const t = s.t || (systemLight() ? 'light' : 'dark')
  useEffect(() => { document.documentElement.dataset.theme = t }, [t])
  return (
    <button className="btn" aria-label={`Tema ${t === 'light' ? 'chiaro' : 'scuro'}: cambia`} title="Cambia tema" onClick={() => patch({ t: t === 'light' ? 'dark' : 'light' })}>{t === 'light' ? '☀' : '☾'}</button>
  )
}
