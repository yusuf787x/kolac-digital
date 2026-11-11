import 'server-only';
import type { PageSpeedData, RankedKeyword, RankingData } from './types';

/**
 * Externe Datenquellen des SEO-Checks.
 *
 * Platzierungen: DataForSEO Labs "ranked_keywords" (Google Deutschland,
 * Sprache Deutsch). Zugang ueber DATAFORSEO_LOGIN und DATAFORSEO_PASSWORD
 * (app.dataforseo.com/api-access). Kosten ca. 2 Cent pro Check.
 *
 * Ladezeit: Google PageSpeed Insights, mobil. PAGESPEED_API_KEY ist
 * optional, ohne Schluessel teilt man sich ein kleines Kontingent.
 */

const EMPTY_RANKINGS: RankingData = {
  available: false,
  total: 0,
  top3: 0,
  top10: 0,
  top20: 0,
  estTraffic: 0,
  top: [],
  potentials: [],
};

export function rankingsConfigured(): boolean {
  return !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}

interface DfsItem {
  keyword_data?: { keyword?: string; keyword_info?: { search_volume?: number | null } };
  ranked_serp_element?: { serp_item?: { rank_group?: number; url?: string; relative_url?: string } };
}

interface DfsOrganicMetrics {
  pos_1?: number;
  pos_2_3?: number;
  pos_4_10?: number;
  pos_11_20?: number;
  etv?: number;
  count?: number;
}

export async function fetchRankings(domain: string): Promise<RankingData> {
  if (!rankingsConfigured()) return { ...EMPTY_RANKINGS, error: 'not-configured' };
  const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        {
          target: domain,
          location_code: 2276,
          language_code: 'de',
          item_types: ['organic'],
          limit: 100,
          order_by: ['keyword_data.keyword_info.search_volume,desc'],
        },
      ]),
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => null)) as {
      status_code?: number;
      status_message?: string;
      tasks?: { status_code?: number; status_message?: string; result?: { total_count?: number; metrics?: { organic?: DfsOrganicMetrics }; items?: DfsItem[] | null }[] | null }[];
    } | null;
    const task = json?.tasks?.[0];
    if (!res.ok || !json || json.status_code !== 20000 || !task || task.status_code !== 20000) {
      const msg = task?.status_message ?? json?.status_message ?? `HTTP ${res.status}`;
      console.error('DataForSEO ranked_keywords:', msg);
      return { ...EMPTY_RANKINGS, error: msg };
    }
    const result = task.result?.[0];
    const m = result?.metrics?.organic ?? {};
    const items: RankedKeyword[] = (result?.items ?? [])
      .map((it) => ({
        keyword: it.keyword_data?.keyword ?? '',
        position: it.ranked_serp_element?.serp_item?.rank_group ?? 0,
        volume: it.keyword_data?.keyword_info?.search_volume ?? null,
        url: it.ranked_serp_element?.serp_item?.url ?? it.ranked_serp_element?.serp_item?.relative_url,
      }))
      .filter((k) => k.keyword && k.position > 0);

    const top3 = (m.pos_1 ?? 0) + (m.pos_2_3 ?? 0);
    const top10 = top3 + (m.pos_4_10 ?? 0);
    const top = [...items]
      .sort((a, b) => a.position - b.position || (b.volume ?? 0) - (a.volume ?? 0))
      .slice(0, 10);
    const potentials = items
      .filter((k) => k.position >= 4 && k.position <= 20 && (k.volume ?? 0) > 0)
      .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
      .slice(0, 10);

    return {
      available: true,
      total: result?.total_count ?? m.count ?? items.length,
      top3,
      top10,
      top20: top10 + (m.pos_11_20 ?? 0),
      estTraffic: Math.round(m.etv ?? 0),
      top,
      potentials,
    };
  } catch (err) {
    console.error('DataForSEO Fehler:', err);
    return { ...EMPTY_RANKINGS, error: err instanceof Error ? err.message : 'Fehler' };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPageSpeed(url: string): Promise<PageSpeedData> {
  const params = new URLSearchParams({ url, strategy: 'mobile', category: 'performance', locale: 'de' });
  if (process.env.PAGESPEED_API_KEY) params.set('key', process.env.PAGESPEED_API_KEY);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('PageSpeed HTTP', res.status);
      return { available: false };
    }
    const json = (await res.json()) as {
      lighthouseResult?: {
        categories?: { performance?: { score?: number | null } };
        audits?: Record<string, { numericValue?: number }>;
      };
    };
    const lh = json.lighthouseResult;
    const score = lh?.categories?.performance?.score;
    if (typeof score !== 'number') return { available: false };
    const audits = lh?.audits ?? {};
    const lcp = audits['largest-contentful-paint']?.numericValue;
    return {
      available: true,
      score: Math.round(score * 100),
      lcpSeconds: typeof lcp === 'number' ? Math.round(lcp / 100) / 10 : undefined,
      cls: audits['cumulative-layout-shift']?.numericValue,
      tbtMs: audits['total-blocking-time']?.numericValue,
    };
  } catch (err) {
    console.error('PageSpeed Fehler:', err);
    return { available: false };
  } finally {
    clearTimeout(timer);
  }
}
