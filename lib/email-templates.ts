import { formatEUR } from './utils';
import {
  ACCOUNTING_FROM,
  ACCOUNTING_REPLY_TO,
  emailBox,
  emailDataRows,
  emailLayout,
  emailSignatureText,
  esc,
} from './email-layout';

const FROM_EMAIL = 'Kolac Digital <yusuf@kolac-digital.de>';
const REPLY_TO = 'yusuf@kolac-digital.de';

/** Best-effort HTML -> Text Konvertierung für den text/plain Teil. */
function htmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Markiert einen Body als "HTML" (vom Rich-Text-Editor) vs. "Plain"
 * (Backward-Compat für alte Aufrufe). Plain-Text wird in <br/>-Form
 * umgewandelt, HTML bleibt unverändert.
 */
function ensureHtmlBody(body: string): string {
  const looksLikeHtml = /<\/?[a-z][^>]*>/i.test(body);
  if (looksLikeHtml) return body;
  return body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
}

export function buildInvoiceEmail(opts: {
  customerName: string;
  invoiceNumber: string;
  totalAmount: number;
  dueDate: string;
}): { from: string; replyTo: string; subject: string; html: string; text: string } {
  const { customerName, invoiceNumber, totalAmount, dueDate } = opts;
  const subject = `Rechnung ${invoiceNumber} – Kolac Digital`;

  const greeting = `Hallo${customerName ? ` ${customerName}` : ''},`;
  const closing = 'Vielen Dank und liebe Grüße';

  const html = emailLayout({
    preheader: `Rechnung ${invoiceNumber} über ${formatEUR(totalAmount)}, zahlbar bis ${dueDate}.`,
    bodyHtml: `<p>${esc(greeting)}</p>
      <p>im Anhang finden Sie die Rechnung <strong>${esc(invoiceNumber)}</strong>.</p>
      ${emailBox(
        emailDataRows([
          ['Rechnung', invoiceNumber],
          ['Betrag', formatEUR(totalAmount)],
          ['Zahlungsziel', dueDate],
        ]),
      )}
      <p>Bitte überweisen Sie den Betrag unter Angabe der Rechnungsnummer.
      Den GiroCode auf der Rechnung können Sie mit Ihrer Banking-App scannen,
      dann ist die Überweisung in Sekunden vorausgefüllt.</p>
      <p>Bei Fragen melden Sie sich gerne.</p>`,
    closing,
    sender: 'buchhaltung',
  });

  const text = [
    greeting,
    '',
    `im Anhang finden Sie die Rechnung ${invoiceNumber} über ${formatEUR(totalAmount)}.`,
    `Zahlungsziel: ${dueDate}`,
    '',
    'Bitte überweisen Sie den Betrag unter Angabe der Rechnungsnummer.',
    'Den GiroCode auf der Rechnung können Sie mit Ihrer Banking-App scannen.',
    '',
    'Bei Fragen melden Sie sich gerne.',
    '',
    emailSignatureText('buchhaltung', closing),
  ].join('\n');

  return { from: ACCOUNTING_FROM, replyTo: ACCOUNTING_REPLY_TO, subject, html, text };
}

/**
 * Stornorechnung an den Kunden. Absender Buchhaltung, Sie-Form.
 * Betrag positiv übergeben (der aufgehobene Bruttobetrag).
 */
export function buildCancellationEmail(opts: {
  customerName: string;
  /** Nummer der Stornorechnung. */
  invoiceNumber: string;
  originalNumber: string;
  /** Bereits formatiert, z.B. "06.11.2026". */
  originalDate: string;
  totalAmount: number;
}): { from: string; replyTo: string; subject: string; html: string; text: string } {
  const { customerName, invoiceNumber, originalNumber, originalDate, totalAmount } = opts;
  const subject = `Stornorechnung ${invoiceNumber} zur Rechnung ${originalNumber} – Kolac Digital`;
  const greeting = `Hallo${customerName ? ` ${customerName}` : ''},`;
  const closing = 'Viele Grüße';

  const html = emailLayout({
    preheader: `Rechnung ${originalNumber} ist storniert, Sie müssen sie nicht bezahlen.`,
    bodyHtml: `<p>${esc(greeting)}</p>
      <p>wie besprochen haben wir die Rechnung <strong>${esc(originalNumber)}</strong>
      vom ${esc(originalDate)} storniert. Im Anhang finden Sie die Stornorechnung.</p>
      ${emailBox(
        emailDataRows([
          ['Stornorechnung', invoiceNumber],
          ['Storniert', `Rechnung ${originalNumber}`],
          ['Betrag', formatEUR(totalAmount)],
        ]),
      )}
      <p>Die Rechnung ${esc(originalNumber)} müssen Sie damit nicht mehr bezahlen.
      Falls eine korrigierte Rechnung nötig ist, erhalten Sie diese separat.</p>
      <p>Bei Fragen melden Sie sich gerne.</p>`,
    closing,
    sender: 'buchhaltung',
  });

  const text = [
    greeting,
    '',
    `wie besprochen haben wir die Rechnung ${originalNumber} vom ${originalDate} storniert. Im Anhang finden Sie die Stornorechnung ${invoiceNumber}.`,
    '',
    `Die Rechnung ${originalNumber} (${formatEUR(totalAmount)}) müssen Sie damit nicht mehr bezahlen. Falls eine korrigierte Rechnung nötig ist, erhalten Sie diese separat.`,
    '',
    'Bei Fragen melden Sie sich gerne.',
    '',
    emailSignatureText('buchhaltung', closing),
  ].join('\n');

  return { from: ACCOUNTING_FROM, replyTo: ACCOUNTING_REPLY_TO, subject, html, text };
}

/**
 * Rechnung nach SEPA-Lastschrift (GoCardless). Du-Form, der Betrag ist
 * schon eingezogen, der Kunde muss nichts tun.
 */
export function buildDirectDebitInvoiceEmail(opts: {
  customerName: string;
  invoiceNumber: string;
  /** Brutto, so wie eingezogen. */
  totalAmount: number;
  /** Bereits formatiert, z.B. "06.11.2026". */
  chargedAt: string;
}): { from: string; replyTo: string; subject: string; html: string; text: string } {
  const { customerName, invoiceNumber, totalAmount, chargedAt } = opts;
  const closing = 'Liebe Grüße';
  const html = emailLayout({
    preheader: `Rechnung ${invoiceNumber}, ${formatEUR(totalAmount)} per Lastschrift eingezogen. Du musst nichts tun.`,
    bodyHtml: `<p>Hallo ${esc(customerName)},</p>
      <p>danke für die laufende Zusammenarbeit. Im Anhang findest du die Rechnung
      <strong>${esc(invoiceNumber)}</strong>.</p>
      ${emailBox(
        emailDataRows([
          ['Rechnung', invoiceNumber],
          ['Betrag', formatEUR(totalAmount)],
          ['Eingezogen am', chargedAt],
        ]),
      )}
      <p>Der Betrag wurde per SEPA-Lastschrift von deinem hinterlegten Konto
      eingezogen, du musst also nichts weiter tun.</p>
      <p>Bei Rückfragen einfach kurz Bescheid geben.</p>`,
    closing,
    sender: 'buchhaltung',
  });
  const text = [
    `Hallo ${customerName},`,
    '',
    `danke für die laufende Zusammenarbeit. Im Anhang findest du die Rechnung ${invoiceNumber} über ${formatEUR(totalAmount)}.`,
    '',
    `Der Betrag wurde am ${chargedAt} per SEPA-Lastschrift eingezogen, du musst nichts weiter tun.`,
    '',
    'Bei Rückfragen einfach kurz Bescheid geben.',
    '',
    emailSignatureText('buchhaltung', closing),
  ].join('\n');
  return {
    from: ACCOUNTING_FROM,
    replyTo: ACCOUNTING_REPLY_TO,
    subject: `Rechnung ${invoiceNumber} – Lastschrift eingezogen`,
    html,
    text,
  };
}

/**
 * Freie Vertriebs-/Akquise-Mail: Betreff + Nachricht kommen vom Nutzer
 * (ggf. aus einer Vorlage). Klartext wird für die HTML-Variante in
 * Absätze/Zeilenumbrüche übersetzt.
 */
export function buildDealEmail(opts: {
  subject: string;
  body: string;
}): { from: string; replyTo: string; subject: string; html: string; text: string } {
  const { subject, body } = opts;

  const htmlBody = ensureHtmlBody(body);
  const html = emailLayout({ bodyHtml: htmlBody, closing: 'Beste Grüße' });

  // Plaintext-Variante – HTML wird best-effort runtergebrochen.
  const plainBody = /<\/?[a-z][^>]*>/i.test(body) ? htmlToPlain(body) : body;
  const text = `${plainBody}\n\n${emailSignatureText('yusuf', 'Beste Grüße')}`;

  return { from: FROM_EMAIL, replyTo: REPLY_TO, subject, html, text };
}

/**
 * Benachrichtigung für neue Anfragen aus dem Kontaktformular auf
 * /webseiten. Wird an yusuf@kolac-digital.de gesendet.
 */
export function buildContactNotificationEmail(opts: {
  name: string;
  phone: string;
  email: string;
  message: string;
  company?: string;
  service?: string;
  source: string;
}): { from: string; replyTo: string; subject: string; html: string; text: string } {
  const { name, phone, email, message, company, service, source } = opts;
  const subject = `Neue Anfrage von ${name || 'Unbekannt'} (${source})`;

  const rows: Array<[string, string]> = [
    ['Name', name],
    ['Telefon', phone],
    ['E-Mail', email],
    ...(company ? ([['Unternehmen', company]] as Array<[string, string]>) : []),
    ...(service ? ([['Anliegen', service]] as Array<[string, string]>) : []),
    ['Quelle', source],
  ];

  const html = emailLayout({
    sender: 'none',
    preheader: `${name || 'Unbekannt'}${company ? `, ${company}` : ''}: ${message.slice(0, 100)}`,
    title: 'Neue Anfrage über das Kontaktformular',
    bodyHtml: `${emailDataRows(rows)}
      ${message ? emailBox(esc(message).replace(/\n/g, '<br/>')) : ''}`,
    button: phone ? { label: `${name || 'Kontakt'} anrufen`, href: `tel:${phone.replace(/[^+\d]/g, '')}` } : undefined,
    footnote: 'Antworte direkt auf diese Mail oder rufe an.',
  });

  const text = [
    'Neue Anfrage über das Kontaktformular.',
    '',
    `Name: ${name}`,
    `Telefon: ${phone}`,
    `E-Mail: ${email}`,
    company ? `Unternehmen: ${company}` : '',
    service ? `Anliegen: ${service}` : '',
    `Quelle: ${source}`,
    '',
    message ? `Nachricht:\n${message}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return { from: FROM_EMAIL, replyTo: email || REPLY_TO, subject, html, text };
}
