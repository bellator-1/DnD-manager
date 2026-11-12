import { useState } from 'react'
import { Cfg } from '../../core/layouts'
import { NumInput } from '../../core/NumInput'
import { kit } from '../../core/layoutKit'
import { rowsBlock } from '../../core/Rows'
import { itemSummary } from '../items/summary'
import { imagesBlock, portraitBlock } from '../shared/Images'
import { relationsBlock } from '../shared/Relations'
import { playBlocks } from './play'
import { linksBlock } from '../shared/Links'
import { BlockDef, KindDef, Setter } from '../../core/SheetView'
import { Info } from '../../core/Info'
import { rollEvent } from '../dice/DiceMenu'
import { useLastRoll } from '../dice/lastRoll'
import { itemActions, spellActions, useEffective } from './effective'
import { EFFECT_TARGETS, Extra, extraOf, hasExtra, skillBonus } from './rules'
import { ABILITIES, ABILITY_LABEL, Ability, Character, FIELDS, Prof, SKILLS, bonusAbilita, bonusCompetenza, fmt, mod } from './model'

type P = { c: Character; set: Setter; cfg: Cfg }
const profOf = (c: Character, key: string) => (c.competenze?.[key] ?? 0) as Prof

// Bonus personalizzato di un'abilità o di un tiro salvezza (⚙): un'altra caratteristica, modificatori da sommare, bonus fisso.
// Esempio: Arcano con la Saggezza in più → spunta «Saggezza». La chiave non contiene punti (finirebbe annidata nel percorso dei dati).
function ExtraEditor({ c, set, id, base, title, bonus }: { c: Character; set: Setter; id: string; base: Ability; title: string; bonus: number }) {
  const x: Extra = extraOf(c, id) ?? {}
  const put = (n: Extra) => set('abilitaExtra.' + id, hasExtra(n) ? n : undefined)
  return (
    <Info title={`Bonus personalizzato: ${title}`} label={<span className={hasExtra(x) ? 'text-brass' : ''}>⚙</span>}>
      <p className="text-xs text-muted">Cambia come si calcola questo tiro, solo per questo personaggio. Bonus attuale: <b className="text-paper">{fmt(bonus)}</b>.</p>
      <label className="block text-xs text-muted">Caratteristica usata
        <select className="field mt-0.5 text-paper" value={x.ab ?? ''} onChange={e => put({ ...x, ab: (e.target.value || undefined) as Ability | undefined })}>
          <option value="">Quella normale ({ABILITY_LABEL[base]})</option>
          {ABILITIES.map(a => <option key={a} value={a}>{ABILITY_LABEL[a]}</option>)}
        </select>
      </label>
      <fieldset className="text-xs text-muted"><legend>Somma anche il modificatore di</legend>
        <div className="mt-1 grid grid-cols-3 gap-1">
          {ABILITIES.map(a => (
            <label key={a} className="flex items-center gap-1 text-paper">
              <input type="checkbox" checked={!!x.add?.includes(a)} onChange={e => put({ ...x, add: e.target.checked ? [...(x.add ?? []), a] : (x.add ?? []).filter(k => k !== a) })} />{ABILITY_LABEL[a]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-xs text-muted">Bonus fisso (+/−)
        <NumInput className="field mt-0.5 w-24 text-center text-paper" value={x.flat ?? 0} onCommit={n => put({ ...x, flat: n || undefined })} />
      </label>
      {hasExtra(x) && <button className="btn" onClick={() => put({})}>Ripristina il calcolo normale</button>}
    </Info>
  )
}

function SkillList({ c, set, list, editing }: { c: Character; set: Setter; list: typeof SKILLS; editing?: boolean }) {
  const eff = useEffective(c)
  return (
    <ul className="space-y-1 text-sm">
      {list.map(s => {
        const p = profOf(c, s.key), x = extraOf(c, s.key), b = skillBonus(c.livello, eff.ab, s.ab, p, x, eff.abilita)
        return (
          <li key={s.key} className="flex items-center gap-2">
            <button className="w-5 text-brass" title="Cambia competenza" onClick={() => set('competenze.' + s.key, (p + 1) % 3)}>{['○', '●', '◆'][p]}</button>
            <button className="w-10 shrink-0 rounded border border-transparent px-1 text-right hover:border-brass hover:text-brass" title={`Tira ${s.label} (1d20${fmt(b)})`} aria-label={`Tira ${s.label} ${fmt(b)}`} onClick={() => rollEvent(`1d20${fmt(b)}`, s.label)}>{fmt(b)}</button>
            <span className="min-w-0 flex-1 truncate">{s.label}{hasExtra(x) ? ' ✱' : ''}</span>
            {editing && <ExtraEditor c={c} set={set} id={s.key} base={s.ab} title={s.label} bonus={b} />}
          </li>
        )
      })}
    </ul>
  )
}

// La "scheda 5.5": caratteristica + tiro salvezza + le sue abilità, in un blocco solo.
export const AbilityBlock = ({ c, set, cfg }: P) => {
  const a = cfg.ability as Ability
  const eff = useEffective(c)
  const m = mod(eff.ab[a])
  const sp = (c.tiriSalvezza?.[a] ? 1 : 0) as Prof, sx = extraOf(c, `ts_${a}`), sb = skillBonus(c.livello, eff.ab, a, sp, sx, eff.ts)
  return (
    <div className="rounded-md border border-line p-2">
      <div className="flex items-center gap-3">
        <div className="hex shrink-0">
          <button className="font-display text-xl text-brass" title="Tira" aria-label={`Tira ${ABILITY_LABEL[a]} ${fmt(m)}`} onClick={() => rollEvent(`1d20${fmt(m)}`, ABILITY_LABEL[a])}>{fmt(m)}</button>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display">{ABILITY_LABEL[a]}</div>
          <NumInput className="field mt-1 text-center" value={c.abilita[a]} onCommit={n => set('abilita.' + a, n)} aria-label={ABILITY_LABEL[a]} />
          {eff.ab[a] !== c.abilita[a] && <div className="mt-0.5 text-xs text-brass" title="Punteggio con gli effetti attivi">con gli effetti: {eff.ab[a]}</div>}
        </div>
      </div>
      {cfg.save && (
        <div className="mt-1 flex items-center gap-2 text-sm">
          <label className="flex min-w-0 flex-1 items-center gap-2">
            <input type="checkbox" checked={!!c.tiriSalvezza?.[a]} onChange={e => set('tiriSalvezza.' + a, e.target.checked)} />
            <button type="button" onClick={() => rollEvent(`1d20${fmt(sb)}`, 'TS ' + ABILITY_LABEL[a])}>Tiro salvezza {fmt(sb)}{hasExtra(sx) ? ' ✱' : ''}</button>
          </label>
          {cfg.editing && <ExtraEditor c={c} set={set} id={`ts_${a}`} base={a} title={`Tiro salvezza ${ABILITY_LABEL[a]}`} bonus={sb} />}
        </div>
      )}
      {cfg.skills && <div className="mt-2 border-t border-line pt-2"><SkillList c={c} set={set} list={SKILLS.filter(s => s.ab === a)} editing={!!cfg.editing} /></div>}
    </div>
  )
}

const SkillsBlock = ({ c, set, cfg }: P) => <SkillList c={c} set={set} list={cfg.ability ? SKILLS.filter(s => s.ab === cfg.ability) : SKILLS} editing={!!cfg.editing} />

export const HpBlock = ({ c, set }: P) => {
  const eff = useEffective(c)
  const pf = c.pf ?? { max: 1, attuali: 1, temp: 0 }
  const ratio = pf.max > 0 ? Math.max(0, Math.min(1, pf.attuali / pf.max)) : 0
  return (
    <div className="space-y-2">
      <div className="h-2.5 overflow-hidden rounded-full bg-ink" role="img" aria-label={`PF ${pf.attuali} su ${pf.max}`}>
        <div className={`h-full rounded-full transition-all ${ratio > 0.5 ? 'bg-good' : ratio > 0.25 ? 'bg-brass' : 'bg-danger'}`} style={{ width: `${ratio * 100}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {([['attuali', 'Attuali'], ['max', 'Massimi'], ['temp', 'Temporanei']] as const).map(([k, l]) => (
          <label key={k} className="text-xs text-muted">{l}
            <NumInput className="field mt-0.5 text-center font-display text-xl text-paper" value={pf[k] ?? 0} onCommit={n => set('pf.' + k, n)} />
            {k === 'max' && eff.pfMax !== pf.max && <span className="block text-brass" title="Massimo con gli effetti attivi">con gli effetti: {eff.pfMax}</span>}
          </label>
        ))}
      </div>
    </div>
  )
}

// Intestazione: il nome in grande e i dati principali in una riga compatta. Stessi dati dei campi, cambia solo la presentazione.
const IdentityBlock = ({ c, set }: P) => (
  <div className="space-y-3">
    <input className="field min-h-12 rounded-none border-0 border-b border-edge bg-transparent px-0 font-display text-3xl text-brass placeholder:text-muted focus-visible:border-brass" placeholder="Nome del personaggio" aria-label="Nome" value={c.name ?? ''} onChange={e => set('name', e.target.value)} />
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {([['classe', 'Classe'], ['sottoclasse', 'Sottoclasse'], ['specie', 'Specie'], ['background', 'Background']] as const).map(([k, l]) => (
        <label key={k} className="block text-xs text-muted">{l}<input className="field mt-0.5 text-paper" value={(c[k] as string) ?? ''} onChange={e => set(k, e.target.value)} /></label>
      ))}
      <label className="block text-xs text-muted">Livello<NumInput className="field mt-0.5 text-center text-paper" value={c.livello} onCommit={n => set('livello', n)} /></label>
      <label className="block text-xs text-muted">Punti Esperienza<NumInput className="field mt-0.5 text-center text-paper" value={c.pe} onCommit={n => set('pe', n)} /></label>
    </div>
  </div>
)

// Valori di combattimento in evidenza: CA, Iniziativa (clic per tirare), Velocità.
const Tile = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center rounded-lg border border-line bg-ink/40 px-2 py-2 text-center">
    <div className="text-[0.7rem] uppercase tracking-wide text-muted">{label}</div>{children}
  </div>
)
const VitalsBlock = ({ c, set }: P) => {
  const eff = useEffective(c)
  const ini = mod(eff.ab.des) + eff.iniziativa
  const hint = (now: number, base: number) => now !== base && <span className="text-xs text-brass" title="Valore con gli effetti attivi">con gli effetti: {now}</span>
  return (
    <div className="grid grid-cols-3 gap-2">
      <Tile label="Classe Armatura"><NumInput className="field mt-1 min-h-10 border-0 bg-transparent px-0 text-center font-display text-3xl" value={c.ca} onCommit={n => set('ca', n)} aria-label="Classe Armatura" />{hint(eff.ca, c.ca)}</Tile>
      <Tile label="Iniziativa"><button className="mt-1 min-h-10 font-display text-3xl text-brass hover:underline" title={`Tira l'iniziativa (1d20${fmt(ini)})`} aria-label={`Tira l'iniziativa ${fmt(ini)}`} onClick={() => rollEvent(`1d20${fmt(ini)}`, 'Iniziativa')}>{fmt(ini)}</button></Tile>
      <Tile label="Velocità (m)"><NumInput className="field mt-1 min-h-10 border-0 bg-transparent px-0 text-center font-display text-3xl" value={c.velocita} onCommit={n => set('velocita', n)} aria-label="Velocità in metri" />{hint(eff.velocita, c.velocita)}</Tile>
    </div>
  )
}

const DerivedBlock = ({ c }: P) => {
  const eff = useEffective(c)
  const bc = bonusCompetenza(c.livello), car = c.incantesimi?.car as Ability | ''
  const ini = mod(eff.ab.des) + eff.iniziativa
  const perc = 10 + skillBonus(c.livello, eff.ab, 'sag', profOf(c, 'percezione'), extraOf(c, 'percezione'), eff.abilita)
  const att = car ? bc + mod(eff.ab[car]) + eff.attInc : 0
  const rows: [string, string, string?][] = [
    ['Bonus di competenza', fmt(bc)],
    ['Iniziativa', fmt(ini), `1d20${fmt(ini)}`],
    ['Percezione passiva', String(perc)],
    ['CD degli incantesimi', car ? String(8 + bc + mod(eff.ab[car]) + eff.cd) : '—'],
    ['Attacco degli incantesimi', car ? fmt(att) : '—', car ? `1d20${fmt(att)}` : undefined],
  ]
  return <ul className="space-y-1 text-sm">{rows.map(([l, v, r]) => (
    <li key={l} className="flex justify-between"><span className="opacity-70">{l}</span>
      {r ? <button className="font-display text-brass" onClick={() => rollEvent(r, l)}>{v}</button> : <b>{v}</b>}</li>
  ))}</ul>
}

// Ispirazione Eroica: si ha o non si ha. «Ritira l'ultimo tiro» la spende e ripete l'ultimo tiro del registro dei dadi (il nuovo risultato vale).
const InspirationBlock = ({ c, set }: P) => {
  const on = !!c.ispirazione
  const last = useLastRoll()
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button role="switch" aria-checked={on} aria-label="Ispirazione Eroica" title={on ? 'Disponibile: clic per segnarla come non disponibile' : 'Non disponibile: clic per segnarla come ottenuta'}
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 text-2xl transition ${on ? 'border-brass bg-brass text-ink shadow-[0_0_14px] shadow-brass/60' : 'border-edge text-muted hover:border-brass hover:text-brass'}`}
        onClick={() => set('ispirazione', !on)}>✦</button>
      <div className="min-w-0 flex-1">
        <div className="font-display">Ispirazione Eroica</div>
        <div className="text-xs text-muted">{on ? 'Disponibile' : 'Non disponibile'}</div>
      </div>
      <button className="btn disabled:opacity-40" disabled={!on || !last}
        title={last ? `Spende l'Ispirazione e ripete: ${last.label ?? last.expr}` : 'Prima fai un tiro: poi potrai ritirarlo'}
        onClick={() => { if (!last) return; set('ispirazione', false); rollEvent(last.expr, `${last.label ?? 'Tiro'} · ritiro con Ispirazione`) }}>
        Ritira l'ultimo tiro{last ? ` (${last.label ?? last.expr})` : ''}
      </button>
    </div>
  )
}

// Effetti degli oggetti e delle magie: spento di default. Acceso, i valori della scheda tengono conto degli elementi segnati «Attivo» negli elenchi.
const EffectsBlock = ({ c, set }: P) => {
  const eff = useEffective(c), on = !!c.opzioni?.effetti
  const name = (t: string) => EFFECT_TARGETS.find(([k]) => k === t)?.[1] ?? t
  return (
    <div className="space-y-2 text-sm">
      <label className="flex items-center gap-2"><input type="checkbox" checked={on} onChange={e => set('opzioni.effetti', e.target.checked)} />Applica gli effetti degli oggetti e delle magie attivi</label>
      {!on && <p className="text-xs text-muted">Spento: la scheda mostra solo i valori che scrivi tu. Per usarlo, aggiungi gli effetti a un oggetto o a una magia nell'archivio, poi spunta «Attivo» nell'elenco della scheda.</p>}
      {on && !eff.applied.length && <p className="text-xs text-muted">Nessun effetto attivo. Spunta «Attivo» su un oggetto o una magia che ha effetti.</p>}
      {on && eff.applied.length > 0 && (
        <ul className="space-y-0.5">
          {eff.applied.map((a, i) => (
            <li key={i} className="flex justify-between gap-2"><span className="truncate">{a.from}{a.effect.nota ? <span className="text-muted"> · {a.effect.nota}</span> : null}</span>
              <span className="shrink-0 text-brass">{name(a.effect.target)} {a.effect.op === '+' ? fmt(a.effect.valore) : `= ${a.effect.valore}`}</span></li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Slot incantesimo. Tre modi: tutti i livelli; solo quelli con slot (per non avere una tabella di zeri); Magia del Patto (un solo livello, pochi slot).
type SlotMode = 'all' | 'active' | 'pact'
const SlotsBlock = ({ c, set, cfg }: P) => {
  const mode = (cfg.mode ?? 'all') as SlotMode
  const [showAll, setShowAll] = useState(false)
  if (mode === 'pact') {
    const p = c.slot?.patto ?? { max: 0, usati: 0, liv: 1 }
    const max = Math.max(0, p.max ?? 0), used = Math.min(max, Math.max(0, p.usati ?? 0)), free = max - used
    return (
      <div className="space-y-2 text-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted">Livello degli slot<NumInput className="field mt-0.5 w-24 text-center text-paper" min={1} max={9} value={p.liv ?? 1} onCommit={n => set('slot.patto.liv', n)} /></label>
          <label className="text-xs text-muted">Slot totali<NumInput className="field mt-0.5 w-24 text-center text-paper" min={0} max={12} value={max} onCommit={n => set('slot.patto.max', n)} /></label>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Slot del Patto">
          {Array.from({ length: Math.min(max, 12) }, (_, i) => (
            <button key={i} className={`h-7 w-7 rounded-full border-2 transition-colors ${i < free ? 'border-brass bg-brass' : 'border-edge hover:border-brass'}`} aria-pressed={i < free}
              aria-label={`Slot ${i + 1}: ${i < free ? 'disponibile, clic per usarlo' : 'usato, clic per recuperarlo'}`}
              onClick={() => set('slot.patto.usati', Math.min(max, Math.max(0, i < free ? used + 1 : used - 1)))} />
          ))}
          {!max && <span className="text-muted">Imposta quanti slot ha il Patto.</span>}
        </div>
        {max > 0 && <p className="text-xs text-muted">{free} di {max} disponibili · livello {p.liv ?? 1}</p>}
      </div>
    )
  }
  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(l => mode === 'all' || showAll || (c.slot?.[l]?.max ?? 0) > 0)
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 text-xs">
        {levels.map(l => (
          <div key={l}>Livello {l}
            <div className="flex items-center gap-1">
              <NumInput className="field px-1 text-center" min={0} title="Usati" aria-label={`Slot di livello ${l} usati`} value={c.slot?.[l]?.usati ?? 0} onCommit={n => set(`slot.${l}.usati`, n)} />/
              <NumInput className="field px-1 text-center" min={0} title="Totali" aria-label={`Slot di livello ${l} totali`} value={c.slot?.[l]?.max ?? 0} onCommit={n => set(`slot.${l}.max`, n)} />
            </div>
          </div>
        ))}
      </div>
      {mode === 'active' && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {!levels.length && <span className="text-muted">Nessuno slot impostato.</span>}
          <button className="btn" aria-pressed={showAll} onClick={() => setShowAll(v => !v)}>{showAll ? 'Nascondi i livelli senza slot' : 'Modifica i livelli'}</button>
        </div>
      )}
    </div>
  )
}

const abOpts = ABILITIES.map(a => [a, ABILITY_LABEL[a]] as [string, string])
const blocks: Record<string, BlockDef> = {
  ...playBlocks,
  relations: relationsBlock,
  ability: { label: 'Caratteristica con abilità', C: AbilityBlock, cfg: { ability: 'for', save: true, skills: true },
    props: [{ key: 'ability', label: 'Caratteristica', options: abOpts }, { key: 'save', label: 'Tiro salvezza' }, { key: 'skills', label: 'Abilità collegate' }] },
  skills: { label: 'Elenco abilità', C: SkillsBlock, cfg: { ability: '' }, props: [{ key: 'ability', label: 'Mostra', options: [['', 'Tutte'], ...abOpts] }] },
  hp: { label: 'Punti ferita', C: HpBlock },
  links: linksBlock,
  images: imagesBlock,
  portrait: portraitBlock,
  derived: { label: 'Valori calcolati', C: DerivedBlock },
  slots: { label: 'Slot incantesimo', C: SlotsBlock, cfg: { mode: 'all' },
    props: [{ key: 'mode', label: 'Mostra', options: [['all', 'Tutti i livelli (1–9)'], ['active', 'Solo i livelli con slot'], ['pact', 'Magia del Patto (livello unico)']] }] },
  identity: { label: 'Intestazione (nome e dati)', C: IdentityBlock },
  inspiration: { label: 'Ispirazione Eroica', C: InspirationBlock },
  effects: { label: 'Effetti di oggetti e magie', C: EffectsBlock },
  vitals: { label: 'CA, Iniziativa, Velocità', C: VitalsBlock },
  attacks: rowsBlock('Elenco attacchi', 'attacchiLista', [
    { key: 'nome', label: 'Nome', w: '3' }, { key: 'bonus', label: 'Att.', num: true, roll: 'attack', w: '2' },
    { key: 'danni', label: 'Danni', roll: 'dice', w: '3' }, { key: 'tipo', label: 'Tipo', w: '2' }], 'attacco', { kind: 'items', noun: 'armi e oggetti', filter: e => e.tipo !== 'magia', summary: itemSummary, actions: itemActions }),
  spells: rowsBlock('Elenco incantesimi', 'incantesimiLista', [
    { key: 'nome', label: 'Nome', w: '3' }, { key: 'lv', label: 'Liv.', num: true, w: '1' }, { key: 'note', label: 'Note', w: '3' }], 'incantesimo', { kind: 'items', noun: 'magie', filter: e => e.tipo === 'magia', summary: itemSummary, actions: spellActions }),
  inventory: rowsBlock('Inventario', 'inventarioLista', [
    { key: 'nome', label: 'Nome', w: '3' }, { key: 'qta', label: 'Q.tà', num: true, w: '1' }, { key: 'note', label: 'Note', w: '3' }], 'oggetto',
    { kind: 'items', noun: 'oggetti', qty: true, filter: e => e.tipo !== 'magia', summary: itemSummary, actions: itemActions }),
}

// Layout di default: tutto è modificabile dall'utente. Le altezze si adattano al contenuto.
const { fld, blk, sub, grp, skip } = kit('c', FIELDS)
const ab = (a: Ability) => blk('ability', { ability: a, save: true, skills: true })

export const CHARACTER_KIND: KindDef = {
  blocks, fields: FIELDS,
  defaults: [
    (skip(6), grp('Intestazione', 1, [blk('identity')], 0, 0, 9)), // skip: gli id dei blocchi successivi restano quelli di prima
    grp('Ritratto', 1, [blk('portrait')], 9, 0, 3),
    (skip(1), grp('Combattimento', 1, [blk('vitals'), blk('hp'), blk('inspiration'), sub('Stato', 2, [fld('esaurimento')]), blk('derived')], 0, 8, 4)),
    grp('Caratteristiche e abilità', 3, ABILITIES.map(ab), 4, 8, 8),
    grp('Incantesimi', 1, [fld('incantesimi.car'), blk('slots'), blk('spells')], 0, 40, 4),
    grp('Equipaggiamento', 1, [blk('attacks'), blk('inventory'), fld('equipaggiamento'), sub('Monete', 3, ['mr', 'ma', 'me', 'mo', 'mp'].map(m => fld('monete.' + m)))], 4, 60, 4),
    grp('Privilegi, tratti e talenti', 1, [fld('privilegiClasse'), fld('trattiSpecie'), fld('talenti')], 8, 60, 4),
    grp('Addestramenti e linguaggi', 1, [fld('armature'), fld('armi'), fld('strumenti'), fld('lingue')], 0, 80, 4),
    grp('Collegamenti', 1, [blk('links')], 0, 110, 12),
    grp('Relazioni', 1, [blk('relations')], 0, 118, 12),
    grp('Immagini', 1, [blk('images')], 0, 125, 12),
    grp('Personaggio', 2, [fld('aspetto'), fld('personalita'), fld('ideali'), fld('legami'), fld('difetti'), fld('storia')], 4, 90, 8),
    grp('Effetti di oggetti e magie', 1, [blk('effects')], 0, 135, 12), // in coda: gli id dei blocchi esistenti restano quelli di prima
  ],
}

// Vista «modalità gioco»: stessi dati della scheda completa, altro layout (azioni rapide per PF, riposi, condizioni). Anche questo layout si personalizza.
const pk = kit('cp', FIELDS)
const pab = (a: Ability) => pk.blk('ability', { ability: a, save: true, skills: true })
export const CHARACTER_PLAY_KIND: KindDef = {
  blocks, fields: FIELDS,
  defaults: [
    pk.grp('Personaggio', 3, [pk.fld('name'), pk.fld('classe'), pk.fld('livello')], 0, 0, 12),
    pk.grp('Salute', 1, [pk.blk('playhp'), pk.blk('conditions')], 0, 6, 4),
    (pk.skip(1), pk.grp('Combattimento', 1, [pk.blk('vitals'), pk.blk('derived'), pk.blk('inspiration'), pk.sub('Stato', 2, [pk.fld('esaurimento')]), pk.blk('attacks')], 4, 6, 5)),
    pk.grp('Riposi', 1, [pk.blk('rest')], 9, 6, 3),
    pk.grp('Caratteristiche e abilità', 3, ABILITIES.map(pab), 0, 30, 12),
    pk.grp('Incantesimi', 1, [pk.fld('incantesimi.car'), pk.blk('slots'), pk.blk('spells')], 0, 60, 6),
    pk.grp('Inventario', 1, [pk.blk('inventory'), pk.sub('Monete', 3, ['mr', 'ma', 'me', 'mo', 'mp'].map(m => pk.fld('monete.' + m)))], 6, 60, 6),
    pk.grp('Effetti di oggetti e magie', 1, [pk.blk('effects')], 0, 90, 12),
  ],
}
