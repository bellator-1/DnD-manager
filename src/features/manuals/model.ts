import { Entity } from '../../core/repo'

// Un manuale è un PDF tuo: sta in <campagna>/manual-files/ (non nei backup) e qui si tengono solo nome, ultima pagina e segnalibri.
export interface Manual extends Entity { file: string; pages: number; last: number; bookmarks: { page: number; label: string }[]; [k: string]: unknown }
