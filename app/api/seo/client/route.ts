import { NextResponse } from 'next/server';
import { badRequest, errorResponse, loadClientOr404, requireAdmin } from '@/lib/seo/server/admin-route';
import { deleteSeoClientData } from '@/lib/seo/server/demo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Admin: SEO-Betreuung eines Kunden beenden. Loescht Zahlen, Berichte,
 * Massnahmen und Portal-Zugaenge. Der Kunde selbst (Rechnungen usw.)
 * bleibt erhalten. Body: { action: 'delete', customerId }
 */
export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  if (body.action !== 'delete') return badRequest('Unbekannte Aktion.');
  const client = await loadClientOr404(body.customerId);
  if (client instanceof NextResponse) return client;
  try {
    await deleteSeoClientData(client.customerId, { deleteCustomer: client.demo === true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
