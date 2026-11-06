import { f } from '../../core/layoutKit'
import { FieldDef } from '../../core/layouts'
import { Entity } from '../../core/repo'

export interface Session extends Entity { numero: number; data: string; extra: Record<string, unknown>; [k: string]: unknown }
export const newSession = (numero: number) => ({
  name: `Sessione ${numero}`, numero, data: '', riassunto: '', eventi: '', prossimi: '', collegamenti: [], immagini: [], extra: {},
}) as unknown as Omit<Session, keyof Entity> & { name: string }
export const SESSION_FIELDS: FieldDef[] = [
  f('name', 'Titolo'), f('numero', 'Numero', 'number'), f('data', 'Data'),
  f('riassunto', 'Riassunto', 'area'), f('eventi', 'Eventi e decisioni', 'area'), f('prossimi', 'Da preparare per la prossima', 'area'),
]
