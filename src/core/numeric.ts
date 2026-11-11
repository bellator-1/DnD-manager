// Logica pura dei campi numerici (nessuna dipendenza da React: si testa da sola).
// Mentre si scrive il testo può essere incompleto ("", "-", "1,"): in quel caso non c'è ancora un numero da salvare.
export function parseDraft(t: string): number | null {
  const s = t.trim().replace(',', '.')
  if (s === '' || s === '-' || s === '+' || s === '.' || s === '-.' || s === '+.') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function clampNum(n: number, min?: number, max?: number): number {
  if (min !== undefined && n < min) return min
  if (max !== undefined && n > max) return max
  return n
}
