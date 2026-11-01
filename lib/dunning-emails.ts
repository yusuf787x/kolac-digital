import { BANK_DETAILS } from './company';
import { DUNNING_FROM, DUNNING_REPLY_TO, formatDay } from './dunning';
import type { DunningStage, Salutation } from './types';
import { formatEUR } from './utils';

/**
 * Texte der drei Zahlungserinnerungen. Absender ist die Buchhaltung
 * (Marci), nicht Yusuf. Sie-Form, wie auf der Rechnung.
 */

export interface DunningEmailInput {
  stage: DunningStage;
  salutation?: Salutation;
  lastName?: string;
  invoiceNumber: string;
  /** 'YYYY-MM-DD' */
  invoiceDay: string;
  dueDay: string;
  sendDay: string;
  /** Frist dieser Mail (Stufe 2 und 3). */
  deadlineDay: string | null;
  grossTotal: number;
  openAmount: number;
  /** Versandtage der früheren Stufen, für den Verweis in Stufe 3. */
  previousSent: Partial<Record<DunningStage, string>>;
  hasAttachment: boolean;
}

export interface DunningEmail {
  from: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
}

const baseStyles = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0a0a0a; line-height: 1.6; font-size: 15px;`;

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function greeting(input: DunningEmailInput): string {
  const formal = input.stage === 3;
  const name = input.lastName?.trim();
  if (name && input.salutation === 'Herr') {
    return formal ? `Sehr geehrter Herr ${name},` : `Guten Tag Herr ${name},`;
  }
  if (name && input.salutation === 'Frau') {
    return formal ? `Sehr geehrte Frau ${name},` : `Guten Tag Frau ${name},`;
  }
  return formal ? 'Sehr geehrte Damen und Herren,' : 'Guten Tag,';
}

/** Absätze als reiner Text. HTML-Version entsteht daraus mit Fettungen. */
function paragraphs(input: DunningEmailInput): string[] {
  const {
    stage,
    invoiceNumber,
    invoiceDay,
    dueDay,
    sendDay,
    deadlineDay,
    grossTotal,
    openAmount,
    previousSent,
    hasAttachment,
  } = input;
  const nr = invoiceNumber;
  const partial = openAmount < grossTotal - 0.01;
  const amountPart = partial
    ? `über ${formatEUR(grossTotal)}, von der noch ${formatEUR(openAmount)} offen sind,`
    : `über ${formatEUR(grossTotal)}`;
  const attach = hasAttachment
    ? 'Die Rechnung finden Sie zur Sicherheit noch einmal im Anhang.'
    : '';
  const deadline = deadlineDay ? formatDay(deadlineDay) : '';

  if (stage === 1) {
    const when =
      dueDay >= sendDay
        ? 'heute fällig ist'
        : `am ${formatDay(dueDay)} fällig war`;
    return [
      `wir möchten Sie freundlich daran erinnern, dass unsere Rechnung ${nr} vom ${formatDay(invoiceDay)} ${amountPart} ${when}.`,
      'Falls die Überweisung schon unterwegs ist, ist alles in Ordnung und Sie können diese Nachricht einfach ignorieren. Andernfalls freuen wir uns über Ihre Zahlung in den nächsten Tagen.',
      [attach, 'Bei Fragen zur Rechnung antworten Sie gerne direkt auf diese E-Mail.']
        .filter(Boolean)
        .join(' '),
    ];
  }

  if (stage === 2) {
    return [
      `unsere Rechnung ${nr} vom ${formatDay(invoiceDay)} ${amountPart} war am ${formatDay(dueDay)} fällig. Bis heute konnten wir leider keinen vollständigen Zahlungseingang feststellen.`,
      `Bitte überweisen Sie den offenen Betrag von ${formatEUR(openAmount)} bis spätestens ${deadline}.`,
      'Gibt es einen Grund, warum die Rechnung noch offen ist, etwa eine Rückfrage zur Leistung? Dann melden Sie sich bitte kurz bei uns, wir klären das gerne direkt.',
      [attach, 'Sollten Sie in den letzten Tagen bereits gezahlt haben, betrachten Sie diese E-Mail bitte als gegenstandslos.']
        .filter(Boolean)
        .join(' '),
    ];
  }

  const refs: string[] = [];
  if (previousSent[1]) refs.push(`unserer Zahlungserinnerung vom ${formatDay(previousSent[1])}`);
  if (previousSent[2]) refs.push(`unserer Mahnung vom ${formatDay(previousSent[2])}`);
  const opener = refs.length
    ? `trotz ${refs.join(' und ')} ist unsere Rechnung ${nr} vom ${formatDay(invoiceDay)} ${amountPart} weiterhin nicht beglichen. Sie war am ${formatDay(dueDay)} fällig.`
    : `unsere Rechnung ${nr} vom ${formatDay(invoiceDay)} ${amountPart} ist weiterhin nicht beglichen. Sie war am ${formatDay(dueDay)} fällig.`;
  return [
    opener,
    `Wir fordern Sie hiermit letztmalig auf, den offenen Betrag von ${formatEUR(openAmount)} bis spätestens ${deadline} auf das unten genannte Konto zu überweisen.`,
    'Geht die Zahlung bis zu diesem Datum nicht bei uns ein, übergeben wir die Forderung ohne weitere Ankündigung an ein Inkassounternehmen. Die dadurch entstehenden Kosten sowie Verzugszinsen gehen dann zu Ihren Lasten.',
    [attach, 'Sollten Sie zwischenzeitlich gezahlt haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.']
      .filter(Boolean)
      .join(' '),
  ];
}

function subjectFor(stage: DunningStage, nr: string): string {
  if (stage === 1) return `Zahlungserinnerung zur Rechnung ${nr}`;
  if (stage === 2) return `Mahnung: Rechnung ${nr} ist überfällig`;
  return `Letzte Mahnung: Rechnung ${nr}`;
}

function bankRows(input: DunningEmailInput): Array<[string, string]> {
  return [
    ['Empfänger', BANK_DETAILS.recipientName],
    ['IBAN', BANK_DETAILS.iban],
    ['BIC', BANK_DETAILS.bic],
    ['Verwendungszweck', input.invoiceNumber],
    ['Betrag', formatEUR(input.openAmount)],
  ];
}

const SIGNATURE_LINES = [
  'Marci',
  'Buchhaltung',
  'Kolac Digital',
  'Beckhausstraße 108, 33611 Bielefeld',
  'buchhaltung@kolac-digital.de',
  'www.kolac-digital.de',
];

export function buildDunningEmail(input: DunningEmailInput): DunningEmail {
  const subject = subjectFor(input.stage, input.invoiceNumber);
  const paras = paragraphs(input);
  const closing = input.stage === 3 ? 'Mit freundlichen Grüßen' : 'Freundliche Grüße';

  const bankTable = bankRows(input)
    .map(
      ([k, v]) =>
        `<tr><td style="color:#6b7280; padding:2px 16px 2px 0;">${k}</td><td style="font-weight:600;">${esc(v)}</td></tr>`,
    )
    .join('');

  const html = `<div style="${baseStyles}">
    <p>${esc(greeting(input))}</p>
    ${paras.map((p) => `<p>${esc(p)}</p>`).join('\n    ')}
    <table cellpadding="0" cellspacing="0" border="0" style="margin:18px 0; padding:12px 16px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; font-size:14px;">${bankTable}</table>
    <p style="margin-top:24px;">${closing}</p>
    <div style="font-size:14px; line-height:1.5;">
      <div style="font-weight:600;">Marci</div>
      <div>Buchhaltung</div>
      <div style="margin-top:10px; color:#6b7280; font-size:13px;">
        <div><strong style="color:#0a0a0a;">Kolac Digital</strong></div>
        <div>Beckhausstraße 108, 33611 Bielefeld</div>
        <div><a href="mailto:buchhaltung@kolac-digital.de" style="color:#2563eb; text-decoration:none;">buchhaltung@kolac-digital.de</a></div>
        <div><a href="https://www.kolac-digital.de" style="color:#2563eb; text-decoration:none;">www.kolac-digital.de</a></div>
      </div>
    </div>
  </div>`;

  const text = [
    greeting(input),
    '',
    ...paras.flatMap((p) => [p, '']),
    ...bankRows(input).map(([k, v]) => `${k}: ${v}`),
    '',
    closing,
    '',
    ...SIGNATURE_LINES,
  ].join('\n');

  return { from: DUNNING_FROM, replyTo: DUNNING_REPLY_TO, subject, html, text };
}
