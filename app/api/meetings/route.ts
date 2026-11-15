import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { adminDb } from '@/lib/firebase-admin';
import { asTestMail, TEST_RECIPIENT } from '@/lib/email-test';
import { authenticate, authErrorResponse } from '@/lib/server-auth';
import { buildMeetingMail } from '@/lib/meetings/emails';
import { CALENDAR_SCOPE } from '@/lib/meetings/server/calendar';
import { anredeOf, syncMeetings, targetState } from '@/lib/meetings/server/sync';
import {
  MAIL_KINDS,
  type Anrede,
  type MailKind,
  type Meeting,
  type MeetingSettings,
} from '@/lib/meetings/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Termin-Erinnerungen fürs Dashboard (nur Inhaber).
 *  GET                                   Termine, Einstellungen, Stand des Abgleichs
 *  POST { action: 'sync' }               Kalender jetzt abgleichen
 *  POST { action: 'update', id, ... }    disabled / note / anrede eines Termins
 *  POST { action: 'settings', ... }      enabled / bookingUrl / defaultAnrede
 *  POST { action: 'preview', id, kind }  fertige Mail für den ersten Gast
 *  POST { action: 'test', id, kind }     dieselbe Mail als Test an Yusuf
 */

const db = () => adminDb();

async function loadSettings(): Promise<MeetingSettings> {
  return ((await db().collection('settings').doc('config').get()).data() ?? {}) as MeetingSettings;
}

export async function GET(req: Request) {
  const errResp = authErrorResponse(await authenticate(req));
  if (errResp) return errResp;

  const now = Date.now();
  const [snap, settings, stateSnap, authSnap] = await Promise.all([
    db().collection('meetings').where('endAt', '>=', now - 12 * 3600 * 1000).get(),
    loadSettings(),
    db().collection('settings').doc('meeting_sync').get(),
    db().collection('settings').doc('google_auth').get(),
  ]);
  const meetings = snap.docs
    .map((d) => d.data() as Meeting)
    .sort((a, b) => a.startAt - b.startAt);
  const st = stateSnap.data() ?? {};
  const auth = authSnap.data();
  const scopes: string[] = Array.isArray(auth?.scopes) ? auth.scopes : [];

  return NextResponse.json({
    meetings,
    settings: {
      meetingRemindersEnabled: !!settings.meetingRemindersEnabled,
      meetingRemindersSince: settings.meetingRemindersSince ?? null,
      meetingBookingUrl: settings.meetingBookingUrl ?? '',
      meetingDefaultAnrede: settings.meetingDefaultAnrede ?? 'du',
    },
    state: {
      lastRunAt: st.lastRunAt ?? null,
      lastRunOk: st.lastRunOk ?? null,
      lastError: st.lastError ?? '',
      watchExpiration: st.watch?.expiration ?? null,
      watchError: st.watchError ?? '',
    },
    google: {
      connected: !!auth?.refreshToken,
      email: auth?.connectedEmail ?? '',
      calendar: scopes.includes(CALENDAR_SCOPE),
    },
  });
}

interface PostBody {
  action?: string;
  id?: string;
  kind?: MailKind;
  disabled?: boolean;
  note?: string;
  anrede?: Anrede;
  enabled?: boolean;
  bookingUrl?: string;
  defaultAnrede?: Anrede;
}

export async function POST(req: Request) {
  const errResp = authErrorResponse(await authenticate(req));
  if (errResp) return errResp;

  let body: PostBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body.' }, { status: 400 });
  }

  switch (body.action) {
    case 'sync': {
      const result = await syncMeetings('dashboard');
      return NextResponse.json(result, { status: result.ok ? 200 : 500 });
    }

    case 'update': {
      if (!body.id) return NextResponse.json({ error: 'id fehlt.' }, { status: 400 });
      const ref = db().collection('meetings').doc(body.id);
      if (!(await ref.get()).exists) {
        return NextResponse.json({ error: 'Termin nicht gefunden.' }, { status: 404 });
      }
      const patch: Partial<Meeting> = {};
      if (typeof body.disabled === 'boolean') patch.disabled = body.disabled;
      if (typeof body.note === 'string') patch.note = body.note.slice(0, 600);
      if (body.anrede === 'du' || body.anrede === 'sie') patch.anrede = body.anrede;
      await ref.set(patch, { merge: true });
      const result = await syncMeetings('dashboard', { onlyId: body.id });
      return NextResponse.json(result, { status: result.ok ? 200 : 500 });
    }

    case 'settings': {
      const current = await loadSettings();
      const patch: MeetingSettings = {};
      if (typeof body.enabled === 'boolean') {
        patch.meetingRemindersEnabled = body.enabled;
        if (body.enabled && !current.meetingRemindersSince) patch.meetingRemindersSince = Date.now();
      }
      if (typeof body.bookingUrl === 'string') {
        const url = body.bookingUrl.trim();
        if (url && !/^https:\/\/\S+$/.test(url)) {
          return NextResponse.json({ error: 'Der Buchungslink muss mit https:// beginnen.' }, { status: 400 });
        }
        patch.meetingBookingUrl = url;
      }
      if (body.defaultAnrede === 'du' || body.defaultAnrede === 'sie') {
        patch.meetingDefaultAnrede = body.defaultAnrede;
      }
      await db().collection('settings').doc('config').set(patch, { merge: true });
      const result = await syncMeetings('dashboard');
      return NextResponse.json(result, { status: result.ok ? 200 : 500 });
    }

    case 'preview':
    case 'test': {
      if (!body.id || !body.kind || !MAIL_KINDS.includes(body.kind)) {
        return NextResponse.json({ error: 'id oder kind fehlt.' }, { status: 400 });
      }
      const snap = await db().collection('meetings').doc(body.id).get();
      if (!snap.exists) return NextResponse.json({ error: 'Termin nicht gefunden.' }, { status: 404 });
      const m = snap.data() as Meeting;
      const settings = await loadSettings();
      const guest = m.guests[0];
      if (!guest) return NextResponse.json({ error: 'Kein externer Gast.' }, { status: 400 });

      const now = Date.now();
      const sendAt =
        m.mails[body.kind]?.sendAt ?? targetState(body.kind, m, settings, now).sendAt ?? now;
      const mail = buildMeetingMail({
        kind: body.kind,
        anrede: anredeOf(m, settings),
        name: guest.name,
        company: guest.company,
        startAt: new Date(m.startAt),
        endAt: new Date(m.endAt),
        sendAt: new Date(sendAt),
        meetUrl: m.meetUrl,
        note: body.kind === 'dayBefore' ? m.note : undefined,
        bookingUrl: settings.meetingBookingUrl || undefined,
      });

      if (body.action === 'preview') {
        return NextResponse.json({ subject: mail.subject, from: mail.from, to: guest.email, html: mail.html });
      }
      if (!process.env.RESEND_API_KEY) {
        return NextResponse.json({ error: 'RESEND_API_KEY ist nicht gesetzt.' }, { status: 500 });
      }
      const test = asTestMail(mail);
      const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
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
      return NextResponse.json({ sentTo: TEST_RECIPIENT });
    }

    default:
      return NextResponse.json({ error: 'Unbekannte Aktion.' }, { status: 400 });
  }
}
