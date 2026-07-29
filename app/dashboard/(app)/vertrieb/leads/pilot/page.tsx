'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';
import {
  listLeads,
  updateLead,
  createActivity,
  listActivitiesByLead,
} from '@/lib/firestore';
import type { Activity, Lead, LeadStatus } from '@/lib/types';
import { LEAD_STATUS_LABELS } from '@/lib/types';
import {
  buildSalesQueue,
  calcLeadScore,
  countCallsToday,
  countLeadsByStatusToday,
  buildWebsiteCheckPayload,
} from '@/lib/lead-utils';
import { authedFetch } from '@/lib/api-client';

const DAILY_TARGET = 50;

/**
 * Salespilot — priorisierter Anruf-Modus.
 *
 * Der Bildschirm zeigt genau EINEN Lead gross. Nach jeder Aktion
 * (erreicht/nicht erreicht/interessiert/…) springt der Pilot direkt
 * auf den naechsten Lead in der Score-Queue. Ziel-Anzeige: 50/Tag.
 *
 * Priorisierung:
 * - Nur Leads mit Telefonnummer
 * - Nur „call-ready" Status (kalt/nicht_erreicht/kontaktiert/interessiert)
 * - Score aus Website-Alter + Rating + Reviews + Status +
 *   „seit letztem Versuch vergangene Zeit"
 */
export default function SalespilotPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [queuePosition, setQueuePosition] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [checkingWebsite, setCheckingWebsite] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await listLeads();
    setLeads(list);
  }, []);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  const queue = useMemo(() => buildSalesQueue(leads), [leads]);
  const current = queue[queuePosition];

  // Aktivitaeten des aktuellen Leads
  useEffect(() => {
    if (!current) {
      setActivities([]);
      return;
    }
    listActivitiesByLead(current.id).then(setActivities).catch(console.error);
    setNotes(current.notes ?? '');
    setCheckResult(null);
  }, [current]);

  const callsToday = useMemo(() => countCallsToday(leads), [leads]);
  const reachedToday = useMemo(
    () =>
      countLeadsByStatusToday(leads, [
        'kontaktiert',
        'interessiert',
        'termin_vereinbart',
        'kein_interesse',
      ]),
    [leads],
  );
  const appointmentsToday = useMemo(
    () => countLeadsByStatusToday(leads, ['termin_vereinbart']),
    [leads],
  );

  const goToNext = useCallback(() => {
    setQueuePosition((p) => Math.min(queue.length - 1, p + 1));
  }, [queue.length]);

  const goToPrev = useCallback(() => {
    setQueuePosition((p) => Math.max(0, p - 1));
  }, []);

  const recordAction = async (
    newStatus: LeadStatus,
    activityDesc: string,
    nextCallAt: Date | null = null,
  ) => {
    if (!current) return;
    setSaving(true);
    try {
      await createActivity({
        leadId: current.id,
        type: 'anruf',
        description: activityDesc,
        emailSubject: null,
        emailBody: null,
        dueDate: null,
        completed: true,
        completedAt: Timestamp.fromDate(new Date()),
      });
      await updateLead(current.id, {
        status: newStatus,
        lastCallAttemptAt: Timestamp.fromDate(new Date()),
        lastContactAt: Timestamp.fromDate(new Date()),
        nextCallAt: nextCallAt ? Timestamp.fromDate(nextCallAt) : null,
        notes: notes.trim(),
      });
      await load();
      // Nach dem Save die Queue neu bewerten — der jetzt bearbeitete
      // Lead ist meist runter im Score, also bleibt queuePosition
      // stehen und zeigt automatisch den naechsten.
    } finally {
      setSaving(false);
    }
  };

  const handleCheckWebsite = async () => {
    if (!current?.website) return;
    setCheckingWebsite(true);
    setCheckResult(null);
    try {
      const res = await authedFetch('/api/leads/check-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: current.website }),
      });
      const data = await res.json();
      setCheckResult(
        `${data.suggestedAge.toUpperCase()} · ${data.notes || 'keine Notizen'}`,
      );
      await updateLead(current.id, {
        websiteAge: data.suggestedAge,
        websiteCheck: buildWebsiteCheckPayload(data),
      });
      await load();
    } catch (err) {
      setCheckResult(`Fehler: ${(err as Error).message}`);
    } finally {
      setCheckingWebsite(false);
    }
  };

  if (loading) {
    return <div className="card text-sm text-gray-500">Lädt Queue…</div>;
  }

  const progressPct = Math.min(100, (callsToday / DAILY_TARGET) * 100);

  return (
    <div>
      <header className="mb-6">
        <Link
          href="/dashboard/vertrieb/leads"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zur Lead-Liste
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              🚀 Salespilot
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Priorisierte Anruf-Queue. Ziel: {DAILY_TARGET} Calls/Tag.
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {callsToday}/{DAILY_TARGET}
            </p>
            <p className="text-xs text-gray-500">
              Calls heute · {reachedToday} erreicht ·{' '}
              {appointmentsToday} Termine
            </p>
          </div>
        </div>
        <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-blue transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      {queue.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-xl font-medium text-gray-900">
            Queue ist leer 🎉
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Alle qualifizierten Leads für heute abgearbeitet oder es sind
            noch keine mit Telefonnummer + „call-ready" Status vorhanden.
          </p>
          <Link
            href="/dashboard/vertrieb/leads/import"
            className="btn-primary mt-4 inline-block"
          >
            Neue Leads importieren
          </Link>
        </div>
      ) : !current ? (
        <div className="card text-center py-16">
          <p className="text-xl font-medium text-gray-900">
            Ende der Queue erreicht.
          </p>
          <button
            onClick={() => setQueuePosition(0)}
            className="btn-primary mt-4"
          >
            Von vorne beginnen
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 space-y-4">
              <div className="card">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-2xl font-semibold text-gray-900">
                        {current.company}
                      </h2>
                      {current.websiteAge === 'keine' && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          🔥 keine Website
                        </span>
                      )}
                      {current.websiteAge === 'veraltet' && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          veraltet
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {[
                        current.category,
                        current.contactName,
                        current.city,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      {current.rating != null &&
                        ` · ${current.rating.toFixed(1)}★ (${current.reviewCount ?? 0})`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Score</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {calcLeadScore(current)}
                    </p>
                  </div>
                </div>

                {/* Telefon HUGE */}
                <div className="mt-5 flex items-center gap-4">
                  <a
                    href={`tel:${current.phone}`}
                    className="text-4xl font-mono font-bold text-brand-blue hover:underline tabular-nums"
                  >
                    {current.phone ?? '—'}
                  </a>
                </div>

                {/* Website + Maps + Mail */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {current.website && (
                    <a
                      href={current.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-sm"
                    >
                      🌐 Website öffnen
                    </a>
                  )}
                  {current.googleMapsUrl && (
                    <a
                      href={current.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-sm"
                    >
                      📍 Google Maps
                    </a>
                  )}
                  {current.email && (
                    <a
                      href={`mailto:${current.email}`}
                      className="btn-secondary text-sm"
                    >
                      ✉️ {current.email}
                    </a>
                  )}
                  {current.website && (
                    <button
                      onClick={handleCheckWebsite}
                      disabled={checkingWebsite}
                      className="btn-secondary text-sm"
                    >
                      {checkingWebsite
                        ? 'Prüfe Website…'
                        : '🔍 Alter prüfen'}
                    </button>
                  )}
                </div>
                {checkResult && (
                  <p className="mt-2 text-xs text-gray-600">
                    Prüfung: {checkResult}
                  </p>
                )}
              </div>

              {/* Notizen */}
              <div className="card">
                <label className="label">Notizen zu diesem Lead</label>
                <textarea
                  className="input min-h-[100px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Was hat der Inhaber gesagt? Was ist wichtig für den nächsten Kontakt?"
                />
              </div>

              {/* Action-Buttons */}
              <div className="card">
                <p className="text-sm font-medium text-gray-900 mb-3">
                  Nach dem Anruf: Ergebnis buchen
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <ActionButton
                    color="emerald"
                    label="Erreicht → Interessiert"
                    hint="Ich rufe morgen/übermorgen wieder an"
                    disabled={saving}
                    onClick={async () => {
                      const inTwoDays = new Date();
                      inTwoDays.setDate(inTwoDays.getDate() + 2);
                      inTwoDays.setHours(10, 0, 0, 0);
                      await recordAction(
                        'interessiert',
                        `Anruf: Interesse signalisiert. ${notes.trim() || '(keine Notiz)'}`,
                        inTwoDays,
                      );
                      goToNext();
                    }}
                  />
                  <ActionButton
                    color="blue"
                    label="Termin vereinbart"
                    hint="Konkreter Folgetermin steht"
                    disabled={saving}
                    onClick={async () => {
                      await recordAction(
                        'termin_vereinbart',
                        `Anruf: Termin vereinbart. ${notes.trim() || '(keine Notiz)'}`,
                        null,
                      );
                      goToNext();
                    }}
                  />
                  <ActionButton
                    color="amber"
                    label="Nicht erreicht"
                    hint="Rückruf in 2 Tagen"
                    disabled={saving}
                    onClick={async () => {
                      const inTwoDays = new Date();
                      inTwoDays.setDate(inTwoDays.getDate() + 2);
                      inTwoDays.setHours(10, 0, 0, 0);
                      await recordAction(
                        'nicht_erreicht',
                        `Anruf: Nicht erreicht.${notes.trim() ? ' ' + notes.trim() : ''}`,
                        inTwoDays,
                      );
                      goToNext();
                    }}
                  />
                  <ActionButton
                    color="gray"
                    label="Erreicht → Info geschickt"
                    hint="Wollte Infos per Mail, Rückruf in 5 Tagen"
                    disabled={saving}
                    onClick={async () => {
                      const in5 = new Date();
                      in5.setDate(in5.getDate() + 5);
                      in5.setHours(10, 0, 0, 0);
                      await recordAction(
                        'kontaktiert',
                        `Anruf: Infos per Mail geschickt. ${notes.trim() || '(keine Notiz)'}`,
                        in5,
                      );
                      goToNext();
                    }}
                  />
                  <ActionButton
                    color="red"
                    label="Kein Interesse"
                    hint="Aus der Queue raus"
                    disabled={saving}
                    onClick={async () => {
                      await recordAction(
                        'kein_interesse',
                        `Anruf: Kein Interesse.${notes.trim() ? ' ' + notes.trim() : ''}`,
                        null,
                      );
                      goToNext();
                    }}
                  />
                  <ActionButton
                    color="gray"
                    label="Überspringen"
                    hint="Ohne Änderung zum nächsten"
                    disabled={saving}
                    onClick={goToNext}
                  />
                </div>
              </div>
            </section>

            {/* Sidebar: Queue-Progress + Historie */}
            <aside className="space-y-4">
              <div className="card">
                <p className="text-xs uppercase text-gray-500 tracking-wider mb-2">
                  Queue
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {queuePosition + 1}
                  <span className="text-lg text-gray-400">/{queue.length}</span>
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={goToPrev}
                    disabled={queuePosition === 0}
                    className="btn-secondary text-sm flex-1 disabled:opacity-30"
                  >
                    ← Vorheriger
                  </button>
                  <button
                    onClick={goToNext}
                    disabled={queuePosition >= queue.length - 1}
                    className="btn-secondary text-sm flex-1 disabled:opacity-30"
                  >
                    Nächster →
                  </button>
                </div>
                <Link
                  href={`/dashboard/vertrieb/leads/${current.id}`}
                  className="mt-3 block text-xs text-brand-blue hover:underline"
                >
                  → Volle Detail-Ansicht
                </Link>
              </div>

              {/* Nächste 3 in der Queue */}
              <div className="card">
                <p className="text-xs uppercase text-gray-500 tracking-wider mb-2">
                  Als nächstes
                </p>
                <ul className="space-y-2 text-sm">
                  {queue
                    .slice(queuePosition + 1, queuePosition + 4)
                    .map((l, i) => (
                      <li
                        key={l.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-gray-900 truncate">
                          {i + 1}. {l.company}
                        </span>
                        <span className="text-xs text-gray-400 tabular-nums">
                          {calcLeadScore(l)}
                        </span>
                      </li>
                    ))}
                  {queue.length <= queuePosition + 1 && (
                    <li className="text-gray-400 italic text-xs">
                      Ende der Queue.
                    </li>
                  )}
                </ul>
              </div>

              {/* Bisherige Aktivitäten dieses Leads */}
              <div className="card">
                <p className="text-xs uppercase text-gray-500 tracking-wider mb-2">
                  Historie dieser Kontakt
                </p>
                {activities.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">
                    Erster Kontakt.
                  </p>
                ) : (
                  <ul className="space-y-2 text-xs">
                    {activities.slice(0, 5).map((a) => (
                      <li key={a.id}>
                        <p className="text-gray-900">{a.description}</p>
                        <p className="text-gray-400">
                          {new Date(
                            (a.completedAt ?? a.createdAt).toMillis(),
                          ).toLocaleDateString('de-DE')}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Aktueller Status */}
              <div className="card">
                <p className="text-xs uppercase text-gray-500 tracking-wider mb-2">
                  Status
                </p>
                <p className="text-sm text-gray-900">
                  {LEAD_STATUS_LABELS[current.status]}
                </p>
                {current.lastCallAttemptAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    Letzter Versuch:{' '}
                    {new Date(
                      current.lastCallAttemptAt.toMillis(),
                    ).toLocaleDateString('de-DE')}
                  </p>
                )}
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function ActionButton({
  label,
  hint,
  color,
  onClick,
  disabled,
}: {
  label: string;
  hint: string;
  color: 'emerald' | 'blue' | 'amber' | 'red' | 'gray';
  onClick: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const colorClass = {
    emerald:
      'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600',
    blue: 'bg-brand-blue hover:opacity-90 text-white border-brand-blue',
    amber: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500',
    red: 'bg-red-600 hover:bg-red-700 text-white border-red-600',
    gray: 'bg-white hover:bg-gray-50 text-gray-900 border-gray-300',
  }[color];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-left px-3 py-2.5 rounded-lg border ${colorClass} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <p className="font-medium text-sm leading-tight">{label}</p>
      <p className="text-xs opacity-90 mt-0.5">{hint}</p>
    </button>
  );
}
