'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  getSettings,
  listCustomers,
  listInvoices,
  resumeDunning,
  setDunningEnabled,
  startDunning,
} from '@/lib/firestore';
import {
  berlinDay,
  computeDunningState,
  DUNNING_STAGES,
  formatDay,
  invoiceOpenAmount,
  todayBerlin,
  type DunningState,
} from '@/lib/dunning';
import type { Customer, DunningEvent, Invoice, Settings } from '@/lib/types';
import { formatEUR } from '@/lib/utils';
import SensitiveValue from '@/components/ui/SensitiveValue';
import {
  confirmAndSendNow,
  dayLabel,
  eventLabel,
  eventTime,
  PauseDialog,
} from '@/components/invoice/dunning-ui';

interface Entry {
  invoice: Invoice;
  customer: Customer | null;
  state: DunningState;
  open: number;
}

export default function MahnwesenPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Map<string, Customer>>(new Map());
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [pauseFor, setPauseFor] = useState<Invoice | null>(null);

  const load = useCallback(async () => {
    const [inv, cust, s] = await Promise.all([
      listInvoices(),
      listCustomers(),
      getSettings(),
    ]);
    setInvoices(inv);
    setCustomers(new Map(cust.map((c) => [c.id, c])));
    setSettings(s);
  }, []);

  useEffect(() => {
    load()
      .catch((err) => {
        console.error(err);
        setError('Daten konnten nicht geladen werden.');
      })
      .finally(() => setLoading(false));
  }, [load]);

  const today = todayBerlin();

  const entries = useMemo<Entry[]>(() => {
    if (!settings) return [];
    return invoices.map((invoice) => {
      const customer = customers.get(invoice.customerId) ?? null;
      return {
        invoice,
        customer,
        state: computeDunningState(invoice, {
          customerEmail: customer?.email,
          startDate: settings.dunningStartDate ?? null,
          today,
        }),
        open: invoiceOpenAmount(invoice),
      };
    });
  }, [invoices, customers, settings, today]);

  const upcoming = entries
    .filter((e) => e.state.kind === 'scheduled' || e.state.kind === 'no_email')
    .sort((a, b) => dayOf(a.state).localeCompare(dayOf(b.state)));
  const final = entries
    .filter((e) => e.state.kind === 'final')
    .sort((a, b) => Number(isExpired(b.state)) - Number(isExpired(a.state)));
  const paused = entries.filter((e) => e.state.kind === 'paused');
  const legacy = entries
    .filter((e) => e.state.kind === 'legacy')
    .sort((a, b) => a.invoice.dueDate.toMillis() - b.invoice.dueDate.toMillis());

  const history = useMemo(() => {
    const all: Array<{ e: DunningEvent; entry: Entry }> = [];
    for (const entry of entries) {
      for (const e of entry.invoice.dunning?.events ?? []) all.push({ e, entry });
    }
    return all.sort((a, b) => b.e.at.toMillis() - a.e.at.toMillis()).slice(0, 40);
  }, [entries]);

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await fn();
      await load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const toggleAutomation = async () => {
    if (!settings) return;
    const enable = !settings.dunningEnabled;
    const msg = enable
      ? settings.dunningStartDate
        ? 'Automatik wieder einschalten? Geplante Mails gehen ab dem nächsten täglichen Lauf raus.'
        : 'Automatik einschalten? Alle Rechnungen, die ab heute gestellt werden, bekommen automatisch Erinnerungen. Bereits offene Rechnungen bleiben außen vor, bis du sie einzeln startest.'
      : 'Automatik ausschalten? Bis du sie wieder einschaltest, geht keine Erinnerung automatisch raus.';
    if (!confirm(msg)) return;
    setToggling(true);
    try {
      setSettings(await setDunningEnabled(enable));
    } catch (err) {
      alert(`Speichern fehlgeschlagen: ${(err as Error).message}`);
    } finally {
      setToggling(false);
    }
  };

  const enabled = !!settings?.dunningEnabled;

  return (
    <div>
      <header className="mb-6">
        <Link
          href="/dashboard/rechnungen"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu Rechnungen
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">Zahlungserinnerungen</h1>
        <p className="mt-1 text-sm text-gray-500">
          Absender buchhaltung@kolac-digital.de, unterschrieben von Marci,
          Buchhaltung. Jeden Morgen um ca. 8 bis 9 Uhr.
        </p>
      </header>

      {error && (
        <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">{error}</div>
      )}

      {loading || !settings ? (
        !error && <div className="card text-sm text-gray-500">Lädt…</div>
      ) : (
        <>
          <section
            className={`card mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${
              enabled ? '' : 'border-amber-300 bg-amber-50'
            }`}
          >
            <div className="text-sm text-gray-700">
              <div className="font-semibold text-gray-900 mb-1">
                Automatik {enabled ? 'an' : 'aus'}
              </div>
              <div>
                Tag 0: {DUNNING_STAGES[1].label} · Tag 5: {DUNNING_STAGES[2].label}{' '}
                (Frist 7 Tage) · Tag 14: {DUNNING_STAGES[3].label} (Frist 7 Tage,
                Inkasso angekündigt). Wochenenden rücken auf Montag.
              </div>
              <div className="mt-1 text-gray-500">
                Geht nur an offene Rechnungen. Sobald du die Zahlung erfasst,
                stoppt alles. Was am nächsten Werktag rausgeht, bekommst du
                morgens vorab per Mail.
                {settings.dunningStartDate &&
                  ` Automatisch dabei: alle Rechnungen, die ab ${formatDay(berlinDay(settings.dunningStartDate.toMillis()))} gestellt wurden.`}
              </div>
            </div>
            <button
              onClick={toggleAutomation}
              disabled={toggling}
              className={enabled ? 'btn-secondary shrink-0' : 'btn-primary shrink-0'}
            >
              {toggling ? 'Speichern…' : enabled ? 'Ausschalten' : 'Einschalten'}
            </button>
          </section>

          <Section
            title="Als Nächstes"
            hint={enabled ? undefined : 'Automatik ist aus: das hier würde nach dem Einschalten passieren.'}
            empty="Gerade ist keine Erinnerung geplant."
            count={upcoming.length}
          >
            {upcoming.map((entry) => {
              const s = entry.state as Extract<DunningState, { kind: 'scheduled' | 'no_email' }>;
              const busy = busyId === entry.invoice.id;
              return (
                <Row key={entry.invoice.id} entry={entry}>
                  <div className="text-sm">
                    <span className="font-medium text-gray-900">
                      {DUNNING_STAGES[s.stage].label}
                    </span>{' '}
                    <span className={s.day <= today ? 'text-orange-700 font-medium' : 'text-gray-600'}>
                      {s.day < today ? `seit ${formatDay(s.day)} fällig` : dayLabel(s.day, today)}
                    </span>
                    {s.kind === 'no_email' && (
                      <div className="text-xs text-amber-800">
                        Keine E-Mail beim Kunden hinterlegt
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary text-xs"
                      disabled={busy}
                      onClick={() => setPauseFor(entry.invoice)}
                    >
                      Pausieren…
                    </button>
                    {s.kind === 'scheduled' && entry.customer?.email && (
                      <button
                        className="btn-secondary text-xs"
                        disabled={busy}
                        onClick={() =>
                          act(entry.invoice.id, () =>
                            confirmAndSendNow({
                              invoiceId: entry.invoice.id,
                              invoiceNumber: entry.invoice.invoiceNumber ?? '',
                              stage: s.stage,
                              email: entry.customer!.email,
                            }),
                          )
                        }
                      >
                        {busy ? 'Moment…' : 'Jetzt senden'}
                      </button>
                    )}
                  </div>
                </Row>
              );
            })}
          </Section>

          {final.length > 0 && (
            <Section title="Letzte Mahnung verschickt" count={final.length}>
              {final.map((entry) => {
                const s = entry.state as Extract<DunningState, { kind: 'final' }>;
                return (
                  <Row key={entry.invoice.id} entry={entry}>
                    <div className="text-sm">
                      {s.expired ? (
                        <span className="text-red-700 font-medium">
                          Frist {s.deadlineDay ? formatDay(s.deadlineDay) : ''} abgelaufen,
                          Inkasso entscheiden
                        </span>
                      ) : (
                        <span className="text-gray-700">
                          Frist bis {s.deadlineDay ? formatDay(s.deadlineDay) : '?'}
                        </span>
                      )}
                    </div>
                    <div />
                  </Row>
                );
              })}
            </Section>
          )}

          {paused.length > 0 && (
            <Section title="Pausiert" count={paused.length}>
              {paused.map((entry) => {
                const s = entry.state as Extract<DunningState, { kind: 'paused' }>;
                return (
                  <Row key={entry.invoice.id} entry={entry}>
                    <div className="text-sm text-gray-700">
                      {s.reason || 'ohne Grund'}
                      <div className="text-xs text-gray-500">
                        {s.until ? `bis ${formatDay(s.until)}` : 'bis du fortsetzt'} · danach{' '}
                        {DUNNING_STAGES[s.nextStage].label}
                      </div>
                    </div>
                    <button
                      className="btn-secondary text-xs"
                      disabled={busyId === entry.invoice.id}
                      onClick={() => act(entry.invoice.id, () => resumeDunning(entry.invoice.id))}
                    >
                      Fortsetzen
                    </button>
                  </Row>
                );
              })}
            </Section>
          )}

          {legacy.length > 0 && (
            <Section
              title="Ältere offene Rechnungen"
              hint="Wurden vor dem Start der Automatik gestellt und laufen deshalb nicht von allein mit. Starten heißt: Zahlungserinnerung beim nächsten Lauf, danach Mahnung und letzte Mahnung nach Plan."
              count={legacy.length}
            >
              {legacy.map((entry) => (
                <Row key={entry.invoice.id} entry={entry}>
                  <div className="text-sm text-gray-600">
                    fällig seit {formatDay(berlinDay(entry.invoice.dueDate.toMillis()))}
                  </div>
                  <button
                    className="btn-secondary text-xs"
                    disabled={busyId === entry.invoice.id}
                    onClick={() => {
                      if (
                        confirm(
                          `Erinnerungen für ${entry.invoice.invoiceNumber} starten? Die Zahlungserinnerung geht beim nächsten täglichen Lauf an ${entry.customer?.email || '(keine E-Mail hinterlegt)'}.`,
                        )
                      )
                        act(entry.invoice.id, () => startDunning(entry.invoice.id));
                    }}
                  >
                    Erinnerungen starten
                  </button>
                </Row>
              ))}
            </Section>
          )}

          <Section title="Verlauf" empty="Noch keine Erinnerungen verschickt." count={history.length}>
            {history.map(({ e, entry }, i) => (
              <div
                key={i}
                className="px-4 py-2.5 text-sm flex flex-col sm:flex-row sm:gap-4"
              >
                <span className="text-gray-500 tabular-nums shrink-0 sm:w-36">{eventTime(e)}</span>
                <Link
                  href={`/dashboard/rechnungen/${entry.invoice.id}`}
                  className="font-medium text-brand-blue hover:underline shrink-0 sm:w-28"
                >
                  {entry.invoice.invoiceNumber}
                </Link>
                <span className="text-gray-600 shrink-0 sm:w-40 truncate">
                  {entry.customer?.company ?? ''}
                </span>
                <span className={e.type === 'failed' ? 'text-red-700' : 'text-gray-800'}>
                  {eventLabel(e)}
                </span>
              </div>
            ))}
          </Section>
        </>
      )}

      {pauseFor && (
        <PauseDialog
          invoiceId={pauseFor.id}
          invoiceNumber={pauseFor.invoiceNumber ?? ''}
          onClose={() => setPauseFor(null)}
          onPaused={async () => {
            setPauseFor(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function dayOf(s: DunningState): string {
  return s.kind === 'scheduled' || s.kind === 'no_email' ? s.day : '';
}

function isExpired(s: DunningState): boolean {
  return s.kind === 'final' && s.expired;
}

function Section({
  title,
  hint,
  empty,
  count,
  children,
}: {
  title: string;
  hint?: string;
  empty?: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1">
        {title}
        {count > 0 && <span className="ml-2 text-sm font-normal text-gray-500">{count}</span>}
      </h2>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
      <div className="card p-0 divide-y divide-gray-100 mt-2">
        {count === 0 ? <div className="px-4 py-3 text-sm text-gray-500">{empty}</div> : children}
      </div>
    </section>
  );
}

/** Zeile: Rechnung, Kunde, offener Betrag links; Zustand + Aktionen rechts. */
function Row({ entry, children }: { entry: Entry; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
      <div className="md:w-64 shrink-0">
        <Link
          href={`/dashboard/rechnungen/${entry.invoice.id}`}
          className="font-medium text-brand-blue hover:underline"
        >
          {entry.invoice.invoiceNumber}
        </Link>
        <div className="text-sm text-gray-700 truncate">{entry.customer?.company ?? '—'}</div>
      </div>
      <div className="md:w-28 shrink-0 text-sm tabular-nums text-gray-900">
        <SensitiveValue>{formatEUR(entry.open)}</SensitiveValue>
        <div className="text-xs text-gray-500">offen</div>
      </div>
      <div className="flex-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {children}
      </div>
    </div>
  );
}
