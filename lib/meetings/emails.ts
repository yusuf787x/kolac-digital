import {
  emailDataRows,
  emailLayout,
  emailSignatureText,
  esc,
} from '@/lib/email-layout';
import type { Anrede, MailKind } from './types';

/**
 * Die drei Erinnerungs-Mails zu einem Google-Meet-Termin. Persönlich
 * geschrieben, aber offen automatisch: jede Mail sagt in der Fußnote,
 * dass das System sie verschickt und Antworten direkt bei Yusuf landen.
 */

export const MEETING_FROM = 'Yusuf Kolac <yusuf@kolac-digital.de>';
export const MEETING_REPLY_TO = 'yusuf@kolac-digital.de';

const TZ = 'Europe/Berlin';

export interface MeetingMailInput {
  kind: MailKind;
  anrede: Anrede;
  /** Voller Name des Gastes, leer wenn unbekannt. */
  name: string;
  company?: string;
  startAt: Date;
  endAt: Date;
  /** Wann die Mail rausgeht. Bestimmt "heute"/"morgen" im Text. */
  sendAt: Date;
  meetUrl: string;
  /** Persönliche Zeile, nur in der Mail am Vortag. */
  note?: string;
  bookingUrl?: string;
}

export interface MeetingMail {
  from: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
}

export function berlinTime(d: Date): string {
  return d.toLocaleTimeString('de-DE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}

export function berlinDate(d: Date): string {
  return d.toLocaleDateString('de-DE', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function berlinDayKey(d: Date): string {
  return d.toLocaleDateString('sv-SE', { timeZone: TZ });
}

/** 'heute', 'morgen' oder null, aus Sicht des Sendezeitpunkts. */
function relativeDay(start: Date, from: Date): 'heute' | 'morgen' | null {
  const b = berlinDayKey(start);
  if (berlinDayKey(from) === b) return 'heute';
  if (berlinDayKey(new Date(from.getTime() + 24 * 3600 * 1000)) === b) return 'morgen';
  return null;
}

function greeting(anrede: Anrede, name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (anrede === 'du') return parts[0] ? `Hallo ${parts[0]},` : 'Hallo,';
  return parts.length >= 2 ? `Guten Tag ${parts.join(' ')},` : 'Guten Tag,';
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Ein Absatz als HTML und als Klartext. */
interface Para {
  html: string;
  text: string;
}

const plain = (s: string): Para => ({ html: esc(s), text: s });

export function buildMeetingMail(input: MeetingMailInput): MeetingMail {
  const du = input.anrede === 'du';
  const time = berlinTime(input.startAt);
  const rel = relativeDay(input.startAt, input.sendAt);
  // "morgen" / "heute" / "am Mittwoch, 18. November"
  const dayWord = rel ?? `am ${berlinDate(input.startAt)}`;
  const minutes = Math.max(0, Math.round((input.endAt.getTime() - input.startAt.getTime()) / 60000));
  const hello = greeting(input.anrede, input.name);

  // Satz zum Verschieben. Mit Buchungslink wird der Link Teil des Satzes.
  const reschedule = (lead: string): Para => {
    if (!input.bookingUrl) {
      const s = du
        ? `${lead} antworte einfach kurz auf diese Mail, dann finden wir einen neuen Termin.`
        : `${lead} antworten Sie einfach kurz auf diese Mail, dann finden wir einen neuen Termin.`;
      return plain(s);
    }
    const pre = du
      ? `${lead} antworte einfach kurz auf diese Mail oder `
      : `${lead} antworten Sie einfach kurz auf diese Mail oder `;
    const label = du ? 'such dir hier einen neuen Termin aus' : 'wählen Sie hier einen neuen Termin';
    return {
      html: `${esc(pre)}<a href="${esc(input.bookingUrl)}">${esc(label)}</a>.`,
      text: `${pre}${label}: ${input.bookingUrl}`,
    };
  };

  const footnote = du
    ? 'Diese Mail verschickt mein System automatisch, damit kein Termin untergeht. Wenn du antwortest, landet das direkt bei mir.'
    : 'Diese Mail verschickt mein System automatisch, damit kein Termin untergeht. Wenn Sie antworten, landet das direkt bei mir.';

  const rows: Array<[string, string]> = [
    ['Wann', `${berlinDate(input.startAt)}, ${time} Uhr`],
    ...(minutes ? ([['Dauer', `${minutes} Minuten`]] as Array<[string, string]>) : []),
    ['Wo', 'Google Meet, Link unten'],
  ];
  const rowsPara: Para = {
    html: emailDataRows(rows),
    text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
  };

  const paras: Para[] = [];
  let subject: string;
  let preheader: string;
  let closing: string;

  if (input.kind === 'confirm') {
    subject = `Unser Termin ${dayWord} um ${time} Uhr`;
    preheader = `${cap(dayWord)} um ${time} Uhr per Google Meet. Der Link steht in dieser Mail.`;
    closing = 'Bis dann und viele Grüße';
    paras.push(
      plain(
        du
          ? 'danke für den Termin, ich freue mich auf unser Gespräch. Hier noch mal alles auf einen Blick:'
          : 'vielen Dank für den Termin, ich freue mich auf unser Gespräch. Hier noch einmal alles auf einen Blick:',
      ),
      rowsPara,
      plain(
        du
          ? 'Wenn du magst, schreib mir vorher kurz, was dir gerade am wichtigsten ist. Ein Satz reicht, dann kann ich mich gezielt vorbereiten.'
          : 'Wenn Sie mögen, schreiben Sie mir vorher kurz, was Ihnen gerade am wichtigsten ist. Ein Satz reicht, dann kann ich mich gezielt vorbereiten.',
      ),
      reschedule(du ? 'Falls dir etwas dazwischenkommt,' : 'Falls Ihnen etwas dazwischenkommt,'),
    );
  } else if (input.kind === 'fiveDays') {
    subject = `Erinnerung: unser Termin ${dayWord} um ${time} Uhr`;
    preheader = `${cap(dayWord)} um ${time} Uhr sprechen wir per Google Meet.`;
    closing = 'Viele Grüße';
    paras.push(
      plain(`kurz vorab zu unserem Termin: ${dayWord} um ${time} Uhr sprechen wir per Google Meet.`),
      rowsPara,
      plain(
        du
          ? 'Am Tag vorher melde ich mich noch mal kurz, und eine Stunde vorher bekommst du den Link.'
          : 'Am Tag vorher melde ich mich noch einmal kurz, und eine Stunde vorher bekommen Sie den Link.',
      ),
      reschedule(du ? 'Falls sich bei dir etwas geändert hat,' : 'Falls sich bei Ihnen etwas geändert hat,'),
    );
  } else if (input.kind === 'dayBefore') {
    subject = `${cap(dayWord)} um ${time} Uhr: unser Gespräch`;
    preheader = `Kurze Erinnerung an unseren Termin ${dayWord} um ${time} Uhr.`;
    closing = 'Bis dann und viele Grüße';
    paras.push(
      plain(
        du
          ? `kurze Erinnerung: ${dayWord} um ${time} Uhr sprechen wir per Google Meet.`
          : `eine kurze Erinnerung: ${dayWord} um ${time} Uhr sprechen wir per Google Meet.`,
      ),
    );
    const note = input.note?.trim();
    if (note) paras.push({ html: esc(note).replace(/\n/g, '<br/>'), text: note });
    const check = du ? 'Passt es bei dir noch?' : 'Passt es bei Ihnen noch?';
    const r = reschedule('Falls nicht,');
    paras.push({ html: `${esc(check)} ${r.html}`, text: `${check} ${r.text}` });
  } else {
    subject = `${cap(dayWord)} um ${time} Uhr: hier ist der Link`;
    preheader = 'Gleich geht es los. Ein Klick auf den Link reicht.';
    closing = 'Bis gleich';
    paras.push(
      plain(
        du
          ? `gleich ist es so weit: um ${time} Uhr sprechen wir. Über den Knopf unten kommst du direkt ins Gespräch. Installieren musst du nichts, am Rechner reicht der Browser, am Handy die Google-Meet-App.`
          : `gleich ist es so weit: um ${time} Uhr sprechen wir. Über den Knopf unten kommen Sie direkt ins Gespräch. Installieren müssen Sie nichts, am Rechner reicht der Browser, am Handy die Google-Meet-App.`,
      ),
    );
  }

  const bodyHtml =
    `<p>${esc(hello)}</p>` +
    paras.map((p) => (p.html.startsWith('<table') ? p.html : `<p>${p.html}</p>`)).join('');

  const html = emailLayout({
    preheader,
    bodyHtml,
    button: { label: 'Zum Google Meet', href: input.meetUrl },
    footnote: esc(footnote),
    closing,
    sender: 'yusuf',
  });

  const text = [
    hello,
    '',
    ...paras.flatMap((p) => [p.text, '']),
    `Zum Google Meet: ${input.meetUrl}`,
    '',
    footnote,
    '',
    emailSignatureText('yusuf', closing),
  ].join('\n');

  return { from: MEETING_FROM, replyTo: MEETING_REPLY_TO, subject, html, text };
}
