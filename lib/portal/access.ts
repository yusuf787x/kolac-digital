import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { adminDb } from '@/lib/firebase-admin';
import type { PortalAccess } from '@/lib/seo/types';

/** Collection-Namen siehe lib/seo/types.ts. */
export const ACCESS_COL = 'portalAccess';

export function normalizeEmail(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

export async function getActiveAccess(email: string): Promise<PortalAccess | null> {
  if (!email) return null;
  const snap = await adminDb().collection(ACCESS_COL).doc(email).get();
  if (!snap.exists) return null;
  const data = snap.data() as PortalAccess;
  return data.active ? { ...data, email: snap.id } : null;
}

export async function listActiveAccessEmails(customerId: string): Promise<string[]> {
  const snap = await adminDb().collection(ACCESS_COL).where('customerId', '==', customerId).get();
  return snap.docs.filter((d) => d.data().active === true).map((d) => d.id);
}

/** IPv4 letzter Block auf 0, IPv6 nur die ersten drei Bloecke. Datensparsam. */
export function truncateIp(ip: string): string {
  if (!ip) return '';
  if (ip.includes('.')) return ip.split('.').slice(0, 3).concat('0').join('.');
  return ip.split(':').slice(0, 3).join(':') + '::';
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd?.split(',')[0] ?? req.headers.get('x-real-ip') ?? '').trim();
}
