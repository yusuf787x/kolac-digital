import { formatEUR } from './utils';

const FROM_EMAIL = 'Kolac Digital <yusuf@kolac-digital.de>';
const REPLY_TO = 'yusuf@kolac-digital.de';

// WICHTIG: Einfache Anführungszeichen für "Segoe UI" – doppelte würden das
// style="..."-Attribut auf der Empfängerseite aufbrechen und den restlichen
// CSS-Text als sichtbaren Inhalt rendern.
const baseStyles = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0a0a0a; line-height: 1.6; font-size: 15px;`;

// Optionaler Pfad/URL zum Logo in der Signatur. Wenn nicht gesetzt, wird
// nur die Text-Signatur ohne Bild gerendert.
const LOGO_URL = process.env.EMAIL_LOGO_URL ?? '';

/**
 * HTML-Signaturblock – wird unter jede Vertriebs-E-Mail gehängt.
 */
function signatureHtml(): string {
  const logoCell = LOGO_URL
    ? `<td style="vertical-align: top; padding-right: 18px;">
        <img src="${LOGO_URL}" alt="Kolac Digital" width="80" style="display:block; border:0; width:80px; height:auto;" />
      </td>`
    : '';
  return `
<table cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.5; color: #0a0a0a;">
  <tr>
    ${logoCell}
    <td style="vertical-align: top;">
      <div style="font-weight: 600; font-size: 15px;">Yusuf Kolac</div>
      <div style="color: #6b7280;">Geschäftsführer</div>
      <div style="margin-top: 8px;">☎&nbsp;&nbsp;+49 176 95762018</div>
      <div>✉&nbsp;&nbsp;<a href="mailto:yusuf@kolac-digital.de" style="color:#2563eb; text-decoration:none;">yusuf@kolac-digital.de</a></div>
      <div>🌐&nbsp;&nbsp;<a href="https://www.kolac-digital.de" style="color:#2563eb; text-decoration:none;">www.kolac-digital.de</a></div>
      <div style="margin-top: 12px; font-weight: 600;">Kolac Digital</div>
      <div style="color: #6b7280;">Webseiten · Google- &amp; Meta Ads</div>
      <div style="color: #6b7280;">Social Media · Digitalisierung</div>
    </td>
  </tr>
</table>`;
}

/** Plaintext-Signatur (für den text/plain-Teil der E-Mail). */
const SIGNATURE_TEXT = [
  '--',
  'Yusuf Kolac',
  'Geschäftsführer',
  '☎  +49 176 95762018',
  '✉  yusuf@kolac-digital.de',
  '🌐  www.kolac-digital.de',
  '',
  'Kolac Digital',
  'Webseiten · Google- & Meta Ads',
  'Social Media · Digitalisierung',
].join('\n');

export function buildInvoiceEmail(opts: {
  customerName: string;
  invoiceNumber: string;
  totalAmount: number;
  dueDate: string;
}): { from: string; replyTo: string; subject: string; html: string; text: string } {
  const { customerName, invoiceNumber, totalAmount, dueDate } = opts;
  const subject = `Rechnung ${invoiceNumber} – Kolac Digital`;

  const html = `<div style="${baseStyles}">
    <p>Hallo ${customerName || ''},</p>
    <p>im Anhang finden Sie die Rechnung <strong>${invoiceNumber}</strong> über
    <strong>${formatEUR(totalAmount)}</strong>.</p>
    <p>Zahlungsziel: <strong>${dueDate}</strong></p>
    <p>Bitte überweisen Sie den Betrag unter Angabe der Rechnungsnummer.
    Den GiroCode auf der Rechnung können Sie mit Ihrer Banking-App scannen,
    dann ist die Überweisung in Sekunden vorausgefüllt.</p>
    <p>Bei Fragen melden Sie sich gerne.</p>
    <p>Vielen Dank und liebe Grüße<br/>Yusuf Kolac<br/>Kolac Digital</p>
  </div>`;

  const text = [
    `Hallo ${customerName},`,
    '',
    `im Anhang finden Sie die Rechnung ${invoiceNumber} über ${formatEUR(totalAmount)}.`,
    `Zahlungsziel: ${dueDate}`,
    '',
    'Bitte überweisen Sie den Betrag unter Angabe der Rechnungsnummer.',
    'Den GiroCode auf der Rechnung können Sie mit Ihrer Banking-App scannen.',
    '',
    'Vielen Dank und liebe Grüße',
    'Yusuf Kolac',
    'Kolac Digital',
  ].join('\n');

  return { from: FROM_EMAIL, replyTo: REPLY_TO, subject, html, text };
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

  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const htmlBody = escaped.replace(/\n/g, '<br/>');

  const html = `<div style="${baseStyles}">${htmlBody}${signatureHtml()}</div>`;
  const text = `${body}\n\n${SIGNATURE_TEXT}`;

  return { from: FROM_EMAIL, replyTo: REPLY_TO, subject, html, text };
}

export function buildReminderEmail(opts: {
  customerName: string;
  invoiceNumber: string;
  dueDate: string;
  daysOverdue: number;
  remainingAmount: number;
}): { from: string; replyTo: string; subject: string; html: string; text: string } {
  const {
    customerName,
    invoiceNumber,
    dueDate,
    daysOverdue,
    remainingAmount,
  } = opts;
  const subject = `Zahlungserinnerung – Rechnung ${invoiceNumber}`;

  const overdueText =
    daysOverdue > 0
      ? `Das Zahlungsziel war der ${dueDate} – die Rechnung ist seit ${daysOverdue} ${daysOverdue === 1 ? 'Tag' : 'Tagen'} überfällig.`
      : `Die Rechnung war bis zum ${dueDate} fällig.`;

  const html = `<div style="${baseStyles}">
    <p>Hallo ${customerName || ''},</p>
    <p>kurze Erinnerung zur Rechnung <strong>${invoiceNumber}</strong> über
    <strong>${formatEUR(remainingAmount)}</strong>.</p>
    <p>${overdueText}</p>
    <p>Falls die Zahlung bereits unterwegs ist, hat sich diese Mail gerade
    überschnitten. Sonst freue ich mich, wenn Sie den Betrag in den nächsten
    Tagen überweisen könnten.</p>
    <p>Bei Fragen oder wenn etwas im Weg steht – einfach kurz Bescheid geben,
    dann finden wir eine Lösung.</p>
    <p>Vielen Dank und liebe Grüße<br/>Yusuf Kolac<br/>Kolac Digital</p>
  </div>`;

  const text = [
    `Hallo ${customerName},`,
    '',
    `kurze Erinnerung zur Rechnung ${invoiceNumber} über ${formatEUR(remainingAmount)}.`,
    overdueText,
    '',
    'Bei Fragen oder wenn etwas im Weg steht — einfach kurz Bescheid geben.',
    '',
    'Vielen Dank und liebe Grüße',
    'Yusuf Kolac',
    'Kolac Digital',
  ].join('\n');

  return { from: FROM_EMAIL, replyTo: REPLY_TO, subject, html, text };
}
