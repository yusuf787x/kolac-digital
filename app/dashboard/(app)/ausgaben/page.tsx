'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listExpenses, deleteExpense, deleteFile } from '@/lib/firestore';
import type { Expense, ExpenseCategory } from '@/lib/types';
import { EXPENSE_CATEGORIES } from '@/lib/types';
import { formatEUR, formatDateDE } from '@/lib/utils';

export default function AusgabenPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ExpenseCategory>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');

  const refresh = async () => {
    const list = await listExpenses();
    setExpenses(list);
  };

  useEffect(() => {
    refresh()
      .catch((err) => {
        console.error(err);
        setError('Ausgaben konnten nicht geladen werden.');
      })
      .finally(() => setLoading(false));
  }, []);

  const months = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => {
      const d = e.date.toDate();
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      set.add(key);
    });
    return Array.from(set).sort().reverse();
  }, [expenses]);

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

  const totalFiltered = filtered.reduce((acc, e) => acc + e.amount, 0);

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
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Ausgaben</h1>
          <p className="mt-1 text-sm text-gray-500">
            {filtered.length} Einträge · gesamt {formatEUR(totalFiltered)}
          </p>
        </div>
        <Link href="/dashboard/ausgaben/neu" className="btn-primary">
          + Neue Ausgabe
        </Link>
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
        <div className="card overflow-hidden p-0">
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
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {formatDateDE(e.date.toDate())}
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {e.description}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{e.category}</td>
                  <td className="px-4 py-3 text-gray-700">{e.supplier || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatEUR(e.amount)}
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
