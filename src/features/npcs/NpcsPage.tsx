import { EntityPage } from '../shared/EntityPage'
import { Npc, newNpc } from './model'
import { NPC_KIND } from './sheet'

export const NpcsPage = () => (
  <EntityPage<Npc> kind="npcs" noun="PNG e creature"
    makers={[{ label: 'Nuovo PNG', make: () => newNpc('PNG') }, { label: 'Nuovo animale', make: () => newNpc('Animale') }, { label: 'Nuova creatura', make: () => newNpc('Creatura') }]}
    group={e => (e.tipo === 'Animale' ? 'Animali' : e.tipo === 'Creatura' || (e.tipo as string) === 'Mostro' ? 'Creature' : 'PNG')}
    sheet={() => ({ layoutKey: 'npc', def: NPC_KIND })} />
)
