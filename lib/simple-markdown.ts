/**
 * Minimaler Markdown-Parser fuer die Angebotstexte.
 *
 * Unterstuetzt bewusst nur zwei Elemente, die die Toolbar erzeugt:
 *   **fett**   -> bold
 *   - Punkt    -> Listenpunkt (bullet)
 *
 * Kein volles Markdown, kein HTML-Ausgabe — wir liefern strukturierte
 * Bloecke, die die jeweilige Render-Schicht (@react-pdf, HTML, ...) in
 * ihre eigenen Elemente uebersetzt.
 */

export interface MdInlineSegment {
  text: string;
  bold: boolean;
}

export interface MdBlock {
  type: 'paragraph' | 'bullet';
  segments: MdInlineSegment[];
}

/** Zerlegt einen Text in Bloecke (Absaetze / Listenpunkte). */
export function parseMarkdownBlocks(text: string): MdBlock[] {
  if (!text) return [];
  const lines = text.split(/\n/);
  const blocks: MdBlock[] = [];
  for (const raw of lines) {
    const line = raw;
    if (!line.trim()) continue;
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({
        type: 'bullet',
        segments: parseInline(bulletMatch[1]),
      });
    } else {
      blocks.push({
        type: 'paragraph',
        segments: parseInline(line),
      });
    }
  }
  return blocks;
}

/**
 * Erkennt "sieht aus wie HTML" — wenn der Editor HTML gespeichert hat,
 * muessen wir zuerst nach Markdown normalisieren, bevor wir Bloecke bauen.
 */
export function isProbablyHtml(s: string): boolean {
  return /<(p|br|strong|b|em|i|ul|ol|li|div|span)\b/i.test(s);
}

/**
 * Sehr schlanker HTML->Markdown-Converter, deckt genau die Elemente
 * ab, die unser WYSIWYG-Editor produziert: <p>, <br>, <strong|b>,
 * <em|i>, <ul>/<ol>/<li>. Alles andere wird gestrippt.
 */
export function htmlToMarkdown(html: string): string {
  return (
    html
      // Word/Outlook: MSO-Bloecke rauswerfen
      .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
      .replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/gi, '')
      // Style/Script komplett droppen
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      // Google Docs / Word / Notion nutzen oft <span style="font-weight:...">
      // statt <strong>. Vor der Element-Konvertierung normalisieren:
      // - font-weight bold/500-900 → <strong>
      // - font-style italic → <em> (wird spaeter zu ** reduziert)
      .replace(
        /<span[^>]*style="[^"]*font-weight:\s*(?:bold|[5-9]00)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
        '<strong>$1</strong>',
      )
      .replace(
        /<span[^>]*style="[^"]*font-style:\s*italic[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
        '<em>$1</em>',
      )
      // Google Docs verschachtelt zusaetzlich <b style="font-weight:normal">
      // (kein Fett!). Wenn font-weight:normal explizit gesetzt ist, den
      // <b>-Tag entfernen ohne Bold-Marker.
      .replace(
        /<b[^>]*style="[^"]*font-weight:\s*normal[^"]*"[^>]*>([\s\S]*?)<\/b>/gi,
        '$1',
      )
      // Struktur-Elemente auf Umbrueche mappen
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/p\s*>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/(h[1-6])\s*>/gi, '\n\n')
      .replace(/<(h[1-6])[^>]*>/gi, '**') // Headings als fett behandeln
      .replace(/<\/div\s*>/gi, '\n')
      .replace(/<div[^>]*>/gi, '')
      // Fett + Kursiv → ** (unser einziger Inline-Stil)
      .replace(/<strong[^>]*>|<b[^>]*>/gi, '**')
      .replace(/<\/strong\s*>|<\/b\s*>/gi, '**')
      .replace(/<em[^>]*>|<i[^>]*>/gi, '**')
      .replace(/<\/em\s*>|<\/i\s*>/gi, '**')
      // Listen
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<\/li\s*>/gi, '\n')
      .replace(/<\/?(ul|ol)[^>]*>/gi, '\n')
      // Rest strippen
      .replace(/<[^>]+>/g, '')
      // HTML-Entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      // Cleanup: leere Fett-Klammern und mehrfache Leerzeilen
      .replace(/\*\*\s*\*\*/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * Universelle Eintritts-Funktion: nimmt entweder HTML (aus WYSIWYG) oder
 * Legacy-Markdown (aus alter Version) und liefert die gemeinsame
 * Block-Struktur zurueck.
 */
export function parseRichText(text: string): MdBlock[] {
  if (!text) return [];
  const md = isProbablyHtml(text) ? htmlToMarkdown(text) : text;
  return parseMarkdownBlocks(md);
}

/**
 * Zerlegt eine Zeile in fett/nicht-fett-Segmente.
 * Erkennt "**fett**".
 */
export function parseInline(line: string): MdInlineSegment[] {
  const segments: MdInlineSegment[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex), bold: false });
  }
  return segments;
}
