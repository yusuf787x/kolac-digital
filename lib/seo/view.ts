import {
  buildKeywordRows,
  compileGroups,
  countBuckets,
  findOpportunities,
  makeBrandMatcher,
  pickMovers,
  sumGroups,
  sumRows,
  UNGROUPED_ID,
  type KeywordRow,
  type Movers,
  type Opportunity,
  type PositionBuckets,
} from './analysis';
import { addMonths, prevMonth, sameMonthLastYear } from './months';
import type {
  PageSpeedResult,
  SeoActivity,
  SeoActivityStatus,
  SeoClient,
  SeoMetrics,
  SeoMonth,
  SeoReportStatus,
  SeoRow,
} from './types';

/**
 * Serialisierbares Ansichtsmodell fuer Portal, Admin-Vorschau und PDF.
 * buildPortalData ist rein: der Server laedt die Rohdaten, diese Funktion
 * rechnet. Dadurch sehen Kunde, Vorschau und PDF garantiert dasselbe.
 */

export const HISTORY_MONTHS = 16;
const KEYWORD_LIMIT = 1000;
const PAGE_LIMIT = 50;

export interface PortalActivity {
  id: string;
  date: string;
  month: SeoMonth;
  area: string;
  change: string;
  benefit?: string;
  scope?: string;
  status: SeoActivityStatus;
}

export interface HistoryPoint extends SeoMetrics {
  month: SeoMonth;
  buckets: PositionBuckets | null;
}

export interface GroupHistory {
  id: string;
  name: string;
  months: Array<{ month: SeoMonth; clicks: number; impressions: number }>;
}

export interface PageRow extends SeoMetrics {
  page: string;
  prevClicks: number | null;
}

export interface PortalReportInfo {
  month: SeoMonth;
  status: SeoReportStatus;
  assessment: string;
  releasedAt: number | null;
  hasPdf: boolean;
}

export interface PortalData {
  client: {
    customerId: string;
    displayName: string;
    domain: string;
    brandTerms: string[];
    groups: Array<{ id: string; name: string }>;
    demo: boolean;
  };
  /** Angezeigter Monat, null wenn noch keine Zahlen sichtbar sind. */
  month: SeoMonth | null;
  /** Waehlbare Monate, neuester zuerst. */
  months: SeoMonth[];
  report: PortalReportInfo | null;
  kpis: {
    current: SeoMetrics;
    prevMonth: SeoMetrics | null;
    prevYear: SeoMetrics | null;
    brand: SeoMetrics;
    nonBrand: SeoMetrics;
    brandPrev: SeoMetrics | null;
    nonBrandPrev: SeoMetrics | null;
  } | null;
  history: HistoryPoint[];
  keywords: KeywordRow[];
  keywordTotal: number;
  movers: Movers;
  opportunities: Opportunity[];
  groupHistory: GroupHistory[];
  pages: PageRow[];
  pagespeed: { month: SeoMonth; results: PageSpeedResult[] } | null;
  activitiesThisMonth: PortalActivity[];
  planned: PortalActivity[];
  /** Freigegebene Berichte, neuester zuerst. */
  reports: Array<{ month: SeoMonth; releasedAt: number | null; hasPdf: boolean }>;
}

export interface MonthInput {
  month: SeoMonth;
  totals: SeoMetrics;
  /** Nur fuer Monate geladen, deren Zeilen gebraucht werden. */
  queries?: SeoRow[];
  pages?: SeoRow[];
}

export interface ReportInput {
  month: SeoMonth;
  status: SeoReportStatus;
  assessment: string;
  releasedAt: number | null;
  hasPdf: boolean;
}

export interface BuildInput {
  client: Pick<
    SeoClient,
    'customerId' | 'displayName' | 'domain' | 'brandTerms' | 'keywordGroups' | 'demo'
  >;
  months: MonthInput[];
  requestedMonth: SeoMonth | null;
  /** Admin-Vorschau sieht auch nicht freigegebene Monate. */
  includeUnreleased: boolean;
  reports: ReportInput[];
  pagespeed: Array<{ month: SeoMonth; results: PageSpeedResult[] }>;
  activities: Array<Pick<SeoActivity, 'id' | 'date' | 'month' | 'area' | 'change' | 'benefit' | 'scope' | 'status' | 'published'>>;
}

export function toPortalActivity(a: BuildInput['activities'][number]): PortalActivity {
  return {
    id: a.id,
    date: a.date,
    month: a.month,
    area: a.area,
    change: a.change,
    benefit: a.benefit || undefined,
    scope: a.scope || undefined,
    status: a.status,
  };
}

/**
 * Welche Monate darf der Kunde sehen? Alle Monate mit Daten bis
 * einschliesslich des neuesten freigegebenen Berichts. Aeltere Monate aus
 * dem Backfill haben keinen eigenen Bericht und sind trotzdem sichtbar.
 */
export function visibleMonths(
  dataMonths: SeoMonth[],
  reports: ReportInput[],
  includeUnreleased: boolean,
): SeoMonth[] {
  const sorted = [...dataMonths].sort().reverse();
  if (includeUnreleased) return sorted;
  const released = reports.filter((r) => r.status === 'released').map((r) => r.month).sort();
  const latest = released[released.length - 1];
  if (!latest) return [];
  return sorted.filter((m) => m <= latest);
}

export function buildPortalData(input: BuildInput): PortalData {
  const { client } = input;
  const byMonth = new Map(input.months.map((m) => [m.month, m]));
  const months = visibleMonths([...byMonth.keys()], input.reports, input.includeUnreleased);
  const month =
    input.requestedMonth && months.includes(input.requestedMonth)
      ? input.requestedMonth
      : (months[0] ?? null);

  const isBrand = makeBrandMatcher(client.brandTerms ?? []);
  const groups = compileGroups(client.keywordGroups ?? []);

  // Auch in der Admin-Vorschau nur Veroeffentlichtes: sie soll zeigen, was der Kunde sieht.
  const published = input.activities.filter((a) => a.published);
  const planned = published
    .filter((a) => a.status === 'planned')
    .map(toPortalActivity)
    .sort((a, b) => a.area.localeCompare(b.area, 'de'));

  const releasedReports = input.reports
    .filter((r) => r.status === 'released')
    .sort((a, b) => b.month.localeCompare(a.month))
    .map((r) => ({ month: r.month, releasedAt: r.releasedAt, hasPdf: r.hasPdf }));

  const base: PortalData = {
    client: {
      customerId: client.customerId,
      displayName: client.displayName,
      domain: client.domain,
      brandTerms: client.brandTerms ?? [],
      groups: [...groups.map((g) => ({ id: g.id, name: g.name })), { id: UNGROUPED_ID, name: 'Ohne Gruppe' }],
      demo: client.demo === true,
    },
    month,
    months,
    report: null,
    kpis: null,
    history: [],
    keywords: [],
    keywordTotal: 0,
    movers: { positionWinners: [], positionLosers: [], clickWinners: [], clickLosers: [] },
    opportunities: [],
    groupHistory: [],
    pages: [],
    pagespeed: null,
    activitiesThisMonth: [],
    planned,
    reports: releasedReports,
  };

  if (!month) return base;

  const cur = byMonth.get(month)!;
  const prev = byMonth.get(prevMonth(month)) ?? null;
  const yoy = byMonth.get(sameMonthLastYear(month)) ?? null;
  const curQueries = cur.queries ?? [];
  const prevQueries = prev?.queries ?? null;

  const brandRows = curQueries.filter((r) => isBrand(r.key));
  const nonBrandRows = curQueries.filter((r) => !isBrand(r.key));
  const prevBrandRows = prevQueries?.filter((r) => isBrand(r.key)) ?? null;
  const prevNonBrandRows = prevQueries?.filter((r) => !isBrand(r.key)) ?? null;

  const kwAll = buildKeywordRows(curQueries, prevQueries, isBrand, groups);
  const keywords = [...kwAll]
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, KEYWORD_LIMIT);

  // Verlauf: bis zu 16 Monate bis einschliesslich des gewaehlten Monats
  const history: HistoryPoint[] = [];
  const groupAcc = new Map<string, GroupHistory>();
  for (const g of base.client.groups) groupAcc.set(g.id, { id: g.id, name: g.name, months: [] });
  for (let i = HISTORY_MONTHS - 1; i >= 0; i--) {
    const m = addMonths(month, -i);
    const d = byMonth.get(m);
    if (!d) continue;
    history.push({
      month: m,
      ...d.totals,
      buckets: d.queries ? countBuckets(d.queries) : null,
    });
    if (d.queries) {
      const sums = sumGroups(d.queries, groups);
      for (const [id, s] of Object.entries(sums)) {
        groupAcc.get(id)?.months.push({ month: m, ...s });
      }
    }
  }

  const prevPages = new Map((prev?.pages ?? []).map((p) => [p.key, p.clicks]));
  const pages: PageRow[] = [...(cur.pages ?? [])]
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, PAGE_LIMIT)
    .map((p) => ({
      page: p.key,
      clicks: p.clicks,
      impressions: p.impressions,
      ctr: p.ctr,
      position: p.position,
      prevClicks: prev?.pages ? (prevPages.get(p.key) ?? 0) : null,
    }));

  const ps = input.pagespeed
    .filter((p) => p.month <= month && p.results.length > 0)
    .sort((a, b) => b.month.localeCompare(a.month))[0];

  const report = input.reports.find((r) => r.month === month);

  return {
    ...base,
    report: report
      ? {
          month: report.month,
          status: report.status,
          assessment: report.assessment,
          releasedAt: report.releasedAt,
          hasPdf: report.hasPdf,
        }
      : null,
    kpis: {
      current: cur.totals,
      prevMonth: prev?.totals ?? null,
      prevYear: yoy?.totals ?? null,
      brand: sumRows(brandRows),
      nonBrand: sumRows(nonBrandRows),
      brandPrev: prevBrandRows ? sumRows(prevBrandRows) : null,
      nonBrandPrev: prevNonBrandRows ? sumRows(prevNonBrandRows) : null,
    },
    history,
    keywords,
    keywordTotal: kwAll.length,
    movers: pickMovers(kwAll, prevQueries),
    opportunities: findOpportunities(kwAll),
    groupHistory: [...groupAcc.values()].filter((g) =>
      g.months.some((m) => m.impressions > 0),
    ),
    pages,
    pagespeed: ps ? { month: ps.month, results: ps.results } : null,
    activitiesThisMonth: published
      .filter((a) => a.month === month && a.status !== 'planned')
      .map(toPortalActivity)
      .sort((a, b) => b.date.localeCompare(a.date)),
  };
}

// ---------------------------------------------------------------------------
// Ampel fuer Ladezeit (Grenzwerte von Google fuer Core Web Vitals)
// ---------------------------------------------------------------------------

export type Rating = 'good' | 'needs-improvement' | 'poor' | 'unknown';

export function rateScore(score: number | null): Rating {
  if (score === null) return 'unknown';
  if (score >= 90) return 'good';
  if (score >= 50) return 'needs-improvement';
  return 'poor';
}
export function rateLcp(ms: number | null): Rating {
  if (ms === null) return 'unknown';
  return ms <= 2500 ? 'good' : ms <= 4000 ? 'needs-improvement' : 'poor';
}
export function rateInp(ms: number | null): Rating {
  if (ms === null) return 'unknown';
  return ms <= 200 ? 'good' : ms <= 500 ? 'needs-improvement' : 'poor';
}
export function rateCls(v: number | null): Rating {
  if (v === null) return 'unknown';
  return v <= 0.1 ? 'good' : v <= 0.25 ? 'needs-improvement' : 'poor';
}

export const RATING_LABELS: Record<Rating, string> = {
  good: 'Gut',
  'needs-improvement': 'Mittel',
  poor: 'Langsam',
  unknown: 'Keine Daten',
};

// ---------------------------------------------------------------------------
// Formatierung (deutsch)
// ---------------------------------------------------------------------------

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('de-DE');
}
export function fmtPct(ratio: number, digits = 1): string {
  return `${(ratio * 100).toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`;
}
export function fmtPos(p: number): string {
  return p.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
/** "+12 %" bzw. "-4 %" ohne Gedankenstrich. */
export function fmtSignedPct(ratio: number | null): string {
  if (ratio === null) return 'neu';
  const v = Math.round(ratio * 100);
  return `${v > 0 ? '+' : ''}${v.toLocaleString('de-DE')} %`;
}
export function fmtSeconds(ms: number | null): string {
  if (ms === null) return 'keine Daten';
  return `${(ms / 1000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
}
export function fmtCls(v: number | null): string {
  if (v === null) return 'keine Daten';
  return v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
/** URL ohne Protokoll und Domain fuer schmale Tabellen. */
export function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === '/' ? 'Startseite' : decodeURIComponent(u.pathname);
  } catch {
    return url;
  }
}
