import 'server-only';
import { randomBytes } from 'crypto';
import { google, type calendar_v3 } from 'googleapis';
import { adminDb } from '@/lib/firebase-admin';
import { getOAuthClientForRefresh } from '@/lib/google-oauth';

export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

/** Adressen, die nie eine Erinnerung bekommen (eigene Postfächer). */
const OWN_DOMAIN = '@kolac-digital.de';

export class CalendarSetupError extends Error {
  constructor(
    public code: 'not_connected' | 'scope_missing',
    message: string,
  ) {
    super(message);
  }
}

export async function calendarClient(): Promise<calendar_v3.Calendar> {
  const snap = await adminDb().collection('settings').doc('google_auth').get();
  const data = snap.data();
  if (!data?.refreshToken) {
    throw new CalendarSetupError(
      'not_connected',
      'Google ist nicht verbunden. Unter Einstellungen „Google verbinden“ klicken.',
    );
  }
  const scopes: string[] = Array.isArray(data.scopes) ? data.scopes : [];
  if (!scopes.includes(CALENDAR_SCOPE)) {
    throw new CalendarSetupError(
      'scope_missing',
      'Die Google-Verbindung hat noch keinen Zugriff auf den Kalender. Unter Einstellungen auf „Kalender-Zugriff erlauben“ klicken.',
    );
  }
  return google.calendar({ version: 'v3', auth: getOAuthClientForRefresh(data.refreshToken) });
}

export interface RawGuest {
  /** Kleingeschrieben. */
  email: string;
  /** So, wie sie im Kalender steht (für die Suche in Leads und Kunden). */
  rawEmail: string;
  displayName: string;
}

/** Meet-Link eines Events, leer wenn keiner. */
export function meetUrlOf(ev: calendar_v3.Schema$Event): string {
  if (ev.hangoutLink) return ev.hangoutLink;
  const video = ev.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video');
  return video?.uri && video.uri.includes('meet.google.com') ? video.uri : '';
}

/**
 * Externe Gäste, die zugesagt oder noch nicht geantwortet haben. Ohne
 * eigene Adressen und Räume. Leere Liste = keine Erinnerung.
 */
export function externalGuests(ev: calendar_v3.Schema$Event): RawGuest[] {
  return (ev.attendees ?? [])
    .filter(
      (a) =>
        !!a.email &&
        !a.self &&
        !a.resource &&
        !a.organizer &&
        a.responseStatus !== 'declined' &&
        !a.email.toLowerCase().endsWith(OWN_DOMAIN),
    )
    .map((a) => ({
      email: a.email!.toLowerCase(),
      rawEmail: a.email!,
      displayName: a.displayName ?? '',
    }));
}

/**
 * Über die Google-Buchungsseite gebucht oder selbst eingeladen? Die API
 * hat dafür kein Feld. Wer bucht, steht sofort als "zugesagt" im Termin;
 * wer eingeladen wird, steht zuerst auf "noch nicht geantwortet". Das
 * gilt nur, wenn wir den Termin kurz nach dem Anlegen sehen (Webhook oder
 * Seite geöffnet). Sehen wir ihn erst später, kann ein Eingeladener schon
 * zugesagt haben: dann im Zweifel "selbst eingeladen", denn Google schickt
 * bei Buchungen ohnehin eine eigene Bestätigung.
 */
export function looksBooked(ev: calendar_v3.Schema$Event, now: number): boolean {
  if (/gebucht von|booked by/i.test(ev.description ?? '')) return true;
  const created = ev.created ? Date.parse(ev.created) : 0;
  if (!created || now - created > 30 * 60_000) return false;
  const ext = (ev.attendees ?? []).filter(
    (a) => !!a.email && !a.self && !a.resource && !a.email.toLowerCase().endsWith(OWN_DOMAIN),
  );
  return ext.length > 0 && ext.every((a) => a.responseStatus === 'accepted');
}

export function hasDeclinedOnly(ev: calendar_v3.Schema$Event): boolean {
  const ext = (ev.attendees ?? []).filter(
    (a) => !!a.email && !a.self && !a.resource && !a.email.toLowerCase().endsWith(OWN_DOMAIN),
  );
  return ext.length > 0 && ext.every((a) => a.responseStatus === 'declined');
}

/**
 * Kommt ein Event grundsätzlich in Frage? Eigener Termin (ich bin
 * Organisator, so auch bei Buchungen über die Terminbuchungsseite), mit
 * Uhrzeit, mit Meet-Link und mindestens einem externen Gast.
 */
export function isCandidate(ev: calendar_v3.Schema$Event): boolean {
  if (!ev.id || !ev.start?.dateTime) return false;
  if (ev.eventType && ev.eventType !== 'default') return false;
  if (ev.organizer && ev.organizer.self === false) return false;
  if (!meetUrlOf(ev)) return false;
  return (ev.attendees ?? []).some(
    (a) => !!a.email && !a.self && !a.resource && !a.email.toLowerCase().endsWith(OWN_DOMAIN),
  );
}

export async function listUpcomingEvents(
  cal: calendar_v3.Calendar,
  from: Date,
  to: Date,
): Promise<calendar_v3.Schema$Event[]> {
  const out: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  do {
    const res = await cal.events.list({
      calendarId: 'primary',
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: true,
      showDeleted: true,
      orderBy: 'startTime',
      maxResults: 250,
      pageToken,
    });
    out.push(...(res.data.items ?? []));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken && out.length < 1000);
  return out;
}

/** Einzelnes Event, null wenn gelöscht. */
export async function getEvent(
  cal: calendar_v3.Calendar,
  id: string,
): Promise<calendar_v3.Schema$Event | null> {
  try {
    const res = await cal.events.get({ calendarId: 'primary', eventId: id });
    return res.data;
  } catch (err) {
    const status = (err as { code?: number; status?: number }).code ?? (err as { status?: number }).status;
    if (status === 404 || status === 410) return null;
    throw err;
  }
}

// ---------------------------------------------------------------------
// Live-Abgleich: Google meldet jede Änderung im Kalender an den Webhook.
// ---------------------------------------------------------------------

export const WATCH_ADDRESS = 'https://www.kolac-digital.de/api/meetings/webhook';

export async function startWatch(
  cal: calendar_v3.Calendar,
): Promise<{ channelId: string; resourceId: string; expiration: number; token: string }> {
  const channelId = `kd-meet-${randomBytes(8).toString('hex')}`;
  const token = randomBytes(24).toString('hex');
  const res = await cal.events.watch({
    calendarId: 'primary',
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: WATCH_ADDRESS,
      token,
      // 7 Tage, Google kürzt ggf. selbst. Der tägliche Lauf erneuert vorher.
      params: { ttl: String(7 * 24 * 3600) },
    },
  });
  return {
    channelId,
    resourceId: res.data.resourceId ?? '',
    expiration: Number(res.data.expiration ?? Date.now() + 7 * 24 * 3600 * 1000),
    token,
  };
}

export async function stopWatch(
  cal: calendar_v3.Calendar,
  channelId: string,
  resourceId: string,
): Promise<void> {
  try {
    await cal.channels.stop({ requestBody: { id: channelId, resourceId } });
  } catch {
    // Abgelaufene oder unbekannte Kanäle sind egal.
  }
}
