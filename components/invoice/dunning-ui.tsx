'use client';

import { useState } from 'react';
import { authedFetch } from '@/lib/api-client';
import { pauseDunning } from '@/lib/firestore';
import {
  berlinDay,
  DUNNING_STAGES,
  formatDay,
  type DunningState,
} from '@/lib/dunning';
import type { DunningEvent, DunningStage } from '@/lib/types';
import { formatEUR } from '@/lib/utils';

/** 'Mo., 03.11.2026' bzw. 'heute' */
export function dayLabel(day: string, today: string): string {
  if (day === today) return 'heute';
  const wd = new Date(`${day}T12:00:00Z`).toLocaleDateString('de-DE', {
    weekday: 'short',
    timeZone: 'UTC',
  });
  return `${wd} ${formatDay(day)}`;
}

/** Kurzbeschreibung des Zustands für Listen und Detailseite. */
export function describeState(state: DunningState, today: string): string {
  switch (state.kind) {
    case 'none':
      return state.reason === 'Bezahlt'
        ? 'Bezahlt, keine Erinnerungen nötig.'
        : state.reason === 'Lastschrift'
          ? 'Lastschrift, keine Erinnerungen.'
          : 'Entwurf, noch keine Erinnerungen.';
    case 'legacy':
      return `Vor Start der Automatik gestellt (fällig ${formatDay(state.dueDay)}). Läuft erst mit, wenn du sie startest.`;
    case 'paused':
      return `Pausiert${state.until ? ` bis ${formatDay(state.until)}` : ''}${state.reason ? `: ${state.reason}` : ''}`;
    case 'scheduled':
      return state.day < today
        ? `${DUNNING_STAGES[state.stage].label} war für ${formatDay(state.day)} geplant und geht beim nächsten Lauf raus.`
        : `${DUNNING_STAGES[state.stage].label} geht ${dayLabel(state.day, today)} raus.`;
    case 'no_email':
      return `${DUNNING_STAGES[state.stage].label} wäre ${dayLabel(state.day, today)} dran, aber beim Kunden fehlt die E-Mail-Adresse.`;
    case 'final':
      return state.expired
        ? `Letzte Frist am ${state.deadlineDay ? formatDay(state.deadlineDay) : '?'} abgelaufen. Inkasso oder Klärung entscheidest du.`
        : `Alle drei Mails sind raus. Letzte Frist: ${state.deadlineDay ? formatDay(state.deadlineDay) : '?'}.`;
  }
}

export function eventLabel(e: DunningEvent): string {
  const stage = e.stage ? DUNNING_STAGES[e.stage].label : '';
  switch (e.type) {
    case 'sent':
      return `${stage} verschickt an ${e.to ?? '?'}${e.trigger === 'manual' ? ' (von Hand)' : ''}${e.openAmount !== undefined ? `, offen ${formatEUR(e.openAmount)}` : ''}${e.deadline ? `, Frist ${formatDay(berlinDay(e.deadline.toMillis()))}` : ''}`;
    case 'failed':
      return `${stage} fehlgeschlagen: ${e.note ?? 'unbekannter Fehler'}`;
    case 'paused':
      return `Pausiert${e.note ? `: ${e.note}` : ''}`;
    case 'resumed':
      return 'Fortgesetzt';
    case 'started':
      return 'In die Automatik genommen';
    case 'deadline_expired':
      return 'Letzte Frist abgelaufen, Hinweis an dich verschickt';
  }
}

export function eventTime(e: DunningEvent): string {
  return e.at.toDate().toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Fragt nach und verschickt die Stufe sofort. true = verschickt. */
export async function confirmAndSendNow(opts: {
  invoiceId: string;
  invoiceNumber: string;
  stage: DunningStage;
  email: string;
}): Promise<boolean> {
  const label = DUNNING_STAGES[opts.stage].label;
  if (
    !confirm(
      `${label} zur Rechnung ${opts.invoiceNumber} jetzt an ${opts.email} senden?\n\nAbsender: buchhaltung@kolac-digital.de (Marci, Buchhaltung)`,
    )
  )
    return false;
  const res = await authedFetch(`/api/invoices/${opts.invoiceId}/dunning`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: opts.stage }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    alert(`Nicht verschickt: ${body?.error ?? res.statusText}`);
    return false;
  }
  return true;
}

export function PauseDialog({
  invoiceId,
  invoiceNumber,
  onClose,
  onPaused,
}: {
  invoiceId: string;
  invoiceNumber: string;
  onClose: () => void;
  onPaused: () => void;
}) {
  const [reason, setReason] = useState('');
  const [until, setUntil] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason.trim()) {
      setError('Bitte kurz den Grund notieren, damit du ihn später noch weißt.');
      return;
    }
    let untilDate: Date | null = null;
    if (until) {
      const [y, m, d] = until.split('-').map(Number);
      untilDate = new Date(y, m - 1, d, 12);
    }
    setSaving(true);
    setError(null);
    try {
      await pauseDunning(invoiceId, reason.trim(), untilDate);
      onPaused();
    } catch (err) {
      setError(`Speichern fehlgeschlagen: ${(err as Error).message}`);
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 sm:p-6 modal-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Erinnerungen für {invoiceNumber} pausieren
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Solange pausiert ist, geht automatisch nichts an den Kunden raus.
        </p>
        <div className="space-y-3">
          <div>
            <label className="label">Grund *</label>
            <input
              type="text"
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="z.B. Kunde zahlt nach Abnahme, Ratenzahlung vereinbart"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Pausieren bis (optional)</label>
            <input
              type="date"
              className="input"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              Leer lassen = bis du auf „Fortsetzen“ klickst. Mit Datum geht es
              am Tag danach von allein weiter.
            </p>
          </div>
        </div>
        {error && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary" disabled={saving}>
            Abbrechen
          </button>
          <button onClick={submit} className="btn-primary" disabled={saving}>
            {saving ? 'Speichern…' : 'Pausieren'}
          </button>
        </div>
      </div>
    </div>
  );
}
