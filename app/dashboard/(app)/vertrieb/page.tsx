'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  listCustomers,
  listDeals,
  listOpenActivities,
} from '@/lib/firestore';
import type { Customer, Deal } from '@/lib/types';
import { isOpenStage } from '@/lib/sales';
import { formatEUR, tsToDate, tsToMillis } from '@/lib/utils';
import PipelineBoard from '@/components/vertrieb/PipelineBoard';
import DealFormModal from '@/components/vertrieb/DealFormModal';

export default function VertriebPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [overdueDealIds, setOverdueDealIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
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
      .catch((err) => {
        console.error(err);
        setError(`Deals konnten nicht geladen werden: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const customerMap = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers],
  );

  const filteredDeals = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return deals;
    return deals.filter((d) => {
      const c = customerMap.get(d.customerId);
      return [
        d.title,
        c?.company,
        c?.firstName,
        c?.lastName,
        c?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [deals, search, customerMap]);

  const openValue = useMemo(
    () =>
      deals
        .filter((d) => isOpenStage(d.stage))
        .reduce((acc, d) => acc + (d.value ?? 0), 0),
    [deals],
  );

  // Letzter Kontakt = updatedAt des Deals (Aktivitäten aktualisieren ihn nicht
  // direkt, aber Stufenwechsel/Bearbeitungen schon). Defensiv gegen Docs
  // ohne aufgelösten serverTimestamp().
  const lastContact = useMemo(() => {
    const m = new Map<string, Date>();
    deals.forEach((d) => {
      const date = tsToDate(d.updatedAt) ?? tsToDate(d.createdAt);
      if (date) m.set(d.id, date);
    });
    return m;
  }, [deals]);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Vertrieb</h1>
          <p className="mt-1 text-sm text-gray-500">
            Offene Pipeline:{' '}
            <span className="font-medium text-gray-900">
              {formatEUR(openValue)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/vertrieb/deals" className="btn-secondary">
            Liste
          </Link>
          <Link href="/dashboard/vertrieb/vorlagen" className="btn-secondary">
            Vorlagen
          </Link>
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            + Neuer Deal
          </button>
        </div>
      </header>

      <div className="mb-4 max-w-md">
        <input
          type="search"
          placeholder="Deals durchsuchen…"
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
        <div className="card text-sm text-gray-500">Lädt Pipeline…</div>
      ) : (
        <PipelineBoard
          deals={filteredDeals}
          customers={customerMap}
          overdueDealIds={overdueDealIds}
          lastContact={lastContact}
          onChange={load}
        />
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
