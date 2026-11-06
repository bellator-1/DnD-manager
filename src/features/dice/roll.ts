export interface Die { v: number; drop?: boolean }
export interface Term { label: string; sign: 1 | -1; faces?: number; dice?: Die[]; value: number }
export interface RollResult { expr: string; label?: string; total: number; terms: Term[]; crit?: 'max' | 'min'; at: number }

const MAX_TOTAL = 300

// Supporta: 2d6+3, d20, 8d6+2d8+5, 2d20kh1 (vantaggio), 2d20kl1 (svantaggio), 4d6kh3 (tieni i 3 più alti).
export function roll(input: string, label?: string): RollResult {
  const s = input.replace(/\s/g, '').toLowerCase()
  const parts = s.match(/[+-]?[^+-]+/g)
  if (!parts || parts.join('') !== s) throw new Error('Espressione non valida')
  let total = 0, count = 0
  const terms: Term[] = []
  for (const t of parts) {
    const sign: 1 | -1 = t.startsWith('-') ? -1 : 1, b = t.replace(/^[+-]/, '')
    const m = b.match(/^(\d*)d(\d+)(?:k([hl])(\d+))?$/)
    if (m) {
      const n = +(m[1] || 1), faces = +m[2]
      count += n
      if (faces < 2 || faces > 1000) throw new Error('Dado non valido')
      if (n > 100 || count > MAX_TOTAL) throw new Error(`Troppi dadi (massimo ${MAX_TOTAL} in totale)`)
      const vals = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * faces))
      let dice: Die[] = vals.map(v => ({ v }))
      if (m[3]) {
        const order = vals.map((_, i) => i).sort((a, c) => (m[3] === 'h' ? vals[c] - vals[a] : vals[a] - vals[c]))
        const kept = new Set(order.slice(0, +m[4]))
        dice = vals.map((v, i) => ({ v, drop: !kept.has(i) }))
      }
      const value = dice.reduce((a, d) => a + (d.drop ? 0 : d.v), 0)
      total += sign * value
      terms.push({ label: b, sign, faces, dice, value })
    } else if (/^\d+$/.test(b)) { total += sign * +b; terms.push({ label: b, sign, value: +b }) }
    else throw new Error('Espressione non valida')
  }
  // Critico / fallimento critico: solo con un singolo d20 mantenuto
  const kept20 = terms.filter(t => t.faces === 20).flatMap(t => t.dice!.filter(d => !d.drop))
  const crit = kept20.length === 1 ? (kept20[0].v === 20 ? 'max' : kept20[0].v === 1 ? 'min' : undefined) : undefined
  return { expr: s, label, total, terms, crit, at: Date.now() }
}
