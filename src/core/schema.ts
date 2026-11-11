import type { Kind } from './repo'

// Versioni dei formati. Ogni elemento salvato ha schemaVersion; quando un formato cambia si AGGIUNGE una migrazione in fondo all'elenco del suo tipo:
// la migrazione n trasforma un elemento dalla versione n alla n+1. Si applicano da sole alla lettura (repo.list), quindi i vecchi file restano validi.
// Regola: una migrazione non perde mai dati dell'utente; aggiunge solo i campi nuovi con i loro valori iniziali.
export type Migration = (e: any) => any

export const MIGRATIONS: Partial<Record<Kind, Migration[]>> = {
  characters: [
    // v1 → v2 (0.15): bonus personalizzati alle abilità
    e => ({ ...e, abilitaExtra: e.abilitaExtra && typeof e.abilitaExtra === 'object' ? e.abilitaExtra : {} }),
  ],
  items: [
    // v1 → v2 (0.15): effetti sulla scheda (es. +1 alla CA)
    e => ({ ...e, effetti: Array.isArray(e.effetti) ? e.effetti : [] }),
  ],
}

export const currentVersion = (kind: Kind) => 1 + (MIGRATIONS[kind]?.length ?? 0)
const versionOf = (e: any) => (Number.isInteger(e?.schemaVersion) && e.schemaVersion >= 1 ? (e.schemaVersion as number) : 1)

// Un file scritto da una versione dell'app più recente della tua: si può leggere ma NON si deve riscrivere (si perderebbero i campi che questa versione non conosce).
export const isFromFuture = (kind: Kind, e: any) => versionOf(e) > currentVersion(kind)

export function migrateEntity<T = any>(kind: Kind, e: any): T {
  const ms = MIGRATIONS[kind] ?? []
  let v = versionOf(e), out = e
  if (v > ms.length + 1) return out
  while (v <= ms.length) { out = { ...ms[v - 1](out), schemaVersion: v + 1 }; v++ }
  return out
}
