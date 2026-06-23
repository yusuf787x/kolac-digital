'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import {
  getContract,
  updateContract,
  deleteContract,
  getCustomer,
} from '@/lib/firestore';
import type { Contract, Customer, ContractAuditEntry } from '@/lib/types';
import { formatTsDE, tsToDate } from '@/lib/utils';
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_BADGE_CLASSES,
  computeContractStatus,
} from '@/lib/contract-status';

export default function VertragDetailPage() {
  return (
    <Suspense fallback={<div className="card text-sm text-gray-500">Lädt…</div>}>
      <VertragDetailInner />
    </Suspense>
  );
}

function VertragDetailInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [contract, setContract] = useState<Contract | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingLink, setSigningLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDays, setReminderDays] = useState(7);
  const [savingReminder, setSavingReminder] = useState(false);

  const reload = async () => {
    const c = await getContract(id);
    setContract(c);
    if (c) {
      setReminderEnabled(c.reminderEnabled);
      setReminderDays(c.reminderDays);
      if (typeof window !== 'undefined') {
        setSigningLink(`${window.location.origin}/sign/${c.signingToken}`);
      }
      if (c.customerId) {
        const cust = await getCustomer(c.customerId);
        setCustomer(cust);
      }
    }
  };

  useEffect(() => {
    reload()
      .catch((err) => {
        console.error(err);
        setError('Vertrag konnte nicht geladen werden.');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const copyLink = async () => {
    if (!signingLink) return;
    await navigator.clipboard.writeText(signingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const markAsSent = async () => {
    if (!contract) return;
    const audit: ContractAuditEntry[] = [
      ...(contract.audit ?? []),
      { at: Timestamp.now(), event: 'sent' },
    ];
    await updateContract(contract.id, {
      status: 'sent',
      sentAt: Timestamp.now(),
      audit,
    });
    await reload();
  };

  const markAsSignedManually = async () => {
    if (!contract) return;
    if (
      !confirm(
        'Vertrag als außerhalb des Systems signiert markieren? Es wird kein PDF generiert.',
      )
    )
      return;
    const audit: ContractAuditEntry[] = [
      ...(contract.audit ?? []),
      {
        at: Timestamp.now(),
        event: 'manual_signed',
        note: 'Vom Nutzer manuell als signiert markiert.',
      },
    ];
    await updateContract(contract.id, {
      status: 'signed',
      signedAt: Timestamp.now(),
      audit,
    });
    await reload();
  };

  const cancelContract = async () => {
    if (!contract) return;
    if (!confirm('Vertrag stornieren? Der Signing-Link wird ungültig.'))
      return;
    const audit: ContractAuditEntry[] = [
      ...(contract.audit ?? []),
      { at: Timestamp.now(), event: 'cancelled' },
    ];
    await updateContract(contract.id, { status: 'cancelled', audit });
    await reload();
  };

  const deleteContractFully = async () => {
    if (!contract) return;
    if (
      !confirm(
        `Vertrag "${contract.title}" wirklich endgültig löschen? Audit-Trail geht verloren.`,
      )
    )
      return;
    await deleteContract(contract.id);
    router.push('/dashboard/vertraege');
  };

  const saveReminderSettings = async () => {
    if (!contract) return;
    setSavingReminder(true);
    try {
      await updateContract(contract.id, {
        reminderEnabled,
        reminderDays,
      });
      await reload();
    } finally {
      setSavingReminder(false);
    }
  };

  if (loading) {
    return <div className="card text-sm text-gray-500">Lädt…</div>;
  }

  if (error || !contract) {
    return (
      <div className="card text-sm text-red-700 bg-red-50 border-red-200">
        {error ?? 'Vertrag nicht gefunden.'}
      </div>
    );
  }

  const computed = computeContractStatus(contract);
  const expired = computed === 'expired';

  return (
    <div>
      <header className="mb-6">
        <Link
          href="/dashboard/vertraege"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu Verträgen
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              {contract.title}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {contract.typeLabel} · Kunde{' '}
              {customer?.company ?? contract.customerSnapshot.company}
            </p>
          </div>
          <span
            className={`text-xs font-medium px-2 py-1 rounded ${CONTRACT_STATUS_BADGE_CLASSES[computed]}`}
          >
            {CONTRACT_STATUS_LABELS[computed]}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Signing-Link
            </h2>
            {contract.status === 'cancelled' ? (
              <p className="text-sm text-red-700">
                Vertrag ist storniert — Link ist ungültig.
              </p>
            ) : contract.status === 'signed' ? (
              <p className="text-sm text-green-700">
                Bereits signiert am {formatTsDE(contract.signedAt)}
                {contract.signedByName ? ` von ${contract.signedByName}` : ''}.
              </p>
            ) : expired ? (
              <p className="text-sm text-amber-700">
                Link ist abgelaufen. Bitte einen neuen Vertrag anlegen.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={signingLink}
                    className="input font-mono text-xs"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button onClick={copyLink} className="btn-secondary text-sm">
                    {copied ? '✓ Kopiert' : 'Kopieren'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Gültig bis {formatTsDE(contract.signingExpiresAt)}. Schick
                  den Link per WhatsApp oder Mail an den Kunden. Sobald
                  unterschrieben wird, kommt das signierte PDF automatisch
                  zurück.
                </p>
                {contract.status === 'draft' && (
                  <button
                    onClick={markAsSent}
                    className="btn-primary mt-3 text-sm"
                  >
                    Als versendet markieren
                  </button>
                )}
              </>
            )}
          </section>

          <section className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">
                Dokumente
              </h2>
            </div>
            <div className="space-y-2 text-sm">
              <a
                href={contract.originalPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                📄 Original-PDF (ohne Signaturen)
              </a>
              {contract.signedPdfUrl ? (
                <a
                  href={contract.signedPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100"
                >
                  ✓ Signiertes PDF herunterladen
                </a>
              ) : (
                <p className="text-xs text-gray-500 px-3 py-2">
                  Signiertes PDF wird verfügbar, sobald der Kunde unterschrieben
                  hat.
                </p>
              )}
              {contract.driveUrl && (
                <a
                  href={contract.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100"
                >
                  📁 In Google Drive öffnen (Partnerverträge)
                </a>
              )}
            </div>
          </section>

          <section className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Audit-Log
            </h2>
            <ul className="divide-y divide-gray-100">
              {(contract.audit ?? []).map((entry, i) => (
                <li key={i} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {auditLabel(entry.event)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatAuditDate(entry.at)}
                    </span>
                  </div>
                  {entry.note && (
                    <p className="text-xs text-gray-600 mt-0.5">{entry.note}</p>
                  )}
                  {entry.ip && (
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">
                      IP {entry.ip}
                    </p>
                  )}
                </li>
              ))}
              {(!contract.audit || contract.audit.length === 0) && (
                <li className="py-2 text-sm text-gray-500">
                  Noch keine Ereignisse.
                </li>
              )}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Erinnerung
            </h2>
            <label className="inline-flex items-center gap-2 text-sm text-gray-800 mb-3">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              Erinnere mich per Mail
            </label>
            <div>
              <label className="label">nach (Tagen ohne Signatur)</label>
              <input
                type="number"
                className="input"
                value={reminderDays}
                min={1}
                onChange={(e) =>
                  setReminderDays(parseInt(e.target.value, 10) || 7)
                }
                disabled={!reminderEnabled}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Letzte Erinnerung: {formatTsDE(contract.lastReminderAt)}
            </p>
            <button
              onClick={saveReminderSettings}
              disabled={savingReminder}
              className="btn-secondary mt-3 w-full"
            >
              {savingReminder ? 'Speichern…' : 'Speichern'}
            </button>
          </section>

          <section className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Aktionen
            </h2>
            <div className="space-y-2">
              {contract.status !== 'signed' &&
                contract.status !== 'cancelled' && (
                  <button
                    onClick={markAsSignedManually}
                    className="btn-secondary w-full text-sm"
                  >
                    Als signiert markieren
                  </button>
                )}
              {contract.status !== 'cancelled' &&
                contract.status !== 'signed' && (
                  <button
                    onClick={cancelContract}
                    className="btn-secondary w-full text-sm text-amber-700 hover:bg-amber-50"
                  >
                    Stornieren
                  </button>
                )}
              <button
                onClick={deleteContractFully}
                className="btn-secondary w-full text-sm text-red-600 hover:bg-red-50"
              >
                Löschen
              </button>
            </div>
          </section>

          <section className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Stammdaten
            </h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-gray-500">
                  Kunde
                </dt>
                <dd className="text-gray-900">
                  {customer?.company ?? contract.customerSnapshot.company}
                  {customer?.firstName || customer?.lastName ? (
                    <span className="text-gray-500">
                      {' '}
                      ({customer?.firstName} {customer?.lastName})
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-gray-500">
                  Erstellt
                </dt>
                <dd className="text-gray-900">
                  {formatTsDE(contract.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-gray-500">
                  Felder
                </dt>
                <dd className="text-gray-900">
                  {contract.fields.length} platziert
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

function auditLabel(event: ContractAuditEntry['event']): string {
  const map: Record<ContractAuditEntry['event'], string> = {
    created: 'Vertrag erstellt',
    sent: 'Als versendet markiert',
    viewed: 'Vom Kunden geöffnet',
    signed: 'Vom Kunden signiert',
    reminder_sent: 'Erinnerung verschickt',
    manual_signed: 'Manuell als signiert markiert',
    cancelled: 'Storniert',
  };
  return map[event];
}

function formatAuditDate(
  ts: { toDate: () => Date } | null | undefined,
): string {
  const d = tsToDate(ts);
  if (!d) return '—';
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
