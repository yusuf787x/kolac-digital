import 'server-only';
import { generateDemoMonth, generateDemoPagespeed } from '../demo-data';
import { formatMonthDE, lastCompleteMonth, monthRange } from '../months';
import type { PageSpeedResult, SeoClient, SeoMonth } from '../types';
import { fetchGscMonth } from './gsc';
import { measurePagespeed } from './pagespeed';
import { deleteEmptyMonths, deleteMonth, markFetch, saveMonth, savePagespeed } from './store';

export interface FetchSummary {
  month: SeoMonth;
  /** Google hat fuer den Monat keine Zahlen (Search Console noch nicht eingerichtet, Seite neu). Nichts gespeichert. */
  empty: boolean;
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
  if (client.dataStart && month < client.dataStart) {
    await deleteMonth(client.customerId, month);
    return { month, empty: true, clicks: 0, impressions: 0, queries: 0, pages: 0 };
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
    const empty = !data.totals.impressions && !data.totals.clicks && data.queries.length === 0;
    if (empty) {
      // Leere Monate nicht anlegen, einen frueher gespeicherten leeren Monat entfernen
      await deleteMonth(client.customerId, month);
      await markFetch(client.customerId, { error: null });
      return { month, empty: true, clicks: 0, impressions: 0, queries: 0, pages: 0 };
    }
    await saveMonth(client.customerId, month, data, client.demo ? 'demo' : 'gsc');
    await markFetch(client.customerId, { month, error: null });
    await deleteEmptyMonths(client.customerId, client.dataStart);
    return {
      month,
      empty: false,
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
