import { formatEUR } from './utils';

const FROM_EMAIL = 'Kolac Digital <yusuf@kolac-digital.de>';
const REPLY_TO = 'yusuf@kolac-digital.de';

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #0a0a0a;
  line-height: 1.6;
  font-size: 15px;
`;

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
