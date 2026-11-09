import { Entity } from '../../core/repo'

// Un manuale è un PDF tuo. Due modi: «handle» (collegato: il PDF resta dov'è e il browser ricorda il percorso; il file non viene copiato) o
// «copy» (copiato in <campagna>/manual-files/). Impostazioni salvate qui: nome, ultima pagina, zoom, segnalibri. Il PDF non entra nei backup.
export interface Manual extends Entity {
  file: string; source?: 'handle' | 'copy'; pages: number; last: number; zoom?: number
  bookmarks: { page: number; label: string }[]; [k: string]: unknown
}
