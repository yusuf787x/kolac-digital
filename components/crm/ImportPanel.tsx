'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { authedFetch } from '@/lib/api-client';
import { LIFECYCLE_BADGES, LIFECYCLE_LABELS } from '@/lib/crm';
import type { CustomerLifecycle } from '@/lib/types';

interface Candidate {
  key: string;
  kinds: ('seo' | 'outreach' | 'termin')[];
  company: string;
  name: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  lifecycle: CustomerLifecycle;
  source: string;
  facts: string[];
  lastAt: number;
  suggested: boolean;
}

const KIND_LABEL = { seo: 'SEO-Check', outreach: 'Outreach', termin: 'Termin' } as const;

type Group = { key: string; title: string; hint: string; test: (c: Candidate) => boolean };

const GROUPS: Group[] = [
  { key: 'warm', title: 'Echter Kontakt', hint: 'Freigeschaltete SEO-Checks und Outreach mit Antwort', test: (c) => c.suggested },
  { key: 'termin', title: 'Aus Terminen', hint: 'Gäste aus deinem Kalender, bitte prüfen (können auch private Termine sein)', test: (c) => !c.suggested && c.kinds.includes('termin') },
  { key: 'seo', title: 'SEO-Check ohne Kontaktdaten', hint: 'Nur die Website ist bekannt', test: (c) => !c.suggested && !c.kinds.includes('termin') && c.kinds.includes('seo') },
  { key: 'outreach', title: 'Angeschrieben, keine Antwort', hint: 'Bleiben sonst nur im Outreach', test: (c) => !c.suggested && !c.kinds.includes('termin') && !c.kinds.includes('seo') },
];

/** Einmalige Übernahme: Kontakte aus SEO-Checks, Outreach und Terminen ohne Akte. */
export default function ImportPanel({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [existing, setExisting] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await authedFetch('/api/crm/import');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Vorschau fehlgeschlagen');
      const list = (data.candidates ?? []) as Candidate[];
      setCandidates(list);
      setExisting(data.existingMatches ?? 0);
      setSelected(new Set(list.filter((c) => c.suggested).map((c) => c.key)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(
    () => GROUPS.map((g) => ({ ...g, items: (candidates ?? []).filter(g.test) })).filter((g) => g.items.length > 0),
    [candidates],
  );

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleGroup = (items: Candidate[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      items.forEach((c) => (on ? next.add(c.key) : next.delete(c.key)));
      return next;
    });

  const run = async () => {
    if (selected.size === 0) return;
    setRunning(true);
    setError(null);
    try {
      const res = await authedFetch('/api/crm/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Übernahme fehlgeschlagen');
      setMessage(`✓ ${data.created} Akte${data.created === 1 ? '' : 'n'} angelegt${data.skipped ? `, ${data.skipped} gab es schon` : ''}.`);
      setCandidates(null);
      onImported();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="card mb-6 w-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Kontakte ohne Akte</h2>
          <p className="text-sm text-gray-500">
            SEO-Checks und Outreach-Antworten werden automatisch zu Akten. Hier bleiben Termin-Gäste und Outreach ohne Antwort: Häkchen setzen, dann Akten anlegen. Es wird nichts verschickt.
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-gray-900">
          Schließen
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Suche Kontakte…</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
      {message && <p className="text-sm text-green-800">{message}</p>}

      {candidates && candidates.length === 0 && !loading && (
        <p className="text-sm text-gray-500">Alle Kontakte haben schon eine Akte{existing ? ` (${existing} Treffer zugeordnet)` : ''}.</p>
      )}

      {grouped.map((g) => {
        const allOn = g.items.every((c) => selected.has(c.key));
        return (
          <details key={g.key} className="mt-3 rounded-lg border border-gray-200" open={g.key === 'warm' || g.key === 'termin'}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
              <span className="text-sm font-medium text-gray-900">
                {g.title} <span className="text-gray-400 font-normal">({g.items.length})</span>
                <span className="block text-xs font-normal text-gray-500">{g.hint}</span>
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  toggleGroup(g.items, !allOn);
                }}
                className="shrink-0 text-xs text-brand-blue hover:underline"
              >
                {allOn ? 'Keine' : 'Alle'} auswählen
              </button>
            </summary>
            <ul className="divide-y divide-gray-100 border-t border-gray-100 max-h-96 overflow-y-auto">
              {g.items.map((c) => (
                <li key={c.key}>
                  <label className="flex items-start gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" className="mt-1" checked={selected.has(c.key)} onChange={() => toggle(c.key)} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{c.company || c.name || c.website || c.email}</span>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${LIFECYCLE_BADGES[c.lifecycle]}`}>{LIFECYCLE_LABELS[c.lifecycle]}</span>
                        {c.kinds.map((k) => (
                          <span key={k} className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {KIND_LABEL[k]}
                          </span>
                        ))}
                      </span>
                      <span className="block text-xs text-gray-500 truncate">
                        {[c.name && c.name !== c.company ? c.name : '', c.email, c.phone, c.website, c.city].filter(Boolean).join(' · ') || '—'}
                      </span>
                      {c.facts.slice(0, 3).map((f, i) => (
                        <span key={i} className="block text-xs text-gray-600">
                          {f}
                        </span>
                      ))}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </details>
        );
      })}

      {candidates && candidates.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={run} disabled={running || selected.size === 0} className="btn-primary">
            {running ? 'Lege Akten an…' : `${selected.size} Akte${selected.size === 1 ? '' : 'n'} anlegen`}
          </button>
          {existing > 0 && <span className="text-xs text-gray-500">{existing} Treffer gehören schon zu bestehenden Akten und tauchen dort im Verlauf auf.</span>}
        </div>
      )}
    </section>
  );
}
