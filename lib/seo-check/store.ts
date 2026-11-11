import 'server-only';
import { randomBytes } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { clientIp, sha256, truncateIp } from '@/lib/portal/access';
import { authenticate } from '@/lib/server-auth';
import type { SeoCheckResult } from './types';

/**
 * Speicherung und Begrenzung des SEO-Checks.
 *
 * - Jeder Check landet in `seoChecks/{id}` (zufaellige ID, teilbarer Link).
 * - Besucher: 1 Check pro IP in SEO_CHECK_WINDOW_DAYS (Standard 30 Tage).
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

const windowMs = () => Number(process.env.SEO_CHECK_WINDOW_DAYS ?? 30) * 24 * 3600 * 1000;
const dailyCap = () => Number(process.env.SEO_CHECK_DAILY_CAP ?? 150);
const dayKey = () => new Date().toISOString().slice(0, 10);

export type LimitState = { ok: true } | { ok: false; reason: 'limit' | 'busy'; lastCheckId?: string };

export async function checkLimits(ip: string): Promise<LimitState> {
  const db = adminDb();
  const [ipSnap, daySnap] = await Promise.all([
    db.collection(LIMITS).doc(`ip_${sha256(ip || 'unbekannt')}`).get(),
    db.collection(LIMITS).doc(`day_${dayKey()}`).get(),
  ]);
  const ipData = ipSnap.data() as { lastAt?: number; lastCheckId?: string } | undefined;
  if (ipData?.lastAt && Date.now() - ipData.lastAt < windowMs()) {
    return { ok: false, reason: 'limit', lastCheckId: ipData.lastCheckId };
  }
  if ((daySnap.data()?.count ?? 0) >= dailyCap()) return { ok: false, reason: 'busy' };
  return { ok: true };
}

export async function recordUsage(ip: string, checkId: string): Promise<void> {
  const db = adminDb();
  const expires = Timestamp.fromMillis(Date.now() + windowMs());
  await Promise.all([
    db.collection(LIMITS).doc(`ip_${sha256(ip || 'unbekannt')}`).set({ lastAt: Date.now(), lastCheckId: checkId, expiresAt: expires }),
    db
      .collection(LIMITS)
      .doc(`day_${dayKey()}`)
      .set({ count: FieldValue.increment(1), expiresAt: Timestamp.fromMillis(Date.now() + 3 * 24 * 3600 * 1000) }, { merge: true }),
  ]);
}

export interface StoredLead {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  wantsCall: boolean;
  at: string;
}

export interface StoredCheck {
  result: SeoCheckResult;
  owner: boolean;
  ip: string;
  createdAt: Timestamp;
  lead?: StoredLead;
}

export async function saveCheck(result: SeoCheckResult, owner: boolean, ip: string): Promise<string> {
  const id = randomBytes(12).toString('base64url');
  await adminDb()
    .collection(CHECKS)
    .doc(id)
    .set({ result, owner, ip: truncateIp(ip), domain: result.domain, score: result.score, createdAt: Timestamp.now() });
  return id;
}

export async function loadCheck(id: string): Promise<StoredCheck | null> {
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(id)) return null;
  const snap = await adminDb().collection(CHECKS).doc(id).get();
  return snap.exists ? (snap.data() as StoredCheck) : null;
}

export async function saveLead(id: string, lead: StoredLead): Promise<void> {
  await adminDb().collection(CHECKS).doc(id).update({ lead });
}
