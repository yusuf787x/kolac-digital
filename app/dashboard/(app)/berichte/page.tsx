'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listInvoices, listExpenses, listCustomers } from '@/lib/firestore';
import type { Invoice, Expense, Customer } from '@/lib/types';
import { EXPENSE_CATEGORY_META } from '@/lib/types';
import {
  formatEUR,
  formatDateDE,
  computeExpenseEurBreakdown,
} from '@/lib/utils';
import SensitiveValue from '@/components/ui/SensitiveValue';

const MONTHS_DE = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
];

export default function BerichtePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customerMap, setCustomerMap] = useState<Map<string, Customer>>(new Map());
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    Promise.all([listInvoices(), listExpenses(), listCustomers()])
      .then(([inv, exp, cust]) => {
        setInvoices(inv);
        setExpenses(exp);
        setCustomerMap(new Map(cust.map((c) => [c.id, c])));
      })
      .finally(() => setLoading(false));
  }, []);

  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    invoices.forEach((i) => set.add(i.invoiceDate.toDate().getFullYear()));
    expenses.forEach((e) => set.add(e.date.toDate().getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [invoices, expenses]);

  const data = useMemo(() => {
    const byMonth: { revenue: number; expense: number }[] = Array.from(
      { length: 12 },
      () => ({ revenue: 0, expense: 0 }),
    );
    const byCategory: Record<string, number> = {};
    // EÜR-Ansicht: nach Elster-Zeile gruppiert, mit Bewirtungs-Kuerzung.
    const byElsterLine = new Map<
      number,
      { label: string; net: number; deductible: number; nonDeductible: number }
    >();
    let eurTotalNet = 0;
    let eurTotalDeductible = 0;
    let eurTotalNonDeductible = 0;
    let bewirtungGrossSum = 0;
    let bewirtungNetSum = 0;

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

    expenses.forEach((e) => {
      const d = e.date.toDate();
      if (d.getFullYear() !== year) return;
      byMonth[d.getMonth()].expense += e.amount;
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;

      const meta = EXPENSE_CATEGORY_META[e.category];
      if (!meta) return;
      const eur = computeExpenseEurBreakdown(
        e.amount,
        e.vatRate ?? 0,
        meta.deductibleRate,
        !!e.reverseCharge,
      );
      eurTotalNet += eur.net;
      eurTotalDeductible += eur.deductibleNet;
      eurTotalNonDeductible += eur.nonDeductibleNet;
      if (e.category === 'Bewirtung') {
        bewirtungGrossSum += eur.gross;
        bewirtungNetSum += eur.net;
      }
      const bucket = byElsterLine.get(meta.elsterLine) ?? {
        label: meta.elsterLabel,
        net: 0,
        deductible: 0,
        nonDeductible: 0,
      };
      bucket.net += eur.net;
      bucket.deductible += eur.deductibleNet;
      bucket.nonDeductible += eur.nonDeductibleNet;
      byElsterLine.set(meta.elsterLine, bucket);
    });

    const totalRevenue = byMonth.reduce((a, m) => a + m.revenue, 0);
    const totalExpense = byMonth.reduce((a, m) => a + m.expense, 0);
    const profit = totalRevenue - totalExpense;
    const maxBar = Math.max(
      ...byMonth.flatMap((m) => [m.revenue, m.expense]),
      1,
    );

    const elsterRows = Array.from(byElsterLine.entries())
      .map(([line, v]) => ({
        line,
        label: v.label,
        net: Math.round(v.net * 100) / 100,
        deductible: Math.round(v.deductible * 100) / 100,
        nonDeductible: Math.round(v.nonDeductible * 100) / 100,
      }))
      .sort((a, b) => a.line - b.line);

    return {
      byMonth,
      byCategory,
      totalRevenue,
      totalExpense,
      profit,
      maxBar,
      elsterRows,
      eurTotalNet: Math.round(eurTotalNet * 100) / 100,
      eurTotalDeductible: Math.round(eurTotalDeductible * 100) / 100,
      eurTotalNonDeductible: Math.round(eurTotalNonDeductible * 100) / 100,
      bewirtungGrossSum: Math.round(bewirtungGrossSum * 100) / 100,
      bewirtungNetSum: Math.round(bewirtungNetSum * 100) / 100,
    };
  }, [invoices, expenses, year]);

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
        'Lieferant',
        'Brutto',
        'Netto',
        'Vorsteuer',
        'Abziehbar (EÜR)',
        'Nicht abzugsfähig',
        'Reverse Charge',
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
          return [
            formatDateDE(e.date.toDate()),
            e.description,
            e.category,
            meta ? String(meta.elsterLine) : '',
            e.supplier,
            fmt(eur.gross),
            fmt(eur.net),
            fmt(eur.vat),
            fmt(eur.deductibleNet),
            fmt(eur.nonDeductibleNet),
            e.reverseCharge ? 'ja' : '',
          ];
        }),
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
        'Bezeichnung',
        'Netto',
        'Als Betriebsausgabe absetzbar',
        'Nicht abzugsfähig',
      ],
      ...data.elsterRows.map((r) => [
        String(r.line),
        r.label,
        fmt(r.net),
        fmt(r.deductible),
        fmt(r.nonDeductible),
      ]),
      [
        'GESAMT',
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
    const rows = [
      ['Elster-Zeile', 'Beschreibung', 'Betrag (Netto)'],
      ...data.elsterRows.map((r) => [
        String(r.line),
        r.label,
        fmt(r.deductible),
      ]),
    ];
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
                  (Zeile 66) wird automatisch auf 70 % gekürzt — die Vorsteuer
                  bleibt zu 100 % in der UStVA abziehbar.
                </p>
              </div>
              <button
                onClick={exportElsterEUR}
                className="btn-secondary text-xs"
                title="Zwei-Spalten-CSV mit Zeile und absetzbarem Netto — direkt in Elster übertragbar."
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
