import { NextResponse, after } from 'next/server';
import { Resend } from 'resend';
import { hitRateLimit } from '@/lib/portal/rate-limit';
import { isValidEmail, normalizeEmail } from '@/lib/portal/access';
import { leadNotificationEmail, reportEmail } from '@/lib/seo-check/emails';
import { clientIp, loadCheck, saveLead, type StoredLead } from '@/lib/seo-check/store';
import type { SeoCheckResponse } from '@/lib/seo-check/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Bericht freischalten: Besucher gibt Name und E-Mail (Telefon optional),
 * bekommt dafuer die Massnahmen und Suchbegriffe. Yusuf wird per Mail
 * benachrichtigt, der Besucher bekommt den Link zu seinem Bericht.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    wantsCall?: boolean;
    website?: string;
  };

  const stored = await loadCheck(id).catch(() => null);
  if (!stored) return NextResponse.json({ error: 'Dieser Check wurde nicht gefunden.' }, { status: 404 });

  // Honeypot: Bots bekommen eine neutrale Antwort ohne Freischaltung.
  if (body.website && body.website.trim()) return NextResponse.json({ error: 'Bitte versuch es erneut.' }, { status: 400 });

  const name = (body.name ?? '').trim().slice(0, 120);
  const email = normalizeEmail(body.email ?? '');
  const phone = (body.phone ?? '').trim().slice(0, 40);
  const company = (body.company ?? '').trim().slice(0, 160);
  if (!name) return NextResponse.json({ error: 'Bitte gib deinen Namen an.' }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ error: 'Bitte gib eine gültige E-Mail-Adresse an.' }, { status: 400 });
  if (phone && !/^[+\d][\d\s/()-]{5,}$/.test(phone)) {
    return NextResponse.json({ error: 'Bitte prüf die Telefonnummer.' }, { status: 400 });
  }

  const allowed = await hitRateLimit(`seocheck-unlock:${clientIp(req)}`, 10, 24 * 3600).catch(() => true);
  if (!allowed) return NextResponse.json({ error: 'Zu viele Anfragen. Bitte versuch es morgen erneut.' }, { status: 429 });

  const lead: StoredLead = { name, email, phone: phone || undefined, company: company || undefined, wantsCall: !!body.wantsCall, at: new Date().toISOString() };
  const firstUnlock = !stored.lead;
  await saveLead(id, lead);

  if (firstUnlock && process.env.RESEND_API_KEY) {
    after(async () => {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const notify = leadNotificationEmail(id, lead, stored.result);
      const report = reportEmail(id, lead, stored.result);
      const results = await Promise.allSettled([
        resend.emails.send({ ...notify, to: process.env.CONTACT_TO_EMAIL || 'yusuf@kolac-digital.de' }),
        resend.emails.send({ ...report, to: email }),
      ]);
      for (const r of results) if (r.status === 'rejected') console.error('SEO-Check Mail:', r.reason);
    });
  }

  const response: SeoCheckResponse = { id, owner: false, unlocked: true, result: stored.result };
  return NextResponse.json(response);
}
