import { NextResponse } from 'next/server';
import { authenticate, authErrorResponse } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Zeigt, ob die oeffentlichen Blog-Seiten an die Artikel kommen.
 *
 * Die Seiten laufen ohne angemeldeten Nutzer. Wenn dort nichts
 * ankommt, liegt es entweder am fehlenden Dienstkonto (Admin-Zugriff)
 * oder an den Firestore-Regeln (oeffentlicher Lesezugriff). Diese
 * Route prueft beide Wege getrennt und sagt, welcher greift.
 */
export async function GET(req: Request) {
  const auth = await authenticate(req);
  const errResp = authErrorResponse(auth);
  if (errResp) return errResp;

  const result: Record<string, unknown> = {};

  // Weg 1: Admin-SDK (braucht ein Dienstkonto in den Umgebungsvariablen)
  const adminEnv = {
    FIREBASE_SERVICE_ACCOUNT_JSON: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
    GOOGLE_APPLICATION_CREDENTIALS:
      !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
  };
  result.umgebungsvariablen = adminEnv;

  try {
    const { adminDb } = await import('@/lib/firebase-admin');
    const snap = await adminDb()
      .collection('blogPosts')
      .where('status', '==', 'published')
      .get();
    result.adminZugriff = {
      funktioniert: true,
      gefundeneArtikel: snap.size,
      slugs: snap.docs.map((d) => d.data().slug),
    };
  } catch (err) {
    result.adminZugriff = {
      funktioniert: false,
      fehler: (err as Error).message,
    };
  }

  // Weg 2: normales SDK ohne Anmeldung, so wie ein Besucher es taete
  try {
    const { getDocs, query, where, collection } = await import(
      'firebase/firestore'
    );
    const { db } = await import('@/lib/firebase');
    const snap = await getDocs(
      query(collection(db, 'blogPosts'), where('status', '==', 'published')),
    );
    result.oeffentlicherZugriff = {
      funktioniert: true,
      gefundeneArtikel: snap.size,
    };
  } catch (err) {
    result.oeffentlicherZugriff = {
      funktioniert: false,
      fehler: (err as Error).message,
      hinweis:
        'Die Firestore-Regeln erlauben keinen Lesezugriff ohne Anmeldung. Regeln aus firestore.rules veroeffentlichen, dann greift dieser Weg.',
    };
  }

  const adminOk =
    (result.adminZugriff as { funktioniert: boolean }).funktioniert === true;
  const publicOk =
    (result.oeffentlicherZugriff as { funktioniert: boolean }).funktioniert ===
    true;

  result.ergebnis = adminOk
    ? 'Admin-Zugriff funktioniert. Die Blog-Seiten sollten die Artikel finden.'
    : publicOk
      ? 'Admin-Zugriff fehlt, aber der oeffentliche Weg funktioniert. Die Blog-Seiten nutzen ihn als Rueckfall.'
      : 'Beide Wege scheitern. Entweder ein Dienstkonto als Umgebungsvariable hinterlegen oder die Firestore-Regeln veroeffentlichen.';

  return NextResponse.json(result, { status: 200 });
}
