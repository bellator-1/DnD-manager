// pdf.js si carica solo quando si apre un manuale: è una libreria pesante. Si carica una volta sola per sessione.
let lib: Promise<any> | null = null
function pdfjs(): Promise<any> {
  if (!lib) {
    lib = (async () => {
      const p: any = await import('pdfjs-dist')
      const worker: any = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
      p.GlobalWorkerOptions.workerSrc = worker.default
      return p
    })().catch(e => { lib = null; throw e }) // se il caricamento fallisce si può riprovare
  }
  return lib
}

export async function loadPdf(data: ArrayBuffer): Promise<any> {
  const p = await pdfjs()
  return p.getDocument({ data }).promise
}

// Spiega all'utente perché un PDF non si apre. `detail` è il messaggio tecnico (si mostra a richiesta e va in console).
export type PdfProblem = 'password' | 'invalid' | 'notfound' | 'denied' | 'locked' | 'oldbrowser' | 'other'
export function describeError(e: unknown): { problem: PdfProblem; text: string; detail: string } {
  const err = e as { name?: string; message?: string } | null
  const name = err?.name ?? '', msg = err?.message ?? String(e)
  const detail = `${name || 'Errore'}: ${msg}`
  if (name === 'PasswordException') return { problem: 'password', text: 'Il PDF è protetto da password: l\'app non può aprirlo.', detail }
  if (name === 'InvalidPDFException' || name === 'FormatError') return { problem: 'invalid', text: 'Il file non è un PDF valido o è danneggiato.', detail }
  if (name === 'MissingPDFException' || name === 'NotFoundError') return { problem: 'notfound', text: 'Il file non si trova più dove era.', detail }
  if (name === 'NotAllowedError' || name === 'SecurityError') return { problem: 'denied', text: 'Il browser non ha il permesso di leggere il file.', detail }
  if (name === 'NotReadableError') return { problem: 'locked', text: 'Il file esiste ma in questo momento non si riesce a leggerlo (può essere in uso da un altro programma o in sincronizzazione con il cloud). Riprova tra poco.', detail }
  if (/withResolvers|is not a function|Unexpected token/.test(msg)) return { problem: 'oldbrowser', text: 'Questo browser è troppo vecchio per il lettore PDF: aggiorna Chrome o Edge.', detail }
  return { problem: 'other', text: 'Impossibile aprire il PDF per un errore imprevisto.', detail }
}

export async function pageText(doc: any, n: number): Promise<string> {
  const p = await doc.getPage(n)
  const t = await p.getTextContent()
  return t.items.map((i: any) => ('str' in i ? i.str : '')).join(' ').replace(/\s+/g, ' ').trim()
}

// Estrae il testo di tutte le pagine (una sola volta: poi si salva in manual-files/<id>.index.json).
export async function extractAll(doc: any, onProgress: (n: number) => void, shouldStop: () => boolean): Promise<string[]> {
  const out: string[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    if (shouldStop()) throw new Error('interrotto')
    out.push(await pageText(doc, n))
    if (n % 5 === 0 || n === doc.numPages) onProgress(n)
  }
  return out
}

// Strato di testo trasparente sopra la pagina: permette di selezionare e copiare e di evidenziare la ricerca.
// `container` deve avere le dimensioni esatte della pagina e la variabile CSS --scale-factor impostata sul contenitore o su un suo antenato.
export async function renderTextLayer(page: any, viewport: any, container: HTMLElement): Promise<{ divs: HTMLElement[]; cancel: () => void }> {
  const p = await pdfjs()
  const layer = new p.TextLayer({ textContentSource: page.streamTextContent(), container, viewport })
  await layer.render()
  return { divs: layer.textDivs as HTMLElement[], cancel: () => layer.cancel() }
}

export interface OutlineItem { title: string; dest: any; depth: number }
export async function flattenOutline(doc: any): Promise<OutlineItem[]> {
  const out: OutlineItem[] = []
  const walk = (items: any[] | null | undefined, depth: number) => { for (const it of items ?? []) { out.push({ title: it.title, dest: it.dest, depth }); walk(it.items, depth + 1) } }
  walk(await doc.getOutline(), 0)
  return out
}
export async function destToPage(doc: any, dest: any): Promise<number | null> {
  try {
    const d = typeof dest === 'string' ? await doc.getDestination(dest) : dest
    return d ? (await doc.getPageIndex(d[0])) + 1 : null
  } catch { return null }
}
