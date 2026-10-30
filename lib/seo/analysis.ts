import type { KeywordGroup, SeoMetrics, SeoRow } from './types';

/**
 * Reine Auswertungs-Logik fuer den SEO-Bericht. Keine Firebase-Abhaengig-
 * keit, alles deterministisch und in lib/__tests__/seo-analysis.test.ts
 * abgedeckt. Die Regeln (Marke, Gruppen) werden beim Lesen angewendet,
 * damit eine geaenderte Konfiguration auch rueckwirkend fuer alle
 * gespeicherten Monate gilt.
 */

// ---------------------------------------------------------------------------
// Klickrate nach Position
// ---------------------------------------------------------------------------

/**
 * Erwartete organische Klickrate je Position 1 bis 20 (Index 0 = Platz 1).
 *
 * Gerundete Mittelwerte aus oeffentlichen CTR-Studien (Advanced Web
 * Ranking CTR Study, Sistrix-Klickraten-Auswertungen, Backlinko 2023),
 * Desktop und Mobil gemischt. Die echte Klickrate schwankt je nach
 * Suchergebnis stark (Anzeigen, Karte, KI-Antwort oben). Die Kurve dient
 * nur dazu, Chancen untereinander vergleichbar zu machen, nicht als
 * Prognose. Wer sie anpasst, aendert alle Klickpotenziale rueckwirkend.
 */
export const CTR_CURVE: readonly number[] = [
  0.28, // 1
  0.155, // 2
  0.1, // 3
  0.07, // 4
  0.053, // 5
  0.041, // 6
  0.032, // 7
  0.026, // 8
  0.022, // 9
  0.019, // 10
  0.012, // 11 (Seite 2 beginnt, deutlicher Abfall)
  0.011, // 12
  0.01, // 13
  0.009, // 14
  0.008, // 15
  0.007, // 16
  0.006, // 17
  0.006, // 18
  0.005, // 19
  0.005, // 20
];

/** Klickrate jenseits von Platz 20. */
const CTR_BEYOND = 0.003;

/** Zielposition fuer das Klickpotenzial. */
export const OPPORTUNITY_TARGET_POSITION = 3;
/** Chancen-Fenster: Durchschnittsposition 4 bis 15 (gerundet). */
export const OPPORTUNITY_MIN_POSITION = 3.5;
export const OPPORTUNITY_MAX_POSITION = 15.5;
/** Unter dieser Impressionen-Zahl ist eine Chance zu wackelig. */
export const OPPORTUNITY_MIN_IMPRESSIONS = 30;
/** Mindest-Impressionen in beiden Monaten fuer Gewinner/Verlierer nach Position. */
export const MOVER_MIN_IMPRESSIONS = 20;

/** Erwartete Klickrate fuer eine (Durchschnitts-)Position, linear interpoliert. */
export function expectedCtr(position: number): number {
  if (!Number.isFinite(position) || position <= 1) return CTR_CURVE[0];
  if (position > CTR_CURVE.length) return CTR_BEYOND;
  const lower = Math.floor(position);
  const frac = position - lower;
  const a = CTR_CURVE[lower - 1];
  const b = lower < CTR_CURVE.length ? CTR_CURVE[lower] : CTR_BEYOND;
  return a + (b - a) * frac;
}

/**
 * Zusaetzliche Klicks pro Monat, wenn das Keyword auf Platz 3 stuende:
 * erwartete Klicks auf Platz 3 minus heutige Klicks, nie negativ.
 */
export function clickPotential(row: Pick<SeoRow, 'impressions' | 'clicks'>): number {
  const target = row.impressions * expectedCtr(OPPORTUNITY_TARGET_POSITION);
  return Math.max(0, Math.round(target - row.clicks));
}

// ---------------------------------------------------------------------------
// Text-Normalisierung, Marke, Gruppen
// ---------------------------------------------------------------------------

/** Kleinschreibung, Umlaute ausgeschrieben, Mehrfach-Leerzeichen entfernt. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Wie normalizeText, aber ohne Leerzeichen, Bindestriche und Punkte. */
function compact(s: string): string {
  return normalizeText(s).replace(/[\s\-_.]/g, '');
}

/**
 * Marken-Erkennung. "Motoren Fachmann", "motorenfachmann.de" und
 * "Motorenfachmann Lage" zaehlen fuer den Begriff "motorenfachmann".
 * Tippfehler werden bewusst nicht geraten, Varianten pflegt man als
 * weitere Begriffe.
 */
export function makeBrandMatcher(terms: string[]): (query: string) => boolean {
  const needles = terms.map(compact).filter((t) => t.length >= 2);
  if (needles.length === 0) return () => false;
  return (query: string) => {
    const q = compact(query);
    return needles.some((n) => q.includes(n));
  };
}

export interface CompiledGroup {
  id: string;
  name: string;
  regexes: RegExp[];
}

/** Liefert eine Fehlermeldung oder null, wenn der Ausdruck gueltig ist. */
export function validatePattern(pattern: string): string | null {
  if (!pattern.trim()) return 'Leerer Ausdruck';
  try {
    new RegExp(pattern, 'i');
    return null;
  } catch (err) {
    return (err as Error).message;
  }
}

/** Ungueltige Ausdruecke werden still uebersprungen (Admin zeigt sie an). */
export function compileGroups(groups: KeywordGroup[]): CompiledGroup[] {
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    regexes: g.patterns
      .filter((p) => validatePattern(p) === null)
      .map((p) => new RegExp(p, 'i')),
  }));
}

/**
 * Gruppen eines Keywords. Getestet wird gegen den Originaltext und die
 * normalisierte Form, damit "muenchen" und "münchen" beide greifen. Ein
 * Keyword darf in mehreren Gruppen stehen.
 */
export function matchGroups(query: string, groups: CompiledGroup[]): string[] {
  const raw = query.toLowerCase();
  const norm = normalizeText(query);
  return groups
    .filter((g) => g.regexes.some((r) => r.test(raw) || r.test(norm)))
    .map((g) => g.id);
}

// ---------------------------------------------------------------------------
// Summen und Verteilungen
// ---------------------------------------------------------------------------

export const EMPTY_METRICS: SeoMetrics = {
  clicks: 0,
  impressions: 0,
  ctr: 0,
  position: 0,
};

/** Summe mehrerer Zeilen. Position nach Impressionen gewichtet. */
export function sumRows(rows: Pick<SeoRow, 'clicks' | 'impressions' | 'position'>[]): SeoMetrics {
  let clicks = 0;
  let impressions = 0;
  let posWeighted = 0;
  for (const r of rows) {
    clicks += r.clicks;
    impressions += r.impressions;
    posWeighted += r.position * r.impressions;
  }
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: impressions > 0 ? posWeighted / impressions : 0,
  };
}

export interface PositionBuckets {
  top3: number;
  top10: number;
  top20: number;
  rest: number;
}

export const BUCKET_LABELS: Record<keyof PositionBuckets, string> = {
  top3: 'Platz 1 bis 3',
  top10: 'Platz 4 bis 10',
  top20: 'Platz 11 bis 20',
  rest: 'Platz 21 und tiefer',
};

export function bucketOf(position: number): keyof PositionBuckets {
  if (position < 3.5) return 'top3';
  if (position < 10.5) return 'top10';
  if (position < 20.5) return 'top20';
  return 'rest';
}

/** Anzahl Keywords je Positionsbereich (jedes Keyword mit mind. 1 Impression). */
export function countBuckets(rows: Pick<SeoRow, 'position' | 'impressions'>[]): PositionBuckets {
  const b: PositionBuckets = { top3: 0, top10: 0, top20: 0, rest: 0 };
  for (const r of rows) {
    if (r.impressions < 1) continue;
    b[bucketOf(r.position)]++;
  }
  return b;
}

/** Relative Veraenderung, null wenn kein sinnvoller Vergleich moeglich. */
export function pctChange(current: number, previous: number | null | undefined): number | null {
  if (previous === null || previous === undefined || previous === 0) return null;
  return (current - previous) / previous;
}

// ---------------------------------------------------------------------------
// Keyword-Tabelle, Gewinner/Verlierer, Chancen
// ---------------------------------------------------------------------------

export interface KeywordRow extends SeoMetrics {
  query: string;
  prevClicks: number | null;
  prevPosition: number | null;
  isBrand: boolean;
  groups: string[];
}

export function buildKeywordRows(
  current: SeoRow[],
  previous: SeoRow[] | null,
  isBrand: (q: string) => boolean,
  groups: CompiledGroup[],
): KeywordRow[] {
  const prevMap = new Map<string, SeoRow>();
  for (const r of previous ?? []) prevMap.set(r.key, r);
  return current.map((r) => {
    const p = prevMap.get(r.key);
    return {
      query: r.key,
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
      prevClicks: previous ? (p?.clicks ?? 0) : null,
      prevPosition: p ? p.position : null,
      isBrand: isBrand(r.key),
      groups: matchGroups(r.key, groups),
    };
  });
}

export interface Movers {
  /** Groesste Positionsgewinne (Position gesunken = besser). */
  positionWinners: KeywordRow[];
  positionLosers: KeywordRow[];
  clickWinners: KeywordRow[];
  clickLosers: KeywordRow[];
}

export function pickMovers(
  rows: KeywordRow[],
  previous: SeoRow[] | null,
  limit = 10,
): Movers {
  if (!previous) {
    return { positionWinners: [], positionLosers: [], clickWinners: [], clickLosers: [] };
  }
  const prevImpr = new Map(previous.map((r) => [r.key, r.impressions]));

  const positional = rows.filter(
    (r) =>
      r.prevPosition !== null &&
      r.impressions >= MOVER_MIN_IMPRESSIONS &&
      (prevImpr.get(r.query) ?? 0) >= MOVER_MIN_IMPRESSIONS &&
      Math.abs(r.prevPosition - r.position) >= 1,
  );
  const gain = (r: KeywordRow) => (r.prevPosition as number) - r.position;

  const withClickDelta = rows.filter(
    (r) => r.prevClicks !== null && Math.abs(r.clicks - (r.prevClicks ?? 0)) >= 2,
  );
  const clickDelta = (r: KeywordRow) => r.clicks - (r.prevClicks ?? 0);

  // Keywords, die im aktuellen Monat ganz fehlen, tauchen in rows nicht
  // auf. Fuer Klick-Verlierer zaehlen sie trotzdem.
  const currentKeys = new Set(rows.map((r) => r.query));
  const vanished: KeywordRow[] = previous
    .filter((p) => !currentKeys.has(p.key) && p.clicks >= 2)
    .map((p) => ({
      query: p.key,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
      prevClicks: p.clicks,
      prevPosition: p.position,
      isBrand: false,
      groups: [],
    }));

  return {
    positionWinners: positional
      .filter((r) => gain(r) > 0)
      .sort((a, b) => gain(b) - gain(a))
      .slice(0, limit),
    positionLosers: positional
      .filter((r) => gain(r) < 0)
      .sort((a, b) => gain(a) - gain(b))
      .slice(0, limit),
    clickWinners: withClickDelta
      .filter((r) => clickDelta(r) > 0)
      .sort((a, b) => clickDelta(b) - clickDelta(a))
      .slice(0, limit),
    clickLosers: [...withClickDelta.filter((r) => clickDelta(r) < 0), ...vanished]
      .sort((a, b) => clickDelta(a) - clickDelta(b))
      .slice(0, limit),
  };
}

export interface Opportunity {
  query: string;
  position: number;
  impressions: number;
  clicks: number;
  potential: number;
}

/** Keywords auf Platz 4 bis 15 mit vielen Impressionen, nach Klickpotenzial sortiert. */
export function findOpportunities(rows: KeywordRow[], limit = 20): Opportunity[] {
  return rows
    .filter(
      (r) =>
        !r.isBrand &&
        r.position >= OPPORTUNITY_MIN_POSITION &&
        r.position < OPPORTUNITY_MAX_POSITION &&
        r.impressions >= OPPORTUNITY_MIN_IMPRESSIONS,
    )
    .map((r) => ({
      query: r.query,
      position: r.position,
      impressions: r.impressions,
      clicks: r.clicks,
      potential: clickPotential(r),
    }))
    .filter((o) => o.potential > 0)
    .sort((a, b) => b.potential - a.potential)
    .slice(0, limit);
}

export interface GroupSum {
  clicks: number;
  impressions: number;
}

export const UNGROUPED_ID = '_ohne';

/** Summen je Gruppe fuer einen Monat. Keywords ohne Gruppe landen in "_ohne". */
export function sumGroups(
  rows: SeoRow[],
  groups: CompiledGroup[],
): Record<string, GroupSum> {
  const out: Record<string, GroupSum> = {};
  for (const g of groups) out[g.id] = { clicks: 0, impressions: 0 };
  out[UNGROUPED_ID] = { clicks: 0, impressions: 0 };
  for (const r of rows) {
    const ids = matchGroups(r.key, groups);
    for (const id of ids.length ? ids : [UNGROUPED_ID]) {
      out[id].clicks += r.clicks;
      out[id].impressions += r.impressions;
    }
  }
  return out;
}
