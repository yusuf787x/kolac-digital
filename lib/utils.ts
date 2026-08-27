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
 * Defensiv: konvertiert einen Firestore-Timestamp in ein Date, oder gibt
 * null zurück, wenn der Wert fehlt / null ist (z.B. wenn ein Dokument
 * manuell angelegt wurde oder serverTimestamp() noch nicht aufgelöst hat).
 *
 * Nutzbar mit jedem Objekt, das eine `.toDate()`-Methode hat — wir
 * vermeiden hier den Import von Firestore-Typen, um Zyklen zu vermeiden.
 */
export function tsToDate(
  ts: { toDate: () => Date } | null | undefined,
): Date | null {
  if (!ts || typeof ts.toDate !== 'function') return null;
  try {
    return ts.toDate();
  } catch {
    return null;
  }
}

/**
 * Defensiv: Timestamp -> Millisekunden, mit Fallback für null/undefined.
 */
export function tsToMillis(
  ts: { toMillis: () => number } | null | undefined,
  fallback = 0,
): number {
  if (!ts || typeof ts.toMillis !== 'function') return fallback;
  try {
    return ts.toMillis();
  } catch {
    return fallback;
  }
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
 * Defensiv: formatiert einen Firestore-Timestamp, oder gibt einen
 * Fallback ("—") zurück, falls der Wert fehlt.
 */
export function formatTsDE(
  ts: { toDate: () => Date } | null | undefined,
  fallback = '—',
): string {
  const d = tsToDate(ts);
  return d ? formatDateDE(d) : fallback;
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
 * Build a quote number: A-YYYY-NNN format, year-prefixed, 3-digit padded.
 * Independent counter from invoices.
 */
export function buildQuoteNumber(counter: number, quoteDate: Date): string {
  const year = quoteDate.getFullYear();
  return `A-${year}-${String(counter).padStart(3, '0')}`;
}

/**
 * Auftragsbestaetigungs-Nummer: eigener Zaehler, Format AB-YYYY-NNN.
 * Getrennt vom Angebots-Nummernkreis, damit die Zaehler unabhaengig
 * laufen (eine AB gehoert nicht immer zu einem Angebot).
 */
export function buildOrderConfirmationNumber(
  counter: number,
  date: Date,
): string {
  const year = date.getFullYear();
  return `AB-${year}-${String(counter).padStart(3, '0')}`;
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

/**
 * Stichtag fuer den Wechsel von Kleinunternehmer (§ 19 UStG, 0% USt)
 * zur Regelbesteuerung mit 19% USt. Vor diesem Datum laufen Belege
 * weiterhin ohne MwSt, danach mit Regelsatz.
 */
export const VAT_REGULAR_START = new Date('2026-07-01T00:00:00');

/**
 * Default-MwSt-Satz fuer ein Datum:
 *   - vor 01.07.2026  -> 0 (Kleinunternehmer)
 *   - ab  01.07.2026  -> 0.19 (Regelsatz)
 */
export function defaultVatRateForDate(d: Date | string): number {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return 0;
  return date.getTime() >= VAT_REGULAR_START.getTime() ? 0.19 : 0;
}

/**
 * Mehrwertsteuer-Berechnung aus einem Netto-Betrag. Rundet auf 2
 * Nachkommastellen, damit z.B. 99 * 0.19 nicht als 18.81000000001
 * rumliegt.
 */
export function computeVat(
  netAmount: number,
  vatRate: number | null | undefined,
): { net: number; vat: number; gross: number; rate: number } {
  const rate = vatRate ?? 0;
  const net = Math.round(netAmount * 100) / 100;
  const vat = Math.round(net * rate * 100) / 100;
  const gross = Math.round((net + vat) * 100) / 100;
  return { net, vat, gross, rate };
}

/**
 * Umkehrung: aus einem Brutto-Betrag den Netto-Betrag bei gegebenem
 * MwSt-Satz herausrechnen (z.B. fuer GoCardless-Einzug, der brutto ist).
 */
export function grossToNet(
  grossAmount: number,
  vatRate: number,
): { net: number; vat: number; gross: number } {
  const gross = Math.round(grossAmount * 100) / 100;
  const net = Math.round((gross / (1 + vatRate)) * 100) / 100;
  const vat = Math.round((gross - net) * 100) / 100;
  return { net, vat, gross };
}

/**
 * Ist-Versteuerung: gibt die effektiven Zahlungseingaenge einer
 * Rechnung zurueck. Wenn `payments[]` gepflegt ist (neue Datensaetze),
 * werden die verwendet. Bei Legacy-Rechnungen ohne payments-Array,
 * aber mit paidAt + paidAmount > 0, wird synthetisch EIN Zahlungs-
 * eingang zurueckgegeben (paidAt/paidAmount).
 *
 * Damit muss der DB-Datensatz nicht angepackt werden, um alte
 * Rechnungen konsistent zu behandeln.
 */
export function effectivePayments(invoice: {
  payments?: Array<{ paidAt: unknown; amount: number; note?: string }>;
  paidAt: unknown;
  paidAmount: number;
}): Array<{ paidAt: unknown; amount: number; note?: string }> {
  if (invoice.payments && invoice.payments.length > 0) {
    return invoice.payments;
  }
  if (invoice.paidAt && invoice.paidAmount > 0) {
    return [{ paidAt: invoice.paidAt, amount: invoice.paidAmount }];
  }
  return [];
}

/**
 * Ist-Versteuerung: berechnet die im Zeitraum zu deklarierende
 * Umsatzsteuer einer Rechnung basierend auf den Zahlungseingaengen
 * in diesem Zeitraum.
 *
 * Methode: Anteil der Brutto-Zahlung im Zeitraum an der Gesamt-Brutto-
 * Summe der Rechnung, angewandt auf Netto/USt/Brutto je Steuersatz.
 * Bei gemischten Saetzen wird also proportional aufgeteilt — das ist
 * eine praktikable Vereinfachung, weil eine echte "Zuordnung Zahlung
 * zu Position" bei Ueberweisungen ohne Verwendungszweck sowieso
 * nicht sauber moeglich ist.
 *
 * Rechnungen ohne Zahlung im Zeitraum liefern Nullen zurueck.
 */
export function computeIstOutputVatForInvoice(
  invoiceItems: Array<{ totalPrice: number; vatRate?: number; optional?: boolean }>,
  invoiceVatRate: number | null | undefined,
  payments: Array<{ paidAt: Date; amount: number }>,
  inPeriod: (d: Date) => boolean,
): {
  paidGross: number;
  paidNet: number;
  paidVat: number;
  byRate: Array<{ rate: number; net: number; vat: number; gross: number }>;
} {
  const total = computeInvoiceVat(invoiceItems, invoiceVatRate ?? 0);
  const totalGross = total.gross;
  if (totalGross <= 0) {
    return { paidGross: 0, paidNet: 0, paidVat: 0, byRate: [] };
  }
  const paidGross = payments
    .filter((p) => inPeriod(p.paidAt))
    .reduce((s, p) => s + p.amount, 0);
  if (paidGross <= 0) {
    return { paidGross: 0, paidNet: 0, paidVat: 0, byRate: [] };
  }
  const share = paidGross / totalGross;
  const byRate = total.byRate.map((r) => ({
    rate: r.rate,
    net: Math.round(r.net * share * 100) / 100,
    vat: Math.round(r.vat * share * 100) / 100,
    gross: Math.round(r.gross * share * 100) / 100,
  }));
  const paidNet = Math.round(total.net * share * 100) / 100;
  const paidVat = Math.round(total.vat * share * 100) / 100;
  return {
    paidGross: Math.round(paidGross * 100) / 100,
    paidNet,
    paidVat,
    byRate,
  };
}

/**
 * Zerlegt einen Beleg in die EÜR-relevanten Betraege.
 *
 * Fuer Bewirtung (deductibleRate = 0.7) sind nur 70 % des Netto-Betrags
 * als Betriebsausgabe abziehbar; die restlichen 30 % sind steuerlich
 * unbeachtlich (keine Betriebsausgabe). Die Vorsteuer bleibt zu 100 %
 * abziehbar — die Kuerzung wirkt ausschliesslich auf die Ertragsteuer.
 *
 * Bei Reverse Charge (§ 13b): `amount` ist bereits netto, es wurde
 * nichts an USt vom Lieferant einbehalten, daher net = amount.
 */
export function computeExpenseEurBreakdown(
  amount: number,
  vatRate: number,
  deductibleRate: number,
  reverseCharge: boolean,
): {
  gross: number;
  net: number;
  vat: number;
  deductibleNet: number;
  nonDeductibleNet: number;
} {
  const rate = deductibleRate ?? 1;
  let net: number;
  let vat: number;
  let gross: number;
  if (reverseCharge) {
    net = Math.round(amount * 100) / 100;
    vat = Math.round(net * vatRate * 100) / 100;
    gross = net;
  } else {
    const split = grossToNet(amount, vatRate);
    net = split.net;
    vat = split.vat;
    gross = split.gross;
  }
  const deductibleNet = Math.round(net * rate * 100) / 100;
  const nonDeductibleNet = Math.round((net - deductibleNet) * 100) / 100;
  return { gross, net, vat, deductibleNet, nonDeductibleNet };
}

/**
 * Rechnet Netto/USt/Brutto ueber alle Positionen einer Rechnung —
 * mit position-spezifischem `vatRate` (fallback auf Rechnungs-Satz).
 * Notwendig, weil eine Rechnung Positionen mit unterschiedlichen
 * Steuersaetzen haben kann (z.B. 19% Beratung + 0% durchlaufender
 * Posten fuer Werbebudget).
 *
 * Rueckgabe:
 *   - `net`, `vat`, `gross`: Gesamtsummen der Rechnung
 *   - `byRate`: nach Steuersatz gruppierte Zeilen fuer die PDF/Detail-
 *     Anzeige ("Netto zu 19% = X, USt = Y ...")
 *
 * Position-Interface hier absichtlich lose typisiert (statt Import
 * aus types.ts), damit auch Draft-Items aus dem Formular ohne den
 * vollen InvoiceItem-Shape durchgereicht werden koennen.
 */
export function computeInvoiceVat(
  items: Array<{
    totalPrice: number;
    vatRate?: number;
    optional?: boolean;
  }>,
  fallbackVatRate: number | null | undefined,
  opts: { includeOptional?: boolean } = {},
): {
  net: number;
  vat: number;
  gross: number;
  byRate: Array<{ rate: number; net: number; vat: number; gross: number }>;
} {
  const fallback = fallbackVatRate ?? 0;
  const buckets = new Map<number, { net: number; vat: number }>();
  const source = opts.includeOptional
    ? items
    : items.filter((i) => !i.optional);

  for (const it of source) {
    const rate = it.vatRate ?? fallback;
    const net = it.totalPrice;
    const vat = net * rate;
    const bucket = buckets.get(rate) ?? { net: 0, vat: 0 };
    bucket.net += net;
    bucket.vat += vat;
    buckets.set(rate, bucket);
  }

  const byRate = Array.from(buckets.entries())
    .sort((a, b) => b[0] - a[0]) // hoechster Satz zuerst
    .map(([rate, b]) => {
      const net = Math.round(b.net * 100) / 100;
      const vat = Math.round(b.vat * 100) / 100;
      return { rate, net, vat, gross: Math.round((net + vat) * 100) / 100 };
    });

  const net = byRate.reduce((a, b) => a + b.net, 0);
  const vat = byRate.reduce((a, b) => a + b.vat, 0);
  return {
    net: Math.round(net * 100) / 100,
    vat: Math.round(vat * 100) / 100,
    gross: Math.round((net + vat) * 100) / 100,
    byRate,
  };
}
