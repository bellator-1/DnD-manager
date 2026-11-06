import { EntityPage } from '../shared/EntityPage'
import { Session, newSession } from './model'
import { SESSION_KIND } from './sheet'

// Diario di sessione: una scheda per sessione (più recente in alto), con collegamenti a PNG, mappe, oggetti e immagini.
export const SessionsPage = () => (
  <EntityPage<Session> kind="sessions" noun="Sessioni"
    makers={[{ label: 'Nuova sessione', make: items => newSession(Math.max(0, ...items.map(i => i.numero || 0)) + 1) }]}
    sort={(a, b) => (b.numero || 0) - (a.numero || 0)}
    sheet={() => ({ layoutKey: 'session', def: SESSION_KIND })} />
)
