'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import SeoSectionTabs from '@/components/seo/admin/SeoSectionTabs';
import { db } from '@/lib/firebase';
import { listSeoClients, updateActivity } from '@/lib/seo/client';
import { formatIsoDateDE, todayIso } from '@/lib/seo/months';
import type { SeoActivity, SeoClient } from '@/lib/seo/types';

const RANGES = [
  ['alle', 'Alle'],
  ['ueberfaellig', 'Überfällig'],
  ['7', 'Nächste 7 Tage'],
  ['30', 'Nächste 30 Tage'],
  ['ohne', 'Ohne Termin'],
] as const;
type Range = (typeof RANGES)[number][0];

type Group = 'overdue' | 'soon' | 'week' | 'later' | 'none';
const GROUP_LABELS: Record<Group, string> = {
  overdue: 'Überfällig',
  soon: 'Heute und morgen',
  week: 'In den nächsten 7 Tagen',
  later: 'Später',
  none: 'Ohne Termin (keine Erinnerung)',
};
const GROUP_ORDER: Group[] = ['overdue', 'soon', 'week', 'later', 'none'];

const DAY_MS = 86_400_000;
const daysUntil = (today: string, iso: string) =>
  Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / DAY_MS);

function groupOf(daysLeft: number | null): Group {
  if (daysLeft === null) return 'none';
  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 1) return 'soon';
  if (daysLeft <= 7) return 'week';
  return 'later';
}

function inRange(daysLeft: number | null, range: Range): boolean {
  switch (range) {
    case 'ueberfaellig':
      return daysLeft !== null && daysLeft < 0;
    case '7':
      return daysLeft !== null && daysLeft <= 7;
    case '30':
      return daysLeft !== null && daysLeft <= 30;
    case 'ohne':
      return daysLeft === null;
    default:
      return true;
  }
}

function dueText(daysLeft: number | null): string {
  if (daysLeft === null) return 'ohne Termin';
  if (daysLeft < -1) return `seit ${-daysLeft} Tagen überfällig`;
  if (daysLeft === -1) return 'seit gestern überfällig';
  if (daysLeft === 0) return 'heute fällig';
  if (daysLeft === 1) return 'morgen fällig';
  return `in ${daysLeft} Tagen`;
}

interface Task extends SeoActivity {
  daysLeft: number | null;
}

/** Ein abgehakter Punkt bleibt sichtbar, bis die Seite neu lädt, damit er sich zurückholen lässt. */
type Undo = { status: 'planned'; date: string; dueDate: string | null };

export default function SeoTasksPage() {
  return (
    <Suspense fallback={<div className="card text-sm text-gray-500">Lädt…</div>}>
      <SeoTasksInner />
    </Suspense>
  );
}

function SeoTasksInner() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const customerFilter = search.get('kunde') ?? '';
  const rangeParam = search.get('zeitraum');
  const range: Range = RANGES.some(([r]) => r === rangeParam) ? (rangeParam as Range) : 'alle';

  const [clients, setClients] = useState<SeoClient[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, Undo>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = todayIso();
      const [c, snap] = await Promise.all([
        listSeoClients(),
        getDocs(query(collection(db, 'seoActivities'), where('status', '==', 'planned'))),
      ]);
      const real = c.filter((x) => !x.demo);
      const ids = new Set(real.map((x) => x.customerId));
      setClients(real.sort((a, b) => a.displayName.localeCompare(b.displayName, 'de')));
      setTasks(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as SeoActivity)
          .filter((a) => ids.has(a.customerId))
          .map((a) => ({ ...a, daysLeft: a.dueDate ? daysUntil(today, a.dueDate) : null }))
          .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setParam = (key: 'kunde' | 'zeitraum', value: string) => {
    const next = new URLSearchParams(search.toString());
    if (!value || value === 'alle') next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const clientById = useMemo(() => new Map(clients.map((c) => [c.customerId, c])), [clients]);
  const forCustomer = useMemo(
    () => tasks.filter((t) => !customerFilter || t.customerId === customerFilter),
    [tasks, customerFilter],
  );
  const counts = useMemo(
    () => Object.fromEntries(RANGES.map(([r]) => [r, forCustomer.filter((t) => inRange(t.daysLeft, r)).length])) as Record<Range, number>,
    [forCustomer],
  );
  const visible = forCustomer.filter((t) => inRange(t.daysLeft, range));
  const groups = GROUP_ORDER.map((g) => [g, visible.filter((t) => groupOf(t.daysLeft) === g)] as const).filter(
    ([, list]) => list.length > 0,
  );

  const markDone = async (t: Task) => {
    setBusy(t.id);
    setRowError(null);
    try {
      await updateActivity(t.id, { status: 'done', date: todayIso(), dueDate: null });
      setDone((d) => ({ ...d, [t.id]: { status: 'planned', date: t.date, dueDate: t.dueDate ?? null } }));
    } catch (err) {
      setRowError({ id: t.id, message: `Konnte nicht abgehakt werden: ${(err as Error).message}. Bitte noch einmal versuchen.` });
    } finally {
      setBusy(null);
    }
  };

  const undo = async (t: Task) => {
    const prev = done[t.id];
    if (!prev) return;
    setBusy(t.id);
    setRowError(null);
    try {
      await updateActivity(t.id, prev);
      setDone((d) => {
        const next = { ...d };
        delete next[t.id];
        return next;
      });
    } catch (err) {
      setRowError({ id: t.id, message: `Rückgängig hat nicht geklappt: ${(err as Error).message}. Bitte noch einmal versuchen.` });
    } finally {
      setBusy(null);
    }
  };

  const filtered = !!customerFilter || range !== 'alle';
  const openCount = forCustomer.filter((t) => !done[t.id]).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">SEO-Kunden</h1>
        <p className="mt-1 text-sm text-gray-500">Geplante Punkte aus den Kunden-Plänen, über alle Kunden.</p>
      </div>

      <SeoSectionTabs />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div role="group" aria-label="Zeitraum" className="inline-flex gap-1 rounded-lg bg-gray-100 p-1">
            {RANGES.map(([r, label]) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => setParam('zeitraum', r)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium pointer-coarse:py-2.5 ${
                  range === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                } ${r === 'ueberfaellig' && counts[r] > 0 && range !== r ? 'text-red-700' : ''}`}
              >
                {label}
                {!loading && <span className="ml-1.5 tabular-nums text-gray-400">{counts[r]}</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:w-64">
          <label className="label" htmlFor="tasks-customer">
            Kunde
          </label>
          <select
            id="tasks-customer"
            className="input text-base sm:text-sm"
            value={customerFilter}
            onChange={(e) => setParam('kunde', e.target.value)}
          >
            <option value="">Alle Kunden</option>
            {clients.map((c) => (
              <option key={c.customerId} value={c.customerId}>
                {c.displayName}
                {!c.enabled ? ' (pausiert)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="card border-red-200 bg-red-50 text-sm text-red-700">
          <p>Die Aufgaben konnten nicht geladen werden: {error}</p>
          <button type="button" className="btn-secondary mt-3" onClick={load}>
            Erneut laden
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Aufgaben werden geladen">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 w-40 rounded bg-gray-100" />
              <div className="mt-3 h-4 w-3/4 rounded bg-gray-100" />
              <div className="mt-2 h-3 w-1/3 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="card text-sm text-gray-600">
          {filtered ? (
            <>
              <p>Für diese Auswahl steht nichts an.</p>
              <button
                type="button"
                className="btn-secondary mt-3"
                onClick={() => router.replace(pathname, { scroll: false })}
              >
                Filter zurücksetzen
              </button>
            </>
          ) : (
            <p>
              Alles erledigt, in keinem Kunden-Plan steht ein offener Punkt. Neue Punkte legst du beim Kunden unter
              „Maßnahmen“ mit dem Status „Geplant“ an.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <p className="text-sm text-gray-500">
            <span className="tabular-nums">{openCount}</span> offen
            {customerFilter && clientById.get(customerFilter) ? ` bei ${clientById.get(customerFilter)!.displayName}` : ''}
          </p>
          {groups.map(([g, list]) => (
            <section key={g} aria-labelledby={`grp-${g}`}>
              <h2 id={`grp-${g}`} className={`mb-3 font-semibold ${g === 'overdue' ? 'text-red-700' : 'text-gray-900'}`}>
                {GROUP_LABELS[g]} <span className="font-normal tabular-nums text-gray-400">{list.length}</span>
              </h2>
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
                {list.map((t) => {
                  const client = clientById.get(t.customerId);
                  const isDone = !!done[t.id];
                  return (
                    <li key={t.id} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between ${isDone ? 'bg-emerald-50/50' : ''}`}>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                          <span className="font-semibold text-gray-900">{client?.displayName ?? t.customerId}</span>
                          {t.dueDate && (
                            <span className="whitespace-nowrap tabular-nums text-gray-500">bis {formatIsoDateDE(t.dueDate)}</span>
                          )}
                          <span
                            className={`whitespace-nowrap text-xs ${
                              isDone ? 'text-emerald-700' : g === 'overdue' ? 'font-medium text-red-700' : 'text-gray-500'
                            }`}
                          >
                            {isDone ? 'Umgesetzt' : dueText(t.daysLeft)}
                          </span>
                        </div>
                        <p className={`mt-1 ${isDone ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          {t.change.replace(/\*\*(.+?)\*\*/g, '$1')}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {t.area}
                          {t.goal ? ` · Ziel: ${t.goal}` : ''}
                          {' · '}
                          {t.published ? 'Kunde sieht den Punkt im Plan' : 'nur intern'}
                        </p>
                        {rowError?.id === t.id && <p className="mt-2 text-sm text-red-700">{rowError.message}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          href={`/dashboard/seo/${t.customerId}?tab=massnahmen`}
                          className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-900 pointer-coarse:py-2.5"
                        >
                          Öffnen
                        </Link>
                        {isDone ? (
                          <button type="button" className="btn-secondary" disabled={busy === t.id} onClick={() => undo(t)}>
                            {busy === t.id ? 'Holt zurück…' : 'Rückgängig'}
                          </button>
                        ) : (
                          <button type="button" className="btn-secondary" disabled={busy === t.id} onClick={() => markDone(t)}>
                            {busy === t.id ? 'Speichert…' : 'Umgesetzt'}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
