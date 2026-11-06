import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { EMAIL_PREVIEWS } from '@/lib/email-previews';
import { asTestMail, TEST_RECIPIENT } from '@/lib/email-test';
import { authenticate, authErrorResponse } from '@/lib/server-auth';

export const runtime = 'nodejs';

/**
 * Mail-Vorlagen mit Beispieldaten (nur Inhaber).
 *  GET                      Liste aller Vorlagen
 *  POST { id }              fertige Mail (Betreff, Absender, HTML)
 *  POST { id, send: true }  zusätzlich als Testmail an Yusuf schicken
 */
export async function GET(req: Request) {
  const errResp = authErrorResponse(await authenticate(req));
  if (errResp) return errResp;
  return NextResponse.json({
    templates: EMAIL_PREVIEWS.map(({ id, group, label, when }) => ({ id, group, label, when })),
  });
}

export async function POST(req: Request) {
  const errResp = authErrorResponse(await authenticate(req));
  if (errResp) return errResp;

  let body: { id?: string; send?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body.' }, { status: 400 });
  }
  const def = EMAIL_PREVIEWS.find((p) => p.id === body.id);
  if (!def) return NextResponse.json({ error: 'Vorlage nicht gefunden.' }, { status: 404 });

  const mail = def.build();
  if (!body.send) {
    return NextResponse.json({ subject: mail.subject, from: mail.from, html: mail.html });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY ist nicht gesetzt.' }, { status: 500 });
  }
  const test = asTestMail(mail);
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: test.from,
    to: TEST_RECIPIENT,
    replyTo: test.replyTo,
    subject: test.subject,
    html: test.html,
    text: test.text,
  });
  if (result.error) {
    return NextResponse.json({ error: result.error.message ?? 'Resend Fehler' }, { status: 502 });
  }
  return NextResponse.json({ subject: mail.subject, from: mail.from, html: mail.html, sentTo: TEST_RECIPIENT });
}
