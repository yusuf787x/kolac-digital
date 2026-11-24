import 'server-only';
import { randomBytes } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { clientIp, sha256, truncateIp } from '@/lib/portal/access';
import { authenticate } from '@/lib/server-auth';
import type { SeoCheckResult } from './types';
import type { Branche, LeadSource, WebsiteAlter } from './funnel';

/**
 * Speicherung und Begrenzung des SEO-Checks.
 *
 * - Jeder Check landet in `seoChecks/{id}` (zufaellige ID, teilbarer Link).
 * - Besucher (seit 24.11.2026): 1 Check pro Person in 24 Stunden. Person =
 *   Geraete-Kennung im Cookie `kd_sc` (zufaellig, nur gehasht gespeichert).
 *   Wer das Cookie loescht, faengt am selben Anschluss ueber die IP-Bremse:
 *   hoechstens SEO_CHECK_IP_MAX Checks pro IP in 24 Stunden (Standard 3, weil
 *   sich im Handynetz viele Fremde eine IP teilen).
 * - Inhaber: unbegrenzt, erkannt am Dashboard-Login (Firebase-Token) oder
 *   an einer IP aus SEO_CHECK_UNLIMITED_IPS (Komma-getrennt).
 * - Sicherung gegen Kostenexplosion: hoechstens SEO_CHECK_DAILY_CAP
 *   oeffentliche Checks pro Tag (Standard 150).
 * IPs werden nur gehasht bzw. gekuerzt gespeichert.
 */

const CHECKS = 'seoChecks';
const LIMITS = 'seoCheckLimits';

export { clientIp };

export async function isOwnerRequest(req: Request): Promise<boolean> {
  const ip = clientIp(req);
  const allow = (process.env.SEO_CHECK_UNLIMITED_IPS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (ip && allow.includes(ip)) return true;
  if (!req.headers.get('authorization')) return false;
  const auth = await authenticate(req);
  return auth.ok;
}

const WINDOW_MS = 24 * 3600 * 1000;
const ipMax = () => Number(process.env.SEO_CHECK_IP_MAX ?? 3);
const dailyCap = () => Number(process.env.SEO_CHECK_DAILY_CAP ?? 150);

/** Cookie mit der Geraete-Kennung fuer die Begrenzung „1 Check pro Person und Tag“. */
export const DEVICE_COOKIE = 'kd_sc';

/** Kennung aus dem Cookie lesen oder neu erzeugen. */
export function deviceIdFrom(req: Request): { id: string; fresh: boolean } {
  const m = (req.headers.get('cookie') ?? '').match(new RegExp(`(?:^|;\\s*)${DEVICE_COOKIE}=([A-Za-z0-9_-]{16,64})`));
  return m ? { id: m[1], fresh: false } : { id: randomBytes(18).toString('base64url'), fresh: true };
}
const dayKey = () => new Date().toISOString().slice(0, 10);

export type LimitState = { ok: true } | { ok: false; reason: 'limit' | 'busy'; lastCheckId?: string };

export async function checkLimits(ip: string, deviceId: string): Promise<LimitState> {
  const db = adminDb();
  const [devSnap, ipSnap, daySnap] = await Promise.all([
    db.collection(LIMITS).doc(`dev_${sha256(deviceId)}`).get(),
    db.collection(LIMITS).doc(`ip24_${sha256(ip || 'unbekannt')}`).get(),
    db.collection(LIMITS).doc(`day_${dayKey()}`).get(),
  ]);
  const now = Date.now();
  const dev = devSnap.data() as { lastAt?: number; lastCheckId?: string } | undefined;
  if (dev?.lastAt && now - dev.lastAt < WINDOW_MS) {
    return { ok: false, reason: 'limit', lastCheckId: dev.lastCheckId };
  }
  const ipData = ipSnap.data() as { since?: number; count?: number; lastCheckId?: string } | undefined;
  if (ipData?.since && now - ipData.since < WINDOW_MS && (ipData.count ?? 0) >= ipMax()) {
    return { ok: false, reason: 'limit' };
  }
  if ((daySnap.data()?.count ?? 0) >= dailyCap()) return { ok: false, reason: 'busy' };
  return { ok: true };
}

export async function recordUsage(ip: string, deviceId: string, checkId: string): Promise<void> {
  const db = adminDb();
  const now = Date.now();
  const expires = Timestamp.fromMillis(now + 2 * WINDOW_MS);
  const ipRef = db.collection(LIMITS).doc(`ip24_${sha256(ip || 'unbekannt')}`);
  await Promise.all([
    db.collection(LIMITS).doc(`dev_${sha256(deviceId)}`).set({ lastAt: now, lastCheckId: checkId, expiresAt: expires }),
    db.runTransaction(async (tx) => {
      const cur = (await tx.get(ipRef)).data() as { since?: number; count?: number } | undefined;
      const fresh = !cur?.since || now - cur.since >= WINDOW_MS;
      tx.set(ipRef, { since: fresh ? now : cur!.since, count: fresh ? 1 : (cur!.count ?? 0) + 1, expiresAt: expires });
    }),
    db
      .collection(LIMITS)
      .doc(`day_${dayKey()}`)
      .set({ count: FieldValue.increment(1), expiresAt: Timestamp.fromMillis(now + 3 * 24 * 3600 * 1000) }, { merge: true }),
  ]);
}

export interface StoredLead {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  wantsCall: boolean;
  at: string;
  /** Branche aus dem Freischalt-Formular (seit Funnel-Umbau Pflicht). */
  branche?: Branche;
  websiteAlter?: WebsiteAlter;
  /** Besucher hat bestätigt, für ein Unternehmen anzufragen. */
  business?: boolean;
  /** Herkunft aus Anzeigen, vom Check übernommen. */
  source?: LeadSource;
  /** Einwilligung in die Erfolgsmessung an Meta (seit 23.11.2026: „Akzeptieren“ im Banner). */
  measureConsent?: boolean;
}

export interface StoredCheck {
  result: SeoCheckResult;
  owner: boolean;
  ip: string;
  createdAt: Timestamp;
  lead?: StoredLead;
  source?: LeadSource;
  /** Testmodus: Kopie eines vorhandenen Berichts, ohne Mails und ohne Meta. */
  test?: boolean;
}

export async function saveCheck(result: SeoCheckResult, owner: boolean, ip: string, source?: LeadSource, test = false): Promise<string> {
  const id = randomBytes(12).toString('base64url');
  // Firestore lehnt undefined-Werte ab (z. B. platform, wenn kein Baukasten
  // erkannt wurde). Der JSON-Umweg entfernt sie, das Ergebnis ist reines JSON.
  const clean = JSON.parse(JSON.stringify(result)) as SeoCheckResult;
  await adminDb()
    .collection(CHECKS)
    .doc(id)
    .set({
      result: clean,
      owner,
      ip: truncateIp(ip),
      domain: result.domain,
      score: result.score,
      createdAt: Timestamp.now(),
      ...(source ? { source: JSON.parse(JSON.stringify(source)) } : {}),
      ...(test ? { test: true } : {}),
    });
  return id;
}

export async function loadCheck(id: string): Promise<StoredCheck | null> {
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(id)) return null;
  const snap = await adminDb().collection(CHECKS).doc(id).get();
  return snap.exists ? (snap.data() as StoredCheck) : null;
}

export async function saveLead(id: string, lead: StoredLead): Promise<void> {
  // Telefon und Firma sind optional und sonst undefined (Firestore lehnt das ab).
  await adminDb().collection(CHECKS).doc(id).update({ lead: JSON.parse(JSON.stringify(lead)) });
}

/** Domain, deren letzter echter Bericht im Testmodus als Beispiel dient. */
const TEST_SOURCE_DOMAIN = 'kolac-digital.de';

/** Neuester gespeicherter Bericht der Beispiel-Domain mit Google-Daten (ohne Testkopien). */
export async function latestTestSource(): Promise<SeoCheckResult | null> {
  const snap = await adminDb().collection(CHECKS).where('domain', 'in', [TEST_SOURCE_DOMAIN, `www.${TEST_SOURCE_DOMAIN}`]).limit(50).get();
  const best = snap.docs
    .map((d) => d.data() as StoredCheck)
    .filter((c) => !c.test && c.result?.rankings?.available)
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))[0];
  return best?.result ?? null;
}
