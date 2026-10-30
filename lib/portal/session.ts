import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSeoClient } from '@/lib/seo/server/store';
import type { SeoClient } from '@/lib/seo/types';
import { getActiveAccess } from './access';
import { findSession } from './login';

export const SESSION_COOKIE = 'kd_portal_session';
/** Merkt sich, auf welchem Geraet der Link angefordert wurde. */
export const NONCE_COOKIE = 'kd_portal_nonce';

export interface PortalSession {
  email: string;
  customerId: string;
  client: SeoClient;
}

/**
 * Prueft bei JEDEM Aufruf: Sitzung existiert und ist nicht abgelaufen,
 * Adresse weiterhin freigeschaltet, Kunde existiert. Die customerId kommt
 * ausschliesslich aus portalAccess, nie aus der Anfrage. Ein Kunde kann
 * dadurch nur seine eigenen Daten sehen.
 */
export async function readPortalSession(cookieValue: string | undefined): Promise<PortalSession | null> {
  if (!cookieValue) return null;
  try {
    const session = await findSession(cookieValue);
    if (!session) return null;
    const email = session.email;
    const access = await getActiveAccess(email);
    if (!access || access.customerId !== session.customerId) return null;
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
