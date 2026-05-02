import { NextResponse } from 'next/server';
import { PICKUP_COOKIE } from '@/lib/google-oauth';

export const runtime = 'nodejs';

/**
 * One-shot pickup of OAuth tokens after the redirect. The client-side
 * settings page calls this, receives the tokens, and writes them to
 * Firestore via the authenticated client SDK. The cookie is cleared
 * immediately after read.
 */
export async function GET(req: Request) {
  const cookie = req.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${PICKUP_COOKIE}=`));

  if (!cookie) {
    return NextResponse.json({ error: 'no_pickup_cookie' }, { status: 404 });
  }

  const value = cookie.slice(PICKUP_COOKIE.length + 1);

  try {
    const decoded = Buffer.from(value, 'base64').toString('utf8');
    const payload = JSON.parse(decoded);

    const res = NextResponse.json({ ok: true, payload });
    res.cookies.set(PICKUP_COOKIE, '', {
      path: '/',
      maxAge: 0,
    });
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_cookie', detail: (err as Error).message },
      { status: 400 },
    );
  }
}
