import { NextResponse, after } from 'next/server';
import { Resend } from 'resend';
import { hitRateLimit } from '@/lib/portal/rate-limit';
import { isValidEmail, normalizeEmail } from '@/lib/portal/access';
import { leadNotificationEmail, reportEmail } from '@/lib/seo-check/emails';
import { clientIp, loadCheck, saveLead, type StoredLead } from '@/lib/seo-check/store';
import type { SeoCheckResponse } from '@/lib/seo-check/types';
import { BRANCHEN, WEBSITE_ALTER, type Branche, type WebsiteAlter } from '@/lib/seo-check/funnel';
import { onLeadCaptured } from '@/lib/seo-check/lead-hooks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Bericht freischalten: Besucher gibt Name, E-Mail, Telefon und Branche an
 * und bestaetigt, fuer ein Unternehmen anzufragen. Dafuer gibt es den ganzen
 * Bericht (alle Massnahmen, Pruefpunkte, Suchbegriffe). Yusuf wird per Mail
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
    branche?: string;
    websiteAlter?: string;
    business?: boolean;
    /** Optionales Häkchen „Erfolgsmessung an Meta“ (nur sichtbar, wenn Pixel-ID und Schlüssel gesetzt sind). */
    measureConsent?: boolean;
  };

  const stored = await loadCheck(id).catch(() => null);
  if (!stored) return NextResponse.json({ error: 'Dieser Check wurde nicht gefunden.' }, { status: 404 });

  // Honeypot: Bots bekommen eine neutrale Antwort ohne Freischaltung.
  if (body.website && body.website.trim()) return NextResponse.json({ error: 'Bitte versuch es erneut.' }, { status: 400 });

  const name = (body.name ?? '').trim().slice(0, 120);
  const email = normalizeEmail(body.email ?? '');
  const phone = (body.phone ?? '').trim().slice(0, 40);
  const company = (body.company ?? '').trim().slice(0, 160);
  if (!name) return NextResponse.json({ error: 'Bitte gib deinen Namen an.', field: 'name' }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ error: 'Die E-Mail-Adresse sieht nicht vollständig aus. Bitte prüf sie noch einmal.', field: 'email' }, { status: 400 });
  if (!phone) {
    return NextResponse.json(
      { error: 'Bitte gib deine Telefonnummer an. Wir rufen nur an, um dein Ergebnis mit dir durchzugehen.', field: 'phone' },
      { status: 400 },
    );
  }
  if (!/^[+\d][\d\s/()-]{5,}$/.test(phone)) {
    return NextResponse.json({ error: 'Die Telefonnummer sieht nicht vollständig aus. Bitte prüf sie noch einmal.', field: 'phone' }, { status: 400 });
  }
  const branche = BRANCHEN.some((b) => b.value === body.branche) ? (body.branche as Branche) : null;
  if (!branche) return NextResponse.json({ error: 'Bitte wähl deine Branche aus.', field: 'branche' }, { status: 400 });
  const websiteAlter = WEBSITE_ALTER.some((w) => w.value === body.websiteAlter) ? (body.websiteAlter as WebsiteAlter) : undefined;
  if (body.business !== true) {
    return NextResponse.json(
      { error: 'Der Check ist für Unternehmen. Bitte bestätige, dass du für ein Unternehmen anfragst.', field: 'business' },
      { status: 400 },
    );
  }

  const allowed = await hitRateLimit(`seocheck-unlock:${clientIp(req)}`, 10, 24 * 3600).catch(() => true);
  if (!allowed) return NextResponse.json({ error: 'Zu viele Anfragen. Bitte versuch es morgen erneut.' }, { status: 429 });

  const lead: StoredLead = {
    name,
    email,
    phone,
    company: company || undefined,
    wantsCall: !!body.wantsCall,
    at: new Date().toISOString(),
    branche,
    websiteAlter,
    business: true,
    source: stored.source,
    ...(body.measureConsent === true ? { measureConsent: true } : {}),
  };
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
  if (firstUnlock) {
    const ctx = {
      ip: clientIp(req) || undefined,
      userAgent: req.headers.get('user-agent') ?? undefined,
      clickSeenAtMs: typeof stored.createdAt?.toMillis === 'function' ? stored.createdAt.toMillis() : undefined,
    };
    after(() => onLeadCaptured(id, lead, ctx).catch((err) => console.error('SEO-Check Lead-Hook:', err)));
  }

  const response: SeoCheckResponse = { id, owner: false, unlocked: true, result: stored.result };
  return NextResponse.json(response);
}
