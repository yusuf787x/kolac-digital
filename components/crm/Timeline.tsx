'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';
import { createActivity, deleteActivity, updateActivity } from '@/lib/firestore';
import type { Activity, Contact } from '@/lib/types';
import {
  ACTIVITY_COMPOSER_TYPES,
  personName,
  TIMELINE_FILTERS,
  type TimelineItem,
} from '@/lib/crm';

export type MailState = 'loading' | 'ok' | 'scope_missing' | 'not_connected' | 'error';

interface Props {
  customerId: string;
  contacts: Contact[];
  items: TimelineItem[];
  mailState: MailState;
  onChanged: () => void;
}

const PAGE = 30;

function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatWhen(ms: number): string {
  const d = new Date(ms);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Heute, ${time}`;
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `Gestern, ${time}`;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + (d.getHours() || d.getMinutes() ? `, ${time}` : '');
}

export default function Timeline({ customerId, contacts, items, mailState, onChanged }: Props) {
  const [type, setType] = useState<Activity['type']>('notiz');
  const [text, setText] = useState('');
  const [subject, setSubject] = useState('');
  const [when, setWhen] = useState(() => toLocalInput(Date.now()));
  const [contactId, setContactId] = useState('');
  const [asTask, setAsTask] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof TIMELINE_FILTERS)[number]['key']>('alle');
  const [shown, setShown] = useState(PAGE);
  const [now] = useState(() => Date.now());

  const openTasks = useMemo(() => items.filter((i) => i.kind === 'aufgabe').sort((a, b) => a.at - b.at), [items]);

  const visible = useMemo(() => {
    const f = TIMELINE_FILTERS.find((x) => x.key === filter);
    return items.filter((i) => i.kind !== 'aufgabe' && (!f?.kinds || f.kinds.includes(i.kind)));
  }, [items, filter]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Was ist passiert? Ein Satz reicht.');
      return;
    }
    setSaving(true);
    setError(null);
    const at = Timestamp.fromMillis(new Date(when).getTime() || Date.now());
    try {
      await createActivity({
        customerId,
        ...(contactId ? { contactId } : {}),
        type,
        description: text.trim(),
        emailSubject: type === 'email' && subject.trim() ? subject.trim() : null,
        emailBody: null,
        dueDate: asTask ? at : null,
        completed: !asTask,
        completedAt: asTask ? null : at,
        createdAt: asTask ? Timestamp.now() : at,
      });
      setText('');
      setSubject('');
      setAsTask(false);
      setWhen(toLocalInput(Date.now()));
      onChanged();
    } catch (err) {
      setError(`Speichern fehlgeschlagen: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: TimelineItem) => {
    if (!item.activityId || !confirm('Eintrag löschen?')) return;
    await deleteActivity(item.activityId);
    onChanged();
  };

  const complete = async (item: TimelineItem) => {
    if (!item.activityId) return;
    await updateActivity(item.activityId, { completed: true, completedAt: Timestamp.now() });
    onChanged();
  };

  return (
    <section className="card p-0">
      <form onSubmit={submit} className="p-4 sm:p-5 border-b border-gray-100 space-y-3">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Art des Eintrags">
          {ACTIVITY_COMPOSER_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              role="radio"
              aria-checked={type === t.type}
              onClick={() => setType(t.type)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                type === t.type ? 'border-brand-blue bg-blue-50 text-brand-blue font-medium' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span aria-hidden>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
        {type === 'email' && (
          <input className="input" placeholder="Betreff" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Betreff" />
        )}
        <textarea
          className="input"
          rows={3}
          placeholder={
            type === 'anruf'
              ? 'Was wurde am Telefon besprochen?'
              : type === 'meeting'
                ? 'Was kam im Gespräch raus?'
                : type === 'email'
                  ? 'Worum ging es in der Mail?'
                  : 'Notiz zur Firma, z. B. Budget, Wünsche, Einwände'
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Text"
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="datetime-local"
            className="input w-auto text-sm"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            aria-label="Zeitpunkt"
          />
          {contacts.length > 0 && (
            <select className="input w-auto text-sm" value={contactId} onChange={(e) => setContactId(e.target.value)} aria-label="Ansprechpartner">
              <option value="">Ansprechpartner (optional)</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {personName(c)}
                </option>
              ))}
            </select>
          )}
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <input type="checkbox" checked={asTask} onChange={(e) => setAsTask(e.target.checked)} />
            Als Aufgabe (Erinnerung zum Zeitpunkt)
          </label>
          <button type="submit" disabled={saving} className="btn-primary ml-auto">
            {saving ? 'Speichert…' : asTask ? 'Aufgabe anlegen' : 'Festhalten'}
          </button>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </form>

      {openTasks.length > 0 && (
        <div className="px-4 sm:px-5 py-3 border-b border-gray-100 bg-amber-50/50">
          <p className="text-xs font-medium text-amber-900 mb-2">Offene Aufgaben</p>
          <ul className="space-y-2">
            {openTasks.map((t) => (
              <li key={t.id} className="flex items-start gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => complete(t)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border border-amber-400 bg-white hover:bg-amber-100"
                  aria-label="Als erledigt markieren"
                  title="Erledigt"
                />
                <div className="min-w-0">
                  <p className={`font-medium ${t.at < now ? 'text-red-700' : 'text-gray-900'}`}>
                    {formatWhen(t.at)} · {t.title}
                  </p>
                  {t.detail && <p className="text-gray-600 whitespace-pre-line">{t.detail}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="px-4 sm:px-5 pt-4 flex flex-wrap items-center gap-1.5">
        {TIMELINE_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => {
              setFilter(f.key);
              setShown(PAGE);
            }}
            className={`px-2.5 py-1 rounded-full text-xs border ${
              filter === f.key ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
        {mailState === 'loading' && <span className="text-xs text-gray-400 ml-auto">Mails werden geladen…</span>}
      </div>

      {(mailState === 'scope_missing' || mailState === 'not_connected') && (filter === 'alle' || filter === 'mails') && (
        <p className="mx-4 sm:mx-5 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Deine Gmail-Mails erscheinen hier, sobald du einmal den Mail-Zugriff erlaubst:{' '}
          <Link href="/dashboard/einstellungen" className="font-medium underline">
            Einstellungen → Google
          </Link>
          .
        </p>
      )}
      {mailState === 'error' && (filter === 'alle' || filter === 'mails') && (
        <p className="mx-4 sm:mx-5 mt-3 text-xs text-red-700">Gmail konnte gerade nicht gelesen werden. Später neu laden.</p>
      )}

      {visible.length === 0 ? (
        <p className="px-4 sm:px-5 py-6 text-sm text-gray-500">Hier ist noch nichts passiert. Halte oben das erste Gespräch fest.</p>
      ) : (
        <ol className="px-4 sm:px-5 py-4 space-y-4">
          {visible.slice(0, shown).map((i) => (
            <li key={i.id} className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm" aria-hidden>
                {i.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-gray-900 min-w-0">
                    {i.href ? (
                      i.external ? (
                        <a href={i.href} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {i.title}
                        </a>
                      ) : (
                        <Link href={i.href} className="hover:underline">
                          {i.title}
                        </Link>
                      )
                    ) : (
                      i.title
                    )}
                  </p>
                  <time className="shrink-0 text-xs text-gray-400" dateTime={new Date(i.at).toISOString()}>
                    {formatWhen(i.at)}
                  </time>
                </div>
                {i.detail && <p className="mt-0.5 text-sm text-gray-600 whitespace-pre-line break-words">{i.detail}</p>}
                {i.activityId && (
                  <button type="button" onClick={() => remove(i)} className="mt-1 text-xs text-gray-400 hover:text-red-600">
                    Löschen
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      {visible.length > shown && (
        <div className="px-4 sm:px-5 pb-4">
          <button type="button" onClick={() => setShown((n) => n + PAGE)} className="btn-secondary w-full text-sm">
            Ältere anzeigen ({visible.length - shown})
          </button>
        </div>
      )}
    </section>
  );
}
