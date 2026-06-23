'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listContracts, listCustomers } from '@/lib/firestore';
import type { Contract, ContractStatus, Customer } from '@/lib/types';
import { formatTsDE } from '@/lib/utils';
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_BADGE_CLASSES,
  computeContractStatus,
  isContractReminderDue,
} from '@/lib/contract-status';

type FilterStatus = 'all' | ContractStatus;

const FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'draft', label: 'Entwurf' },
  { value: 'sent', label: 'Versendet' },
  { value: 'signed', label: 'Signiert' },
  { value: 'expired', label: 'Abgelaufen' },
  { value: 'cancelled', label: 'Storniert' },
];

export default function VertraegePage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Map<string, Customer>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([listContracts(), listCustomers()])
      .then(([c, cust]) => {
        setContracts(c);
        setCustomers(new Map(cust.map((x) => [x.id, x])));
      })
      .catch((err) => {
        console.error(err);
        setError('Verträge konnten nicht geladen werden.');
      })
      .finally(() => setLoading(false));
  }, []);

  const enriched = useMemo(() => {
    return contracts.map((c) => ({
      contract: c,
      customer: customers.get(c.customerId),
      computedStatus: computeContractStatus(c),
      reminderDue: isContractReminderDue(c),
    }));
  }, [contracts, customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter(({ contract, customer, computedStatus }) => {
      if (filter !== 'all' && computedStatus !== filter) return false;
      if (!q) return true;
      const blob = [
        contract.title,
        contract.typeLabel,
        customer?.company,
        customer?.firstName,
        customer?.lastName,
        contract.customerSnapshot.company,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [enriched, filter, search]);

  const overdueCount = enriched.filter((e) => e.reminderDue).length;

  return (
    <div>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Verträge</h1>
          <p className="mt-1 text-sm text-gray-500">
            {contracts.length}{' '}
            {contracts.length === 1 ? 'Vertrag' : 'Verträge'}
            {overdueCount > 0 && (
              <span className="ml-2 text-amber-700 font-medium">
                · {overdueCount} überfällig
              </span>
            )}
          </p>
        </div>
        <Link href="/dashboard/vertraege/neu" className="btn-primary">
          + Neuer Vertrag
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
          placeholder="Suche nach Titel, Typ, Kunde…"
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
        <div className="card text-sm text-gray-500">Lädt Verträge…</div>
      ) : filtered.length === 0 ? (
        <div className="card text-sm text-gray-500">
          {contracts.length === 0
            ? 'Noch keine Verträge. Klick auf "+ Neuer Vertrag" zum Anlegen.'
            : 'Keine Verträge für diese Filter.'}
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Titel</th>
                <th className="text-left px-4 py-3">Typ</th>
                <th className="text-left px-4 py-3">Kunde</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Versendet</th>
                <th className="text-left px-4 py-3">Signiert</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(
                ({ contract, customer, computedStatus, reminderDue }) => (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {contract.title}
                      {reminderDue && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                          überfällig
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {contract.typeLabel}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {customer?.company ??
                        contract.customerSnapshot.company ??
                        '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${CONTRACT_STATUS_BADGE_CLASSES[computedStatus]}`}
                      >
                        {CONTRACT_STATUS_LABELS[computedStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatTsDE(contract.sentAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatTsDE(contract.signedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/vertraege/${contract.id}`}
                        className="text-brand-blue hover:underline text-sm font-medium"
                      >
                        Öffnen →
                      </Link>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
