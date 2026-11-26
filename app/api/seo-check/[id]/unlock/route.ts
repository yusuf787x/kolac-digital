import { NextResponse, after } from 'next/server';
import { Resend } from 'resend';
import { hitRateLimit } from '@/lib/portal/rate-limit';
import { isValidEmail, normalizeEmail } from '@/lib/portal/access';
import { leadNotificationEmail, reportEmail } from '@/lib/seo-check/emails';
import { clientIp, loadCheck, saveLead, type StoredLead } from '@/lib/seo-check/store';
import type { SeoCheckResponse } from '@/lib/seo-check/types';
import { BRANCHEN, WEBSITE_ALTER, type Branche, type WebsiteAlter } from '@/lib/seo-check/funnel';
import { onLeadCaptured } from '@/lib/seo-check/lead-hooks';
import { upsertLeadAkte } from '@/lib/crm-server';
import { startNewsletterOptIn } from '@/lib/newsletter';
import { emailProblem, phoneProblem } from '@/lib/seo-check/contact-check';
import { emailDomainIsDead } from '@/lib/seo-check/email-dns';

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
    /** Freiwillige Newsletter-Einwilligung, wird per Bestätigungsmail bestätigt. */
    newsletter?: boolean;
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
  const mailProblem = emailProblem(email) ?? (isValidEmail(email) ? null : 'Die E-Mail-Adresse sieht nicht vollständig aus. Bitte prüf sie noch einmal.');
  if (mailProblem) return NextResponse.json({ error: mailProblem, field: 'email' }, { status: 400 });
  const telProblem = phoneProblem(phone);
  if (telProblem) return NextResponse.json({ error: telProblem, field: 'phone' }, { status: 400 });
  if (await emailDomainIsDead(email).catch(() => false)) {
    return NextResponse.json(
      { error: 'An diese E-Mail-Adresse können keine Mails zugestellt werden. Bitte prüf die Schreibweise nach dem @.', field: 'email' },
      { status: 400 },
    );
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
  // Testmodus (?test=1): Freischalten wie echt, aber ohne Mails und ohne Meldung an Meta.
  const firstUnlock = !stored.lead && !stored.test;
  await saveLead(id, lead);

  if (firstUnlock && !process.env.RESEND_API_KEY) console.error('SEO-Check: RESEND_API_KEY fehlt, keine Kontakt-Mail an Yusuf.');
  if (firstUnlock && process.env.RESEND_API_KEY) {
    after(async () => {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const notify = leadNotificationEmail(id, lead, stored.result);
      const report = reportEmail(id, lead, stored.result);
      const results = await Promise.allSettled([
        resend.emails.send({ ...notify, to: process.env.CONTACT_TO_EMAIL || 'yusuf@kolac-digital.de' }),
        resend.emails.send({ ...report, to: email }),
      ]);
      // Resend meldet Fehler meist als Rückgabewert, nicht als Ausnahme.
      results.forEach((r, i) => {
        const what = i === 0 ? 'Kontakt-Mail an Yusuf' : 'Bericht-Mail an Besucher';
        if (r.status === 'rejected') console.error(`SEO-Check ${what}:`, r.reason);
        else if (r.value?.error) console.error(`SEO-Check ${what}:`, r.value.error);
      });
    });
  }
  if (firstUnlock) {
    const ctx = {
      ip: clientIp(req) || undefined,
      userAgent: req.headers.get('user-agent') ?? undefined,
      clickSeenAtMs: typeof stored.createdAt?.toMillis === 'function' ? stored.createdAt.toMillis() : undefined,
    };
    after(() => onLeadCaptured(id, lead, ctx).catch((err) => console.error('SEO-Check Lead-Hook:', err)));
    // Kundenakte: Kontakt als Lead anlegen oder an die bestehende Akte hängen,
    // dazu eine fällige Aufgabe „anrufen“ (Skript steht in der Akte).
    after(async () => {
      await upsertLeadAkte(
        { company, name, email, phone, website: stored.result.domain, source: 'SEO-Check', branche: branche ?? undefined, wantsCall: lead.wantsCall },
        {
          type: 'notiz',
          text: `SEO-Check freigeschaltet: ${stored.result.domain}, ${stored.result.score}/100${lead.wantsCall ? ', möchte einen Rückruf' : ''}${branche ? `, Branche: ${branche}` : ''}`,
        },
        { text: 'SEO-Check freigeschaltet: anrufen und Termin legen (Anruf-Leitfaden in der Akte)' },
      );
    });
  }

  // Newsletter nur mit Häkchen und nie im Testmodus; erst die Bestätigungsmail macht die Anmeldung gültig.
  if (body.newsletter === true && !stored.test) {
    const ip = clientIp(req) ?? '';
    const masked = ip.includes('.') ? ip.replace(/\.\d+$/, '.0') : ip.split(':').slice(0, 4).join(':');
    after(() =>
      startNewsletterOptIn({ email, name, source: 'seo-check', sourceId: id, ip: masked }).catch((err) => console.error('Newsletter:', err)),
    );
  }

  const response: SeoCheckResponse = { id, owner: false, unlocked: true, result: stored.result, ...(stored.test ? { test: true } : {}) };
  return NextResponse.json(response);
}
