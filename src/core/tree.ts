// Operazioni pure sull'albero del layout (nessuna dipendenza da React): così si possono testare da sole.
export type Cfg = Record<string, any>
// Un layout è un albero: sezioni (group) che contengono campi, blocchi pronti, testi e altre sezioni.
export interface Node { id: string; type: string; title?: string; cols?: number; cfg?: Cfg; children?: Node[] }
// Solo le sezioni di primo livello hanno una posizione sulla griglia a 12 colonne. auto: l'altezza segue il contenuto.
export type Root = Node & { x: number; y: number; w: number; h: number; auto?: boolean }

// Modifica (o elimina, se fn restituisce null) il nodo con quell'id ovunque si trovi nell'albero.
export function edit<N extends Node>(list: N[], id: string, fn: (n: N) => N | null): N[] {
  const out: N[] = []
  for (const n of list) {
    if (n.id === id) { const r = fn(n); if (r) out.push(r) }
    else out.push(n.children ? { ...n, children: edit(n.children, id, fn as any) } : n)
  }
  return out
}

// Scambia un nodo con il fratello precedente (-1) o successivo (+1).
export function move<N extends Node>(list: N[], id: string, d: -1 | 1): N[] {
  const i = list.findIndex(n => n.id === id)
  if (i < 0) return list.map(n => (n.children ? { ...n, children: move(n.children, id, d) } : n))
  const j = i + d
  if (j < 0 || j >= list.length) return list
  const c = [...list]; [c[i], c[j]] = [c[j], c[i]]; return c
}

// Riordina una sezione di primo livello sulla griglia. La griglia ricompatta da sola i vuoti.
// top: in cima (le altre scendono); bottom: in fondo; up/down: scambia la posizione con la sezione precedente/successiva (ordine per y, poi x).
export function reorderRoot(rs: Root[], id: string, how: 'top' | 'bottom' | 'up' | 'down'): Root[] {
  const me = rs.find(r => r.id === id)
  if (!me) return rs
  if (how === 'top') return rs.map(r => (r.id === id ? { ...r, x: 0, y: 0 } : { ...r, y: r.y + me.h + 1 }))
  if (how === 'bottom') return rs.map(r => (r.id === id ? { ...r, x: 0, y: 9999 } : r))
  const ord = [...rs].sort((a, b) => a.y - b.y || a.x - b.x)
  const i = ord.findIndex(r => r.id === id), j = i + (how === 'up' ? -1 : 1)
  if (j < 0 || j >= ord.length) return rs
  const a = ord[i], b = ord[j]
  return rs.map(r => (r.id === a.id ? { ...r, x: b.x, y: b.y } : r.id === b.id ? { ...r, x: a.x, y: a.y } : r))
}
