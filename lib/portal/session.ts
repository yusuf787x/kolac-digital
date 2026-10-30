import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminAuth } from '@/lib/firebase-admin';
import { getSeoClient } from '@/lib/seo/server/store';
import type { SeoClient } from '@/lib/seo/types';
import { getActiveAccess, normalizeEmail } from './access';

export const SESSION_COOKIE = 'kd_portal_session';
/** Merkt sich, auf welchem Geraet der Link angefordert wurde. */
export const NONCE_COOKIE = 'kd_portal_nonce';

export interface PortalSession {
  email: string;
  customerId: string;
  client: SeoClient;
}

/**
 * Prueft bei JEDEM Aufruf: Session-Cookie gueltig und nicht widerrufen,
 * Adresse weiterhin freigeschaltet, Kunde existiert. Die customerId kommt
 * ausschliesslich aus portalAccess, nie aus der Anfrage. Ein Kunde kann
 * dadurch nur seine eigenen Daten sehen.
 */
export async function readPortalSession(cookieValue: string | undefined): Promise<PortalSession | null> {
  if (!cookieValue) return null;
  try {
    const decoded = await (await adminAuth()).verifySessionCookie(cookieValue, true);
    const email = normalizeEmail(decoded.email);
    const access = await getActiveAccess(email);
    if (!access) return null;
    const client = await getSeoClient(access.customerId);
    if (!client) return null;
    return { email, customerId: access.customerId, client };
  } catch {
    return null;
  }
}

export async function getPortalSession(): Promise<PortalSession | null> {
  const store = await cookies();
  return readPortalSession(store.get(SESSION_COOKIE)?.value);
}

/** Fuer Server-Komponenten: ohne gueltige Session zurueck zum Login. */
export async function requirePortalSession(): Promise<PortalSession> {
  const session = await getPortalSession();
  if (!session) redirect('/portal/login');
  return session;
}

export const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};
