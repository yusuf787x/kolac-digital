import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { safe } from '@/lib/seo/server/admin-route';
import { sendOutreachReminderEmail, type OutreachReminderItem } from '@/lib/seo/server/emails';
import { todayIso } from '@/lib/seo/months';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DAY_MS = 86_400_000;

/**
 * Täglicher Cron (vercel.json, 6 Uhr UTC): Mail an Yusuf mit den
 * Outreach-Betrieben, deren Erinnerung (remindAt) heute fällig ist.
 * Überfällige stehen in jeder dieser Mails mit drin und kommen zusätzlich
 * jeden Montag, bis sie erledigt oder verschoben sind (wie die Aufgaben-
 * Erinnerung im Kundenportal). Schutz: CRON_SECRET.
 */
async function handleGET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    if ((req.headers.get('authorization') ?? '') !== `Bearer ${expected}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'CRON_SECRET nicht gesetzt.' }, { status: 500 });
  }

  const today = todayIso();
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const snap = await adminDb().collection('outreachLeads').where('remindAt', '<=', today).get();
  const items: OutreachReminderItem[] = snap.docs
    .map((d) => d.data())
    .filter((l) => typeof l.remindAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(l.remindAt))
    .map((l) => ({
      name: String(l.name ?? 'Unbekannter Betrieb'),
      remindAt: l.remindAt as string,
      note: (l.remindNote as string | undefined) || undefined,
      status: String(l.status ?? ''),
      daysLeft: Math.round((Date.parse(`${l.remindAt}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / DAY_MS),
    }))
    .sort((a, b) => a.remindAt.localeCompare(b.remindAt));

  const dueToday = items.some((i) => i.daysLeft === 0);
  const send = dueToday || (weekday === 1 && items.length > 0);
  if (send) await sendOutreachReminderEmail(items);
  return NextResponse.json({ ok: true, due: items.length, mailed: send });
}

export const GET = safe(handleGET);
