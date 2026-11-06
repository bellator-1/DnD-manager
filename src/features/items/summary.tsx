import { rollEvent } from '../dice/DiceMenu'

// Riassunto di un oggetto/magia mostrato dentro le righe collegate (inventario, armi, incantesimi): dati principali, danni lanciabili e inizio della descrizione.
export function itemSummary(e: any) {
  const bits = e.tipo === 'magia'
    ? [e.livello === 0 ? 'Trucchetto' : `Liv. ${e.livello}`, e.scuola, e.gittata, e.durata, e.concentrazione && 'Concentrazione', e.rituale && 'Rituale']
    : [e.categoria, e.rarita, e.sintonia && 'Sintonia', e.valore]
  const text = String(e.descrizione ?? '')
  const danni: { nome?: string; dado?: string; tipo?: string }[] = (e.danni ?? []).filter((d: any) => d.dado)
  return (
    <>
      <div>{bits.filter(Boolean).join(' · ')}</div>
      {danni.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {danni.map((d, i) => (
            <button key={i} className="btn px-1.5 py-0 text-xs" title="Tira" onClick={() => rollEvent(d.dado!, e.name + (d.nome ? ' · ' + d.nome : ''))}>⚄ {d.nome ? d.nome + ' ' : ''}{d.dado} {d.tipo}</button>
          ))}
        </div>
      )}
      {text && <p className="mt-1 opacity-70">{text.slice(0, 140)}{text.length > 140 ? '…' : ''}</p>}
    </>
  )
}
