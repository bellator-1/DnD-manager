import { Cfg, FieldDef, Node, Root } from './layouts'

// Piccole funzioni per scrivere i layout di default. Gli id sono fissi (prefisso + contatore), quindi stabili tra un avvio e l'altro.
export function kit(prefix: string, fields: FieldDef[]) {
  let k = 0
  const id = () => prefix + k++
  const fld = (path: string): Node => {
    const f = fields.find(x => x.path === path)
    if (!f) throw new Error('Campo sconosciuto: ' + path)
    return { id: id(), type: 'field', cfg: { path, label: f.label, input: f.input, options: f.options } }
  }
  const blk = (type: string, cfg: Cfg = {}): Node => ({ id: id(), type, cfg })
  const sub = (title: string, cols: number, children: Node[]): Node => ({ id: id(), type: 'group', title, cols, children })
  // Sezione di primo livello: x, y, larghezza su 12 colonne; l'altezza si adatta da sola al contenuto.
  const grp = (title: string, cols: number, children: Node[], x: number, y: number, w: number): Root => ({ ...sub(title, cols, children), x, y, w, h: 6, auto: true })
  return { fld, blk, sub, grp }
}

// Scorciatoie per definire il catalogo dei campi di un tipo di scheda.
export const f = (path: string, label: string, input: FieldDef['input'] = 'text', options?: [string, string][]): FieldDef => ({ path, label, input, options })
export const opts = (xs: string[]) => xs.map(x => [x, x] as [string, string])
