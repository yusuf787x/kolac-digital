'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  listInvoices,
  listExpenses,
  listCustomers,
  listBusinessTrips,
} from '@/lib/firestore';
import type { Invoice, Expense, Customer, BusinessTrip } from '@/lib/types';
import {
  EXPENSE_CATEGORY_META,
  TRAVEL_EXPENSE_META,
  NICHT_ABZIEHBAR_KENNZAHL,
} from '@/lib/types';
import {
  formatEUR,
  formatDateDE,
  computeExpenseEurBreakdown,
} from '@/lib/utils';
import SensitiveValue from '@/components/ui/SensitiveValue';
import { buildEurReport, pruefeEurReport } from '@/lib/euer-report';

const MONTHS_DE = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
];

export default function BerichtePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [trips, setTrips] = useState<BusinessTrip[]>([]);
  const [customerMap, setCustomerMap] = useState<Map<string, Customer>>(new Map());
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    Promise.all([
      listInvoices(),
      listExpenses(),
      listCustomers(),
      listBusinessTrips(),
    ])
      .then(([inv, exp, cust, tr]) => {
        setInvoices(inv);
        setExpenses(exp);
        setCustomerMap(new Map(cust.map((c) => [c.id, c])));
        setTrips(tr);
      })
      .finally(() => setLoading(false));
  }, []);

  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    invoices.forEach((i) => set.add(i.invoiceDate.toDate().getFullYear()));
    expenses.forEach((e) => set.add(e.date.toDate().getFullYear()));
    trips.forEach((t) => set.add(t.date.toDate().getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [invoices, expenses, trips]);

  const data = useMemo(() => {
    // Die steuerkritische Rechnung liegt in lib/euer-report.ts und ist
    // dort mit Testfaellen abgedeckt. Hier kommen nur die Einnahmen und
    // die Darstellung dazu.
    const report = buildEurReport(expenses, trips, year);

    const byMonth = report.byMonth.map((expense) => ({ revenue: 0, expense }));
    invoices.forEach((inv) => {
      const d = inv.invoiceDate.toDate();
      if (d.getFullYear() !== year) return;
      const earned =
        inv.status === 'paid'
          ? inv.totalAmount
          : inv.status === 'partially_paid'
            ? inv.paidAmount
            : 0;
      byMonth[d.getMonth()].revenue += earned;
    });

    const totalRevenue = byMonth.reduce((a, m) => a + m.revenue, 0);
    const totalExpense = byMonth.reduce((a, m) => a + m.expense, 0);
    const maxBar = Math.max(
      ...byMonth.flatMap((m) => [m.revenue, m.expense]),
      1,
    );

    return {
      tripSum: report.tripSum,
      tripKm: report.tripKm,
      tripCount: report.tripCount,
      yearTrips: trips
        .filter((t) => t.date.toDate().getFullYear() === year)
        .sort((a, b) => a.date.toMillis() - b.date.toMillis()),
      byMonth,
      byCategory: report.byCategory,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      profit: Math.round((totalRevenue - totalExpense) * 100) / 100,
      maxBar,
      elsterRows: report.zeilen,
      eurTotalNet: report.totalNet,
      eurTotalDeductible: report.totalDeductible,
      eurTotalNonDeductible: report.totalNonDeductible,
      bewirtungGrossSum: report.bewirtungGross,
      bewirtungNetSum: report.bewirtungNet,
      excludedCount: report.excludedCount,
      excludedGross: report.excludedGross,
      pruefungen: pruefeEurReport(report),
    };
  }, [invoices, expenses, trips, year]);

  const exportInvoicesCSV = () => {
    const rows = [
      ['Datum', 'Rechnungsnr.', 'Kunde', 'Status', 'Betrag', 'Bezahlt'],
      ...invoices
        // Entwuerfe ohne Rechnungsnummer sind noch nicht buchhaltungs-
        // relevant und gehoeren nicht in den Einnahmen-Export.
        .filter((i) => i.invoiceNumber !== null)
        .filter((i) => i.invoiceDate.toDate().getFullYear() === year)
        .sort((a, b) => a.invoiceDate.toMillis() - b.invoiceDate.toMillis())
        .map((i) => [
          formatDateDE(i.invoiceDate.toDate()),
          i.invoiceNumber ?? '',
          customerMap.get(i.customerId)?.company ?? '',
          i.status,
          i.totalAmount.toFixed(2).replace('.', ','),
          i.paidAmount.toFixed(2).replace('.', ','),
        ]),
    ];
    downloadCSV(`einnahmen-${year}.csv`, rows);
  };

  const exportExpensesCSV = () => {
    const fmt = (n: number) => n.toFixed(2).replace('.', ',');
    const rows = [
      [
        'Datum',
        'Posten',
        'Kategorie',
        'EÜR-Zeile',
        'Kennzahl',
        'Lieferant',
        'Brutto',
        'Netto',
        'Vorsteuer',
        'Abziehbar (EÜR)',
        'Nicht abzugsfähig',
        'Reverse Charge',
        'In EÜR',
        'Bemerkung',
      ],
      ...expenses
        .filter((e) => e.date.toDate().getFullYear() === year)
        .sort((a, b) => a.date.toMillis() - b.date.toMillis())
        .map((e) => {
          const meta = EXPENSE_CATEGORY_META[e.category];
          const eur = computeExpenseEurBreakdown(
            e.amount,
            e.vatRate ?? 0,
            meta?.deductibleRate ?? 1,
            !!e.reverseCharge,
          );
          // Ausgebuchte Belege bleiben als Nachweis in der Liste, zaehlen
          // aber mit null, damit eine Summenbildung in der Tabelle stimmt.
          const aus = !!e.excluded;
          return [
            formatDateDE(e.date.toDate()),
            e.description,
            e.category,
            aus ? '' : meta ? String(meta.elsterLine) : '',
            aus ? '' : meta ? String(meta.kennzahl) : '',
            e.supplier,
            fmt(eur.gross),
            aus ? fmt(0) : fmt(eur.net),
            aus ? fmt(0) : fmt(eur.vat),
            aus ? fmt(0) : fmt(eur.deductibleNet),
            aus ? fmt(0) : fmt(eur.nonDeductibleNet),
            e.reverseCharge ? 'ja' : '',
            aus ? 'nein' : 'ja',
            aus
              ? 'Ausgebucht, mit der Kilometerpauschale abgegolten. Beleg bleibt als Nachweis.'
              : '',
          ];
        }),
      // Fahrten erscheinen als eigene Zeilen, damit die Ausgabenliste
      // vollstaendig ist und die Summe zur EÜR passt.
      ...data.yearTrips.map((t) => [
        formatDateDE(t.date.toDate()),
        `Fahrt nach ${t.destinationName}: ${t.purpose}`,
        'Fahrtkosten (Pauschale)',
        String(TRAVEL_EXPENSE_META.elsterLine),
        String(TRAVEL_EXPENSE_META.kennzahl),
        `${t.totalKm} km × ${fmt(t.ratePerKm)} €`,
        fmt(t.amount),
        fmt(t.amount),
        fmt(0),
        fmt(t.amount),
        fmt(0),
        '',
        'ja',
        'Kilometerpauschale, kein Vorsteuerabzug möglich.',
      ]),
    ];
    downloadCSV(`ausgaben-${year}.csv`, rows);
  };

  const exportEUR = () => {
    const fmt = (n: number) => n.toFixed(2).replace('.', ',');
    const rows = [
      ['# EÜR-Übersicht', String(year)],
      [],
      ['Monat', 'Einnahmen', 'Ausgaben (brutto)', 'Gewinn'],
      ...data.byMonth.map((m, idx) => [
        `${MONTHS_DE[idx]} ${year}`,
        fmt(m.revenue),
        fmt(m.expense),
        fmt(m.revenue - m.expense),
      ]),
      [
        'GESAMT',
        fmt(data.totalRevenue),
        fmt(data.totalExpense),
        fmt(data.profit),
      ],
      [],
      ['# Ausgaben nach Elster-EÜR-Zeile'],
      [
        'EÜR-Zeile',
        'Kennzahl',
        'Bezeichnung',
        'Netto',
        'Als Betriebsausgabe absetzbar',
        'Nicht abzugsfähig',
      ],
      ...data.elsterRows.map((r) => [
        String(r.line),
        String(r.kennzahl),
        r.label,
        fmt(r.net),
        fmt(r.deductible),
        fmt(r.nonDeductible),
      ]),
      [
        'GESAMT',
        '',
        '',
        fmt(data.eurTotalNet),
        fmt(data.eurTotalDeductible),
        fmt(data.eurTotalNonDeductible),
      ],
    ];
    downloadCSV(`euer-${year}.csv`, rows);
  };

  const exportElsterEUR = () => {
    const fmt = (n: number) => n.toFixed(2).replace('.', ',');
    const rows: string[][] = [
      [`# Anlage EÜR ${year}: Felder zum Abtippen`],
      ['# Jede Zeile ist ein Feld in Elster. Von oben nach unten abarbeiten.'],
      [],
      ['Elster-Zeile', 'Kennzahl', 'Beschreibung', 'Betrag', 'Hinweis'],
      ...data.elsterRows.flatMap((r) => {
        // Bei beschraenkt abziehbaren Posten hat Elster zwei Felder.
        // Beide werden ausgegeben, sonst wird eins davon vergessen.
        const zeilen: string[][] = [];
        if (r.nonDeductible > 0) {
          const kzNicht = NICHT_ABZIEHBAR_KENNZAHL[r.line];
          zeilen.push([
            String(r.line),
            kzNicht ? String(kzNicht) : '',
            `${r.label}, nicht abziehbarer Anteil`,
            fmt(r.nonDeductible),
            'linkes Feld in Elster',
          ]);
        }
        zeilen.push([
          String(r.line),
          String(r.kennzahl),
          r.label,
          fmt(r.deductible),
          r.nonDeductible > 0 ? 'rechtes Feld in Elster' : '',
        ]);
        return zeilen;
      }),
      [],
      ['SUMME Betriebsausgaben (zur Kontrolle)', '', '', fmt(data.eurTotalDeductible), ''],
      [],
    ];

    if (data.tripSum > 0) {
      rows.push(
        ['# PFLICHTFELD, das gern vergessen wird'],
        [
          '107',
          '123',
          'Einlagen einschließlich Sach-, Leistungs- und Nutzungseinlagen',
          fmt(data.tripSum),
          `Gegenstueck zu Zeile ${TRAVEL_EXPENSE_META.elsterLine}. Elster prueft beide Felder gegeneinander und meldet sonst einen Fehler.`,
        ],
        [],
      );
    }

    rows.push(
      ['# Felder, die LEER bleiben muessen'],
      ['57', '185', 'Gezahlte und abziehbare Vorsteuerbeträge', '', 'leer lassen: es wird mit Nettobeträgen gerechnet'],
      ['58', '186', 'An das Finanzamt gezahlte Umsatzsteuer', '', 'leer lassen: es wird mit Nettobeträgen gerechnet'],
    );

    downloadCSV(`elster-euer-${year}.csv`, rows);
  };

  const sortedCategories = useMemo(
    () =>
      Object.entries(data.byCategory).sort((a, b) => b[1] - a[1]),
    [data.byCategory],
  );

  return (
    <div>
      <header className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Berichte</h1>
          <p className="mt-1 text-sm text-gray-500">
            EÜR-Übersicht für das Geschäftsjahr.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/berichte/ustva"
            className="btn-secondary"
            title="Umsatzsteuer-Voranmeldung"
          >
            UStVA
          </Link>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="input max-w-[140px]"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </header>

      {loading ? (
        <div className="card text-sm text-gray-500">Lädt Daten…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="card">
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Einnahmen {year}
              </p>
              <p className="mt-2 text-2xl font-semibold text-green-700">
                <SensitiveValue>{formatEUR(data.totalRevenue)}</SensitiveValue>
              </p>
            </div>
            <div className="card">
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Ausgaben {year}
              </p>
              <p className="mt-2 text-2xl font-semibold text-orange-700">
                <SensitiveValue>{formatEUR(data.totalExpense)}</SensitiveValue>
              </p>
            </div>
            <div className="card">
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Gewinn / Verlust
              </p>
              <p
                className={`mt-2 text-2xl font-semibold ${
                  data.profit >= 0 ? 'text-gray-900' : 'text-red-700'
                }`}
              >
                <SensitiveValue>{formatEUR(data.profit)}</SensitiveValue>
              </p>
            </div>
          </div>

          <section className="card mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Verlauf nach Monat
            </h2>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500 tracking-wider border-b border-gray-100">
                <tr>
                  <th className="text-left py-2 w-16">Monat</th>
                  <th className="py-2">Einnahmen</th>
                  <th className="py-2">Ausgaben</th>
                  <th className="text-right py-2 w-24">Gewinn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.byMonth.map((m, idx) => {
                  const profit = m.revenue - m.expense;
                  return (
                    <tr key={idx}>
                      <td className="py-2 text-gray-700">
                        {MONTHS_DE[idx]}
                      </td>
                      <td className="py-2">
                        <Bar
                          value={m.revenue}
                          max={data.maxBar}
                          color="bg-green-500"
                        />
                      </td>
                      <td className="py-2">
                        <Bar
                          value={m.expense}
                          max={data.maxBar}
                          color="bg-orange-500"
                        />
                      </td>
                      <td
                        className={`py-2 text-right text-sm font-medium ${
                          profit >= 0 ? 'text-gray-900' : 'text-red-700'
                        }`}
                      >
                        <SensitiveValue>{formatEUR(profit)}</SensitiveValue>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="card mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Ausgaben nach Kategorie
            </h2>
            {sortedCategories.length === 0 ? (
              <p className="text-sm text-gray-500">
                Keine Ausgaben für {year} erfasst.
              </p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {sortedCategories.map(([cat, amount]) => {
                    const pct =
                      data.totalExpense > 0
                        ? (amount / data.totalExpense) * 100
                        : 0;
                    return (
                      <tr key={cat}>
                        <td className="py-2 text-gray-700 w-48">{cat}</td>
                        <td className="py-2">
                          <Bar value={amount} max={data.totalExpense} color="bg-blue-500" />
                        </td>
                        <td className="py-2 text-right font-medium text-gray-900 w-32">
                          <SensitiveValue>{formatEUR(amount)}</SensitiveValue>
                        </td>
                        <td className="py-2 text-right text-xs text-gray-500 w-16">
                          {pct.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          <section className="card mb-6">
            <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Elster-Zuordnung (Anlage EÜR {year})
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Betriebsausgaben nach Elster-Zeile gruppiert. Bewirtung
                  wird automatisch auf 70 % gekürzt. Die Vorsteuer bleibt zu
                  100 % in der UStVA abziehbar. Zeilennummern nach Anlage EÜR
                  2025, die Kennzahl daneben ist über Jahre stabil.
                </p>
                {data.tripSum > 0 && (
                  <p className="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                    <strong>Nicht vergessen:</strong> Die{' '}
                    <SensitiveValue>{formatEUR(data.tripSum)}</SensitiveValue>{' '}
                    aus {data.tripCount} Fahrten ({data.tripKm} km) müssen
                    zusätzlich in Zeile 107 (Kennzahl 123) als Nutzungseinlage
                    eingetragen werden. Elster prüft beide Felder
                    gegeneinander und meldet sonst einen Fehler.
                  </p>
                )}
              </div>
              <button
                onClick={exportElsterEUR}
                className="btn-secondary text-xs"
                title="CSV mit Zeile, Kennzahl und absetzbarem Netto. Direkt in Elster übertragbar."
              >
                Elster-CSV
              </button>
            </div>
            {data.elsterRows.length === 0 ? (
              <p className="text-sm text-gray-500">
                Keine Ausgaben für {year} erfasst.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-gray-500 tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="text-left py-2 w-16">Zeile</th>
                    <th className="text-left py-2 w-20">Kennzahl</th>
                    <th className="text-left py-2">Bezeichnung</th>
                    <th className="text-right py-2 w-28">Netto</th>
                    <th className="text-right py-2 w-32">Absetzbar</th>
                    <th className="text-right py-2 w-32">Nicht abzugsfähig</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.elsterRows.map((r) => (
                    <tr key={r.line}>
                      <td className="py-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700">
                          Z{r.line}
                        </span>
                      </td>
                      <td className="py-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-600 tabular-nums">
                          {r.kennzahl}
                        </span>
                      </td>
                      <td className="py-2 text-gray-700">{r.label}</td>
                      <td className="py-2 text-right tabular-nums text-gray-700">
                        <SensitiveValue>{formatEUR(r.net)}</SensitiveValue>
                      </td>
                      <td className="py-2 text-right tabular-nums font-medium text-gray-900">
                        <SensitiveValue>
                          {formatEUR(r.deductible)}
                        </SensitiveValue>
                      </td>
                      <td className="py-2 text-right tabular-nums text-orange-700">
                        {r.nonDeductible > 0 ? (
                          <SensitiveValue>
                            {formatEUR(r.nonDeductible)}
                          </SensitiveValue>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-200 font-semibold text-gray-900">
                    <td className="py-2" colSpan={2}>
                      Gesamt
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      <SensitiveValue>
                        {formatEUR(data.eurTotalNet)}
                      </SensitiveValue>
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      <SensitiveValue>
                        {formatEUR(data.eurTotalDeductible)}
                      </SensitiveValue>
                    </td>
                    <td className="py-2 text-right tabular-nums text-orange-700">
                      <SensitiveValue>
                        {formatEUR(data.eurTotalNonDeductible)}
                      </SensitiveValue>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
            {data.bewirtungGrossSum > 0 && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
                <strong>Bewirtung (§ 4 Abs. 5 Nr. 2 EStG):</strong>{' '}
                {formatEUR(data.bewirtungGrossSum)} brutto ={' '}
                {formatEUR(data.bewirtungNetSum)} netto. Davon 70 % (
                {formatEUR(
                  Math.round(data.bewirtungNetSum * 0.7 * 100) / 100,
                )}
                ) als Betriebsausgabe abziehbar, 30 % steuerlich unbeachtlich.
                Vorsteuer geht zu 100 % in die UStVA.
              </div>
            )}
          </section>

          {/* Schritt-fuer-Schritt-Uebertragung nach Elster */}
          <section className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              Übertragung nach Elster
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Von oben nach unten abarbeiten. Felder, die leer bleiben
              müssen, stehen bewusst mit drin.
            </p>

            <ol className="space-y-3">
              <ElsterSchritt
                nummer={1}
                titel="Betriebsausgaben eintragen"
                text={`${data.elsterRows.length} Zeilen, zusammen ${formatEUR(data.eurTotalDeductible)}. Stehen oben in der Tabelle mit Zeile und Kennzahl.`}
              />

              {data.elsterRows.some((r) => r.nonDeductible > 0) && (
                <ElsterSchritt
                  nummer={2}
                  titel="Beschränkt abziehbare Posten haben zwei Felder"
                  warnung
                  text="Bewirtung und Geschenke stehen in Elster mit zwei Eingabefeldern nebeneinander: links der nicht abziehbare Anteil, rechts der abziehbare. Beide müssen gefüllt werden."
                >
                  <ul className="mt-1.5 space-y-1">
                    {data.elsterRows
                      .filter((r) => r.nonDeductible > 0)
                      .map((r) => (
                        <li key={r.line} className="tabular-nums">
                          Zeile {r.line}: Kennzahl{' '}
                          {NICHT_ABZIEHBAR_KENNZAHL[r.line] ?? '?'} ={' '}
                          <SensitiveValue>
                            {formatEUR(r.nonDeductible)}
                          </SensitiveValue>{' '}
                          · Kennzahl {r.kennzahl} ={' '}
                          <SensitiveValue>
                            {formatEUR(r.deductible)}
                          </SensitiveValue>
                        </li>
                      ))}
                  </ul>
                </ElsterSchritt>
              )}

              {data.tripSum > 0 && (
                <ElsterSchritt
                  nummer={data.elsterRows.some((r) => r.nonDeductible > 0) ? 3 : 2}
                  titel="Nutzungseinlage nicht vergessen"
                  warnung
                  text={`Die Fahrtkosten stehen in Zeile ${TRAVEL_EXPENSE_META.elsterLine} (Kennzahl ${TRAVEL_EXPENSE_META.kennzahl}). Derselbe Betrag muss ZUSÄTZLICH in Zeile 107, Kennzahl 123 als Nutzungseinlage. Elster rechnet beide Felder gegeneinander und lehnt die Abgabe sonst ab.`}
                >
                  <div className="mt-1.5 tabular-nums">
                    Zeile {TRAVEL_EXPENSE_META.elsterLine} (Kennzahl{' '}
                    {TRAVEL_EXPENSE_META.kennzahl}) ={' '}
                    <SensitiveValue>{formatEUR(data.tripSum)}</SensitiveValue>
                    <br />
                    Zeile 107 (Kennzahl 123) ={' '}
                    <SensitiveValue>{formatEUR(data.tripSum)}</SensitiveValue>
                  </div>
                </ElsterSchritt>
              )}

              <ElsterSchritt
                nummer={
                  2 +
                  (data.elsterRows.some((r) => r.nonDeductible > 0) ? 1 : 0) +
                  (data.tripSum > 0 ? 1 : 0)
                }
                titel="Diese Felder bleiben leer"
                text="Hier wird mit Nettobeträgen gerechnet. Wer Zeile 57 oder 58 zusätzlich füllt, zieht die Vorsteuer doppelt ab."
              >
                <ul className="mt-1.5 space-y-0.5">
                  <li>Zeile 57 (Kennzahl 185): gezahlte Vorsteuerbeträge</li>
                  <li>Zeile 58 (Kennzahl 186): an das Finanzamt gezahlte USt</li>
                </ul>
              </ElsterSchritt>
            </ol>

            {data.pruefungen.filter((h) => h.art === 'hinweis').length > 0 && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <strong>Unerwartete Abweichung:</strong>
                <ul className="mt-1 list-disc pl-4 space-y-0.5">
                  {data.pruefungen
                    .filter((h) => h.art === 'hinweis')
                    .map((h, i) => (
                      <li key={i}>{h.text}</li>
                    ))}
                </ul>
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <button onClick={exportElsterEUR} className="btn-primary text-sm">
                Übertragungsliste als CSV
              </button>
              <span className="text-xs text-gray-500">
                enthält alle Felder oben, inklusive der leeren
              </span>
            </div>
          </section>

          <section className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              CSV-Export
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Für Steuerberater oder eigenes Buchhaltungssystem.
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={exportInvoicesCSV} className="btn-secondary">
                Einnahmen als CSV
              </button>
              <button onClick={exportExpensesCSV} className="btn-secondary">
                Ausgaben als CSV (mit EÜR-Feldern)
              </button>
              <button onClick={exportEUR} className="btn-secondary">
                EÜR-Übersicht als CSV
              </button>
              <button onClick={exportElsterEUR} className="btn-secondary">
                Elster-EÜR-Zuordnung
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Bar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color}`}
          style={{ width: `${Math.max(pct, value > 0 ? 2 : 0)}%` }}
        />
      </div>
      <span className="text-xs text-gray-700 tabular-nums w-20 text-right">
        <SensitiveValue>{formatEUR(value)}</SensitiveValue>
      </span>
    </div>
  );
}

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const c = String(cell ?? '');
          return c.includes(',') || c.includes('"') || c.includes('\n')
            ? `"${c.replace(/"/g, '""')}"`
            : c;
        })
        .join(','),
    )
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/** Ein Schritt in der Elster-Uebertragungsliste. */
function ElsterSchritt({
  nummer,
  titel,
  text,
  warnung,
  children,
}: {
  nummer: number;
  titel: string;
  text: string;
  warnung?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li
      className={`flex gap-3 rounded-lg border p-3 ${
        warnung
          ? 'border-amber-200 bg-amber-50/70'
          : 'border-gray-200 bg-gray-50/60'
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
          warnung ? 'bg-amber-500' : 'bg-gray-400'
        }`}
      >
        {nummer}
      </span>
      <div className="text-xs">
        <div
          className={`font-semibold ${warnung ? 'text-amber-900' : 'text-gray-900'}`}
        >
          {titel}
        </div>
        <p className={warnung ? 'text-amber-900 mt-0.5' : 'text-gray-600 mt-0.5'}>
          {text}
        </p>
        <div className={warnung ? 'text-amber-900' : 'text-gray-700'}>
          {children}
        </div>
      </div>
    </li>
  );
}
