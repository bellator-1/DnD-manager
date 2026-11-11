// Ricerca testuale locale (nessun indice esterno): tutte le parole devono comparire; titolo e tag pesano più del testo.
export interface Doc { kind: string; id: string; title: string; text: string; tags: string[] }
export interface Hit { doc: Doc; score: number; snippet: string }

export const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const SKIP = new Set(['id', 'schemaVersion', 'updatedAt', 'src', 'image', 'ritratto', 'layers', 'liste', 'collegamenti', 'immagini', 'pts', 'active', 'ref', 'relazioni', 'folder', 'file'])

// Raccoglie le stringhe di un elemento (anche annidate), saltando identificatori, immagini e forme delle mappe.
export function collect(v: unknown, out: string[] = [], depth = 0): string[] {
  if (depth > 4 || v == null) return out
  if (typeof v === 'string') { if (v.trim()) out.push(v); return out }
  if (Array.isArray(v)) { for (const x of v) collect(x, out, depth + 1); return out }
  if (typeof v === 'object') for (const [k, x] of Object.entries(v as object)) if (!SKIP.has(k)) collect(x, out, depth + 1)
  return out
}
export const toDoc = (kind: string, e: any): Doc => ({ kind, id: e.id, title: String(e.name ?? ''), text: collect(e).join('\n'), tags: Array.isArray(e.tags) ? e.tags : [] })

export function snippet(text: string, toks: string[]): string {
  const n = norm(text)
  let i = -1
  for (const t of toks) { const j = n.indexOf(t); if (j >= 0 && (i < 0 || j < i)) i = j }
  if (i < 0 || n.length !== text.length) return text.slice(0, 80).replace(/\s+/g, ' ')
  const a = Math.max(0, i - 30), b = Math.min(text.length, i + 60)
  return (a > 0 ? '…' : '') + text.slice(a, b).replace(/\s+/g, ' ') + (b < text.length ? '…' : '')
}

export function search(docs: Doc[], q: string, limit = 30): Hit[] {
  const toks = norm(q).split(/\s+/).filter(Boolean)
  if (!toks.length) return []
  const hits: Hit[] = []
  for (const d of docs) {
    const title = norm(d.title), text = norm(d.text), tags = norm(d.tags.join(' '))
    if (!toks.every(t => title.includes(t) || text.includes(t) || tags.includes(t))) continue
    let score = 0
    for (const t of toks) {
      if (title.startsWith(t)) score += 15; else if (title.includes(t)) score += 10
      if (tags.includes(t)) score += 5
      if (text.includes(t)) score += 1
    }
    hits.push({ doc: d, score, snippet: snippet(d.text, toks) })
  }
  return hits.sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title)).slice(0, limit)
}

// Cerca dentro le pagine di un PDF (testo già estratto): restituisce numero di pagina (da 1) e frammento.
export function findInPages(pages: string[], q: string, limit = 60): { page: number; snippet: string }[] {
  const toks = norm(q).split(/\s+/).filter(Boolean)
  if (!toks.length) return []
  const out: { page: number; snippet: string }[] = []
  for (let i = 0; i < pages.length && out.length < limit; i++) {
    const n = norm(pages[i])
    if (toks.every(t => n.includes(t))) out.push({ page: i + 1, snippet: snippet(pages[i], toks) })
  }
  return out
}

// Intervalli [inizio, fine) del testo originale che corrispondono ai termini (senza distinguere maiuscole e accenti).
// Serve a evidenziare la ricerca sulla pagina del PDF. Ogni carattere si normalizza da solo, così gli indici restano quelli del testo originale.
export function highlightRanges(text: string, toks: string[]): [number, number][] {
  if (!text || !toks.length) return []
  let n = ''
  const map: number[] = [] // map[i] = posizione, nel testo originale, del carattere normalizzato i
  for (let i = 0; i < text.length; i++) { const p = norm(text[i]); for (let k = 0; k < p.length; k++) { n += p[k]; map.push(i) } }
  const raw: [number, number][] = []
  for (const t of toks) {
    if (!t) continue
    for (let from = 0; ;) {
      const j = n.indexOf(t, from)
      if (j < 0) break
      raw.push([map[j], map[j + t.length - 1] + 1])
      from = j + t.length
    }
  }
  raw.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const out: [number, number][] = []
  for (const r of raw) { const l = out[out.length - 1]; if (l && r[0] <= l[1]) l[1] = Math.max(l[1], r[1]); else out.push([r[0], r[1]]) }
  return out
}
