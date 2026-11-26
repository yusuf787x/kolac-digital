import { NextResponse } from 'next/server';
import { authenticate, authErrorResponse } from '@/lib/server-auth';
import { syncAutoAkten } from '@/lib/crm-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Akten für alle SEO-Checks und Outreach-Antworten anlegen (höchstens alle 10 Minuten). */
export async function POST(req: Request) {
  const errResp = authErrorResponse(await authenticate(req));
  if (errResp) return errResp;
  const force = new URL(req.url).searchParams.get('force') === '1';
  try {
    return NextResponse.json(await syncAutoAkten(force));
  } catch (err) {
    console.error('[crm/sync]', err);
    return NextResponse.json({ error: 'Abgleich fehlgeschlagen.' }, { status: 500 });
  }
}
