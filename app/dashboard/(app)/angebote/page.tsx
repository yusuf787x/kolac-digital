'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listQuotes, listCustomers } from '@/lib/firestore';
import type { Quote, QuoteStatus, Customer } from '@/lib/types';
import { formatEUR, formatDateDE } from '@/lib/utils';
import { computeQuoteStatus, QUOTE_STATUS_LABELS } from '@/lib/quote-status';
import QuoteStatusSelect from '@/components/quote/QuoteStatusSelect';

type FilterStatus = 'all' | QuoteStatus;

const FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'draft', label: 'Entwurf' },
  { value: 'sent', label: 'Versendet' },
  { value: 'accepted', label: 'Angenommen' },
  { value: 'rejected', label: 'Abgelehnt' },
  { value: 'invoiced', label: 'Abgerechnet' },
  { value: 'expired', label: 'Abgelaufen' },
];

export default function AngebotePage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Map<string, Customer>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([listQuotes(), listCustomers()])
      .then(([qts, cust]) => {
        setQuotes(qts);
        setCustomers(new Map(cust.map((c) => [c.id, c])));
      })
      .catch((err) => {
        console.error(err);
        setError(`Angebote konnten nicht geladen werden: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, []);

  const enriched = useMemo(() => {
    return quotes.map((q) => ({
      quote: q,
      customer: customers.get(q.customerId),
      computedStatus: computeQuoteStatus(q.status, q.validUntil.toDate()),
    }));
  }, [quotes, customers]);

  const filtered = useMemo(() => {
    const qsearch = search.trim().toLowerCase();
    return enriched.filter(({ quote, customer, computedStatus }) => {
      if (filter !== 'all' && computedStatus !== filter) return false;
      if (!qsearch) return true;
      const blob = [
        quote.quoteNumber,
        customer?.company,
        customer?.firstName,
        customer?.lastName,
        quote.totalAmount.toFixed(2),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(qsearch);
    });
  }, [enriched, filter, search]);

  const openCount = enriched.filter(
    (e) => e.computedStatus === 'sent' || e.computedStatus === 'draft',
  ).length;
  const openVolume = enriched
    .filter((e) => e.computedStatus === 'sent' || e.computedStatus === 'draft')
    .reduce((acc, e) => acc + e.quote.totalAmount, 0);

  return (
    <div>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Angebote</h1>
          <p className="mt-1 text-sm text-gray-500">
            {quotes.length} {quotes.length === 1 ? 'Angebot' : 'Angebote'}
            {openCount > 0 && (
              <span className="ml-2 text-orange-700 font-medium">
                · {openCount} offen ({formatEUR(openVolume)})
              </span>
            )}
          </p>
        </div>
        <Link href="/dashboard/angebote/neu" className="btn-primary">
          + Neues Angebot
        </Link>
      </header>

      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-brand-blue text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Suche nach Angebotsnr., Kunde, Betrag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
        />
      </div>

      {error && (
        <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card text-sm text-gray-500">Lädt Angebote…</div>
      ) : filtered.length === 0 ? (
        <div className="card text-sm text-gray-500">
          {quotes.length === 0
            ? 'Noch keine Angebote. Klick auf "+ Neues Angebot" zum Anlegen.'
            : 'Keine Angebote für diese Filter.'}
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Angebotsnr.</th>
                <th className="text-left px-4 py-3">Datum</th>
                <th className="text-left px-4 py-3">Gültig bis</th>
                <th className="text-left px-4 py-3">Kunde</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Betrag</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(({ quote, customer, computedStatus }) => (
                <tr key={quote.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {quote.quoteNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatDateDE(quote.quoteDate.toDate())}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatDateDE(quote.validUntil.toDate())}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {customer?.company ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <QuoteStatusSelect
                      quote={quote}
                      computedStatus={computedStatus}
                      onUpdated={(patch) =>
                        setQuotes((prev) =>
                          prev.map((q) =>
                            q.id === quote.id ? ({ ...q, ...patch } as Quote) : q,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatEUR(quote.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/angebote/${quote.id}`}
                      className="text-brand-blue hover:underline text-sm font-medium"
                    >
                      Öffnen →
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
