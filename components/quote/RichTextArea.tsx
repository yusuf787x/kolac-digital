'use client';

import { useEffect, useRef, useState } from 'react';
import { htmlToMarkdown, isProbablyHtml } from '@/lib/simple-markdown';

/**
 * WYSIWYG-Editor fuer Angebots-Textfelder. Kein Markdown mehr sichtbar —
 * Fett wird live fett, Aufzaehlungspunkte werden echte Bullets.
 *
 * Umsetzung: contentEditable + document.execCommand fuer Bold/List.
 * execCommand ist zwar "deprecated", ist aber in allen aktuellen Browsern
 * stabil und liefert genau die zwei Operationen (Bold + BulletList) ohne
 * Zusatz-Dependency. Speichert HTML im value-String.
 *
 * Toolbar-Buttons nutzen onMouseDown mit preventDefault, damit die
 * Selection im Editor beim Klick nicht verloren geht.
 */

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  ariaLabel?: string;
}

/**
 * Legacy-Markdown (**fett** und "- punkt") in leichtes HTML wandeln,
 * damit bestehende Angebote im WYSIWYG korrekt angezeigt werden.
 * Wird auch fuer Paste-Sanitizing genutzt (HTML aus KI/Word/Gmail
 * → Markdown → sauberes HTML mit nur unseren Elementen).
 */
const markdownToHtml = (md: string): string => {
  const lines = md.split(/\n/);
  const html: string[] = [];
  let listOpen = false;
  for (const raw of lines) {
    const bullet = raw.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      if (!listOpen) {
        html.push('<ul>');
        listOpen = true;
      }
      html.push(`<li>${inlineMdToHtml(bullet[1])}</li>`);
    } else {
      if (listOpen) {
        html.push('</ul>');
        listOpen = false;
      }
      if (raw.trim()) {
        html.push(`<p>${inlineMdToHtml(raw)}</p>`);
      }
    }
  }
  if (listOpen) html.push('</ul>');
  return html.join('');
};

const inlineMdToHtml = (line: string): string =>
  line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

/**
 * Fuegt HTML an der aktuellen Cursor-Position in ein contentEditable ein.
 * Nutzt die native Range/Selection-API — robuster als execCommand
 * (das in Chrome/Safari HTML manchmal als escaped Text landet, weil es
 * am Rand von <p>-Bloecken die Struktur nicht sauber trennt).
 *
 * Wenn die aktuelle Selection nicht innerhalb des Editors sitzt (z.B.
 * direkt nach dem Buttons-Klick), wird ans Ende des Editors angehaengt.
 */
const insertHtmlAtCursor = (html: string, editor: HTMLDivElement | null) => {
  if (!editor) return;
  const sel = window.getSelection();
  let range: Range | null = null;

  if (sel && sel.rangeCount > 0) {
    const r = sel.getRangeAt(0);
    if (editor.contains(r.commonAncestorContainer)) {
      range = r;
    }
  }
  if (!range) {
    // Fallback: an das Ende einfuegen
    range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
  }

  range.deleteContents();

  const template = document.createElement('template');
  template.innerHTML = html;
  const frag = template.content;
  const lastNode = frag.lastChild;
  range.insertNode(frag);

  // Cursor hinter das eingefuegte Ende setzen.
  if (lastNode && sel) {
    const after = document.createRange();
    after.setStartAfter(lastNode);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
  }
};

export default function RichTextArea({
  value,
  onChange,
  placeholder,
  minHeight = 100,
  ariaLabel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  // Initial-Content EINMAL setzen. Nicht bei jedem Render neu schreiben —
  // sonst wandert der Cursor beim Tippen zurueck an den Anfang.
  useEffect(() => {
    if (!ref.current) return;
    const initial = value && !isProbablyHtml(value) ? markdownToHtml(value) : value || '';
    if (ref.current.innerHTML !== initial) {
      ref.current.innerHTML = initial;
    }
    setIsEmpty(!ref.current.textContent?.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    setIsEmpty(!ref.current.textContent?.trim());
    onChange(html);
  };

  const exec = (cmd: string) => {
    document.execCommand(cmd, false);
    emit();
    ref.current?.focus();
  };

  /**
   * Paste-Handler mit Sanitizer.
   *
   * KI-Tools (ChatGPT, Claude, Perplexity), Word, Gmail und Notion legen
   * beim Kopieren HTML in die Zwischenablage — inkl. Fonts, Farben,
   * Layout-Divs usw. Wenn wir das 1:1 einfuegen, sieht der Text im
   * Editor "fremd" aus und mischt sich schlecht mit unserem PDF-Rendering.
   *
   * Pipeline:
   *   1) HTML aus Zwischenablage → htmlToMarkdown (kollabiert alles auf
   *      unsere Untermenge: <strong>, <ul><li>, Absaetze).
   *   2) Falls kein HTML → Klartext, der aber "**fett**" oder "- punkt"
   *      enthalten kann (Copy aus ChatGPT/Claude-Textmodus).
   *   3) markdownToHtml wandelt beides in unser sauberes HTML.
   *   4) Ueber die native Range-API am Cursor einfuegen (robuster als
   *      das teils buggy execCommand('insertHTML')).
   */
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const cd = e.clipboardData;
    if (!cd) return;
    e.preventDefault();

    const html = cd.getData('text/html');
    const text = cd.getData('text/plain');
    const useHtml = !!html && isProbablyHtml(html);
    if (!useHtml && !text) return;

    // htmlToMarkdown akzeptiert auch Klartext (regexen greifen dann
    // einfach nicht). So kommen ChatGPT-"**fett**" und Word-
    // <strong>fett</strong> beide durch dieselbe Pipeline.
    const md = useHtml ? htmlToMarkdown(html) : text;
    const cleaned = markdownToHtml(md);

    insertHtmlAtCursor(cleaned, ref.current);
    emit();
  };

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center gap-1">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec('bold');
          }}
          title="Fett (⌘/Ctrl+B)"
          className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50"
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec('insertUnorderedList');
          }}
          title="Aufzählung"
          className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50"
        >
          • Liste
        </button>
      </div>

      <div className="relative">
        {isEmpty && placeholder && (
          <div
            className="pointer-events-none absolute left-3 top-2 text-sm text-gray-400"
            aria-hidden
          >
            {placeholder}
          </div>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline
          aria-label={ariaLabel}
          onInput={emit}
          onBlur={emit}
          onPaste={handlePaste}
          className="input wysiwyg block w-full whitespace-pre-wrap break-words"
          style={{ minHeight }}
        />
      </div>
    </div>
  );
}
