import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { portalBaseUrl } from '@/lib/seo/server/config';
import { sendLoginLinkEmail } from '@/lib/seo/server/emails';
import { getSeoClient } from '@/lib/seo/server/store';
import { ACCESS_COL, getActiveAccess, sha256, truncateIp } from './access';

/**
 * Magic-Link-Ablauf des Kundenportals.
 *
 * 1. requestLogin: Firebase Admin erzeugt mit generateSignInWithEmailLink
 *    einen Link. Wir nehmen nur den oobCode und bauen daraus einen Link
 *    auf die eigene Domain (/portal/anmelden?code=...). Dazu ein Datensatz
 *    portalLoginLinks/{sha256(code)} mit eigener Gueltigkeit (1 Stunde),
 *    Einmal-Nutzung und dem Hash einer Geraete-Nonce.
 * 2. completeLogin: Code pruefen, bei fremdem Geraet die E-Mail abfragen,
 *    den oobCode ueber die Identity-Toolkit-REST-API einloesen (das ist
 *    dasselbe wie signInWithEmailLink im Browser) und aus dem ID-Token
 *    ein httpOnly-Session-Cookie machen. Im Browser des Kunden laeuft
 *    dadurch kein Firebase-JavaScript.
 */

const LINK_COL = 'portalLoginLinks';
const EVENTS_COL = 'portalLoginEvents';
export const LINK_TTL_MS = 60 * 60 * 1000;
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_EMAIL_ATTEMPTS = 5;
const EVENT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

interface LinkRecord {
  email: string;
  customerId: string;
  nonceHash: string | null;
  expiresAt: Timestamp;
  usedAt: Timestamp | null;
  attempts: number;
  createdAt: Timestamp;
}

/**
 * Erzeugt und verschickt einen Login-Link, wenn die Adresse freigeschaltet
 * ist. Gibt nichts preis: der Aufrufer antwortet immer gleich.
 */
export async function sendLoginLink(opts: {
  email: string;
  nonceHash: string | null;
  invite?: boolean;
}): Promise<boolean> {
  const access = await getActiveAccess(opts.email);
  if (!access) return false;
  const client = await getSeoClient(access.customerId);

  const base = portalBaseUrl();
  const firebaseLink = await adminAuth().generateSignInWithEmailLink(opts.email, {
    url: `${base}/portal/anmelden`,
    handleCodeInApp: true,
  });
  const code = new URL(firebaseLink).searchParams.get('oobCode');
  if (!code) throw new Error('Firebase hat keinen oobCode geliefert.');

  const record: LinkRecord = {
    email: opts.email,
    customerId: access.customerId,
    nonceHash: opts.nonceHash,
    expiresAt: Timestamp.fromMillis(Date.now() + LINK_TTL_MS),
    usedAt: null,
    attempts: 0,
    createdAt: Timestamp.now(),
  };
  await adminDb().collection(LINK_COL).doc(sha256(code)).set(record);

  await sendLoginLinkEmail({
    to: opts.email,
    link: `${base}/portal/anmelden?code=${encodeURIComponent(code)}`,
    displayName: client?.displayName ?? 'Ihr Unternehmen',
    invite: opts.invite === true,
  });
  return true;
}

export type LinkState =
  | { ok: true; sameDevice: boolean }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' };

/** Nur lesen, fuer die Anzeige der Anmelde-Seite. Verbraucht den Link nicht. */
export async function inspectLink(code: string, nonceHash: string | null): Promise<LinkState> {
  if (!code || code.length > 2048) return { ok: false, reason: 'invalid' };
  const snap = await adminDb().collection(LINK_COL).doc(sha256(code)).get();
  if (!snap.exists) return { ok: false, reason: 'invalid' };
  const rec = snap.data() as LinkRecord;
  if (rec.usedAt) return { ok: false, reason: 'used' };
  if (rec.expiresAt.toMillis() < Date.now()) return { ok: false, reason: 'expired' };
  if (rec.attempts >= MAX_EMAIL_ATTEMPTS) return { ok: false, reason: 'invalid' };
  return { ok: true, sameDevice: !!rec.nonceHash && rec.nonceHash === nonceHash };
}

export type CompleteResult =
  | { ok: true; sessionCookie: string; email: string; customerId: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' | 'email-required' | 'email-mismatch' | 'no-access' | 'error' };

export async function completeLogin(opts: {
  code: string;
  nonceHash: string | null;
  typedEmail: string;
  ip: string;
  userAgent: string;
}): Promise<CompleteResult> {
  const db = adminDb();
  const ref = db.collection(LINK_COL).doc(sha256(opts.code));

  // Pruefen und als benutzt markieren in einer Transaktion: ein Link
  // kann so auch bei Doppelklick nur einmal eingeloest werden.
  const check = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { ok: false as const, reason: 'invalid' as const };
    const rec = snap.data() as LinkRecord;
    if (rec.usedAt) return { ok: false as const, reason: 'used' as const };
    if (rec.expiresAt.toMillis() < Date.now()) return { ok: false as const, reason: 'expired' as const };
    if (rec.attempts >= MAX_EMAIL_ATTEMPTS) return { ok: false as const, reason: 'invalid' as const };

    const sameDevice = !!rec.nonceHash && rec.nonceHash === opts.nonceHash;
    if (!sameDevice) {
      if (!opts.typedEmail) return { ok: false as const, reason: 'email-required' as const };
      if (opts.typedEmail !== rec.email) {
        tx.update(ref, { attempts: FieldValue.increment(1) });
        return { ok: false as const, reason: 'email-mismatch' as const };
      }
    }
    tx.update(ref, { usedAt: Timestamp.now() });
    return { ok: true as const, rec };
  });
  if (!check.ok) return check;

  const { rec } = check;
  // Zugang koennte seit dem Versand entzogen worden sein
  const access = await getActiveAccess(rec.email);
  if (!access || access.customerId !== rec.customerId) return { ok: false, reason: 'no-access' };

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithEmailLink?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: rec.email, oobCode: opts.code }),
        cache: 'no-store',
      },
    );
    const body = (await res.json()) as { idToken?: string; localId?: string; error?: { message?: string } };
    if (!res.ok || !body.idToken) {
      console.error('Portal-Login: signInWithEmailLink fehlgeschlagen', body.error?.message);
      const msg = body.error?.message ?? '';
      return { ok: false, reason: /EXPIRED/.test(msg) ? 'expired' : /INVALID_OOB_CODE/.test(msg) ? 'used' : 'error' };
    }

    const sessionCookie = await adminAuth().createSessionCookie(body.idToken, {
      expiresIn: SESSION_TTL_MS,
    });

    await Promise.all([
      db.collection(ACCESS_COL).doc(rec.email).update({
        uid: body.localId ?? null,
        lastLoginAt: Timestamp.now(),
        loginCount: FieldValue.increment(1),
      }),
      db.collection(EVENTS_COL).add({
        email: rec.email,
        customerId: rec.customerId,
        at: Timestamp.now(),
        ip: truncateIp(opts.ip),
        userAgent: opts.userAgent.slice(0, 200),
        expiresAt: Timestamp.fromMillis(Date.now() + EVENT_RETENTION_MS),
      }),
    ]);

    return { ok: true, sessionCookie, email: rec.email, customerId: rec.customerId };
  } catch (err) {
    console.error('Portal-Login fehlgeschlagen', err);
    return { ok: false, reason: 'error' };
  }
}

/** Zugang entziehen: Datensatz deaktivieren und alle Sessions ungueltig machen. */
export async function revokeAccess(email: string): Promise<void> {
  const ref = adminDb().collection(ACCESS_COL).doc(email);
  const snap = await ref.get();
  if (!snap.exists) return;
  await ref.update({ active: false, revokedAt: Timestamp.now() });
  try {
    const user = await adminAuth().getUserByEmail(email);
    await adminAuth().revokeRefreshTokens(user.uid);
  } catch {
    // Noch nie eingeloggt: kein Firebase-Konto, nichts zu widerrufen
  }
}
