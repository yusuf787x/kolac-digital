'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Modal from '@/components/ui/Modal';
import { authedFetch } from '@/lib/api-client';
import { db } from '@/lib/firebase';
import { listCustomers } from '@/lib/firestore';
import { createSeoClient, listSeoClients } from '@/lib/seo/client';
import { formatMonthDE } from '@/lib/seo/months';
import type { SeoClient, SeoReport } from '@/lib/seo/types';
import type { Customer } from '@/lib/types';

export default function SeoOverviewPage() {
  const router = useRouter();
  const [clients, setClients] = useState<SeoClient[]>([]);
  const [drafts, setDrafts] = useState<SeoReport[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [demoBusy, setDemoBusy] = useState<'create' | 'delete' | null>(null);
  const [confirmDemoDelete, setConfirmDemoDelete] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, cust, d] = await Promise.all([
        listSeoClients(),
        listCustomers(),
        getDocs(query(collection(db, 'seoReports'), where('status', '==', 'draft'))),
      ]);
      setClients(c.sort((a, b) => a.displayName.localeCompare(b.displayName, 'de')));
      setCustomers(cust);
      setDrafts(d.docs.map((x) => ({ id: x.id, ...x.data() }) as SeoReport).filter((r) => r.storagePath));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const demo = clients.find((c) => c.demo);
  const nameOf = (id: string) => clients.find((c) => c.customerId === id)?.displayName ?? id;

  const runDemo = async (action: 'create' | 'delete') => {
    setDemoBusy(action);
    setError(null);
    try {
      const res = await authedFetch('/api/seo/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Fehler');
      if (action === 'create') router.push(`/dashboard/seo/${body.customerId}`);
      else await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDemoBusy(null);
      setConfirmDemoDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">SEO-Kunden</h1>
          <p className="mt-1 text-sm text-gray-500">Monatsberichte, Maßnahmen und Kundenportal.</p>
        </div>
        <button className="btn-primary" onClick={() => setAdding(true)}>
          SEO-Kunde hinzufügen
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {drafts.length > 0 && (
        <section className="card border-amber-200 bg-amber-50/50">
          <h2 className="mb-3 font-semibold">Wartet auf deine Freigabe</h2>
          <ul className="space-y-2">
            {drafts
              .sort((a, b) => b.month.localeCompare(a.month))
              .map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="font-medium">{nameOf(r.customerId)}</span>, {formatMonthDE(r.month)}
                  </span>
                  <Link className="btn-secondary" href={`/dashboard/seo/${r.customerId}?tab=berichte&monat=${r.month}`}>
                    Prüfen und freigeben
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}

      {loading ? (
        <div className="card text-sm text-gray-500">Lädt…</div>
      ) : clients.length === 0 ? (
        <div className="card text-sm text-gray-600">
          Noch keine SEO-Kunden. Lege einen an oder probiere alles mit dem Testkunden aus.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {clients.map((c) => (
            <li key={c.id}>
              <Link href={`/dashboard/seo/${c.customerId}`} className="card block h-full hover:border-gray-300">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{c.displayName}</div>
                    <div className="truncate text-sm text-gray-500">{c.domain}</div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {c.demo && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700">Test</span>}
                    {!c.enabled && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">pausiert</span>}
                  </div>
                </div>
                <div className="mt-3 text-sm">
                  {c.lastFetchError ? (
                    <span className="text-red-700">Letzter Abruf fehlgeschlagen: {c.lastFetchError}</span>
                  ) : c.lastFetchMonth ? (
                    <span className="text-gray-600">Zahlen bis {formatMonthDE(c.lastFetchMonth)}</span>
                  ) : (
                    <span className="text-amber-700">Noch keine Zahlen abgerufen</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="card">
        <h2 className="font-semibold">Testkunde</h2>
        <p className="mt-1 mb-4 max-w-prose text-sm text-gray-600">
          Legt „Muster Motoren GmbH (Demo)“ mit 16 Monaten erzeugter Zahlen, Maßnahmen, zwei freigegebenen Berichten und einem
          Entwurf an. Damit kannst du Freigabe, Mails und das Portal mit deiner eigenen Adresse durchspielen. Es werden keine
          Google-APIs abgefragt.
        </p>
        {demo ? (
          <div className="flex flex-wrap gap-2">
            <Link className="btn-secondary" href={`/dashboard/seo/${demo.customerId}`}>
              Testkunde öffnen
            </Link>
            <button className="btn-secondary text-red-700" disabled={!!demoBusy} onClick={() => setConfirmDemoDelete(true)}>
              Testkunde löschen
            </button>
          </div>
        ) : (
          <button className="btn-secondary" disabled={!!demoBusy} onClick={() => runDemo('create')}>
            {demoBusy === 'create' ? 'Wird angelegt, dauert etwa 30 Sekunden…' : 'Testkunde anlegen'}
          </button>
        )}
      </section>

      <Modal open={confirmDemoDelete} onClose={() => setConfirmDemoDelete(false)} title="Testkunde löschen?">
        <p className="text-sm text-gray-600">
          Löscht den Testkunden mit allen Zahlen, Berichten, Maßnahmen und Portal-Zugängen. Echte Kunden sind nicht betroffen.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setConfirmDemoDelete(false)}>
            Abbrechen
          </button>
          <button className="btn-primary bg-red-600 hover:bg-red-700" disabled={!!demoBusy} onClick={() => runDemo('delete')}>
            {demoBusy === 'delete' ? 'Löscht…' : 'Endgültig löschen'}
          </button>
        </div>
      </Modal>

      <AddClientModal
        open={adding}
        onClose={() => setAdding(false)}
        customers={customers.filter((c) => !clients.some((s) => s.customerId === c.id))}
        onCreated={(id) => router.push(`/dashboard/seo/${id}?tab=daten`)}
      />
    </div>
  );
}

function AddClientModal({
  open,
  onClose,
  customers,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  onCreated: (id: string) => void;
}) {
  const [customerId, setCustomerId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [domain, setDomain] = useState('');
  const [brand, setBrand] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanDomain = domain.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !cleanDomain) return;
    setSaving(true);
    setError(null);
    try {
      await createSeoClient(customerId, {
        displayName: displayName.trim() || customers.find((c) => c.id === customerId)?.company || cleanDomain,
        domain: cleanDomain,
        gscProperty: `sc-domain:${cleanDomain}`,
        brandTerms: brand
          .split(',')
          .map((b) => b.trim())
          .filter(Boolean),
      });
      onCreated(customerId);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="SEO-Kunde hinzufügen">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="seo-customer">
            Kunde
          </label>
          <select
            id="seo-customer"
            className="input text-base sm:text-sm"
            value={customerId}
            required
            onChange={(e) => {
              setCustomerId(e.target.value);
              const c = customers.find((x) => x.id === e.target.value);
              if (c && !displayName) setDisplayName(c.company);
            }}
          >
            <option value="">Bitte wählen</option>
            {customers
              .sort((a, b) => a.company.localeCompare(b.company, 'de'))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company}
                </option>
              ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">Fehlt der Kunde? Erst unter Kunden anlegen.</p>
        </div>
        <div>
          <label className="label" htmlFor="seo-name">
            Name im Portal
          </label>
          <input id="seo-name" className="input text-base sm:text-sm" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="seo-domain">
            Domain
          </label>
          <input
            id="seo-domain"
            className="input text-base sm:text-sm"
            placeholder="motorenfachmann.de"
            required
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          {cleanDomain && <p className="mt-1 text-xs text-gray-500">Search-Console-Property: sc-domain:{cleanDomain} (später änderbar)</p>}
        </div>
        <div>
          <label className="label" htmlFor="seo-brand">
            Marken-Begriffe
          </label>
          <input
            id="seo-brand"
            className="input text-base sm:text-sm"
            placeholder="motorenfachmann, motoren fachmann"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-500">Mit Komma trennen. Leerzeichen und Umlaute werden automatisch angeglichen.</p>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className="btn-primary" disabled={saving || !customerId || !cleanDomain}>
            {saving ? 'Speichert…' : 'Anlegen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
