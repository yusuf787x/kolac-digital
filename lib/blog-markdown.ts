/**
 * Schlanker Markdown-Parser fuer Blogartikel.
 *
 * Bewusst ohne zusaetzliche Abhaengigkeit, damit wir die
 * HTML-Struktur vollstaendig kontrollieren. Fuer Suchmaschinen und
 * KI-Systeme ist eine saubere Ueberschriften-Hierarchie der
 * wichtigste Strukturhinweis, deshalb bekommt jede H2 eine
 * Sprungmarke fuer das Inhaltsverzeichnis.
 *
 * Unterstuetzt: ## und ### Ueberschriften, Absaetze, Aufzaehlungen,
 * nummerierte Listen, Zitat-Kaesten, **fett**, [Text](Link).
 */

export interface ArticleInline {
  text: string;
  bold?: boolean;
  href?: string;
}

export type ArticleBlock =
  | { type: 'h2'; id: string; text: string }
  | { type: 'h3'; id: string; text: string }
  | { type: 'p'; content: ArticleInline[] }
  | { type: 'ul'; items: ArticleInline[][] }
  | { type: 'ol'; items: ArticleInline[][] }
  | { type: 'quote'; content: ArticleInline[] };

/** Erzeugt eine URL-taugliche Sprungmarke aus einer Ueberschrift. */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

/** Zerlegt eine Zeile in Fett- und Link-Abschnitte. */
export function parseArticleInline(line: string): ArticleInline[] {
  const out: ArticleInline[] = [];
  // Reihenfolge wichtig: Links vor Fettung, damit ein Linktext mit
  // Sternchen nicht zerrissen wird.
  const pattern = /(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(line)) !== null) {
    if (m.index > last) {
      out.push({ text: line.slice(last, m.index) });
    }
    const token = m[0];
    if (token.startsWith('[')) {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) out.push({ text: link[1], href: link[2] });
    } else {
      out.push({ text: token.slice(2, -2), bold: true });
    }
    last = m.index + token.length;
  }
  if (last < line.length) out.push({ text: line.slice(last) });
  return out.length > 0 ? out : [{ text: line }];
}

export function parseArticle(markdown: string): ArticleBlock[] {
  if (!markdown) return [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: ArticleBlock[] = [];
  let listBuffer: ArticleInline[][] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listType && listBuffer.length > 0) {
      blocks.push({ type: listType, items: listBuffer });
    }
    listBuffer = [];
    listType = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList();
      continue;
    }

    const h2 = line.match(/^##\s+(.*)$/);
    const h3 = line.match(/^###\s+(.*)$/);
    // Reihenfolge: erst H3 pruefen, weil ### auch auf ## passt.
    if (h3) {
      flushList();
      const text = h3[1].trim();
      blocks.push({ type: 'h3', id: slugifyHeading(text), text });
      continue;
    }
    if (h2) {
      flushList();
      const text = h2[1].trim();
      blocks.push({ type: 'h2', id: slugifyHeading(text), text });
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listBuffer.push(parseArticleInline(bullet[1]));
      continue;
    }

    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (numbered) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listBuffer.push(parseArticleInline(numbered[1]));
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushList();
      blocks.push({ type: 'quote', content: parseArticleInline(quote[1]) });
      continue;
    }

    flushList();
    blocks.push({ type: 'p', content: parseArticleInline(line) });
  }
  flushList();
  return blocks;
}

/** Alle H2-Ueberschriften fuer das Inhaltsverzeichnis. */
export function extractHeadings(
  markdown: string,
): Array<{ id: string; text: string }> {
  return parseArticle(markdown)
    .filter((b): b is Extract<ArticleBlock, { type: 'h2' }> => b.type === 'h2')
    .map((b) => ({ id: b.id, text: b.text }));
}

/** Grobe Lesezeit: 200 Woerter pro Minute, mindestens 1. */
export function estimateReadingMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Reiner Text ohne Markdown-Zeichen, z.B. fuer Meta-Angaben. */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[>\-*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}
