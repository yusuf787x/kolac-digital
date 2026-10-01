import type { Expense, BusinessTrip } from './types';
import {
  EXPENSE_CATEGORY_META,
  TRAVEL_EXPENSE_META,
  NICHT_ABZIEHBAR_KENNZAHL,
} from './types';
import { computeExpenseEurBreakdown } from './utils';

/**
 * Aggregiert Belege und Fahrten zur Betriebsausgabenseite der Anlage EÜR.
 *
 * Bewusst als reine Funktion ohne React, damit die steuerkritische
 * Rechnung testbar ist und nicht in einem useMemo versteckt liegt.
 *
 * Regeln, die hier zusammenlaufen:
 *   - Ausgebuchte Belege (`excluded`) zaehlen nirgends mit. Sie bleiben
 *     als Nachweis im System, sind aber steuerlich erledigt.
 *   - Bewirtung und Geschenke sind nur anteilig abziehbar. Elster hat
 *     dafuer zwei Felder je Zeile, deshalb werden abziehbarer und nicht
 *     abziehbarer Teil getrennt gefuehrt.
 *   - Fahrten mit dem Privatwagen gehen als Nutzungseinlage in eine
 *     eigene Zeile. Keine Umsatzsteuer, also ist der Betrag zugleich
 *     brutto, netto und abziehbar.
 */

export interface EurZeile {
  line: number;
  kennzahl: number;
  /** Kennzahl des linken Felds, falls die Zeile zwei Felder hat. */
  kennzahlNichtAbziehbar: number | null;
  label: string;
  net: number;
  deductible: number;
  nonDeductible: number;
}

export interface EurReport {
  zeilen: EurZeile[];
  totalNet: number;
  totalDeductible: number;
  totalNonDeductible: number;
  /** Summe der Fahrtkosten. Gleichzeitig der Betrag fuer Zeile 107. */
  tripSum: number;
  tripKm: number;
  tripCount: number;
  /** Monatssummen der Ausgaben, brutto, inklusive Fahrten. */
  byMonth: number[];
  /** Ausgaben je Kategorie, brutto, inklusive Fahrten. */
  byCategory: Record<string, number>;
  /** Belege, die ausgebucht wurden. Nur zur Anzeige. */
  excludedCount: number;
  excludedGross: number;
  /** Kennzahlen zur Bewirtung fuer den Hinweistext. */
  bewirtungGross: number;
  bewirtungNet: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function buildEurReport(
  expenses: Expense[],
  trips: BusinessTrip[],
  year: number,
): EurReport {
  const byLine = new Map<number, EurZeile>();
  const byMonth = Array.from({ length: 12 }, () => 0);
  const byCategory: Record<string, number> = {};

  let totalNet = 0;
  let totalDeductible = 0;
  let totalNonDeductible = 0;
  let excludedCount = 0;
  let excludedGross = 0;
  let bewirtungGross = 0;
  let bewirtungNet = 0;

  for (const e of expenses) {
    const d = e.date.toDate();
    if (d.getFullYear() !== year) continue;

    if (e.excluded) {
      excludedCount += 1;
      excludedGross += e.amount;
      continue;
    }

    const meta = EXPENSE_CATEGORY_META[e.category];
    if (!meta) continue;

    const eur = computeExpenseEurBreakdown(
      e.amount,
      e.vatRate ?? 0,
      meta.deductibleRate,
      !!e.reverseCharge,
    );

    byMonth[d.getMonth()] += e.amount;
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;

    totalNet += eur.net;
    totalDeductible += eur.deductibleNet;
    totalNonDeductible += eur.nonDeductibleNet;

    if (e.category === 'Bewirtung') {
      bewirtungGross += eur.gross;
      bewirtungNet += eur.net;
    }

    const vorhanden = byLine.get(meta.elsterLine);
    if (vorhanden) {
      vorhanden.net += eur.net;
      vorhanden.deductible += eur.deductibleNet;
      vorhanden.nonDeductible += eur.nonDeductibleNet;
    } else {
      byLine.set(meta.elsterLine, {
        line: meta.elsterLine,
        kennzahl: meta.kennzahl,
        kennzahlNichtAbziehbar:
          NICHT_ABZIEHBAR_KENNZAHL[meta.elsterLine] ?? null,
        label: meta.elsterLabel,
        net: eur.net,
        deductible: eur.deductibleNet,
        nonDeductible: eur.nonDeductibleNet,
      });
    }
  }

  const yearTrips = trips
    .filter((t) => t.date.toDate().getFullYear() === year)
    .sort((a, b) => a.date.toMillis() - b.date.toMillis());

  const tripSum = round2(yearTrips.reduce((a, t) => a + t.amount, 0));
  const tripKm = Math.round(yearTrips.reduce((a, t) => a + t.totalKm, 0) * 10) / 10;

  if (tripSum > 0) {
    byLine.set(TRAVEL_EXPENSE_META.elsterLine, {
      line: TRAVEL_EXPENSE_META.elsterLine,
      kennzahl: TRAVEL_EXPENSE_META.kennzahl,
      kennzahlNichtAbziehbar: null,
      label: TRAVEL_EXPENSE_META.elsterLabel,
      net: tripSum,
      deductible: tripSum,
      nonDeductible: 0,
    });
    totalNet += tripSum;
    totalDeductible += tripSum;
    byCategory['Fahrtkosten (Pauschale)'] =
      (byCategory['Fahrtkosten (Pauschale)'] ?? 0) + tripSum;
    for (const t of yearTrips) {
      byMonth[t.date.toDate().getMonth()] += t.amount;
    }
  }

  const zeilen = Array.from(byLine.values())
    .map((z) => ({
      ...z,
      net: round2(z.net),
      deductible: round2(z.deductible),
      nonDeductible: round2(z.nonDeductible),
    }))
    .sort((a, b) => a.line - b.line);

  return {
    zeilen,
    totalNet: round2(totalNet),
    totalDeductible: round2(totalDeductible),
    totalNonDeductible: round2(totalNonDeductible),
    tripSum,
    tripKm,
    tripCount: yearTrips.length,
    byMonth: byMonth.map(round2),
    byCategory,
    excludedCount,
    excludedGross: round2(excludedGross),
    bewirtungGross: round2(bewirtungGross),
    bewirtungNet: round2(bewirtungNet),
  };
}

/**
 * Prueft den Bericht auf Dinge, die beim Uebertragen nach Elster
 * schiefgehen koennen. Liefert Klartext-Hinweise statt stiller Fehler.
 */
export interface EurPruefung {
  art: 'pflicht' | 'hinweis';
  text: string;
}

export function pruefeEurReport(report: EurReport): EurPruefung[] {
  const hinweise: EurPruefung[] = [];

  if (report.tripSum > 0) {
    hinweise.push({
      art: 'pflicht',
      text: `Zeile 107 (Kennzahl 123) muss ${report.tripSum
        .toFixed(2)
        .replace('.', ',')} € als Nutzungseinlage enthalten, sonst lehnt Elster die Abgabe ab.`,
    });
  }

  for (const z of report.zeilen) {
    if (z.nonDeductible > 0 && !z.kennzahlNichtAbziehbar) {
      hinweise.push({
        art: 'hinweis',
        text: `Zeile ${z.line} hat einen nicht abziehbaren Anteil, aber keine hinterlegte Kennzahl dafür. Bitte im Formular nachsehen.`,
      });
    }
  }

  const summeZeilen = round2(
    report.zeilen.reduce((a, z) => a + z.deductible, 0),
  );
  if (Math.abs(summeZeilen - report.totalDeductible) > 0.02) {
    hinweise.push({
      art: 'hinweis',
      text: `Die Summe der Zeilen (${summeZeilen}) weicht von der Gesamtsumme (${report.totalDeductible}) ab. Das sollte nicht passieren.`,
    });
  }

  return hinweise;
}
