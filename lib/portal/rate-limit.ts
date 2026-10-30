import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { sha256 } from './access';

const COL = 'portalRateLimits';

/**
 * Fester Zeitfenster-Zaehler in Firestore (funktioniert ueber alle
 * Serverless-Instanzen hinweg). Schluessel werden gehasht, damit keine
 * E-Mail-Adressen oder IPs im Klartext liegen. expiresAt ist fuer eine
 * Firestore-TTL-Regel gedacht, die alte Zaehler automatisch loescht.
 *
 * @returns true, wenn die Anfrage erlaubt ist
 */
export async function hitRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const ref = adminDb().collection(COL).doc(sha256(key));
  const now = Date.now();
  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() as { count: number; windowStart: number } | undefined;
    const fresh = !data || now - data.windowStart > windowSeconds * 1000;
    const count = fresh ? 1 : data.count + 1;
    tx.set(ref, {
      count,
      windowStart: fresh ? now : data.windowStart,
      expiresAt: Timestamp.fromMillis((fresh ? now : data.windowStart) + windowSeconds * 1000),
    });
    return count <= limit;
  });
}
