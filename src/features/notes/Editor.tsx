import { ReactNode, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Markdown } from 'tiptap-markdown'
import { useParams } from 'react-router-dom'
import { saveImage } from '../../core/images'
import { AssetImage, parseImg, setImageCampaign, stringifyImg } from './ImageNode'
import { Indent, IndentParagraph } from './indent'
import { LinkTarget, WikiSuggest, setLinkSource } from './wikilink'

// Le rientranze (U+2003) si salvano come entità: il lettore markdown altrimenti le elimina a inizio paragrafo (come in Lorekeeper).
const toFile = (md: string) => md.replace(/^((?:> ?)*)(\u2003+)/gm, (_m, q, s) => q + '&emsp;'.repeat(s.length))

// Versione base dell'editor di Lorekeeper: markdown, titoli, elenchi, attività, tabelle, rientranza a blocco, link [[ ]].
// Non ancora portati: immagini incorporate e correttore ortografico col dizionario.
export default function Editor({ id, body, onChange, onOpen, targets }: {
  id: string; body: string; onChange: (md: string) => void; onOpen: (kind: string, id: string) => void; targets: LinkTarget[]
}) {
  const cb = useRef(onChange); cb.current = onChange
  const open = useRef(onOpen); open.current = onOpen
  const tg = useRef(targets); tg.current = targets
  useEffect(() => { setLinkSource(() => tg.current) }, [])
  const { cid = '' } = useParams()
  setImageCampaign(cid)
  const ref = useRef<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // Salva le immagini (ridotte a 1600 px) come file della campagna e le inserisce nella nota; vale per il pulsante, il copia-incolla e il trascinamento.
  const insertFiles = async (files: File[]) => {
    for (const f of files.filter(x => x.type.startsWith('image/'))) {
      try {
        const name = await saveImage(cid, f, 1600)
        ref.current?.chain().focus().insertContent([{ type: 'image', attrs: { src: 'img:' + name, title: 'align=center;w=60' } }, { type: 'paragraph' }]).run()
      } catch (e) { alert(`Impossibile salvare l'immagine: ${(e as Error).message}`) }
    }
  }

  const editor = useEditor({
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({ paragraph: false }), IndentParagraph,
      Link.configure({ openOnClick: false, protocols: ['wiki'] }),
      Placeholder.configure({ placeholder: 'Inizia a scrivere…' }),
      Table, TableRow, TableHeader, TableCell, TaskList, TaskItem.configure({ nested: true }),
      Markdown.configure({ html: false, linkify: false }),
      WikiSuggest, Indent, AssetImage,
    ],
    content: body,
    editorProps: {
      handlePaste: (_v, e) => { const fs = [...(e.clipboardData?.files ?? [])]; if (fs.some(f => f.type.startsWith('image/'))) { e.preventDefault(); insertFiles(fs); return true } return false },
      handleDrop: (_v, e) => { const fs = [...((e as DragEvent).dataTransfer?.files ?? [])]; if (fs.some(f => f.type.startsWith('image/'))) { e.preventDefault(); insertFiles(fs); return true } return false },
      handleClick: (_v, _p, e) => {
        const href = (e.target as HTMLElement).closest('a')?.getAttribute('href')
        if (href?.startsWith('wiki:')) { e.preventDefault(); const [k, ...r] = href.slice(5).split(':'); open.current(k, r.join(':')); return true }
        return false
      },
    },
    onUpdate: ({ editor }) => cb.current(toFile(editor.storage.markdown.getMarkdown())),
  }, [id])
  if (!editor) return null
  ref.current = editor

  const Btn = ({ children, title, run, on }: { children: ReactNode; title: string; run: () => void; on?: boolean }) => (
    <button type="button" title={title} aria-label={title} aria-pressed={on} onMouseDown={e => e.preventDefault()} onClick={run}
      className={`h-7 min-w-7 rounded px-2 text-sm ${on ? 'bg-brass text-ink' : 'text-paper/70 hover:bg-line hover:text-paper'}`}>{children}</button>
  )
  const Sep = () => <span className="mx-1 w-px self-stretch bg-line" />
  const c = () => editor.chain().focus()

  // Con un'immagine selezionata i suoi controlli sostituiscono la formattazione nella stessa barra (come in Lorekeeper).
  const img = editor.isActive('image') ? parseImg(editor.getAttributes('image').title) : null
  const setImg = (p: object) => editor.commands.updateAttributes('image', { title: stringifyImg({ ...parseImg(editor.getAttributes('image').title), ...p }) })
  const imageControls = img && (
    <>
      <span className="mr-1 text-xs opacity-60">Immagine</span>
      {([['left', 'Sinistra'], ['center', 'Centro'], ['right', 'Destra'], ['full', 'Larga']] as const).map(([a, l]) => (
        <Btn key={a} title={l} on={img.align === a} run={() => setImg({ align: a })}>{l}</Btn>
      ))}
      <Sep />
      <label className="flex items-center gap-2 text-xs opacity-80">Larghezza
        <input type="range" min={15} max={100} value={img.w} disabled={img.align === 'full'} onChange={e => setImg({ w: +e.target.value })} className="w-40" />
        <span className="w-9 tabular-nums">{img.w}%</span>
      </label>
      <Sep />
      <Btn title="Rimuovi immagine" run={() => c().deleteSelection().run()}>Rimuovi</Btn>
    </>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded border border-line bg-panel">
      <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-line px-3 py-1.5">
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { if (e.target.files) insertFiles([...e.target.files]); e.target.value = '' }} />
        {imageControls ?? (<>
        <Btn title="Grassetto" on={editor.isActive('bold')} run={() => c().toggleBold().run()}><b>B</b></Btn>
        <Btn title="Corsivo" on={editor.isActive('italic')} run={() => c().toggleItalic().run()}><i>I</i></Btn>
        <Sep />
        {([1, 2, 3] as const).map(l => <Btn key={l} title={`Titolo ${l}`} on={editor.isActive('heading', { level: l })} run={() => c().toggleHeading({ level: l }).run()}>H{l}</Btn>)}
        <Sep />
        {editor.isActive('table') ? (<>
          <Btn title="Aggiungi riga" run={() => c().addRowAfter().run()}>+ Riga</Btn>
          <Btn title="Aggiungi colonna" run={() => c().addColumnAfter().run()}>+ Colonna</Btn>
          <Btn title="Elimina riga" run={() => c().deleteRow().run()}>− Riga</Btn>
          <Btn title="Elimina colonna" run={() => c().deleteColumn().run()}>− Colonna</Btn>
          <Btn title="Elimina tabella" run={() => c().deleteTable().run()}>Elimina tabella</Btn>
        </>) : (<>
          <Btn title="Elenco puntato" on={editor.isActive('bulletList')} run={() => c().toggleBulletList().run()}>• Elenco</Btn>
          <Btn title="Elenco numerato" on={editor.isActive('orderedList')} run={() => c().toggleOrderedList().run()}>1. Elenco</Btn>
          <Btn title="Lista di attività" on={editor.isActive('taskList')} run={() => c().toggleTaskList().run()}>☑ Attività</Btn>
          <Btn title="Citazione" on={editor.isActive('blockquote')} run={() => c().toggleBlockquote().run()}>❝</Btn>
          <Btn title="Tabella" run={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>▦ Tabella</Btn>
          <Btn title="Linea" run={() => c().setHorizontalRule().run()}>—</Btn>
          <Sep />
          <Btn title="Riduci la rientranza (Maiusc+Tab)" run={() => (c() as any).outdent().run()}>⇤</Btn>
          <Btn title="Rientra il paragrafo (Tab); «<<» + spazio a inizio riga fa lo stesso" run={() => (c() as any).indent().run()}>⇥</Btn>
        </>)}
        <Sep />
        <Btn title="Collega a una nota o scheda" run={() => c().insertContent('[[').run()}>[[ Link</Btn>
        <Sep />
        <Btn title="Inserisci un'immagine (anche con copia-incolla o trascinamento)" run={() => fileRef.current?.click()}>🖼 Immagine</Btn>
        </>)}
      </div>
      <div className="lore min-h-0 flex-1 cursor-text overflow-y-auto px-8 pb-10 pt-6" onClick={e => { if (e.target === e.currentTarget) editor.commands.focus('end') }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
