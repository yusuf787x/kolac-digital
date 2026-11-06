'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listInvoices, listCustomers } from '@/lib/firestore';
import type { Invoice, InvoiceStatus, Customer } from '@/lib/types';
import {
  compareInvoicesByNumberDesc,
  daysOverdue,
  formatDateDE,
  formatEUR,
  isOverdue,
} from '@/lib/utils';
import { STATUS_LABELS } from '@/lib/invoice-status';
import InvoiceStatusSelect from '@/components/invoice/InvoiceStatusSelect';
import SensitiveValue from '@/components/ui/SensitiveValue';

type FilterStatus = 'all' | InvoiceStatus;
type SortKey = 'number' | 'date';
type SortDir = 'desc' | 'asc';

function compareByDateDesc(a: Invoice, b: Invoice): number {
  return (
    b.invoiceDate.toMillis() - a.invoiceDate.toMillis() ||
    compareInvoicesByNumberDesc(a, b)
  );
}

const FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'draft', label: 'Entwurf' },
  { value: 'sent', label: 'Versendet' },
  { value: 'paid', label: 'Bezahlt' },
  { value: 'partially_paid', label: 'Teilweise bezahlt' },
  { value: 'overdue', label: 'Überfällig' },
  { value: 'cancelled', label: 'Storniert' },
];

export default function RechnungenPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Map<string, Customer>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  // Standard: Rechnungsnummer, neueste oben. Wird bewusst nicht gespeichert.
  const [sortKey, setSortKey] = useState<SortKey>('number');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  /** Klick auf dieselbe Spalte dreht die Richtung, neue Spalte startet mit neueste oben. */
  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

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
        invoice.invoiceNumber ?? 'entwurf',
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

  const sorted = useMemo(() => {
    const cmp = sortKey === 'number' ? compareInvoicesByNumberDesc : compareByDateDesc;
    const list = [...filtered].sort((a, b) => cmp(a.invoice, b.invoice));
    return sortDir === 'desc' ? list : list.reverse();
  }, [filtered, sortKey, sortDir]);

  const overdueCount = enriched.filter((e) => e.computedStatus === 'overdue')
    .length;

  return (
    <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
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
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/rechnungen/mahnwesen"
            className="btn-secondary"
            title="Automatische Zahlungserinnerungen beobachten, pausieren, starten"
          >
            Zahlungserinnerungen
          </Link>
          <Link
            href="/dashboard/rechnungen/reparatur"
            className="btn-secondary text-xs"
            title="Zahlungsbeträge und Zahlungshistorie auf Konsistenz prüfen."
          >
            Zahlungen prüfen
          </Link>
          <Link
            href="/dashboard/rechnungen/zahlungen-zusammenfassen"
            className="btn-secondary text-xs"
            title="Zahlungseingänge zusammenfassen, die eine frühere Korrektur aufgeteilt hat. Ändert keine Beträge."
          >
            Zahlungen zusammenfassen
          </Link>
          <Link
            href="/dashboard/rechnungen/gocardless"
            className="btn-secondary"
            title="Webhook-Log aller GoCardless-Events"
          >
            GoCardless-Log
          </Link>
          <Link href="/dashboard/rechnungen/neu" className="btn-primary">
            + Neue Rechnung
          </Link>
        </div>
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
        <div className="card p-0 table-wrap">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wider">
              <tr>
                <SortHeader
                  label="Rechnungsnr."
                  active={sortKey === 'number'}
                  dir={sortDir}
                  onClick={() => toggleSort('number')}
                />
                <SortHeader
                  label="Datum"
                  active={sortKey === 'date'}
                  dir={sortDir}
                  onClick={() => toggleSort('date')}
                />
                <th className="text-left px-4 py-3">Kunde</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Betrag</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(({ invoice, customer, computedStatus, daysLate }) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {invoice.invoiceNumber ?? (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-normal">
                        Entwurf
                        <span className="text-[10px] uppercase tracking-wider bg-amber-100 px-1.5 py-0.5 rounded-sm">
                          ohne Nr.
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatDateDE(invoice.invoiceDate.toDate())}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {customer?.company ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceStatusSelect
                      invoice={invoice}
                      computedStatus={computedStatus}
                      daysLate={daysLate}
                      onUpdated={(patch) =>
                        setInvoices((prev) =>
                          prev.map((inv) =>
                            inv.id === invoice.id
                              ? ({ ...inv, ...patch } as Invoice)
                              : inv,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    <SensitiveValue>
                      {formatEUR(invoice.totalAmount)}
                    </SensitiveValue>
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

/** Sortierbarer Spaltenkopf: Pfeil zeigt die Richtung, aria-sort für Screenreader. */
function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <th
      className="text-left px-4 py-3"
      aria-sort={active ? (dir === 'desc' ? 'descending' : 'ascending') : 'none'}
    >
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 uppercase tracking-wider rounded-sm hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${
          active ? 'text-gray-900' : ''
        }`}
        title={`Nach ${label} sortieren`}
      >
        {label}
        <span aria-hidden="true" className={active ? '' : 'opacity-30'}>
          {active && dir === 'asc' ? '↑' : '↓'}
        </span>
      </button>
    </th>
  );
}
