import { NextResponse } from 'next/server';
import { suggestAssessment } from '@/lib/seo/assessment';
import { badRequest, errorResponse, loadClientOr404, parseMonth, requireAdmin, safe } from '@/lib/seo/server/admin-route';
import { loadPortalData } from '@/lib/seo/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Admin: Bericht verwalten.
 * Body: { action: 'suggest' | 'generate' | 'release', customerId, month, resetAssessment? }
 *   suggest   Vorschlag fuer die Einschaetzung, ohne zu speichern
 *   generate  Entwurf anlegen bzw. PDF neu erzeugen
 *   release   freigeben und Kunden per Mail benachrichtigen
 */
async function handlePOST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const client = await loadClientOr404(body.customerId);
  if (client instanceof NextResponse) return client;
  const month = parseMonth(body.month);
  if (!month) return badRequest('Monat fehlt oder ist ungültig.');

  try {
    switch (body.action) {
      case 'suggest': {
        const data = await loadPortalData(client, month, true);
        return NextResponse.json({ ok: true, assessment: suggestAssessment(data) });
      }
      case 'generate': {
        const { generateReport } = await import('@/lib/seo/server/report');
        const r = await generateReport(client, month, { resetAssessment: body.resetAssessment === true });
        return NextResponse.json({ ok: true, ...r });
      }
      case 'release': {
        const { releaseReport } = await import('@/lib/seo/server/report');
        const r = await releaseReport(client, month);
        return NextResponse.json({ ok: true, ...r });
      }
      default:
        return badRequest('Unbekannte Aktion.');
    }
  } catch (err) {
    return errorResponse(err);
  }
}

export const POST = safe(handlePOST);
