'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import ReplyBox from '@/components/outreach/ReplyBox';
import { postJson } from '@/components/seo/admin/api';
import { branchOf, type Branch } from '@/lib/outreach-playbook';
import { db } from '@/lib/firebase';
import { MAIL_MAX } from '@/lib/outreach-mail';
import {
  OUTREACH_DAILY_LIMIT,
  OUTREACH_FOLLOWUP_DAYS,
  OUTREACH_STATUS_BADGES,
  OUTREACH_STATUS_LABELS,
  DM_MAX,
  EMAIL_RE,
  instagramSearchUrl,
  instagramUrl,
  isMailLead,
  lintMessage,
  mailtoUrl,
  normalizeInstagram,
  type OutreachLead,
  type OutreachStatus,
} from '@/lib/outreach';

const VIEWS = [
  ['schreiben', 'Zu schreiben'],
  ['mail', 'Per Mail'],
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
      // Ohne Text nur mit geprueftem Bedarf und Instagram, der Text laesst sich auf der Karte schreiben
      return l.status === 'neu' && !isMailLead(l) && (!!l.dm || (!!l.bedarf && !!l.instagram));
    case 'mail':
      return l.status === 'neu' && isMailLead(l);
    case 'nachfassen':
      // Instagram auch ohne Nachfass-Text: der laesst sich auf der Karte schreiben
      return l.status === 'gesendet' && daysSince(l.sentAt) >= OUTREACH_FOLLOWUP_DAYS && (isMailLead(l) ? !!l.mailFollowup : true);
    case 'gesendet':
      return l.status === 'gesendet' || l.status === 'nachgefasst';
    case 'antworten':
      return l.status === 'geantwortet' || l.status === 'termin' || l.status === 'kunde';
    default:
      return true;
  }
}

const HIGH_TICKET = new Set<Branch>(['kueche', 'bad', 'galabau', 'tischlerei', 'ausbau', 'hochzeitslocation', 'brautmode', 'aufbereitung', 'kfz', 'juwelier', 'aesthetik']);

/** Mit Text zuerst, dann High-Ticket-Branchen (mehr Auftragswert), dann Instagram oder Mail-Adresse und Hebel. */
const rank = (l: OutreachLead) =>
  ((isMailLead(l) ? l.mailBody : l.dm) ? 100 : 0) +
  (HIGH_TICKET.has(branchOf(l)) ? 50 : 0) +
  ((isMailLead(l) ? l.email : l.instagram) ? 20 : 0) +
  (l.scan?.priority ?? 0);

const EMPTY: Record<View, string> = {
  schreiben: 'Alle Betriebe mit Text sind angeschrieben. Für neue in Claude Code sagen: „Outreach: Branche, Stadt“.',
  mail: 'Noch keine Betriebe per Mail. Passt das Instagram-Profil auf einer Karte nicht, dort „Kein Instagram“ drücken: Der Betrieb landet hier und bekommt eine Mail mit Auswertung seiner Website.',
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
  const [channel, setChannel] = useState<'instagram' | 'mail'>('instagram');

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
  // Gesendet und Antworten: neueste zuerst. Sonst nach Hebel.
  const byDate = (k: 'sentAt' | 'repliedAt') => (a: OutreachLead, b: OutreachLead) => (b[k] ?? '').localeCompare(a[k] ?? '');
  const visible = scoped
    .filter((l) => inView(l, view))
    .sort(
      view === 'gesendet'
        ? byDate('sentAt')
        : view === 'antworten'
          ? byDate('repliedAt')
          : (a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name, 'de'),
    );

  // Kennzahlen je Kanal: Instagram und Mail getrennt
  const channelLeads = scoped.filter((l) => (channel === 'mail') === isMailLead(l));
  const contacted = channelLeads.filter((l) => l.sentAt);
  const followedUp = channelLeads.filter((l) => l.followedUpAt);
  const replied = channelLeads.filter((l) => ['geantwortet', 'termin', 'kunde'].includes(l.status));
  const meetings = channelLeads.filter((l) => ['termin', 'kunde'].includes(l.status));
  const rate = contacted.length ? Math.round((replied.length / contacted.length) * 100) : 0;
  const isToday = (l: OutreachLead) => dayKey(l.sentAt) === todayKey() || dayKey(l.followedUpAt) === todayKey();
  // Das Tageslimit schuetzt den Instagram-Account, Mails zaehlen nicht mit
  const sentTodayIg = leads.filter((l) => !isMailLead(l) && isToday(l)).length;
  const sentTodayChannel = channelLeads.filter(isToday).length;
  const week = lastDays(7).map((day) => ({
    day,
    first: channelLeads.filter((l) => dayKey(l.sentAt) === day).length,
    follow: channelLeads.filter((l) => dayKey(l.followedUpAt) === day).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Outreach</h1>
        <p className="mt-1 text-sm text-gray-500">
          Instagram-Nachrichten an Betriebe, ohne passendes Instagram per Mail. Text kopieren oder Mail öffnen, selbst abschicken, dann „Gesendet“ drücken.
        </p>
      </div>

      <section aria-labelledby="outreach-kpis" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="outreach-kpis" className="text-sm font-semibold text-gray-900">
            Kennzahlen
          </h2>
          <div role="group" aria-label="Kanal" className="inline-flex gap-1 rounded-lg bg-gray-100 p-1">
            {(
              [
                ['instagram', 'Instagram'],
                ['mail', 'Mail'],
              ] as const
            ).map(([c, label]) => (
              <button
                key={c}
                type="button"
                aria-pressed={channel === c}
                onClick={() => setChannel(c)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium pointer-coarse:py-2.5 ${
                  channel === c ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Kpi label="Angeschrieben" value={String(contacted.length)} />
          <Kpi label="Nachgefasst" value={String(followedUp.length)} />
          <Kpi label="Antworten" value={String(replied.length)} hint={contacted.length ? `${rate} % Antwortquote` : undefined} />
          <Kpi label="Termine" value={String(meetings.length)} />
          {channel === 'instagram' ? (
            <Kpi
              label="Heute gesendet"
              value={`${sentTodayIg} / ${OUTREACH_DAILY_LIMIT}`}
              warn={sentTodayIg >= OUTREACH_DAILY_LIMIT}
              hint={sentTodayIg >= OUTREACH_DAILY_LIMIT ? 'Limit erreicht, morgen weiter' : 'inkl. Nachfassen'}
            />
          ) : (
            <Kpi label="Heute gesendet" value={String(sentTodayChannel)} hint="inkl. Nachfassen" />
          )}
        </dl>
        <WeekChart week={week} />
      </section>

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
            <LeadCard key={l.id} lead={l} view={view} limitReached={!isMailLead(l) && sentTodayIg >= OUTREACH_DAILY_LIMIT} onSave={save} onReload={reload} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Tages-Schluessel (YYYY-MM-DD, Berlin) der letzten n Tage, aeltester zuerst. */
function lastDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) =>
    new Date(Date.now() - (n - 1 - i) * DAY_MS).toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' }),
  );
}

/** Gesendet pro Tag, letzte 7 Tage: Erstnachrichten und Nachfassen gestapelt. */
function WeekChart({ week }: { week: { day: string; first: number; follow: number }[] }) {
  const max = Math.max(1, ...week.map((d) => d.first + d.follow));
  const total = week.reduce((s, d) => s + d.first + d.follow, 0);
  const firsts = week.reduce((s, d) => s + d.first, 0);
  return (
    <div className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-medium text-gray-500">Gesendet in den letzten 7 Tagen</h3>
        <p className="text-xs text-gray-500">
          <span className="font-semibold tabular-nums text-gray-900">{total}</span> Nachrichten, davon {firsts} Erstnachrichten · Ø{' '}
          {(total / 7).toLocaleString('de-DE', { maximumFractionDigits: 1 })} pro Tag
        </p>
      </div>
      <ol className="mt-3 grid grid-cols-7 items-end gap-2" aria-label="Nachrichten pro Tag">
        {week.map((d) => {
          const label = new Date(`${d.day}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'short' });
          const sum = d.first + d.follow;
          return (
            <li key={d.day} className="flex flex-col items-center gap-1" aria-label={`${label}: ${d.first} Erstnachrichten, ${d.follow} Nachfassen`}>
              <span className="text-xs tabular-nums text-gray-700">{sum || ''}</span>
              <div className="flex h-20 w-full max-w-10 flex-col justify-end overflow-hidden rounded-md bg-gray-50">
                <div className="w-full bg-blue-200" style={{ height: `${(d.follow / max) * 100}%` }} />
                <div className="w-full bg-brand-blue" style={{ height: `${(d.first / max) * 100}%` }} />
              </div>
              <span className="text-xs text-gray-500">{label}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 flex gap-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-brand-blue" aria-hidden="true" /> Erstnachricht
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-blue-200" aria-hidden="true" /> Nachfassen
        </span>
      </p>
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
  const [drafting, setDrafting] = useState(false);
  const [email, setEmail] = useState('');
  const [editEmail, setEditEmail] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const mail = isMailLead(l);
  const followMode = view === 'nachfassen';
  const first = mail ? l.mailBody : l.dm;
  const text = followMode ? (mail ? l.mailFollowup : l.followup) : l.status === 'neu' ? first : undefined;
  const subject = mail && l.mailSubject ? (followMode ? `Re: ${l.mailSubject}` : l.mailSubject) : '';
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

  // Claude schreibt DM und Nachfass-Text nach Branchen-Playbook und speichert sie am Betrieb
  const writeDraft = async () => {
    setDrafting(true);
    setErr(null);
    try {
      await postJson('/api/outreach/draft', { id: l.id });
      await onReload(l.id);
    } catch (e) {
      setErr(`Kein Text geschrieben: ${(e as Error).message}`);
    } finally {
      setDrafting(false);
    }
  };

  // Nachfass-Nachricht passend zur DM, die rausging
  const writeFollowup = async () => {
    setDrafting(true);
    setErr(null);
    try {
      await postJson('/api/outreach/draft', { id: l.id, followup: true });
      await onReload(l.id);
    } catch (e) {
      setErr(`Kein Nachfass-Text geschrieben: ${(e as Error).message}`);
    } finally {
      setDrafting(false);
    }
  };

  // Mail-Adresse aus dem Impressum holen und Mail mit Auswertung der Website schreiben
  const writeMail = async () => {
    setDrafting(true);
    setErr(null);
    setInfo(null);
    try {
      const r = await postJson<{ emailFound: boolean }>('/api/outreach/mail', { id: l.id });
      await onReload(l.id);
      if (!r.emailFound) setInfo('Keine Mail-Adresse auf der Website gefunden. Bitte im Impressum nachsehen und oben eintragen, oder anrufen.');
    } catch (e) {
      setErr(`Keine Mail geschrieben: ${(e as Error).message}`);
    } finally {
      setDrafting(false);
    }
  };

  const now = () => new Date().toISOString();
  const warnings = text ? lintMessage(text, { first: !l.thread?.length, max: mail ? (followMode ? 500 : MAIL_MAX) : followMode ? 750 : DM_MAX }) : [];
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
        {mail ? (
          l.email && !editEmail ? (
            <span className="inline-flex flex-wrap items-center gap-1 text-sm">
              <span className="font-medium text-gray-900">{l.email}</span>
              {l.status === 'neu' && (
                <button
                  type="button"
                  className="rounded px-2 py-1.5 text-gray-500 hover:text-gray-900"
                  onClick={() => {
                    setEmail(l.email ?? '');
                    setEditEmail(true);
                  }}
                >
                  Ändern
                </button>
              )}
            </span>
          ) : (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const v = email.trim().toLowerCase();
                if (EMAIL_RE.test(v)) run({ email: v }).then(() => setEditEmail(false));
              }}
            >
              <label className="sr-only" htmlFor={`mail-${l.id}`}>
                Mail-Adresse von {l.name}
              </label>
              <input
                id={`mail-${l.id}`}
                type="email"
                className="input w-60 text-base sm:text-sm"
                placeholder="Mail-Adresse aus dem Impressum"
                autoComplete="off"
                enterKeyHint="done"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" className="btn-secondary" disabled={busy || !EMAIL_RE.test(email.trim())}>
                Speichern
              </button>
            </form>
          )
        ) : l.instagram ? (
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
              if (h) run({ instagram: h, igSource: 'dashboard' });
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
        {mail && l.phone && (
          <a href={`tel:${l.phone.replace(/[^\d+]/g, '')}`} className="whitespace-nowrap px-1 py-2 text-sm text-gray-500 hover:text-gray-900">
            {l.phone}
          </a>
        )}
        {l.mapsUrl && (
          <a href={l.mapsUrl} target="_blank" rel="noopener noreferrer" className="px-1 py-2 text-sm text-gray-500 hover:text-gray-900">
            Google Maps
          </a>
        )}
      </div>

      {!mail && igInfo.length > 0 && (
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
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
            {mail ? (followMode ? 'Nachfass-Mail' : 'Mail') : followMode ? 'Nachfassen' : 'Nachricht'}
          </div>
          {subject && (
            <p className="mt-1 text-sm text-gray-900">
              <span className="text-gray-500">Betreff:</span> {subject}
            </p>
          )}
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
      {l.status === 'neu' && !first && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary pointer-coarse:h-11" disabled={drafting} onClick={mail ? writeMail : writeDraft}>
            {drafting ? 'Claude schreibt…' : mail ? 'Mail schreiben' : 'Text schreiben'}
          </button>
          <span className="text-xs text-gray-500">
            {mail
              ? 'Sucht die Mail-Adresse im Impressum und schreibt eine Mail mit Auswertung der Website, etwa 30 Sekunden.'
              : 'Nach Branchen-Playbook, dauert etwa 20 Sekunden.'}
          </span>
        </div>
      )}
      {followMode && !mail && !text && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary pointer-coarse:h-11" disabled={drafting} onClick={writeFollowup}>
            {drafting ? 'Claude schreibt…' : 'Nachfass-Text schreiben'}
          </button>
          <span className="text-xs text-gray-500">Bezieht sich auf deine erste Nachricht, etwa 15 Sekunden.</span>
        </div>
      )}
      {info && <p className="mt-2 text-sm text-amber-700">{info}</p>}

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
        {text && mail && l.email && (
          <a href={mailtoUrl(l.email, subject, text)} className="btn-primary pointer-coarse:h-11">
            In Mail öffnen
          </a>
        )}
        {text && (
          <button type="button" className={`${mail && l.email ? 'btn-secondary' : 'btn-primary'} pointer-coarse:h-11`} onClick={copy}>
            {copied ? 'Kopiert ✓' : 'Text kopieren'}
          </button>
        )}
        {l.status === 'neu' && first && (
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
        {followMode && text && (
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
              {l.status === 'neu' && first && (
                <StatusLink busy={busy || drafting} onClick={mail ? writeMail : writeDraft}>
                  {drafting ? 'Schreibt…' : 'Neu schreiben'}
                </StatusLink>
              )}
              {followMode && !mail && text && (
                <StatusLink busy={busy || drafting} onClick={writeFollowup}>
                  {drafting ? 'Schreibt…' : 'Neu schreiben'}
                </StatusLink>
              )}
              {l.status === 'neu' && !mail && (
                // Profil passt nicht oder fehlt: Betrieb wandert in „Per Mail“
                <StatusLink busy={busy} onClick={() => run({ channel: 'mail', instagram: '', igRejected: l.instagram ?? '' })}>
                  Kein Instagram
                </StatusLink>
              )}
              {l.status === 'neu' && mail && l.igRejected && (
                <StatusLink busy={busy} onClick={() => run({ channel: 'instagram', instagram: l.igRejected, igSource: 'dashboard' })}>
                  Doch per Instagram
                </StatusLink>
              )}
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
