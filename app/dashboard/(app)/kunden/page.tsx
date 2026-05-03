'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { listCustomers } from '@/lib/firestore';
import type { Customer } from '@/lib/types';

export default function KundenPage() {
  return (
    <Suspense fallback={<div className="card text-sm text-gray-500">Lädt…</div>}>
      <KundenInner />
    </Suspense>
  );
}

function KundenInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const createdName = searchParams.get('created');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    listCustomers()
      .then(setCustomers)
      .catch((err) => {
        console.error(err);
        setError(`Kunden konnten nicht geladen werden: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, []);

  // Show success banner if we just created a customer; clean URL after.
  useEffect(() => {
    if (!createdName) return;
    setSuccessBanner(`✓ Kunde "${createdName}" wurde erfolgreich angelegt.`);
    router.replace('/dashboard/kunden');
    const t = setTimeout(() => setSuccessBanner(null), 4000);
    return () => clearTimeout(t);
  }, [createdName, router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.company, c.firstName, c.lastName, c.city, c.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [customers, search]);

  return (
    <div>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Kunden</h1>
          <p className="mt-1 text-sm text-gray-500">
            {customers.length} {customers.length === 1 ? 'Kunde' : 'Kunden'}
          </p>
        </div>
        <Link href="/dashboard/kunden/neu" className="btn-primary">
          + Neuer Kunde
        </Link>
      </header>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Suche nach Firma, Name, Ort, E-Mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
        />
      </div>

      {successBanner && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-900">
          {successBanner}
        </div>
      )}

      {error && (
        <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card text-sm text-gray-500">Lädt Kunden…</div>
      ) : filtered.length === 0 ? (
        <div className="card text-sm text-gray-500">
          {customers.length === 0
            ? 'Noch keine Kunden angelegt. Klick auf "+ Neuer Kunde" oder importiere die Seed-Daten in den Einstellungen.'
            : 'Keine Treffer für deine Suche.'}
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Firma</th>
                <th className="text-left px-4 py-3">Ansprechpartner</th>
                <th className="text-left px-4 py-3">Ort</th>
                <th className="text-left px-4 py-3">E-Mail</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.company || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{c.city || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {c.email || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/kunden/${c.id}`}
                      className="text-brand-blue hover:underline text-sm font-medium"
                    >
                      Details →
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
