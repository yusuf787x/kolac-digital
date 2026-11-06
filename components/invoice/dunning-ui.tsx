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
import type { Customer, DunningEvent, DunningStage, Invoice } from '@/lib/types';
import { dunningEmailForInvoice } from '@/lib/dunning-emails';
import { invoiceRecipients } from '@/lib/invoice-recipients';
import Modal from '@/components/ui/Modal';
import EmailPreviewFrame from '@/components/email/EmailPreviewFrame';
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

/**
 * Vorschau einer Mahnstufe mit echten Rechnungsdaten. Mit „Testmail an
 * mich“ geht exakt diese Mail (mit PDF) an Yusuf. Ist `canSend` gesetzt,
 * lässt sich die Stufe hier auch sofort an den Kunden schicken.
 */
export function DunningMailDialog({
  invoice,
  customer,
  stage,
  sendDay,
  canSend,
  onClose,
  onSent,
}: {
  invoice: Invoice;
  customer: Customer | null;
  stage: DunningStage;
  /** Tag, an dem die Mail rausgeht bzw. rausging. Bestimmt die Frist. */
  sendDay: string;
  canSend: boolean;
  onClose: () => void;
  onSent?: () => Promise<void> | void;
}) {
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const recipients = invoiceRecipients(customer);
  const label = DUNNING_STAGES[stage].label;
  const mail = dunningEmailForInvoice({ invoice, customer, stage, sendDay, hasAttachment: true });
  const busy = sending || testing;

  const post = async (test: boolean) => {
    setNotice(null);
    if (test) setTesting(true);
    else setSending(true);
    try {
      const res = await authedFetch(`/api/invoices/${invoice.id}/dunning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, test }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? res.statusText);
      if (test) {
        setNotice({
          kind: 'ok',
          text: `Testmail mit PDF ist an ${body.sentTo ?? 'dich'} raus. Der Kunde hat nichts bekommen.`,
        });
      } else {
        await onSent?.();
        onClose();
      }
    } catch (err) {
      setNotice({ kind: 'error', text: `${test ? 'Testmail' : label} nicht verschickt: ${(err as Error).message}` });
    } finally {
      setTesting(false);
      setSending(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => !busy && onClose()}
      title={`${label} zur Rechnung ${invoice.invoiceNumber ?? ''}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          {canSend
            ? 'So kommt die Mail beim Kunden an. Absender ist die Buchhaltung, die Rechnung hängt als PDF dran.'
            : `Vorschau mit den Daten dieser Rechnung, Versandtag ${formatDay(sendDay)}. Absender ist die Buchhaltung.`}
        </p>
        <EmailPreviewFrame
          html={mail.html}
          from={mail.from}
          to={recipients.join(', ') || 'keine E-Mail beim Kunden hinterlegt'}
          subject={mail.subject}
          attachment="Rechnung als PDF"
        />
        {notice && (
          <div
            role="status"
            aria-live="polite"
            className={`rounded-lg border px-3 py-2 text-sm ${
              notice.kind === 'ok'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {notice.text}
          </div>
        )}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            {canSend ? 'Abbrechen' : 'Schließen'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => post(true)}
            disabled={busy}
            aria-busy={testing}
          >
            {testing ? 'Sende Test…' : 'Testmail an mich'}
          </button>
          {canSend && recipients.length > 0 && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => post(false)}
              disabled={busy}
              aria-busy={sending}
            >
              {sending ? 'Sende…' : `${label} jetzt senden`}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
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
