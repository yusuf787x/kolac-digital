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
