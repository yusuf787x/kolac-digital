import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { buildReminderEmail } from '@/lib/email-templates';
import { authenticate, authErrorResponse } from '@/lib/server-auth';

export const runtime = 'nodejs';

interface Body {
  to: string;
  customerName: string;
  invoiceNumber: string;
  dueDate: string;
  daysOverdue: number;
  remainingAmount: number;
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
    return NextResponse.json({ error: 'Ungültiger Request-Body.' }, { status: 400 });
  }

  if (!body.to || !body.invoiceNumber) {
    return NextResponse.json(
      { error: 'Pflichtfelder fehlen.' },
      { status: 400 },
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const tpl = buildReminderEmail({
    customerName: body.customerName,
    invoiceNumber: body.invoiceNumber,
    dueDate: body.dueDate,
    daysOverdue: body.daysOverdue,
    remainingAmount: body.remainingAmount,
  });

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
    console.error('Resend send error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
