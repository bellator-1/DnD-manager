import { useSyncExternalStore } from 'react'

// L'ultimo tiro eseguito (serve all'Ispirazione Eroica per ritirarlo).
export interface LastRoll { expr: string; label?: string }
let last: LastRoll | null = null
const subs = new Set<() => void>()
export const setLastRoll = (r: LastRoll) => { last = r; subs.forEach(f => f()) }
export const useLastRoll = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => last)
