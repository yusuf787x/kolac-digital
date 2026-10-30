import { NextResponse } from 'next/server';
import { badRequest, errorResponse, loadClientOr404, parseMonth, requireAdmin, safe } from '@/lib/seo/server/admin-route';
import { fetchMonth, measureMonth } from '@/lib/seo/server/fetch';
import { gscServiceAccountEmail } from '@/lib/seo/server/gsc';
import { hasAdminCredentials } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Admin: einen Monat abrufen ("Jetzt aktualisieren" bzw. ein Schritt des
 * 16-Monats-Backfills, den der Browser Monat fuer Monat aufruft).
 * Body: { customerId, month: "YYYY-MM", pagespeed?: boolean }
 */
async function handlePOST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const client = await loadClientOr404(body.customerId);
  if (client instanceof NextResponse) return client;
  const month = parseMonth(body.month);
  if (!month) return badRequest('Monat fehlt oder ist ungültig (YYYY-MM).');

  try {
    const summary = await fetchMonth(client, month);
    const pagespeed = body.pagespeed ? await measureMonth(client, month) : null;
    return NextResponse.json({ ok: true, summary, pagespeedCount: pagespeed?.length ?? 0 });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Admin: Status der Zugangsdaten, damit die Oberflaeche sagen kann, was fehlt. */
async function handleGET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json({
    firebaseAdmin: hasAdminCredentials(),
    resend: !!process.env.RESEND_API_KEY,
    serviceAccount: gscServiceAccountEmail(),
    pagespeedKey: !!process.env.PAGESPEED_API_KEY,
  });
}

export const POST = safe(handlePOST);

export const GET = safe(handleGET);
