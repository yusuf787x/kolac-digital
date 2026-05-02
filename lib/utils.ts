/**
 * Format an amount in EUR using the German locale.
 */
export function formatEUR(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a Date as DD.MM.YYYY (German short date).
 */
export function formatDateDE(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Build the next invoice number based on a settings counter and the invoice
 * date. Format switches automatically: until 2026-12-31 → "R<n>",
 * from 2027-01-01 onwards → "KD-YYYY-NNN" (year-prefixed, 3-digit padded).
 */
export function buildInvoiceNumber(
  counter: number,
  invoiceDate: Date,
): string {
  const year = invoiceDate.getFullYear();
  if (year >= 2027) {
    return `KD-${year}-${String(counter).padStart(3, '0')}`;
  }
  return `R${counter}`;
}

/**
 * Strip all whitespace from an IBAN — required for EPC/GiroCode payload.
 */
export function normalizeIBAN(iban: string): string {
  return iban.replace(/\s+/g, '');
}

/**
 * Build the EPC069-12 (GiroCode) payload string.
 * Banking apps scan this QR code and pre-fill the SEPA transfer.
 */
export function buildEpcQrPayload(opts: {
  recipientName: string;
  iban: string;
  bic: string;
  amount: number;
  reference: string;
}): string {
  const { recipientName, iban, bic, amount, reference } = opts;
  const cleanIban = normalizeIBAN(iban);
  const formattedAmount = `EUR${amount.toFixed(2)}`;

  return [
    'BCD',
    '002',
    '1',
    'SCT',
    bic,
    recipientName,
    cleanIban,
    formattedAmount,
    '',
    reference,
  ].join('\n');
}

/**
 * Determine if an invoice is overdue: status not paid AND due date in the past.
 */
export function isOverdue(
  status: string,
  dueDate: Date,
  now: Date = new Date(),
): boolean {
  if (status === 'paid') return false;
  return dueDate.getTime() < now.getTime();
}

/**
 * Days overdue, floored to 0.
 */
export function daysOverdue(
  dueDate: Date,
  now: Date = new Date(),
): number {
  const diff = now.getTime() - dueDate.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}
