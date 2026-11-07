# D&D manage

App web locale per gestire campagne di D&D: schede, note, oggetti e magie, PNG e creature, mappe, dadi.

## Avvio
```
npm install
npm run dev     # http://localhost:5173
```

## Dove stanno i dati
- Per impostazione predefinita nel browser (`localStorage`): comodo ma limitato (~5 MB) e legato a quel browser.
- Dalla schermata delle campagne, **«Usa una cartella sul disco»** (Chrome o Edge) salva tutto in file veri: ogni scheda è un JSON,
  i layout stanno in `<campagna>/layouts/`, le immagini delle mappe in `<campagna>/maps/`.

## Sezioni
Schede · Note · Oggetti e magie · PNG e creature · Mappe · **Master** (sezioni libere con elenchi di collegamenti a qualsiasi elemento) ·
**Combattimento** (iniziativa, turni, PF, condizioni) · **Sessioni** (diario di sessione) · **Relazioni** (grafo tra personaggi e PNG) · **Manuali** (lettore dei PDF che possiedi: sommario, ricerca nel testo, segnalibri).

Ctrl+K cerca in tutta la campagna. Le schede hanno una **modalità gioco** (PF con danni e cure rapidi, riposi, condizioni): tutto facoltativo e modificabile a mano. Le note hanno cartelle, sottocartelle e tag.

## Immagini
Sono file veri in `<campagna>/images/` (con il salvataggio nel browser restano testo e il limite è ~5 MB: usa la cartella su disco).
Nelle schede e nelle note le foto grandi vengono ridotte a 1600 px; le mappe restano all'originale.

## Pulizia
Dalla schermata delle campagne, «Pulisci immagini» elenca le immagini che nessuna scheda, nota o mappa usa più e le elimina solo dopo conferma. I PDF dei manuali non entrano nei backup.

## Backup
- **Esporta** (accanto a ogni campagna): un solo file `.dnd.json` con tutto.
- **Importa campagna (JSON)…**: crea sempre una campagna nuova, non sovrascrive mai niente.
- Dentro ogni sezione, **Esporta** / **Importa JSON…** per una singola scheda.

## Test
`npm test` esegue i test automatici (dadi, percorsi dei dati, operazioni sull'albero del layout).

## Scorciatoie
- Layout e mappe: Ctrl+Z annulla, Ctrl+Maiusc+Z (o Ctrl+Y) ripete.
- Mappe: Invio chiude una rotta o un confine, Esc annulla.
