import { ABILITIES, Ability, Character, Prof, bonusCompetenza, mod } from './model'

// Regole di calcolo della scheda (nessuna interfaccia). Tutto ciò che non è esplicitamente attivato dall'utente resta com'è.

// ── Bonus personalizzati ─────────────────────────────────────────────────────
// Per ogni abilità (chiave dell'abilità) o tiro salvezza («ts.for»…) si può: usare un'altra caratteristica, sommare i modificatori di altre
// caratteristiche (es. Arcano + Saggezza) e aggiungere un bonus fisso.
export interface Extra { ab?: Ability; add?: Ability[]; flat?: number }
export const extraOf = (c: Pick<Character, 'abilitaExtra'>, key: string): Extra | undefined => (c.abilitaExtra as Record<string, Extra> | undefined)?.[key]
export const hasExtra = (x?: Extra) => !!x && (!!x.ab || !!x.add?.length || !!x.flat)

export function skillBonus(level: number, scores: Record<Ability, number>, base: Ability, prof: Prof, extra?: Extra, flatEffects = 0): number {
  const main = extra?.ab ?? base
  const added = (extra?.add ?? []).filter(a => ABILITIES.includes(a)).reduce((s, a) => s + mod(scores[a]), 0)
  return mod(scores[main]) + added + (extra?.flat ?? 0) + prof * bonusCompetenza(level) + flatEffects
}

// ── Effetti di oggetti e magie ───────────────────────────────────────────────
export const EFFECT_TARGETS: [string, string][] = [
  ['ca', 'Classe Armatura'], ['velocita', 'Velocità (m)'], ['iniziativa', 'Iniziativa'], ['pfmax', 'PF massimi'],
  ['for', 'Forza (punteggio)'], ['des', 'Destrezza (punteggio)'], ['cos', 'Costituzione (punteggio)'], ['int', 'Intelligenza (punteggio)'], ['sag', 'Saggezza (punteggio)'], ['car', 'Carisma (punteggio)'],
  ['ts', 'Tutti i tiri salvezza'], ['abilita', 'Tutte le abilità'], ['cd', 'CD degli incantesimi'], ['attinc', 'Attacco degli incantesimi'],
]
export const EFFECT_OPS: [string, string][] = [['+', 'Somma (+/−)'], ['=', 'Imposta a (se più alto)']]
export interface Effect { target?: string; op?: string; valore?: number; nota?: string }
export interface Applied { from: string; effect: Required<Pick<Effect, 'target' | 'op' | 'valore'>> & { nota?: string } }

// Righe dell'elenco della scheda che l'utente ha attivato (✓ «Attivo») e che puntano a un elemento dell'archivio con effetti.
export const EFFECT_LISTS = ['attacchiLista', 'incantesimiLista', 'inventarioLista'] as const
export function collectEffects(c: Record<string, any>, items: Record<string, any>): Applied[] {
  const out: Applied[] = []
  const seen = new Set<string>()
  for (const list of EFFECT_LISTS) for (const r of (c[list] ?? []) as any[]) {
    if (!r?.ref || !r.on) continue
    const k = `${list}:${r.ref}`
    if (seen.has(k)) continue // la stessa riga doppia non conta due volte
    seen.add(k)
    const it = items[r.ref]
    for (const e of (it?.effetti ?? []) as Effect[]) {
      if (!e?.target || !EFFECT_TARGETS.some(([t]) => t === e.target)) continue
      const valore = Number(e.valore)
      if (!Number.isFinite(valore)) continue
      out.push({ from: it.name || '(senza nome)', effect: { target: e.target, op: e.op === '=' ? '=' : '+', valore, nota: e.nota } })
    }
  }
  return out
}

export interface Effective {
  ab: Record<Ability, number>; ca: number; velocita: number; iniziativa: number; pfMax: number
  ts: number; abilita: number; cd: number; attInc: number
  applied: Applied[]; changed: Record<string, boolean>
}

// Valore effettivo = base; poi «imposta a» (solo se più alto della base); poi si sommano i bonus.
const calc = (base: number, list: Applied[], target: string) => {
  let v = base
  const mine = list.filter(a => a.effect.target === target)
  for (const a of mine) if (a.effect.op === '=') v = Math.max(v, a.effect.valore)
  for (const a of mine) if (a.effect.op === '+') v += a.effect.valore
  return v
}

export function applyEffects(c: Character, applied: Applied[]): Effective {
  const ab = Object.fromEntries(ABILITIES.map(a => [a, calc(c.abilita?.[a] ?? 10, applied, a)])) as Record<Ability, number>
  const e: Effective = {
    ab, ca: calc(c.ca ?? 10, applied, 'ca'), velocita: calc(c.velocita ?? 9, applied, 'velocita'), iniziativa: calc(0, applied, 'iniziativa'),
    pfMax: calc(c.pf?.max ?? 1, applied, 'pfmax'), ts: calc(0, applied, 'ts'), abilita: calc(0, applied, 'abilita'), cd: calc(0, applied, 'cd'), attInc: calc(0, applied, 'attinc'),
    applied, changed: {},
  }
  for (const [t] of EFFECT_TARGETS) e.changed[t] = applied.some(a => a.effect.target === t)
  return e
}
