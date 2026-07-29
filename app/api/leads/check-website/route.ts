import { NextResponse } from 'next/server';

/**
 * Website-Alter-Auto-Check. POST { url } → analysiert die Seite und
 * gibt Signals zurueck, aus denen der Client die Kategorie
 * `keine | veraltet | modern | unbekannt` ableiten kann.
 *
 * Heuristik (best-effort, kein SLA):
 * - Copyright-Jahr im HTML (letztes Vorkommen von © YYYY)
 * - <meta name="generator">
 * - viewport-Meta-Tag (mobile-friendly)
 * - HTTPS
 * - modernes CSS (grid/flex im ersten Style)
 *
 * Auth: kein extra Login-Check (nur eingeloggte Dashboard-User rufen
 * das an; Firestore-Rules blockieren fremde Zugriffe). Die Route ist
 * nicht rate-limited — nicht fuer den Public-Traffic gedacht.
 */

interface CheckResult {
  reachable: boolean;
  hasHttps: boolean;
  lastCopyrightYear?: number;
  generator?: string;
  hasViewportMeta?: boolean;
  usesModernLayout?: boolean;
  suggestedAge: 'keine' | 'veraltet' | 'modern' | 'unbekannt';
  notes: string;
}

function normalizeUrl(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { url?: string };
  const url = normalizeUrl(body.url ?? '');
  if (!url) {
    return NextResponse.json(
      { reachable: false, suggestedAge: 'keine', notes: 'Keine URL uebergeben.' },
      { status: 200 },
    );
  }

  // Timeout: max 8s pro Site, sonst als "nicht erreichbar" markieren.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; KolacDigitalLeadBot/1.0; +https://kolac-digital.de)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json({
        reachable: false,
        hasHttps: url.startsWith('https://'),
        suggestedAge: 'unbekannt',
        notes: `HTTP ${res.status}`,
      } satisfies CheckResult);
    }

    const html = (await res.text()).slice(0, 400_000); // Cap 400KB
    const result = analyzeHtml(html, res.url);
    return NextResponse.json(result satisfies CheckResult);
  } catch (err) {
    clearTimeout(timer);
    return NextResponse.json({
      reachable: false,
      hasHttps: url.startsWith('https://'),
      suggestedAge: 'unbekannt',
      notes:
        err instanceof Error
          ? err.name === 'AbortError'
            ? 'Timeout (>8s)'
            : err.message
          : 'Unbekannter Fehler',
    } satisfies CheckResult);
  }
}

function analyzeHtml(html: string, finalUrl: string): CheckResult {
  const notes: string[] = [];

  // Copyright-Jahr: letztes Vorkommen von "© YYYY" oder "Copyright YYYY"
  const yearMatches = Array.from(
    html.matchAll(
      /(?:©|&copy;|\bcopyright\b)[^\d]{0,20}(\d{4})(?!\d)/gi,
    ),
  );
  const years = yearMatches
    .map((m) => parseInt(m[1], 10))
    .filter((y) => y >= 2000 && y <= new Date().getFullYear() + 1);
  const lastCopyrightYear =
    years.length > 0 ? Math.max(...years) : undefined;

  // Generator-Meta
  const genMatch = html.match(
    /<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i,
  );
  const generator = genMatch ? genMatch[1].trim() : undefined;

  // Viewport-Meta (mobile-freundlich)
  const hasViewportMeta =
    /<meta[^>]+name=["']viewport["'][^>]+content=/i.test(html);

  // Modernes CSS (Grid/Flex)
  const usesModernLayout =
    /display\s*:\s*(?:grid|flex)/i.test(html) ||
    /\.grid\b|\.flex\b/i.test(html);

  const hasHttps = finalUrl.startsWith('https://');

  // Klassifizierung
  const now = new Date().getFullYear();
  let suggestedAge: CheckResult['suggestedAge'] = 'unbekannt';

  if (lastCopyrightYear !== undefined) {
    const delta = now - lastCopyrightYear;
    if (delta <= 1) suggestedAge = 'modern';
    else if (delta >= 3) suggestedAge = 'veraltet';
    else if (!hasViewportMeta) suggestedAge = 'veraltet';
    else suggestedAge = 'unbekannt';
    notes.push(`Copyright ${lastCopyrightYear} (${delta}J alt)`);
  } else {
    // Kein Copyright-Jahr gefunden. Sekundaersignale:
    if (!hasViewportMeta) {
      suggestedAge = 'veraltet';
      notes.push('kein viewport-Meta (nicht mobil-optimiert)');
    } else if (usesModernLayout && hasHttps) {
      suggestedAge = 'modern';
      notes.push('grid/flex + https');
    }
  }

  if (generator) {
    // Wix, Weebly, Jimdo → oft alt / gebastelt
    if (/wix|weebly|jimdo/i.test(generator)) notes.push(`generator: ${generator}`);
  }
  if (!hasHttps) notes.push('kein HTTPS');

  return {
    reachable: true,
    hasHttps,
    lastCopyrightYear,
    generator,
    hasViewportMeta,
    usesModernLayout,
    suggestedAge,
    notes: notes.join(' · '),
  };
}
