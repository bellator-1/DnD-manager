import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'

// Adattato da Lorekeeper: digitando «[[» compare l'elenco di note e schede della campagna; Invio inserisce un link «wiki:<tipo>:<id>».
export interface LinkTarget { id: string; title: string; kind: 'notes' | 'characters' | 'items' | 'npcs' | 'maps' }
let source: () => LinkTarget[] = () => []
export const setLinkSource = (f: () => LinkTarget[]) => { source = f }
const KIND_LABEL: Record<LinkTarget['kind'], string> = { notes: 'Nota', characters: 'Scheda', items: 'Oggetto o magia', npcs: 'PNG', maps: 'Mappa' }

export const WikiSuggest = Extension.create({
  name: 'wikiSuggest',
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '[[',
        allowSpaces: true,
        items: ({ query }) => source().filter(t => t.title.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8),
        command: ({ editor, range, props }) => {
          editor.chain().focus().insertContentAt(range, [
            { type: 'text', text: props.title, marks: [{ type: 'link', attrs: { href: `wiki:${props.kind}:${props.id}` } }] },
            { type: 'text', text: ' ' },
          ]).run()
        },
        render: () => {
          let el: HTMLDivElement, items: any[] = [], sel = 0, cmd: any
          const draw = () => {
            el.innerHTML = ''
            if (!items.length) el.textContent = 'Nessun risultato'
            items.forEach((p, i) => {
              const d = document.createElement('div')
              d.className = 'sug' + (i === sel ? ' on' : '')
              d.textContent = `${p.title} · ${KIND_LABEL[p.kind as LinkTarget['kind']]}`
              d.onmousedown = e => { e.preventDefault(); cmd(p) }
              el.appendChild(d)
            })
          }
          const place = (p: any) => { const r = p.clientRect?.(); if (r) { el.style.left = r.left + 'px'; el.style.top = r.bottom + 4 + 'px' } }
          return {
            onStart: p => { el = document.createElement('div'); el.className = 'sug-box'; document.body.appendChild(el); items = p.items; cmd = p.command; sel = 0; draw(); place(p) },
            onUpdate: p => { items = p.items; cmd = p.command; sel = 0; draw(); place(p) },
            onKeyDown: ({ event }) => {
              const n = Math.max(items.length, 1)
              if (event.key === 'ArrowDown') { sel = (sel + 1) % n; draw(); return true }
              if (event.key === 'ArrowUp') { sel = (sel - 1 + n) % n; draw(); return true }
              if (event.key === 'Enter' && items[sel]) { cmd(items[sel]); return true }
              return false
            },
            onExit: () => el?.remove(),
          }
        },
      }),
    ]
  },
})
