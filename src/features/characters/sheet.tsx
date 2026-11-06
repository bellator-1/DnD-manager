import { Cfg } from '../../core/layouts'
import { kit } from '../../core/layoutKit'
import { rowsBlock } from '../../core/Rows'
import { itemSummary } from '../items/summary'
import { imagesBlock } from '../shared/Images'
import { linksBlock } from '../shared/Links'
import { BlockDef, KindDef, Setter } from '../../core/SheetView'
import { rollEvent } from '../dice/DiceMenu'
import { ABILITIES, ABILITY_LABEL, Ability, Character, FIELDS, Prof, SKILLS, bonusAbilita, bonusCompetenza, fmt, mod } from './model'

type P = { c: Character; set: Setter; cfg: Cfg }
const num = (v: string) => (Number.isFinite(+v) ? +v : 0)
const profOf = (c: Character, key: string) => (c.competenze?.[key] ?? 0) as Prof

function SkillList({ c, set, list }: { c: Character; set: Setter; list: typeof SKILLS }) {
  return (
    <ul className="space-y-1 text-sm">
      {list.map(s => {
        const p = profOf(c, s.key), b = bonusAbilita(c, s.ab, p)
        return (
          <li key={s.key} className="flex items-center gap-2">
            <button className="w-5 text-brass" title="Cambia competenza" onClick={() => set('competenze.' + s.key, (p + 1) % 3)}>{['○', '●', '◆'][p]}</button>
            <button className="w-8 text-right" title="Tira" onClick={() => rollEvent(`1d20${fmt(b)}`, s.label)}>{fmt(b)}</button>
            <span>{s.label}</span>
          </li>
        )
      })}
    </ul>
  )
}

// La "scheda 5.5": caratteristica + tiro salvezza + le sue abilità, in un blocco solo.
export const AbilityBlock = ({ c, set, cfg }: P) => {
  const a = cfg.ability as Ability
  return (
    <div className="rounded border border-line p-2">
      <div className="flex items-center justify-between">
        <span className="font-display">{ABILITY_LABEL[a]}</span>
        <button className="font-display text-xl text-brass" title="Tira" onClick={() => rollEvent(`1d20${fmt(mod(c.abilita[a]))}`, ABILITY_LABEL[a])}>{fmt(mod(c.abilita[a]))}</button>
      </div>
      <input className="field mt-1 text-center" type="number" value={c.abilita[a]} onChange={e => set('abilita.' + a, num(e.target.value))} aria-label={ABILITY_LABEL[a]} />
      {cfg.save && (
        <label className="mt-1 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!c.tiriSalvezza?.[a]} onChange={e => set('tiriSalvezza.' + a, e.target.checked)} />
          <button type="button" onClick={() => rollEvent(`1d20${fmt(bonusAbilita(c, a, c.tiriSalvezza?.[a] ? 1 : 0))}`, 'TS ' + ABILITY_LABEL[a])}>Tiro salvezza {fmt(bonusAbilita(c, a, c.tiriSalvezza?.[a] ? 1 : 0))}</button>
        </label>
      )}
      {cfg.skills && <div className="mt-2 border-t border-line pt-2"><SkillList c={c} set={set} list={SKILLS.filter(s => s.ab === a)} /></div>}
    </div>
  )
}

const SkillsBlock = ({ c, set, cfg }: P) => <SkillList c={c} set={set} list={cfg.ability ? SKILLS.filter(s => s.ab === cfg.ability) : SKILLS} />

export const HpBlock = ({ c, set }: P) => (
  <div className="grid grid-cols-3 gap-2 text-center">
    {([['attuali', 'Attuali'], ['max', 'Massimi'], ['temp', 'Temporanei']] as const).map(([k, l]) => (
      <label key={k} className="text-sm">{l}
        <input className="field text-center text-xl" type="number" value={c.pf?.[k] ?? 0} onChange={e => set('pf.' + k, num(e.target.value))} />
      </label>
    ))}
  </div>
)

const DerivedBlock = ({ c }: P) => {
  const bc = bonusCompetenza(c.livello), car = c.incantesimi?.car as Ability | ''
  const rows: [string, string, string?][] = [
    ['Bonus di competenza', fmt(bc)],
    ['Iniziativa', fmt(mod(c.abilita.des)), `1d20${fmt(mod(c.abilita.des))}`],
    ['Percezione passiva', String(10 + bonusAbilita(c, 'sag', profOf(c, 'percezione')))],
    ['CD degli incantesimi', car ? String(8 + bc + mod(c.abilita[car])) : '—'],
    ['Attacco degli incantesimi', car ? fmt(bc + mod(c.abilita[car])) : '—', car ? `1d20${fmt(bc + mod(c.abilita[car]))}` : undefined],
  ]
  return <ul className="space-y-1 text-sm">{rows.map(([l, v, r]) => (
    <li key={l} className="flex justify-between"><span className="opacity-70">{l}</span>
      {r ? <button className="font-display text-brass" onClick={() => rollEvent(r, l)}>{v}</button> : <b>{v}</b>}</li>
  ))}</ul>
}

const SlotsBlock = ({ c, set }: P) => (
  <div className="grid grid-cols-3 gap-2 text-xs">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => (
      <div key={l}>Livello {l}
        <div className="flex items-center gap-1">
          <input className="field px-1 text-center" type="number" min={0} title="Usati" value={c.slot?.[l]?.usati ?? 0} onChange={e => set(`slot.${l}.usati`, num(e.target.value))} />/
          <input className="field px-1 text-center" type="number" min={0} title="Totali" value={c.slot?.[l]?.max ?? 0} onChange={e => set(`slot.${l}.max`, num(e.target.value))} />
        </div>
      </div>
    ))}
  </div>
)

const abOpts = ABILITIES.map(a => [a, ABILITY_LABEL[a]] as [string, string])
const blocks: Record<string, BlockDef> = {
  ability: { label: 'Caratteristica con abilità', C: AbilityBlock, cfg: { ability: 'for', save: true, skills: true },
    props: [{ key: 'ability', label: 'Caratteristica', options: abOpts }, { key: 'save', label: 'Tiro salvezza' }, { key: 'skills', label: 'Abilità collegate' }] },
  skills: { label: 'Elenco abilità', C: SkillsBlock, cfg: { ability: '' }, props: [{ key: 'ability', label: 'Mostra', options: [['', 'Tutte'], ...abOpts] }] },
  hp: { label: 'Punti ferita', C: HpBlock },
  links: linksBlock,
  images: imagesBlock,
  derived: { label: 'Valori calcolati', C: DerivedBlock },
  slots: { label: 'Slot incantesimo', C: SlotsBlock },
  attacks: rowsBlock('Elenco attacchi', 'attacchiLista', [
    { key: 'nome', label: 'Nome', w: '3' }, { key: 'bonus', label: 'Att.', num: true, roll: 'attack', w: '2' },
    { key: 'danni', label: 'Danni', roll: 'dice', w: '3' }, { key: 'tipo', label: 'Tipo', w: '2' }], 'attacco', { kind: 'items', noun: 'armi e oggetti', filter: e => e.tipo !== 'magia', summary: itemSummary }),
  spells: rowsBlock('Elenco incantesimi', 'incantesimiLista', [
    { key: 'nome', label: 'Nome', w: '3' }, { key: 'lv', label: 'Liv.', num: true, w: '1' }, { key: 'note', label: 'Note', w: '3' }], 'incantesimo', { kind: 'items', noun: 'magie', filter: e => e.tipo === 'magia', summary: itemSummary }),
  inventory: rowsBlock('Inventario', 'inventarioLista', [
    { key: 'nome', label: 'Nome', w: '3' }, { key: 'qta', label: 'Q.tà', num: true, w: '1' }, { key: 'note', label: 'Note', w: '3' }], 'oggetto',
    { kind: 'items', noun: 'oggetti', qty: true, filter: e => e.tipo !== 'magia', summary: itemSummary }),
}

// Layout di default: tutto è modificabile dall'utente. Le altezze si adattano al contenuto.
const { fld, blk, sub, grp } = kit('c', FIELDS)
const ab = (a: Ability) => blk('ability', { ability: a, save: true, skills: true })

export const CHARACTER_KIND: KindDef = {
  blocks, fields: FIELDS,
  defaults: [
    grp('Intestazione', 4, [fld('name'), fld('classe'), fld('sottoclasse'), fld('specie'), fld('background'), fld('livello'), fld('pe')], 0, 0, 12),
    grp('Combattimento', 1, [blk('hp'), sub('Stato', 2, [fld('ca'), fld('velocita'), fld('ispirazione'), fld('esaurimento')]), blk('derived')], 0, 8, 4),
    grp('Caratteristiche e abilità', 3, ABILITIES.map(ab), 4, 8, 8),
    grp('Incantesimi', 1, [fld('incantesimi.car'), blk('slots'), blk('spells')], 0, 40, 4),
    grp('Equipaggiamento', 1, [blk('attacks'), blk('inventory'), fld('equipaggiamento'), sub('Monete', 3, ['mr', 'ma', 'me', 'mo', 'mp'].map(m => fld('monete.' + m)))], 4, 60, 4),
    grp('Privilegi, tratti e talenti', 1, [fld('privilegiClasse'), fld('trattiSpecie'), fld('talenti')], 8, 60, 4),
    grp('Addestramenti e linguaggi', 1, [fld('armature'), fld('armi'), fld('strumenti'), fld('lingue')], 0, 80, 4),
    grp('Collegamenti', 1, [blk('links')], 0, 110, 12),
    grp('Immagini', 1, [blk('images')], 0, 125, 12),
    grp('Personaggio', 2, [fld('aspetto'), fld('personalita'), fld('ideali'), fld('legami'), fld('difetti'), fld('storia')], 4, 90, 8),
  ],
}
