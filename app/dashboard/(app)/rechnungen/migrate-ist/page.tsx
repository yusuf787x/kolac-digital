'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  listInvoices,
  migrateInvoiceToPayments,
} from '@/lib/firestore';
import type { Invoice } from '@/lib/types';
import { formatEUR, formatDateDE } from '@/lib/utils';

interface Candidate {
  invoice: Invoice;
  keep: boolean;
}

/**
 * Einmalige Migrations-Seite fuer die Umstellung auf Ist-Versteuerung.
 * Fuer Rechnungen ohne payments[]-Array aber mit paidAt/paidAmount
 * wird eine explizite Payment angelegt. Es werden KEINE bestehenden
 * Felder ueberschrieben — nur payments[] wird ergaenzt.
 *
 * Sichtbar unter /dashboard/rechnungen/migrate-ist. User bestaetigt
 * einzeln oder als Batch, was migriert wird.
 */
export default function MigrateIstPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<{
    migrated: number;
    skipped: number;
  } | null>(null);

  useEffect(() => {
    listInvoices()
      .then((all) => {
        const filtered = all
          .filter(
            (i) =>
              i.invoiceNumber !== null &&
              (!i.payments || i.payments.length === 0) &&
              i.paidAt !== null &&
              i.paidAmount > 0,
          )
          .sort((a, b) => b.paidAt!.toMillis() - a.paidAt!.toMillis());
        setCandidates(filtered.map((invoice) => ({ invoice, keep: true })));
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const changeCount = useMemo(
    () => candidates.filter((c) => c.keep).length,
    [candidates],
  );

  const setKeep = (id: string, keep: boolean) => {
    setCandidates((prev) =>
      prev.map((c) => (c.invoice.id === id ? { ...c, keep } : c)),
    );
  };

  const run = async () => {
    if (
      !confirm(
        `${changeCount} Rechnungen werden migriert. Bestehende Felder (paidAt, paidAmount) bleiben unangetastet, es wird nur payments[] ergaenzt. Fortfahren?`,
      )
    )
      return;
    setRunning(true);
    let migrated = 0;
    let skipped = 0;
    for (const c of candidates) {
      if (!c.keep) {
        skipped++;
        continue;
      }
      try {
        const r = await migrateInvoiceToPayments(c.invoice.id);
        if (r === 'ok') migrated++;
        else skipped++;
      } catch (err) {
        console.error('Migration fehlgeschlagen:', c.invoice.id, err);
      }
    }
    setDone({ migrated, skipped });
    setRunning(false);
  };

  if (loading) {
    return (
      <div className="card text-sm text-gray-500">Lade Rechnungen…</div>
    );
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
          Rechnungen auf Ist-Versteuerung migrieren
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Alt-Rechnungen mit <code>paidAt + paidAmount</code> aber ohne{' '}
          <code>payments[]</code>-Historie. Die Migration ergaenzt ein
          Payment aus dem bisherigen Bezahlt-Zeitpunkt und -Betrag. Keine
          bestehenden Felder werden ueberschrieben.
        </p>
      </header>

      {error && (
        <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {done && (
        <div className="card mb-4 bg-green-50 border-green-200 text-sm text-green-900">
          Fertig — {done.migrated} Rechnungen migriert, {done.skipped}{' '}
          uebersprungen.
        </div>
      )}

      {candidates.length === 0 ? (
        <div className="card text-sm text-gray-600">
          Keine Rechnungen zu migrieren. Alle bezahlten Rechnungen haben
          bereits ein <code>payments[]</code>-Array oder sind noch nicht
          bezahlt.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">
              {changeCount} von {candidates.length} Rechnungen werden
              migriert.
            </p>
            <button
              onClick={run}
              disabled={running || changeCount === 0 || !!done}
              className="btn-primary"
            >
              {running
                ? 'Migriere…'
                : done
                  ? 'Erledigt'
                  : `${changeCount} Rechnungen migrieren`}
            </button>
          </div>

          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2 w-32">Nummer</th>
                  <th className="text-left px-3 py-2 w-28">Bezahlt am</th>
                  <th className="text-right px-3 py-2 w-32">Betrag</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="px-3 py-2 w-16">Übernehmen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {candidates.map((c) => (
                  <tr key={c.invoice.id} className={c.keep ? '' : 'opacity-50'}>
                    <td className="px-3 py-2 font-mono">
                      <Link
                        href={`/dashboard/rechnungen/${c.invoice.id}`}
                        className="text-brand-blue hover:underline"
                      >
                        {c.invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                      {c.invoice.paidAt &&
                        formatDateDE(c.invoice.paidAt.toDate())}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-900">
                      {formatEUR(c.invoice.paidAmount)}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {c.invoice.status}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={c.keep}
                        onChange={(e) =>
                          setKeep(c.invoice.id, e.target.checked)
                        }
                        className="h-4 w-4 accent-brand-blue"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
