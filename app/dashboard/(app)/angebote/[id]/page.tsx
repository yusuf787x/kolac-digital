'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';
import {
  getQuote,
  getCustomer,
  updateQuote,
  deleteQuote,
  uploadFile,
  deleteFile,
  createInvoiceWithNumber,
  getSettings,
} from '@/lib/firestore';
import type { Quote, Customer, InvoiceItem } from '@/lib/types';
import { formatEUR, formatDateDE } from '@/lib/utils';
import {
  computeQuoteStatus,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_BADGE_CLASSES,
} from '@/lib/quote-status';

export default function AngebotDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);

  const refresh = async () => {
    const q = await getQuote(id);
    setQuote(q);
    if (q) {
      const c = await getCustomer(q.customerId);
      setCustomer(c);
    }
  };

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((err) => {
        console.error(err);
        setError(`Angebot konnte nicht geladen werden: ${err.message}`);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div className="card text-sm text-gray-500">Lädt…</div>;

  if (error || !quote) {
    return (
      <div className="card text-sm text-red-700 bg-red-50 border-red-200">
        {error ?? 'Angebot nicht gefunden.'}
      </div>
    );
  }

  const validUntil = quote.validUntil.toDate();
  const computedStatus = computeQuoteStatus(quote.status, validUntil);

  const setStatus = async (
    status: Quote['status'],
    extra: Partial<Quote> = {},
  ) => {
    setUpdatingStatus(true);
    try {
      await updateQuote(quote.id, { status, ...extra });
      await refresh();
    } catch (err) {
      console.error(err);
      alert(`Statusänderung fehlgeschlagen: ${(err as Error).message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!customer) {
      alert('Kunde nicht geladen — PDF kann nicht generiert werden.');
      return;
    }
    setGeneratingPdf(true);
    try {
      const {
        generateQuotePdfBlob,
        downloadBlob,
        buildQuoteFilename,
      } = await import('@/lib/pdf-generator');
      const blob = await generateQuotePdfBlob(quote, customer);
      downloadBlob(blob, buildQuoteFilename(quote, customer));
    } catch (err) {
      console.error(err);
      alert('PDF-Generierung fehlgeschlagen.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleUploadConfirmation = async (file: File) => {
    setUploading(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const path = `quotes/${quote.id}/confirmation-${Date.now()}-${safe}`;
      const url = await uploadFile(path, file);

      // Delete old file if there was one
      if (quote.confirmationFileUrl) {
        const oldPath = decodeStoragePath(quote.confirmationFileUrl);
        if (oldPath) {
          try {
            await deleteFile(oldPath);
          } catch (e) {
            console.warn('Alte Bestätigung konnte nicht gelöscht werden:', e);
          }
        }
      }

      await updateQuote(quote.id, {
        confirmationFileUrl: url,
        confirmationFilename: file.name,
        // If quote was 'sent', auto-promote to 'accepted' on confirmation upload
        ...(quote.status === 'sent'
          ? {
              status: 'accepted',
              acceptedAt: Timestamp.fromDate(new Date()),
            }
          : {}),
      });
      await refresh();
    } catch (err) {
      console.error(err);
      alert(`Upload fehlgeschlagen: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveConfirmation = async () => {
    if (!quote.confirmationFileUrl) return;
    if (!confirm('Auftragsbestätigung wirklich entfernen?')) return;
    try {
      const path = decodeStoragePath(quote.confirmationFileUrl);
      if (path) {
        try {
          await deleteFile(path);
        } catch (e) {
          console.warn('Storage-Datei konnte nicht entfernt werden:', e);
        }
      }
      await updateQuote(quote.id, {
        confirmationFileUrl: null,
        confirmationFilename: null,
      });
      await refresh();
    } catch (err) {
      console.error(err);
      alert(`Entfernen fehlgeschlagen: ${(err as Error).message}`);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!customer) return;
    if (
      !confirm(
        `Aus diesem Angebot wird eine Rechnung erstellt mit allen Positionen übernommen.\n\nFortfahren?`,
      )
    )
      return;
    setConverting(true);
    try {
      const settings = await getSettings();
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + settings.defaultPaymentDays);

      const items: InvoiceItem[] = quote.items.map((it, idx) => ({
        position: idx + 1,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
      }));

      const { id: invoiceId } = await createInvoiceWithNumber({
        customerId: quote.customerId,
        invoiceDate: Timestamp.fromDate(today),
        dueDate: Timestamp.fromDate(dueDate),
        status: 'draft',
        paidAmount: 0,
        totalAmount: quote.totalAmount,
        closingText: settings.defaultClosingText,
        pdfUrl: null,
        driveUrl: null,
        sentAt: null,
        paidAt: null,
        items,
      });

      await updateQuote(quote.id, {
        status: 'invoiced',
        invoicedAt: Timestamp.fromDate(today),
        invoiceId,
      });

      router.push(`/dashboard/rechnungen/${invoiceId}`);
    } catch (err) {
      console.error(err);
      alert(`Konvertierung fehlgeschlagen: ${(err as Error).message}`);
      setConverting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Angebot ${quote.quoteNumber} wirklich löschen?`)) return;
    try {
      if (quote.confirmationFileUrl) {
        const path = decodeStoragePath(quote.confirmationFileUrl);
        if (path) {
          try {
            await deleteFile(path);
          } catch (e) {
            console.warn(e);
          }
        }
      }
      await deleteQuote(quote.id);
      router.push('/dashboard/angebote');
    } catch (err) {
      console.error(err);
      alert('Löschen fehlgeschlagen.');
    }
  };

  const isDraft = quote.status === 'draft';
  const canConvert = quote.status === 'accepted';
  const isInvoiced = quote.status === 'invoiced';

  return (
    <div>
      <header className="mb-8">
        <Link
          href="/dashboard/angebote"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu Angeboten
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 flex items-center gap-3">
              {quote.quoteNumber}
              <span
                className={`text-sm font-medium px-2 py-0.5 rounded ${QUOTE_STATUS_BADGE_CLASSES[computedStatus]}`}
              >
                {QUOTE_STATUS_LABELS[computedStatus]}
              </span>
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {customer?.company ?? 'Kunde unbekannt'} ·{' '}
              {formatDateDE(quote.quoteDate.toDate())} · gültig bis{' '}
              {formatDateDE(validUntil)}
            </p>
            {isInvoiced && quote.invoiceId && (
              <p className="mt-1 text-sm text-green-700">
                <Link
                  href={`/dashboard/rechnungen/${quote.invoiceId}`}
                  className="hover:underline"
                >
                  → Zur erstellten Rechnung
                </Link>
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {isDraft && (
              <Link
                href={`/dashboard/angebote/${quote.id}/edit`}
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
            {canConvert && (
              <button
                onClick={handleConvertToInvoice}
                disabled={converting}
                className="btn-primary"
              >
                {converting ? 'Erstelle Rechnung…' : 'Als Rechnung abrechnen'}
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={isInvoiced}
              className="btn-secondary text-red-600 hover:bg-red-50 disabled:opacity-50"
              title={isInvoiced ? 'Abgerechnete Angebote können nicht gelöscht werden.' : ''}
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
          {quote.status === 'draft' && (
            <button
              onClick={() =>
                setStatus('sent', { sentAt: Timestamp.fromDate(new Date()) })
              }
              disabled={updatingStatus}
              className="btn-primary"
            >
              Als versendet markieren
            </button>
          )}
          {quote.status === 'sent' && (
            <>
              <button
                onClick={() =>
                  setStatus('accepted', {
                    acceptedAt: Timestamp.fromDate(new Date()),
                  })
                }
                disabled={updatingStatus}
                className="btn-primary"
              >
                Angenommen
              </button>
              <button
                onClick={() =>
                  setStatus('rejected', {
                    rejectedAt: Timestamp.fromDate(new Date()),
                  })
                }
                disabled={updatingStatus}
                className="btn-secondary text-red-600 hover:bg-red-50"
              >
                Abgelehnt
              </button>
            </>
          )}
          {quote.status === 'accepted' && (
            <p className="text-sm text-gray-700">
              ✓ Angenommen
              {quote.acceptedAt &&
                ` am ${formatDateDE(quote.acceptedAt.toDate())}`}
              {' — '}als nächstes auf Rechnung umstellen.
            </p>
          )}
          {quote.status === 'rejected' && (
            <p className="text-sm text-gray-700">
              ✗ Abgelehnt
              {quote.rejectedAt &&
                ` am ${formatDateDE(quote.rejectedAt.toDate())}`}
              .
            </p>
          )}
          {quote.status === 'invoiced' && (
            <p className="text-sm text-gray-700">
              ✓ Abgerechnet
              {quote.invoicedAt &&
                ` am ${formatDateDE(quote.invoicedAt.toDate())}`}
              .
            </p>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="card lg:col-span-1 space-y-4">
          <div>
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
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Auftragsbestätigung
            </h2>
            {quote.confirmationFileUrl ? (
              <div className="space-y-2">
                <a
                  href={quote.confirmationFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-blue hover:underline block break-all"
                >
                  📎 {quote.confirmationFilename ?? 'Bestätigungs-Datei'}
                </a>
                <button
                  onClick={handleRemoveConfirmation}
                  className="text-xs text-red-600 hover:underline"
                >
                  Entfernen
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  Lade die schriftliche Bestätigung des Kunden hoch
                  (Mail-Screenshot, WhatsApp-Screenshot, signierte PDF).
                </p>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadConfirmation(f);
                  }}
                  className="block w-full text-xs text-gray-700 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                />
                {uploading && (
                  <p className="mt-1 text-xs text-blue-700">Lädt hoch…</p>
                )}
              </div>
            )}
          </div>
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
              {quote.items.map((item) => (
                <tr key={item.position}>
                  <td className="py-3 whitespace-pre-line text-gray-900">
                    {item.description}
                  </td>
                  <td className="py-3 text-right text-gray-700">
                    {item.quantity}
                  </td>
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
              <tr>
                <td colSpan={3} className="py-2 text-right font-semibold">
                  Gesamtbetrag
                </td>
                <td className="py-2 text-right font-semibold text-brand-blue">
                  {formatEUR(quote.totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>

          {quote.acceptanceText && (
            <div className="mt-6 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900 whitespace-pre-line">
              <strong>Hinweis zur Bestätigung:</strong>
              {'\n'}
              {quote.acceptanceText}
            </div>
          )}

          {quote.closingText && (
            <p className="mt-4 text-sm text-gray-700 whitespace-pre-line border-t border-gray-100 pt-4">
              {quote.closingText}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function decodeStoragePath(url: string): string | null {
  const m = url.match(/\/o\/([^?]+)/);
  if (!m) return null;
  return decodeURIComponent(m[1]);
}
