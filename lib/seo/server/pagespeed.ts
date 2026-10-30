import 'server-only';
import type { PageSpeedResult, PageSpeedStrategy } from '../types';

/**
 * PageSpeed Insights API v5. Liefert Labor-Werte (Lighthouse) und, wenn
 * Google genug echte Besuche hat, Felddaten aus dem Chrome UX Report.
 * INP gibt es nur als Felddaten. Fehlen sie, bleibt der Wert leer, statt
 * einen Laborwert als INP auszugeben.
 */

const ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const TIMEOUT_MS = 90_000;

interface PsiResponse {
  loadingExperience?: {
    metrics?: Record<string, { percentile?: number }>;
  };
  lighthouseResult?: {
    categories?: { performance?: { score?: number | null } };
    audits?: Record<string, { numericValue?: number }>;
  };
  error?: { message?: string };
}

async function measureOne(url: string, strategy: PageSpeedStrategy): Promise<PageSpeedResult> {
  const key = process.env.PAGESPEED_API_KEY;
  const params = new URLSearchParams({ url, strategy, category: 'performance', locale: 'de' });
  if (key) params.set('key', key);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${ENDPOINT}?${params}`, { signal: ctrl.signal, cache: 'no-store' });
    const body = (await res.json()) as PsiResponse;
    if (!res.ok) throw new Error(body.error?.message ?? `HTTP ${res.status}`);

    const field = body.loadingExperience?.metrics ?? {};
    const audits = body.lighthouseResult?.audits ?? {};
    const fieldLcp = field.LARGEST_CONTENTFUL_PAINT_MS?.percentile;
    const fieldInp = field.INTERACTION_TO_NEXT_PAINT?.percentile;
    const fieldCls = field.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile;
    const score = body.lighthouseResult?.categories?.performance?.score;

    const lcpMs = fieldLcp ?? audits['largest-contentful-paint']?.numericValue ?? null;
    // CrUX liefert CLS mal 100 als Ganzzahl.
    const cls =
      fieldCls !== undefined ? fieldCls / 100 : (audits['cumulative-layout-shift']?.numericValue ?? null);
    const hasField = fieldLcp !== undefined || fieldInp !== undefined || fieldCls !== undefined;
    const allField = fieldLcp !== undefined && fieldCls !== undefined;

    return {
      url,
      strategy,
      score: typeof score === 'number' ? Math.round(score * 100) : null,
      lcpMs: lcpMs !== null ? Math.round(lcpMs) : null,
      inpMs: fieldInp ?? null,
      cls: cls !== null ? Math.round(cls * 1000) / 1000 : null,
      source: allField ? 'field' : hasField ? 'mixed' : 'lab',
    };
  } catch (err) {
    const e = err as Error;
    return {
      url,
      strategy,
      score: null,
      lcpMs: null,
      inpMs: null,
      cls: null,
      source: 'lab',
      error: e.name === 'AbortError' ? 'Zeitüberschreitung bei der Messung' : e.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Misst alle URLs mobil und Desktop, hoechstens 4 Messungen gleichzeitig. */
export async function measurePagespeed(urls: string[]): Promise<PageSpeedResult[]> {
  const jobs: Array<[string, PageSpeedStrategy]> = [];
  for (const u of urls) {
    jobs.push([u, 'mobile'], [u, 'desktop']);
  }
  const results: PageSpeedResult[] = new Array(jobs.length);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const i = next++;
      results[i] = await measureOne(jobs[i][0], jobs[i][1]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, jobs.length) }, worker));
  return results;
}
