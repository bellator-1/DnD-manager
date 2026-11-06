import { EntityPage } from '../shared/EntityPage'
import { Item, newItem } from './model'
import { OBJECT_KIND, SPELL_KIND } from './sheet'

// Oggetti e magie: stessa pagina, due layout diversi (uno per tipo), campi dinamici dal layout.
export const ItemsPage = () => (
  <EntityPage<Item> kind="items" noun="Oggetti e magie"
    makers={[{ label: 'Nuovo oggetto', make: () => newItem('oggetto') }, { label: 'Nuova magia', make: () => newItem('magia') }]}
    group={e => (e.tipo === 'magia' ? 'Magie' : 'Oggetti')}
    sheet={e => ({ layoutKey: `item-${e.tipo}`, def: e.tipo === 'magia' ? SPELL_KIND : OBJECT_KIND })} />
)
