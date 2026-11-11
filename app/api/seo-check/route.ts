import { NextResponse } from 'next/server';
import { CheckFailedError, normalizeInputUrl, redactResult, runSeoCheck } from '@/lib/seo-check/run';
import { checkLimits, clientIp, isOwnerRequest, recordUsage, saveCheck } from '@/lib/seo-check/store';
import type { SeoCheckResponse } from '@/lib/seo-check/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Oeffentlicher SEO-Check. POST { url } -> fuehrt den Check aus, speichert
 * ihn und gibt das Ergebnis zurueck. Besucher sehen die Loesungen erst nach
 * dem Freischalten (/api/seo-check/[id]/unlock), der Inhaber sofort.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { url?: string };
  const url = normalizeInputUrl(body.url ?? '');
  if (!url) {
    return NextResponse.json({ error: 'Bitte gib eine gültige Adresse ein, z. B. meinefirma.de.' }, { status: 400 });
  }

  const ip = clientIp(req);
  const owner = await isOwnerRequest(req);
  if (!owner) {
    try {
      const limit = await checkLimits(ip);
      if (!limit.ok) {
        return NextResponse.json(
          limit.reason === 'limit'
            ? {
                error: 'Du hast deinen kostenlosen Check bereits genutzt.',
                code: 'limit',
                lastCheckId: limit.lastCheckId,
              }
            : { error: 'Heute sind sehr viele Checks gelaufen. Bitte versuch es morgen noch einmal.', code: 'busy' },
          { status: 429 },
        );
      }
    } catch (err) {
      console.error('SEO-Check Limit:', err);
      return NextResponse.json({ error: 'Der Check ist gerade nicht verfügbar.' }, { status: 503 });
    }
  }

  try {
    const result = await runSeoCheck(url);
    // Ohne Google-Platzierungen waere die Punktzahl geschoent. Besucher
    // bekommen dann kein Ergebnis und behalten ihren Gratis-Check. Der
    // Inhaber sieht das Ergebnis trotzdem, mit dem technischen Grund.
    if (!result.rankings.available && !owner) {
      console.error('SEO-Check ohne Platzierungen:', result.rankings.error);
      return NextResponse.json(
        {
          error: 'Die Google-Daten sind gerade nicht erreichbar. Bitte versuch es in ein paar Minuten noch einmal, dein Gratis-Check bleibt erhalten.',
          code: 'rankings',
        },
        { status: 503 },
      );
    }
    const id = await saveCheck(result, owner, ip);
    if (!owner) await recordUsage(ip, id);
    const response: SeoCheckResponse = {
      id,
      owner,
      unlocked: owner,
      result: owner ? result : redactResult(result),
    };
    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof CheckFailedError) {
      return NextResponse.json({ error: err.message, code: 'unreachable' }, { status: 422 });
    }
    console.error('SEO-Check Fehler:', err);
    return NextResponse.json({ error: 'Beim Check ist etwas schiefgelaufen. Bitte versuch es gleich noch einmal.' }, { status: 500 });
  }
}
