'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/ui/Modal';
import { listAccess, listMonths, listReports, saveAssessment } from '@/lib/seo/client';
import { formatMonthDE } from '@/lib/seo/months';
import type { PortalAccess, SeoClient, SeoMonthlyDoc, SeoReport } from '@/lib/seo/types';
import { fmtInt } from '@/lib/seo/view';
import { Banner, openPdf, postJson } from './api';

type Busy = 'save' | 'suggest' | 'generate' | 'release' | 'pdf' | null;

export default function ReportsTab({ client, initialMonth }: { client: SeoClient; initialMonth: string | null }) {
  const [months, setMonths] = useState<SeoMonthlyDoc[]>([]);
  const [reports, setReports] = useState<SeoReport[]>([]);
  const [access, setAccess] = useState<PortalAccess[]>([]);
  const [month, setMonth] = useState<string | null>(initialMonth);
  const [text, setText] = useState('');
  const [savedText, setSavedText] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [m, r, a] = await Promise.all([
      listMonths(client.customerId),
      listReports(client.customerId),
      listAccess(client.customerId),
    ]);
    setMonths(m);
    setReports(r);
    setAccess(a.filter((x) => x.active));
    setLoading(false);
    return { m, r };
  }, [client.customerId]);

  useEffect(() => {
    load().then(({ m, r }) => {
      setMonth((cur) => {
        if (cur && m.some((x) => x.month === cur)) return cur;
        // Standard: neuester Entwurf, sonst neuester Monat
        return r.find((x) => x.status === 'draft')?.month ?? m[0]?.month ?? null;
      });
    });
  }, [load]);

  const report = useMemo(() => reports.find((r) => r.month === month) ?? null, [reports, month]);
  const monthDoc = months.find((m) => m.month === month);

  useEffect(() => {
    const t = report?.assessment ?? '';
    setText(t);
    setSavedText(t);
    setMsg(null);
  }, [report?.id, report?.assessment, month]);

  const dirty = text !== savedText;

  const run = async (kind: Exclude<Busy, null>, fn: () => Promise<string | void>) => {
    setBusy(kind);
    setMsg(null);
    try {
      const ok = await fn();
      if (ok) setMsg({ tone: 'success', text: ok });
    } catch (err) {
      setMsg({ tone: 'error', text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const save = () =>
    run('save', async () => {
      await saveAssessment(client.customerId, month!, text);
      setSavedText(text);
      await load();
      return report?.status === 'released'
        ? 'Gespeichert. Der Kunde sieht die neue Einschätzung sofort. Für das PDF auf „PDF aktualisieren“ klicken.'
        : 'Einschätzung gespeichert.';
    });

  const suggest = () =>
    run('suggest', async () => {
      if (text.trim() && !window.confirm('Den aktuellen Text durch einen neuen Vorschlag ersetzen?')) return;
      const r = await postJson<{ assessment: string }>('/api/seo/report', { action: 'suggest', customerId: client.customerId, month });
      setText(r.assessment);
      return 'Vorschlag eingesetzt. Prüfen, ergänzen und speichern.';
    });

  const generate = () =>
    run('generate', async () => {
      if (dirty) await saveAssessment(client.customerId, month!, text);
      await postJson('/api/seo/report', { action: 'generate', customerId: client.customerId, month });
      await load();
      return report ? 'PDF neu erzeugt.' : 'Bericht als Entwurf angelegt.';
    });

  const release = () =>
    run('release', async () => {
      if (dirty) await saveAssessment(client.customerId, month!, text);
      const r = await postJson<{ sentTo: string[] }>('/api/seo/report', { action: 'release', customerId: client.customerId, month });
      setConfirmRelease(false);
      await load();
      return r.sentTo.length
        ? `Freigegeben und an ${r.sentTo.join(', ')} gesendet.`
        : 'Freigegeben. Es ist noch niemand für das Portal eingeladen, deshalb ging keine Mail raus.';
    });

  if (loading) return <div className="card text-sm text-gray-500">Lädt…</div>;
  if (!months.length) {
    return (
      <div className="card text-sm text-gray-600">
        Noch keine Zahlen. Unter <Link className="underline" href={`?tab=daten`}>Daten</Link> die Historie laden.
      </div>
    );
  }

  const statusOf = (m: string) => reports.find((r) => r.month === m);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Monat" className="min-w-0">
        <ul className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {months.map((m) => {
            const r = statusOf(m.month);
            return (
              <li key={m.month}>
                <button
                  type="button"
                  onClick={() => setMonth(m.month)}
                  aria-current={m.month === month ? 'true' : undefined}
                  className={`flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-lg border px-3 py-2 text-left text-sm ${
                    m.month === month ? 'border-gray-900 bg-white font-medium' : 'border-transparent hover:bg-white'
                  }`}
                >
                  {formatMonthDE(m.month)}
                  {r?.status === 'released' ? (
                    <span className="rounded-full bg-emerald-50 px-2 text-xs text-emerald-700">frei</span>
                  ) : r ? (
                    <span className="rounded-full bg-amber-50 px-2 text-xs text-amber-700">Entwurf</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {month && (
        <div className="min-w-0 space-y-4">
          <div className="card space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Bericht {formatMonthDE(month)}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {report?.status === 'released'
                    ? `Freigegeben am ${report.releasedAt?.toDate().toLocaleDateString('de-DE')}${report.sentTo?.length ? `, gesendet an ${report.sentTo.join(', ')}` : ''}.`
                    : report
                      ? 'Entwurf. Der Kunde sieht diesen Monat noch nicht.'
                      : 'Noch kein Bericht angelegt.'}
                  {monthDoc && ` ${fmtInt(monthDoc.totals.clicks)} Klicks, ${fmtInt(monthDoc.totals.impressions)} Impressionen.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="btn-secondary" href={`/dashboard/seo/${client.customerId}/vorschau?monat=${month}`} target="_blank">
                  Portal-Vorschau
                </Link>
                {report?.storagePath && (
                  <button
                    className="btn-secondary"
                    disabled={!!busy}
                    onClick={() =>
                      run('pdf', async () => {
                        await openPdf(`/api/seo/report/pdf?customerId=${client.customerId}&month=${month}`);
                      })
                    }
                  >
                    PDF ansehen
                  </button>
                )}
                <button className="btn-secondary" disabled={!!busy} onClick={generate}>
                  {busy === 'generate' ? 'Erzeugt…' : report ? 'PDF aktualisieren' : 'Bericht anlegen'}
                </button>
              </div>
            </div>
            {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}
          </div>

          <div className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <label htmlFor="assessment" className="font-semibold">
                  Deine Einschätzung
                </label>
                <p className="text-sm text-gray-600">
                  Steht ganz oben im Portal und auf Seite 1 des PDFs. Was hat sich verändert, wie bewertest du es, was hast du
                  gemacht, was kommt als Nächstes. Sie-Form, keine Gedankenstriche.
                </p>
              </div>
              <button className="btn-secondary" disabled={!!busy} onClick={suggest}>
                {busy === 'suggest' ? 'Erzeugt…' : 'Vorschlag aus den Zahlen'}
              </button>
            </div>
            <textarea
              id="assessment"
              className="input min-h-72 font-[inherit] text-base leading-relaxed sm:text-sm"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Noch leer. „Vorschlag aus den Zahlen“ füllt einen ersten Entwurf ein."
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-gray-500">
                Absätze mit einer Leerzeile trennen.
                {/[–—]/.test(text) && <span className="ml-2 font-medium text-amber-700">Enthält Gedankenstriche.</span>}
              </span>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" disabled={!dirty || !!busy} onClick={save}>
                  {busy === 'save' ? 'Speichert…' : dirty ? 'Speichern' : 'Gespeichert'}
                </button>
                {report?.status !== 'released' && (
                  <button className="btn-primary" disabled={!!busy || !text.trim() || !report} onClick={() => setConfirmRelease(true)}>
                    Bericht freigeben und senden
                  </button>
                )}
              </div>
            </div>
            {!report && <p className="text-xs text-gray-500">Zum Freigeben zuerst „Bericht anlegen“.</p>}
          </div>
        </div>
      )}

      <Modal open={confirmRelease} onClose={() => setConfirmRelease(false)} title={`Bericht ${month ? formatMonthDE(month) : ''} freigeben?`}>
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            Danach sieht <strong>{client.displayName}</strong> die Zahlen von {month ? formatMonthDE(month) : ''} im Portal. Das PDF
            wird ohne Entwurfs-Hinweis neu erzeugt.
          </p>
          {access.length ? (
            <div>
              <p className="mb-1">Eine Mail mit Link zum Portal geht an:</p>
              <ul className="list-disc pl-5">
                {access.map((a) => (
                  <li key={a.email}>{a.email}</li>
                ))}
              </ul>
            </div>
          ) : (
            <Banner tone="info">Es ist noch niemand eingeladen. Es geht keine Mail raus.</Banner>
          )}
          {dirty && <p className="text-amber-700">Deine ungespeicherte Einschätzung wird vorher gespeichert.</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setConfirmRelease(false)}>
            Abbrechen
          </button>
          <button className="btn-primary" disabled={busy === 'release'} onClick={release}>
            {busy === 'release' ? 'Wird freigegeben…' : access.length ? 'Freigeben und senden' : 'Freigeben'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
