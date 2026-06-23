import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Täglicher Cron: prüft alle versendeten Verträge, ob sie überfällig
 * sind (Versanddatum + reminderDays liegt in der Vergangenheit) und
 * schickt eine Erinnerungs-Mail an yusuf@kolac-digital.de. Vermeidet
 * Doppel-Sends durch lastReminderAt (mindestens 24h Abstand).
 *
 * Wird in vercel.json als Cron registriert. Schutz: CRON_SECRET über
 * Bearer-Header (Vercel-Cron setzt den Header automatisch, wenn der
 * Secret in der Projekt-Config hinterlegt ist).
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const got = req.headers.get('authorization') ?? '';
    if (got !== `Bearer ${expected}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }
  }

  const db = adminDb();
  // Nur eine where-Klausel — Status==sent. Weitere Filter clientseitig,
  // damit kein Composite-Index nötig ist.
  const snap = await db
    .collection('contracts')
    .where('status', '==', 'sent')
    .get();

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const checked = snap.size;
  let sent = 0;
  const errors: string[] = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (data.reminderEnabled !== true) continue;
    const sentAtMs = data.sentAt?.toMillis?.() ?? 0;
    if (!sentAtMs) continue;
    const reminderDays = Number(data.reminderDays ?? 7);
    const overdueSince = sentAtMs + reminderDays * dayMs;
    if (now < overdueSince) continue;

    const lastReminderMs = data.lastReminderAt?.toMillis?.() ?? 0;
    if (lastReminderMs && now - lastReminderMs < dayMs) continue;

    try {
      await sendReminder({
        title: data.title ?? 'Vertrag',
        customerCompany: data.customerSnapshot?.company ?? '',
        sentAt: new Date(sentAtMs),
        daysSinceSent: Math.floor((now - sentAtMs) / dayMs),
        contractId: docSnap.id,
      });
      const audit = Array.isArray(data.audit) ? data.audit : [];
      audit.push({
        at: Timestamp.now(),
        event: 'reminder_sent',
      });
      await docSnap.ref.update({
        lastReminderAt: Timestamp.now(),
        audit,
      });
      sent++;
    } catch (err) {
      console.error('Reminder failed for', docSnap.id, err);
      errors.push(`${docSnap.id}: ${(err as Error).message}`);
    }
  }

  return NextResponse.json({ ok: true, checked, sent, errors });
}

async function sendReminder(opts: {
  title: string;
  customerCompany: string;
  sentAt: Date;
  daysSinceSent: number;
  contractId: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY nicht gesetzt.');
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const baseUrl =
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '');
  const link = baseUrl
    ? `${baseUrl}/dashboard/vertraege/${opts.contractId}`
    : '';

  await resend.emails.send({
    from: 'Kolac Digital <yusuf@kolac-digital.de>',
    to: 'yusuf@kolac-digital.de',
    subject: `⏰ Vertrag noch nicht signiert: ${opts.title}`,
    html: `
      <div style="font-family:-apple-system,sans-serif;color:#0a0a0a;line-height:1.6;font-size:15px;">
        <p>Der Vertrag <strong>${escapeHtml(opts.title)}</strong> wurde vor ${opts.daysSinceSent} Tagen verschickt und ist noch nicht signiert.</p>
        <p>Kunde: <strong>${escapeHtml(opts.customerCompany)}</strong></p>
        ${
          link
            ? `<p><a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600;">Im Dashboard öffnen</a></p>`
            : ''
        }
        <p style="color:#6b7280;font-size:13px;">Wenn der Vertrag inzwischen außerhalb des Systems signiert wurde, einfach im Dashboard "Als signiert markieren" anklicken — dann hörst du diese Erinnerung auf.</p>
      </div>
    `,
    text: [
      `Vertrag ${opts.title} ist seit ${opts.daysSinceSent} Tagen unsigniert.`,
      `Kunde: ${opts.customerCompany}`,
      link ? `Im Dashboard öffnen: ${link}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  });
}

function escapeHtml(s: string): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
