import 'server-only';
import { site } from './site-config';

/**
 * IndexNow meldet neue oder geaenderte URLs sofort an Bing, Yandex,
 * Seznam und Naver. Bing ist die Grundlage fuer die Websuche in
 * ChatGPT und Copilot, deshalb zaehlt das fuer die Sichtbarkeit in
 * KI-Antworten. Google nimmt an IndexNow nicht teil und liest die
 * Sitemap.
 *
 * Der Schluessel ist absichtlich oeffentlich. Er liegt als Datei in
 * public/ und beweist nur, dass die Meldung von dieser Domain kommt.
 */
export const INDEXNOW_KEY = '695c1e46584e5f5e472adff9ae40fa97';

export interface IndexNowResult {
  gemeldet: number;
  status: number | null;
  hinweis?: string;
}

export async function submitToIndexNow(
  urls: string[],
): Promise<IndexNowResult> {
  // Nur die Live-Seite meldet. Lokal und in Vorschau-Deployments
  // wuerde sonst eine fremde Adresse gemeldet oder der Schluessel
  // waere nicht erreichbar.
  if (
    process.env.NODE_ENV !== 'production' ||
    (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production')
  ) {
    return { gemeldet: 0, status: null, hinweis: 'nicht produktiv' };
  }

  const urlList = Array.from(new Set(urls)).filter((u) =>
    u.startsWith(site.baseUrl),
  );
  if (urlList.length === 0) return { gemeldet: 0, status: null };

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: new URL(site.baseUrl).host,
        key: INDEXNOW_KEY,
        keyLocation: `${site.baseUrl}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
      signal: AbortSignal.timeout(5000),
    });
    return { gemeldet: urlList.length, status: res.status };
  } catch (err) {
    console.warn('IndexNow: Meldung fehlgeschlagen.', err);
    return { gemeldet: 0, status: null, hinweis: (err as Error).message };
  }
}
