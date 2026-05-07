'use client';

import { auth } from './firebase';

/**
 * Drop-in replacement for `fetch()` that automatically attaches the
 * current user's Firebase ID token as `Authorization: Bearer <token>`.
 *
 * Throws if no user is signed in. Tokens auto-refresh — getIdToken()
 * returns a fresh one if the cached one is close to expiry.
 */
export async function authedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error(
      'Nicht eingeloggt — Session abgelaufen. Bitte erneut anmelden.',
    );
  }
  const token = await user.getIdToken();

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);

  return fetch(url, { ...options, headers });
}
