'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { listInvoices, updateInvoice } from '@/lib/firestore';
import type { Invoice } from '@/lib/types';
import { planPaymentMerge, type MergePlan } from '@/lib/invoice-repair';
import { formatEUR, formatDateDE } from '@/lib/utils';

interface Row extends MergePlan {
  apply: boolean;
}

/**
 * Fuehrt Zahlungseingaenge zusammen, die eine fruehere Bereinigung
 * kuenstlich aufgeteilt hat.
 *
 * Betroffen sind Rechnungen, bei denen frueher nur der Netto-Betrag als
 * bezahlt gespeichert war. Die Korrektur hat damals den fehlenden
 * Umsatzsteuer-Anteil als zweiten Zahlungseingang ergaenzt, statt den
 * vorhandenen Eintrag anzuheben.
 *
 * Rechnerisch war das nie ein Problem: die Umsatzsteuer wird je
 * Rechnung berechnet, nicht je Zahlung, und die Summen stimmen. In der
 * Detailansicht der Voranmeldung sah die Rechnung dadurch aber aus,
 * als waere sie doppelt erfasst.
 *
 * Diese Seite aendert ausschliesslich die Aufteilung. Summen, Betraege,
 * Daten und Rechnungsnummern bleiben unangetastet.
 */
export default function ZahlungenZusammenfassenPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [okCount, setOkCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<{ fixed: number; failed: number } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all: Invoice[] = await listInvoices();
      const plans = all.map(planPaymentMerge);
      const betroffen = plans.filter((p) => p.needsMerge);
      setOkCount(plans.length - betroffen.length);
      setRows(
        betroffen
          .sort(
            (a, b) =>
              b.invoice.invoiceDate.toMillis() -
              a.invoice.invoiceDate.toMillis(),
          )
          .map((p) => ({ ...p, apply: true })),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) =>
    setRows((prev) =>
      prev.map((r) =>
        r.invoice.id === id ? { ...r, apply: !r.apply } : r,
      ),
    );

  const anwenden = async () => {
    const zuTun = rows.filter((r) => r.apply);
    if (zuTun.length === 0) return;

    // Sicherheitsnetz: eine Zusammenfassung darf die Summe nie aendern.
    const verdaechtig = zuTun.filter(
      (r) => Math.abs(r.sumBefore - r.sumAfter) > 0.005,
    );
    if (verdaechtig.length > 0) {
      setError(
        `Abbruch: bei ${verdaechtig.length} Rechnung(en) würde sich die Summe ändern. Das darf nicht passieren und wurde deshalb gestoppt.`,
      );
      return;
    }

    if (
      !confirm(
        `${zuTun.length} Rechnung(en) werden bereinigt.\n\n` +
          'Geändert wird nur die Aufteilung der Zahlungseingänge. ' +
          'Die gezahlten Beträge, die Summen und die Umsatzsteuer bleiben ' +
          'exakt gleich. Fortfahren?',
      )
    ) {
      return;
    }

    setRunning(true);
    setError(null);
    let fixed = 0;
    let failed = 0;
    for (const r of zuTun) {
      try {
        await updateInvoice(r.invoice.id, {
          payments: r.after,
          paidAmount: r.sumAfter,
        });
        fixed += 1;
      } catch (err) {
        console.error('Fehler bei', r.invoice.invoiceNumber, err);
        failed += 1;
      }
    }
    setDone({ fixed, failed });
    setRunning(false);
    load();
  };

  if (loading) {
    return <div className="card text-sm text-gray-500">Lädt…</div>;
  }

  const auswahl = rows.filter((r) => r.apply).length;

  return (
    <div>
      <header className="mb-6">
        <Link
          href="/dashboard/rechnungen"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu den Rechnungen
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">
          Zahlungseingänge zusammenfassen
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Räumt Rechnungen auf, bei denen eine frühere Korrektur den
          Umsatzsteuer-Anteil als eigenen Zahlungseingang angelegt hat.
        </p>
      </header>

      {error && (
        <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      {done && (
        <div className="card mb-4 bg-green-50 border-green-200 text-sm text-green-800">
          {done.fixed} Rechnung(en) bereinigt
          {done.failed > 0 && `, ${done.failed} fehlgeschlagen`}.
        </div>
      )}

      <div className="card mb-5 bg-blue-50 border-blue-200 text-sm text-gray-700">
        <p>
          <strong>Keine Zahl ändert sich.</strong> Die Umsatzsteuer wird je
          Rechnung berechnet, nicht je Zahlungseingang. Deshalb war die
          Voranmeldung auch vorher korrekt. Hier wird nur die Darstellung
          bereinigt: aus zwei Einträgen über zum Beispiel 1.000 € und 190 €
          wird ein Eintrag über 1.190 €.
        </p>
        <p className="mt-2 text-xs text-gray-600">
          Vor dem Schreiben wird geprüft, dass die Summe je Rechnung
          unverändert bleibt. Weicht sie ab, bricht der Vorgang ab.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="card text-sm text-gray-600">
          Nichts zu tun. {okCount} Rechnungen geprüft, keine künstlich
          aufgeteilten Zahlungen gefunden.
        </div>
      ) : (
        <>
          <div className="card mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-700">
              <strong>{rows.length}</strong> Rechnung(en) betroffen,{' '}
              {okCount} bereits in Ordnung.
            </div>
            <button
              onClick={anwenden}
              disabled={running || auswahl === 0}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {running ? 'Läuft…' : `${auswahl} Rechnung(en) bereinigen`}
            </button>
          </div>

          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.invoice.id} className="card">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={r.apply}
                    onChange={() => toggle(r.invoice.id)}
                    className="mt-1 rounded border-gray-300"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/rechnungen/${r.invoice.id}`}
                        className="font-mono text-sm text-brand-blue hover:underline"
                      >
                        {r.invoice.invoiceNumber}
                      </Link>
                      <span className="text-sm text-gray-500">
                        {formatDateDE(r.invoice.invoiceDate.toDate())}
                      </span>
                      <span className="ml-auto text-sm font-semibold text-gray-900">
                        {formatEUR(r.sumBefore)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{r.reason}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                        <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">
                          Vorher ({r.before.length})
                        </div>
                        {r.before.map((p, i) => (
                          <div key={i} className="text-xs text-gray-700">
                            {formatDateDE(p.paidAt.toDate())}:{' '}
                            <span className="tabular-nums">
                              {formatEUR(p.amount)}
                            </span>
                            {p.note && (
                              <span className="text-gray-400"> · {p.note}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="rounded-lg border border-green-200 bg-green-50 p-2">
                        <div className="text-[11px] uppercase tracking-wider text-green-700 mb-1">
                          Nachher ({r.after.length})
                        </div>
                        {r.after.map((p, i) => (
                          <div key={i} className="text-xs text-gray-700">
                            {formatDateDE(p.paidAt.toDate())}:{' '}
                            <span className="tabular-nums font-medium">
                              {formatEUR(p.amount)}
                            </span>
                          </div>
                        ))}
                        <div className="text-[11px] text-green-700 mt-1">
                          Summe unverändert: {formatEUR(r.sumAfter)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
