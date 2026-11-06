import { nid } from '../../core/layouts'
import { Entity } from '../../core/repo'

export type Pt = [number, number] // coordinate in pixel dell'immagine (con la mappa in loop x può uscire da 0..w: il percorso resta continuo)
export interface Shape { id: string; type: 'route' | 'area' | 'pen' | 'marker'; pts: Pt[]; label?: string }
export interface Layer { id: string; name: string; color: string; visible: boolean; shapes: Shape[] }
export interface MapDoc extends Entity { w: number; h: number; loop: boolean; layers: Layer[]; active: string; image?: string } // image = nome del file in <cid>/images/ (le mappe della 0.7 usavano <cid>/maps/<id>.img e vengono migrate all'apertura)

export const newLayers = (): Layer[] => [
  { id: nid(), name: 'Confini', color: '#c9a24b', visible: true, shapes: [] },
  { id: nid(), name: 'Rotte', color: '#e0634f', visible: true, shapes: [] },
  { id: nid(), name: 'Segnaposti', color: '#5bb7d9', visible: true, shapes: [] },
]
