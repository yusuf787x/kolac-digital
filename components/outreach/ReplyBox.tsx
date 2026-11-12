'use client';

import { useState } from 'react';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { postJson } from '@/components/seo/admin/api';
import { db } from '@/lib/firebase';
import { isMailLead, lintMessage, type OutreachLead } from '@/lib/outreach';

type Suggestion = { intent: string; reply: string; next: string };
type ReplyResult = { optOut?: boolean; saved?: boolean; error?: string } & Partial<Suggestion>;

const INTENT_LABELS: Record<string, string> = {
  interessiert: 'Interessiert',
  frage: 'Frage',
  preis: 'Fragt nach dem Preis',
  skeptisch: 'Skeptisch',
  absage: 'Klingt nach Absage',
  sonstiges: 'Sonstiges',
};

/**
 * Verlauf und Antwort-Hilfe: Yusuf fügt die Antwort des Studios ein, der
 * Server speichert sie und holt einen Vorschlag von Claude. Klare Absagen
 * setzen das Studio sofort auf „Kein Interesse“.
 */
export default function ReplyBox({
  lead,
  onChanged,
  onMarkNoInterest,
}: {
  lead: OutreachLead;
  onChanged: () => Promise<void>;
  onMarkNoInterest: () => Promise<void>;
}) {
  const [incoming, setIncoming] = useState('');
  const [busy, setBusy] = useState<'suggest' | 'sent' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const thread = lead.thread ?? [];
  const openReply = thread.at(-1)?.from === 'studio';
  const closed = lead.status === 'kein-interesse' || lead.status === 'ausgeschlossen';

  const ask = async (body: { reply?: string; retry?: boolean }) => {
    setBusy('suggest');
    setErr(null);
    setInfo(null);
    try {
      const r = await postJson<ReplyResult>('/api/outreach/reply', { id: lead.id, ...body });
      if (r.optOut) {
        setInfo('Klare Absage erkannt: als „Kein Interesse“ markiert. Dieses Studio wird nicht mehr angeschrieben.');
        setIncoming('');
        await onChanged();
        return;
      }
      if (body.reply) setIncoming('');
      await onChanged();
      if (r.error) {
        setErr(r.error);
        return;
      }
      if (r.reply) {
        setSuggestion({ intent: r.intent ?? 'sonstiges', reply: r.reply, next: r.next ?? '' });
        setDraft(r.reply);
      }
    } catch (e) {
      setErr(`Das hat nicht geklappt: ${(e as Error).message}. Bitte noch einmal versuchen.`);
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setErr('Kopieren ging nicht. Text markieren und manuell kopieren.');
    }
  };

  const markSent = async () => {
    setBusy('sent');
    setErr(null);
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'outreachLeads', lead.id), {
        thread: arrayUnion({ from: 'yusuf', text: draft.trim(), at: now }),
        updatedAt: now,
      });
      setSuggestion(null);
      setDraft('');
      await onChanged();
    } catch (e) {
      setErr(`Nicht gespeichert: ${(e as Error).message}. Bitte noch einmal versuchen.`);
    } finally {
      setBusy(null);
    }
  };

  const warnings = draft ? lintMessage(draft, { max: isMailLead(lead) ? 1000 : 750 }) : [];

  return (
    <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
      {thread.length > 0 && (
        <ol className="space-y-2" aria-label="Verlauf">
          {thread.map((m, i) => (
            <li key={`${m.at}-${i}`} className={`flex ${m.from === 'yusuf' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                  m.from === 'yusuf' ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-900'
                }`}
              >
                {m.text}
                <div className={`mt-0.5 text-[11px] ${m.from === 'yusuf' ? 'text-blue-100' : 'text-gray-500'}`}>
                  {m.from === 'yusuf' ? 'Du' : lead.name} · {new Date(m.at).toLocaleDateString('de-DE')}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {suggestion ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold uppercase tracking-wide text-brand-blue">Vorschlag</span>
            <span className={`rounded-full px-2 py-0.5 ${suggestion.intent === 'absage' ? 'bg-gray-200 text-gray-700' : 'bg-white text-gray-700'}`}>
              {INTENT_LABELS[suggestion.intent] ?? suggestion.intent}
            </span>
          </div>
          {suggestion.next && <p className="mt-1 text-sm text-gray-700">{suggestion.next}</p>}
          <label className="sr-only" htmlFor={`draft-${lead.id}`}>
            Antwort an {lead.name}
          </label>
          <textarea
            id={`draft-${lead.id}`}
            rows={5}
            className="input mt-2 text-base sm:text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          {warnings.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-xs text-amber-700">
              {warnings.map((w) => (
                <li key={w}>Hinweis: {w}</li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" className="btn-primary pointer-coarse:h-11" onClick={copy} disabled={!draft.trim()}>
              {copied ? 'Kopiert ✓' : 'Text kopieren'}
            </button>
            <button type="button" className="btn-secondary pointer-coarse:h-11" onClick={markSent} disabled={!draft.trim() || busy !== null}>
              {busy === 'sent' ? 'Speichert…' : 'Gesendet'}
            </button>
            <button type="button" className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-900" disabled={busy !== null} onClick={() => ask({ retry: true })}>
              {busy === 'suggest' ? 'Formuliert…' : 'Neu formulieren'}
            </button>
            {suggestion.intent === 'absage' && !closed && (
              <button type="button" className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-900" onClick={onMarkNoInterest}>
                Als „Kein Interesse“ markieren
              </button>
            )}
          </div>
        </div>
      ) : (
        !closed && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (incoming.trim()) ask({ reply: incoming.trim() });
            }}
          >
            <label className="label" htmlFor={`incoming-${lead.id}`}>
              Antwort von {lead.name} einfügen
            </label>
            <textarea
              id={`incoming-${lead.id}`}
              rows={3}
              className="input text-base sm:text-sm"
              placeholder={isMailLead(lead) ? "Antwort-Mail hier einfügen" : "Nachricht aus Instagram hier einfügen"}
              value={incoming}
              onChange={(e) => setIncoming(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="submit" className="btn-secondary pointer-coarse:h-11" disabled={!incoming.trim() || busy !== null}>
                {busy === 'suggest' ? 'Claude formuliert…' : 'Antwort-Vorschlag holen'}
              </button>
              {openReply && !incoming.trim() && (
                <button type="button" className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-900" disabled={busy !== null} onClick={() => ask({ retry: true })}>
                  Vorschlag zur letzten Antwort holen
                </button>
              )}
            </div>
          </form>
        )
      )}

      {info && <p className="text-sm text-emerald-700">{info}</p>}
      {err && (
        <p role="alert" className="text-sm text-red-700">
          {err}
        </p>
      )}
    </div>
  );
}
