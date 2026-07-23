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
  createInvoiceDraft,
  createQuoteWithNumber,
  createOrderConfirmationFromQuote,
  getSettings,
  getGoogleAuth,
} from '@/lib/firestore';
import type { Quote, Customer, InvoiceItem } from '@/lib/types';
import { formatEUR, formatDateDE, computeInvoiceVat } from '@/lib/utils';
import SensitiveValue from '@/components/ui/SensitiveValue';
import {
  computeQuoteStatus,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_BADGE_CLASSES,
} from '@/lib/quote-status';
import { parseRichText, type MdInlineSegment } from '@/lib/simple-markdown';

/**
 * Rendert Markdown-Bloecke (Absaetze + Aufzaehlung, **fett**) im
 * Angebots-UI. Kein HTML aus Nutzer-Input, kein dangerouslySetInnerHTML —
 * die Segmente kommen aus dem eigenen Parser.
 */
function MarkdownView({
  text,
  className = 'text-sm text-gray-700',
}: {
  text: string;
  className?: string;
}) {
  const blocks = parseRichText(text);
  if (blocks.length === 0) return null;
  const renderInline = (segs: MdInlineSegment[]) =>
    segs.map((s, i) =>
      s.bold ? (
        <strong key={i} className="font-semibold text-gray-900">
          {s.text}
        </strong>
      ) : (
        <span key={i}>{s.text}</span>
      ),
    );
  return (
    <div className={className}>
      {blocks.map((b, i) =>
        b.type === 'bullet' ? (
          <div key={i} className="flex gap-2">
            <span className="text-gray-400">•</span>
            <span>{renderInline(b.segments)}</span>
          </div>
        ) : (
          <p key={i} className="mb-1 last:mb-0">
            {renderInline(b.segments)}
          </p>
        ),
      )}
    </div>
  );
}

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
  const [duplicating, setDuplicating] = useState(false);
  const [creatingConfirmation, setCreatingConfirmation] = useState(false);
  const [syncingConfirmation, setSyncingConfirmation] = useState(false);
  const [confirmationSyncMessage, setConfirmationSyncMessage] = useState<
    string | null
  >(null);

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
    setConfirmationSyncMessage(null);
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
        // Reset Drive URL — we'll re-upload below if Drive is connected.
        confirmationDriveUrl: null,
        // If quote was 'sent', auto-promote to 'accepted' on confirmation upload
        ...(quote.status === 'sent'
          ? {
              status: 'accepted',
              acceptedAt: Timestamp.fromDate(new Date()),
            }
          : {}),
      });
      await refresh();
      setUploading(false);

      // Drive-Sync — non-blocking, runs after Storage upload succeeded.
      if (customer) {
        try {
          const auth = await getGoogleAuth();
          if (auth?.refreshToken) {
            setSyncingConfirmation(true);
            setConfirmationSyncMessage(
              'Synchronisiere mit Google Drive (Aufträge)…',
            );
            const { syncConfirmationToDrive } = await import(
              '@/lib/drive-sync'
            );
            await syncConfirmationToDrive(quote, customer, file);
            await refresh();
            setConfirmationSyncMessage(
              'Auch in Drive-Ordner "Aufträge" gesichert ✓',
            );
            setTimeout(() => setConfirmationSyncMessage(null), 4000);
          }
        } catch (syncErr) {
          console.warn('Drive-Sync fehlgeschlagen:', syncErr);
          setConfirmationSyncMessage(
            `Drive-Sync fehlgeschlagen (${(syncErr as Error).message}). Datei ist im Dashboard verfügbar.`,
          );
        } finally {
          setSyncingConfirmation(false);
        }
      }
    } catch (err) {
      console.error(err);
      alert(`Upload fehlgeschlagen: ${(err as Error).message}`);
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
      // Note: the Drive-Aufträge file is intentionally kept — the user may
      // want it as backup. Remove it manually in Drive if needed.
      await updateQuote(quote.id, {
        confirmationFileUrl: null,
        confirmationFilename: null,
        confirmationDriveUrl: null,
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

      // Optionale Positionen werden bei der Rechnung NICHT uebernommen —
      // die waren nur Vorschlag. Wenn der Kunde sie zusaetzlich beauftragt
      // hat, muss sie manuell in der Rechnung ergaenzt werden.
      const binding = quote.items.filter((it) => !it.optional);
      const items: InvoiceItem[] = binding.map((it, idx) => ({
        position: idx + 1,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
        // Position-spezifischen VAT-Satz mit uebernehmen (z.B. 0% fuer
        // durchlaufende Posten wie Werbebudget-Weiterberechnung).
        ...(it.vatRate !== undefined ? { vatRate: it.vatRate } : {}),
      }));
      const bindingTotal = binding.reduce((acc, it) => acc + it.totalPrice, 0);

      // Wird als ENTWURF angelegt — Rechnungsnummer bekommt sie erst,
      // wenn du auf der Rechnungs-Detail-Seite "Rechnung stellen"
      // klickst. So kannst du sie noch pruefen / anpassen bevor sie
      // buchhaltungsrelevant wird.
      const { id: invoiceId } = await createInvoiceDraft({
        customerId: quote.customerId,
        invoiceDate: Timestamp.fromDate(today),
        dueDate: Timestamp.fromDate(dueDate),
        status: 'draft',
        paidAmount: 0,
        totalAmount: bindingTotal,
        // MwSt-Satz aus dem Angebot uebernehmen, damit die neue Rechnung
        // exakt dieselbe Steuerlogik hat (kein Sprung durch Default-Wechsel).
        vatRate: quote.vatRate,
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

  /**
   * Angebot duplizieren: legt ein neues Angebot mit denselben Positionen,
   * Texten und MwSt-Einstellung an. Bekommt eine frische Angebotsnummer
   * ueber die laufende Zaehlung. Alles Zeit- und Status-Spezifische
   * (Datum, Gueltigkeit, gesendet/angenommen/abgerechnet, hochgeladene
   * Auftragsbestaetigung, PDF-URLs, verknuepfte Rechnung) wird
   * zurueckgesetzt — die Kopie startet als sauberer Entwurf.
   */
  /**
   * Aus dem Angebot eine Auftragsbestaetigung ableiten. Erzeugt ein
   * neues Quote-Doc mit documentType='order_confirmation', eigener
   * AB-YYYY-NNN-Nummer aus dem separaten Zaehler, denselben Positionen
   * und MwSt-Einstellungen. Introtext bleibt leer — Nutzer fuellt oben
   * das Feld selbst mit dem gewuenschten Text.
   */
  const handleCreateOrderConfirmation = async () => {
    if (!quote) return;
    setCreatingConfirmation(true);
    try {
      const { id } = await createOrderConfirmationFromQuote(quote);
      router.push(`/dashboard/angebote/${id}`);
    } catch (err) {
      console.error(err);
      alert(
        `Auftragsbestätigung erstellen fehlgeschlagen: ${(err as Error).message}`,
      );
      setCreatingConfirmation(false);
    }
  };

  const handleDuplicate = async () => {
    if (!quote) return;
    setDuplicating(true);
    try {
      // Bei Duplizieren einer Auftragsbestaetigung: neue AB mit eigenem
      // AB-Nummernkreis, nicht als Angebot!
      if (quote.documentType === 'order_confirmation') {
        const { id: newId } = await createOrderConfirmationFromQuote(quote);
        router.push(`/dashboard/angebote/${newId}`);
        return;
      }
      const settings = await getSettings();
      const today = new Date();
      const validUntil = new Date(today);
      validUntil.setDate(
        validUntil.getDate() + (settings.defaultQuoteValidDays ?? 14),
      );

      // Positionen 1:1 uebernehmen inkl. optional-Flag und
      // position-spezifischem vatRate (z.B. 0 % fuer durchlaufende Posten).
      const items: InvoiceItem[] = quote.items.map((it, idx) => ({
        position: idx + 1,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
        ...(it.optional ? { optional: true } : {}),
        ...(it.vatRate !== undefined ? { vatRate: it.vatRate } : {}),
      }));

      const { id: newId } = await createQuoteWithNumber({
        customerId: quote.customerId,
        quoteDate: Timestamp.fromDate(today),
        validUntil: Timestamp.fromDate(validUntil),
        status: 'draft',
        totalAmount: quote.totalAmount,
        vatRate: quote.vatRate,
        introText: quote.introText,
        closingText: quote.closingText,
        acceptanceText: quote.acceptanceText,
        items,
        // Alles Frische zurueck auf null.
        pdfUrl: null,
        driveUrl: null,
        confirmationFileUrl: null,
        confirmationFilename: null,
        confirmationDriveUrl: null,
        sentAt: null,
        acceptedAt: null,
        rejectedAt: null,
        invoicedAt: null,
        invoiceId: null,
      });
      router.push(`/dashboard/angebote/${newId}`);
    } catch (err) {
      console.error(err);
      alert(`Duplizieren fehlgeschlagen: ${(err as Error).message}`);
      setDuplicating(false);
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
  const isOrderConfirmation = quote.documentType === 'order_confirmation';
  // AB kann nur aus einem angenommenen Angebot abgeleitet werden.
  const canDeriveConfirmation =
    !isOrderConfirmation && quote.status === 'accepted';

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
            <h1 className="text-3xl font-semibold text-gray-900 flex items-center gap-3 flex-wrap">
              {quote.quoteNumber}
              {isOrderConfirmation && (
                <span className="text-sm font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Auftragsbestätigung
                </span>
              )}
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
            <button
              onClick={handleDuplicate}
              disabled={duplicating}
              className="btn-secondary"
              title={
                isOrderConfirmation
                  ? 'Legt eine neue Auftragsbestätigung mit denselben Positionen an.'
                  : 'Legt ein neues Angebot mit denselben Positionen und Texten an.'
              }
            >
              {duplicating ? 'Dupliziere…' : 'Duplizieren'}
            </button>
            {canDeriveConfirmation && (
              <button
                onClick={handleCreateOrderConfirmation}
                disabled={creatingConfirmation}
                className="btn-primary"
                title="Erzeugt aus diesem angenommenen Angebot eine neue Auftragsbestätigung mit eigener AB-Nummer."
              >
                {creatingConfirmation
                  ? 'Erstelle AB…'
                  : 'Auftragsbestätigung erstellen'}
              </button>
            )}
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
                {quote.confirmationDriveUrl && (
                  <a
                    href={quote.confirmationDriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-500 hover:underline block"
                  >
                    ↗ In Google Drive (Ordner Aufträge) öffnen
                  </a>
                )}
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
                  Wird automatisch zusätzlich in Drive-Ordner "Aufträge"
                  gespeichert, wenn Drive verbunden.
                </p>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={uploading || syncingConfirmation}
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
            {confirmationSyncMessage && (
              <p className="mt-2 text-xs text-gray-700">
                {confirmationSyncMessage}
              </p>
            )}
          </div>
        </section>

        <section className="card lg:col-span-2">
          {quote.introText && quote.introText.trim() && (
            <div className="mb-5 pb-5 border-b border-gray-100">
              <MarkdownView text={quote.introText} />
            </div>
          )}
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
              {quote.items.map((item) => {
                const lines = item.description.split('\n');
                const head = lines[0] ?? '';
                const rest = lines.slice(1).join('\n');
                const isOptional = !!item.optional;
                return (
                <tr
                  key={item.position}
                  className={isOptional ? 'bg-amber-50/40' : ''}
                >
                  <td className="py-3 text-gray-900">
                    <div className="font-medium flex items-center gap-2">
                      {isOptional && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          Optional
                        </span>
                      )}
                      <span>{head}</span>
                    </div>
                    {rest.trim() && (
                      <MarkdownView
                        text={rest}
                        className="mt-1 text-xs text-gray-600"
                      />
                    )}
                  </td>
                  <td className="py-3 text-right text-gray-700">
                    {item.quantity}
                  </td>
                  <td className="py-3 text-right text-gray-700">
                    <SensitiveValue>{formatEUR(item.unitPrice)}</SensitiveValue>
                  </td>
                  <td
                    className={`py-3 text-right font-medium ${
                      isOptional ? 'text-amber-700' : 'text-gray-900'
                    }`}
                  >
                    <SensitiveValue>
                      {isOptional
                        ? `(${formatEUR(item.totalPrice)})`
                        : formatEUR(item.totalPrice)}
                    </SensitiveValue>
                  </td>
                </tr>
                );
              })}
            </tbody>
            <tfoot>
              {(() => {
                const v = computeInvoiceVat(quote.items, quote.vatRate);
                const optV = computeInvoiceVat(
                  quote.items.filter((it) => it.optional),
                  quote.vatRate,
                  { includeOptional: true },
                );
                return (
                  <>
                    <tr className="border-t border-gray-200">
                      <td
                        colSpan={3}
                        className="py-2 text-right text-sm text-gray-500"
                      >
                        Total netto
                      </td>
                      <td className="py-2 text-right text-sm text-gray-700">
                        <SensitiveValue>{formatEUR(v.net)}</SensitiveValue>
                      </td>
                    </tr>
                    {v.byRate.map((r) => (
                      <tr key={r.rate}>
                        <td
                          colSpan={3}
                          className="py-1 text-right text-sm text-gray-500"
                        >
                          USt ({Math.round(r.rate * 100)} %)
                          {v.byRate.length > 1
                            ? ` auf ${formatEUR(r.net)}`
                            : ''}
                        </td>
                        <td className="py-1 text-right text-sm text-gray-700">
                          <SensitiveValue>{formatEUR(r.vat)}</SensitiveValue>
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td
                        colSpan={3}
                        className="py-2 text-right font-semibold"
                      >
                        Gesamtbetrag brutto
                      </td>
                      <td className="py-2 text-right font-semibold text-brand-blue">
                        <SensitiveValue>{formatEUR(v.gross)}</SensitiveValue>
                      </td>
                    </tr>
                    {optV.gross > 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-2 text-right text-xs text-amber-700"
                        >
                          Optional zubuchbar (brutto)
                        </td>
                        <td className="py-2 text-right text-xs text-amber-700">
                          <SensitiveValue>{formatEUR(optV.gross)}</SensitiveValue>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })()}
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
