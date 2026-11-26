import { NextResponse, after } from 'next/server';
import { Resend } from 'resend';
import { checkNotificationEmail } from '@/lib/seo-check/emails';
import { CheckFailedError, normalizeInputUrl, redactResult, runSeoCheck } from '@/lib/seo-check/run';
import { DEVICE_COOKIE, checkLimits, clientIp, deviceIdFrom, isOwnerRequest, latestTestSource, recordUsage, saveCheck } from '@/lib/seo-check/store';
import { hitRateLimit } from '@/lib/portal/rate-limit';
import type { SeoCheckResponse } from '@/lib/seo-check/types';
import { cleanSource } from '@/lib/seo-check/funnel';
import { upsertLeadAkte } from '@/lib/crm-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Oeffentlicher SEO-Check. POST { url } -> fuehrt den Check aus, speichert
 * ihn und gibt das Ergebnis zurueck. Besucher sehen die Loesungen erst nach
 * dem Freischalten (/api/seo-check/[id]/unlock), der Inhaber sofort.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { url?: string; source?: unknown; test?: boolean };
  const url = normalizeInputUrl(body.url ?? '');
  if (!url) {
    return NextResponse.json({ error: 'Bitte gib eine gültige Adresse ein, z. B. meinefirma.de.' }, { status: 400 });
  }

  const ip = clientIp(req);

  // Testmodus (?test=1 an der Adresse): Funnel durchklicken ohne Kosten. Statt eines neuen Checks
  // eine Kopie des letzten echten Berichts von kolac-digital.de, kein Gratis-Check verbraucht,
  // keine Mails, beim Freischalten nichts an Meta.
  if (body.test === true) {
    if (!(await hitRateLimit(`seocheck-test:${ip}`, 30, 3600).catch(() => true))) {
      return NextResponse.json({ error: 'Zu viele Testläufe. Bitte in einer Stunde noch einmal.' }, { status: 429 });
    }
    try {
      let sample = await latestTestSource();
      if (!sample) {
        // Einmalig einen echten Bericht als Vorlage anlegen (danach immer wiederverwendet)
        sample = await runSeoCheck(normalizeInputUrl('kolac-digital.de')!);
        await saveCheck(sample, true, ip);
      }
      const id = await saveCheck(sample, false, ip, cleanSource(body.source), true);
      const response: SeoCheckResponse = { id, owner: false, unlocked: false, result: redactResult(sample), test: true };
      return NextResponse.json(response);
    } catch (err) {
      console.error('SEO-Check Testmodus:', err);
      return NextResponse.json({ error: 'Der Testmodus ist gerade nicht verfügbar.' }, { status: 503 });
    }
  }

  const owner = await isOwnerRequest(req);
  const device = deviceIdFrom(req);
  if (!owner) {
    try {
      const limit = await checkLimits(ip, device.id);
      if (!limit.ok) {
        return NextResponse.json(
          limit.reason === 'limit'
            ? {
                error: 'Du hast heute schon deinen kostenlosen Check gemacht. Morgen geht wieder einer.',
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
    const source = cleanSource(body.source);
    const id = await saveCheck(result, owner, ip, source);
    if (!owner) await recordUsage(ip, device.id, id);
    // Kundenakte: jeder Check eines Besuchers wird eine Akte (erst nur mit Website,
    // beim Freischalten kommen Name, Mail und Telefon dazu). Der Check selbst steht im Verlauf.
    if (!owner) {
      after(async () => {
        await upsertLeadAkte({ website: result.domain, source: 'SEO-Check' });
      });
    }
    // Mail an Yusuf bei jedem Check eines Besuchers, nie im Inhaber-Modus.
    if (!owner && process.env.RESEND_API_KEY) {
      after(async () => {
        try {
          const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
            ...checkNotificationEmail(id, result, source),
            to: process.env.CONTACT_TO_EMAIL || 'yusuf@kolac-digital.de',
          });
          if (error) console.error('SEO-Check Check-Mail:', error);
        } catch (err) {
          console.error('SEO-Check Check-Mail:', err);
        }
      });
    }
    const response: SeoCheckResponse = {
      id,
      owner,
      unlocked: owner,
      result: owner ? result : redactResult(result),
    };
    const res = NextResponse.json(response);
    // Geraete-Kennung erst setzen, wenn wirklich ein Check gelaufen ist (nur zur Begrenzung, kein Tracking)
    if (device.fresh && !owner) {
      res.cookies.set(DEVICE_COOKIE, device.id, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 365 * 24 * 3600 });
    }
    return res;
  } catch (err) {
    if (err instanceof CheckFailedError) {
      return NextResponse.json({ error: err.message, code: 'unreachable' }, { status: 422 });
    }
    console.error('SEO-Check Fehler:', err);
    return NextResponse.json({ error: 'Beim Check ist etwas schiefgelaufen. Bitte versuch es gleich noch einmal.' }, { status: 500 });
  }
}
