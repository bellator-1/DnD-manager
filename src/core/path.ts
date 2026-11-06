// Accesso ai dati per percorso («pf.attuali», «slot.1.max», «extra.k3f9»). Immutabile: setPath restituisce una copia.
export const getPath = (o: any, p: string): any => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o)
export const setPath = <T,>(o: T, p: string, v: unknown): T => {
  const [k, ...rest] = p.split('.')
  const base: any = { ...(o as any) }
  base[k] = rest.length ? setPath(base[k] ?? {}, rest.join('.'), v) : v
  return base
}
