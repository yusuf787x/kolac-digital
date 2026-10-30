import 'server-only';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { clientIp, sha256 } from '@/lib/portal/access';
import { hitRateLimit } from '@/lib/portal/rate-limit';
import type { SeoClient } from '../types';

/**
 * Anmeldung fuer Claude Code ueber den Kunden-Schluessel (kdp_...).
 * Der Schluessel bestimmt den Kunden, eine Anfrage kann nie einen anderen
 * Kunden waehlen. Gespeichert ist nur der SHA-256.
 *
 * @param bucket eigener Zaehler je Route, z. B. "changelog" oder "agent"
 */
export async function clientFromToken(req: Request, bucket: string, perHour = 120): Promise<SeoClient | NextResponse> {
  if (!(await hitRateLimit(`${bucket}-ip:${clientIp(req)}`, perHour, 3600))) {
    return NextResponse.json({ error: 'Zu viele Anfragen.' }, { status: 429 });
  }
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token.startsWith('kdp_') || token.length < 30) {
    return NextResponse.json({ error: 'Kunden-Schlüssel fehlt (Authorization: Bearer kdp_…).' }, { status: 401 });
  }
  const snap = await adminDb()
    .collection('seoClients')
    .where('changelogTokenHash', '==', sha256(token))
    .limit(1)
    .get();
  if (snap.empty) return NextResponse.json({ error: 'Kunden-Schlüssel ungültig.' }, { status: 401 });
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as SeoClient;
}
