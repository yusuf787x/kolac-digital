'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  listCustomers,
  listDeals,
  listOpenActivities,
} from '@/lib/firestore';
import type { Customer, Deal, DealStage } from '@/lib/types';
import { stageDef } from '@/lib/sales';
import { formatEUR, formatTsDE, tsToMillis } from '@/lib/utils';
import DealFormModal from '@/components/vertrieb/DealFormModal';

export default function DealListePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [overdueDealIds, setOverdueDealIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<DealStage | 'alle'>('alle');
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(() => {
    Promise.all([listDeals(), listCustomers(), listOpenActivities()])
      .then(([d, c, acts]) => {
        setDeals(d);
        setCustomers(c);
        const now = Date.now();
        const overdue = new Set<string>();
        acts.forEach((a) => {
          const due = tsToMillis(a.dueDate);
          if (due > 0 && due < now) overdue.add(a.dealId);
        });
        setOverdueDealIds(overdue);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const customerMap = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deals.filter((d) => {
      if (stageFilter !== 'alle' && d.stage !== stageFilter) return false;
      if (!q) return true;
      const c = customerMap.get(d.customerId);
      return [d.title, c?.company, c?.firstName, c?.lastName, c?.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [deals, search, stageFilter, customerMap]);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/vertrieb"
            className="text-sm text-gray-500 hover:text-gray-900 mb-2 inline-block"
          >
            ← Zum Board
          </Link>
          <h1 className="text-3xl font-semibold text-gray-900">Deals</h1>
          <p className="mt-1 text-sm text-gray-500">
            {deals.length} {deals.length === 1 ? 'Deal' : 'Deals'}
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          + Neuer Deal
        </button>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Suche…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-xs"
        />
        <select
          className="input max-w-[12rem]"
          value={stageFilter}
          onChange={(e) =>
            setStageFilter(e.target.value as DealStage | 'alle')
          }
        >
          <option value="alle">Alle Stufen</option>
          {(
            [
              'kontaktiert',
              'erstgespraech',
              'angebot_verschickt',
              'vertrag_erhalten',
              'abgeschlossen',
              'verloren',
            ] as DealStage[]
          ).map((s) => (
            <option key={s} value={s}>
              {stageDef(s).label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="card text-sm text-gray-500">Lädt…</div>
      ) : filtered.length === 0 ? (
        <div className="card text-sm text-gray-500">
          {deals.length === 0
            ? 'Noch keine Deals. Klick auf "+ Neuer Deal".'
            : 'Keine Treffer.'}
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Kunde</th>
                <th className="text-left px-4 py-3">Titel</th>
                <th className="text-left px-4 py-3">Stufe</th>
                <th className="text-right px-4 py-3">Wert</th>
                <th className="text-left px-4 py-3">Aktualisiert</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((d) => {
                const c = customerMap.get(d.customerId);
                const sd = stageDef(d.stage);
                return (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <span className="flex items-center gap-2">
                        {overdueDealIds.has(d.id) && (
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                        )}
                        {c?.company ||
                          `${c?.firstName ?? ''} ${c?.lastName ?? ''}`.trim() ||
                          '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{d.title}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded text-white"
                        style={{ backgroundColor: sd.color }}
                      >
                        {sd.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {d.value != null ? formatEUR(d.value) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatTsDE(d.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/vertrieb/${d.id}`}
                        className="text-brand-blue hover:underline text-sm font-medium"
                      >
                        Details →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <DealFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mode="create"
        customers={customers}
        onSaved={() => load()}
        onCustomerCreated={load}
      />
    </div>
  );
}
