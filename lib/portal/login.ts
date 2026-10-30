import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { portalBaseUrl } from '@/lib/seo/server/config';
import { sendLoginLinkEmail } from '@/lib/seo/server/emails';
import { getSeoClient } from '@/lib/seo/server/store';
import { ACCESS_COL, getActiveAccess, randomToken, sha256, truncateIp } from './access';

/**
 * Magic-Link-Ablauf des Kundenportals, komplett serverseitig und ohne
 * Firebase Authentication (Kunden bekommen kein Firebase-Konto).
 *
 * 1. sendLoginLink: zufaelliger Code (256 Bit) per Mail ueber Resend,
 *    Link auf die eigene Domain (/portal/anmelden?code=...). In Firestore
 *    liegt nur der SHA-256 des Codes (portalLoginLinks) mit Gueltigkeit
 *    1 Stunde, Einmal-Nutzung und dem Hash einer Geraete-Nonce.
 * 2. completeLogin: Code pruefen, bei fremdem Geraet die E-Mail abfragen,
 *    Link als benutzt markieren und eine Sitzung anlegen: zufaelliges
 *    Token im httpOnly-Cookie, in portalSessions nur dessen SHA-256.
 *    Entziehen = Sitzungen loeschen, wirkt sofort.
 *
 * Frueher lief das ueber generateSignInWithEmailLink + Session-Cookies von
 * Firebase Auth. Das scheiterte auf Vercel zweimal (jose als ES-Modul,
 * danach "internal error" von Identity Toolkit) und brachte fuer ein
 * reines Lese-Portal keinen Sicherheitsgewinn.
 */

const LINK_COL = 'portalLoginLinks';
const SESSION_COL = 'portalSessions';
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

export interface SessionRecord {
  email: string;
  customerId: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
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

  const code = randomToken(32);
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
    link: `${portalBaseUrl()}/portal/anmelden?code=${encodeURIComponent(code)}`,
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
  if (!code || code.length > 200) return { ok: false, reason: 'invalid' };
  const snap = await adminDb().collection(LINK_COL).doc(sha256(code)).get();
  if (!snap.exists) return { ok: false, reason: 'invalid' };
  const rec = snap.data() as LinkRecord;
  if (rec.usedAt) return { ok: false, reason: 'used' };
  if (rec.expiresAt.toMillis() < Date.now()) return { ok: false, reason: 'expired' };
  if (rec.attempts >= MAX_EMAIL_ATTEMPTS) return { ok: false, reason: 'invalid' };
  return { ok: true, sameDevice: !!rec.nonceHash && rec.nonceHash === nonceHash };
}

export type CompleteResult =
  | { ok: true; sessionToken: string; email: string; customerId: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' | 'email-required' | 'email-mismatch' | 'no-access' | 'error' };

export async function completeLogin(opts: {
  code: string;
  nonceHash: string | null;
  typedEmail: string;
  ip: string;
  userAgent: string;
}): Promise<CompleteResult> {
  const db = adminDb();
  if (!opts.code || opts.code.length > 200) return { ok: false, reason: 'invalid' };
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
    const sessionToken = randomToken(32);
    const now = Timestamp.now();
    const session: SessionRecord & { userAgent: string } = {
      email: rec.email,
      customerId: rec.customerId,
      createdAt: now,
      expiresAt: Timestamp.fromMillis(Date.now() + SESSION_TTL_MS),
      userAgent: opts.userAgent.slice(0, 200),
    };
    await Promise.all([
      db.collection(SESSION_COL).doc(sha256(sessionToken)).set(session),
      db.collection(ACCESS_COL).doc(rec.email).update({
        lastLoginAt: now,
        loginCount: FieldValue.increment(1),
      }),
      db.collection(EVENTS_COL).add({
        email: rec.email,
        customerId: rec.customerId,
        at: now,
        ip: truncateIp(opts.ip),
        userAgent: opts.userAgent.slice(0, 200),
        expiresAt: Timestamp.fromMillis(Date.now() + EVENT_RETENTION_MS),
      }),
    ]);
    return { ok: true, sessionToken, email: rec.email, customerId: rec.customerId };
  } catch (err) {
    console.error('Portal-Login fehlgeschlagen', err);
    return { ok: false, reason: 'error' };
  }
}

/** Sitzung zum Cookie-Wert, null wenn unbekannt oder abgelaufen. */
export async function findSession(token: string | undefined): Promise<SessionRecord | null> {
  if (!token || token.length > 200) return null;
  const snap = await adminDb().collection(SESSION_COL).doc(sha256(token)).get();
  if (!snap.exists) return null;
  const s = snap.data() as SessionRecord;
  return s.expiresAt.toMillis() > Date.now() ? s : null;
}

export async function endSession(token: string | undefined): Promise<void> {
  if (!token || token.length > 200) return;
  await adminDb().collection(SESSION_COL).doc(sha256(token)).delete();
}

/** Zugang entziehen: Datensatz deaktivieren und alle Sitzungen loeschen. */
export async function revokeAccess(email: string): Promise<void> {
  const db = adminDb();
  const ref = db.collection(ACCESS_COL).doc(email);
  const snap = await ref.get();
  if (!snap.exists) return;
  await ref.update({ active: false, revokedAt: Timestamp.now() });
  const sessions = await db.collection(SESSION_COL).where('email', '==', email).get();
  const batch = db.batch();
  sessions.docs.forEach((d) => batch.delete(d.ref));
  if (!sessions.empty) await batch.commit();
}
