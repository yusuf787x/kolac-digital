import { BANK_DETAILS } from './company';
import {
  berlinDay,
  deadlineForStage,
  DUNNING_FROM,
  DUNNING_REPLY_TO,
  formatDay,
  invoiceOpenAmount,
  sentDayByStage,
} from './dunning';
import type { Customer, DunningStage, Invoice, Salutation } from './types';
import { formatEUR, invoiceGrossTotal } from './utils';
import { emailBox, emailDataRows, emailLayout, emailSignatureText, esc } from './email-layout';

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

export function buildDunningEmail(input: DunningEmailInput): DunningEmail {
  const subject = subjectFor(input.stage, input.invoiceNumber);
  const paras = paragraphs(input);
  const closing = input.stage === 3 ? 'Mit freundlichen Grüßen' : 'Freundliche Grüße';

  const html = emailLayout({
    sender: 'buchhaltung',
    preheader: `Rechnung ${input.invoiceNumber}, offen ${formatEUR(input.openAmount)}`,
    bodyHtml: `<p>${esc(greeting(input))}</p>
      ${paras.map((p) => `<p>${esc(p)}</p>`).join('\n      ')}
      ${emailBox(emailDataRows(bankRows(input)))}`,
    closing,
  });

  const text = [
    greeting(input),
    '',
    ...paras.flatMap((p) => [p, '']),
    ...bankRows(input).map(([k, v]) => `${k}: ${v}`),
    '',
    emailSignatureText('buchhaltung', closing),
  ].join('\n');

  return { from: DUNNING_FROM, replyTo: DUNNING_REPLY_TO, subject, html, text };
}

/**
 * Mail einer Stufe für eine echte Rechnung. Gleiche Daten wie beim
 * Versand, damit die Vorschau im Dashboard genau das zeigt, was rausgeht.
 */
export function dunningEmailForInvoice(opts: {
  invoice: Invoice;
  customer: Pick<Customer, 'salutation' | 'lastName'> | null;
  stage: DunningStage;
  /** Versandtag 'YYYY-MM-DD', bestimmt die Frist in Stufe 2 und 3. */
  sendDay: string;
  hasAttachment: boolean;
}): DunningEmail {
  const { invoice, customer, stage, sendDay, hasAttachment } = opts;
  return buildDunningEmail({
    stage,
    salutation: customer?.salutation,
    lastName: customer?.lastName,
    invoiceNumber: invoice.invoiceNumber ?? '',
    invoiceDay: berlinDay(invoice.invoiceDate.toMillis()),
    dueDay: berlinDay(invoice.dueDate.toMillis()),
    sendDay,
    deadlineDay: deadlineForStage(stage, sendDay),
    grossTotal: invoiceGrossTotal(invoice),
    openAmount: invoiceOpenAmount(invoice),
    previousSent: sentDayByStage(invoice),
    hasAttachment,
  });
}
