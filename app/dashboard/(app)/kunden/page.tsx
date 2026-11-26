'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { listCustomers, listInvoices } from '@/lib/firestore';
import type { Contact, Customer, CustomerLifecycle, Invoice } from '@/lib/types';
import {
  customerMoney,
  customerName,
  domainOf,
  LIFECYCLE_BADGES,
  LIFECYCLE_LABELS,
  lifecycleOf,
  listAllContacts,
  personName,
} from '@/lib/crm';
import { formatDateDE, formatEUR, tsToMillis } from '@/lib/utils';
import SensitiveValue from '@/components/ui/SensitiveValue';
import ImportPanel from '@/components/crm/ImportPanel';

export default function KundenPage() {
  return (
    <Suspense fallback={<div className="card text-sm text-gray-500">Lädt…</div>}>
      <KundenInner />
    </Suspense>
  );
}

type Filter = 'alle' | 'offen' | CustomerLifecycle;
type Sort = 'schritt' | 'name' | 'umsatz' | 'neu';

const FILTERS: { key: Filter; label: string; match: (l: CustomerLifecycle) => boolean }[] = [
  { key: 'alle', label: 'Alle', match: () => true },
  { key: 'offen', label: 'Im Vertrieb', match: (l) => l === 'lead' || l === 'interessent' },
  { key: 'lead', label: 'Leads', match: (l) => l === 'lead' },
  { key: 'interessent', label: 'Interessenten', match: (l) => l === 'interessent' },
  { key: 'kunde', label: 'Kunden', match: (l) => l === 'kunde' },
  { key: 'verloren', label: 'Verloren & ehemalig', match: (l) => l === 'verloren' || l === 'ehemalig' },
];

function KundenInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const createdName = searchParams.get('created');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('alle');
  const [sort, setSort] = useState<Sort>('name');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(() => {
    Promise.all([listCustomers(), listAllContacts().catch(() => [] as Contact[]), listInvoices()])
      .then(([c, k, i]) => {
        setCustomers(c);
        setContacts(k);
        setInvoices(i);
      })
      .catch((err) => {
        console.error(err);
        setError(`Kontakte konnten nicht geladen werden: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    if (!createdName) return;
    setSuccessBanner(`✓ "${createdName}" wurde angelegt.`);
    router.replace('/dashboard/kunden');
    const t = setTimeout(() => setSuccessBanner(null), 4000);
    return () => clearTimeout(t);
  }, [createdName, router]);

  const contactsBy = useMemo(() => {
    const m = new Map<string, Contact[]>();
    contacts.forEach((c) => m.set(c.customerId, [...(m.get(c.customerId) ?? []), c]));
    return m;
  }, [contacts]);

  const revenueBy = useMemo(() => {
    const byCustomer = new Map<string, Invoice[]>();
    invoices.forEach((inv) => byCustomer.set(inv.customerId, [...(byCustomer.get(inv.customerId) ?? []), inv]));
    const m = new Map<string, number>();
    byCustomer.forEach((list, id) => m.set(id, customerMoney(list).earnedNet));
    return m;
  }, [invoices]);

  const counts = useMemo(() => {
    const out: Record<Filter, number> = { alle: 0, offen: 0, lead: 0, interessent: 0, kunde: 0, verloren: 0, ehemalig: 0 };
    customers.forEach((c) => FILTERS.forEach((f) => f.match(lifecycleOf(c)) && out[f.key]++));
    return out;
  }, [customers]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const f = FILTERS.find((x) => x.key === filter) ?? FILTERS[0];
    const list = customers.filter((c) => {
      if (!f.match(lifecycleOf(c))) return false;
      if (!q) return true;
      const extra = contactsBy.get(c.id) ?? [];
      return [
        c.company,
        c.firstName,
        c.lastName,
        c.email,
        c.phone,
        c.city,
        c.zip,
        c.street,
        c.website,
        c.source,
        c.notes,
        c.nextStep,
        c.taxId,
        LIFECYCLE_LABELS[lifecycleOf(c)],
        ...extra.flatMap((k) => [k.firstName, k.lastName, k.email, k.phone, k.role]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
    const nextAt = (c: Customer) => (c.nextStepAt ? tsToMillis(c.nextStepAt) : Number.MAX_SAFE_INTEGER);
    return list.sort((a, b) => {
      if (sort === 'schritt') return nextAt(a) - nextAt(b);
      if (sort === 'umsatz') return (revenueBy.get(b.id) ?? 0) - (revenueBy.get(a.id) ?? 0);
      if (sort === 'neu') return tsToMillis(b.createdAt) - tsToMillis(a.createdAt);
      return customerName(a).localeCompare(customerName(b), 'de');
    });
  }, [customers, contactsBy, revenueBy, search, filter, sort]);

  const today = new Date().setHours(0, 0, 0, 0);

  return (
    <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Kontakte & Kunden</h1>
          <p className="mt-1 text-sm text-gray-500">
            {counts.kunde} Kunden · {counts.offen} im Vertrieb · {customers.length} Akten
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setImportOpen(true)} className="btn-secondary">
            Kontakte ohne Akte
          </button>
          <Link href="/dashboard/kunden/neu" className="btn-primary">
            + Neuer Kontakt
          </Link>
        </div>
      </header>

      <div className="mb-3">
        <input
          type="search"
          placeholder="Suchen: Firma, Person, Mail, Telefon, Website, Ort, Notiz …"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input text-base py-2.5"
          aria-label="Kontakte durchsuchen"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              filter === f.key ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {f.label} <span className={filter === f.key ? 'text-gray-300' : 'text-gray-400'}>{counts[f.key]}</span>
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm text-gray-500">
          Sortieren
          <select className="input w-auto py-1.5 text-sm" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="name">Name</option>
            <option value="schritt">Nächster Schritt</option>
            <option value="umsatz">Umsatz</option>
            <option value="neu">Neueste</option>
          </select>
        </label>
      </div>

      {importOpen && <ImportPanel onClose={() => setImportOpen(false)} onImported={load} />}

      {successBanner && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-900">{successBanner}</div>
      )}
      {error && <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="card text-sm text-gray-500">Lädt Kontakte…</div>
      ) : rows.length === 0 ? (
        <div className="card text-sm text-gray-500">
          {customers.length === 0
            ? 'Noch keine Akten. Leg einen Kontakt an oder prüf oben die Kontakte ohne Akte.'
            : search
              ? `Nichts gefunden für „${search}“.`
              : 'In diesem Filter ist gerade niemand.'}
        </div>
      ) : (
        <div className="card p-0 table-wrap">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wider sticky top-0">
              <tr>
                <th className="text-left px-4 py-3">Firma</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Nächster Schritt</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Quelle</th>
                <th className="text-right px-4 py-3">Umsatz</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((c) => {
                const lc = lifecycleOf(c);
                const extra = contactsBy.get(c.id) ?? [];
                const person = personName(c) || (extra[0] ? personName(extra[0]) : '');
                const due = c.nextStepAt ? tsToMillis(c.nextStepAt) : 0;
                const revenue = revenueBy.get(c.id) ?? 0;
                return (
                  <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/dashboard/kunden/${c.id}`)}>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/kunden/${c.id}`} className="font-medium text-gray-900 hover:underline" onClick={(e) => e.stopPropagation()}>
                        {customerName(c)}
                      </Link>
                      <p className="text-xs text-gray-500 truncate max-w-[18rem]">
                        {[person, extra.length > (personName(c) ? 0 : 1) ? `+${extra.length - (personName(c) ? 0 : 1)} weitere` : '', domainOf(c) || c.city]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${LIFECYCLE_BADGES[lc]}`}>{LIFECYCLE_LABELS[lc]}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {c.nextStep ? (
                        <>
                          <p className="text-gray-800 truncate max-w-[16rem]">{c.nextStep}</p>
                          {due > 0 && (
                            <p className={`text-xs ${due < today ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                              {due < today ? 'überfällig seit ' : 'bis '}
                              {formatDateDE(new Date(due))}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{c.source || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                      {revenue > 0 ? <SensitiveValue>{formatEUR(revenue)}</SensitiveValue> : <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
