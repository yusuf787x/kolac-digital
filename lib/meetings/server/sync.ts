import 'server-only';
import { createHash } from 'crypto';
import type { calendar_v3 } from 'googleapis';
import { Resend } from 'resend';
import { adminDb } from '@/lib/firebase-admin';
import { buildMeetingMail } from '../emails';
import {
  MAIL_KINDS,
  type MailKind,
  type MailState,
  type Meeting,
  type MeetingGuest,
  type MeetingSettings,
} from '../types';
import {
  calendarClient,
  CalendarSetupError,
  externalGuests,
  getEvent,
  hasDeclinedOnly,
  isCandidate,
  listUpcomingEvents,
  looksBooked,
  meetUrlOf,
  startWatch,
  stopWatch,
  type RawGuest,
} from './calendar';

/**
 * Gleicht den Google Kalender mit der Collection `meetings` ab und plant
 * die Erinnerungs-Mails bei Resend ein (scheduledAt). Läuft täglich per
 * Cron, bei jeder Kalender-Änderung per Webhook und beim Öffnen der Seite.
 *
 * Idempotent: Jede Mail hat einen Fingerabdruck aus Inhalt und
 * Zeitpunkt. Ändert sich der Termin (verschoben, abgesagt, Notiz neu),
 * wird die eingeplante Mail bei Resend storniert und neu eingeplant.
 * Eine Sperre in settings/meeting_sync verhindert parallele Läufe.
 */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
/** So weit schaut der Abgleich in den Kalender. */
const LOOKAHEAD = 35 * DAY;
/** Resend plant höchstens 30 Tage im Voraus. */
const SCHEDULE_HORIZON = 29 * DAY;
const LOCK_MS = 2 * MIN;

export interface SyncResult {
  ok: boolean;
  busy?: boolean;
  code?: string;
  error?: string;
  meetings: number;
  scheduled: number;
  sent: number;
  cancelled: number;
}

const db = () => adminDb();
const stateRef = () => db().collection('settings').doc('meeting_sync');

export async function syncMeetings(reason: string, opts: { onlyId?: string } = {}): Promise<SyncResult> {
  const empty: SyncResult = { ok: true, meetings: 0, scheduled: 0, sent: 0, cancelled: 0 };

  const acquired = await db().runTransaction(async (tx) => {
    const s = (await tx.get(stateRef())).data() ?? {};
    if ((s.lockedUntil ?? 0) > Date.now()) {
      tx.set(stateRef(), { rerun: true }, { merge: true });
      return false;
    }
    tx.set(stateRef(), { lockedUntil: Date.now() + LOCK_MS, rerun: false }, { merge: true });
    return true;
  });
  if (!acquired) return { ...empty, busy: true };

  let result: SyncResult = empty;
  try {
    for (let round = 0; round < 3; round++) {
      result = await runOnce(round === 0 ? opts : {});
      const again = await db().runTransaction(async (tx) => {
        const s = (await tx.get(stateRef())).data() ?? {};
        if (!s.rerun) return false;
        tx.set(stateRef(), { rerun: false, lockedUntil: Date.now() + LOCK_MS }, { merge: true });
        return true;
      });
      if (!again) break;
    }
    await stateRef().set(
      { lockedUntil: 0, lastRunAt: Date.now(), lastRunOk: true, lastError: '', lastReason: reason },
      { merge: true },
    );
    return result;
  } catch (err) {
    const code = err instanceof CalendarSetupError ? err.code : 'error';
    const message = googleErrorText(err);
    console.error('Meeting sync failed:', err);
    await stateRef().set(
      { lockedUntil: 0, lastRunAt: Date.now(), lastRunOk: false, lastError: message, lastReason: reason },
      { merge: true },
    );
    return { ...empty, ok: false, code, error: message };
  }
}

/** Lesbare Fehlermeldung, auch für "Calendar API nicht aktiviert". */
function googleErrorText(err: unknown): string {
  const e = err as { message?: string; errors?: Array<{ message?: string }> };
  const msg = e.errors?.[0]?.message ?? e.message ?? String(err);
  if (/has not been used in project|is disabled/i.test(msg)) {
    return 'Die Google Calendar API ist im Google-Cloud-Projekt noch nicht aktiviert. ' + msg;
  }
  return msg;
}

async function loadSettings(): Promise<MeetingSettings> {
  const snap = await db().collection('settings').doc('config').get();
  return (snap.data() ?? {}) as MeetingSettings;
}

async function runOnce(opts: { onlyId?: string }): Promise<SyncResult> {
  const settings = await loadSettings();
  const cal = await calendarClient();
  const now = Date.now();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const counts = { meetings: 0, scheduled: 0, sent: 0, cancelled: 0 };

  const existingSnap = await db()
    .collection('meetings')
    .where('endAt', '>=', now - 2 * HOUR)
    .get();
  const existing = new Map(existingSnap.docs.map((d) => [d.id, d.data() as Meeting]));

  const events: calendar_v3.Schema$Event[] = opts.onlyId
    ? [await getEvent(cal, opts.onlyId)].filter((e): e is calendar_v3.Schema$Event => !!e)
    : await listUpcomingEvents(cal, new Date(now - 2 * HOUR), new Date(now + LOOKAHEAD));

  const seen = new Set<string>();
  const guestCache = new Map<string, MeetingGuest>();

  const handle = async (id: string, ev: calendar_v3.Schema$Event | null, prev: Meeting | undefined) => {
    const next = await buildMeeting(id, ev, prev, guestCache, now);
    if (!next) return;
    for (const kind of MAIL_KINDS) {
      const before = prev?.mails?.[kind];
      const after = await reconcile(kind, next, before, settings, now, resend);
      next.mails[kind] = after;
      if (after.status === 'scheduled' && before?.fingerprint !== after.fingerprint) counts.scheduled++;
      if (after.status === 'sent' && before?.status !== 'sent') counts.sent++;
      if (before?.status === 'scheduled' && after.status !== 'scheduled' && after.status !== 'sent') counts.cancelled++;
    }
    await db().collection('meetings').doc(id).set(stripUndefined(next));
    counts.meetings++;
  };

  for (const ev of events) {
    if (!ev.id) continue;
    const prev = existing.get(ev.id);
    if (!prev && (ev.status === 'cancelled' || !isCandidate(ev))) continue;
    seen.add(ev.id);
    await handle(ev.id, ev, prev);
  }

  // Bekannte Termine, die nicht mehr in der Liste stehen: gelöscht oder
  // weit verschoben. Einzeln nachsehen.
  for (const [id, prev] of existing) {
    if (seen.has(id)) continue;
    if (opts.onlyId && id !== opts.onlyId) continue;
    const ev = await getEvent(cal, id);
    await handle(id, ev, prev);
  }

  if (!opts.onlyId) await ensureWatch(cal);
  return { ok: true, ...counts };
}

// ---------------------------------------------------------------------
// Termin aus dem Event bauen
// ---------------------------------------------------------------------

async function buildMeeting(
  id: string,
  ev: calendar_v3.Schema$Event | null,
  prev: Meeting | undefined,
  cache: Map<string, MeetingGuest>,
  now: number,
): Promise<Meeting | null> {
  if (!ev && !prev) return null;

  const userFields = {
    disabled: prev?.disabled,
    note: prev?.note,
    anrede: prev?.anrede,
  };

  if (!ev || ev.status === 'cancelled' || !isCandidate(ev)) {
    if (!prev) return null;
    const startAt = ev?.start?.dateTime ? Date.parse(ev.start.dateTime) : prev.startAt;
    const endAt = ev?.end?.dateTime ? Date.parse(ev.end.dateTime) : prev.endAt;
    return { ...prev, startAt, endAt, status: 'cancelled', mails: { ...prev.mails }, lastSyncedAt: now };
  }

  const raw = externalGuests(ev);
  const guests: MeetingGuest[] = [];
  for (const g of raw) {
    const known = prev?.guests.find((p) => p.email === g.email && p.source !== 'google');
    guests.push(known ?? (await resolveGuest(g, cache)));
  }

  return {
    id,
    title: ev.summary ?? '',
    startAt: Date.parse(ev.start!.dateTime!),
    endAt: ev.end?.dateTime ? Date.parse(ev.end.dateTime) : Date.parse(ev.start!.dateTime!) + 30 * MIN,
    bookedAt: ev.created ? Date.parse(ev.created) : (prev?.bookedAt ?? now),
    meetUrl: meetUrlOf(ev),
    calendarUrl: ev.htmlLink ?? '',
    status: hasDeclinedOnly(ev) ? 'declined' : 'active',
    guests,
    selfInvited: prev ? prev.selfInvited : !looksBooked(ev, now),
    ...userFields,
    mails: { ...(prev?.mails ?? {}) },
    firstSeenAt: prev?.firstSeenAt ?? now,
    lastSyncedAt: now,
  };
}

/** Gast in Kunden, Leads und Outreach suchen, damit die Mail Name und Firma kennt. */
async function resolveGuest(g: RawGuest, cache: Map<string, MeetingGuest>): Promise<MeetingGuest> {
  const hit = cache.get(g.email);
  if (hit) return hit;

  const variants = Array.from(new Set([g.email, g.rawEmail]));
  const find = async (coll: string) => {
    const snap = await db().collection(coll).where('email', 'in', variants).limit(1).get();
    return snap.empty ? null : { id: snap.docs[0].id, data: snap.docs[0].data() };
  };

  let guest: MeetingGuest | null = null;
  const customer = await find('customers');
  if (customer) {
    const d = customer.data;
    guest = {
      email: g.email,
      name: [d.firstName, d.lastName].filter(Boolean).join(' ').trim(),
      company: d.company || undefined,
      source: 'kunde',
      sourceId: customer.id,
    };
  }
  if (!guest) {
    const lead = await find('leads');
    if (lead) {
      guest = {
        email: g.email,
        name: (lead.data.contactName ?? '').trim(),
        company: lead.data.company || undefined,
        source: 'lead',
        sourceId: lead.id,
      };
    }
  }
  if (!guest) {
    const o = await find('outreachLeads');
    if (o) {
      guest = {
        email: g.email,
        name: (o.data.contact ?? '').trim(),
        company: o.data.name || undefined,
        source: 'outreach',
        sourceId: o.id,
      };
    }
  }

  const googleName = g.displayName && !g.displayName.includes('@') ? g.displayName.trim() : '';
  if (guest && !guest.name) guest.name = googleName;
  if (!guest) guest = { email: g.email, name: googleName, source: 'google' };

  cache.set(g.email, guest);
  return guest;
}

// ---------------------------------------------------------------------
// Mails planen
// ---------------------------------------------------------------------

type Plan = { sendAt: number } | { skip: string };

function plan(kind: MailKind, m: Meeting, s: MeetingSettings, now: number): Plan {
  const lead = m.startAt - m.bookedAt;
  let sendAt: number;

  if (kind === 'confirm') {
    if (m.selfInvited) return { skip: 'Selbst eingeladen, Google hat die Einladung schon geschickt' };
    const since = s.meetingRemindersSince ?? Number.POSITIVE_INFINITY;
    if (m.bookedAt < since) return { skip: 'Vor dem Einschalten der Automatik gebucht' };
    if (m.startAt - now < 3 * HOUR) return { skip: 'Zu kurzfristig, die Mail 1 Stunde vorher reicht' };
    if (now - m.bookedAt > 2 * DAY) return { skip: 'Buchung ist älter als zwei Tage' };
    // Fester Zeitpunkt, damit der Fingerabdruck stabil bleibt: sofort.
    return { sendAt: Math.max(m.firstSeenAt, since) };
  }
  if (kind === 'fiveDays') {
    // Nur bei langem Vorlauf, sonst käme sie kurz nach der Bestätigung.
    if (lead < 7 * DAY) return { skip: 'Weniger als 7 Tage vorher gebucht' };
    sendAt = m.startAt - 5 * DAY;
    // Verpasst wird nicht nachgeholt, die Mail am Vortag folgt ohnehin.
    if (sendAt < now - 10 * MIN) return { skip: 'Zeitpunkt war schon vorbei' };
    return { sendAt };
  }
  if (kind === 'dayBefore') {
    if (lead < 26 * HOUR) return { skip: 'Kurzfristig gebucht' };
    sendAt = m.startAt - DAY;
    if (sendAt < now - 10 * MIN) {
      if (m.startAt - now > 4 * HOUR) return { sendAt: now };
      return { skip: 'Zeitpunkt war schon vorbei' };
    }
    return { sendAt };
  }
  if (lead < 3 * HOUR) return { skip: 'Kurzfristig gebucht' };
  sendAt = m.startAt - HOUR;
  if (sendAt < now - 10 * MIN) {
    if (m.startAt - now > 15 * MIN) return { sendAt: now };
    return { skip: 'Zeitpunkt war schon vorbei' };
  }
  return { sendAt };
}

function fingerprint(kind: MailKind, m: Meeting, s: MeetingSettings, sendAt: number): string {
  const payload = JSON.stringify({
    kind,
    sendAt: kind === 'confirm' ? 0 : sendAt,
    startAt: m.startAt,
    endAt: m.endAt,
    meetUrl: m.meetUrl,
    guests: m.guests.map((g) => [g.email, g.name, g.company ?? '']),
    anrede: anredeOf(m, s),
    bookingUrl: s.meetingBookingUrl ?? '',
    note: kind === 'dayBefore' ? (m.note ?? '').trim() : '',
  });
  return createHash('sha1').update(payload).digest('hex').slice(0, 16);
}

export function anredeOf(m: Meeting, s: MeetingSettings) {
  return m.anrede ?? s.meetingDefaultAnrede ?? 'du';
}

/** Ziel-Zustand einer Mail, ohne Nebenwirkungen. Auch für die Vorschau im Dashboard. */
export function targetState(kind: MailKind, m: Meeting, s: MeetingSettings, now: number): MailState {
  if (m.status === 'cancelled') return { status: 'off', sendAt: null, reason: 'Termin abgesagt' };
  if (m.status === 'declined') return { status: 'off', sendAt: null, reason: 'Gast hat abgesagt' };
  if (m.disabled) return { status: 'off', sendAt: null, reason: 'Für diesen Termin ausgeschaltet' };
  if (!m.guests.length) return { status: 'off', sendAt: null, reason: 'Kein externer Gast' };
  const p = plan(kind, m, s, now);
  if ('skip' in p) return { status: 'skipped', sendAt: null, reason: p.skip };
  if (p.sendAt - now > SCHEDULE_HORIZON) {
    return { status: 'planned', sendAt: p.sendAt, reason: 'Wird eingeplant, sobald es weniger als 4 Wochen sind' };
  }
  if (!s.meetingRemindersEnabled) return { status: 'planned', sendAt: p.sendAt, reason: 'Automatik ist aus' };
  return { status: 'scheduled', sendAt: p.sendAt };
}

async function reconcile(
  kind: MailKind,
  m: Meeting,
  cur: MailState | undefined,
  s: MeetingSettings,
  now: number,
  resend: Resend,
): Promise<MailState> {
  const next = await reconcileInner(kind, m, cur, s, now, resend);
  return { ...next, seq: next.seq ?? cur?.seq };
}

async function reconcileInner(
  kind: MailKind,
  m: Meeting,
  cur: MailState | undefined,
  s: MeetingSettings,
  now: number,
  resend: Resend,
): Promise<MailState> {
  if (cur?.status === 'sent') return cur;
  if (cur?.status === 'scheduled' && (cur.sendAt ?? 0) <= now) return { ...cur, status: 'sent' };
  // Über die Bestätigung wird nur einmal entschieden.
  if (kind === 'confirm' && cur?.status === 'skipped') return cur;

  const target = targetState(kind, m, s, now);
  const fp = target.status === 'scheduled' ? fingerprint(kind, m, s, target.sendAt!) : undefined;

  if (cur?.status === 'scheduled') {
    if (target.status === 'scheduled' && cur.fingerprint === fp) return cur;
    const cancelled = await cancelAll(resend, cur.resendIds ?? []);
    if (!cancelled) return { ...cur, status: 'sent' };
  }

  if (target.status !== 'scheduled') return target;

  const attempts = cur?.status === 'failed' && cur.fingerprint === fp ? (cur.attempts ?? 0) : 0;
  if (attempts >= 3) return cur!;

  const sendAt = target.sendAt!;
  const immediate = sendAt <= now + MIN;
  const seq = (cur?.seq ?? 0) + 1;
  const ids: string[] = [];
  const to: string[] = [];
  try {
    for (const g of m.guests) {
      const mail = buildMeetingMail({
        kind,
        anrede: anredeOf(m, s),
        name: g.name,
        company: g.company,
        startAt: new Date(m.startAt),
        endAt: new Date(m.endAt),
        sendAt: new Date(Math.max(sendAt, now)),
        meetUrl: m.meetUrl,
        note: kind === 'dayBefore' ? m.note : undefined,
        bookingUrl: s.meetingBookingUrl || undefined,
      });
      const { data, error } = await resend.emails.send(
        {
          from: mail.from,
          to: g.email,
          replyTo: mail.replyTo,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          ...(immediate ? {} : { scheduledAt: new Date(sendAt).toISOString() }),
          tags: [{ name: 'type', value: `meeting_${kind}` }],
        },
        { idempotencyKey: `meet-${m.id}-${kind}-${seq}-${fp}-${g.email}`.slice(0, 256) },
      );
      if (error || !data) throw new Error(error?.message ?? 'Resend hat keine ID geliefert');
      ids.push(data.id);
      to.push(g.email);
      // Resend erlaubt standardmäßig 2 Anfragen pro Sekunde.
      await new Promise((r) => setTimeout(r, 600));
    }
    return { status: immediate ? 'sent' : 'scheduled', sendAt, to, resendIds: ids, fingerprint: fp, seq };
  } catch (err) {
    if (!immediate) await cancelAll(resend, ids).catch(() => undefined);
    return {
      status: 'failed',
      sendAt,
      to,
      fingerprint: fp,
      attempts: attempts + 1,
      error: (err as Error).message,
      seq,
    };
  }
}

/**
 * Storniert eingeplante Mails. false, wenn mindestens eine schon
 * verschickt war. Wirft, wenn Resend nicht erreichbar ist, damit der
 * nächste Lauf es noch einmal versucht und keine alte Uhrzeit rausgeht.
 */
async function cancelAll(resend: Resend, ids: string[]): Promise<boolean> {
  let allCancelled = true;
  for (const id of ids) {
    const { error } = await resend.emails.cancel(id);
    if (!error) continue;
    const got = await resend.emails.get(id);
    const ev = got.data?.last_event;
    if (ev === 'canceled') continue;
    if (!ev || ev === 'scheduled') {
      throw new Error(`Eingeplante Mail ${id} konnte nicht storniert werden: ${error.message}`);
    }
    allCancelled = false;
  }
  return allCancelled;
}

// ---------------------------------------------------------------------
// Live-Abgleich (Webhook-Kanal) anlegen und erneuern
// ---------------------------------------------------------------------

async function ensureWatch(cal: calendar_v3.Calendar): Promise<void> {
  if (process.env.VERCEL_ENV !== 'production') return;
  const snap = await stateRef().get();
  const s = snap.data() ?? {};
  const watch = s.watch as { channelId: string; resourceId: string; expiration: number } | null | undefined;
  if (watch && watch.expiration - Date.now() > 2 * DAY) return;
  try {
    const next = await startWatch(cal);
    await stateRef().set(
      {
        watch: { channelId: next.channelId, resourceId: next.resourceId, expiration: next.expiration },
        watchToken: next.token,
        watchError: '',
      },
      { merge: true },
    );
    if (watch) await stopWatch(cal, watch.channelId, watch.resourceId);
  } catch (err) {
    await stateRef().set({ watchError: googleErrorText(err) }, { merge: true });
  }
}

// ---------------------------------------------------------------------

function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
