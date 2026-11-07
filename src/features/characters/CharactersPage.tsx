import { usePersisted } from '../../core/SidePanel'
import { EntityPage } from '../shared/EntityPage'
import { Character, newCharacter } from './model'
import { CHARACTER_KIND, CHARACTER_PLAY_KIND } from './sheet'

// Due viste della stessa scheda: completa (per costruire e consultare) e di gioco (azioni rapide). La scelta si ricorda.
export function CharactersPage() {
  const [v, patch] = usePersisted('ui:charview', { play: false })
  return (
    <EntityPage<Character> kind="characters" noun="Schede" makers={[{ label: 'Nuova scheda', make: () => newCharacter('Nuovo personaggio') }]}
      sheet={() => (v.play ? { layoutKey: 'character-play', def: CHARACTER_PLAY_KIND } : { layoutKey: 'character', def: CHARACTER_KIND })}
      extra={() => (
        <div role="group" aria-label="Vista della scheda" className="flex overflow-hidden rounded border border-line text-sm">
          {([[false, 'Scheda completa'], [true, 'Modalità gioco']] as const).map(([p, l]) => (
            <button key={l} aria-pressed={v.play === p} className={`px-3 py-1 ${v.play === p ? 'bg-brass text-ink' : 'hover:text-brass'}`} onClick={() => patch({ play: p })}>{l}</button>
          ))}
        </div>
      )} />
  )
}
