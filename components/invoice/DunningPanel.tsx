'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSettings, resumeDunning, startDunning } from '@/lib/firestore';
import {
  computeDunningState,
  DUNNING_STAGES,
  formatDay,
  nextManualStage,
  sentDayByStage,
  todayBerlin,
} from '@/lib/dunning';
import type { Customer, DunningStage, Invoice, Settings } from '@/lib/types';
import { invoiceRecipients } from '@/lib/invoice-recipients';
import {
  DunningMailDialog,
  dayLabel,
  describeState,
  eventLabel,
  eventTime,
  PauseDialog,
} from './dunning-ui';

const STAGES: DunningStage[] = [1, 2, 3];

export default function DunningPanel({
  invoice,
  customer,
  onChanged,
}: {
  invoice: Invoice;
  customer: Customer | null;
  onChanged: () => Promise<void> | void;
}) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  /** Offene Mail-Vorschau: welche Stufe, und ob von dort gesendet werden darf. */
  const [mailDialog, setMailDialog] = useState<{ stage: DunningStage; canSend: boolean } | null>(null);

  useEffect(() => {
    getSettings().then(setSettings).catch(console.error);
  }, []);

  const today = todayBerlin();
  const recipients = invoiceRecipients(customer).join(', ');
  const state = computeDunningState(invoice, {
    customerEmail: recipients,
    startDate: settings?.dunningStartDate ?? null,
    today,
  });
  const events = (invoice.dunning?.events ?? [])
    .slice()
    .sort((a, b) => b.at.toMillis() - a.at.toMillis());

  // Entwürfe und Lastschriften brauchen den Abschnitt nicht. Bezahlte nur,
  // wenn es einen Verlauf gibt.
  if (state.kind === 'none' && (state.reason !== 'Bezahlt' || events.length === 0)) {
    return null;
  }

  const sentDays = sentDayByStage(invoice);
  const manualStage = state.kind === 'none' ? null : nextManualStage(invoice);
  const automationOff = settings !== null && !settings.dunningEnabled;
  const invoiceNumber = invoice.invoiceNumber ?? '';

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await onChanged();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** Versandtag für die Vorschau: verschickt, geplant oder heute. */
  const previewDay = (s: DunningStage): string => {
    if (sentDays[s]) return sentDays[s]!;
    if ((state.kind === 'scheduled' || state.kind === 'no_email') && state.stage === s) {
      return state.day < today ? today : state.day;
    }
    return today;
  };

  const stageStatus = (s: DunningStage): string => {
    if (sentDays[s]) return `verschickt am ${formatDay(sentDays[s]!)}`;
    if ((state.kind === 'scheduled' || state.kind === 'no_email') && state.stage === s) {
      return `geplant: ${dayLabel(state.day, today)}`;
    }
    if (state.kind === 'paused' && state.nextStage === s) return 'pausiert';
    return '';
  };

  return (
    <section className="card mb-6">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <h2 className="text-base font-semibold text-gray-900">Zahlungserinnerungen</h2>
        <Link
          href="/dashboard/rechnungen/mahnwesen"
          className="text-sm text-brand-blue hover:underline"
        >
          Alle Erinnerungen →
        </Link>
      </div>

      <p
        className={`text-sm ${
          state.kind === 'final' && state.expired
            ? 'text-red-700 font-medium'
            : state.kind === 'no_email'
              ? 'text-amber-800'
              : 'text-gray-700'
        }`}
      >
        {describeState(state, today)}
      </p>
      {automationOff && state.kind !== 'none' && state.kind !== 'final' && (
        <p className="mt-1 text-xs text-amber-800">
          Die Automatik ist gerade ausgeschaltet. Geplante Mails gehen erst
          raus, wenn du sie in der Übersicht einschaltest.
        </p>
      )}

      {state.kind !== 'none' && (
        <ol className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {STAGES.map((s) => {
            const status = stageStatus(s);
            const done = !!sentDays[s];
            return (
              <li
                key={s}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  done ? 'border-green-200 bg-green-50' : 'border-gray-200'
                }`}
              >
                <div className="font-medium text-gray-900">
                  {s}. {DUNNING_STAGES[s].label}
                </div>
                <div className="text-xs text-gray-500">
                  Tag {DUNNING_STAGES[s].offsetDays} nach Fälligkeit
                  {status && <span className="text-gray-800"> · {status}</span>}
                </div>
                <button
                  type="button"
                  className="mt-1 text-xs font-medium text-brand-blue hover:underline"
                  onClick={() => setMailDialog({ stage: s, canSend: false })}
                >
                  Vorschau
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {state.kind !== 'none' && (
        <div className="mt-4 flex flex-wrap gap-2">
          {state.kind === 'paused' ? (
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() => run(() => resumeDunning(invoice.id))}
            >
              Fortsetzen
            </button>
          ) : state.kind !== 'final' ? (
            <button
              className="btn-secondary"
              disabled={busy}
              onClick={() => setPauseOpen(true)}
            >
              Pausieren…
            </button>
          ) : null}
          {state.kind === 'legacy' && (
            <button
              className="btn-secondary"
              disabled={busy}
              onClick={() => {
                if (
                  confirm(
                    'Diese Rechnung in die Automatik nehmen? Die Zahlungserinnerung geht beim nächsten täglichen Lauf raus, danach Mahnung und letzte Mahnung nach Plan.',
                  )
                )
                  run(() => startDunning(invoice.id));
              }}
            >
              Erinnerungen starten
            </button>
          )}
          {manualStage && recipients && (
            <button
              className="btn-secondary"
              disabled={busy}
              onClick={() => setMailDialog({ stage: manualStage, canSend: true })}
            >
              {busy ? 'Moment…' : `${DUNNING_STAGES[manualStage].label} jetzt senden`}
            </button>
          )}
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-5 border-t border-gray-100 pt-3">
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Verlauf</h3>
          <ul className="space-y-1.5 text-sm">
            {events.map((e, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-gray-500 tabular-nums shrink-0">{eventTime(e)}</span>
                <span className={e.type === 'failed' ? 'text-red-700' : 'text-gray-800'}>
                  {eventLabel(e)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mailDialog && (
        <DunningMailDialog
          invoice={invoice}
          customer={customer}
          stage={mailDialog.stage}
          sendDay={mailDialog.canSend ? today : previewDay(mailDialog.stage)}
          canSend={mailDialog.canSend}
          onClose={() => setMailDialog(null)}
          onSent={() => run(async () => {})}
        />
      )}

      {pauseOpen && (
        <PauseDialog
          invoiceId={invoice.id}
          invoiceNumber={invoiceNumber}
          onClose={() => setPauseOpen(false)}
          onPaused={async () => {
            setPauseOpen(false);
            await onChanged();
          }}
        />
      )}
    </section>
  );
}
