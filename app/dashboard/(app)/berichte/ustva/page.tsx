'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  listInvoices,
  listExpenses,
  listCustomers,
} from '@/lib/firestore';
import type { Invoice, Expense, Customer, InvoicePayment } from '@/lib/types';
import {
  formatEUR,
  formatDateDE,
  computeVat,
  computeInvoiceVat,
  grossToNet,
  effectivePayments,
  computeIstOutputVatForInvoice,
} from '@/lib/utils';
import SensitiveValue from '@/components/ui/SensitiveValue';

interface PeriodOption {
  value: string; // "2026-07" | "2026-Q3" | "2026"
  label: string;
}

type PeriodType = 'month' | 'quarter' | 'year';

/**
 * Elster-Kennzahl-Zuordnung fuer Umsatz-Steuersaetze
 * (Sektion 3 — steuerpflichtige Umsaetze / Bemessungsgrundlage).
 */
function outputKZForRate(rate: number): string {
  if (Math.abs(rate - 0.19) < 0.001) return '81';
  if (Math.abs(rate - 0.07) < 0.001) return '86';
  if (rate === 0) return '87';
  return '35';
}

export default function UStVAPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Map<string, Customer>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const defaultQuarter = `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
  const [periodType, setPeriodType] = useState<PeriodType>('quarter');
  const [periodValue, setPeriodValue] = useState<string>(defaultQuarter);

  // Wenn der Nutzer den Typ wechselt, auf sinnvollen Default fuer den
  // neuen Typ springen.
  const changePeriodType = (t: PeriodType) => {
    setPeriodType(t);
    if (t === 'month') setPeriodValue(defaultMonth);
    else if (t === 'quarter') setPeriodValue(defaultQuarter);
    else setPeriodValue(String(now.getFullYear()));
  };

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

  const periodOptions: PeriodOption[] = useMemo(() => {
    // Alle Zeitraeume aus vorhandenen Daten + aktueller je nach Typ.
    const monthsSet = new Set<string>();
    const quartersSet = new Set<string>();
    const yearsSet = new Set<string>();
    const addDate = (d: Date) => {
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const q = Math.floor((m - 1) / 3) + 1;
      monthsSet.add(`${y}-${String(m).padStart(2, '0')}`);
      quartersSet.add(`${y}-Q${q}`);
      yearsSet.add(String(y));
    };
    // Ist-Versteuerung: fuer die Auswahl der Zeitraeume zaehlen nun
    // die Zahlungseingaenge der Rechnungen (nicht mehr das
    // Rechnungsdatum). Rechnungsdatum wird zusaetzlich beruecksichtigt,
    // damit auch offene Rechnungen aus einem Monat in der Auswahl
    // auftauchen, aber sie erzeugen erst mit Zahlungseingang USt.
    for (const i of invoices) {
      addDate(i.invoiceDate.toDate());
      for (const p of effectivePayments(i) as InvoicePayment[]) {
        addDate(p.paidAt.toDate());
      }
    }
    for (const e of expenses) addDate(e.date.toDate());
    // Aktuellen Zeitraum garantiert dazu, auch wenn noch keine Daten.
    monthsSet.add(defaultMonth);
    quartersSet.add(defaultQuarter);
    yearsSet.add(String(now.getFullYear()));

    const source =
      periodType === 'month'
        ? monthsSet
        : periodType === 'quarter'
          ? quartersSet
          : yearsSet;
    const sorted = Array.from(source).sort().reverse();
    return sorted.map((v) => ({ value: v, label: formatPeriodLabel(v) }));
  }, [invoices, expenses, defaultMonth, defaultQuarter, periodType, now]);

  const periodData = useMemo(() => {
    const inRange = buildRangeFilter(periodValue);

    // Ist-Versteuerung (§ 20 UStG): USt wird dem Monat des tatsaechlichen
    // Zahlungseingangs zugeordnet, nicht dem Rechnungsdatum. Entwuerfe
    // ohne Rechnungsnummer sind grundsaetzlich nicht buchhaltungs-
    // relevant. Alle anderen Rechnungen mit Zahlungseingang im Zeitraum
    // fliessen anteilig ein.
    const bookedInvoices = invoices.filter((i) => i.invoiceNumber !== null);
    // `monthInvoices` sind jetzt: Rechnungen, die mindestens einen
    // Zahlungseingang im Zeitraum haben. Dient fuer Listen/Exporte.
    const monthInvoices = bookedInvoices.filter((i) => {
      const pays = effectivePayments(i) as InvoicePayment[];
      return pays.some((p) => inRange(p.paidAt.toDate()));
    });
    const monthExpenses = expenses.filter((e) => inRange(e.date.toDate()));

    // Output VAT (Ist-Prinzip): anteilig aus den Zahlungseingaengen des
    // Zeitraums je Rechnung. Bei gemischten Steuersaetzen wird
    // proportional aufgeteilt (siehe computeIstOutputVatForInvoice).
    let outputNet = 0;
    let outputVat = 0;
    let outputGross = 0;
    const outputByRate = new Map<
      number,
      { net: number; vat: number; gross: number }
    >();
    for (const i of bookedInvoices) {
      const pays = effectivePayments(i) as InvoicePayment[];
      if (pays.length === 0) continue;
      const paymentsForCompute = pays.map((p) => ({
        paidAt: p.paidAt.toDate(),
        amount: p.amount,
      }));
      const v = computeIstOutputVatForInvoice(
        i.items,
        i.vatRate,
        paymentsForCompute,
        inRange,
      );
      if (v.paidGross <= 0) continue;
      outputNet += v.paidNet;
      outputVat += v.paidVat;
      outputGross += v.paidGross;
      for (const r of v.byRate) {
        const prev = outputByRate.get(r.rate) ?? {
          net: 0,
          vat: 0,
          gross: 0,
        };
        outputByRate.set(r.rate, {
          net: prev.net + r.net,
          vat: prev.vat + r.vat,
          gross: prev.gross + r.gross,
        });
      }
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
  }, [invoices, expenses, periodValue]);

  const handleDownloadInvoicesCsv = () => {
    // Ist-Versteuerung: eine Zeile pro Zahlungseingang im Zeitraum.
    // So sieht der Steuerberater direkt Datum und Betrag, wie sie in
    // der UStVA gebucht werden.
    const inRange = buildRangeFilter(periodValue);
    const rows: string[][] = [
      [
        'Rechnungsnummer',
        'Rechnungsdatum',
        'Zahlungseingang am',
        'Kunde',
        'Beschreibung',
        'Zahlung brutto (EUR)',
        'Anteil Netto (EUR)',
        'USt-Satz (%)',
        'Anteil USt (EUR)',
        'Notiz',
      ],
    ];
    for (const i of periodData.monthInvoices) {
      const cust = customers.get(i.customerId);
      const desc =
        i.items?.map((it) => it.description.split('\n')[0]).join('; ') ?? '';
      const pays = (effectivePayments(i) as InvoicePayment[]).filter((p) =>
        inRange(p.paidAt.toDate()),
      );
      for (const p of pays) {
        const v = computeIstOutputVatForInvoice(
          i.items,
          i.vatRate,
          [{ paidAt: p.paidAt.toDate(), amount: p.amount }],
          () => true,
        );
        const rateStr =
          v.byRate.length === 1
            ? String(Math.round(v.byRate[0].rate * 100))
            : v.byRate.map((r) => Math.round(r.rate * 100)).join('/');
        rows.push([
          i.invoiceNumber ?? '',
          formatDateDE(i.invoiceDate.toDate()),
          formatDateDE(p.paidAt.toDate()),
          cust?.company ?? '—',
          desc,
          fmtCsv(v.paidGross),
          fmtCsv(v.paidNet),
          rateStr,
          fmtCsv(v.paidVat),
          p.note ?? '',
        ]);
      }
    }
    downloadCsv(`UStVA_Einnahmen_Ist_${periodValue}.csv`, rows);
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
      ...periodData.monthExpenses.map((e) => {
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
    downloadCsv(`UStVA_Ausgaben_${periodValue}.csv`, rows);
  };

  const handleDownloadSummaryCsv = () => {
    const rows: (string | number)[][] = [
      ['UStVA-Übersicht', formatPeriodLabel(periodValue)],
      [],
      ['Einnahmen (Umsätze)', '', '', ''],
      ['USt-Satz', 'Netto (EUR)', 'USt (EUR)', 'Brutto (EUR)'],
      ...Array.from(periodData.outputByRate.entries()).map(([rate, v]) => [
        `${Math.round(rate * 100)} %`,
        fmtCsv(v.net),
        fmtCsv(v.vat),
        fmtCsv(v.gross),
      ]),
      [
        'Summe',
        fmtCsv(periodData.outputNet),
        fmtCsv(periodData.outputVat),
        fmtCsv(periodData.outputGross),
      ],
      [],
      ['Ausgaben (Vorsteuer)', '', '', ''],
      ['USt-Satz', 'Netto (EUR)', 'Vorsteuer (EUR)', 'Brutto (EUR)'],
      ...Array.from(periodData.inputByRate.entries()).map(([rate, v]) => [
        `${Math.round(rate * 100)} %`,
        fmtCsv(v.net),
        fmtCsv(v.vat),
        fmtCsv(v.gross),
      ]),
      [
        'Summe',
        fmtCsv(periodData.inputNet),
        fmtCsv(periodData.inputVat),
        fmtCsv(periodData.inputGross),
      ],
      [],
      ['Reverse Charge (§ 13b UStG)', '', '', ''],
      ['ELSTER-Kennzahl', 'Bezeichnung', 'Betrag (EUR)', ''],
      ['KZ 46', 'Bemessungsgrundlage (Netto)', fmtCsv(periodData.rcNet), ''],
      [
        'KZ 47',
        'Geschuldete USt (Steuerschuld)',
        fmtCsv(periodData.rcVat),
        '',
      ],
      [
        'KZ 67',
        'Abziehbare Vorsteuer nach § 13b',
        fmtCsv(periodData.rcVat),
        '',
      ],
      [],
      [
        'USt-Zahllast (Umsatz-USt + RC-USt − Vorsteuer − RC-Vorsteuer)',
        '',
        fmtCsv(periodData.zahllast),
        '',
      ],
    ];
    downloadCsv(`UStVA_Uebersicht_${periodValue}.csv`, rows);
  };

  return (
    <div>
      <header className="mb-6">
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
          Umsatzsteuer wird nach dem Datum des Zahlungseingangs gebucht,
          Vorsteuer nach dem Belegdatum der Ausgabe. Voranmeldungs-Rhythmus
          laut Finanzamt: <strong>quartalsweise</strong>.
        </p>
        {(() => {
          const openInvoices = invoices.filter(
            (i) =>
              i.invoiceNumber !== null &&
              (effectivePayments(i) as InvoicePayment[]).length === 0,
          );
          if (openInvoices.length === 0) return null;
          const openGross = openInvoices.reduce(
            (s, i) =>
              s +
              Math.round(
                i.totalAmount * (1 + (i.vatRate ?? 0)) * 100,
              ) /
                100,
            0,
          );
          return (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
              <strong>{openInvoices.length}</strong> offene Rechnung
              {openInvoices.length === 1 ? '' : 'en'} über{' '}
              <strong>{formatEUR(openGross)}</strong> brutto sind noch nicht
              enthalten. Sie zählen erst, wenn das Geld eingegangen ist.
            </div>
          );
        })()}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* Zeitraum-Typ Toggle */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm">
            {(['month', 'quarter', 'year'] as PeriodType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => changePeriodType(t)}
                className={`px-3 py-1.5 rounded-md ${
                  periodType === t
                    ? 'bg-brand-blue text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t === 'month'
                  ? 'Monat'
                  : t === 'quarter'
                    ? 'Quartal'
                    : 'Jahr'}
              </button>
            ))}
          </div>
          <select
            value={periodValue}
            onChange={(e) => setPeriodValue(e.target.value)}
            className="input w-auto"
          >
            {periodOptions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
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
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  USt-Zahllast {formatPeriodLabel(periodValue)}
                </p>
                <p
                  className={`text-3xl font-semibold mt-1 ${
                    periodData.zahllast >= 0
                      ? 'text-brand-blue'
                      : 'text-green-700'
                  }`}
                >
                  <SensitiveValue>{formatEUR(periodData.zahllast)}</SensitiveValue>
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-brand-blue/10 text-brand-blue">
                ELSTER KZ 83 · Zeile 66
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {periodData.zahllast >= 0
                ? 'Differenz zugunsten des Finanzamts. So viel überweisen Sie bei der Voranmeldung.'
                : 'Differenz zugunsten von Ihnen. Vorsteuerüberhang. Finanzamt erstattet zurück.'}
            </p>
          </section>

          {/* Output: Sales */}
          <section className="card">
            <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-gray-900">
                Einnahmen ({periodData.monthInvoices.length} Rechnung
                {periodData.monthInvoices.length === 1 ? '' : 'en'})
              </h2>
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-brand-blue/10 text-brand-blue">
                ELSTER Sektion 3 · KZ 81/86/87
              </span>
            </div>
            <SummaryByRate
              byRate={periodData.outputByRate}
              label="USt"
              kind="output"
            />
            <Totals
              net={periodData.outputNet}
              vat={periodData.outputVat}
              gross={periodData.outputGross}
              vatLabel="USt"
            />
            <button
              onClick={handleDownloadInvoicesCsv}
              disabled={periodData.monthInvoices.length === 0}
              className="btn-secondary text-sm mt-4 disabled:opacity-50"
            >
              CSV: Rechnungen-Liste
            </button>
            {periodData.monthInvoices.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-gray-500">
                  Details ({periodData.monthInvoices.length}) · nach Zahlungseingang
                </summary>
                <table className="w-full text-xs mt-2">
                  <thead className="text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="text-left py-1.5">Zahlung am</th>
                      <th className="text-left py-1.5">Rechnungsnr.</th>
                      <th className="text-left py-1.5">Kunde</th>
                      <th className="text-right py-1.5">Zahlung brutto</th>
                      <th className="text-right py-1.5">Anteil Netto</th>
                      <th className="text-right py-1.5">Anteil USt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {periodData.monthInvoices.flatMap((i) => {
                      const inRangeFn = buildRangeFilter(periodValue);
                      const pays = (
                        effectivePayments(i) as InvoicePayment[]
                      ).filter((p) => inRangeFn(p.paidAt.toDate()));
                      return pays.map((p, pi) => {
                        const v = computeIstOutputVatForInvoice(
                          i.items,
                          i.vatRate,
                          [
                            {
                              paidAt: p.paidAt.toDate(),
                              amount: p.amount,
                            },
                          ],
                          () => true,
                        );
                        return (
                          <tr key={`${i.id}-${pi}`}>
                            <td className="py-1.5">
                              {formatDateDE(p.paidAt.toDate())}
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
                            <td className="py-1.5 text-right font-medium">
                              <SensitiveValue>
                                {formatEUR(v.paidGross)}
                              </SensitiveValue>
                            </td>
                            <td className="py-1.5 text-right">
                              <SensitiveValue>
                                {formatEUR(v.paidNet)}
                              </SensitiveValue>
                            </td>
                            <td className="py-1.5 text-right">
                              <SensitiveValue>
                                {formatEUR(v.paidVat)}
                              </SensitiveValue>
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </details>
            )}
          </section>

          {/* Input: Expenses (regulaer, Vorsteuer aus Belegen) */}
          <section className="card">
            <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-gray-900">
                Ausgaben — reguläre Vorsteuer ({periodData.regularExpenses.length}{' '}
                Beleg{periodData.regularExpenses.length === 1 ? '' : 'e'})
              </h2>
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-brand-blue/10 text-brand-blue">
                ELSTER Sektion 7 · KZ 66 (Zeile 38)
              </span>
            </div>
            <SummaryByRate
              byRate={periodData.inputByRate}
              label="Vorsteuer"
              kind="input"
            />
            <Totals
              net={periodData.inputNet}
              vat={periodData.inputVat}
              gross={periodData.inputGross}
              vatLabel="Vorsteuer"
            />
            <button
              onClick={handleDownloadExpensesCsv}
              disabled={periodData.monthExpenses.length === 0}
              className="btn-secondary text-sm mt-4 disabled:opacity-50"
            >
              CSV: Ausgaben-Liste
            </button>
            {periodData.regularExpenses.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-gray-500">
                  Details ({periodData.regularExpenses.length})
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
                    {periodData.regularExpenses.map((e) => {
                      const split = grossToNet(e.amount, e.vatRate ?? 0);
                      return (
                        <tr key={e.id}>
                          <td className="py-1.5">
                            {formatDateDE(e.date.toDate())}
                          </td>
                          <td className="py-1.5">{e.description}</td>
                          <td className="py-1.5">{e.supplier || '—'}</td>
                          <td className="py-1.5 text-right">
                            <SensitiveValue>{formatEUR(split.net)}</SensitiveValue>
                          </td>
                          <td className="py-1.5 text-right">
                            <SensitiveValue>{formatEUR(split.vat)}</SensitiveValue>
                          </td>
                          <td className="py-1.5 text-right font-medium">
                            <SensitiveValue>{formatEUR(split.gross)}</SensitiveValue>
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
          {periodData.rcExpenses.length > 0 && (
            <section className="card border-amber-200 bg-amber-50/30">
              <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Reverse Charge (§ 13b UStG) — {periodData.rcExpenses.length}{' '}
                    Rechnung{periodData.rcExpenses.length === 1 ? '' : 'en'}
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
                  value={periodData.rcNet}
                />
                <RcMetric
                  kz="47"
                  label="Geschuldete USt (Steuerschuld)"
                  value={periodData.rcVat}
                />
                <RcMetric
                  kz="67"
                  label="Abziehbare Vorsteuer (§ 13b)"
                  value={periodData.rcVat}
                />
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer text-xs text-gray-500">
                  Details ({periodData.rcExpenses.length})
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
                    {periodData.rcExpenses.map((e) => {
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
                            <SensitiveValue>{formatEUR(net)}</SensitiveValue>
                          </td>
                          <td className="py-1.5 text-right">
                            <SensitiveValue>{formatEUR(vat)}</SensitiveValue>
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

          <section className="card text-xs text-gray-500 space-y-3">
            <div>
              <p className="font-semibold text-gray-700 mb-1">
                So trägst du die Zahlen in ELSTER ein
              </p>
              <table className="w-full text-xs mt-1">
                <thead className="text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="text-left py-1">Woher</th>
                    <th className="text-left py-1">Sektion / Zeile</th>
                    <th className="text-left py-1">Kennzahl</th>
                    <th className="text-left py-1">Format</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-1.5">Einnahmen 19 % (Netto)</td>
                    <td className="py-1.5">Sektion 3 · Zeile 13</td>
                    <td className="py-1.5 font-mono">KZ 81</td>
                    <td className="py-1.5">volle Euros, kein Komma</td>
                  </tr>
                  <tr>
                    <td className="py-1.5">Einnahmen 7 % (Netto)</td>
                    <td className="py-1.5">Sektion 3 · Zeile 14</td>
                    <td className="py-1.5 font-mono">KZ 86</td>
                    <td className="py-1.5">volle Euros, kein Komma</td>
                  </tr>
                  <tr>
                    <td className="py-1.5">Einnahmen 0 % (Netto)</td>
                    <td className="py-1.5">Sektion 3 · Zeile 15</td>
                    <td className="py-1.5 font-mono">KZ 87</td>
                    <td className="py-1.5">volle Euros, kein Komma</td>
                  </tr>
                  <tr className="border-t-2 border-gray-200">
                    <td className="py-1.5">
                      Reverse Charge — Bemessungsgrundlage
                    </td>
                    <td className="py-1.5">Sektion 5 · Zeile 30</td>
                    <td className="py-1.5 font-mono">KZ 46</td>
                    <td className="py-1.5">volle Euros</td>
                  </tr>
                  <tr>
                    <td className="py-1.5">
                      Reverse Charge — geschuldete USt
                    </td>
                    <td className="py-1.5">Sektion 5 · Zeile 30</td>
                    <td className="py-1.5 font-mono">KZ 47</td>
                    <td className="py-1.5">Euro, Cent</td>
                  </tr>
                  <tr className="border-t-2 border-gray-200">
                    <td className="py-1.5">
                      Vorsteuer aus regulären Belegen
                    </td>
                    <td className="py-1.5">Sektion 7 · Zeile 38</td>
                    <td className="py-1.5 font-mono">KZ 66</td>
                    <td className="py-1.5">Euro, Cent</td>
                  </tr>
                  <tr>
                    <td className="py-1.5">
                      Vorsteuer aus § 13b (Reverse Charge)
                    </td>
                    <td className="py-1.5">Sektion 7 · Zeile 41</td>
                    <td className="py-1.5 font-mono">KZ 67</td>
                    <td className="py-1.5">Euro, Cent</td>
                  </tr>
                  <tr className="border-t-2 border-gray-200">
                    <td className="py-1.5">
                      <strong>Zahllast / Erstattung</strong>
                    </td>
                    <td className="py-1.5">Sektion 9 · Zeile 66</td>
                    <td className="py-1.5 font-mono">KZ 83</td>
                    <td className="py-1.5">
                      wird von ELSTER auto-berechnet
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5">
                      Wechsel Kleinunternehmer → Regel
                    </td>
                    <td className="py-1.5">Allgemein · Zeile</td>
                    <td className="py-1.5 font-mono">KZ 70</td>
                    <td className="py-1.5">
                      nur beim ersten Mal: 01.07.2026
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Abgabefrist quartalsweise</strong>: 10. des Folgemonats
                nach Quartalsende (Q1 → 10.04., Q2 → 10.07., Q3 → 10.10., Q4
                → 10.01.). Mit Dauerfristverlängerung + 1 Monat.
              </li>
              <li>
                <strong>Bemessungsgrundlagen</strong> (KZ 81, 86, 87, 46) werden
                in Elster als volle Euros ohne Komma eingetragen (z.B. „6,80 €"
                → <code>7</code>). Steuerbeträge (KZ 47, 66, 67) mit Komma
                (z.B. <code>1,29</code>).
              </li>
              <li>
                <strong>Reverse Charge § 13b</strong>: KZ 47 und KZ 67 sind
                betragsmäßig gleich. In der Zahllast heben sie sich auf, müssen
                aber deklariert werden.
              </li>
              <li>
                Diese Übersicht ist eine Berechnungshilfe. Maßgeblich für die
                tatsächliche UStVA bleibt Ihre Buchhaltung / Ihr Steuerberater.
              </li>
              <li>
                Belege müssen 10 Jahre aufbewahrt werden. Sind alle in Drive
                gespeichert.
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
  kind,
}: {
  byRate: Map<number, { net: number; vat: number; gross: number }>;
  label: string;
  /**
   * 'output' (Einnahmen) → Bemessungsgrundlage geht in KZ 81/86/87,
   *   Steuer wird von Elster automatisch berechnet.
   * 'input' (Ausgaben) → Vorsteuer geht komplett in KZ 66, unabhaengig
   *   vom Satz.
   */
  kind: 'output' | 'input';
}) {
  if (byRate.size === 0) {
    return (
      <p className="text-sm text-gray-500">
        Keine Einträge in diesem Zeitraum.
      </p>
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
          <th className="text-right py-2">ELSTER</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {Array.from(byRate.entries())
          .sort((a, b) => b[0] - a[0])
          .map(([rate, v]) => {
            const netKZ = kind === 'output' ? outputKZForRate(rate) : null;
            return (
              <tr key={rate}>
                <td className="py-1.5 text-gray-700">
                  {Math.round(rate * 100)} %
                </td>
                <td className="py-1.5 text-right text-gray-700">
                  <SensitiveValue>{formatEUR(v.net)}</SensitiveValue>
                  {kind === 'output' && netKZ && (
                    <div className="text-[10px] font-mono text-brand-blue">
                      KZ {netKZ}
                    </div>
                  )}
                </td>
                <td className="py-1.5 text-right text-gray-700">
                  <SensitiveValue>{formatEUR(v.vat)}</SensitiveValue>
                  {kind === 'input' && v.vat > 0 && (
                    <div className="text-[10px] font-mono text-brand-blue">
                      → KZ 66
                    </div>
                  )}
                </td>
                <td className="py-1.5 text-right text-gray-900 font-medium">
                  <SensitiveValue>{formatEUR(v.gross)}</SensitiveValue>
                </td>
                <td className="py-1.5 text-right text-[10px] font-mono text-gray-500">
                  {kind === 'output'
                    ? `Zeile ${zeileForKZ(netKZ)}`
                    : 'Zeile 55'}
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  );
}

/** Elster-Zeile fuer eine Umsatz-Bemessungsgrundlage-KZ. */
function zeileForKZ(kz: string | null): string {
  switch (kz) {
    case '81':
      return '13';
    case '86':
      return '14';
    case '87':
      return '15';
    case '35':
      return '16';
    default:
      return '—';
  }
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
          <SensitiveValue>{formatEUR(value)}</SensitiveValue>
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
        <div className="font-semibold text-gray-900">
          <SensitiveValue>{formatEUR(net)}</SensitiveValue>
        </div>
      </div>
      <div>
        <div className="text-xs text-gray-500">{vatLabel}</div>
        <div className="font-semibold text-gray-900">
          <SensitiveValue>{formatEUR(vat)}</SensitiveValue>
        </div>
      </div>
      <div>
        <div className="text-xs text-gray-500">Brutto</div>
        <div className="font-semibold text-gray-900">
          <SensitiveValue>{formatEUR(gross)}</SensitiveValue>
        </div>
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

/**
 * Formatiert einen periodValue ("2026-07" | "2026-Q3" | "2026") als
 * leserliches Label fuer UI und CSV-Header.
 */
function formatPeriodLabel(key: string): string {
  if (/^\d{4}-Q[1-4]$/.test(key)) {
    const [year, q] = key.split('-');
    return `${q} / ${year}`;
  }
  if (/^\d{4}-\d{2}$/.test(key)) return monthLabel(key);
  if (/^\d{4}$/.test(key)) return `Jahr ${key}`;
  return key;
}

/**
 * Baut einen Date-in-Range-Filter fuer den gewaehlten Zeitraum.
 * Erkennt Format automatisch: JJJJ-MM (Monat), JJJJ-QN (Quartal),
 * JJJJ (Jahr).
 */
function buildRangeFilter(periodValue: string): (d: Date) => boolean {
  // Quartal
  const qm = periodValue.match(/^(\d{4})-Q([1-4])$/);
  if (qm) {
    const year = Number(qm[1]);
    const q = Number(qm[2]);
    const startMonth = (q - 1) * 3; // 0-basiert
    const endMonth = startMonth + 2;
    return (d) =>
      d.getFullYear() === year &&
      d.getMonth() >= startMonth &&
      d.getMonth() <= endMonth;
  }
  // Jahr
  if (/^\d{4}$/.test(periodValue)) {
    const year = Number(periodValue);
    return (d) => d.getFullYear() === year;
  }
  // Monat (Fallback)
  const [year, mon] = periodValue.split('-').map(Number);
  return (d) => d.getFullYear() === year && d.getMonth() + 1 === mon;
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
