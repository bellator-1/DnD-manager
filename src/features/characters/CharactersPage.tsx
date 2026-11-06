import { EntityPage } from '../shared/EntityPage'
import { Character, newCharacter } from './model'
import { CHARACTER_KIND } from './sheet'

export const CharactersPage = () => (
  <EntityPage<Character> kind="characters" noun="Schede" makers={[{ label: 'Nuova scheda', make: () => newCharacter('Nuovo personaggio') }]}
    sheet={() => ({ layoutKey: 'character', def: CHARACTER_KIND })} />
)
