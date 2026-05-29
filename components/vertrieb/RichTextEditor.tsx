'use client';

import { useEffect, useRef } from 'react';

interface Props {
  /** Aktueller HTML-Inhalt. */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Höhe des Bearbeitungs-Bereichs (Tailwind). Standard: min-h-[260px]. */
  minHeightClass?: string;
}

/**
 * Schlanker WYSIWYG-Editor auf contentEditable-Basis. Ohne Drittlib –
 * Toolbar nutzt document.execCommand für Fett/Kursiv/Unterstrichen/Listen/
 * Links, plus Bild-Einfügen per URL oder durch direktes Paste aus der
 * Zwischenablage (Bilder werden als data:-URL eingefügt).
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Nachricht…',
  minHeightClass = 'min-h-[260px]',
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Inhalt nur dann imperativ setzen, wenn er von außen geändert wurde
  // (Vorlage geladen, Reset). Während der Nutzer tippt, verändert der
  // Editor das DOM direkt – wir spiegeln nur in onChange.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const focus = () => ref.current?.focus();

  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    focus();
    onChange(ref.current?.innerHTML ?? '');
  };

  const handleInput = () => {
    onChange(ref.current?.innerHTML ?? '');
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // Bild aus Zwischenablage → data-URL einfügen
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (!blob) continue;
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            exec('insertImage', dataUrl);
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    }
    // Sonst: erlaube nur Plaintext-Paste (verhindert Word-Müll)
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    onChange(ref.current?.innerHTML ?? '');
  };

  const insertLink = () => {
    const url = window.prompt('Link-URL (inkl. https://):', 'https://');
    if (!url || url === 'https://') return;
    exec('createLink', url);
  };

  const insertImage = () => {
    const url = window.prompt(
      'Bild-URL (Tipp: Bild aus Zwischenablage geht direkt per Einfügen):',
      'https://',
    );
    if (!url || url === 'https://') return;
    exec('insertImage', url);
  };

  return (
    <div className="rounded-lg border border-gray-300 overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
        <ToolbarButton onClick={() => exec('bold')} title="Fett (⌘B)">
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('italic')} title="Kursiv (⌘I)">
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('underline')} title="Unterstrichen (⌘U)">
          <span className="underline">U</span>
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          onClick={() => exec('insertUnorderedList')}
          title="Aufzählung"
        >
          •&nbsp;Liste
        </ToolbarButton>
        <ToolbarButton
          onClick={() => exec('insertOrderedList')}
          title="Nummerierte Liste"
        >
          1.&nbsp;Liste
        </ToolbarButton>
        <Divider />
        <ToolbarButton onClick={insertLink} title="Link einfügen">
          🔗
        </ToolbarButton>
        <ToolbarButton onClick={insertImage} title="Bild einfügen">
          🖼️
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          onClick={() => exec('removeFormat')}
          title="Formatierung entfernen"
        >
          ✕&nbsp;Format
        </ToolbarButton>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={handleInput}
        onPaste={handlePaste}
        className={`${minHeightClass} max-h-[400px] overflow-y-auto px-3 py-2.5 text-sm leading-relaxed outline-none focus:bg-white bg-white rte-editor`}
        style={{ wordBreak: 'break-word' }}
      />
      <style jsx>{`
        .rte-editor:empty::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .rte-editor :global(img) {
          max-width: 100%;
          height: auto;
          border-radius: 6px;
        }
        .rte-editor :global(a) {
          color: #2563eb;
          text-decoration: underline;
        }
        .rte-editor :global(ul),
        .rte-editor :global(ol) {
          padding-left: 1.5em;
          margin: 0.4em 0;
        }
        .rte-editor :global(p) {
          margin: 0.4em 0;
        }
      `}</style>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // Selection nicht verlieren
      onClick={onClick}
      title={title}
      className="px-2 py-1 rounded text-xs text-gray-700 hover:bg-white hover:shadow-sm transition-colors"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-gray-300" />;
}
