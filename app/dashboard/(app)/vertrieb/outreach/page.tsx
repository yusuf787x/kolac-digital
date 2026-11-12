'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import ReplyBox from '@/components/outreach/ReplyBox';
import { db } from '@/lib/firebase';
import {
  OUTREACH_DAILY_LIMIT,
  OUTREACH_FOLLOWUP_DAYS,
  OUTREACH_STATUS_BADGES,
  OUTREACH_STATUS_LABELS,
  instagramSearchUrl,
  instagramUrl,
  lintMessage,
  normalizeInstagram,
  type OutreachLead,
  type OutreachStatus,
} from '@/lib/outreach';

const VIEWS = [
  ['schreiben', 'Zu schreiben'],
  ['nachfassen', 'Nachfassen'],
  ['gesendet', 'Gesendet'],
  ['antworten', 'Antworten'],
  ['alle', 'Alle'],
] as const;
type View = (typeof VIEWS)[number][0];

const DAY_MS = 86_400_000;
const daysSince = (iso?: string) => (iso ? (Date.now() - Date.parse(iso)) / DAY_MS : 0);
const todayKey = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
const dayKey = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' }) : '');
const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('de-DE') : '');

function inView(l: OutreachLead, v: View): boolean {
  switch (v) {
    case 'schreiben':
      return l.status === 'neu' && !!l.dm;
    case 'nachfassen':
      return l.status === 'gesendet' && daysSince(l.sentAt) >= OUTREACH_FOLLOWUP_DAYS && !!l.followup;
    case 'gesendet':
      return l.status === 'gesendet' || l.status === 'nachgefasst';
    case 'antworten':
      return l.status === 'geantwortet' || l.status === 'termin' || l.status === 'kunde';
    default:
      return true;
  }
}

/** Mit Text und Instagram zuerst, dann nach Hebel. */
const rank = (l: OutreachLead) => (l.dm ? 100 : 0) + (l.instagram ? 20 : 0) + (l.scan?.priority ?? 0);

const EMPTY: Record<View, string> = {
  schreiben: 'Alle Betriebe mit Text sind angeschrieben. Für neue in Claude Code sagen: „Outreach: Branche, Stadt“.',
  nachfassen: `Gerade ist niemand dran. Nachgefasst wird einmal, ${OUTREACH_FOLLOWUP_DAYS} Tage nach der ersten Nachricht.`,
  gesendet: 'Noch nichts gesendet.',
  antworten: 'Noch keine Antworten. Antwortet jemand, hier auf „Geantwortet“ setzen und die Antwort Claude zeigen.',
  alle: 'Noch keine Betriebe. In Claude Code sagen: „Outreach: Kosmetikstudios Bielefeld“.',
};

export default function OutreachPage() {
  return (
    <Suspense fallback={<div className="card text-sm text-gray-500">Lädt…</div>}>
      <OutreachInner />
    </Suspense>
  );
}

function OutreachInner() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const viewParam = search.get('ansicht');
  const view: View = VIEWS.some(([v]) => v === viewParam) ? (viewParam as View) : 'schreiben';
  const query = search.get('suche') ?? '';

  const [leads, setLeads] = useState<OutreachLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const snap = await getDocs(collection(db, 'outreachLeads'));
      setLeads(snap.docs.map((d) => ({ ...(d.data() as OutreachLead), id: d.id })));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setParam = (key: 'ansicht' | 'suche', value: string) => {
    const next = new URLSearchParams(search.toString());
    if (!value || (key === 'ansicht' && value === 'schreiben')) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const save = useCallback(async (id: string, patch: Partial<OutreachLead>) => {
    const data = { ...patch, updatedAt: new Date().toISOString() };
    await updateDoc(doc(db, 'outreachLeads', id), data);
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...data } : l)));
  }, []);

  const reload = useCallback(async (id: string) => {
    const snap = await getDoc(doc(db, 'outreachLeads', id));
    if (snap.exists()) setLeads((ls) => ls.map((l) => (l.id === id ? { ...(snap.data() as OutreachLead), id } : l)));
  }, []);

  const queries = useMemo(() => [...new Set(leads.map((l) => l.query))].sort((a, b) => a.localeCompare(b, 'de')), [leads]);
  const scoped = useMemo(() => leads.filter((l) => !query || l.query === query), [leads, query]);
  const visible = scoped.filter((l) => inView(l, view)).sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name, 'de'));

  const contacted = scoped.filter((l) => l.sentAt);
  const replied = scoped.filter((l) => ['geantwortet', 'termin', 'kunde'].includes(l.status));
  const meetings = scoped.filter((l) => ['termin', 'kunde'].includes(l.status));
  const sentToday = leads.filter((l) => dayKey(l.sentAt) === todayKey() || dayKey(l.followedUpAt) === todayKey()).length;
  const rate = contacted.length ? Math.round((replied.length / contacted.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Outreach</h1>
        <p className="mt-1 text-sm text-gray-500">
          Instagram-Nachrichten an Betriebe. Text kopieren, Profil öffnen, selbst abschicken, dann „Gesendet“ drücken.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Angeschrieben" value={String(contacted.length)} />
        <Kpi label="Antworten" value={String(replied.length)} hint={contacted.length ? `${rate} %` : undefined} />
        <Kpi label="Termine" value={String(meetings.length)} />
        <Kpi
          label="Heute gesendet"
          value={`${sentToday} / ${OUTREACH_DAILY_LIMIT}`}
          warn={sentToday >= OUTREACH_DAILY_LIMIT}
          hint={sentToday >= OUTREACH_DAILY_LIMIT ? 'Limit erreicht, morgen weiter' : undefined}
        />
      </dl>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div role="group" aria-label="Ansicht" className="inline-flex gap-1 rounded-lg bg-gray-100 p-1">
            {VIEWS.map(([v, label]) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setParam('ansicht', v)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium pointer-coarse:py-2.5 ${
                  view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
                {!loading && <span className="ml-1.5 tabular-nums text-gray-400">{scoped.filter((l) => inView(l, v)).length}</span>}
              </button>
            ))}
          </div>
        </div>
        {queries.length > 1 && (
          <div className="sm:w-64">
            <label className="label" htmlFor="outreach-query">
              Suche
            </label>
            <select id="outreach-query" className="input text-base sm:text-sm" value={query} onChange={(e) => setParam('suche', e.target.value)}>
              <option value="">Alle Suchen</option>
              {queries.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error ? (
        <div className="card border-red-200 bg-red-50 text-sm text-red-700">
          <p>Die Betriebe konnten nicht geladen werden: {error}</p>
          <button type="button" className="btn-secondary mt-3" onClick={load}>
            Erneut laden
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Betriebe werden geladen">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-5 w-48 rounded bg-gray-100" />
              <div className="mt-2 h-3 w-32 rounded bg-gray-100" />
              <div className="mt-4 h-24 rounded-lg bg-gray-100" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="card text-sm text-gray-600">{EMPTY[view]}</div>
      ) : (
        <ul className="space-y-3">
          {visible.map((l) => (
            <LeadCard key={l.id} lead={l} view={view} limitReached={sentToday >= OUTREACH_DAILY_LIMIT} onSave={save} onReload={reload} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Kpi({ label, value, hint, warn }: { label: string; value: string; hint?: string; warn?: boolean }) {
  return (
    <div className="card">
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold tabular-nums ${warn ? 'text-amber-700' : 'text-gray-900'}`}>{value}</dd>
      {hint && <dd className={`text-xs ${warn ? 'text-amber-700' : 'text-gray-500'}`}>{hint}</dd>}
    </div>
  );
}

function LeadCard({
  lead: l,
  view,
  limitReached,
  onSave,
  onReload,
}: {
  lead: OutreachLead;
  view: View;
  limitReached: boolean;
  onSave: (id: string, patch: Partial<OutreachLead>) => Promise<void>;
  onReload: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [handle, setHandle] = useState('');
  const [note, setNote] = useState(l.note ?? '');
  const followMode = view === 'nachfassen';
  const text = followMode ? l.followup : l.status === 'neu' ? l.dm : undefined;
  const closed = l.status === 'kein-interesse' || l.status === 'ausgeschlossen';

  const run = async (patch: Partial<OutreachLead>) => {
    setBusy(true);
    setErr(null);
    try {
      await onSave(l.id, patch);
    } catch (e) {
      setErr(`Nicht gespeichert: ${(e as Error).message}. Bitte noch einmal versuchen.`);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setErr('Kopieren ging nicht. Text gedrückt halten und manuell kopieren.');
    }
  };

  const now = () => new Date().toISOString();
  const warnings = text ? lintMessage(text, { first: !l.thread?.length }) : [];
  const showReplies = !!l.sentAt || !!l.thread?.length;
  const igIdleDays = l.ig?.lastPostAt ? Math.floor(daysSince(l.ig.lastPostAt)) : null;
  const igInfo = l.ig
    ? [
        typeof l.ig.followers === 'number' ? `${l.ig.followers.toLocaleString('de-DE')} Follower` : null,
        l.ig.lastPostAt ? `letzter Beitrag ${formatDate(l.ig.lastPostAt)}` : 'keine Beiträge sichtbar',
        l.ig.link ? 'Link in Bio' : 'kein Link in Bio',
        l.ig.private ? 'privates Profil' : null,
      ].filter(Boolean)
    : [];
  const rating = l.rating ? `★ ${String(l.rating).replace('.', ',')}${l.reviews ? ` (${l.reviews})` : ''}` : null;

  return (
    <li className={`card ${closed ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-900">{l.name}</h2>
          <p className="text-xs text-gray-500">
            {[l.category, l.city, rating].filter(Boolean).join(' · ')}
            {l.sentAt && <span className="whitespace-nowrap"> · gesendet {formatDate(l.sentAt)}</span>}
            {l.followedUpAt && <span className="whitespace-nowrap"> · nachgefasst {formatDate(l.followedUpAt)}</span>}
          </p>
        </div>
        <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${OUTREACH_STATUS_BADGES[l.status]}`}>
          {OUTREACH_STATUS_LABELS[l.status]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {l.instagram ? (
          <a
            href={instagramUrl(l.instagram)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-orange-500 px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Instagram @{l.instagram}
          </a>
        ) : (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const h = normalizeInstagram(handle);
              if (h) run({ instagram: h });
            }}
          >
            <label className="sr-only" htmlFor={`ig-${l.id}`}>
              Instagram-Name von {l.name}
            </label>
            <input
              id={`ig-${l.id}`}
              className="input w-48 text-base sm:text-sm"
              placeholder="Instagram-Name oder Link"
              autoCapitalize="none"
              autoCorrect="off"
              enterKeyHint="done"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
            <button type="submit" className="btn-secondary" disabled={busy || !normalizeInstagram(handle)}>
              Speichern
            </button>
            <a href={instagramSearchUrl(l)} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-blue hover:underline">
              Profil suchen
            </a>
          </form>
        )}
        {l.website && (
          <a href={l.website} target="_blank" rel="noopener noreferrer" className="px-1 py-2 text-sm text-gray-500 hover:text-gray-900">
            Website
          </a>
        )}
        {l.mapsUrl && (
          <a href={l.mapsUrl} target="_blank" rel="noopener noreferrer" className="px-1 py-2 text-sm text-gray-500 hover:text-gray-900">
            Google Maps
          </a>
        )}
      </div>

      {igInfo.length > 0 && (
        <p className={`mt-2 text-xs ${igIdleDays !== null && igIdleDays > 180 ? 'text-amber-700' : 'text-gray-500'}`}>
          Instagram: {igInfo.join(' · ')}
          {igIdleDays !== null && igIdleDays > 180 && ' (liest DMs evtl. selten)'}
        </p>
      )}

      {!!l.scan?.findings.length && (
        <ul className="mt-3 list-disc space-y-0.5 pl-5 text-sm text-gray-600">
          {l.scan.findings.slice(0, 4).map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}

      {text && (
        <div className="mt-3 rounded-lg bg-blue-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-blue">{followMode ? 'Nachfassen' : 'Nachricht'}</div>
          <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-gray-900">{text}</p>
          {warnings.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-amber-700">
              {warnings.map((w) => (
                <li key={w}>Hinweis: {w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {l.status === 'neu' && !l.dm && <p className="mt-3 text-sm text-gray-500">Kein Text: Website ohne deutlichen Ansatzpunkt.</p>}

      {(view === 'antworten' || l.note) && (
        <div className="mt-3">
          <label className="label" htmlFor={`note-${l.id}`}>
            Notiz
          </label>
          <textarea
            id={`note-${l.id}`}
            rows={2}
            className="input text-base sm:text-sm"
            placeholder="Was wurde besprochen, nächster Schritt"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== (l.note ?? '') && run({ note })}
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {text && (
          <button type="button" className="btn-primary pointer-coarse:h-11" onClick={copy}>
            {copied ? 'Kopiert ✓' : 'Text kopieren'}
          </button>
        )}
        {l.status === 'neu' && l.dm && (
          <button
            type="button"
            className="btn-secondary pointer-coarse:h-11"
            disabled={busy}
            title={limitReached ? 'Tageslimit erreicht' : undefined}
            onClick={() => run({ status: 'gesendet', sentAt: now() })}
          >
            Gesendet
          </button>
        )}
        {followMode && (
          <button type="button" className="btn-secondary pointer-coarse:h-11" disabled={busy} onClick={() => run({ status: 'nachgefasst', followedUpAt: now() })}>
            Nachgefasst
          </button>
        )}
        {(l.status === 'gesendet' || l.status === 'nachgefasst') && (
          <button type="button" className="btn-secondary pointer-coarse:h-11" disabled={busy} onClick={() => run({ status: 'geantwortet', repliedAt: now() })}>
            Geantwortet
          </button>
        )}
        {l.status === 'geantwortet' && (
          <button type="button" className="btn-secondary pointer-coarse:h-11" disabled={busy} onClick={() => run({ status: 'termin' })}>
            Termin steht
          </button>
        )}
        {l.status === 'termin' && (
          <button type="button" className="btn-secondary pointer-coarse:h-11" disabled={busy} onClick={() => run({ status: 'kunde' })}>
            Ist Kunde
          </button>
        )}
        <div className="ml-auto flex flex-wrap gap-1">
          {!closed && l.status !== 'kunde' && (
            <>
              <StatusLink busy={busy} onClick={() => run({ status: 'kein-interesse' })}>
                Kein Interesse
              </StatusLink>
              {l.status === 'neu' && (
                <StatusLink busy={busy} onClick={() => run({ status: 'ausgeschlossen' })}>
                  Ausschließen
                </StatusLink>
              )}
            </>
          )}
          {l.status !== 'neu' && (
            <StatusLink busy={busy} onClick={() => run(stepBack(l))}>
              Einen Schritt zurück
            </StatusLink>
          )}
        </div>
      </div>
      {err && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {err}
        </p>
      )}

      {showReplies && view !== 'schreiben' && (
        <ReplyBox lead={l} onChanged={() => onReload(l.id)} onMarkNoInterest={() => run({ status: 'kein-interesse' })} />
      )}
    </li>
  );
}

/** Macht den letzten Statuswechsel rückgängig, ohne frühere Daten zu verlieren. */
function stepBack(l: OutreachLead): Partial<OutreachLead> {
  const sentState: OutreachStatus = l.followedUpAt ? 'nachgefasst' : 'gesendet';
  switch (l.status) {
    case 'kunde':
      return { status: 'termin' };
    case 'termin':
      return { status: 'geantwortet' };
    case 'geantwortet':
      return { status: sentState, repliedAt: '' };
    case 'nachgefasst':
      return { status: 'gesendet', followedUpAt: '' };
    case 'gesendet':
      return { status: 'neu', sentAt: '' };
    default:
      // kein Interesse oder ausgeschlossen: zurück auf den Stand davor
      return { status: l.repliedAt ? 'geantwortet' : l.sentAt ? sentState : 'neu' };
  }
}

function StatusLink({ children, onClick, busy }: { children: React.ReactNode; onClick: () => void; busy: boolean }) {
  return (
    <button type="button" disabled={busy} onClick={onClick} className="rounded px-2 py-1.5 text-sm text-gray-500 hover:text-gray-900 pointer-coarse:py-2.5">
      {children}
    </button>
  );
}
