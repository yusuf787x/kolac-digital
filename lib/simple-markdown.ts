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
  return html
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/div\s*>/gi, '\n')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<strong[^>]*>|<b[^>]*>/gi, '**')
    .replace(/<\/strong\s*>|<\/b\s*>/gi, '**')
    .replace(/<em[^>]*>|<i[^>]*>/gi, '**') // italic zu bold reduzieren
    .replace(/<\/em\s*>|<\/i\s*>/gi, '**')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li\s*>/gi, '\n')
    .replace(/<\/?(ul|ol)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '') // was uebrig ist: strip
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
