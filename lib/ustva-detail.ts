import type { Invoice, InvoicePayment } from './types';
import { effectivePayments, computeIstOutputVatForInvoice } from './utils';

/**
 * Baut die Detailansicht der Einnahmen fuer die Umsatzsteuer-
 * voranmeldung.
 *
 * Eine Zeile je RECHNUNG, nicht je Zahlung. Das ist der entscheidende
 * Punkt: eine Rechnung kann mehrere Zahlungseingaenge haben, etwa bei
 * Teilzahlungen. Rendert man je Zahlung eine Zeile, sieht es aus, als
 * waere die Rechnung mehrfach erfasst und die Umsatzsteuer doppelt
 * berechnet. Die Summen stimmen in beiden Faellen, aber nur die
 * Gruppierung je Rechnung ist nachvollziehbar.
 *
 * Der Steuersatz wird mit ausgewiesen, damit auch Positionen mit 0 %
 * sichtbar sind. Die tauchen sonst nur im Netto-Betrag auf, ohne dass
 * erkennbar waere, dass darauf keine Umsatzsteuer entfaellt.
 */

export interface UstvaDetailRate {
  rate: number;
  net: number;
  vat: number;
  gross: number;
}

export interface UstvaDetailRow {
  invoiceId: string;
  invoiceNumber: string | null;
  customerId: string;
  /** Zahlungsdaten im Zeitraum, aufsteigend. */
  paymentDates: Date[];
  /** Anzahl Zahlungseingaenge im Zeitraum. */
  paymentCount: number;
  /** Summe der Zahlungen im Zeitraum. */
  paidGross: number;
  paidNet: number;
  paidVat: number;
  /** Aufteilung nach Steuersatz. Leere Saetze sind herausgefiltert. */
  byRate: UstvaDetailRate[];
  /**
   * true, wenn mehrere Zahlungen zusammengefasst wurden. Die Oberflaeche
   * kann das kennzeichnen, damit niemand eine Doppelerfassung vermutet.
   */
  mehrfachZahlung: boolean;
}

export function buildUstvaDetail(
  invoices: Invoice[],
  inRange: (d: Date) => boolean,
): UstvaDetailRow[] {
  const rows: UstvaDetailRow[] = [];

  for (const inv of invoices) {
    const pays = (effectivePayments(inv) as InvoicePayment[]).filter((p) =>
      inRange(p.paidAt.toDate()),
    );
    if (pays.length === 0) continue;

    // Alle Zahlungen des Zeitraums gemeinsam bewerten. Einzeln gerechnet
    // entstehen durch die anteilige Aufteilung Zwischenwerte, die fuer
    // sich genommen keinen Sinn ergeben.
    const v = computeIstOutputVatForInvoice(
      inv.items,
      inv.vatRate,
      pays.map((p) => ({ paidAt: p.paidAt.toDate(), amount: p.amount })),
      () => true,
    );
    if (v.paidGross <= 0) continue;

    rows.push({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerId: inv.customerId,
      paymentDates: pays
        .map((p) => p.paidAt.toDate())
        .sort((a, b) => a.getTime() - b.getTime()),
      paymentCount: pays.length,
      paidGross: v.paidGross,
      paidNet: v.paidNet,
      paidVat: v.paidVat,
      byRate: v.byRate.filter((r) => r.gross !== 0),
      mehrfachZahlung: pays.length > 1,
    });
  }

  return rows.sort(
    (a, b) =>
      (a.paymentDates[0]?.getTime() ?? 0) - (b.paymentDates[0]?.getTime() ?? 0),
  );
}

/** Summen ueber alle Detailzeilen. Dient als Gegenprobe zur Kopfzeile. */
export function summiereDetail(rows: UstvaDetailRow[]): {
  gross: number;
  net: number;
  vat: number;
  byRate: UstvaDetailRate[];
} {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const byRate = new Map<number, UstvaDetailRate>();
  let gross = 0;
  let net = 0;
  let vat = 0;

  for (const r of rows) {
    gross += r.paidGross;
    net += r.paidNet;
    vat += r.paidVat;
    for (const x of r.byRate) {
      const prev = byRate.get(x.rate) ?? {
        rate: x.rate,
        net: 0,
        vat: 0,
        gross: 0,
      };
      byRate.set(x.rate, {
        rate: x.rate,
        net: prev.net + x.net,
        vat: prev.vat + x.vat,
        gross: prev.gross + x.gross,
      });
    }
  }

  return {
    gross: round2(gross),
    net: round2(net),
    vat: round2(vat),
    byRate: Array.from(byRate.values())
      .map((r) => ({
        rate: r.rate,
        net: round2(r.net),
        vat: round2(r.vat),
        gross: round2(r.gross),
      }))
      .sort((a, b) => b.rate - a.rate),
  };
}

/** Formatiert einen Steuersatz als Prozentangabe fuer die Anzeige. */
export function formatRate(rate: number): string {
  return `${Math.round(rate * 100 * 100) / 100} %`;
}
