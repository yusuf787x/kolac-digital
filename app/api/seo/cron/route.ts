import { NextResponse } from 'next/server';
import { formatMonthDE, lastCompleteMonth } from '@/lib/seo/months';
import { portalBaseUrl } from '@/lib/seo/server/config';
import { sendReportsReadyEmail } from '@/lib/seo/server/emails';
import { fetchMonth, measureMonth } from '@/lib/seo/server/fetch';
import { generateReport } from '@/lib/seo/server/report';
import { getReport, listSeoClients } from '@/lib/seo/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Monatlicher Cron (vercel.json: am 4. um 6 Uhr UTC). Die Search Console
 * haengt 2 bis 3 Tage hinterher, am 4. ist der Vormonat vollstaendig.
 *
 * Pro aktivem SEO-Kunden (ohne Demo): Vormonat abrufen, PageSpeed messen,
 * Bericht als Entwurf mit Einschaetzungs-Vorschlag erzeugen. Danach eine
 * Sammel-Mail an Yusuf. Kunden bekommen erst nach der Freigabe eine Mail.
 * Ein Fehler bei einem Kunden haelt die anderen nicht auf.
 *
 * Schutz: CRON_SECRET als Bearer-Header, wie /api/contracts/cron.
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    if ((req.headers.get('authorization') ?? '') !== `Bearer ${expected}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'CRON_SECRET nicht gesetzt.' }, { status: 500 });
  }

  const month = lastCompleteMonth();
  const clients = (await listSeoClients()).filter((c) => c.enabled && !c.demo);
  const items: Array<{ displayName: string; monthLabel: string; adminLink: string }> = [];
  const errors: Array<{ displayName: string; message: string }> = [];

  for (const client of clients) {
    try {
      const existing = await getReport(client.customerId, month);
      if (existing?.status === 'released') continue; // schon erledigt, nichts ueberschreiben
      await fetchMonth(client, month);
      await measureMonth(client, month).catch((err) => {
        errors.push({ displayName: client.displayName, message: `PageSpeed: ${(err as Error).message}` });
      });
      await generateReport(client, month);
      items.push({
        displayName: client.displayName,
        monthLabel: formatMonthDE(month),
        adminLink: `${portalBaseUrl()}/dashboard/seo/${client.customerId}?tab=berichte&monat=${month}`,
      });
    } catch (err) {
      console.error('SEO-Cron', client.customerId, err);
      errors.push({ displayName: client.displayName, message: (err as Error).message });
    }
  }

  if (items.length || errors.length) {
    await sendReportsReadyEmail({ items, errors }).catch((err) => console.error('SEO-Cron Mail', err));
  }
  return NextResponse.json({ ok: true, month, processed: items.length, errors });
}
