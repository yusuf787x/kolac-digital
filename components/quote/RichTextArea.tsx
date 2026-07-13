'use client';

import { useEffect, useRef, useState } from 'react';

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

const isProbablyHtml = (s: string) =>
  /<(p|br|strong|b|em|i|ul|ol|li|div|span)\b/i.test(s);

/**
 * Legacy-Markdown (**fett** und "- punkt") in leichtes HTML wandeln,
 * damit bestehende Angebote im WYSIWYG korrekt angezeigt werden.
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
          className="input wysiwyg block w-full whitespace-pre-wrap break-words"
          style={{ minHeight }}
        />
      </div>
    </div>
  );
}
