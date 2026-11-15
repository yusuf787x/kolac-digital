/**
 * Termin-Erinnerungen für Google-Meet-Termine (Collection `meetings`,
 * Dokument-ID = Google-Kalender-Event-ID). Geschrieben wird nur serverseitig
 * (lib/meetings/server/sync.ts), das Dashboard liest und ändert über
 * /api/meetings.
 */

export type MailKind = 'confirm' | 'fiveDays' | 'dayBefore' | 'hourBefore';

export const MAIL_KINDS: MailKind[] = ['confirm', 'fiveDays', 'dayBefore', 'hourBefore'];

export const MAIL_KIND_LABEL: Record<MailKind, string> = {
  confirm: 'Bestätigung',
  fiveDays: '5 Tage vorher',
  dayBefore: 'Am Vortag',
  hourBefore: '1 Stunde vorher',
};

/**
 * planned:   würde rausgehen, Automatik ist aber aus
 * scheduled: bei Resend für sendAt eingeplant
 * sent:      verschickt (bzw. sendAt bei Resend ist vorbei)
 * skipped:   bewusst nicht verschickt, Grund in `reason`
 * off:       für diesen Termin abgeschaltet oder Termin abgesagt
 * failed:    Versand fehlgeschlagen, `error`
 */
export type MailStatus = 'planned' | 'scheduled' | 'sent' | 'skipped' | 'off' | 'failed';

export interface MailState {
  status: MailStatus;
  /** Millisekunden. */
  sendAt: number | null;
  reason?: string;
  to?: string[];
  resendIds?: string[];
  /** Inhalt + Zeitpunkt, mit dem eingeplant wurde. Ändert er sich, wird neu eingeplant. */
  fingerprint?: string;
  error?: string;
  attempts?: number;
  /**
   * Zählt jedes Einplanen hoch und steckt im Idempotency-Key bei Resend.
   * So wird nach Ausschalten und Wiedereinschalten nicht die alte,
   * stornierte Mail wiederverwendet.
   */
  seq?: number;
}

export type GuestSource = 'kunde' | 'lead' | 'outreach' | 'google';

export interface MeetingGuest {
  email: string;
  /** Voller Name, so gut bekannt. Leer, wenn unbekannt. */
  name: string;
  company?: string;
  source: GuestSource;
  sourceId?: string;
}

export type Anrede = 'du' | 'sie';

export type MeetingStatus = 'active' | 'cancelled' | 'declined';

export interface Meeting {
  id: string;
  title: string;
  /** Millisekunden. */
  startAt: number;
  endAt: number;
  /** Wann der Termin im Kalender angelegt bzw. gebucht wurde. */
  bookedAt: number;
  meetUrl: string;
  calendarUrl: string;
  status: MeetingStatus;
  guests: MeetingGuest[];
  /**
   * Selbst angelegt und eingeladen (nicht über die Buchungsseite). Google
   * hat dann schon eine Einladung geschickt, darum keine Bestätigung.
   * Wird beim ersten Sehen festgelegt; fehlt bei älteren Terminen.
   */
  selfInvited?: boolean;
  /** Vom Dashboard: keine Erinnerungen für diesen Termin. */
  disabled?: boolean;
  /** Vom Dashboard: persönliche Zeile für die Mail am Vortag. */
  note?: string;
  anrede?: Anrede;
  mails: Partial<Record<MailKind, MailState>>;
  firstSeenAt: number;
  lastSyncedAt: number;
}

/** Felder in settings/config. */
export interface MeetingSettings {
  meetingRemindersEnabled?: boolean;
  /** Millisekunden. Bestätigungen nur für Termine, die danach gebucht wurden. */
  meetingRemindersSince?: number;
  /** Google-Buchungsseite zum Verschieben, optional. */
  meetingBookingUrl?: string;
  meetingDefaultAnrede?: Anrede;
}

/** settings/meeting_sync: Sperre, Live-Abgleich, letzter Lauf. */
export interface MeetingSyncState {
  lastRunAt?: number;
  lastRunOk?: boolean;
  lastError?: string;
  lastReason?: string;
  watch?: {
    channelId: string;
    resourceId: string;
    expiration: number;
  } | null;
  watchError?: string;
}
