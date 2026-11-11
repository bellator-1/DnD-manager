# D&D manage

App web locale per gestire campagne di D&D: schede, note, oggetti e magie, PNG e creature, mappe, dadi.

## Avvio
```
npm install
npm run dev     # http://localhost:5173
```

## Dove stanno i dati
Tutto sta in **una cartella del tuo computer** che scegli al primo avvio (serve Chrome o Edge). L'app se la ricorda: alle aperture successive mostra subito le campagne; il browser può chiedere di nuovo il permesso con un clic.
Ogni scheda è un JSON, i layout stanno in `<campagna>/layouts/`, le immagini in `<campagna>/images/`.
Se hai usato versioni precedenti che salvavano nel browser, la schermata delle campagne offre di copiare quei dati nella cartella.

## Manuali (PDF)
«Collega un PDF» lascia il file dov'è: l'app ricorda dove trovarlo (il browser può chiedere il permesso a ogni apertura) e salva nella cartella dei dati nome, ultima pagina, zoom e segnalibri. «Copia un PDF» ne fa invece una copia nella cartella. I PDF non entrano mai nei backup.

## Sezioni
Schede · Note · Oggetti e magie · PNG e creature · Mappe · **Master** (sezioni libere con elenchi di collegamenti a qualsiasi elemento) ·
**Combattimento** (iniziativa, turni, PF, condizioni) · **Sessioni** (diario di sessione) · **Relazioni** (grafo tra personaggi e PNG) · **Manuali** (lettore dei PDF che possiedi: sommario, ricerca nel testo, segnalibri).

Ctrl+K cerca in tutta la campagna. Le schede hanno una **modalità gioco** (PF con danni e cure rapidi, riposi, condizioni): tutto facoltativo e modificabile a mano. Le note hanno cartelle, sottocartelle e tag.

## Cestino, versioni e modelli
- **Cestino** (menu «Strumenti»): schede, PNG, oggetti, magie, note, mappe e sessioni eliminati finiscono in `<campagna>/trash/` e si ripristinano finché non svuoti il cestino. I manuali si eliminano subito (il loro file copiato viene tolto insieme).
- **Versioni dei formati**: ogni file ha `schemaVersion`; quando l'app cambia un formato aggiorna i vecchi file in memoria alla lettura e li riscrive al primo salvataggio. Un file creato da una versione più recente non si riscrive (si perderebbero dei dati).
- **Salvataggi falliti**: si riprovano da soli; se continuano a fallire compare «Riprova» e la chiusura della scheda avvisa che ci sono modifiche non salvate.
- **Modelli di scheda** (pulsante «Modelli»): un layout con un nome (es. «senza monete di platino»). Si crea dal layout attuale o dal predefinito di fabbrica; ogni scheda usa il modello che scegli, e alla creazione di un personaggio puoi sceglierlo da «Nuova: …». Il dato di un campo tolto non si cancella.
- **Annulla dati** (↶ / Ctrl+Z) annulla le modifiche ai dati della scheda, a parte quelle al layout.

## Meccaniche facoltative (scheda)
- **Bonus personalizzati**: ⚙ accanto a ogni abilità o tiro salvezza: un'altra caratteristica, modificatori da sommare (es. Arcano + Saggezza), bonus fisso.
- **Effetti di oggetti e magie**: nell'archivio, «Effetti sulla scheda» (es. CA +1, punteggio impostato a 19). Nella scheda si segna «Attivo» sull'elemento e si accende «Applica gli effetti» nel blocco «Effetti di oggetti e magie»: i valori mostrano «con gli effetti». Spento, la scheda mostra solo ciò che scrivi tu.
- **Lancia** sulle magie collegate: sceglie lo slot (o il Patto) e lo segna come usato.
- **Ispirazione Eroica**: pulsante grande; «Ritira l'ultimo tiro» la spende e ripete l'ultimo tiro del registro dei dadi.
- **Slot incantesimo** (⚙ del blocco): tutti i livelli, solo quelli con slot, oppure Magia del Patto.

## Immagini
Sono file veri in `<campagna>/images/`.
Nelle schede e nelle note le foto grandi vengono ridotte a 1600 px; le mappe restano all'originale.

## Pulizia
Dalla schermata delle campagne, «Pulisci immagini» elenca le immagini che nessuna scheda, nota o mappa usa più e le elimina solo dopo conferma. I PDF dei manuali non entrano nei backup.

## Backup
- **Esporta** (accanto a ogni campagna): un solo file `.dnd.json` con tutto.
- **Importa campagna (JSON)…**: crea sempre una campagna nuova, non sovrascrive mai niente.
- Dentro ogni sezione, **Esporta** / **Importa JSON…** per una singola scheda.

## Test
`npm test` esegue i test automatici: dadi, percorsi dei dati, albero del layout, ricerca, cartelle delle note, grafo, backup e importazione, migrazione dal browser, immagini, indicatore di salvataggio (con un archivio in memoria al posto della cartella).

## Scorciatoie
- Layout e mappe: Ctrl+Z annulla, Ctrl+Maiusc+Z (o Ctrl+Y) ripete. Fuori dalla modifica del layout, Ctrl+Z annulla i dati della scheda.
- Mappe: Invio chiude una rotta o un confine, Esc annulla.
