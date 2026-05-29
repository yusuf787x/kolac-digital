import { formatEUR } from './utils';

const FROM_EMAIL = 'Kolac Digital <yusuf@kolac-digital.de>';
const REPLY_TO = 'yusuf@kolac-digital.de';

// WICHTIG: Einfache Anführungszeichen für "Segoe UI" – doppelte würden das
// style="..."-Attribut auf der Empfängerseite aufbrechen und den restlichen
// CSS-Text als sichtbaren Inhalt rendern.
const baseStyles = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0a0a0a; line-height: 1.6; font-size: 15px;`;

/**
 * Resolves die Basis-URL der gehosteten App, damit Bilder in der Signatur
 * vom Mailclient des Empfängers geladen werden können.
 *
 *  - APP_BASE_URL              manuelle Override (z.B. "https://app.kolac-digital.de")
 *  - NEXT_PUBLIC_APP_URL       gängiger Convention-Name
 *  - VERCEL_PROJECT_PRODUCTION_URL  kanonische Prod-URL auf Vercel
 *  - VERCEL_URL                aktuelle Deployment-URL auf Vercel
 */
function appBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return '';
}

/**
 * HTML-Signaturblock – wird unter jede Vertriebs-E-Mail gehängt. Zeigt
 * Profilbild + Logo links, formatierte Kontaktdaten rechts.
 */
function signatureHtml(): string {
  const base = appBaseUrl();
  const photoUrl = base ? `${base}/email/yk.png` : '';
  const logoUrl = base ? `${base}/email/logo.png` : '';

  const imageCell = base
    ? `<td style="vertical-align: top; padding-right: 22px; width: 120px;">
        <img src="${photoUrl}" alt="Yusuf Kolac" width="110" style="display:block; border:0; width:110px; height:auto; border-radius: 8px;" />
        <img src="${logoUrl}" alt="Kolac Digital" width="110" style="display:block; border:0; width:110px; height:auto; margin-top: 14px;" />
      </td>`
    : '';

  return `
<table cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px; padding-top: 18px; border-top: 1px solid #e5e7eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.55; color: #0a0a0a;">
  <tr>
    ${imageCell}
    <td style="vertical-align: top;">
      <div>Beste Grüße</div>
      <div style="font-weight: 600; font-size: 16px; margin-top: 2px;">Yusuf Kolac</div>

      <div style="margin-top: 14px;">
        <div style="font-weight: 600;">Kolac Digital</div>
        <div>Mobil:&nbsp;<a href="tel:+4917695762018" style="color:#0a0a0a; text-decoration:none;">+49 176 95762018</a></div>
        <div><a href="mailto:yusuf@kolac-digital.de" style="color:#2563eb; text-decoration:none;">yusuf@kolac-digital.de</a></div>
        <div><a href="https://www.kolac-digital.de" style="color:#2563eb; text-decoration:none;">www.kolac-digital.de</a></div>
      </div>

      <div style="margin-top: 14px; color: #6b7280; font-size: 13px;">
        <div><strong style="color:#0a0a0a;">Kolac Digital</strong></div>
        <div>Geschäftsführer</div>
        <div>Beckhausstraße 108</div>
        <div>33611 Bielefeld</div>
        <div>Yusuf Kolac</div>
        <div style="margin-top: 4px;">Webseiten · Google- &amp; Meta Ads · Social Media · Digitalisierung</div>
      </div>
    </td>
  </tr>
</table>`;
}

/** Plaintext-Signatur (für den text/plain-Teil der E-Mail). */
const SIGNATURE_TEXT = [
  '--',
  'Beste Grüße',
  'Yusuf Kolac',
  '',
  'Kolac Digital',
  'Mobil: +49 176 95762018',
  'yusuf@kolac-digital.de',
  'www.kolac-digital.de',
  '',
  'Kolac Digital',
  'Geschäftsführer',
  'Beckhausstraße 108',
  '33611 Bielefeld',
  'Yusuf Kolac',
  'Webseiten · Google- & Meta Ads · Social Media · Digitalisierung',
].join('\n');

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

  const htmlBody = ensureHtmlBody(body);
  const html = `<div style="${baseStyles}">${htmlBody}${signatureHtml()}</div>`;

  // Plaintext-Variante – HTML wird best-effort runtergebrochen.
  const plainBody = /<\/?[a-z][^>]*>/i.test(body) ? htmlToPlain(body) : body;
  const text = `${plainBody}\n\n${SIGNATURE_TEXT}`;

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
