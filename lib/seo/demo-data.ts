import { expectedCtr } from './analysis';
import { stableHash } from './changelog-markdown';
import { addMonths, lastCompleteMonth } from './months';
import type {
  KeywordGroup,
  PageSpeedResult,
  SeoActivityStatus,
  SeoMetrics,
  SeoMonth,
  SeoRow,
} from './types';

/**
 * Erzeugte, aber realistisch wirkende Zahlen fuer den Testkunden. Damit
 * lassen sich Portal, PDF, Freigabe und Mails pruefen, ohne einen echten
 * Search-Console-Zugang. Deterministisch: gleicher Monat, gleiche Zahlen.
 *
 * Geschichte des Demo-Kunden: 16 Monate Historie, die SEO-Betreuung
 * beginnt vor vier Monaten. Ab da steigen Positionen und Klicks.
 */

export const DEMO_MONTHS = 16;
/** Monate seit Beginn der Betreuung (gerechnet vom letzten Monat rueckwaerts). */
const SEO_START_OFFSET = 3;

export const DEMO_CONFIG = {
  company: 'Muster Motoren GmbH (Demo)',
  displayName: 'Muster Motoren GmbH',
  domain: 'muster-motoren.de',
  gscProperty: 'sc-domain:muster-motoren.de',
  brandTerms: ['muster motoren', 'mustermotoren'],
  keywordGroups: [
    { id: 'instandsetzung', name: 'Motorinstandsetzung', patterns: ['instandsetz', 'überhol|ueberhol', 'generalüberholt|generalueberholt'] },
    { id: 'austauschmotor', name: 'Austauschmotor', patterns: ['austauschmotor', 'tauschmotor'] },
    { id: 'motorschaden', name: 'Motorschaden', patterns: ['motorschaden', 'kolbenfresser', 'zylinderkopfdichtung', 'steuerkette'] },
    { id: 'motorcodes', name: 'Motorcodes', patterns: ['\\b(n47|n57|om651|om642|ea189|ea288)\\b', '\\b[12]\\.[0-9] tdi\\b'] },
    { id: 'staedte', name: 'Städte', patterns: ['bielefeld|münchen|muenchen|berlin|hamburg|köln|koeln|dortmund|hannover'] },
  ] satisfies KeywordGroup[],
  pagespeedUrls: [
    'https://muster-motoren.de/',
    'https://muster-motoren.de/austauschmotor',
    'https://muster-motoren.de/motorinstandsetzung',
  ],
};

interface DemoKeyword {
  query: string;
  page: string;
  /** Monatliche Impressionen vor Beginn der Betreuung. */
  baseImpr: number;
  /** Position vor Beginn der Betreuung. */
  basePos: number;
  /** Wie stark die Betreuung hilft, in Positionen. */
  gain: number;
}

const SITE = 'https://muster-motoren.de';
const CITIES = ['bielefeld', 'münchen', 'berlin', 'hamburg', 'köln', 'dortmund', 'hannover'];
const CODES = ['n47', 'om651', 'ea189', 'n57', 'om642', '2.0 tdi'];

function rng(seed: string): () => number {
  let a = parseInt(stableHash(seed).slice(0, 8), 36) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function slug(s: string): string {
  return s
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildKeywords(): DemoKeyword[] {
  const r = rng('demo-keywords');
  const out: DemoKeyword[] = [];
  const add = (query: string, page: string, impr: [number, number], pos: [number, number], gain: number) =>
    out.push({
      query,
      page: `${SITE}${page}`,
      baseImpr: Math.round(impr[0] + r() * (impr[1] - impr[0])),
      basePos: pos[0] + r() * (pos[1] - pos[0]),
      gain: gain * (0.5 + r()),
    });

  add('muster motoren', '/', [300, 420], [1, 1.3], 0);
  add('mustermotoren lage', '/', [80, 120], [1, 1.5], 0);
  add('muster motoren erfahrungen', '/ueber-uns', [40, 70], [1.5, 3], 0.5);

  const services: Array<[string, string, [number, number], [number, number], number]> = [
    ['motorinstandsetzung', '/motorinstandsetzung', [1800, 2600], [11, 16], 6],
    ['motor instandsetzen lassen', '/motorinstandsetzung', [500, 800], [8, 13], 5],
    ['motorüberholung kosten', '/motorinstandsetzung', [900, 1400], [14, 22], 7],
    ['austauschmotor', '/austauschmotor', [2500, 3500], [12, 18], 5],
    ['austauschmotor kaufen', '/austauschmotor', [700, 1100], [9, 14], 5],
    ['austauschmotor mit einbau', '/austauschmotor', [400, 650], [6, 10], 3],
    ['motorschaden was tun', '/motorschaden', [1200, 1800], [15, 25], 6],
    ['motorschaden reparatur kosten', '/motorschaden', [800, 1200], [10, 16], 5],
    ['kolbenfresser reparatur', '/motorschaden', [200, 380], [7, 12], 3],
    ['zylinderkopfdichtung defekt kosten', '/motorschaden', [600, 900], [18, 30], 6],
    ['steuerkette wechseln kosten', '/steuerkette', [1500, 2200], [16, 26], 8],
    ['motor generalüberholt', '/motorinstandsetzung', [300, 500], [5, 9], 2],
  ];
  for (const s of services) add(...s);

  for (const code of CODES) {
    for (const suffix of ['steuerkette', 'austauschmotor', 'motorschaden']) {
      add(`${code} ${suffix}`, `/motoren/${slug(code)}`, [60, 420], [6, 24], 6);
    }
  }
  for (const city of CITIES) {
    for (const svc of ['motorinstandsetzung', 'austauschmotor', 'motorschaden']) {
      add(`${svc} ${city}`, `/${svc}-${slug(city)}`, [40, 260], [5, 30], 5);
    }
  }
  // Long Tail: viele kleine Suchanfragen
  const tails = ['erfahrungen', 'preis', 'in der nähe', 'günstig', 'werkstatt', 'dauer', 'garantie'];
  for (const base of ['motorinstandsetzung', 'austauschmotor', 'motor überholen']) {
    for (const t of tails) add(`${base} ${t}`, base.startsWith('austausch') ? '/austauschmotor' : '/motorinstandsetzung', [10, 90], [9, 45], 4);
  }
  return out;
}

const KEYWORDS = buildKeywords();

/** Saisonkurve: im Winter mehr Motorschaeden, im Sommer etwas weniger Suchen. */
function season(month: SeoMonth): number {
  const mo = Number(month.slice(5, 7));
  return 1 + 0.12 * Math.cos(((mo - 1) / 12) * 2 * Math.PI);
}

export function demoMonths(now = new Date()): SeoMonth[] {
  const last = lastCompleteMonth(now);
  return Array.from({ length: DEMO_MONTHS }, (_, i) => addMonths(last, -(DEMO_MONTHS - 1 - i)));
}

/** Fortschritt der Betreuung 0..1 fuer einen Monat. */
function progress(month: SeoMonth, last: SeoMonth): number {
  const start = addMonths(last, -SEO_START_OFFSET);
  if (month < start) return 0;
  let steps = 0;
  for (let m = start; m < month; m = addMonths(m, 1)) steps++;
  return Math.min(1, (steps + 1) / (SEO_START_OFFSET + 1));
}

export function generateDemoMonth(
  month: SeoMonth,
  now = new Date(),
): { totals: SeoMetrics; queries: SeoRow[]; pages: SeoRow[] } {
  const last = lastCompleteMonth(now);
  const p = progress(month, last);
  const r = rng(`demo-${month}`);
  const queries: SeoRow[] = [];
  const pageAcc = new Map<string, { clicks: number; impressions: number; posW: number }>();

  for (const k of KEYWORDS) {
    // Neue Inhalte: Motorcode-Seiten tauchen erst mit der Betreuung auf
    if (k.page.includes('/motoren/') && p === 0 && r() < 0.7) continue;
    const position = Math.max(1, k.basePos - k.gain * 0.6 * p + (r() - 0.5) * 2.2);
    const impressions = Math.max(
      0,
      Math.round(k.baseImpr * season(month) * (1 + 0.2 * p) * (0.85 + r() * 0.3)),
    );
    if (impressions === 0) continue;
    const clicks = Math.round(impressions * expectedCtr(position) * (0.7 + r() * 0.6));
    queries.push({ key: k.query, clicks, impressions, ctr: clicks / impressions, position });
    const acc = pageAcc.get(k.page) ?? { clicks: 0, impressions: 0, posW: 0 };
    acc.clicks += clicks;
    acc.impressions += impressions;
    acc.posW += position * impressions;
    pageAcc.set(k.page, acc);
  }

  const pages: SeoRow[] = [...pageAcc.entries()].map(([key, a]) => ({
    key,
    clicks: a.clicks,
    impressions: a.impressions,
    ctr: a.impressions ? a.clicks / a.impressions : 0,
    position: a.impressions ? a.posW / a.impressions : 0,
  }));

  // Summen enthalten wie bei Google zusaetzlich anonymisierte Suchanfragen
  const qClicks = queries.reduce((s, q) => s + q.clicks, 0);
  const qImpr = queries.reduce((s, q) => s + q.impressions, 0);
  const posW = queries.reduce((s, q) => s + q.position * q.impressions, 0);
  const clicks = Math.round(qClicks * 1.18);
  const impressions = Math.round(qImpr * 1.25);
  return {
    totals: {
      clicks,
      impressions,
      ctr: impressions ? clicks / impressions : 0,
      position: qImpr ? (posW / qImpr) * 1.04 : 0,
    },
    queries,
    pages,
  };
}

export function generateDemoPagespeed(after: boolean): PageSpeedResult[] {
  const base = after ? { m: 74, d: 93, lcp: 2900, inp: 180, cls: 0.06 } : { m: 41, d: 72, lcp: 5200, inp: 340, cls: 0.21 };
  return DEMO_CONFIG.pagespeedUrls.flatMap((url, i) => [
    {
      url,
      strategy: 'mobile' as const,
      score: base.m - i * 4,
      lcpMs: base.lcp + i * 300,
      inpMs: i === 2 ? null : base.inp + i * 20,
      cls: base.cls,
      source: i === 2 ? ('lab' as const) : ('field' as const),
    },
    {
      url,
      strategy: 'desktop' as const,
      score: base.d - i * 2,
      lcpMs: Math.round(base.lcp * 0.45),
      inpMs: i === 2 ? null : Math.round(base.inp * 0.5),
      cls: base.cls / 2,
      source: i === 2 ? ('lab' as const) : ('field' as const),
    },
  ]);
}

export interface DemoActivity {
  monthOffset: number;
  day: number;
  area: string;
  change: string;
  benefit?: string;
  scope?: string;
  status: SeoActivityStatus;
}

/** monthOffset 0 = letzter abgeschlossener Monat, -1 = davor usw. */
export const DEMO_ACTIVITIES: DemoActivity[] = [
  { monthOffset: -3, day: 4, area: 'Übernahme', change: 'Zugänge des alten Dienstleisters entfernt und alle Passwörter geändert', benefit: 'Niemand Fremdes hat mehr Zugriff auf Ihre Website.', status: 'done' },
  { monthOffset: -3, day: 5, area: 'Übernahme', change: 'Komplette Sicherung der Website erstellt', benefit: 'Alles lässt sich jederzeit wiederherstellen.', status: 'done' },
  { monthOffset: -3, day: 12, area: 'Technik', change: 'Weiterleitungen bereinigt: www auf ohne www, 301 statt 302', benefit: 'Google bündelt alle Signale auf einer Adresse.', status: 'done' },
  { monthOffset: -3, day: 18, area: 'Technik', change: 'Sitemap angelegt und in der Search Console eingereicht', benefit: 'Google findet neue Seiten schneller.', status: 'done' },
  { monthOffset: -2, day: 3, area: 'Ladezeit', change: 'Bilder komprimiert und ins WebP-Format umgewandelt', benefit: 'Die Startseite lädt auf dem Handy etwa 2 Sekunden schneller.', scope: '148 Bilder', status: 'done' },
  { monthOffset: -2, day: 9, area: 'Inhalte', change: 'Neue Seite „N47 Steuerkette“ mit Ursachen, Kosten und Ablauf', benefit: 'Erreicht Fahrer, die gezielt nach ihrem Motor suchen.', status: 'done' },
  { monthOffset: -2, day: 16, area: 'Inhalte', change: 'Neue Seite „OM651 Austauschmotor“', benefit: 'Zweite Motorcode-Seite, sehr kaufnahe Suchanfragen.', status: 'done' },
  { monthOffset: -2, day: 23, area: 'Google-Unternehmensprofil', change: 'Öffnungszeiten, Leistungen und 12 Fotos ergänzt', benefit: 'Mehr Sichtbarkeit in Google Maps.', status: 'done' },
  { monthOffset: -1, day: 2, area: 'Inhalte', change: 'Städteseite Bielefeld mit echtem Praxisbeispiel neu geschrieben', benefit: 'Die Seite ist jetzt einzigartig statt eine Kopie.', status: 'done' },
  { monthOffset: -1, day: 14, area: 'Technik', change: 'Strukturierte Daten (Firma, Adresse, Öffnungszeiten) eingebaut', benefit: 'Google versteht Ihr Unternehmen besser.', status: 'done' },
  { monthOffset: -1, day: 21, area: 'Geprüft', change: 'Kontaktformular getestet', benefit: 'Anfragen kommen zuverlässig an.', status: 'checked' },
  { monthOffset: 0, day: 6, area: 'Inhalte', change: 'Ratgeber „Motorschaden: was jetzt zu tun ist“ veröffentlicht', benefit: 'Fängt Suchende ab, die gerade eine Panne haben.', status: 'done' },
  { monthOffset: 0, day: 13, area: 'Inhalte', change: 'Meta-Beschreibungen für 12 Seiten neu geschrieben', benefit: 'Mehr Klicks aus den Suchergebnissen.', scope: '12 Seiten', status: 'done' },
  { monthOffset: 0, day: 20, area: 'Technik', change: 'Schriftarten lokal eingebunden', benefit: 'Schneller und datenschutzfreundlich.', status: 'done' },
  { monthOffset: 0, day: 27, area: 'Inhalte', change: 'Städteseiten Hamburg und Köln vorbereitet', benefit: 'Gehen online, sobald die Praxisbeispiele da sind.', status: 'prepared' },
  { monthOffset: 0, day: 28, area: 'Inhalte', change: 'Seiten für weitere Motorcodes (EA189, N57)', status: 'planned' },
  { monthOffset: 0, day: 28, area: 'Bewertungen', change: 'Bewertungs-Karte für zufriedene Kunden einführen', status: 'planned' },
];

/** Zwei Ladezeit-Pruefungen (vorher/nachher), damit der Vergleich sichtbar wird. */
export function demoChecks(last: SeoMonth) {
  const before = addMonths(last, -3);
  const url = 'https://muster-motoren.de/';
  const report = { label: 'Bericht bei Google ansehen', url: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}` };
  return [
    {
      date: `${before}-03`,
      kind: 'ladezeit' as const,
      title: 'Ladezeit der Startseite',
      summary: 'Die Startseite braucht auf dem Handy über 5 Sekunden, bis das Wichtigste zu sehen ist. Viele Besucher springen vorher ab.',
      metrics: [
        { key: 'start_mobil_score', label: 'Bewertung Handy', value: 41, unit: 'von 100', better: 'higher' as const, explain: 'Bewertung von Google für die Ladezeit. Ab 90 ist sie grün.' },
        { key: 'start_mobil_lcp', label: 'Hauptinhalt sichtbar nach', value: 5.2, unit: 's', better: 'lower' as const, explain: 'Gut sind unter 2,5 Sekunden.' },
      ],
      findings: [
        { status: 'fail' as const, text: 'Die Bilder sind sehr groß und nicht komprimiert.' },
        { status: 'warn' as const, text: 'Schriften werden von einem fremden Server geladen.' },
      ],
      links: [report],
    },
    {
      date: `${last}-20`,
      kind: 'ladezeit' as const,
      title: 'Ladezeit der Startseite',
      summary: 'Nach dem Komprimieren der Bilder lädt die Startseite auf dem Handy fast doppelt so schnell. Das Ziel grün ist in Reichweite.',
      metrics: [
        { key: 'start_mobil_score', label: 'Bewertung Handy', value: 74, unit: 'von 100', better: 'higher' as const, explain: 'Bewertung von Google für die Ladezeit. Ab 90 ist sie grün.' },
        { key: 'start_mobil_lcp', label: 'Hauptinhalt sichtbar nach', value: 2.9, unit: 's', better: 'lower' as const, explain: 'Gut sind unter 2,5 Sekunden.' },
      ],
      findings: [
        { status: 'ok' as const, text: 'Bilder sind komprimiert und im modernen WebP-Format.', url },
        { status: 'ok' as const, text: 'Schriften liegen jetzt auf dem eigenen Server.' },
        { status: 'warn' as const, text: 'Das Kontaktformular lädt ein Skript von Google, das die Seite etwas bremst.' },
      ],
      links: [report, { label: 'Startseite ansehen', url }],
    },
  ];
}
