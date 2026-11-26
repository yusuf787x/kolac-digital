import { NextResponse } from 'next/server';
import { authenticate, authErrorResponse } from '@/lib/server-auth';
import { akteFromOutreach } from '@/lib/crm-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Outreach-Status geändert: bei Antwort, Termin oder Kunde die Akte anlegen bzw. nachziehen. */
export async function POST(req: Request) {
  const errResp = authErrorResponse(await authenticate(req));
  if (errResp) return errResp;
  const body = (await req.json().catch(() => ({}))) as { leadId?: unknown };
  if (typeof body.leadId !== 'string' || !body.leadId) return NextResponse.json({ error: 'leadId fehlt' }, { status: 400 });
  try {
    return NextResponse.json({ customerId: await akteFromOutreach(body.leadId) });
  } catch (err) {
    console.error('[crm/outreach]', err);
    return NextResponse.json({ error: 'Akte konnte nicht angelegt werden.' }, { status: 500 });
  }
}
