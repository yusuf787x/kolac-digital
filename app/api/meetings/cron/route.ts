import { NextResponse } from 'next/server';
import { syncMeetings } from '@/lib/meetings/server/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Täglicher Abgleich der Termin-Erinnerungen (vercel.json). Fängt alles
 * auf, was der Live-Abgleich per Webhook verpasst hat, und erneuert den
 * Webhook-Kanal bei Google, bevor er abläuft.
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected && req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await syncMeetings('cron');
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
