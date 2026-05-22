import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { buildDealEmail } from '@/lib/email-templates';
import { authenticate, authErrorResponse } from '@/lib/server-auth';

export const runtime = 'nodejs';

interface Body {
  to: string;
  subject: string;
  body: string;
}

export async function POST(req: Request) {
  const auth = await authenticate(req);
  const errResp = authErrorResponse(auth);
  if (errResp) return errResp;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'RESEND_API_KEY ist nicht gesetzt.' },
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

  if (!body.to || !body.subject || !body.body) {
    return NextResponse.json(
      { error: 'Empfänger, Betreff und Nachricht sind Pflichtfelder.' },
      { status: 400 },
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const tpl = buildDealEmail({ subject: body.subject, body: body.body });

  try {
    const result = await resend.emails.send({
      from: tpl.from,
      to: body.to,
      replyTo: tpl.replyTo,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message ?? 'Resend Fehler' },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, id: result.data?.id });
  } catch (err) {
    console.error('Resend send error (deal):', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
