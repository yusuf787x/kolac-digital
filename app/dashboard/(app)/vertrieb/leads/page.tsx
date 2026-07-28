'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listLeads } from '@/lib/firestore';
import type { Lead, LeadStatus } from '@/lib/types';
import { LEAD_STATUS_LABELS } from '@/lib/types';
import NewLeadModal from '@/components/vertrieb/NewLeadModal';

const STATUS_BADGES: Record<LeadStatus, string> = {
  kalt: 'bg-gray-100 text-gray-700',
  kontaktiert: 'bg-blue-100 text-blue-800',
  interessiert: 'bg-emerald-100 text-emerald-800',
  termin_vereinbart: 'bg-purple-100 text-purple-800',
  kein_interesse: 'bg-red-100 text-red-800',
  nicht_erreicht: 'bg-amber-100 text-amber-800',
  gewonnen: 'bg-green-100 text-green-800',
  verloren: 'bg-red-100 text-red-800',
};

type Filter = 'alle' | LeadStatus | 'rueckruf_faellig';

export default function LeadListePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('alle');
  const [categoryFilter, setCategoryFilter] = useState<string>('alle');
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(() => {
    listLeads()
      .then(setLeads)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    leads.forEach((l) => l.category && s.add(l.category));
    return Array.from(s).sort();
  }, [leads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    return leads.filter((l) => {
      if (filter === 'rueckruf_faellig') {
        if (!l.nextCallAt || l.nextCallAt.toMillis() > now) return false;
      } else if (filter !== 'alle' && l.status !== filter) {
        return false;
      }
      if (categoryFilter !== 'alle' && l.category !== categoryFilter)
        return false;
      if (!q) return true;
      const blob = [
        l.company,
        l.contactName,
        l.phone,
        l.email,
        l.city,
        l.category,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [leads, search, filter, categoryFilter]);

  const dueCallbacks = useMemo(
    () =>
      leads.filter(
        (l) => l.nextCallAt && l.nextCallAt.toMillis() <= Date.now(),
      ).length,
    [leads],
  );

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Leads</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sales-Pipeline vor der Kundenanlage.{' '}
            {dueCallbacks > 0 && (
              <span className="text-amber-700 font-medium">
                {dueCallbacks} Rückruf
                {dueCallbacks === 1 ? '' : 'e'} fällig.
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/vertrieb/leads/import" className="btn-secondary">
            CSV-Import
          </Link>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="btn-primary"
          >
            + Neuer Lead
          </button>
        </div>
      </header>

      <div className="card mb-4 flex flex-wrap items-center gap-3">
        <input
          className="input flex-1 min-w-[200px]"
          placeholder="Suche: Firma, Ansprechpartner, Ort, Telefon…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input sm:w-48"
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
        >
          <option value="alle">Alle Status</option>
          <option value="rueckruf_faellig">Rückrufe fällig</option>
          {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          className="input sm:w-44"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="alle">Alle Branchen</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="card text-sm text-gray-500">Lädt Leads…</div>
      ) : filtered.length === 0 ? (
        <div className="card text-sm text-gray-500">
          {leads.length === 0
            ? 'Noch keine Leads. Nutze „+ Neuer Lead" oder den CSV-Import.'
            : 'Keine Treffer für deinen Filter.'}
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Firma</th>
                <th className="text-left px-4 py-3">Ansprechpartner</th>
                <th className="text-left px-4 py-3">Kontakt</th>
                <th className="text-left px-4 py-3">Ort</th>
                <th className="text-left px-4 py-3">Branche</th>
                <th className="text-left px-4 py-3">Rückruf</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((l) => {
                const overdue =
                  l.nextCallAt && l.nextCallAt.toMillis() < Date.now();
                const today =
                  l.nextCallAt &&
                  !overdue &&
                  new Date(l.nextCallAt.toMillis()).toDateString() ===
                    new Date().toDateString();
                return (
                  <tr
                    key={l.id}
                    className={overdue ? 'bg-amber-50/40' : 'hover:bg-gray-50'}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link
                        href={`/dashboard/vertrieb/leads/${l.id}`}
                        className="hover:underline"
                      >
                        {l.company}
                      </Link>
                      {l.website && (
                        <p className="text-xs text-gray-400 truncate max-w-[220px]">
                          {l.website}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {l.contactName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {l.phone && (
                        <a
                          href={`tel:${l.phone}`}
                          className="block text-brand-blue hover:underline"
                        >
                          {l.phone}
                        </a>
                      )}
                      {l.email && (
                        <a
                          href={`mailto:${l.email}`}
                          className="block text-xs text-gray-500 truncate max-w-[200px]"
                        >
                          {l.email}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {l.city ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {l.category ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {l.nextCallAt ? (
                        <span
                          className={`text-xs font-medium ${
                            overdue
                              ? 'text-amber-700'
                              : today
                                ? 'text-blue-700'
                                : 'text-gray-600'
                          }`}
                        >
                          {new Date(l.nextCallAt.toMillis()).toLocaleDateString(
                            'de-DE',
                          )}
                          {overdue && ' (überfällig)'}
                          {today && !overdue && ' (heute)'}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_BADGES[l.status]}`}
                      >
                        {LEAD_STATUS_LABELS[l.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <NewLeadModal
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}
