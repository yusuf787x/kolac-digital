'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listInvoices, listCustomers } from '@/lib/firestore';
import type { Invoice, InvoiceStatus, Customer } from '@/lib/types';
import { formatEUR, formatDateDE, isOverdue, daysOverdue } from '@/lib/utils';
import { STATUS_LABELS, STATUS_BADGE_CLASSES } from '@/lib/invoice-status';

type FilterStatus = 'all' | InvoiceStatus;

const FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'draft', label: 'Entwurf' },
  { value: 'sent', label: 'Versendet' },
  { value: 'paid', label: 'Bezahlt' },
  { value: 'partially_paid', label: 'Teilweise bezahlt' },
  { value: 'overdue', label: 'Überfällig' },
];

export default function RechnungenPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Map<string, Customer>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([listInvoices(), listCustomers()])
      .then(([inv, cust]) => {
        setInvoices(inv);
        setCustomers(new Map(cust.map((c) => [c.id, c])));
      })
      .catch((err) => {
        console.error(err);
        setError('Rechnungen konnten nicht geladen werden.');
      })
      .finally(() => setLoading(false));
  }, []);

  const enriched = useMemo(() => {
    return invoices.map((inv) => {
      const dueDate = inv.dueDate.toDate();
      const computedStatus: InvoiceStatus =
        inv.status !== 'paid' && inv.status !== 'partially_paid' &&
        isOverdue(inv.status, dueDate)
          ? 'overdue'
          : inv.status;
      return {
        invoice: inv,
        customer: customers.get(inv.customerId),
        computedStatus,
        daysLate: computedStatus === 'overdue' ? daysOverdue(dueDate) : 0,
      };
    });
  }, [invoices, customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter(({ invoice, customer, computedStatus }) => {
      if (filter !== 'all' && computedStatus !== filter) return false;
      if (!q) return true;
      const blob = [
        invoice.invoiceNumber,
        customer?.company,
        customer?.firstName,
        customer?.lastName,
        invoice.totalAmount.toFixed(2),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [enriched, filter, search]);

  const overdueCount = enriched.filter((e) => e.computedStatus === 'overdue')
    .length;

  return (
    <div>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Rechnungen</h1>
          <p className="mt-1 text-sm text-gray-500">
            {invoices.length} {invoices.length === 1 ? 'Rechnung' : 'Rechnungen'}
            {overdueCount > 0 && (
              <span className="ml-2 text-red-600 font-medium">
                · {overdueCount} überfällig
              </span>
            )}
          </p>
        </div>
        <Link href="/dashboard/rechnungen/neu" className="btn-primary">
          + Neue Rechnung
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
          placeholder="Suche nach Rechnungsnr., Kunde, Betrag…"
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
        <div className="card text-sm text-gray-500">Lädt Rechnungen…</div>
      ) : filtered.length === 0 ? (
        <div className="card text-sm text-gray-500">
          {invoices.length === 0
            ? 'Noch keine Rechnungen. Klick auf "+ Neue Rechnung" zum Anlegen.'
            : 'Keine Rechnungen für diese Filter.'}
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Rechnungsnr.</th>
                <th className="text-left px-4 py-3">Datum</th>
                <th className="text-left px-4 py-3">Kunde</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Betrag</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(({ invoice, customer, computedStatus, daysLate }) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatDateDE(invoice.invoiceDate.toDate())}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {customer?.company ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded ${STATUS_BADGE_CLASSES[computedStatus]}`}
                    >
                      {STATUS_LABELS[computedStatus]}
                      {computedStatus === 'overdue' && daysLate > 0 && (
                        <span className="ml-1.5">· {daysLate}d</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatEUR(invoice.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/rechnungen/${invoice.id}`}
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
