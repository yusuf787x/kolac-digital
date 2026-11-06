'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authedFetch } from '@/lib/api-client';
import EmailPreviewFrame from '@/components/email/EmailPreviewFrame';

interface TemplateInfo {
  id: string;
  group: string;
  label: string;
  when: string;
}

interface Rendered {
  subject: string;
  from: string;
  html: string;
}

/**
 * Alle Kunden-Mails mit Beispieldaten ansehen und als Test an
 * yusuf@kolac-digital.de schicken. Inhalt kommt vom Server, damit die
 * Vorschau exakt der Code ist, der auch verschickt.
 */
export default function MailVorlagenPage() {
  const [templates, setTemplates] = useState<TemplateInfo[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rendered, setRendered] = useState<Rendered | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  /** Lade-Zustand direkt beim Klick setzen, das Laden selbst macht der Effekt. */
  const selectTemplate = (id: string) => {
    setActiveId(id);
    setLoadingPreview(true);
    setNotice(null);
  };

  useEffect(() => {
    authedFetch('/api/email/preview')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? 'Vorlagen konnten nicht geladen werden.');
        setTemplates(data.templates);
        if (data.templates.length) selectTemplate(data.templates[0].id);
      })
      .catch((err: Error) => setListError(err.message));
  }, []);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    authedFetch('/api/email/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeId }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? 'Vorschau fehlgeschlagen.');
        if (!cancelled) setRendered(data);
      })
      .catch((err: Error) => !cancelled && setNotice({ kind: 'error', text: err.message }))
      .finally(() => !cancelled && setLoadingPreview(false));
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const sendTest = async () => {
    if (!activeId) return;
    setSending(true);
    setNotice(null);
    try {
      const res = await authedFetch('/api/email/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeId, send: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Testmail fehlgeschlagen.');
      setNotice({ kind: 'ok', text: `Testmail ist an ${data.sentTo} raus. Schau gleich mal ins Postfach.` });
    } catch (err) {
      setNotice({ kind: 'error', text: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  const active = templates?.find((t) => t.id === activeId) ?? null;
  const groups = templates
    ? Array.from(new Set(templates.map((t) => t.group))).map((g) => ({
        group: g,
        items: templates.filter((t) => t.group === g),
      }))
    : [];

  return (
    <div>
      <header className="mb-8">
        <Link
          href="/dashboard/einstellungen"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu Einstellungen
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">Mail-Vorlagen</h1>
        <p className="mt-1 text-sm text-gray-500">
          So sehen die Mails an deine Kunden aus, hier mit Beispieldaten. Mit
          „Testmail an mich“ landet die Mail in deinem Postfach, dort siehst du
          sie wie ein Kunde.
        </p>
      </header>

      {listError && (
        <div className="card text-sm text-red-700 bg-red-50 border-red-200">{listError}</div>
      )}
      {!templates && !listError && <div className="card text-sm text-gray-500">Lädt…</div>}

      {templates && (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
          <nav className="card p-2 lg:sticky lg:top-6" aria-label="Mail-Vorlagen">
            {groups.map(({ group, items }) => (
              <div key={group} className="mb-2 last:mb-0">
                <div className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {group}
                </div>
                {items.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => t.id !== activeId && selectTemplate(t.id)}
                    aria-current={t.id === activeId ? 'true' : undefined}
                    className={`block w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                      t.id === activeId
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <section className="space-y-4 min-w-0">
            {active && (
              <div className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-900">{active.label}</h2>
                  <p className="mt-0.5 text-sm text-gray-500">{active.when}</p>
                </div>
                <button
                  type="button"
                  className="btn-primary shrink-0"
                  onClick={sendTest}
                  disabled={sending || loadingPreview}
                  aria-busy={sending}
                >
                  {sending ? 'Sende Test…' : 'Testmail an mich'}
                </button>
              </div>
            )}

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

            {rendered && (
              <div className={loadingPreview ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
                <EmailPreviewFrame
                  html={rendered.html}
                  from={rendered.from}
                  to="Kunde (Beispiel)"
                  subject={rendered.subject}
                />
              </div>
            )}
            {!rendered && loadingPreview && (
              <div className="card text-sm text-gray-500">Vorschau wird geladen…</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
