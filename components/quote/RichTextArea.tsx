'use client';

import { useRef } from 'react';

/**
 * Leichter Rich-Editor fuer Angebots-Textfelder.
 *
 * Speichert Markdown im Klartext (kein HTML), zwei Buttons in der
 * Toolbar:
 *   - Fett: markiert die Auswahl mit **...**
 *   - Aufzaehlung: setzt "- " an den Zeilenanfang jeder markierten Zeile
 *
 * Keine externe Library, kein Editor-State — reines Umschreiben des
 * Textarea-Value. Speichert bleibt String, PDF + Detail-Page parsen
 * dieselbe Markdown-Syntax.
 */

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  /** Zusaetzliche Tailwind-Klassen fuer das <textarea>. */
  className?: string;
  ariaLabel?: string;
}

export default function RichTextArea({
  value,
  onChange,
  placeholder,
  minHeight = 100,
  className = '',
  ariaLabel,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const wrapSelection = (before: string, after: string) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(next);
    // Cursor hinter das eingefuegte Ende setzen.
    requestAnimationFrame(() => {
      if (!el) return;
      const pos = start + before.length + selected.length + after.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const prefixSelectedLines = (prefix: string) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    // Zeilenanfang der Auswahl finden
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    // Zeilenende der Auswahl finden
    const lineEndIdx = value.indexOf('\n', end);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const block = value.slice(lineStart, lineEnd);
    const changed = block
      .split('\n')
      .map((line) =>
        line.startsWith(prefix) ? line : line ? `${prefix}${line}` : prefix.trim(),
      )
      .join('\n');
    const next = `${value.slice(0, lineStart)}${changed}${value.slice(lineEnd)}`;
    onChange(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const newEnd = lineStart + changed.length;
      el.setSelectionRange(newEnd, newEnd);
    });
  };

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => wrapSelection('**', '**')}
          title="Fett (Markierung mit ** umschließen)"
          className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => prefixSelectedLines('- ')}
          title="Aufzählung (- Punkte pro Zeile)"
          className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50"
        >
          • Liste
        </button>
        <span className="ml-2 text-[11px] text-gray-400">
          Tipp: du kannst auch direkt **fett** oder - Aufzählungspunkte tippen.
        </span>
      </div>
      <textarea
        ref={ref}
        className={`input ${className}`.trim()}
        style={{ minHeight }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
    </div>
  );
}
