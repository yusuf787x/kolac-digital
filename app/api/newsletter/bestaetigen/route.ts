import { newsletterPage, setNewsletterStatus } from '@/lib/newsletter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Link aus der Bestätigungsmail (Double-Opt-in). */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('t') ?? '';
  const ok = await setNewsletterStatus(token, 'confirmed').catch(() => false);
  return ok
    ? newsletterPage('Danke, deine Anmeldung ist bestätigt', 'Du bekommst ab und zu Neuigkeiten und Tipps von Kolac Digital. Abmelden geht jederzeit über den Link in jeder Mail.')
    : newsletterPage('Link nicht mehr gültig', 'Dieser Link ist abgelaufen oder wurde schon benutzt. Schreib uns gern an yusuf@kolac-digital.de.');
}
