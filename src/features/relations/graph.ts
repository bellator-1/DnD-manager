// Disposizione a forze (Fruchterman–Reingold) per il grafo delle relazioni. Deterministica: stessi dati, stessa figura.
export interface P { x: number; y: number }
export function layoutGraph(ids: string[], edges: [string, string][], w: number, h: number, iters = 250): Map<string, P> {
  const n = ids.length
  const pos = new Map<string, P>()
  ids.forEach((id, i) => { const a = (2 * Math.PI * i) / Math.max(n, 1); pos.set(id, { x: w / 2 + (Math.cos(a) * w) / 4, y: h / 2 + (Math.sin(a) * h) / 4 }) })
  if (n < 2) return pos
  const k = Math.sqrt((w * h) / n) * 0.6
  let t = w / 8
  const M = 40
  for (let it = 0; it < iters; it++) {
    const disp = new Map<string, P>(ids.map(id => [id, { x: 0, y: 0 }]))
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = pos.get(ids[i])!, b = pos.get(ids[j])!
      let dx = a.x - b.x, dy = a.y - b.y
      const d = Math.hypot(dx, dy) || 0.01, f = (k * k) / d
      dx /= d; dy /= d
      const da = disp.get(ids[i])!, db = disp.get(ids[j])!
      da.x += dx * f; da.y += dy * f; db.x -= dx * f; db.y -= dy * f
    }
    for (const [u, v] of edges) {
      const a = pos.get(u), b = pos.get(v)
      if (!a || !b || u === v) continue
      let dx = a.x - b.x, dy = a.y - b.y
      const d = Math.hypot(dx, dy) || 0.01, f = (d * d) / k
      dx /= d; dy /= d
      const da = disp.get(u)!, db = disp.get(v)!
      da.x -= dx * f; da.y -= dy * f; db.x += dx * f; db.y += dy * f
    }
    for (const id of ids) {
      const p = pos.get(id)!, s = disp.get(id)!
      const d = Math.hypot(s.x, s.y) || 0.01, m = Math.min(d, t)
      p.x = Math.min(w - M, Math.max(M, p.x + (s.x / d) * m))
      p.y = Math.min(h - M, Math.max(M, p.y + (s.y / d) * m))
    }
    t *= 0.97
  }
  return pos
}
