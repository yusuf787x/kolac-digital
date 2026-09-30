'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listExpenses, excludeExpense, includeExpense } from '@/lib/firestore';
import type { Expense } from '@/lib/types';
import { formatEUR, formatDateDE } from '@/lib/utils';
import {
  analysiereFahrtkosten,
  VERDICT_LABEL,
  type FahrtkostenFinding,
} from '@/lib/fahrtkosten-analyse';

/**
 * Bestandsaufnahme und Ausbuchung vor der Umstellung auf die
 * Kilometerpauschale.
 *
 * Die Belege werden nicht geloescht, sondern nur markiert. Sie bleiben
 * als Nachweis im System und lassen sich jederzeit wieder einbuchen.
 */
export default function FahrtkostenAnalysePage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listExpenses()
      .then((all) => {
        setExpenses(all);
        // Standardmaessig alles vorgemerkt, was noch nicht ausgebucht ist.
        const a = analysiereFahrtkosten(all);
        setSelected(new Set(a.offen.map((f) => f.expense.id)));
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const analyse = useMemo(() => analysiereFahrtkosten(expenses), [expenses]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const ausbuchen = async () => {
    const ids = analyse.offen
      .filter((f) => selected.has(f.expense.id))
      .map((f) => f.expense.id);
    if (ids.length === 0) return;
    if (
      !confirm(
        `${ids.length} Beleg(e) aus der Buchhaltung nehmen?\n\n` +
          'Die Belege bleiben vollständig erhalten und zählen nur nicht ' +
          'mehr in EÜR und Umsatzsteuervoranmeldung. Das lässt sich ' +
          'jederzeit rückgängig machen.',
      )
    ) {
      return;
    }
    setRunning(true);
    setError(null);
    try {
      for (const id of ids) {
        await excludeExpense(id, {
          reason: 'kilometerpauschale',
          tripId: null,
          note: 'Mit der Kilometerpauschale abgegolten.',
        });
      }
      setDone(`${ids.length} Beleg(e) ausgebucht.`);
      load();
    } catch (err) {
      setError(`Ausbuchen fehlgeschlagen: ${(err as Error).message}`);
    } finally {
      setRunning(false);
    }
  };

  const rueckgaengig = async (id: string) => {
    setRunning(true);
    try {
      await includeExpense(id);
      load();
    } catch (err) {
      setError(`Rückgängig fehlgeschlagen: ${(err as Error).message}`);
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <div className="card text-sm text-gray-500">Lädt…</div>;
  }

  const offenSelected = analyse.offen.filter((f) =>
    selected.has(f.expense.id),
  );
  const offenVorsteuer =
    Math.round(offenSelected.reduce((a, f) => a + f.vat, 0) * 100) / 100;

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
          Zeigt alle Belege, die mit Autofahrten zu tun haben, und nimmt sie
          auf Wunsch aus der Buchhaltung. Gelöscht wird nichts.
        </p>
      </header>

      {error && (
        <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      {done && (
        <div className="card mb-4 bg-green-50 border-green-200 text-sm text-green-800">
          {done}
        </div>
      )}

      {/* Kennzahlen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <Kennzahl
          label="Betroffene Belege"
          wert={String(analyse.betroffen.length)}
          fuss={`${formatEUR(analyse.summeBrutto)} brutto`}
        />
        <Kennzahl
          label="Netto in der EÜR"
          wert={formatEUR(analyse.summeNetto)}
          fuss="fällt bei Umstellung weg"
        />
        <Kennzahl
          label="Gezogene Vorsteuer"
          wert={formatEUR(analyse.summeVorsteuer)}
          fuss={
            analyse.summeVorsteuer > 0
              ? 'muss zurückgedreht werden'
              : 'nichts zu korrigieren'
          }
          rot={analyse.summeVorsteuer > 0}
        />
      </div>

      {/* Vorsteuer je Quartal */}
      {analyse.vorsteuerProQuartal.some((q) => q.vorsteuer > 0) && (
        <div className="card mb-5 bg-amber-50 border-amber-200">
          <h2 className="text-sm font-semibold text-amber-900 mb-2">
            Vorsteuer-Korrektur je Voranmeldungszeitraum
          </h2>
          <div className="table-wrap">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-amber-800 tracking-wider border-b border-amber-200">
                <tr>
                  <th className="text-left py-1.5 w-28">Zeitraum</th>
                  <th className="text-left py-1.5">Belege</th>
                  <th className="text-right py-1.5 w-40">
                    Vorsteuer kürzen um
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-200">
                {analyse.vorsteuerProQuartal.map((q) => (
                  <tr key={q.quartal}>
                    <td className="py-1.5 font-medium text-amber-900">
                      {q.quartal}
                    </td>
                    <td className="py-1.5 text-amber-900">{q.belege}</td>
                    <td className="py-1.5 text-right tabular-nums font-semibold text-amber-900">
                      {formatEUR(q.vorsteuer)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-amber-900 mt-3">
            Quartale ohne Betrag liegen im Zeitraum der
            Kleinunternehmer-Regelung. Da war nie Vorsteuer abzuziehen, also
            ist dort auch nichts zu korrigieren. Wurde ein Zeitraum bereits
            abgegeben, braucht es eine berichtigte Voranmeldung in Elster.
          </p>
        </div>
      )}

      {/* Aktion */}
      {analyse.offen.length > 0 && (
        <div className="card mb-5 border-blue-200 bg-blue-50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {offenSelected.length} von {analyse.offen.length} Belegen
                vorgemerkt
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                Kürzt die Vorsteuer um {formatEUR(offenVorsteuer)} und nimmt{' '}
                {formatEUR(
                  Math.round(
                    offenSelected.reduce((a, f) => a + f.net, 0) * 100,
                  ) / 100,
                )}{' '}
                netto aus der EÜR.
              </p>
            </div>
            <button
              onClick={ausbuchen}
              disabled={running || offenSelected.length === 0}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {running ? 'Läuft…' : 'Belege ausbuchen'}
            </button>
          </div>
        </div>
      )}

      <Tabelle
        titel="Fällt weg bei Kilometerpauschale"
        hinweis="Diese Kosten sind mit der Pauschale abgegolten und dürfen nicht zusätzlich als Betriebsausgabe stehen bleiben."
        findings={analyse.betroffen}
        ton="rot"
        selected={selected}
        onToggle={toggle}
        onUndo={rueckgaengig}
        running={running}
      />

      <Tabelle
        titel="Bitte selbst entscheiden"
        hinweis="In einer Fahrt-Kategorie, aber nicht eindeutig zuzuordnen. Schau dir die Posten an und sag mir, wohin sie gehören."
        findings={analyse.unklar}
        ton="gelb"
      />

      <Tabelle
        titel="Bleibt unverändert abziehbar"
        hinweis="Hotel, Bahn und Flug haben nichts mit dem Betrieb des eigenen Fahrzeugs zu tun. CarSharing und Mietwagen ebenfalls nicht, denn die Pauschale gilt nur für das eigene Auto. Alles hier bleibt inklusive Vorsteuer abziehbar."
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

function Kennzahl({
  label,
  wert,
  fuss,
  rot,
}: {
  label: string;
  wert: string;
  fuss: string;
  rot?: boolean;
}) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wider text-gray-500">
        {label}
      </div>
      <div
        className={`text-2xl font-semibold mt-1 tabular-nums ${
          rot ? 'text-red-600' : 'text-gray-900'
        }`}
      >
        {wert}
      </div>
      <div className="text-xs text-gray-500 mt-1">{fuss}</div>
    </div>
  );
}

function Tabelle({
  titel,
  hinweis,
  findings,
  ton,
  selected,
  onToggle,
  onUndo,
  running,
}: {
  titel: string;
  hinweis: string;
  findings: FahrtkostenFinding[];
  ton: 'rot' | 'gelb' | 'grau';
  selected?: Set<string>;
  onToggle?: (id: string) => void;
  onUndo?: (id: string) => void;
  running?: boolean;
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
              {onToggle && <th className="py-2 w-8" />}
              <th className="text-left py-2 w-24">Datum</th>
              <th className="text-left py-2">Posten</th>
              <th className="text-left py-2 w-32">Kategorie</th>
              <th className="text-left py-2 w-36">Einstufung</th>
              <th className="text-right py-2 w-24">Brutto</th>
              <th className="text-right py-2 w-24">Vorsteuer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {findings.map((f) => {
              const ausgebucht = !!f.expense.excluded;
              return (
                <tr
                  key={f.expense.id}
                  className={ausgebucht ? 'opacity-60' : undefined}
                >
                  {onToggle && (
                    <td className="py-2">
                      {!ausgebucht && (
                        <input
                          type="checkbox"
                          checked={selected?.has(f.expense.id) ?? false}
                          onChange={() => onToggle(f.expense.id)}
                          className="rounded border-gray-300"
                        />
                      )}
                    </td>
                  )}
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
                    {ausgebucht && (
                      <>
                        {' '}
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-gray-200 text-gray-700">
                          ausgebucht
                        </span>
                        {onUndo && (
                          <button
                            onClick={() => onUndo(f.expense.id)}
                            disabled={running}
                            className="ml-2 text-[11px] text-blue-600 hover:underline disabled:opacity-50"
                          >
                            rückgängig
                          </button>
                        )}
                      </>
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
                      f.vat > 0 && !ausgebucht
                        ? 'text-red-600 font-medium'
                        : 'text-gray-400'
                    }`}
                  >
                    {formatEUR(f.vat)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
