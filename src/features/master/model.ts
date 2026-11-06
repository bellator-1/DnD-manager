import { f } from '../../core/layoutKit'
import { FieldDef } from '../../core/layouts'
import { Entity } from '../../core/repo'

// Un solo documento per campagna. «liste» contiene gli elenchi di collegamenti: una voce per ogni blocco «Elenco di collegamenti» del layout.
export interface MasterDoc extends Entity { liste: Record<string, unknown[]>; appunti: string; extra: Record<string, unknown>; [k: string]: unknown }
export const newMaster = () => ({ name: 'Spazio del master', liste: {}, appunti: '', extra: {} }) as unknown as Omit<MasterDoc, keyof Entity> & { name: string }
export const MASTER_FIELDS: FieldDef[] = [f('appunti', 'Appunti del master', 'area')]
