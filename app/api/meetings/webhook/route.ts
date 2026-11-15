import { NextResponse, after } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { syncMeetings } from '@/lib/meetings/server/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Google meldet hier jede Änderung im Kalender (events.watch). Die
 * Meldung enthält keine Termindaten, nur "es hat sich etwas geändert".
 * Geprüft wird das Token, das beim Anlegen des Kanals vergeben wurde.
 * Der Abgleich läuft nach der Antwort, damit Google nicht wartet.
 */
export async function POST(req: Request) {
  const channelId = req.headers.get('x-goog-channel-id') ?? '';
  const token = req.headers.get('x-goog-channel-token') ?? '';
  const state = req.headers.get('x-goog-resource-state') ?? '';

  const snap = await adminDb().collection('settings').doc('meeting_sync').get();
  const s = snap.data() ?? {};
  if (!s.watchToken || token !== s.watchToken || channelId !== s.watch?.channelId) {
    // 200 statt Fehler: Google stellt einen alten Kanal sonst immer wieder zu.
    return new NextResponse(null, { status: 200 });
  }

  // "sync" kommt einmal direkt nach dem Anlegen, ohne Änderung.
  if (state !== 'sync') {
    after(async () => {
      await syncMeetings('webhook');
    });
  }
  return new NextResponse(null, { status: 200 });
}
