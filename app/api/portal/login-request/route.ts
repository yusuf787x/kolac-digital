import { after, NextResponse } from 'next/server';
import { clientIp, isValidEmail, normalizeEmail, randomToken, sha256 } from '@/lib/portal/access';
import { LINK_TTL_MS, sendLoginLink } from '@/lib/portal/login';
import { hitRateLimit } from '@/lib/portal/rate-limit';
import { cookieBase, NONCE_COOKIE } from '@/lib/portal/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Login-Link anfordern (HTML-Formular von /portal/login, klappt ohne JS).
 *
 * Gegen das Ausprobieren von Adressen: Die Antwort ist immer dieselbe
 * Weiterleitung, und die eigentliche Arbeit (Pruefung, Link, Mail) laeuft
 * erst nach der Antwort per after(). Dadurch verraet auch die Antwortzeit
 * nicht, ob eine Adresse freigeschaltet ist.
 *
 * Grenzen: 10 Anfragen pro IP und Stunde, 3 pro Adresse in 15 Minuten.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const email = normalizeEmail(form?.get('email'));
  const ip = clientIp(req);
  const back = (q: string) => NextResponse.redirect(new URL(`/portal/login?${q}`, req.url), 303);

  if (!isValidEmail(email)) return back('fehler=adresse');
  if (!(await hitRateLimit(`login-ip:${ip}`, 10, 3600))) return back('fehler=zu-viele');

  // Neue Geraete-Nonce: oeffnet der Kunde den Link im selben Browser,
  // muss er seine Adresse nicht noch einmal eingeben.
  const nonce = randomToken(24);
  const res = back('gesendet=1');
  res.cookies.set(NONCE_COOKIE, nonce, { ...cookieBase, maxAge: LINK_TTL_MS / 1000 });

  after(async () => {
    try {
      if (!(await hitRateLimit(`login-email:${email}`, 3, 900))) return;
      await sendLoginLink({ email, nonceHash: sha256(nonce) });
    } catch (err) {
      console.error('Portal: Login-Link konnte nicht verschickt werden', err);
    }
  });
  return res;
}
