import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminStorage } from '@/lib/firebase-admin';
import { readPortalSession, SESSION_COOKIE } from '@/lib/portal/session';
import { isMonthKey } from '@/lib/seo/months';
import { getReport } from '@/lib/seo/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Bericht-PDF fuer den Kunden. Nur mit gueltiger Session, nur der eigene
 * Kunde (customerId aus der Session) und nur freigegebene Berichte.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ month: string }> }) {
  const { month } = await ctx.params;
  const session = await readPortalSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: 'Bitte melden Sie sich an.' }, { status: 401 });
  if (!isMonthKey(month)) return NextResponse.json({ error: 'Ungültiger Monat.' }, { status: 400 });

  const report = await getReport(session.customerId, month);
  if (!report || report.status !== 'released' || !report.storagePath) {
    return NextResponse.json({ error: 'Bericht nicht gefunden.' }, { status: 404 });
  }
  const [buffer] = await adminStorage().bucket().file(report.storagePath).download();
  const name = `SEO-Bericht-${session.client.domain || 'Website'}-${month}.pdf`.replace(/[^\w.-]/g, '-');
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
