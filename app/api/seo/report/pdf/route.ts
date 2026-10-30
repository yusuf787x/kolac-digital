import { NextResponse } from 'next/server';
import { adminStorage } from '@/lib/firebase-admin';
import { badRequest, loadClientOr404, parseMonth, requireAdmin, safe } from '@/lib/seo/server/admin-route';
import { getReport } from '@/lib/seo/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Admin: Bericht-PDF ansehen (auch Entwuerfe). GET ?customerId=...&month=YYYY-MM */
async function handleGET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const url = new URL(req.url);
  const client = await loadClientOr404(url.searchParams.get('customerId'));
  if (client instanceof NextResponse) return client;
  const month = parseMonth(url.searchParams.get('month'));
  if (!month) return badRequest('Monat ungültig.');

  const report = await getReport(client.customerId, month);
  if (!report?.storagePath) return badRequest('Für diesen Monat gibt es noch kein PDF.', 404);
  const [buffer] = await adminStorage().bucket().file(report.storagePath).download();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="SEO-Bericht-${month}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

export const GET = safe(handleGET);
