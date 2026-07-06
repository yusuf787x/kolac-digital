'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  listInvoices,
  listExpenses,
  listCustomers,
} from '@/lib/firestore';
import type { Invoice, Expense, Customer } from '@/lib/types';
import {
  formatEUR,
  formatDateDE,
  computeVat,
  grossToNet,
} from '@/lib/utils';

interface MonthOption {
  value: string; // "2026-07"
  label: string;
}

export default function UStVAPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Map<string, Customer>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState<string>(defaultMonth);

  useEffect(() => {
    Promise.all([listInvoices(), listExpenses(), listCustomers()])
      .then(([inv, exp, cust]) => {
        setInvoices(inv);
        setExpenses(exp);
        setCustomers(new Map(cust.map((c) => [c.id, c])));
      })
      .catch((err) => {
        console.error(err);
        setError('Daten konnten nicht geladen werden.');
      })
      .finally(() => setLoading(false));
  }, []);

  const months: MonthOption[] = useMemo(() => {
    const set = new Set<string>();
    for (const i of invoices) {
      const d = i.invoiceDate.toDate();
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    for (const e of expenses) {
      const d = e.date.toDate();
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    set.add(defaultMonth);
    const sorted = Array.from(set).sort().reverse();
    return sorted.map((v) => ({
      value: v,
      label: monthLabel(v),
    }));
  }, [invoices, expenses, defaultMonth]);

  const monthData = useMemo(() => {
    const [year, mon] = month.split('-').map(Number);
    const inMonth = (d: Date) =>
      d.getFullYear() === year && d.getMonth() + 1 === mon;

    const monthInvoices = invoices.filter((i) =>
      inMonth(i.invoiceDate.toDate()),
    );
    const monthExpenses = expenses.filter((e) => inMonth(e.date.toDate()));

    // Output VAT: USt aus Verkaeufen
    let outputNet = 0;
    let outputVat = 0;
    let outputGross = 0;
    const outputByRate = new Map<number, { net: number; vat: number; gross: number }>();
    for (const i of monthInvoices) {
      const v = computeVat(i.totalAmount, i.vatRate);
      outputNet += v.net;
      outputVat += v.vat;
      outputGross += v.gross;
      const prev = outputByRate.get(v.rate) ?? { net: 0, vat: 0, gross: 0 };
      outputByRate.set(v.rate, {
        net: prev.net + v.net,
        vat: prev.vat + v.vat,
        gross: prev.gross + v.gross,
      });
    }

    // Input VAT: Vorsteuer aus regulaeren Belegen (Brutto → Netto + Vorsteuer)
    let inputNet = 0;
    let inputVat = 0;
    let inputGross = 0;
    const inputByRate = new Map<number, { net: number; vat: number; gross: number }>();

    // Reverse Charge: EU-Ausland ohne MwSt. Netto-Betrag geht in
    // Kennzahl 46, fiktive USt in 47 (geschuldet) und 67 (Vorsteuer).
    let rcNet = 0;
    let rcVat = 0;
    const rcExpenses: Expense[] = [];
    const rcByRate = new Map<number, { net: number; vat: number }>();

    for (const e of monthExpenses) {
      if (e.reverseCharge) {
        const rate = e.vatRate ?? 0;
        const net = Math.round(e.amount * 100) / 100;
        const fictiveVat = Math.round(net * rate * 100) / 100;
        rcNet += net;
        rcVat += fictiveVat;
        rcExpenses.push(e);
        const prev = rcByRate.get(rate) ?? { net: 0, vat: 0 };
        rcByRate.set(rate, {
          net: prev.net + net,
          vat: prev.vat + fictiveVat,
        });
      } else {
        const split = grossToNet(e.amount, e.vatRate ?? 0);
        const rate = e.vatRate ?? 0;
        inputNet += split.net;
        inputVat += split.vat;
        inputGross += split.gross;
        const prev = inputByRate.get(rate) ?? { net: 0, vat: 0, gross: 0 };
        inputByRate.set(rate, {
          net: prev.net + split.net,
          vat: prev.vat + split.vat,
          gross: prev.gross + split.gross,
        });
      }
    }

    // Zahllast: geschuldete USt (Umsatz + RC) - abziehbare Vorsteuer
    // (regulaer + RC). Fuer reine RC hebt sich das gegenseitig auf.
    const zahllast = outputVat + rcVat - inputVat - rcVat;
    const regularExpenses = monthExpenses.filter((e) => !e.reverseCharge);

    return {
      monthInvoices,
      monthExpenses,
      regularExpenses,
      outputNet: round2(outputNet),
      outputVat: round2(outputVat),
      outputGross: round2(outputGross),
      outputByRate,
      inputNet: round2(inputNet),
      inputVat: round2(inputVat),
      inputGross: round2(inputGross),
      inputByRate,
      rcNet: round2(rcNet),
      rcVat: round2(rcVat),
      rcExpenses,
      rcByRate,
      zahllast: round2(zahllast),
    };
  }, [invoices, expenses, month]);

  const handleDownloadInvoicesCsv = () => {
    const rows = [
      [
        'Rechnungsnummer',
        'Datum',
        'Kunde',
        'Beschreibung',
        'Netto (EUR)',
        'USt-Satz (%)',
        'USt (EUR)',
        'Brutto (EUR)',
        'Status',
      ],
      ...monthData.monthInvoices.map((i) => {
        const v = computeVat(i.totalAmount, i.vatRate);
        const cust = customers.get(i.customerId);
        const desc =
          i.items?.map((it) => it.description.split('\n')[0]).join('; ') ?? '';
        return [
          i.invoiceNumber,
          formatDateDE(i.invoiceDate.toDate()),
          cust?.company ?? '—',
          desc,
          fmtCsv(v.net),
          String(Math.round(v.rate * 100)),
          fmtCsv(v.vat),
          fmtCsv(v.gross),
          i.status,
        ];
      }),
    ];
    downloadCsv(`UStVA_Einnahmen_${month}.csv`, rows);
  };

  const handleDownloadExpensesCsv = () => {
    const rows = [
      [
        'Datum',
        'Posten',
        'Kategorie',
        'Lieferant',
        'Reverse Charge',
        'Netto (EUR)',
        'USt-Satz (%)',
        'USt/Vorsteuer (EUR)',
        'Brutto bezahlt (EUR)',
        'ELSTER-Kennzahl',
      ],
      ...monthData.monthExpenses.map((e) => {
        if (e.reverseCharge) {
          const rate = e.vatRate ?? 0;
          const net = Math.round(e.amount * 100) / 100;
          const vat = Math.round(net * rate * 100) / 100;
          return [
            formatDateDE(e.date.toDate()),
            e.description,
            e.category,
            e.supplier || '—',
            'ja (§ 13b UStG)',
            fmtCsv(net),
            String(Math.round(rate * 100)),
            fmtCsv(vat),
            fmtCsv(net),
            '46 / 47 / 67',
          ];
        }
        const split = grossToNet(e.amount, e.vatRate ?? 0);
        return [
          formatDateDE(e.date.toDate()),
          e.description,
          e.category,
          e.supplier || '—',
          'nein',
          fmtCsv(split.net),
          String(Math.round((e.vatRate ?? 0) * 100)),
          fmtCsv(split.vat),
          fmtCsv(split.gross),
          '',
        ];
      }),
    ];
    downloadCsv(`UStVA_Ausgaben_${month}.csv`, rows);
  };

  const handleDownloadSummaryCsv = () => {
    const rows: (string | number)[][] = [
      ['UStVA-Übersicht', monthLabel(month)],
      [],
      ['Einnahmen (Umsätze)', '', '', ''],
      ['USt-Satz', 'Netto (EUR)', 'USt (EUR)', 'Brutto (EUR)'],
      ...Array.from(monthData.outputByRate.entries()).map(([rate, v]) => [
        `${Math.round(rate * 100)} %`,
        fmtCsv(v.net),
        fmtCsv(v.vat),
        fmtCsv(v.gross),
      ]),
      [
        'Summe',
        fmtCsv(monthData.outputNet),
        fmtCsv(monthData.outputVat),
        fmtCsv(monthData.outputGross),
      ],
      [],
      ['Ausgaben (Vorsteuer)', '', '', ''],
      ['USt-Satz', 'Netto (EUR)', 'Vorsteuer (EUR)', 'Brutto (EUR)'],
      ...Array.from(monthData.inputByRate.entries()).map(([rate, v]) => [
        `${Math.round(rate * 100)} %`,
        fmtCsv(v.net),
        fmtCsv(v.vat),
        fmtCsv(v.gross),
      ]),
      [
        'Summe',
        fmtCsv(monthData.inputNet),
        fmtCsv(monthData.inputVat),
        fmtCsv(monthData.inputGross),
      ],
      [],
      ['Reverse Charge (§ 13b UStG)', '', '', ''],
      ['ELSTER-Kennzahl', 'Bezeichnung', 'Betrag (EUR)', ''],
      ['KZ 46', 'Bemessungsgrundlage (Netto)', fmtCsv(monthData.rcNet), ''],
      [
        'KZ 47',
        'Geschuldete USt (Steuerschuld)',
        fmtCsv(monthData.rcVat),
        '',
      ],
      [
        'KZ 67',
        'Abziehbare Vorsteuer nach § 13b',
        fmtCsv(monthData.rcVat),
        '',
      ],
      [],
      [
        'USt-Zahllast (Umsatz-USt + RC-USt − Vorsteuer − RC-Vorsteuer)',
        '',
        fmtCsv(monthData.zahllast),
        '',
      ],
    ];
    downloadCsv(`UStVA_Uebersicht_${month}.csv`, rows);
  };

  return (
    <div>
      <header className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <Link
            href="/dashboard/berichte"
            className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
          >
            ← Zurück zu Berichten
          </Link>
          <h1 className="text-3xl font-semibold text-gray-900">
            UStVA-Übersicht
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Monatliche Umsatzsteuer-Voranmeldung. Alle Zahlen sind nach
            Belegdatum gruppiert und beziehen sich auf den gewählten Monat.
            Stichtag Kleinunternehmer → Regelbesteuerung: 01.07.2026.
          </p>
        </div>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="input w-auto"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </header>

      {error && (
        <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      {loading ? (
        <div className="card text-sm text-gray-500">Lädt…</div>
      ) : (
        <div className="space-y-6">
          {/* Zahllast Highlight */}
          <section className="card bg-brand-blue/5 border-brand-blue/20">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              USt-Zahllast {monthLabel(month)}
            </p>
            <p
              className={`text-3xl font-semibold mt-1 ${
                monthData.zahllast >= 0 ? 'text-brand-blue' : 'text-green-700'
              }`}
            >
              {formatEUR(monthData.zahllast)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {monthData.zahllast >= 0
                ? 'Differenz zugunsten des Finanzamts. So viel überweist du bei der Voranmeldung.'
                : 'Differenz zugunsten dir. Vorsteuerüberhang — Finanzamt erstattet zurück.'}
            </p>
          </section>

          {/* Output: Sales */}
          <section className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Einnahmen ({monthData.monthInvoices.length} Rechnung
              {monthData.monthInvoices.length === 1 ? '' : 'en'})
            </h2>
            <SummaryByRate byRate={monthData.outputByRate} label="USt" />
            <Totals
              net={monthData.outputNet}
              vat={monthData.outputVat}
              gross={monthData.outputGross}
              vatLabel="USt"
            />
            <button
              onClick={handleDownloadInvoicesCsv}
              disabled={monthData.monthInvoices.length === 0}
              className="btn-secondary text-sm mt-4 disabled:opacity-50"
            >
              CSV: Rechnungen-Liste
            </button>
            {monthData.monthInvoices.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-gray-500">
                  Details ({monthData.monthInvoices.length})
                </summary>
                <table className="w-full text-xs mt-2">
                  <thead className="text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="text-left py-1.5">Datum</th>
                      <th className="text-left py-1.5">Rechnungsnr.</th>
                      <th className="text-left py-1.5">Kunde</th>
                      <th className="text-right py-1.5">Netto</th>
                      <th className="text-right py-1.5">USt</th>
                      <th className="text-right py-1.5">Brutto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {monthData.monthInvoices.map((i) => {
                      const v = computeVat(i.totalAmount, i.vatRate);
                      return (
                        <tr key={i.id}>
                          <td className="py-1.5">
                            {formatDateDE(i.invoiceDate.toDate())}
                          </td>
                          <td className="py-1.5 font-mono">
                            <Link
                              href={`/dashboard/rechnungen/${i.id}`}
                              className="text-brand-blue hover:underline"
                            >
                              {i.invoiceNumber}
                            </Link>
                          </td>
                          <td className="py-1.5">
                            {customers.get(i.customerId)?.company ?? '—'}
                          </td>
                          <td className="py-1.5 text-right">
                            {formatEUR(v.net)}
                          </td>
                          <td className="py-1.5 text-right">
                            {formatEUR(v.vat)}
                          </td>
                          <td className="py-1.5 text-right font-medium">
                            {formatEUR(v.gross)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </details>
            )}
          </section>

          {/* Input: Expenses (regulaer, Vorsteuer aus Belegen) */}
          <section className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Ausgaben — reguläre Vorsteuer ({monthData.regularExpenses.length}{' '}
              Beleg{monthData.regularExpenses.length === 1 ? '' : 'e'})
            </h2>
            <SummaryByRate byRate={monthData.inputByRate} label="Vorsteuer" />
            <Totals
              net={monthData.inputNet}
              vat={monthData.inputVat}
              gross={monthData.inputGross}
              vatLabel="Vorsteuer"
            />
            <button
              onClick={handleDownloadExpensesCsv}
              disabled={monthData.monthExpenses.length === 0}
              className="btn-secondary text-sm mt-4 disabled:opacity-50"
            >
              CSV: Ausgaben-Liste
            </button>
            {monthData.regularExpenses.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-gray-500">
                  Details ({monthData.regularExpenses.length})
                </summary>
                <table className="w-full text-xs mt-2">
                  <thead className="text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="text-left py-1.5">Datum</th>
                      <th className="text-left py-1.5">Posten</th>
                      <th className="text-left py-1.5">Lieferant</th>
                      <th className="text-right py-1.5">Netto</th>
                      <th className="text-right py-1.5">Vorsteuer</th>
                      <th className="text-right py-1.5">Brutto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {monthData.regularExpenses.map((e) => {
                      const split = grossToNet(e.amount, e.vatRate ?? 0);
                      return (
                        <tr key={e.id}>
                          <td className="py-1.5">
                            {formatDateDE(e.date.toDate())}
                          </td>
                          <td className="py-1.5">{e.description}</td>
                          <td className="py-1.5">{e.supplier || '—'}</td>
                          <td className="py-1.5 text-right">
                            {formatEUR(split.net)}
                          </td>
                          <td className="py-1.5 text-right">
                            {formatEUR(split.vat)}
                          </td>
                          <td className="py-1.5 text-right font-medium">
                            {formatEUR(split.gross)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </details>
            )}
          </section>

          {/* Reverse Charge § 13b UStG */}
          {monthData.rcExpenses.length > 0 && (
            <section className="card border-amber-200 bg-amber-50/30">
              <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Reverse Charge (§ 13b UStG) — {monthData.rcExpenses.length}{' '}
                    Rechnung{monthData.rcExpenses.length === 1 ? '' : 'en'}
                  </h2>
                  <p className="text-xs text-gray-600 mt-1">
                    EU-Ausland ohne MwSt. Fiktive USt wird als Steuerschuld
                    UND als Vorsteuer deklariert — Netto-Effekt null.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-1 rounded bg-amber-100 text-amber-800">
                  ELSTER KZ 46 / 47 / 67
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                <RcMetric
                  kz="46"
                  label="Bemessungsgrundlage (netto)"
                  value={monthData.rcNet}
                />
                <RcMetric
                  kz="47"
                  label="Geschuldete USt (Steuerschuld)"
                  value={monthData.rcVat}
                />
                <RcMetric
                  kz="67"
                  label="Abziehbare Vorsteuer (§ 13b)"
                  value={monthData.rcVat}
                />
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer text-xs text-gray-500">
                  Details ({monthData.rcExpenses.length})
                </summary>
                <table className="w-full text-xs mt-2">
                  <thead className="text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="text-left py-1.5">Datum</th>
                      <th className="text-left py-1.5">Posten</th>
                      <th className="text-left py-1.5">Lieferant</th>
                      <th className="text-right py-1.5">Netto</th>
                      <th className="text-right py-1.5">Fiktive USt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {monthData.rcExpenses.map((e) => {
                      const rate = e.vatRate ?? 0;
                      const net = Math.round(e.amount * 100) / 100;
                      const vat = Math.round(net * rate * 100) / 100;
                      return (
                        <tr key={e.id}>
                          <td className="py-1.5">
                            {formatDateDE(e.date.toDate())}
                          </td>
                          <td className="py-1.5">{e.description}</td>
                          <td className="py-1.5">{e.supplier || '—'}</td>
                          <td className="py-1.5 text-right">
                            {formatEUR(net)}
                          </td>
                          <td className="py-1.5 text-right">
                            {formatEUR(vat)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </details>
            </section>
          )}

          {/* Summary CSV */}
          <section className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              Komplett-Export
            </h2>
            <p className="text-sm text-gray-500 mb-3">
              Eine CSV mit Übersicht der Voranmeldung (Aufteilung nach
              USt-Sätzen, Summen, Zahllast).
            </p>
            <button
              onClick={handleDownloadSummaryCsv}
              className="btn-secondary text-sm"
            >
              CSV: UStVA-Zusammenfassung
            </button>
          </section>

          <section className="card text-xs text-gray-500">
            <p className="font-semibold text-gray-700 mb-1">
              Hinweise zur Voranmeldung
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Abgabefrist: 10. des Folgemonats (mit Dauerfristverlängerung +
                1 Monat) bei ELSTER.
              </li>
              <li>
                Diese Übersicht ist eine Berechnungshilfe. Maßgeblich für die
                tatsächliche UStVA bleibt deine Buchhaltung / dein Steuerberater.
              </li>
              <li>
                Belege müssen 10 Jahre aufbewahrt werden — sind alle in Drive
                gespeichert.
              </li>
              <li>
                <strong>Reverse Charge (§ 13b UStG)</strong>: Kennzahl 46 =
                Bemessungsgrundlage, 47 = geschuldete USt, 67 = abziehbare
                Vorsteuer. Betragsmäßig gleich — hebt sich in der Zahllast
                auf, muss aber in der UStVA deklariert werden. Für USt-IdNr.
                bei EU-Lieferanten (Meta, Google, Canva) hinterlegen, sobald
                dir das Finanzamt eine ausstellt.
              </li>
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

// ===================================================================
// UI Helpers
// ===================================================================

function SummaryByRate({
  byRate,
  label,
}: {
  byRate: Map<number, { net: number; vat: number; gross: number }>;
  label: string;
}) {
  if (byRate.size === 0) {
    return (
      <p className="text-sm text-gray-500">Keine Einträge in diesem Monat.</p>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead className="text-xs uppercase text-gray-500 tracking-wider border-b border-gray-100">
        <tr>
          <th className="text-left py-2">USt-Satz</th>
          <th className="text-right py-2">Netto</th>
          <th className="text-right py-2">{label}</th>
          <th className="text-right py-2">Brutto</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {Array.from(byRate.entries())
          .sort((a, b) => b[0] - a[0])
          .map(([rate, v]) => (
            <tr key={rate}>
              <td className="py-1.5 text-gray-700">
                {Math.round(rate * 100)} %
              </td>
              <td className="py-1.5 text-right text-gray-700">
                {formatEUR(v.net)}
              </td>
              <td className="py-1.5 text-right text-gray-700">
                {formatEUR(v.vat)}
              </td>
              <td className="py-1.5 text-right text-gray-900 font-medium">
                {formatEUR(v.gross)}
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

/** Kleine Kennzahl-Metrik-Kachel fuer die Reverse-Charge-Section. Zeigt
 *  ELSTER-Kennzahl gross, Label darunter, Betrag rechts. */
function RcMetric({
  kz,
  label,
  value,
}: {
  kz: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-white border border-amber-200 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
          KZ {kz}
        </span>
        <span className="text-sm font-semibold text-gray-900">
          {formatEUR(value)}
        </span>
      </div>
      <p className="mt-2 text-xs text-gray-600 leading-tight">{label}</p>
    </div>
  );
}

function Totals({
  net,
  vat,
  gross,
  vatLabel,
}: {
  net: number;
  vat: number;
  gross: number;
  vatLabel: string;
}) {
  return (
    <div className="border-t border-gray-200 mt-2 pt-2 grid grid-cols-3 gap-2 text-sm">
      <div>
        <div className="text-xs text-gray-500">Netto</div>
        <div className="font-semibold text-gray-900">{formatEUR(net)}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">{vatLabel}</div>
        <div className="font-semibold text-gray-900">{formatEUR(vat)}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">Brutto</div>
        <div className="font-semibold text-gray-900">{formatEUR(gross)}</div>
      </div>
    </div>
  );
}

// ===================================================================
// Date / CSV Helpers
// ===================================================================

const MONTHS_DE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

function monthLabel(key: string): string {
  const [year, mon] = key.split('-').map(Number);
  return `${MONTHS_DE[mon - 1]} ${year}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmtCsv(n: number): string {
  // Deutsche Konvention: Komma als Dezimaltrenner. Excel-friendly.
  return n.toFixed(2).replace('.', ',');
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const lines = rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? '');
          return /[;,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(';'),
    )
    .join('\n');
  // BOM damit Excel UTF-8 korrekt erkennt.
  const blob = new Blob(['﻿' + lines], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
