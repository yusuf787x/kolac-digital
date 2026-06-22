import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { buildContactNotificationEmail } from '@/lib/email-templates';

export const runtime = 'nodejs';

interface Body {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  source?: string;
  /** Honeypot Feld. Wenn gefüllt, ist es ein Bot. */
  website?: string;
}

/**
 * Öffentliche Kontakt-API. Kein Auth Token nötig, dafür Honeypot +
 * minimale Validierung als Spam Schutz.
 */
export async function POST(req: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Mailversand ist gerade nicht konfiguriert.' },
      { status: 500 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: 'Ungültiger Request-Body.' },
      { status: 400 },
    );
  }

  // Honeypot – Bots füllen das versteckte "website" Feld aus.
  if (body.website && body.website.trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  const name = (body.name ?? '').trim();
  const phone = (body.phone ?? '').trim();
  const email = (body.email ?? '').trim();
  const message = (body.message ?? '').trim();
  const source = (body.source ?? 'Webseiten Landingpage').trim();

  if (!name) {
    return NextResponse.json({ error: 'Bitte Namen angeben.' }, { status: 400 });
  }
  if (!phone && !email) {
    return NextResponse.json(
      { error: 'Bitte Telefon oder E-Mail angeben.' },
      { status: 400 },
    );
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: 'E-Mail Adresse ist ungültig.' },
      { status: 400 },
    );
  }

  const tpl = buildContactNotificationEmail({
    name,
    phone,
    email,
    message,
    source,
  });

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const to = process.env.CONTACT_TO_EMAIL || 'yusuf@kolac-digital.de';
    const result = await resend.emails.send({
      from: tpl.from,
      to,
      replyTo: tpl.replyTo,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message ?? 'Versandfehler' },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, id: result.data?.id });
  } catch (err) {
    console.error('Contact send error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
