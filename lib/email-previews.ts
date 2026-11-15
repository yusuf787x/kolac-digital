import 'server-only';
import {
  buildCancellationEmail,
  buildDealEmail,
  buildDirectDebitInvoiceEmail,
  buildInvoiceEmail,
} from '@/lib/email-templates';
import { buildDunningEmail } from '@/lib/dunning-emails';
import { buildLoginLinkEmail, buildReportReleasedEmail } from '@/lib/seo/server/emails';
import type { DunningStage } from '@/lib/types';
import { buildMeetingMail } from '@/lib/meetings/emails';
import { MAIL_KINDS, type MailKind } from '@/lib/meetings/types';

/**
 * Alle Mails, die an Kunden rausgehen, mit Beispieldaten. Grundlage für
 * die Seite "Mail-Vorlagen" im Dashboard (Vorschau + Testmail an Yusuf).
 * Interne Hinweise an Yusuf selbst sind bewusst nicht dabei.
 */

export interface PreviewEmail {
  from: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailPreviewDef {
  id: string;
  group: string;
  label: string;
  /** Wann die Mail rausgeht, in einem Satz. */
  when: string;
  build: () => PreviewEmail;
}

const SAMPLE_INVOICE = 'RE-2026-041';
const SAMPLE_GROSS = 1190;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function dunning(stage: DunningStage): PreviewEmail {
  return buildDunningEmail({
    stage,
    salutation: 'Herr',
    lastName: 'Mustermann',
    invoiceNumber: SAMPLE_INVOICE,
    invoiceDay: isoDaysAgo(stage === 1 ? 14 : stage === 2 ? 30 : 45),
    dueDay: isoDaysAgo(stage === 1 ? 0 : stage === 2 ? 16 : 31),
    sendDay: isoDaysAgo(0),
    deadlineDay: stage === 1 ? null : isoDaysAgo(-10),
    grossTotal: SAMPLE_GROSS,
    openAmount: SAMPLE_GROSS,
    previousSent: stage === 3 ? { 1: isoDaysAgo(31), 2: isoDaysAgo(15) } : {},
    hasAttachment: true,
  });
}

export const EMAIL_PREVIEWS: EmailPreviewDef[] = [
  {
    id: 'invoice',
    group: 'Rechnungen',
    label: 'Rechnung',
    when: 'Rechnung im Dashboard öffnen und „Per E-Mail senden“ klicken.',
    build: () =>
      buildInvoiceEmail({
        customerName: 'Max Mustermann',
        invoiceNumber: SAMPLE_INVOICE,
        totalAmount: SAMPLE_GROSS,
        dueDate: new Date(Date.now() + 14 * 86400000).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
      }),
  },
  {
    id: 'direct-debit',
    group: 'Rechnungen',
    label: 'Rechnung nach Lastschrift',
    when: 'Automatisch, sobald GoCardless eine Lastschrift eingezogen hat.',
    build: () =>
      buildDirectDebitInvoiceEmail({
        customerName: 'Max',
        invoiceNumber: SAMPLE_INVOICE,
        totalAmount: SAMPLE_GROSS,
        chargedAt: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      }),
  },
  {
    id: 'cancellation',
    group: 'Rechnungen',
    label: 'Stornorechnung',
    when: 'Nach dem Stornieren auf der Stornorechnung „Per E-Mail senden“ klicken.',
    build: () =>
      buildCancellationEmail({
        customerName: 'Max Mustermann',
        invoiceNumber: 'R1242',
        originalNumber: SAMPLE_INVOICE,
        originalDate: new Date(Date.now() - 7 * 86400000).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
        totalAmount: SAMPLE_GROSS,
      }),
  },
  {
    id: 'dunning-1',
    group: 'Zahlungserinnerungen',
    label: 'Stufe 1: Zahlungserinnerung',
    when: 'Automatisch am Fälligkeitstag, wenn die Rechnung offen ist.',
    build: () => dunning(1),
  },
  {
    id: 'dunning-2',
    group: 'Zahlungserinnerungen',
    label: 'Stufe 2: Mahnung',
    when: 'Automatisch, wenn nach der Erinnerung weiter nichts eingegangen ist.',
    build: () => dunning(2),
  },
  {
    id: 'dunning-3',
    group: 'Zahlungserinnerungen',
    label: 'Stufe 3: Letzte Mahnung',
    when: 'Automatisch nach der Mahnung, mit Hinweis auf Inkasso.',
    build: () => dunning(3),
  },
  {
    id: 'deal',
    group: 'Vertrieb',
    label: 'Vertriebsmail',
    when: 'Im Vertrieb bei einem Deal „E-Mail senden“. Text schreibst du selbst.',
    build: () =>
      buildDealEmail({
        subject: 'Ihre neue Website: die nächsten Schritte',
        body: '<p>Hallo Herr Mustermann,</p><p>danke für das nette Gespräch heute. Wie besprochen schicke ich Ihnen hier eine kurze Übersicht der nächsten Schritte:</p><ul><li>Angebot bis Freitag</li><li>Gemeinsamer Termin für Texte und Bilder</li><li>Start der Umsetzung</li></ul><p>Melden Sie sich gerne, wenn vorher Fragen aufkommen.</p>',
      }),
  },
  {
    id: 'portal-invite',
    group: 'Kundenportal',
    label: 'Einladung ins Portal',
    when: 'Im SEO-Bereich beim Kunden einen Zugang anlegen.',
    build: () =>
      buildLoginLinkEmail({
        link: 'https://www.kolac-digital.de/portal/anmelden',
        displayName: 'Mustermann GmbH',
        invite: true,
      }),
  },
  {
    id: 'portal-report',
    group: 'Kundenportal',
    label: 'Monatsbericht ist da',
    when: 'Wenn du einen SEO-Bericht freigibst.',
    build: () =>
      buildReportReleasedEmail({
        displayName: 'Mustermann GmbH',
        monthLabel: 'Oktober 2026',
        portalLink: 'https://www.kolac-digital.de/portal',
        assessment:
          'Ihre Website wurde im Oktober deutlich öfter bei Google angezeigt als im Vormonat. Vor allem die neuen Leistungsseiten bringen erste Besucher.',
      }),
  },
  ...MAIL_KINDS.map((kind) => ({
    id: `meeting-${kind}`,
    group: 'Termine',
    label: meetingPreview(kind).label,
    when: meetingPreview(kind).when,
    build: () => meetingSample(kind),
  })),
];

/** Funktion statt Konstante: EMAIL_PREVIEWS oben greift schon beim Laden darauf zu. */
function meetingPreview(kind: MailKind): { label: string; when: string; before: number } {
  switch (kind) {
    case 'confirm':
      return {
        label: 'Termin-Bestätigung',
        when: 'Automatisch, sobald ein neuer Google-Meet-Termin mit externem Gast im Kalender steht.',
        before: 0,
      };
    case 'fiveDays':
      return {
        label: 'Erinnerung 5 Tage vorher',
        when: 'Automatisch 5 Tage vor dem Termin, nur wenn er mindestens 7 Tage vorher gebucht wurde.',
        before: 5 * 86400000,
      };
    case 'dayBefore':
      return {
        label: 'Erinnerung am Vortag',
        when: 'Automatisch 24 Stunden vor dem Termin. Mit deiner persönlichen Zeile, falls eingetragen.',
        before: 86400000,
      };
    case 'hourBefore':
      return {
        label: 'Erinnerung 1 Stunde vorher',
        when: 'Automatisch 1 Stunde vor dem Termin, mit dem Meet-Link.',
        before: 3600000,
      };
  }
}

function meetingSample(kind: MailKind): PreviewEmail {
  const start = new Date(Date.now() + 9 * 86400000);
  start.setHours(15, 0, 0, 0);
  const sendAt =
    kind === 'confirm' ? new Date() : new Date(start.getTime() - meetingPreview(kind).before);
  return buildMeetingMail({
    kind,
    anrede: 'du',
    name: 'Max Mustermann',
    company: 'Mustermann Haustechnik',
    startAt: start,
    endAt: new Date(start.getTime() + 30 * 60000),
    sendAt,
    meetUrl: 'https://meet.google.com/abc-defg-hij',
    note:
      kind === 'dayBefore'
        ? 'Ich habe mir eure Website schon angeschaut und bringe zwei, drei konkrete Ideen mit.'
        : undefined,
  });
}
