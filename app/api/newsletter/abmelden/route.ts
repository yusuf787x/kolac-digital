import { newsletterPage, setNewsletterStatus } from '@/lib/newsletter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Abmelden mit einem Klick (Link in jeder Mail). */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('t') ?? '';
  const ok = await setNewsletterStatus(token, 'unsubscribed').catch(() => false);
  return ok
    ? newsletterPage('Du bist abgemeldet', 'Du bekommst keine Neuigkeiten mehr von uns per E-Mail.')
    : newsletterPage('Link nicht mehr gültig', 'Dieser Link ist abgelaufen. Schreib uns gern an yusuf@kolac-digital.de, dann tragen wir dich aus.');
}
