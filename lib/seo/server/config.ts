import 'server-only';

/**
 * Basis-Adresse fuer Links in Portal-Mails. Absichtlich NICHT aus dem
 * Host-Header der Anfrage abgeleitet, sonst koennte ein manipulierter
 * Header Login-Links auf eine fremde Domain zeigen lassen.
 */
export function portalBaseUrl(): string {
  const fromEnv =
    process.env.PORTAL_BASE_URL ??
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '');
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return 'http://localhost:3000';
}

export const isProduction = process.env.NODE_ENV === 'production';
