// I colori vivono come variabili CSS in src/index.css (tema scuro e chiaro): qui si dà loro un nome Tailwind, con supporto alla trasparenza (bg-brass/20).
const c = n => `rgb(var(--c-${n}) / <alpha-value>)`
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: {
      ink: c('ink'),         // sfondo della pagina e dei campi
      panel: c('panel'),     // schede, sezioni, finestre
      raised: c('raised'),   // pulsanti e superfici in rilievo
      line: c('line'),       // divisori decorativi
      edge: c('edge'),       // bordi di campi e pulsanti (contrasto almeno 3:1)
      paper: c('paper'),     // testo
      muted: c('muted'),     // testo secondario
      brass: c('brass'),     // accento (ottone)
      onbrass: c('onbrass'), // testo sopra l'accento
      danger: c('danger'), good: c('good'), info: c('info'),
    },
    fontFamily: { display: ['"Iowan Old Style"', 'Palatino', 'Georgia', 'serif'] },
  } },
}
