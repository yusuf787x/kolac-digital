'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listInvoices, updateInvoice } from '@/lib/firestore';
import type { Invoice } from '@/lib/types';
import {
  analyzeInvoice,
  DATE_SOURCE_LABELS,
  type RepairPlan,
} from '@/lib/invoice-repair';
import { formatEUR, formatDateDE } from '@/lib/utils';

interface Row extends RepairPlan {
  apply: boolean;
}

/**
 * Einmalige Datenbereinigung der Zahlungsfelder.
 *
 * Findet Rechnungen, bei denen der Netto- statt Brutto-Betrag als
 * bezahlt gespeichert wurde, oder bei denen die Zahlungshistorie
 * fehlt. Zeigt jede geplante Aenderung vorher an. Schreibt erst
 * nach Bestaetigung, und pro Rechnung genau einmal — es kann
 * nichts doppelt gebucht werden.
 */
export default function ReparaturPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [okCount, setOkCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<{ fixed: number; failed: number } | null>(
    null,
  );

  const load = async () => {
    setLoading(true);
    try {
      const all: Invoice[] = await listInvoices();
      const plans = all.map(analyzeInvoice);
      const needsWork = plans.filter((p) => p.kind !== 'ok');
      setOkCount(plans.length - needsWork.length);
      setRows(
        needsWork
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
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyCount = useMemo(
    () => rows.filter((r) => r.apply).length,
    [rows],
  );

  const toggle = (id: string, apply: boolean) =>
    setRows((prev) =>
      prev.map((r) => (r.invoice.id === id ? { ...r, apply } : r)),
    );

  const run = async () => {
    if (
      !confirm(
        `${applyCount} Rechnungen werden korrigiert. Betroffen sind nur die Felder paidAmount und payments. Positionen, Beträge und Rechnungsnummern bleiben unverändert. Fortfahren?`,
      )
    )
      return;
    setRunning(true);
    let fixed = 0;
    let failed = 0;
    for (const r of rows) {
      if (!r.apply) continue;
      try {
        await updateInvoice(r.invoice.id, {
          paidAmount: r.nextPaidAmount,
          payments: r.nextPayments,
          // paidAt auf den letzten Zahlungseingang setzen, damit die
          // Anzeige konsistent zur Historie ist.
          paidAt:
            r.nextPayments.length > 0
              ? r.nextPayments.reduce((latest, p) =>
                  p.paidAt.toMillis() > latest.paidAt.toMillis() ? p : latest,
                ).paidAt
              : null,
        });
        fixed++;
      } catch (err) {
        console.error('Reparatur fehlgeschlagen:', r.invoice.id, err);
        failed++;
      }
    }
    setDone({ fixed, failed });
    setRunning(false);
    await load();
  };

  if (loading) {
    return <div className="card text-sm text-gray-500">Prüfe Rechnungen…</div>;
  }

  return (
    <div>
      <header className="mb-6">
        <Link
          href="/dashboard/rechnungen"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu Rechnungen
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">
          Zahlungsdaten prüfen
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Sucht Rechnungen, bei denen der bezahlte Betrag oder die
          Zahlungshistorie nicht sauber gespeichert ist. Es werden
          ausschließlich die Felder <code>paidAmount</code> und{' '}
          <code>payments</code> angefasst. Positionen, Beträge und
          Rechnungsnummern bleiben unverändert.
        </p>
      </header>

      {error && (
        <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {done && (
        <div className="card mb-4 bg-green-50 border-green-200 text-sm text-green-900">
          {done.fixed} Rechnungen korrigiert
          {done.failed > 0 && `, ${done.failed} fehlgeschlagen`}.
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card text-sm text-gray-700">
          <strong>Alles sauber.</strong> {okCount} Rechnungen geprüft, keine
          Korrektur nötig. Bezahlte Rechnungen stehen mit dem vollen
          Brutto-Betrag und einem passenden Zahlungseingang in der Historie.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <p className="text-sm text-gray-600">
              {rows.length} Rechnung{rows.length === 1 ? '' : 'en'} mit
              Auffälligkeit · {okCount} bereits in Ordnung
            </p>
            <button
              onClick={run}
              disabled={running || applyCount === 0}
              className="btn-primary"
            >
              {running
                ? 'Korrigiere…'
                : `${applyCount} Rechnungen korrigieren`}
            </button>
          </div>

          <div className="space-y-3">
            {rows.map((r) => (
              <div
                key={r.invoice.id}
                className={`card ${r.apply ? '' : 'opacity-50'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Link
                        href={`/dashboard/rechnungen/${r.invoice.id}`}
                        className="font-mono text-sm text-brand-blue hover:underline"
                      >
                        {r.invoice.invoiceNumber}
                      </Link>
                      <span className="text-xs text-gray-500">
                        {formatDateDE(r.invoice.invoiceDate.toDate())}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          r.kind === 'netto-statt-brutto'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.kind === 'netto-statt-brutto'
                          ? 'Netto statt Brutto'
                          : r.kind === 'summe-weicht-ab'
                            ? 'Summe unvollständig'
                            : 'Historie fehlt'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{r.reason}</p>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                        <div className="text-gray-500 mb-1">Vorher</div>
                        <div className="text-gray-900">
                          bezahlt {formatEUR(r.currentPaidAmount)}
                        </div>
                        <div className="text-gray-500 mt-0.5">
                          {(r.invoice.payments ?? []).length} Zahlungseingäng
                          {(r.invoice.payments ?? []).length === 1 ? '' : 'e'}
                        </div>
                      </div>
                      <div className="rounded-lg border border-green-200 bg-green-50 p-2.5">
                        <div className="text-green-700 mb-1">Nachher</div>
                        <div className="text-green-900 font-medium">
                          bezahlt {formatEUR(r.nextPaidAmount)} von{' '}
                          {formatEUR(r.bruttoTotal)} brutto
                        </div>
                        <div className="text-green-800 mt-0.5">
                          {r.nextPayments.length} Zahlungseingäng
                          {r.nextPayments.length === 1 ? '' : 'e'}
                          {r.assumedDate &&
                            ` · ${formatDateDE(r.assumedDate)}`}
                        </div>
                        {r.dateSource && r.dateSource !== 'paidAt' && (
                          <div className="text-green-700 mt-0.5">
                            Datum aus: {DATE_SOURCE_LABELS[r.dateSource]}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-gray-600 shrink-0">
                    <input
                      type="checkbox"
                      checked={r.apply}
                      onChange={(e) => toggle(r.invoice.id, e.target.checked)}
                      className="h-4 w-4 accent-brand-blue"
                    />
                    korrigieren
                  </label>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
