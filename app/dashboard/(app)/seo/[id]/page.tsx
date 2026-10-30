'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import AccessTab from '@/components/seo/admin/AccessTab';
import ActivitiesTab from '@/components/seo/admin/ActivitiesTab';
import DataTab from '@/components/seo/admin/DataTab';
import ReportsTab from '@/components/seo/admin/ReportsTab';
import SettingsTab from '@/components/seo/admin/SettingsTab';
import { getSeoClient } from '@/lib/seo/client';
import { isMonthKey } from '@/lib/seo/months';
import type { SeoClient } from '@/lib/seo/types';

const TABS = [
  ['berichte', 'Berichte'],
  ['massnahmen', 'Maßnahmen'],
  ['zugang', 'Portal-Zugang'],
  ['daten', 'Daten'],
  ['einstellungen', 'Einstellungen'],
] as const;
type Tab = (typeof TABS)[number][0];

export default function SeoClientPage() {
  return (
    <Suspense fallback={<div className="card text-sm text-gray-500">Lädt…</div>}>
      <SeoClientInner />
    </Suspense>
  );
}

function SeoClientInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const tabParam = search.get('tab');
  const tab: Tab = TABS.some(([t]) => t === tabParam) ? (tabParam as Tab) : 'berichte';
  const month = search.get('monat');
  const [client, setClient] = useState<SeoClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setClient(await getSeoClient(id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="card text-sm text-gray-500">Lädt…</div>;
  if (error || !client) {
    return <div className="card text-sm text-red-700">{error ?? 'SEO-Kunde nicht gefunden.'}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/seo" className="text-sm text-gray-500 hover:text-gray-900">
          ← SEO-Kunden
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-semibold text-gray-900">{client.displayName}</h1>
            <p className="text-sm text-gray-500">
              {client.domain}
              {client.demo && <span className="ml-2 rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700">Testkunde</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn-secondary" href={`/dashboard/seo/${client.customerId}/vorschau`} target="_blank">
              Portal-Vorschau
            </Link>
            <Link className="btn-secondary" href={`/dashboard/kunden/${client.customerId}`}>
              Kundenakte
            </Link>
          </div>
        </div>
      </div>

      <nav aria-label="Bereiche" className="-mx-4 overflow-x-auto border-b border-gray-200 px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-1">
          {TABS.map(([t, label]) => (
            <li key={t}>
              <button
                type="button"
                onClick={() => router.replace(`/dashboard/seo/${id}?tab=${t}`)}
                aria-current={tab === t ? 'page' : undefined}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${
                  tab === t ? 'border-brand-blue text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {tab === 'berichte' && <ReportsTab client={client} initialMonth={isMonthKey(month) ? month : null} />}
      {tab === 'massnahmen' && <ActivitiesTab client={client} onClientChange={load} />}
      {tab === 'zugang' && <AccessTab client={client} />}
      {tab === 'daten' && <DataTab client={client} onClientChange={load} />}
      {tab === 'einstellungen' && <SettingsTab key={client.updatedAt?.toMillis()} client={client} onSaved={load} />}
    </div>
  );
}
