import { NextResponse } from 'next/server';

export interface AuthedUser {
  uid: string;
  email?: string;
}

export type AuthResult =
  | { ok: true; user: AuthedUser }
  | { ok: false; status: number; message: string };

const ALLOWED_UID = process.env.ALLOWED_USER_UID ?? '';
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '';

/**
 * Verify a Firebase ID token via the Auth REST API.
 *
 * Avoids requiring firebase-admin (no Service Account credentials needed).
 * Uses the public `accounts:lookup` endpoint, which validates the token's
 * signature, issuer, audience, and expiry as a side-effect of looking up
 * the user record. Returns null for any invalid/expired/forged token.
 */
async function verifyAuthToken(req: Request): Promise<AuthedUser | null> {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const idToken = authHeader.slice(7).trim();
  if (!idToken) return null;

  if (!FIREBASE_API_KEY) {
    console.error(
      'NEXT_PUBLIC_FIREBASE_API_KEY missing — cannot verify auth tokens.',
    );
    return null;
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!res.ok) return null;

    const body = (await res.json()) as {
      users?: { localId: string; email?: string }[];
    };
    const user = body.users?.[0];
    if (!user?.localId) return null;

    return { uid: user.localId, email: user.email };
  } catch (err) {
    console.error('Firebase token verification error:', err);
    return null;
  }
}

/**
 * Authenticate an API request. Returns either the verified user, or an
 * error result with HTTP status. Routes use:
 *
 *   const auth = await authenticate(req);
 *   if (!auth.ok) {
 *     return NextResponse.json({ error: auth.message }, { status: auth.status });
 *   }
 */
export async function authenticate(req: Request): Promise<AuthResult> {
  const user = await verifyAuthToken(req);
  if (!user) {
    return {
      ok: false,
      status: 401,
      message: 'Nicht authentifiziert. Bitte erneut anmelden.',
    };
  }
  if (ALLOWED_UID && user.uid !== ALLOWED_UID) {
    return {
      ok: false,
      status: 403,
      message: 'Zugriff verweigert.',
    };
  }
  return { ok: true, user };
}

/**
 * Helper that converts a failed AuthResult straight into a NextResponse.
 */
export function authErrorResponse(result: AuthResult): NextResponse | null {
  if (result.ok) return null;
  return NextResponse.json(
    { error: result.message },
    { status: result.status },
  );
}
