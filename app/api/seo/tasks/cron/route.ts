import { NextResponse } from 'next/server';
import { safe } from '@/lib/seo/server/admin-route';
import { sendTaskReminderEmail } from '@/lib/seo/server/emails';
import { listOpenTasks, pickReminders } from '@/lib/seo/server/tasks';
import { todayIso } from '@/lib/seo/months';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Taeglicher Cron (vercel.json, 6 Uhr UTC): erinnert Yusuf per Mail an
 * geplante Punkte aus den Kunden-Plaenen, die bald faellig oder
 * ueberfaellig sind. Schutz: CRON_SECRET wie /api/seo/cron.
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

  // Wochentag in deutscher Zeit (0 = Sonntag, 1 = Montag)
  const today = todayIso();
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const tasks = await listOpenTasks(today);
  const due = pickReminders(tasks, weekday);
  if (due.length) await sendTaskReminderEmail(due);
  return NextResponse.json({ ok: true, open: tasks.length, reminded: due.length });
}

export const GET = safe(handleGET);
