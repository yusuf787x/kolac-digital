'use client';

import { useCallback, useEffect, useState } from 'react';
import { listMonthsWithData, listReports } from '@/lib/seo/client';
import { formatMonthDE, lastCompleteMonth, lastCompleteMonths } from '@/lib/seo/months';
import type { SeoClient, SeoMonthlyDoc } from '@/lib/seo/types';
import { fmtInt, fmtPos } from '@/lib/seo/view';
import { Banner, getJson, postJson } from './api';

const BACKFILL_MONTHS = 16;

export default function DataTab({ client, onClientChange }: { client: SeoClient; onClientChange: () => void }) {
  const [months, setMonths] = useState<SeoMonthlyDoc[]>([]);
  const [creds, setCreds] = useState<{ serviceAccount: string | null; pagespeedKey: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const [msg, setMsg] = useState<{ tone: 'error' | 'success' | 'info'; text: string } | null>(null);

  const load = useCallback(async () => setMonths(await listMonthsWithData(client)), [client]);

  useEffect(() => {
    load();
    getJson<{ serviceAccount: string | null; pagespeedKey: boolean }>('/api/seo/fetch').then(setCreds).catch(() => null);
  }, [load]);

  const fetchOne = async (month: string, pagespeed = false) =>
    (await postJson('/api/seo/fetch', { customerId: client.customerId, month, pagespeed })) as { summary?: { empty?: boolean } };

  const refreshNow = async () => {
    const month = lastCompleteMonth();
    setBusy('now');
    setMsg({ tone: 'info', text: `Rufe ${formatMonthDE(month)} ab und messe die Ladezeit. Das dauert bis zu einer Minute…` });
    try {
      const r = await fetchOne(month, true);
      if (r.summary?.empty) {
        setMsg({ tone: 'info', text: `Für ${formatMonthDE(month)} hat Google noch keine Zahlen. Es wurde nichts angelegt.` });
        return;
      }
      // Bereits freigegebene Berichte bleiben unangetastet
      const reports = await listReports(client.customerId);
      if (reports.find((r) => r.month === month)?.status !== 'released') {
        await postJson('/api/seo/report', { action: 'generate', customerId: client.customerId, month });
      }
      await load();
      onClientChange();
      setMsg({ tone: 'success', text: `${formatMonthDE(month)} aktualisiert, Bericht als Entwurf bereit (Tab Berichte).` });
    } catch (err) {
      setMsg({ tone: 'error', text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  /**
   * Historie: vom neuesten Monat rueckwaerts, hoechstens 16 Monate, nicht vor
   * "Zahlen ab". Beim ersten Monat ohne Zahlen ist Schluss, davor hat Google
   * nichts (Search Console erst seitdem eingerichtet). Leere Monate werden
   * nicht gespeichert.
   */
  const backfill = async (onlyMissing: boolean) => {
    const have = new Set(months.map((m) => m.month));
    const todo = lastCompleteMonths(BACKFILL_MONTHS)
      .filter((m) => !client.dataStart || m >= client.dataStart)
      .filter((m) => !onlyMissing || !have.has(m));
    if (!todo.length) {
      setMsg({ tone: 'info', text: 'Alle verfügbaren Monate sind schon geladen.' });
      return;
    }
    setBusy('backfill');
    setMsg(null);
    let loaded = 0;
    let stoppedAt: string | null = null;
    try {
      for (let i = 0; i < todo.length; i++) {
        setProgress({ done: i, total: todo.length, current: todo[i] });
        const r = await fetchOne(todo[i]);
        if (r.summary?.empty) {
          stoppedAt = todo[i];
          break;
        }
        loaded++;
      }
      setMsg({
        tone: loaded ? 'success' : 'info',
        text: stoppedAt
          ? `${loaded} ${loaded === 1 ? 'Monat' : 'Monate'} geladen. Ab ${formatMonthDE(stoppedAt)} und davor hat Google keine Zahlen, dort wurde nichts angelegt.`
          : `${loaded} Monate geladen.`,
      });
    } catch (err) {
      setMsg({ tone: 'error', text: `Abgebrochen: ${(err as Error).message}. Bereits geladene Monate bleiben gespeichert, „Fehlende Monate laden“ macht weiter.` });
    } finally {
      setProgress(null);
      setBusy(null);
      await load();
      onClientChange();
    }
  };

  return (
    <div className="space-y-6">
      {creds && !client.demo && (!creds.serviceAccount || !creds.pagespeedKey) && (
        <Banner tone="error">
          {!creds.serviceAccount && 'GSC_SERVICE_ACCOUNT_JSON ist auf dem Server nicht gesetzt. '}
          {!creds.pagespeedKey && 'PAGESPEED_API_KEY fehlt (ohne Schlüssel greift ein knappes Tageslimit). '}
          Siehe docs/seo-kunde-anlegen.md.
        </Banner>
      )}
      {creds?.serviceAccount && !client.demo && (
        <div className="card text-sm text-gray-600">
          In der Search Console von <strong>{client.domain}</strong> muss dieser Service Account als Nutzer (Berechtigung
          „Eingeschränkt“ reicht) eingetragen sein:
          <code className="mt-2 block overflow-x-auto rounded bg-gray-100 px-2 py-1 text-xs whitespace-nowrap">{creds.serviceAccount}</code>
          <span className="mt-2 block">Property: <code>{client.gscProperty}</code></span>
        </div>
      )}
      {client.demo && <Banner tone="info">Testkunde: Abrufe erzeugen Beispielzahlen, es wird keine Google-API gefragt.</Banner>}

      <div className="card space-y-4">
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={!!busy} onClick={refreshNow}>
            {busy === 'now' ? 'Aktualisiert…' : `Jetzt aktualisieren (${formatMonthDE(lastCompleteMonth())})`}
          </button>
          <button className="btn-secondary" disabled={!!busy} onClick={() => backfill(true)}>
            {months.length ? 'Fehlende Monate laden' : 'Historie laden (bis 16 Monate)'}
          </button>
          {months.length > 0 && (
            <button className="btn-secondary" disabled={!!busy} onClick={() => backfill(false)}>
              Alle Monate neu laden
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Der Cron holt automatisch am 4. jedes Monats den Vormonat und schickt dir eine Mail zur Freigabe. Google hält Daten 16 Monate vor,
          aber nur ab dem Tag, an dem die Search Console eingerichtet wurde. Monate ohne Zahlen werden nicht angelegt.
        </p>
        {progress && (
          <div>
            <div className="mb-1 text-sm">
              Lade {formatMonthDE(progress.current)} ({progress.done + 1} von {progress.total})…
            </div>
            <div className="h-2 rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-brand-blue transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
          </div>
        )}
        {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}
        {client.lastFetchError && !msg && <Banner tone="error">Letzter Abruf fehlgeschlagen: {client.lastFetchError}</Banner>}
      </div>

      <div className="card">
        <h3 className="mb-3 font-semibold">Gespeicherte Monate</h3>
        {months.length === 0 ? (
          <p className="text-sm text-gray-600">Noch keine Daten.</p>
        ) : (
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 text-xs text-gray-500">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">Monat</th>
                  <th className="px-2 py-2 text-right font-medium">Klicks</th>
                  <th className="px-2 py-2 text-right font-medium">Impressionen</th>
                  <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">Position</th>
                  <th className="hidden px-2 py-2 text-right font-medium md:table-cell">Suchbegriffe</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {months.map((m) => (
                  <tr key={m.month}>
                    <td className="px-2 py-1.5 whitespace-nowrap">{formatMonthDE(m.month)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtInt(m.totals.clicks)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtInt(m.totals.impressions)}</td>
                    <td className="hidden px-2 py-1.5 text-right tabular-nums sm:table-cell">{fmtPos(m.totals.position)}</td>
                    <td className="hidden px-2 py-1.5 text-right tabular-nums md:table-cell">{fmtInt(m.queryCount)}</td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        className="text-xs text-brand-blue hover:underline disabled:opacity-50"
                        disabled={!!busy}
                        onClick={async () => {
                          setBusy(m.month);
                          try {
                            await fetchOne(m.month);
                            await load();
                          } catch (err) {
                            setMsg({ tone: 'error', text: (err as Error).message });
                          } finally {
                            setBusy(null);
                          }
                        }}
                      >
                        {busy === m.month ? 'lädt…' : 'neu abrufen'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
