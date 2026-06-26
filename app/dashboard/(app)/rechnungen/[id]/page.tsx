'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';
import {
  getInvoice,
  getCustomer,
  updateInvoice,
  deleteInvoice,
} from '@/lib/firestore';
import type { Invoice, Customer } from '@/lib/types';
import {
  formatEUR,
  formatDateDE,
  isOverdue,
  daysOverdue,
} from '@/lib/utils';
import { STATUS_LABELS, STATUS_BADGE_CLASSES } from '@/lib/invoice-status';
import { authedFetch } from '@/lib/api-client';
// PDF generator and drive sync are dynamic imports — they pull in
// @react-pdf/renderer (~500kB) which we only need on-demand.

export default function RechnungDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [syncingDrive, setSyncingDrive] = useState(false);

  // Live-Vorschau: PDF wird beim Laden der Seite einmal client-seitig
  // gerendert und als Blob-URL in einem Iframe angezeigt. So funktioniert
  // die Vorschau auch fuer aelte Rechnungen, fuer die kein pdfUrl in
  // Storage liegt.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const refresh = async () => {
    const inv = await getInvoice(id);
    setInvoice(inv);
    if (inv) {
      const c = await getCustomer(inv.customerId);
      setCustomer(c);
    }
  };

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((err) => {
        console.error(err);
        setError('Rechnung konnte nicht geladen werden.');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // PDF live im Browser rendern, sobald Invoice + Kunde geladen sind.
  // Existierende Blob-URL beim Wechsel/Unmount aufraeumen.
  useEffect(() => {
    if (!invoice || !customer) return;
    let cancelled = false;
    let createdUrl: string | null = null;
    setPreviewError(null);
    (async () => {
      try {
        const { generateInvoicePdfBlob } = await import(
          '@/lib/pdf-generator'
        );
        const blob = await generateInvoicePdfBlob(invoice, customer);
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setPreviewUrl(createdUrl);
      } catch (err) {
        console.error(err);
        if (!cancelled)
          setPreviewError(
            `Vorschau konnte nicht gerendert werden: ${(err as Error).message}`,
          );
      }
    })();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [invoice, customer]);

  if (loading) return <div className="card text-sm text-gray-500">Lädt…</div>;

  if (error || !invoice) {
    return (
      <div className="card text-sm text-red-700 bg-red-50 border-red-200">
        {error ?? 'Rechnung nicht gefunden.'}
      </div>
    );
  }

  const dueDate = invoice.dueDate.toDate();
  const computedStatus =
    invoice.status !== 'paid' &&
    invoice.status !== 'partially_paid' &&
    isOverdue(invoice.status, dueDate)
      ? 'overdue'
      : invoice.status;
  const daysLate = computedStatus === 'overdue' ? daysOverdue(dueDate) : 0;

  const setStatus = async (status: Invoice['status'], extra: Partial<Invoice> = {}) => {
    setUpdatingStatus(true);
    try {
      await updateInvoice(invoice.id, { status, ...extra });
      await refresh();
    } catch (err) {
      console.error(err);
      alert('Statusänderung fehlgeschlagen.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const markSent = () =>
    setStatus('sent', {
      sentAt: Timestamp.fromDate(new Date()),
    });

  const markPaid = () =>
    setStatus('paid', {
      paidAmount: invoice.totalAmount,
      paidAt: Timestamp.fromDate(new Date()),
    });

  const markPartiallyPaid = () => {
    const input = prompt(
      `Bezahlter Betrag (von ${formatEUR(invoice.totalAmount)}):`,
      invoice.paidAmount > 0 ? invoice.paidAmount.toString() : '',
    );
    if (input === null) return;
    const amount = parseFloat(input.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      alert('Ungültiger Betrag.');
      return;
    }
    if (amount >= invoice.totalAmount) {
      markPaid();
      return;
    }
    setStatus('partially_paid', { paidAmount: amount });
  };

  const handleDelete = async () => {
    if (!confirm(`Rechnung ${invoice.invoiceNumber} wirklich löschen?`)) return;
    try {
      await deleteInvoice(invoice.id);
      router.push('/dashboard/rechnungen');
    } catch (err) {
      console.error(err);
      alert('Löschen fehlgeschlagen.');
    }
  };

  const handleDownloadPdf = async () => {
    if (!customer) {
      alert('Kunde nicht geladen — PDF kann nicht generiert werden.');
      return;
    }
    setGeneratingPdf(true);
    try {
      const { generateInvoicePdfBlob, downloadBlob, buildInvoiceFilename } =
        await import('@/lib/pdf-generator');
      const blob = await generateInvoicePdfBlob(invoice, customer);
      downloadBlob(blob, buildInvoiceFilename(invoice, customer));
    } catch (err) {
      console.error(err);
      alert('PDF-Generierung fehlgeschlagen.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    if (!customer || !customer.email) {
      alert('Kein E-Mail-Empfänger im Kundenprofil hinterlegt.');
      return;
    }
    if (
      !confirm(
        `Rechnung ${invoice.invoiceNumber} an ${customer.email} per E-Mail senden?`,
      )
    )
      return;
    setSendingEmail(true);
    try {
      const { generateInvoicePdfBlob, buildInvoiceFilename } =
        await import('@/lib/pdf-generator');
      const { fileToBase64 } = await import('@/lib/file-utils');
      const blob = await generateInvoicePdfBlob(invoice, customer);
      const base64 = await fileToBase64(blob);
      const filename = buildInvoiceFilename(invoice, customer);

      const res = await authedFetch('/api/email/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: customer.email,
          customerName: [customer.firstName, customer.lastName]
            .filter(Boolean)
            .join(' ') || customer.company,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount,
          dueDate: formatDateDE(invoice.dueDate.toDate()),
          pdfBase64: base64,
          filename,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Versand fehlgeschlagen');
      }

      await updateInvoice(invoice.id, {
        status: invoice.status === 'draft' ? 'sent' : invoice.status,
        sentAt: invoice.sentAt ?? Timestamp.fromDate(new Date()),
      });
      await refresh();
      alert('E-Mail erfolgreich versendet.');
    } catch (err) {
      console.error(err);
      alert(`Versand fehlgeschlagen: ${(err as Error).message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSyncDrive = async () => {
    if (!customer) return;
    setSyncingDrive(true);
    try {
      const { syncInvoiceToDrive } = await import('@/lib/drive-sync');
      const { webViewLink, sheetSyncError } = await syncInvoiceToDrive(
        invoice,
        customer,
      );
      await refresh();
      if (sheetSyncError) {
        alert(
          `PDF auf Drive gesichert ✓\n${webViewLink}\n\nABER: Sheet-Eintrag fehlgeschlagen — ${sheetSyncError}\n\nDu kannst die Zeile manuell ergänzen.`,
        );
      } else {
        alert(`Auf Google Drive gesichert ✓ (PDF + Sheet-Eintrag)\n${webViewLink}`);
      }
    } catch (err) {
      console.error(err);
      alert(`Drive-Sync fehlgeschlagen: ${(err as Error).message}`);
    } finally {
      setSyncingDrive(false);
    }
  };

  const handleSendReminder = async () => {
    if (!customer || !customer.email) {
      alert('Kein E-Mail-Empfänger im Kundenprofil hinterlegt.');
      return;
    }
    if (!confirm(`Zahlungserinnerung an ${customer.email} senden?`)) return;
    setSendingEmail(true);
    try {
      const dueDateString = formatDateDE(invoice.dueDate.toDate());
      const days = daysOverdue(invoice.dueDate.toDate());
      const remaining =
        invoice.status === 'partially_paid'
          ? invoice.totalAmount - invoice.paidAmount
          : invoice.totalAmount;

      const res = await authedFetch('/api/email/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: customer.email,
          customerName: [customer.firstName, customer.lastName]
            .filter(Boolean)
            .join(' ') || customer.company,
          invoiceNumber: invoice.invoiceNumber,
          dueDate: dueDateString,
          daysOverdue: days,
          remainingAmount: remaining,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Versand fehlgeschlagen');
      }
      alert('Erinnerung versendet.');
    } catch (err) {
      console.error(err);
      alert(`Versand fehlgeschlagen: ${(err as Error).message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const isDraft = invoice.status === 'draft';
  const remaining = invoice.totalAmount - invoice.paidAmount;

  return (
    <div>
      <header className="mb-8">
        <Link
          href="/dashboard/rechnungen"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu Rechnungen
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 flex items-center gap-3">
              {invoice.invoiceNumber}
              <span
                className={`text-sm font-medium px-2 py-0.5 rounded ${STATUS_BADGE_CLASSES[computedStatus]}`}
              >
                {STATUS_LABELS[computedStatus]}
                {computedStatus === 'overdue' && daysLate > 0 && (
                  <span> · {daysLate} Tage</span>
                )}
              </span>
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {customer?.company ?? 'Kunde unbekannt'} ·{' '}
              {formatDateDE(invoice.invoiceDate.toDate())} · zahlbar bis{' '}
              {formatDateDE(dueDate)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isDraft && (
              <Link
                href={`/dashboard/rechnungen/${invoice.id}/edit`}
                className="btn-secondary"
              >
                Bearbeiten
              </Link>
            )}
            <button
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="btn-secondary"
            >
              {generatingPdf ? 'Generiere PDF…' : 'PDF herunterladen'}
            </button>
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail || !customer?.email}
              className="btn-secondary"
              title={
                !customer?.email
                  ? 'Keine E-Mail im Kundenprofil hinterlegt'
                  : ''
              }
            >
              {sendingEmail ? 'Sende…' : 'Per E-Mail senden'}
            </button>
            <button
              onClick={handleSyncDrive}
              disabled={syncingDrive || !customer}
              className="btn-secondary"
            >
              {syncingDrive
                ? 'Synct…'
                : invoice.driveUrl
                  ? 'Drive: aktualisieren'
                  : 'Auf Drive sichern'}
            </button>
            <button
              onClick={handleDelete}
              className="btn-secondary text-red-600 hover:bg-red-50"
            >
              Löschen
            </button>
          </div>
        </div>
      </header>

      {/* Status-Aktionen */}
      <section className="card mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Status</h2>
        <div className="flex flex-wrap gap-2">
          {invoice.status === 'draft' && (
            <button
              onClick={markSent}
              disabled={updatingStatus}
              className="btn-primary"
            >
              Als versendet markieren
            </button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'partially_paid') && (
            <>
              <button
                onClick={markPaid}
                disabled={updatingStatus}
                className="btn-primary"
              >
                Vollständig bezahlt
              </button>
              <button
                onClick={markPartiallyPaid}
                disabled={updatingStatus}
                className="btn-secondary"
              >
                Teilweise bezahlt…
              </button>
              <button
                onClick={handleSendReminder}
                disabled={sendingEmail || !customer?.email}
                className="btn-secondary"
                title={
                  !customer?.email
                    ? 'Keine E-Mail im Kundenprofil hinterlegt'
                    : ''
                }
              >
                {sendingEmail ? 'Sende…' : 'Erinnerung senden'}
              </button>
            </>
          )}
          {invoice.status === 'paid' && (
            <p className="text-sm text-gray-500">
              Bezahlt
              {invoice.paidAt && ` am ${formatDateDE(invoice.paidAt.toDate())}`}.
            </p>
          )}
        </div>
        {invoice.status === 'partially_paid' && (
          <p className="mt-3 text-sm text-gray-700">
            Bezahlt: <strong>{formatEUR(invoice.paidAmount)}</strong> von{' '}
            {formatEUR(invoice.totalAmount)} · Rest{' '}
            <strong className="text-orange-700">{formatEUR(remaining)}</strong>
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="card lg:col-span-1">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Kunde</h2>
          {customer ? (
            <div className="text-sm text-gray-700 whitespace-pre-line">
              {customer.salutation} {customer.firstName} {customer.lastName}
              {'\n'}
              {customer.company}
              {customer.street && `\n${customer.street}`}
              {(customer.zip || customer.city) &&
                `\n${customer.zip} ${customer.city}`}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Kunde nicht gefunden.</p>
          )}
        </section>

        <section className="card lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Positionen
          </h2>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-500 tracking-wider border-b border-gray-100">
              <tr>
                <th className="text-left py-2">Beschreibung</th>
                <th className="text-right py-2 w-16">Anzahl</th>
                <th className="text-right py-2 w-24">Einzel</th>
                <th className="text-right py-2 w-28">Summe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.items.map((item) => (
                <tr key={item.position}>
                  <td className="py-3 whitespace-pre-line text-gray-900">
                    {item.description}
                  </td>
                  <td className="py-3 text-right text-gray-700">{item.quantity}</td>
                  <td className="py-3 text-right text-gray-700">
                    {formatEUR(item.unitPrice)}
                  </td>
                  <td className="py-3 text-right font-medium text-gray-900">
                    {formatEUR(item.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td colSpan={3} className="py-2 text-right text-sm text-gray-500">
                  Total netto
                </td>
                <td className="py-2 text-right text-sm text-gray-700">
                  {formatEUR(invoice.totalAmount)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="py-1 text-right text-sm text-gray-500">
                  USt (0%)
                </td>
                <td className="py-1 text-right text-sm text-gray-700">
                  {formatEUR(0)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="py-2 text-right font-semibold">
                  Gesamtbetrag
                </td>
                <td className="py-2 text-right font-semibold text-brand-blue">
                  {formatEUR(invoice.totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>

          {invoice.closingText && (
            <p className="mt-6 text-sm text-gray-700 whitespace-pre-line border-t border-gray-100 pt-4">
              {invoice.closingText}
            </p>
          )}
        </section>
      </div>

      {/* PDF-Vorschau in voller Breite — wird live client-seitig aus
          den aktuellen Daten gerendert, damit jede Rechnung (auch
          bestehende ohne hochgeladenes PDF) eine Vorschau hat. */}
      <section className="card mt-6 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            PDF-Vorschau
          </h2>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-brand-blue hover:underline font-medium"
            >
              In neuem Tab öffnen ↗
            </a>
          )}
        </div>
        {previewError ? (
          <div className="p-5 text-sm text-red-700 bg-red-50">
            {previewError}
          </div>
        ) : previewUrl ? (
          <iframe
            src={`${previewUrl}#toolbar=0&navpanes=0`}
            title={`Rechnung ${invoice.invoiceNumber}`}
            className="w-full block"
            style={{ height: 'min(1100px, 80vh)', border: 0 }}
          />
        ) : (
          <div className="p-5 text-sm text-gray-500">PDF wird gerendert…</div>
        )}
      </section>
    </div>
  );
}
