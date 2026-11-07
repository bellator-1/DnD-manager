// Cartelle delle note: albero con sottocartelle. Operazioni pure (testabili senza React).
export interface Folder { id: string; name: string; parent: string; open: boolean } // parent '' = radice

export const childrenOf = (fs: Folder[], parent: string) => fs.filter(f => f.parent === parent).sort((a, b) => a.name.localeCompare(b.name))

// Id della cartella e di tutte le sue sottocartelle, a qualsiasi profondità.
export function descendants(fs: Folder[], id: string): string[] {
  const out = [id]
  for (const f of fs) if (f.parent === id) out.push(...descendants(fs, f.id))
  return out
}

// Elimina una cartella: le sottocartelle salgono di un livello. `reparent` è dove vanno a finire le note che c'erano dentro.
export function removeFolder(fs: Folder[], id: string): { folders: Folder[]; reparent: string } {
  const gone = fs.find(f => f.id === id)
  const reparent = gone?.parent ?? ''
  return { folders: fs.filter(f => f.id !== id).map(f => (f.parent === id ? { ...f, parent: reparent } : f)), reparent }
}

// «Maghi / Gilda»: percorso leggibile di una cartella.
export function pathOf(fs: Folder[], id: string): string {
  const names: string[] = []
  for (let cur = fs.find(f => f.id === id), n = 0; cur && n < 50; cur = fs.find(f => f.id === cur!.parent), n++) names.unshift(cur.name)
  return names.join(' / ')
}

// Spostare una cartella dentro se stessa o in una sua discendente creerebbe un ciclo.
export const wouldCycle = (fs: Folder[], id: string, newParent: string) => descendants(fs, id).includes(newParent)
