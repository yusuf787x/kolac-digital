'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listExpenses } from '@/lib/firestore';
import type { Expense } from '@/lib/types';
import { formatEUR, formatDateDE } from '@/lib/utils';
import {
  analysiereFahrtkosten,
  VERDICT_LABEL,
  type FahrtkostenFinding,
} from '@/lib/fahrtkosten-analyse';

/**
 * Bestandsaufnahme vor der Umstellung auf die Kilometerpauschale.
 *
 * Diese Seite aendert NICHTS. Sie zeigt nur, welche Belege im System
 * liegen, die mit Autofahrten zu tun haben, und was davon bei Ansatz
 * einer Kilometerpauschale entfallen muss. Erst wenn die Liste stimmt,
 * wird im naechsten Schritt korrigiert.
 */
export default function FahrtkostenAnalysePage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listExpenses()
      .then(setExpenses)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const analyse = useMemo(
    () => analysiereFahrtkosten(expenses),
    [expenses],
  );

  const exportCSV = () => {
    const fmt = (n: number) => n.toFixed(2).replace('.', ',');
    const rows: string[][] = [
      [
        'Datum',
        'Posten',
        'Lieferant',
        'Kategorie',
        'Einstufung',
        'Erkannt an',
        'Brutto',
        'Netto',
        'Vorsteuer',
      ],
      ...analyse.findings.map((f) => [
        formatDateDE(f.expense.date.toDate()),
        f.expense.description,
        f.expense.supplier,
        f.expense.category,
        VERDICT_LABEL[f.verdict],
        f.matched,
        fmt(f.gross),
        fmt(f.net),
        fmt(f.vat),
      ]),
    ];
    const csv = rows
      .map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'),
      )
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fahrtkosten-analyse.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="card text-sm text-gray-500">Lädt…</div>;
  }

  return (
    <div>
      <header className="mb-6">
        <Link
          href="/dashboard/ausgaben"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu den Ausgaben
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">
          Fahrtkosten: Bestandsaufnahme
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Zeigt alle Belege, die mit Autofahrten zu tun haben. Diese Seite
          ändert nichts, sie schaut nur nach.
        </p>
      </header>

      {error && (
        <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Kennzahlen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="card">
          <div className="text-xs uppercase tracking-wider text-gray-500">
            Betroffene Belege
          </div>
          <div className="text-2xl font-semibold text-gray-900 mt-1 tabular-nums">
            {analyse.betroffen.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {formatEUR(analyse.summeBrutto)} brutto
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wider text-gray-500">
            Netto in der EÜR
          </div>
          <div className="text-2xl font-semibold text-gray-900 mt-1 tabular-nums">
            {formatEUR(analyse.summeNetto)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            fällt bei Umstellung weg
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wider text-gray-500">
            Gezogene Vorsteuer
          </div>
          <div
            className={`text-2xl font-semibold mt-1 tabular-nums ${
              analyse.summeVorsteuer > 0 ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            {formatEUR(analyse.summeVorsteuer)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {analyse.summeVorsteuer > 0
              ? 'muss zurückgedreht werden'
              : 'nichts zu korrigieren'}
          </div>
        </div>
      </div>

      {/* Handlungsbedarf */}
      {analyse.betroffen.length > 0 && (
        <div className="card mb-5 bg-amber-50 border-amber-200">
          <h2 className="text-sm font-semibold text-amber-900 mb-2">
            Was das bedeutet
          </h2>
          <ul className="text-sm text-amber-900 space-y-1.5 list-disc pl-5">
            <li>
              Betroffene Jahre für die EÜR:{' '}
              <strong>{analyse.jahre.join(', ') || 'keine'}</strong>
            </li>
            {analyse.ustvaMonate.length > 0 ? (
              <li>
                Für diese Monate wurde Vorsteuer gezogen und es braucht
                eine <strong>berichtigte Umsatzsteuervoranmeldung</strong>:{' '}
                <strong>{analyse.ustvaMonate.join(', ')}</strong>. Das macht
                die Software nicht, das ist ein Handgriff in Elster.
              </li>
            ) : (
              <li>
                Keine Vorsteuer betroffen. Alle Belege liegen im Zeitraum der
                Kleinunternehmer-Regelung, da war nie etwas abzuziehen.
              </li>
            )}
            <li>
              Parkgebühren, Maut und Werkstattkosten sind mit einer
              Kilometerpauschale ebenfalls abgegolten und fallen deshalb mit
              weg, nicht nur der Sprit.
            </li>
          </ul>
        </div>
      )}

      <div className="flex justify-end mb-3">
        <button onClick={exportCSV} className="btn-secondary text-xs">
          Als CSV exportieren
        </button>
      </div>

      <Tabelle
        titel="Fällt weg bei Kilometerpauschale"
        hinweis="Diese Kosten sind mit der Pauschale abgegolten und dürfen nicht zusätzlich als Betriebsausgabe stehen bleiben."
        findings={analyse.betroffen}
        ton="rot"
      />

      <Tabelle
        titel="Bitte selbst entscheiden"
        hinweis="In einer Fahrt-Kategorie, aber nicht eindeutig zuzuordnen. Schau dir die Posten an und sag mir, wohin sie gehören."
        findings={analyse.unklar}
        ton="gelb"
      />

      <Tabelle
        titel="Bleibt unverändert abziehbar"
        hinweis="Hotel, Bahn, Flug, Taxi und Mietwagen haben nichts mit dem Betrieb des eigenen Fahrzeugs zu tun und bleiben neben der Pauschale bestehen."
        findings={analyse.bleibt}
        ton="grau"
      />

      {analyse.findings.length === 0 && (
        <div className="card text-sm text-gray-500">
          Keine Belege gefunden, die mit Fahrten zu tun haben.
        </div>
      )}
    </div>
  );
}

function Tabelle({
  titel,
  hinweis,
  findings,
  ton,
}: {
  titel: string;
  hinweis: string;
  findings: FahrtkostenFinding[];
  ton: 'rot' | 'gelb' | 'grau';
}) {
  if (findings.length === 0) return null;

  const badge =
    ton === 'rot'
      ? 'bg-red-50 text-red-700'
      : ton === 'gelb'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-gray-100 text-gray-600';

  return (
    <section className="card mb-4">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-gray-900">
          {titel}{' '}
          <span className="text-sm font-normal text-gray-500">
            ({findings.length})
          </span>
        </h2>
        <p className="text-xs text-gray-500 mt-1">{hinweis}</p>
      </div>
      <div className="table-wrap">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-gray-500 tracking-wider border-b border-gray-100">
            <tr>
              <th className="text-left py-2 w-24">Datum</th>
              <th className="text-left py-2">Posten</th>
              <th className="text-left py-2 w-32">Kategorie</th>
              <th className="text-left py-2 w-36">Einstufung</th>
              <th className="text-right py-2 w-24">Brutto</th>
              <th className="text-right py-2 w-24">Vorsteuer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {findings.map((f) => (
              <tr key={f.expense.id}>
                <td className="py-2 text-gray-600 whitespace-nowrap">
                  {formatDateDE(f.expense.date.toDate())}
                </td>
                <td className="py-2 text-gray-900">
                  {f.expense.description}
                  {f.expense.supplier && (
                    <span className="text-gray-500">
                      {' '}
                      · {f.expense.supplier}
                    </span>
                  )}
                </td>
                <td className="py-2 text-gray-600">{f.expense.category}</td>
                <td className="py-2">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${badge}`}
                    title={`Erkannt an: ${f.matched}`}
                  >
                    {VERDICT_LABEL[f.verdict]}
                  </span>
                </td>
                <td className="py-2 text-right tabular-nums text-gray-900">
                  {formatEUR(f.gross)}
                </td>
                <td
                  className={`py-2 text-right tabular-nums ${
                    f.vat > 0 ? 'text-red-600 font-medium' : 'text-gray-400'
                  }`}
                >
                  {formatEUR(f.vat)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
