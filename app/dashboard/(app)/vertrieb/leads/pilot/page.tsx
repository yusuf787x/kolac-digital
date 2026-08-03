'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';
import {
  listLeads,
  updateLead,
  createActivity,
  listActivitiesByLead,
  getActiveCallScript,
  getCallLogConfig,
  createCallLog,
  seedInitialCallScriptIfMissing,
} from '@/lib/firestore';
import type {
  Activity,
  CallLogConfig,
  CallScript,
  Lead,
  LeadStatus,
} from '@/lib/types';
import { LEAD_STATUS_LABELS } from '@/lib/types';
import {
  buildSalesQueue,
  calcLeadScore,
  countCallsToday,
  countLeadsByStatusToday,
  buildWebsiteCheckPayload,
} from '@/lib/lead-utils';
import { authedFetch } from '@/lib/api-client';
import ScriptRenderer from '@/components/vertrieb/ScriptRenderer';

const DAILY_TARGET = 50;

/**
 * Mapping Call-Outcome → Lead-Status. Wenn outcome.isSuccess ist → Termin.
 * Sonst nach Kern-IDs. Custom Outcomes fallen auf „kontaktiert" — der
 * User kann den Lead-Status im Detail immer noch ueberschreiben.
 */
function outcomeToLeadStatus(outcomeId: string, isSuccess: boolean): LeadStatus {
  if (isSuccess) return 'termin_vereinbart';
  switch (outcomeId) {
    case 'nicht_erreicht':
      return 'nicht_erreicht';
    case 'kein_interesse':
    case 'falsche_zielgruppe':
      return 'kein_interesse';
    default:
      return 'kontaktiert';
  }
}

/**
 * Naechstes Rueckruf-Datum berechnen basierend auf Outcome-Semantik.
 * Termin → kein Rueckruf. Nicht erreicht → in 2 Tagen. Rueckruf
 * vereinbart → in 5 Tagen. Kein Interesse/Falsche Zielgruppe → null.
 * Alles andere → in 5 Tagen (freundlicher Follow-up).
 */
function nextCallForOutcome(outcomeId: string, isSuccess: boolean): Date | null {
  if (isSuccess) return null;
  if (outcomeId === 'kein_interesse' || outcomeId === 'falsche_zielgruppe')
    return null;
  const d = new Date();
  if (outcomeId === 'nicht_erreicht') d.setDate(d.getDate() + 2);
  else if (outcomeId === 'rueckruf') d.setDate(d.getDate() + 5);
  else d.setDate(d.getDate() + 3);
  d.setHours(10, 0, 0, 0);
  return d;
}

export default function SalespilotPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [script, setScript] = useState<CallScript | null>(null);
  const [config, setConfig] = useState<CallLogConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [queuePosition, setQueuePosition] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [checkingWebsite, setCheckingWebsite] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [showScript, setShowScript] = useState(true);
  const [selectedStageId, setSelectedStageId] = useState('');
  const [selectedObjectionId, setSelectedObjectionId] = useState('');

  const load = useCallback(async () => {
    await seedInitialCallScriptIfMissing();
    const [list, s, cfg] = await Promise.all([
      listLeads(),
      getActiveCallScript(),
      getCallLogConfig(),
    ]);
    setLeads(list);
    setScript(s);
    setConfig(cfg);
  }, []);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  const queue = useMemo(() => buildSalesQueue(leads), [leads]);
  const current = queue[queuePosition];

  useEffect(() => {
    if (!current) {
      setActivities([]);
      return;
    }
    listActivitiesByLead(current.id).then(setActivities).catch(console.error);
    setNotes(current.notes ?? '');
    setCheckResult(null);
    setSelectedStageId('');
    setSelectedObjectionId('');
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

  /**
   * Ergebnis buchen: schreibt CallLog + Activity + updated Lead-Status
   * in einem Zug. Die "Stufe" ist optional — wenn der User sie vor dem
   * Ergebnis-Klick nicht ausgewaehlt hat, wird sie auf "Abschluss" bzw.
   * das Ergebnis abgeleitet.
   */
  const bookOutcome = async (outcomeId: string) => {
    if (!current || !config || !script) return;
    const outcome = config.outcomes.find((o) => o.id === outcomeId);
    if (!outcome) return;
    // Stage: wenn User eine ausgewaehlt hat, die nehmen; sonst nach
    // Outcome ableiten.
    let stageId = selectedStageId;
    if (!stageId) {
      if (outcomeId === 'nicht_erreicht') stageId = 'nicht_erreicht';
      else if (outcome.isSuccess) stageId = 'abschluss';
      else stageId = 'pitch';
    }
    const stage = config.stages.find((s) => s.id === stageId);
    const objection =
      stageId === 'einwand' && selectedObjectionId
        ? config.objections.find((o) => o.id === selectedObjectionId)
        : undefined;

    setSaving(true);
    try {
      const now = Timestamp.fromDate(new Date());
      const nextCallAt = nextCallForOutcome(outcomeId, outcome.isSuccess);

      // CallLog schreiben (Kern-Datenpunkt fuer die Auswertung)
      await createCallLog({
        scriptVersionId: script.id,
        scriptVersionNumber: script.version,
        stageId: stage?.id ?? stageId,
        stageLabel: stage?.label ?? stageId,
        outcomeId: outcome.id,
        outcomeLabel: outcome.label,
        outcomeIsSuccess: outcome.isSuccess,
        objectionTypeId: objection?.id,
        objectionLabel: objection?.label,
        leadId: current.id,
        leadCompany: current.company,
        note: notes.trim() || undefined,
        calledAt: now,
      });

      // Activity als Chronik am Lead
      await createActivity({
        leadId: current.id,
        type: 'anruf',
        description: `${outcome.label}${
          stage ? ` (bei „${stage.label}")` : ''
        }${objection ? ` [Einwand: ${objection.label}]` : ''}${
          notes.trim() ? ` — ${notes.trim()}` : ''
        }`,
        emailSubject: null,
        emailBody: null,
        dueDate: null,
        completed: true,
        completedAt: now,
      });

      // Lead-Status/Rueckruf setzen
      await updateLead(current.id, {
        status: outcomeToLeadStatus(outcome.id, outcome.isSuccess),
        lastCallAttemptAt: now,
        lastContactAt: now,
        nextCallAt: nextCallAt ? Timestamp.fromDate(nextCallAt) : null,
        notes: notes.trim(),
      });

      await load();
      goToNext();
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

  if (loading) return <div className="card text-sm text-gray-500">Laedt Queue…</div>;

  const progressPct = Math.min(100, (callsToday / DAILY_TARGET) * 100);

  return (
    <div>
      <header className="mb-6">
        <Link
          href="/dashboard/vertrieb/leads"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurueck zur Lead-Liste
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              🚀 Salespilot
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Priorisierte Anruf-Queue mit Skript-Regie und Call-Tracking. Ziel: {DAILY_TARGET} Calls/Tag.
              {script && (
                <>
                  {' · '}
                  <Link
                    href="/dashboard/vertrieb/skript"
                    className="text-brand-blue hover:underline"
                  >
                    Skript V{script.version}
                  </Link>
                </>
              )}
              {' · '}
              <Link
                href="/dashboard/vertrieb/call-log/auswertung"
                className="text-brand-blue hover:underline"
              >
                Auswertung
              </Link>
              {' · '}
              <Link
                href="/dashboard/vertrieb/call-log/config"
                className="text-brand-blue hover:underline"
              >
                Config
              </Link>
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {callsToday}/{DAILY_TARGET}
            </p>
            <p className="text-xs text-gray-500">
              Calls heute · {reachedToday} erreicht · {appointmentsToday} Termine
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
            Alle qualifizierten Leads fuer heute abgearbeitet oder es sind
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-4">
            {/* Lead-Card */}
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
                    {[current.category, current.contactName, current.city]
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

              <div className="mt-5 flex items-center gap-4">
                <a
                  href={`tel:${current.phone}`}
                  className="text-4xl font-mono font-bold text-brand-blue hover:underline tabular-nums"
                >
                  {current.phone ?? '—'}
                </a>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {current.website && (
                  <a
                    href={current.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-sm"
                  >
                    🌐 Website oeffnen
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
                    {checkingWebsite ? 'Pruefe Website…' : '🔍 Alter pruefen'}
                  </button>
                )}
              </div>
              {checkResult && (
                <p className="mt-2 text-xs text-gray-600">
                  Pruefung: {checkResult}
                </p>
              )}
            </div>

            {/* Skript-Regie (aufklappbar) */}
            <div className="card">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowScript((s) => !s)}
                  className="text-sm font-medium text-gray-900 flex items-center gap-2"
                >
                  <span>{showScript ? '▾' : '▸'}</span>
                  <span>Skript-Regie</span>
                  {script && (
                    <span className="text-xs text-gray-500">
                      V{script.version}
                    </span>
                  )}
                </button>
                <Link
                  href="/dashboard/vertrieb/skript"
                  className="text-xs text-brand-blue hover:underline"
                >
                  Skript-Modul →
                </Link>
              </div>
              {showScript && (
                <div className="mt-3">
                  {script ? (
                    <ScriptRenderer script={script} />
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      Kein aktives Skript hinterlegt.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Notizen */}
            <div className="card">
              <label className="label">Notiz zu diesem Call</label>
              <textarea
                className="input min-h-[90px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Was hat der Inhaber gesagt? Was ist wichtig fuer den naechsten Kontakt?"
              />
            </div>

            {/* Erfassungs-Widget */}
            {config && (
              <div className="card space-y-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    Nach dem Anruf: Ergebnis buchen
                  </p>
                  <Link
                    href="/dashboard/vertrieb/call-log/config"
                    className="text-xs text-gray-400 hover:underline"
                  >
                    Stufen/Ergebnisse anpassen
                  </Link>
                </div>

                {/* 1) Stufe: wo ist der Call ausgestiegen */}
                <div>
                  <label className="label">
                    Wo endete der Call? (optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {config.stages
                      .sort((a, b) => a.order - b.order)
                      .map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() =>
                            setSelectedStageId((cur) =>
                              cur === s.id ? '' : s.id,
                            )
                          }
                          className={`text-xs px-2 py-1 rounded border ${
                            selectedStageId === s.id
                              ? 'border-brand-blue bg-brand-blue text-white'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                  </div>
                </div>

                {/* 2) Bei Stufe "Einwand": welcher */}
                {selectedStageId === 'einwand' && (
                  <div>
                    <label className="label">Welcher Einwand?</label>
                    <div className="flex flex-wrap gap-2">
                      {config.objections
                        .sort((a, b) => a.order - b.order)
                        .map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() =>
                              setSelectedObjectionId((cur) =>
                                cur === o.id ? '' : o.id,
                              )
                            }
                            className={`text-xs px-2 py-1 rounded border ${
                              selectedObjectionId === o.id
                                ? 'border-amber-500 bg-amber-500 text-white'
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* 3) Ergebnis */}
                <div>
                  <label className="label">Ergebnis</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {config.outcomes
                      .sort((a, b) => a.order - b.order)
                      .map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => bookOutcome(o.id)}
                          disabled={saving}
                          className={`text-left px-3 py-2 rounded-lg border transition ${
                            o.isSuccess
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                              : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-300'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <span className="text-sm font-medium">
                            {o.label}
                          </span>
                          {o.isSuccess && (
                            <span className="ml-1 text-xs">✓</span>
                          )}
                        </button>
                      ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Ein Klick → CallLog + Lead-Status + Rueckruf-Termin gesetzt, Sprung zum naechsten.
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={goToNext}
                    disabled={saving}
                    className="btn-secondary text-sm"
                  >
                    Ueberspringen (keine Erfassung)
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Sidebar */}
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
                  Naechster →
                </button>
              </div>
              <Link
                href={`/dashboard/vertrieb/leads/${current.id}`}
                className="mt-3 block text-xs text-brand-blue hover:underline"
              >
                → Volle Detail-Ansicht
              </Link>
            </div>

            <div className="card">
              <p className="text-xs uppercase text-gray-500 tracking-wider mb-2">
                Als naechstes
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

            <div className="card">
              <p className="text-xs uppercase text-gray-500 tracking-wider mb-2">
                Historie
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
      )}
    </div>
  );
}
