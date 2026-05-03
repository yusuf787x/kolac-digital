import { OAuth2Client } from 'google-auth-library';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/userinfo.email',
];

export const PICKUP_COOKIE = 'kolac_g_pickup';

export function getOAuthClient(redirectUri?: string): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const fallback = process.env.GOOGLE_REDIRECT_URI ?? '';

  if (!clientId || !clientSecret) {
    throw new Error(
      'GOOGLE_CLIENT_ID oder GOOGLE_CLIENT_SECRET ist nicht gesetzt.',
    );
  }
  return new OAuth2Client(clientId, clientSecret, redirectUri ?? fallback);
}

/**
 * Build the absolute redirect URI for the OAuth callback. Must match what
 * is configured in Google Cloud OAuth Client.
 */
export function buildRedirectUri(reqUrl: string): string {
  const u = new URL(reqUrl);
  return `${u.origin}/api/auth/callback/google`;
}

/**
 * Authenticated OAuth2 client built from a stored refresh token.
 * Used by Drive/Sheets API calls.
 */
export function getOAuthClientForRefresh(refreshToken: string): OAuth2Client {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}
