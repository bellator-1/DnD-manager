// pdf.js si carica solo quando si apre un manuale: è una libreria pesante.
export async function loadPdf(data: ArrayBuffer): Promise<any> {
  const pdfjs: any = await import('pdfjs-dist')
  const worker: any = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjs.getDocument({ data }).promise
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
