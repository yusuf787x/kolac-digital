import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clientIp, normalizeEmail, sha256 } from '@/lib/portal/access';
import { completeLogin, SESSION_TTL_MS } from '@/lib/portal/login';
import { hitRateLimit } from '@/lib/portal/rate-limit';
import { cookieBase, NONCE_COOKIE, SESSION_COOKIE } from '@/lib/portal/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Link einloesen. Bewusst POST (Knopf auf /portal/anmelden) statt GET:
 * Mail-Scanner, die Links vorab oeffnen, wuerden sonst den Einmal-Link
 * verbrauchen.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const code = String(form?.get('code') ?? '');
  const typedEmail = normalizeEmail(form?.get('email'));
  const ip = clientIp(req);
  const toLogin = (reason: string) =>
    NextResponse.redirect(new URL(`/portal/login?fehler=${reason}`, req.url), 303);

  if (!code) return toLogin('link');
  if (!(await hitRateLimit(`complete-ip:${ip}`, 20, 3600))) return toLogin('zu-viele');

  const store = await cookies();
  const nonce = store.get(NONCE_COOKIE)?.value;
  const result = await completeLogin({
    code,
    nonceHash: nonce ? sha256(nonce) : null,
    typedEmail,
    ip,
    userAgent: req.headers.get('user-agent') ?? '',
  });

  if (!result.ok) {
    if (result.reason === 'email-required' || result.reason === 'email-mismatch') {
      const q = new URLSearchParams({ code, ...(result.reason === 'email-mismatch' ? { fehler: 'adresse' } : {}) });
      return NextResponse.redirect(new URL(`/portal/anmelden?${q}`, req.url), 303);
    }
    const map: Record<string, string> = { expired: 'abgelaufen', used: 'benutzt', invalid: 'link', 'no-access': 'zugang', error: 'technik' };
    return toLogin(map[result.reason] ?? 'link');
  }

  const res = NextResponse.redirect(new URL('/portal', req.url), 303);
  res.cookies.set(SESSION_COOKIE, result.sessionToken, { ...cookieBase, maxAge: SESSION_TTL_MS / 1000 });
  res.cookies.delete(NONCE_COOKIE);
  return res;
}
