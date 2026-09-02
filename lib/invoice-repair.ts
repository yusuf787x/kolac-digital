import { Timestamp } from 'firebase/firestore';
import type { Invoice, InvoicePayment } from './types';

/**
 * Einmalige Datenbereinigung der Zahlungs-Felder.
 *
 * Hintergrund: vor der Umstellung setzte "Als bezahlt markieren"
 * `paidAmount = totalAmount`. `totalAmount` ist aber der NETTO-Betrag.
 * Bei Rechnungen mit MwSt stand danach ein zu niedriger Betrag drin
 * (netto statt brutto), und die Rechnung sah aus wie teilbezahlt.
 *
 * Diese Analyse findet solche Faelle und schlaegt die Korrektur vor.
 * Sie schreibt nichts — das macht die Reparatur-Seite nach Bestaetigung.
 */

export type RepairKind =
  | 'ok'
  | 'netto-statt-brutto'
  | 'payments-fehlen'
  | 'summe-weicht-ab';

export interface RepairPlan {
  invoice: Invoice;
  kind: RepairKind;
  /** Menschenlesbare Begruendung fuer die Anzeige. */
  reason: string;
  /** Brutto-Gesamtbetrag der Rechnung. */
  bruttoTotal: number;
  /** paidAmount wie er aktuell in der DB steht. */
  currentPaidAmount: number;
  /** paidAmount nach der Reparatur. */
  nextPaidAmount: number;
  /** payments[] nach der Reparatur. */
  nextPayments: InvoicePayment[];
  /** Datum, das fuer einen fehlenden Zahlungseingang angesetzt wird. */
  assumedDate: Date | null;
  /** Woher das angesetzte Datum stammt (fuer Transparenz). */
  dateSource: 'paidAt' | 'faelligkeit' | 'rechnungsdatum' | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const nearlyEqual = (a: number, b: number) => Math.abs(a - b) < 0.01;

/**
 * Ermittelt das anzusetzende Zahlungsdatum, wenn keins gespeichert ist.
 * Annahme laut Absprache: Alt-Rechnungen wurden fristgemaess gezahlt,
 * also gilt das Faelligkeitsdatum. Falls auch das fehlt: Rechnungsdatum.
 */
function resolvePaymentDate(inv: Invoice): {
  date: Date;
  source: RepairPlan['dateSource'];
} {
  if (inv.paidAt) return { date: inv.paidAt.toDate(), source: 'paidAt' };
  if (inv.dueDate) return { date: inv.dueDate.toDate(), source: 'faelligkeit' };
  return { date: inv.invoiceDate.toDate(), source: 'rechnungsdatum' };
}

/**
 * Analysiert eine einzelne Rechnung und gibt zurueck, ob und wie sie
 * korrigiert werden muss. Entwuerfe ohne Nummer werden ignoriert.
 */
export function analyzeInvoice(inv: Invoice): RepairPlan {
  const bruttoTotal = round2(inv.totalAmount * (1 + (inv.vatRate ?? 0)));
  const currentPaidAmount = round2(inv.paidAmount ?? 0);
  const existingPayments = inv.payments ?? [];
  const paymentsSum = round2(
    existingPayments.reduce((s, p) => s + p.amount, 0),
  );

  const base = {
    invoice: inv,
    bruttoTotal,
    currentPaidAmount,
    assumedDate: null as Date | null,
    dateSource: null as RepairPlan['dateSource'],
  };

  // Entwuerfe und unbezahlte Rechnungen: nichts zu tun.
  if (inv.invoiceNumber === null) {
    return {
      ...base,
      kind: 'ok',
      reason: 'Entwurf ohne Nummer, nicht buchhaltungsrelevant.',
      nextPaidAmount: currentPaidAmount,
      nextPayments: existingPayments,
    };
  }
  if (
    inv.status !== 'paid' &&
    inv.status !== 'partially_paid' &&
    currentPaidAmount === 0
  ) {
    return {
      ...base,
      kind: 'ok',
      reason: 'Noch keine Zahlung erfasst.',
      nextPaidAmount: 0,
      nextPayments: [],
    };
  }

  const { date, source } = resolvePaymentDate(inv);

  // Vollstaendig bezahlt: paidAmount MUSS der Brutto-Betrag sein.
  if (inv.status === 'paid') {
    const alreadyCorrect =
      nearlyEqual(currentPaidAmount, bruttoTotal) &&
      existingPayments.length > 0 &&
      nearlyEqual(paymentsSum, bruttoTotal);

    if (alreadyCorrect) {
      return {
        ...base,
        kind: 'ok',
        reason: 'Zahlung vollständig und als Brutto erfasst.',
        nextPaidAmount: currentPaidAmount,
        nextPayments: existingPayments,
      };
    }

    // Klassischer Netto-Bug: paidAmount entspricht dem Netto-Betrag.
    const isNettoBug =
      (inv.vatRate ?? 0) > 0 &&
      nearlyEqual(currentPaidAmount, round2(inv.totalAmount)) &&
      currentPaidAmount < bruttoTotal;

    // Wenn schon Payments da sind, deren Summe stimmt, aber paidAmount
    // abweicht: paidAmount an die Summe angleichen statt neu zu bauen.
    if (existingPayments.length > 0 && !nearlyEqual(paymentsSum, bruttoTotal)) {
      return {
        ...base,
        kind: 'summe-weicht-ab',
        reason: `Status ist "bezahlt", aber die erfassten Zahlungen ergeben nur ${paymentsSum.toFixed(2)} € statt ${bruttoTotal.toFixed(2)} € brutto. Fehlbetrag wird als eine Zahlung ergänzt.`,
        nextPaidAmount: bruttoTotal,
        nextPayments: [
          ...existingPayments,
          {
            paidAt: Timestamp.fromDate(date),
            amount: round2(bruttoTotal - paymentsSum),
            note: 'Korrektur auf Brutto-Gesamtbetrag',
          },
        ],
        assumedDate: date,
        dateSource: source,
      };
    }

    return {
      ...base,
      kind: isNettoBug ? 'netto-statt-brutto' : 'payments-fehlen',
      reason: isNettoBug
        ? `Es steht der Netto-Betrag ${currentPaidAmount.toFixed(2)} € als bezahlt drin. Korrekt ist der Brutto-Betrag ${bruttoTotal.toFixed(2)} €.`
        : `Status ist "bezahlt", aber es ist kein Zahlungseingang hinterlegt. Wird als eine Zahlung über ${bruttoTotal.toFixed(2)} € brutto erfasst.`,
      nextPaidAmount: bruttoTotal,
      nextPayments: [
        {
          paidAt: Timestamp.fromDate(date),
          amount: bruttoTotal,
          ...(source === 'paidAt' ? {} : { note: 'Datum angenommen' }),
        },
      ],
      assumedDate: date,
      dateSource: source,
    };
  }

  // Teilbezahlt: der Betrag wurde manuell eingegeben, den lassen wir.
  // Nur die Historie ergaenzen, falls sie fehlt.
  if (existingPayments.length > 0 && nearlyEqual(paymentsSum, currentPaidAmount)) {
    return {
      ...base,
      kind: 'ok',
      reason: 'Teilzahlungen sind vollständig erfasst.',
      nextPaidAmount: currentPaidAmount,
      nextPayments: existingPayments,
    };
  }

  return {
    ...base,
    kind: 'payments-fehlen',
    reason: `Teilbezahlt mit ${currentPaidAmount.toFixed(2)} €, aber ohne Eintrag in der Zahlungshistorie. Wird als eine Zahlung erfasst.`,
    nextPaidAmount: currentPaidAmount,
    nextPayments: [
      {
        paidAt: Timestamp.fromDate(date),
        amount: currentPaidAmount,
        ...(source === 'paidAt' ? {} : { note: 'Datum angenommen' }),
      },
    ],
    assumedDate: date,
    dateSource: source,
  };
}

export const DATE_SOURCE_LABELS: Record<
  NonNullable<RepairPlan['dateSource']>,
  string
> = {
  paidAt: 'gespeichertes Bezahlt-Datum',
  faelligkeit: 'Fälligkeitsdatum (fristgemäß angenommen)',
  rechnungsdatum: 'Rechnungsdatum',
};
