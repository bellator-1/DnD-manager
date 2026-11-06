import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { tracked } from './saveStatus'
import { store } from './storage'

// Immagini come file veri: <campagna>/images/<uuid>.<ext>. Nei dati (schede, note, mappe) si salva solo il nome del file.
const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/avif': 'avif' }
export const extOf = (type: string) => EXT[type] ?? 'img'

// Riduce le foto troppo grandi (schede e note): lato massimo in pixel, WebP. Gif e SVG non si toccano. Le mappe restano all'originale.
export async function downscale(file: Blob, max: number): Promise<Blob> {
  if (!/^image\/(png|jpeg|webp|avif)$/.test(file.type)) return file
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  if (k === 1 && file.size < 1.5e6) { bmp.close(); return file }
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height); bmp.close()
  const out = await new Promise<Blob | null>(res => c.toBlob(res, 'image/webp', 0.9))
  return out && out.size < file.size ? out : file
}

export async function saveImage(cid: string, blob: Blob, max?: number): Promise<string> {
  const b = max ? await downscale(blob, max) : blob
  const name = `${crypto.randomUUID()}.${extOf(b.type)}`
  await tracked(store().writeBlob(`${cid}/images/${name}`, b))
  return name
}
export const removeImage = (cid: string, name: string) => store().remove(`${cid}/images/${name}`)

const cache = new Map<string, string>() // URL temporanei del browser, uno per immagine
export async function imageUrl(cid: string, name: string): Promise<string> {
  const key = `${cid}/${name}`
  const hit = cache.get(key)
  if (hit) return hit
  const b = await store().readBlob(`${cid}/images/${name}`)
  if (!b) throw new Error('Immagine non trovata')
  const u = URL.createObjectURL(b)
  cache.set(key, u)
  return u
}
export function useImageUrl(name?: string) {
  const { cid = '' } = useParams()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => { setUrl(null); if (name) imageUrl(cid, name).then(setUrl, () => setUrl(null)) }, [cid, name])
  return url
}
