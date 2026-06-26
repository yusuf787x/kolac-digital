'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  listGocardlessEvents,
  type GocardlessEventDoc,
} from '@/lib/firestore';
import { tsToDate } from '@/lib/utils';

type FilterStatus = 'all' | 'ok' | 'ignored' | 'error' | 'pending';

const FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'ok', label: 'Verarbeitet' },
  { value: 'ignored', label: 'Ignoriert' },
  { value: 'error', label: 'Fehler' },
  { value: 'pending', label: 'Noch nicht ausgewertet' },
];

const STATUS_LABEL: Record<string, string> = {
  ok: 'Verarbeitet',
  ignored: 'Ignoriert',
  error: 'Fehler',
};

const STATUS_BADGE: Record<string, string> = {
  ok: 'bg-green-100 text-green-700',
  ignored: 'bg-gray-100 text-gray-600',
  error: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
};

export default function GocardlessLogPage() {
  const [events, setEvents] = useState<GocardlessEventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    listGocardlessEvents(300)
      .then(setEvents)
      .catch((err) => {
        console.error(err);
        setError('Events konnten nicht geladen werden.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      const status = e.processStatus ?? 'pending';
      if (filter !== 'all' && status !== filter) return false;
      if (!q) return true;
      const blob = [
        e.id,
        e.resource_type,
        e.action,
        e.processNote ?? '',
        e.details?.description ?? '',
        Object.values(e.links ?? {}).join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [events, filter, search]);

  const stats = useMemo(() => {
    let ok = 0;
    let ignored = 0;
    let err = 0;
    let pending = 0;
    for (const e of events) {
      const s = e.processStatus ?? 'pending';
      if (s === 'ok') ok++;
      else if (s === 'ignored') ignored++;
      else if (s === 'error') err++;
      else pending++;
    }
    return { ok, ignored, err, pending, total: events.length };
  }, [events]);

  return (
    <div>
      <header className="mb-6">
        <Link
          href="/dashboard/rechnungen"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu Rechnungen
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">
          GoCardless Webhook-Log
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {stats.total} Events · {stats.ok} verarbeitet · {stats.ignored}{' '}
          ignoriert · {stats.err} Fehler
          {stats.pending > 0 && ` · ${stats.pending} ausstehend`}
        </p>
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
          placeholder="Suche nach Event-ID, Aktion, Note…"
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
        <div className="card text-sm text-gray-500">Lädt Events…</div>
      ) : filtered.length === 0 ? (
        <div className="card text-sm text-gray-500">
          {events.length === 0
            ? 'Noch keine GoCardless-Events empfangen. Sobald ein Webhook ankommt, taucht hier alles auf.'
            : 'Keine Events für diese Filter.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: GocardlessEventDoc }) {
  const [expanded, setExpanded] = useState(false);
  const status = event.processStatus ?? 'pending';
  const action = `${event.resource_type}.${event.action}`;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono font-semibold text-gray-900">
              {action}
            </span>
            <span
              className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${STATUS_BADGE[status]}`}
            >
              {STATUS_LABEL[status] ?? 'Noch nicht ausgewertet'}
            </span>
          </div>
          {event.processNote && (
            <p className="mt-1 text-sm text-gray-700">{event.processNote}</p>
          )}
          {event.details?.description && (
            <p className="mt-1 text-xs text-gray-500">
              {event.details.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
            <span title="Empfangen">
              📥 {formatDateTimeDE(tsToDate(event.receivedAt))}
            </span>
            {event.processedAt && (
              <span title="Verarbeitet">
                ⚙️ {formatDateTimeDE(tsToDate(event.processedAt))}
              </span>
            )}
            <span className="font-mono">{event.id}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {event.invoiceId && (
            <Link
              href={`/dashboard/rechnungen/${event.invoiceId}`}
              className="text-xs text-brand-blue hover:underline font-medium"
            >
              Rechnung →
            </Link>
          )}
          {event.customerId && (
            <Link
              href={`/dashboard/kunden/${event.customerId}`}
              className="text-xs text-brand-blue hover:underline font-medium"
            >
              Kunde →
            </Link>
          )}
        </div>
      </div>

      {(event.links && Object.keys(event.links).length > 0) ||
      event.details?.cause ? (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs text-gray-500 hover:text-gray-900"
        >
          {expanded ? '▾ Details verbergen' : '▸ Details anzeigen'}
        </button>
      ) : null}

      {expanded && (
        <div className="mt-2 px-3 py-2 rounded-lg bg-gray-50 text-xs space-y-1.5">
          {event.details?.cause && (
            <div>
              <span className="text-gray-500">Cause:</span>{' '}
              <span className="font-mono">{event.details.cause}</span>
            </div>
          )}
          {event.details?.reason_code && (
            <div>
              <span className="text-gray-500">Reason:</span>{' '}
              <span className="font-mono">{event.details.reason_code}</span>
            </div>
          )}
          {event.links && Object.entries(event.links).length > 0 && (
            <div>
              <span className="text-gray-500">Links:</span>
              <ul className="mt-1 pl-3">
                {Object.entries(event.links).map(([k, v]) => (
                  <li key={k} className="font-mono">
                    <span className="text-gray-500">{k}</span> = {v}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatDateTimeDE(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
