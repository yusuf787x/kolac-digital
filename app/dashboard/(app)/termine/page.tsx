'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { authedFetch } from '@/lib/api-client';
import Modal from '@/components/ui/Modal';
import EmailPreviewFrame from '@/components/email/EmailPreviewFrame';
import {
  MAIL_KINDS,
  MAIL_KIND_LABEL,
  type Anrede,
  type MailKind,
  type MailState,
  type Meeting,
} from '@/lib/meetings/types';

interface Data {
  meetings: Meeting[];
  settings: {
    meetingRemindersEnabled: boolean;
    meetingRemindersSince: number | null;
    meetingBookingUrl: string;
    meetingDefaultAnrede: Anrede;
  };
  state: {
    lastRunAt: number | null;
    lastRunOk: boolean | null;
    lastError: string;
    watchExpiration: number | null;
    watchError: string;
  };
  google: { connected: boolean; email: string; calendar: boolean };
  /** Zeitpunkt des Ladens, Bezug für "verschickt" vs. "eingeplant". */
  loadedAt: number;
}

const TZ = 'Europe/Berlin';
const fmtDay = (ms: number) =>
  new Date(ms).toLocaleDateString('de-DE', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
const fmtTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('de-DE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const fmtWhen = (ms: number) => `${fmtDay(ms)}, ${fmtTime(ms)}`;

function ago(ms: number, now: number): string {
  const min = Math.round((now - ms) / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  return fmtWhen(ms);
}

async function api<T = unknown>(body?: object): Promise<T> {
  const res = await authedFetch('/api/meetings', body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : {});
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? res.statusText);
  return json as T;
}

export default function TerminePage() {
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [preview, setPreview] = useState<{ meeting: Meeting; kind: MailKind } | null>(null);
  const firstSync = useRef(false);

  const load = useCallback(async () => {
    const d = await api<Omit<Data, 'loadedAt'>>();
    setData({ ...d, loadedAt: Date.now() });
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const r = await api<{ ok: boolean; busy?: boolean; error?: string }>({ action: 'sync' });
      if (!r.ok && r.error) setSyncError(r.error);
    } catch (err) {
      setSyncError((err as Error).message);
    } finally {
      await load().catch(() => undefined);
      setSyncing(false);
    }
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (err) {
        setLoadError((err as Error).message);
        return;
      }
      // Beim Öffnen einmal frisch abgleichen, die Liste steht schon da.
      if (!firstSync.current) {
        firstSync.current = true;
        await sync();
      }
    })();
  }, [load, sync]);

  const saveSettings = async (patch: object) => {
    await api({ action: 'settings', ...patch });
    await load();
  };

  const toggleAutomation = async () => {
    if (!data) return;
    const enable = !data.settings.meetingRemindersEnabled;
    const msg = enable
      ? 'Automatik einschalten? Alle Mails, die unten als „würde rausgehen“ stehen, werden jetzt eingeplant. Bestätigungen gibt es nur für Termine, die ab jetzt gebucht werden.'
      : 'Automatik ausschalten? Alle eingeplanten Erinnerungen werden storniert, bis du sie wieder einschaltest.';
    if (!confirm(msg)) return;
    setToggling(true);
    try {
      await saveSettings({ enabled: enable });
    } catch (err) {
      alert(`Speichern fehlgeschlagen: ${(err as Error).message}`);
    } finally {
      setToggling(false);
    }
  };

  const now = data?.loadedAt ?? 0;
  const upcoming = (data?.meetings ?? []).filter((m) => m.endAt >= now);
  const enabled = !!data?.settings.meetingRemindersEnabled;
  const setupProblem = data && (!data.google.connected || !data.google.calendar);

  return (
    <div>
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Termin-Erinnerungen</h1>
          <p className="mt-1 text-sm text-gray-500">
            Für Google-Meet-Termine in deinem Kalender mit externen Gästen. Absender
            yusuf@kolac-digital.de, Antworten landen bei dir.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary shrink-0"
          onClick={() => void sync()}
          disabled={syncing || !data}
          aria-busy={syncing}
        >
          {syncing ? 'Gleiche ab…' : 'Jetzt abgleichen'}
        </button>
      </header>

      {loadError && (
        <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">
          Daten konnten nicht geladen werden: {loadError}
        </div>
      )}

      {!data ? (
        !loadError && <div className="card text-sm text-gray-500">Lädt…</div>
      ) : (
        <>
          {setupProblem && (
            <div className="card mb-4 border-amber-300 bg-amber-50 text-sm text-amber-900">
              <div className="font-semibold mb-1">Kalender noch nicht verbunden</div>
              {!data.google.connected
                ? 'Google ist nicht verbunden.'
                : `Die Google-Verbindung (${data.google.email}) darf den Kalender noch nicht lesen.`}{' '}
              Unter{' '}
              <Link href="/dashboard/einstellungen" className="underline font-medium">
                Einstellungen
              </Link>{' '}
              {data.google.connected
                ? 'bei Google Drive auf „Kalender-Zugriff erlauben“ klicken.'
                : 'Google verbinden und den Kalender-Zugriff erlauben.'}
            </div>
          )}

          {!setupProblem && (syncError || data.state.lastRunOk === false) && (
            <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700" role="alert">
              <div className="font-semibold mb-1">Abgleich fehlgeschlagen</div>
              {syncError ?? data.state.lastError}
            </div>
          )}

          <section
            className={`card mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${
              enabled ? '' : 'border-amber-300 bg-amber-50'
            }`}
          >
            <div className="text-sm text-gray-700">
              <div className="font-semibold text-gray-900 mb-1">Automatik {enabled ? 'an' : 'aus'}</div>
              <div>
                Bestätigung direkt nach der Buchung · 5 Tage vorher, wenn lange im Voraus gebucht · 24 Stunden vorher · Link 1 Stunde vorher.
              </div>
              <div className="mt-1 text-gray-500">
                {enabled
                  ? 'Verschiebst oder streichst du einen Termin, plant das System die Mails neu oder storniert sie.'
                  : 'Solange sie aus ist, siehst du unten, was rausgehen würde. Es geht nichts raus.'}
              </div>
            </div>
            <button
              type="button"
              onClick={toggleAutomation}
              disabled={toggling || !!setupProblem}
              className={enabled ? 'btn-secondary shrink-0' : 'btn-primary shrink-0'}
            >
              {toggling ? 'Speichern…' : enabled ? 'Ausschalten' : 'Einschalten'}
            </button>
          </section>

          <SettingsCard data={data} onSave={saveSettings} />

          <SyncStatus state={data.state} now={now} />

          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">
            Anstehende Termine{upcoming.length ? ` (${upcoming.length})` : ''}
          </h2>

          {upcoming.length === 0 ? (
            <div className="card text-sm text-gray-500">
              {syncing
                ? 'Kalender wird abgeglichen…'
                : 'Keine Google-Meet-Termine mit externen Gästen in den nächsten fünf Wochen.'}
            </div>
          ) : (
            <div className="space-y-4">
              {upcoming.map((m) => (
                <MeetingCard
                  // Neu aufbauen, wenn die gespeicherte Zeile sich ändert.
                  key={`${m.id}:${m.note ?? ''}`}
                  meeting={m}
                  now={now}
                  defaultAnrede={data.settings.meetingDefaultAnrede}
                  onChanged={load}
                  onPreview={(kind) => setPreview({ meeting: m, kind })}
                />
              ))}
            </div>
          )}
        </>
      )}

      {preview && (
        <PreviewDialog meeting={preview.meeting} kind={preview.kind} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------

function SettingsCard({ data, onSave }: { data: Data; onSave: (patch: object) => Promise<void> }) {
  const [url, setUrl] = useState(data.settings.meetingBookingUrl);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = url.trim() !== data.settings.meetingBookingUrl;

  const run = async (patch: object) => {
    setSaving(true);
    setMsg(null);
    try {
      await onSave(patch);
      setMsg({ ok: true, text: 'Gespeichert.' });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card mb-4 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
      <form
        className="min-w-0"
        onSubmit={(e) => {
          e.preventDefault();
          void run({ bookingUrl: url });
        }}
      >
        <label htmlFor="booking-url" className="block text-sm font-medium text-gray-900">
          Buchungslink zum Verschieben <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <p className="text-xs text-gray-500 mt-0.5 mb-2">
          Deine Google-Terminbuchungsseite. Steht dann in der Bestätigung und am Vortag. Ohne Link
          heißt es nur „antworte einfach“.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="booking-url"
            type="url"
            inputMode="url"
            className="input flex-1 min-w-0"
            placeholder="https://calendar.app.google/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="submit" className="btn-secondary shrink-0" disabled={saving || !dirty}>
            {saving ? 'Speichern…' : 'Speichern'}
          </button>
        </div>
      </form>

      <div>
        <div className="text-sm font-medium text-gray-900 mb-2" id="anrede-default">
          Anrede für neue Termine
        </div>
        <AnredeSwitch
          labelledBy="anrede-default"
          value={data.settings.meetingDefaultAnrede}
          disabled={saving}
          onChange={(a) => void run({ defaultAnrede: a })}
        />
      </div>

      {msg && (
        <p
          role="status"
          className={`text-sm md:col-span-2 ${msg.ok ? 'text-green-700' : 'text-red-700'}`}
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}

function SyncStatus({ state, now }: { state: Data['state']; now: number }) {
  const live = state.watchExpiration && state.watchExpiration > now;
  return (
    <p className="text-xs text-gray-500">
      {state.lastRunAt ? `Zuletzt abgeglichen ${ago(state.lastRunAt, now)}.` : 'Noch nicht abgeglichen.'}{' '}
      {live
        ? 'Änderungen im Kalender kommen sofort an.'
        : state.watchError
          ? `Sofort-Abgleich nicht aktiv (${state.watchError}). Änderungen kommen mit dem täglichen Abgleich um 6 Uhr oder beim Öffnen dieser Seite an.`
          : 'Sofort-Abgleich startet mit dem nächsten täglichen Lauf auf der Live-Seite.'}
    </p>
  );
}

function AnredeSwitch({
  value,
  onChange,
  disabled,
  labelledBy,
}: {
  value: Anrede;
  onChange: (a: Anrede) => void;
  disabled?: boolean;
  labelledBy: string;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="inline-flex rounded-lg border border-gray-300 p-0.5 bg-white">
      {(['du', 'sie'] as const).map((a) => (
        <button
          key={a}
          type="button"
          role="radio"
          aria-checked={value === a}
          disabled={disabled}
          onClick={() => value !== a && onChange(a)}
          className={`min-h-[36px] px-4 text-sm rounded-md transition-colors ${
            value === a ? 'bg-gray-900 text-white font-medium' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {a === 'du' ? 'Du' : 'Sie'}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------

const SOURCE_LABEL: Record<string, string> = {
  kunde: 'Kunde',
  lead: 'Lead',
  outreach: 'Outreach',
  google: 'Nur Kalender',
};

function statusView(s: MailState | undefined, now: number): { chip: string; tone: string; detail: string } {
  if (!s) return { chip: 'Offen', tone: 'bg-gray-100 text-gray-600', detail: 'Wird beim nächsten Abgleich geplant' };
  const at = s.sendAt ? fmtWhen(s.sendAt) : '';
  switch (s.status) {
    case 'scheduled':
      if ((s.sendAt ?? 0) <= now) return { chip: 'Verschickt', tone: 'bg-green-100 text-green-800', detail: at };
      return { chip: 'Eingeplant', tone: 'bg-blue-100 text-blue-800', detail: `geht raus ${at}` };
    case 'sent':
      return { chip: 'Verschickt', tone: 'bg-green-100 text-green-800', detail: at };
    case 'planned':
      return {
        chip: 'Würde rausgehen',
        tone: 'bg-amber-100 text-amber-900',
        detail: `${at}${s.reason ? ` · ${s.reason}` : ''}`,
      };
    case 'skipped':
      return { chip: 'Entfällt', tone: 'bg-gray-100 text-gray-600', detail: s.reason ?? '' };
    case 'off':
      return { chip: 'Aus', tone: 'bg-gray-100 text-gray-600', detail: s.reason ?? '' };
    case 'failed':
      return { chip: 'Fehler', tone: 'bg-red-100 text-red-800', detail: s.error ?? 'Versand fehlgeschlagen' };
  }
}

function MeetingCard({
  meeting: m,
  now,
  defaultAnrede,
  onChanged,
  onPreview,
}: {
  meeting: Meeting;
  now: number;
  defaultAnrede: Anrede;
  onChanged: () => Promise<void>;
  onPreview: (kind: MailKind) => void;
}) {
  const [note, setNote] = useState(m.note ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inactive = m.status !== 'active' || m.disabled;
  const noteDirty = note.trim() !== (m.note ?? '').trim();
  const dayBeforeDone = m.mails.dayBefore?.status === 'sent' ||
    (m.mails.dayBefore?.status === 'scheduled' && (m.mails.dayBefore.sendAt ?? 0) <= now);

  const update = async (key: string, patch: object) => {
    setBusy(key);
    setError(null);
    try {
      const r = await api<{ ok: boolean; error?: string }>({ action: 'update', id: m.id, ...patch });
      if (!r.ok && r.error) setError(r.error);
      await onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const toggleDisabled = () => {
    if (!m.disabled && !confirm('Für diesen Termin keine Erinnerungen mehr schicken? Eingeplante Mails werden storniert.')) return;
    void update('disabled', { disabled: !m.disabled });
  };

  return (
    <article className={`card ${inactive ? 'opacity-75' : ''}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900">
            {fmtDay(m.startAt)} · {fmtTime(m.startAt)}–{fmtTime(m.endAt)} Uhr
            {m.status === 'cancelled' && <span className="ml-2 text-red-700">Abgesagt</span>}
            {m.status === 'declined' && <span className="ml-2 text-red-700">Gast hat abgesagt</span>}
            {m.disabled && m.status === 'active' && <span className="ml-2 text-gray-500">Erinnerungen aus</span>}
          </div>
          {m.title && <div className="text-sm text-gray-600 mt-0.5 break-words">{m.title}</div>}
          {m.selfInvited !== undefined && (
            <div className="text-xs text-gray-500 mt-0.5">
              {m.selfInvited ? 'Selbst eingeladen' : 'Über die Buchungsseite gebucht'}
            </div>
          )}
          <ul className="mt-2 space-y-1">
            {m.guests.map((g) => (
              <li key={g.email} className="text-sm text-gray-800 break-words">
                <span className="font-medium">{g.name || 'Name unbekannt'}</span>
                {g.company && <span className="text-gray-600"> · {g.company}</span>}
                <span className="text-gray-500"> · {g.email}</span>
                <span className="ml-2 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 align-middle">
                  {SOURCE_LABEL[g.source]}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {m.calendarUrl && (
            <a href={m.calendarUrl} target="_blank" rel="noreferrer" className="btn-secondary text-sm">
              Im Kalender
            </a>
          )}
          {m.status === 'active' && (
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={toggleDisabled}
              disabled={!!busy}
              aria-busy={busy === 'disabled'}
            >
              {busy === 'disabled' ? 'Speichern…' : m.disabled ? 'Erinnerungen wieder an' : 'Für diesen Termin aus'}
            </button>
          )}
        </div>
      </div>

      <ul className="mt-4 divide-y divide-gray-100 border-y border-gray-100">
        {MAIL_KINDS.map((kind) => {
          const v = statusView(m.mails[kind], now);
          return (
            <li key={kind} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex items-center gap-2 sm:w-64 shrink-0">
                <span className="text-sm text-gray-900 w-32">{MAIL_KIND_LABEL[kind]}</span>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${v.tone}`}>{v.chip}</span>
              </div>
              <span className="text-sm text-gray-500 flex-1 min-w-0 break-words">{v.detail}</span>
              {m.guests.length > 0 && (
                <button
                  type="button"
                  className="self-start sm:self-auto text-sm text-blue-700 hover:underline min-h-[36px]"
                  onClick={() => onPreview(kind)}
                >
                  Vorschau
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {m.status === 'active' && !m.disabled && (
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
          <form
            className="min-w-0"
            onSubmit={(e) => {
              e.preventDefault();
              void update('note', { note });
            }}
          >
            <label htmlFor={`note-${m.id}`} className="block text-sm font-medium text-gray-900">
              Persönliche Zeile am Vortag <span className="font-normal text-gray-500">(optional)</span>
            </label>
            <textarea
              id={`note-${m.id}`}
              className="input mt-1 w-full"
              rows={2}
              maxLength={600}
              placeholder="z. B. Ich habe mir eure Website schon angeschaut und bringe zwei Ideen mit."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={dayBeforeDone}
            />
            <div className="mt-2 flex items-center gap-3">
              <button type="submit" className="btn-secondary text-sm" disabled={!noteDirty || !!busy}>
                {busy === 'note' ? 'Speichern…' : 'Zeile speichern'}
              </button>
              {dayBeforeDone && <span className="text-xs text-gray-500">Die Mail am Vortag ist schon raus.</span>}
            </div>
          </form>
          <div>
            <div className="text-sm font-medium text-gray-900 mb-2" id={`anrede-${m.id}`}>
              Anrede
            </div>
            <AnredeSwitch
              labelledBy={`anrede-${m.id}`}
              value={m.anrede ?? defaultAnrede}
              disabled={!!busy}
              onChange={(a) => void update('anrede', { anrede: a })}
            />
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------

function PreviewDialog({ meeting, kind, onClose }: { meeting: Meeting; kind: MailKind; onClose: () => void }) {
  const [mail, setMail] = useState<{ subject: string; from: string; to: string; html: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    api<{ subject: string; from: string; to: string; html: string }>({ action: 'preview', id: meeting.id, kind })
      .then(setMail)
      .catch((err) => setError((err as Error).message));
  }, [meeting.id, kind]);

  const sendTest = async () => {
    setTesting(true);
    setNotice(null);
    setError(null);
    try {
      const r = await api<{ sentTo: string }>({ action: 'test', id: meeting.id, kind });
      setNotice(`Testmail ist an ${r.sentTo} raus. Der Gast hat nichts bekommen.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal open onClose={() => !testing && onClose()} title={`${MAIL_KIND_LABEL[kind]}: Vorschau`} maxWidth="max-w-3xl">
      <div className="space-y-4">
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {!mail && !error && <div className="text-sm text-gray-500">Lädt…</div>}
        {mail && <EmailPreviewFrame html={mail.html} from={mail.from} to={mail.to} subject={mail.subject} />}
        {notice && (
          <div role="status" aria-live="polite" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            {notice}
          </div>
        )}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={testing}>
            Schließen
          </button>
          <button type="button" className="btn-secondary" onClick={sendTest} disabled={testing || !mail} aria-busy={testing}>
            {testing ? 'Sende Test…' : 'Testmail an mich'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
