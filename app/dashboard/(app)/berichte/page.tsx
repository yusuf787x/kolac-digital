'use client';

import { useEffect, useMemo, useState } from 'react';
import { listInvoices, listExpenses, listCustomers } from '@/lib/firestore';
import type { Invoice, Expense, Customer } from '@/lib/types';
import { formatEUR, formatDateDE } from '@/lib/utils';

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
    });

    const totalRevenue = byMonth.reduce((a, m) => a + m.revenue, 0);
    const totalExpense = byMonth.reduce((a, m) => a + m.expense, 0);
    const profit = totalRevenue - totalExpense;
    const maxBar = Math.max(
      ...byMonth.flatMap((m) => [m.revenue, m.expense]),
      1,
    );

    return { byMonth, byCategory, totalRevenue, totalExpense, profit, maxBar };
  }, [invoices, expenses, year]);

  const exportInvoicesCSV = () => {
    const rows = [
      ['Datum', 'Rechnungsnr.', 'Kunde', 'Status', 'Betrag', 'Bezahlt'],
      ...invoices
        .filter((i) => i.invoiceDate.toDate().getFullYear() === year)
        .sort((a, b) => a.invoiceDate.toMillis() - b.invoiceDate.toMillis())
        .map((i) => [
          formatDateDE(i.invoiceDate.toDate()),
          i.invoiceNumber,
          customerMap.get(i.customerId)?.company ?? '',
          i.status,
          i.totalAmount.toFixed(2).replace('.', ','),
          i.paidAmount.toFixed(2).replace('.', ','),
        ]),
    ];
    downloadCSV(`einnahmen-${year}.csv`, rows);
  };

  const exportExpensesCSV = () => {
    const rows = [
      ['Datum', 'Posten', 'Kategorie', 'Lieferant', 'Betrag'],
      ...expenses
        .filter((e) => e.date.toDate().getFullYear() === year)
        .sort((a, b) => a.date.toMillis() - b.date.toMillis())
        .map((e) => [
          formatDateDE(e.date.toDate()),
          e.description,
          e.category,
          e.supplier,
          e.amount.toFixed(2).replace('.', ','),
        ]),
    ];
    downloadCSV(`ausgaben-${year}.csv`, rows);
  };

  const exportEUR = () => {
    const rows = [
      ['Monat', 'Einnahmen', 'Ausgaben', 'Gewinn'],
      ...data.byMonth.map((m, idx) => [
        `${MONTHS_DE[idx]} ${year}`,
        m.revenue.toFixed(2).replace('.', ','),
        m.expense.toFixed(2).replace('.', ','),
        (m.revenue - m.expense).toFixed(2).replace('.', ','),
      ]),
      [
        'GESAMT',
        data.totalRevenue.toFixed(2).replace('.', ','),
        data.totalExpense.toFixed(2).replace('.', ','),
        data.profit.toFixed(2).replace('.', ','),
      ],
    ];
    downloadCSV(`euer-${year}.csv`, rows);
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
                {formatEUR(data.totalRevenue)}
              </p>
            </div>
            <div className="card">
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Ausgaben {year}
              </p>
              <p className="mt-2 text-2xl font-semibold text-orange-700">
                {formatEUR(data.totalExpense)}
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
                {formatEUR(data.profit)}
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
                        {formatEUR(profit)}
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
                          {formatEUR(amount)}
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
                Ausgaben als CSV
              </button>
              <button onClick={exportEUR} className="btn-secondary">
                EÜR als CSV
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
        {formatEUR(value)}
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
