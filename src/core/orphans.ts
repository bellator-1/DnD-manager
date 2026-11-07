// Immagini inutilizzate: un file in images/ è inutilizzato se il suo nome non compare in nessun file di testo della campagna.
export const unusedImages = (names: string[], texts: string[]) => {
  const hay = texts.join('\n')
  return names.filter(n => !hay.includes(n))
}
export const fmtSize = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`)
