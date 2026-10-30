import 'server-only';
import { generateDemoMonth, generateDemoPagespeed } from '../demo-data';
import { formatMonthDE, lastCompleteMonth, monthRange } from '../months';
import type { PageSpeedResult, SeoClient, SeoMonth } from '../types';
import { fetchGscMonth } from './gsc';
import { measurePagespeed } from './pagespeed';
import { markFetch, saveMonth, savePagespeed } from './store';

export interface FetchSummary {
  month: SeoMonth;
  clicks: number;
  impressions: number;
  queries: number;
  pages: number;
}

/** Ruft einen Monat aus der Search Console ab (beim Demo-Kunden: erzeugt ihn) und speichert ihn. */
export async function fetchMonth(client: SeoClient, month: SeoMonth): Promise<FetchSummary> {
  if (month > lastCompleteMonth()) {
    throw new Error(`${formatMonthDE(month)} ist noch nicht abgeschlossen.`);
  }
  try {
    let data;
    if (client.demo) {
      data = generateDemoMonth(month);
    } else {
      if (!client.gscProperty) throw new Error('Keine Search-Console-Property hinterlegt.');
      const { start, end } = monthRange(month);
      data = await fetchGscMonth(client.gscProperty, start, end);
    }
    await saveMonth(client.customerId, month, data, client.demo ? 'demo' : 'gsc');
    await markFetch(client.customerId, { month, error: null });
    return {
      month,
      clicks: data.totals.clicks,
      impressions: data.totals.impressions,
      queries: data.queries.length,
      pages: data.pages.length,
    };
  } catch (err) {
    await markFetch(client.customerId, { error: (err as Error).message });
    throw err;
  }
}

/** PageSpeed-Messung, wird dem angegebenen Monat zugeordnet. */
export async function measureMonth(client: SeoClient, month: SeoMonth): Promise<PageSpeedResult[]> {
  const urls = (client.pagespeedUrls ?? []).filter(Boolean).slice(0, 5);
  const results = client.demo ? generateDemoPagespeed(true) : urls.length ? await measurePagespeed(urls) : [];
  if (results.length) await savePagespeed(client.customerId, month, results);
  return results;
}
