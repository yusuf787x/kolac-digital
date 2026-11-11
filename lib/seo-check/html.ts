/**
 * Schlanke HTML-Auswertung ohne zusaetzliche Abhaengigkeit. Reicht fuer
 * die Signale des SEO-Checks (Meta-Angaben, Ueberschriften, Links,
 * strukturierte Daten). Kein vollstaendiger Parser, bewusst tolerant.
 */

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß',
  ndash: '–', mdash: '—', hellip: '…', copy: '©', reg: '®', euro: '€',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code] ?? m;
  });
}

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  if (!m) return undefined;
  return decodeEntities((m[1] ?? m[2] ?? m[3] ?? '').trim());
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export interface ParsedPage {
  title?: string;
  description?: string;
  canonical?: string;
  lang?: string;
  robots?: string;
  viewport: boolean;
  generator?: string;
  h1: string[];
  h2Count: number;
  /** Reihenfolge der Ueberschriften-Ebenen, z. B. [1, 2, 3, 2]. */
  headingLevels: number[];
  words: number;
  text: string;
  images: { total: number; missingAlt: number };
  internalLinks: string[];
  externalLinkCount: number;
  telLinks: string[];
  schemaTypes: string[];
  schemaHasOpeningHours: boolean;
  ogTitle: boolean;
  ogImage: boolean;
  hasForm: boolean;
  hasMap: boolean;
  impressumLink: boolean;
  contactLink: boolean;
  wordpress: boolean;
}

const FILE_EXT = /\.(pdf|jpe?g|png|gif|webp|svg|zip|docx?|xlsx?|pptx?|mp4|mp3|ics|xml|txt)$/i;

function collectSchemaTypes(node: unknown, out: Set<string>, hours: { found: boolean }): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectSchemaTypes(n, out, hours));
    return;
  }
  const obj = node as Record<string, unknown>;
  const t = obj['@type'];
  if (typeof t === 'string') out.add(t);
  if (Array.isArray(t)) t.forEach((x) => typeof x === 'string' && out.add(x));
  if ('openingHours' in obj || 'openingHoursSpecification' in obj) hours.found = true;
  for (const v of Object.values(obj)) if (v && typeof v === 'object') collectSchemaTypes(v, out, hours);
}

export function parsePage(html: string, pageUrl: string): ParsedPage {
  const base = new URL(pageUrl);
  const head = html.match(/<head[\s\S]*?<\/head>/i)?.[0] ?? html.slice(0, 50_000);

  const metas = head.match(/<meta\b[^>]*>/gi) ?? [];
  const meta = (key: string, kind: 'name' | 'property' = 'name') =>
    metas
      .map((m) => ({ k: attr(m, kind)?.toLowerCase(), c: attr(m, 'content') }))
      .find((m) => m.k === key)?.c;

  const title = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const canonicalTag = (head.match(/<link\b[^>]*>/gi) ?? []).find((l) => /rel\s*=\s*["']?canonical/i.test(l));
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? '';

  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<template[\s\S]*?<\/template>/gi, ' ');
  const bodyOnly = body.match(/<body[\s\S]*$/i)?.[0] ?? body;
  const text = stripTags(bodyOnly);
  const words = text.split(/\s+/).filter((w) => /[a-zäöüß0-9]{2,}/i.test(w)).length;

  const h1 = Array.from(bodyOnly.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)).map((m) => stripTags(m[1])).filter(Boolean);
  const h2Count = (bodyOnly.match(/<h2\b/gi) ?? []).length;
  const headingLevels = Array.from(bodyOnly.matchAll(/<h([1-6])\b/gi)).map((m) => Number(m[1]));

  const imgs = bodyOnly.match(/<img\b[^>]*>/gi) ?? [];
  const missingAlt = imgs.filter((i) => {
    const alt = attr(i, 'alt');
    const hidden = /aria-hidden\s*=\s*["']?true/i.test(i) || /role\s*=\s*["']?presentation/i.test(i);
    return !hidden && (alt === undefined || alt === '');
  }).length;

  const internal = new Set<string>();
  let externalLinkCount = 0;
  const telLinks: string[] = [];
  let impressumLink = false;
  let contactLink = false;
  for (const m of bodyOnly.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = attr(m[0], 'href');
    if (!href) continue;
    const label = stripTags(m[1]).toLowerCase();
    if (href.startsWith('tel:')) {
      telLinks.push(href.slice(4));
      continue;
    }
    if (/impressum/i.test(href) || label.includes('impressum')) impressumLink = true;
    if (/kontakt|contact/i.test(href) || label.includes('kontakt')) contactLink = true;
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) continue;
    let u: URL;
    try {
      u = new URL(href, base);
    } catch {
      continue;
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
    const sameSite = u.hostname.replace(/^www\./, '') === base.hostname.replace(/^www\./, '');
    if (!sameSite) {
      externalLinkCount++;
      continue;
    }
    if (FILE_EXT.test(u.pathname)) continue;
    u.hash = '';
    internal.add(u.toString());
  }

  const schemaTypes = new Set<string>();
  const hours = { found: false };
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      collectSchemaTypes(JSON.parse(m[1].trim()), schemaTypes, hours);
    } catch {
      /* ungueltiges JSON-LD ignorieren */
    }
  }

  return {
    title: title ? stripTags(title) : undefined,
    description: meta('description'),
    canonical: canonicalTag ? attr(canonicalTag, 'href') : undefined,
    lang: attr(htmlTag, 'lang'),
    robots: meta('robots'),
    viewport: !!meta('viewport'),
    generator: meta('generator'),
    h1,
    h2Count,
    headingLevels,
    words,
    text,
    images: { total: imgs.length, missingAlt },
    internalLinks: Array.from(internal),
    externalLinkCount,
    telLinks,
    schemaTypes: Array.from(schemaTypes),
    schemaHasOpeningHours: hours.found,
    ogTitle: !!meta('og:title', 'property'),
    ogImage: !!meta('og:image', 'property'),
    hasForm: /<form\b/i.test(bodyOnly) || /<iframe[^>]+(typeform|jotform|form)/i.test(bodyOnly),
    hasMap: /google\.[a-z.]+\/maps|maps\.google\.|goo\.gl\/maps|maps\.app\.goo\.gl|g\.page\//i.test(html),
    impressumLink,
    contactLink,
    wordpress: /\/wp-content\/|\/wp-includes\//i.test(html),
  };
}

/** Erkennt den Website-Baukasten bzw. das CMS. */
export function detectPlatform(html: string, page: ParsedPage, headers: Headers): string | undefined {
  const gen = (page.generator ?? '').toLowerCase();
  const server = (headers.get('x-powered-by') ?? '') + ' ' + (headers.get('server') ?? '');
  // Nur technische Spuren (CDN-Adressen, Generator) auswerten, nie den
  // sichtbaren Text: eine Agentur-Seite darf "Wix" erwaehnen.
  if (gen.includes('wix') || /static\.wixstatic\.com|parastorage\.com/i.test(html)) return 'Wix';
  if (gen.includes('jimdo') || /jimdo(cdn|site)\.com|assets\.jimstatic\.com/i.test(html)) return 'Jimdo';
  if (gen.includes('squarespace') || /static1\.squarespace\.com|squarespace-cdn\.com/i.test(html)) return 'Squarespace';
  if (gen.includes('webflow') || /assets\.website-files\.com|cdn\.prod\.website-files\.com/i.test(html)) return 'Webflow';
  if (/ionos|1and1|mywebsite/i.test(gen) || /mywebsite-editor\.(com|net)|website-editor\.net/i.test(html)) return 'IONOS Baukasten';
  if (gen.includes('shopify') || /cdn\.shopify\.com/i.test(html)) return 'Shopify';
  if (gen.includes('wordpress') || page.wordpress) return 'WordPress';
  if (gen.includes('typo3')) return 'TYPO3';
  if (gen.includes('joomla')) return 'Joomla';
  if (/next\.js/i.test(server) || /\/_next\/static\//.test(html)) return 'Next.js';
  return page.generator || undefined;
}

/**
 * Postleitzahl und Ort, z. B. "33611 Bielefeld". Ein zweites Wort nur bei
 * typischen Ortsvorsaetzen ("Bad Rappenau", "Sankt Augustin"), sonst
 * landet die naechste Fusszeilen-Angabe ("Herford Impressum") im Ort.
 */
export function findAddress(text: string): { zip: string; city: string } | undefined {
  const m = text.match(
    /\b(\d{5})\s+((?:(?:Bad|Sankt|St\.|Groß|Klein|Neu|Alt|Hohen|Ober|Unter)\s+)?[A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)*)/,
  );
  if (!m) return undefined;
  return { zip: m[1], city: m[2] };
}

export function findPhoneInText(text: string): boolean {
  return /(\+49|0049|\(0\d{2,5}\)|\b0\d{2,5})[\s/-]?\d[\d\s/-]{4,}\d/.test(text);
}
