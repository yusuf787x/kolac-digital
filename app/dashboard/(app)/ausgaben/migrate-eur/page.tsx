'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  listExpenses,
  updateExpense,
} from '@/lib/firestore';
import type { Expense, ExpenseCategory } from '@/lib/types';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_META,
} from '@/lib/types';
import { formatEUR, formatDateDE } from '@/lib/utils';
import { suggestCategory } from '@/lib/expense-recategorize';

interface Suggestion {
  expense: Expense;
  suggested: ExpenseCategory;
  keep: boolean;
}

/**
 * Einmalige Migrations-Seite: schlaegt fuer alle bestehenden Belege
 * neue Kategorien nach der erweiterten EÜR-Systematik vor. Der User
 * sieht jeden Vorschlag, kann ihn ausschließen oder ueberschreiben,
 * dann werden die Aenderungen einzeln in Firestore geschrieben.
 */
export default function MigrateEurPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<{ changed: number; skipped: number } | null>(
    null,
  );

  useEffect(() => {
    listExpenses()
      .then((all) => {
        const sug = all
          .map<Suggestion>((e) => {
            const s = suggestCategory(e.description, e.supplier, e.category);
            return { expense: e, suggested: s, keep: s !== e.category };
          })
          .filter((s) => s.suggested !== s.expense.category)
          .sort((a, b) => b.expense.date.toMillis() - a.expense.date.toMillis());
        setSuggestions(sug);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const changeCount = useMemo(
    () => suggestions.filter((s) => s.keep).length,
    [suggestions],
  );

  const setKeep = (id: string, keep: boolean) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.expense.id === id ? { ...s, keep } : s)),
    );
  };

  const setSuggested = (id: string, cat: ExpenseCategory) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.expense.id === id ? { ...s, suggested: cat, keep: true } : s,
      ),
    );
  };

  const run = async () => {
    if (!confirm(`${changeCount} Belege werden umkategorisiert. Fortfahren?`))
      return;
    setRunning(true);
    let changed = 0;
    let skipped = 0;
    for (const s of suggestions) {
      if (!s.keep) {
        skipped++;
        continue;
      }
      try {
        await updateExpense(s.expense.id, { category: s.suggested });
        changed++;
      } catch (err) {
        console.error('Update fehlgeschlagen:', s.expense.id, err);
      }
    }
    setDone({ changed, skipped });
    setRunning(false);
  };

  if (loading) {
    return <div className="card text-sm text-gray-500">Lade Belege…</div>;
  }

  return (
    <div>
      <header className="mb-6">
        <Link
          href="/dashboard/ausgaben"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu Ausgaben
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">
          EÜR-Kategorien migrieren
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Vorschlaege fuer bestehende Belege auf die neuen EÜR-Kategorien
          (Bewirtung, Kfz, Fremdleistungen, Geschenke, Miete Büro). Prüfen,
          gegebenenfalls anpassen, dann anwenden.
        </p>
      </header>

      {error && (
        <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {done && (
        <div className="card mb-4 bg-green-50 border-green-200 text-sm text-green-900">
          Fertig — {done.changed} Belege aktualisiert, {done.skipped}{' '}
          übersprungen.
        </div>
      )}

      {suggestions.length === 0 ? (
        <div className="card text-sm text-gray-600">
          Keine Belege zu migrieren. Alle Kategorien sind bereits konsistent.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">
              {changeCount} von {suggestions.length} Vorschlägen werden
              angewendet.
            </p>
            <button
              onClick={run}
              disabled={running || changeCount === 0 || !!done}
              className="btn-primary"
            >
              {running
                ? 'Migriere…'
                : done
                  ? 'Erledigt'
                  : `${changeCount} Belege anwenden`}
            </button>
          </div>

          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2 w-24">Datum</th>
                  <th className="text-left px-3 py-2">Posten</th>
                  <th className="text-left px-3 py-2 w-48">
                    Alt → Vorschlag
                  </th>
                  <th className="text-right px-3 py-2 w-28">Betrag</th>
                  <th className="px-3 py-2 w-16">Übernehmen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {suggestions.map((s) => {
                  const meta = EXPENSE_CATEGORY_META[s.suggested];
                  return (
                    <tr
                      key={s.expense.id}
                      className={s.keep ? '' : 'opacity-50'}
                    >
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                        {formatDateDE(s.expense.date.toDate())}
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-gray-900 font-medium">
                          {s.expense.description}
                        </div>
                        {s.expense.supplier && (
                          <div className="text-xs text-gray-500">
                            {s.expense.supplier}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-xs text-gray-500 mb-1">
                          {s.expense.category}
                        </div>
                        <select
                          className="input py-1 text-xs"
                          value={s.suggested}
                          onChange={(e) =>
                            setSuggested(
                              s.expense.id,
                              e.target.value as ExpenseCategory,
                            )
                          }
                        >
                          {EXPENSE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        {meta && (
                          <div className="mt-1 text-[10px] text-gray-500">
                            → EÜR Z{meta.elsterLine}
                            {meta.deductibleRate < 1 &&
                              ` · ${Math.round(meta.deductibleRate * 100)} %`}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-900">
                        {formatEUR(s.expense.amount)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={s.keep}
                          onChange={(e) =>
                            setKeep(s.expense.id, e.target.checked)
                          }
                          className="h-4 w-4 accent-brand-blue"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
