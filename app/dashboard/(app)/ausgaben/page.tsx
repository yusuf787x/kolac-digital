'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  listExpenses,
  deleteExpense,
  deleteFile,
  listBusinessTrips,
} from '@/lib/firestore';
import type { Expense, ExpenseCategory, BusinessTrip } from '@/lib/types';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_META,
  TRAVEL_EXPENSE_META,
} from '@/lib/types';
import {
  formatEUR,
  formatDateDE,
  grossToNet,
  computeExpenseEurBreakdown,
} from '@/lib/utils';
import SensitiveValue from '@/components/ui/SensitiveValue';

export default function AusgabenPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [trips, setTrips] = useState<BusinessTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ExpenseCategory>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');

  const refresh = async () => {
    const [list, tripList] = await Promise.all([
      listExpenses(),
      listBusinessTrips(),
    ]);
    setExpenses(list);
    setTrips(tripList);
  };

  useEffect(() => {
    refresh()
      .catch((err) => {
        console.error(err);
        setError('Ausgaben konnten nicht geladen werden.');
      })
      .finally(() => setLoading(false));
  }, []);

  /**
   * Fahrten erscheinen in derselben Liste wie die Belege, damit die
   * Ausgabenseite zeigt, was tatsaechlich in die EÜR geht. Sie liegen
   * in einer eigenen Sammlung und werden hier nur dargestellt, nicht
   * bearbeitet. Das passiert unter Fahrten.
   */
  const tripRows = useMemo(
    () =>
      trips.map((t) => ({
        trip: t,
        amount: t.amount,
        label: `Fahrt nach ${t.destinationName}`,
        sub: `${t.purpose} · ${t.totalKm} km × ${formatEUR(t.ratePerKm)}`,
      })),
    [trips],
  );

  const months = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => {
      const d = e.date.toDate();
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      set.add(key);
    });
    trips.forEach((t) => {
      const d = t.date.toDate();
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(set).sort().reverse();
  }, [expenses, trips]);

  const filteredTrips = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tripRows.filter(({ trip: t }) => {
      // Fahrtkosten sind eine eigene Kategorie, kein Beleg-Kategoriewert.
      if (categoryFilter !== 'all') return false;
      if (monthFilter !== 'all') {
        const d = t.date.toDate();
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key !== monthFilter) return false;
      }
      if (!q) return true;
      return [t.destinationName, t.purpose, t.destinationAddress]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [tripRows, search, categoryFilter, monthFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (monthFilter !== 'all') {
        const d = e.date.toDate();
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key !== monthFilter) return false;
      }
      if (!q) return true;
      return [e.description, e.supplier, e.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [expenses, search, categoryFilter, monthFilter]);

  const totals = useMemo(() => {
    let gross = 0;
    let vat = 0;
    let net = 0;
    let rcNet = 0;
    let rcVat = 0;
    let eurDeductible = 0;
    let nonDeductible = 0;
    let excludedGross = 0;
    for (const e of filtered) {
      // Ausgebuchte Belege zaehlen nirgends mit. Sie bleiben in der
      // Liste sichtbar, aber ausserhalb jeder Summe.
      if (e.excluded) {
        excludedGross += e.amount;
        continue;
      }
      const meta = EXPENSE_CATEGORY_META[e.category];
      const rate = e.vatRate ?? 0;
      const eur = computeExpenseEurBreakdown(
        e.amount,
        rate,
        meta?.deductibleRate ?? 1,
        !!e.reverseCharge,
      );
      eurDeductible += eur.deductibleNet;
      nonDeductible += eur.nonDeductibleNet;
      if (e.reverseCharge) {
        rcNet += eur.net;
        rcVat += eur.vat;
        gross += eur.gross;
        net += eur.net;
      } else {
        gross += eur.gross;
        vat += eur.vat;
        net += eur.net;
      }
    }
    // Fahrtkosten: reine Pauschale, keine Umsatzsteuer, voll abziehbar.
    const tripSum = filteredTrips.reduce((a, t) => a + t.amount, 0);
    gross += tripSum;
    net += tripSum;
    eurDeductible += tripSum;

    return {
      gross: Math.round(gross * 100) / 100,
      vat: Math.round(vat * 100) / 100,
      net: Math.round(net * 100) / 100,
      rcNet: Math.round(rcNet * 100) / 100,
      rcVat: Math.round(rcVat * 100) / 100,
      eurDeductible: Math.round(eurDeductible * 100) / 100,
      nonDeductible: Math.round(nonDeductible * 100) / 100,
      tripSum: Math.round(tripSum * 100) / 100,
      tripCount: filteredTrips.length,
      excludedGross: Math.round(excludedGross * 100) / 100,
      excludedCount: filtered.filter((e) => e.excluded).length,
    };
  }, [filtered, filteredTrips]);
  const totalFiltered = totals.gross;

  const handleDelete = async (e: Expense) => {
    if (!confirm(`Ausgabe "${e.description}" wirklich löschen?`)) return;
    try {
      if (e.receiptUrl) {
        // Try to delete the storage file but don't fail the whole op if it can't.
        const path = decodeStoragePath(e.receiptUrl);
        if (path) {
          try {
            await deleteFile(path);
          } catch (err) {
            console.warn('Storage-Datei konnte nicht entfernt werden:', err);
          }
        }
      }
      await deleteExpense(e.id);
      await refresh();
    } catch (err) {
      console.error(err);
      alert('Löschen fehlgeschlagen.');
    }
  };

  return (
    <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Ausgaben</h1>
          <p className="mt-1 text-sm text-gray-500">
            {filtered.length + filteredTrips.length} Einträge
            {totals.tripCount > 0 && (
              <> (davon {totals.tripCount} Fahrten)</>
            )}
            {totals.excludedCount > 0 && (
              <>
                {' '}
                ·{' '}
                <span className="text-gray-400">
                  {totals.excludedCount} ausgebucht
                </span>
              </>
            )}
            {' '}· brutto{' '}
            <SensitiveValue>{formatEUR(totals.gross)}</SensitiveValue>
            {totals.vat > 0 && (
              <>
                {' '}
                · netto{' '}
                <SensitiveValue>{formatEUR(totals.net)}</SensitiveValue> ·
                Vorsteuer{' '}
                <span className="text-green-700 font-medium">
                  <SensitiveValue>{formatEUR(totals.vat)}</SensitiveValue>
                </span>
              </>
            )}
            {totals.rcNet > 0 && (
              <span className="ml-2 text-amber-700">
                · Reverse Charge{' '}
                <SensitiveValue>{formatEUR(totals.rcNet)}</SensitiveValue>{' '}
                netto (§ 13b)
              </span>
            )}
            {totals.nonDeductible > 0 && (
              <span className="ml-2 text-orange-700">
                · davon nicht abzugsfähig (Bewirtung 30 %){' '}
                <SensitiveValue>
                  {formatEUR(totals.nonDeductible)}
                </SensitiveValue>
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/ausgaben/fahrtkosten-analyse"
            className="btn-secondary text-xs"
            title="Zeigt alle Belege rund um Autofahrten und was bei Umstellung auf die Kilometerpauschale entfällt."
          >
            Fahrtkosten prüfen
          </Link>
          <Link
            href="/dashboard/ausgaben/migrate-eur"
            className="btn-secondary text-xs"
            title="Bestehende Belege einmalig auf die neuen EÜR-Kategorien mappen."
          >
            EÜR-Kategorien prüfen
          </Link>
          <Link href="/dashboard/berichte/ustva" className="btn-secondary">
            UStVA-Übersicht
          </Link>
          <Link href="/dashboard/ausgaben/neu" className="btn-primary">
            + Neue Ausgabe
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <input
          type="search"
          placeholder="Suche…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
        />
        <select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as 'all' | ExpenseCategory)
          }
          className="input"
        >
          <option value="all">Alle Kategorien</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="input"
        >
          <option value="all">Alle Monate</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card text-sm text-gray-500">Lädt…</div>
      ) : filtered.length === 0 ? (
        <div className="card text-sm text-gray-500">
          {expenses.length === 0
            ? 'Noch keine Ausgaben erfasst.'
            : 'Keine Ausgaben für diese Filter.'}
        </div>
      ) : (
        <div className="card p-0 table-wrap">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Datum</th>
                <th className="text-left px-4 py-3">Posten</th>
                <th className="text-left px-4 py-3">Kategorie</th>
                <th className="text-left px-4 py-3">Lieferant</th>
                <th className="text-right px-4 py-3">Betrag</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  className={`hover:bg-gray-50${e.excluded ? ' bg-gray-50/60' : ''}`}
                >
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {formatDateDE(e.date.toDate())}
                  </td>
                  <td
                    className={`px-4 py-3 font-medium ${e.excluded ? 'text-gray-400 line-through' : 'text-gray-900'}`}
                  >
                    {e.description}
                    {e.excluded && (
                      <span
                        className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-200 text-gray-700 no-underline"
                        title="Mit der Kilometerpauschale abgegolten. Zählt nicht in EÜR und Umsatzsteuer, bleibt als Nachweis erhalten."
                      >
                        ausgebucht
                      </span>
                    )}
                    {e.reverseCharge && (
                      <span
                        className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800"
                        title="Reverse Charge (§ 13b UStG). EU-Ausland ohne MwSt."
                      >
                        RC § 13b
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="flex items-center gap-1.5">
                      <span>{e.category}</span>
                      {(() => {
                        const meta = EXPENSE_CATEGORY_META[e.category];
                        if (!meta) return null;
                        const reduced = meta.deductibleRate < 1;
                        return (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              reduced
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                            title={`EÜR ${meta.elsterLabel}${
                              reduced
                                ? `, nur ${Math.round(
                                    meta.deductibleRate * 100,
                                  )} % abziehbar`
                                : ''
                            }`}
                          >
                            Z{meta.elsterLine}
                            {reduced &&
                              ` · ${Math.round(meta.deductibleRate * 100)} %`}
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{e.supplier || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    <SensitiveValue>{formatEUR(e.amount)}</SensitiveValue>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {(e.receiptUrl || e.driveUrl) && (
                      <a
                        href={e.receiptUrl || e.driveUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-blue hover:underline text-xs font-medium mr-3"
                      >
                        Beleg
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(e)}
                      className="text-red-600 hover:underline text-xs font-medium"
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTrips.map(({ trip: t, label, sub }) => (
                <tr key={`trip-${t.id}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {formatDateDE(t.date.toDate())}
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {label}
                    <span
                      className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800"
                      title="Kilometerpauschale. Wird unter Fahrten gepflegt, nicht hier."
                    >
                      Fahrt
                    </span>
                    <div className="text-xs text-gray-500 font-normal mt-0.5">
                      {sub}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="flex items-center gap-1.5">
                      <span>Fahrtkosten</span>
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700"
                        title={`EÜR ${TRAVEL_EXPENSE_META.elsterLabel}`}
                      >
                        Z{TRAVEL_EXPENSE_META.elsterLine}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {t.destinationAddress || t.destinationName}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    <SensitiveValue>{formatEUR(t.amount)}</SensitiveValue>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href="/dashboard/fahrten"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Fahrten
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function decodeStoragePath(url: string): string | null {
  // Firebase Storage URLs encode the path after `/o/` and before `?`.
  const m = url.match(/\/o\/([^?]+)/);
  if (!m) return null;
  return decodeURIComponent(m[1]);
}
