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
  finalizeInvoiceWithNumber,
  getGoogleAuth,
  addInvoicePayment,
  removeInvoicePayment,
  createInvoiceDraft,
  getSettings,
  cancelInvoice,
} from '@/lib/firestore';
import type { Invoice, Customer, InvoicePayment } from '@/lib/types';
import {
  formatEUR,
  formatDateDE,
  isOverdue,
  daysOverdue,
  computeInvoiceVat,
  effectivePayments,
  invoiceGrossTotal,
} from '@/lib/utils';
import {
  invoiceStatusBadgeClass,
  invoiceStatusLabel,
  isCancelledOrCancellation,
} from '@/lib/invoice-status';
import SensitiveValue from '@/components/ui/SensitiveValue';
import DunningPanel from '@/components/invoice/DunningPanel';
import { authedFetch } from '@/lib/api-client';
import { invoiceRecipients } from '@/lib/invoice-recipients';
import { buildCancellationEmail, buildInvoiceEmail } from '@/lib/email-templates';
import Modal from '@/components/ui/Modal';
import EmailPreviewFrame from '@/components/email/EmailPreviewFrame';
import { parseRichText, type MdInlineSegment } from '@/lib/simple-markdown';

// Rich-Text-Renderer fuer Positions-Beschreibungen (fett + Bullets),
// analog zur Angebots-Detail-Page. Sicheres HTML-freies Rendering ueber
// unseren eigenen Parser.
function ItemDescription({ text }: { text: string }) {
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
  const [title, ...rest] = blocks;
  return (
    <div>
      {title && (
        <div className="font-medium text-gray-900">
          {renderInline(title.segments)}
        </div>
      )}
      {rest.length > 0 && (
        <div className="mt-1 text-xs text-gray-600">
          {rest.map((b, i) =>
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
      )}
    </div>
  );
}
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
  // Versand-Dialog mit Mail-Vorschau und Testmail an Yusuf
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [mailNotice, setMailNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  // Storno-Dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelCreateDraft, setCancelCreateDraft] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [finalizeMsg, setFinalizeMsg] = useState<string | null>(null);

  // Live-Vorschau: PDF wird beim Laden der Seite einmal client-seitig
  // gerendert und als Blob-URL in einem Iframe angezeigt. So funktioniert
  // die Vorschau auch fuer aelte Rechnungen, fuer die kein pdfUrl in
  // Storage liegt.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Zahlungs-Dialog (Ist-Versteuerung). Hooks muessen VOR den Early-
  // Returns stehen, damit die Hook-Reihenfolge zwischen Renderphasen
  // stabil bleibt (Rules of Hooks).
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payDate, setPayDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [payAmount, setPayAmount] = useState<string>('');
  const [payNote, setPayNote] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

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

  // --- Zahlungseingaenge ---
  // Alle Betraege rund um Zahlungen sind BRUTTO. `totalAmount` ist netto,
  // deshalb hier einmal hochrechnen. Die Zahlungshistorie ist die
  // maßgebliche Quelle — daraus wird der bezahlte und der offene Betrag
  // abgeleitet, nicht aus dem gespeicherten paidAmount.
  const bruttoTotal = invoiceGrossTotal(invoice);

  const paymentsList: InvoicePayment[] = (
    effectivePayments(invoice) as InvoicePayment[]
  )
    .slice()
    .sort((a, b) => a.paidAt.toMillis() - b.paidAt.toMillis());

  const paidBrutto =
    Math.round(paymentsList.reduce((s, p) => s + p.amount, 0) * 100) / 100;
  const openBrutto = Math.round((bruttoTotal - paidBrutto) * 100) / 100;

  const openPaymentDialog = (prefill?: number) => {
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayAmount(
      (prefill ?? openBrutto).toFixed(2).replace('.', ','),
    );
    setPayNote('');
    setPayError(null);
    setPayDialogOpen(true);
  };

  const submitPayment = async () => {
    setPayError(null);
    const amount = parseFloat(payAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      setPayError('Bitte einen gueltigen Betrag angeben.');
      return;
    }
    const [y, m, d] = payDate.split('-').map(Number);
    if (!y || !m || !d) {
      setPayError('Bitte ein gueltiges Datum angeben.');
      return;
    }
    const dt = new Date(y, m - 1, d);
    setPaySubmitting(true);
    try {
      await addInvoicePayment(invoice.id, {
        paidAt: dt,
        amount,
        note: payNote.trim() || undefined,
      });
      setPayDialogOpen(false);
      await refresh();
    } catch (err) {
      console.error(err);
      setPayError(
        `Speichern fehlgeschlagen: ${(err as Error).message}`,
      );
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleRemovePayment = async (idx: number) => {
    if (
      !confirm(
        'Diesen Zahlungseingang wirklich entfernen? Der Rechnungs-Status wird entsprechend zurueckgesetzt.',
      )
    )
      return;
    try {
      await removeInvoicePayment(invoice.id, idx);
      await refresh();
    } catch (err) {
      console.error(err);
      alert(`Entfernen fehlgeschlagen: ${(err as Error).message}`);
    }
  };

  const handleDelete = async () => {
    const label = invoice.invoiceNumber
      ? `Rechnung ${invoice.invoiceNumber}`
      : 'diesen Entwurf';
    const warning = invoice.invoiceNumber
      ? '\n\nAchtung: Die Nummer ist dann weg und die Nummernfolge hat eine Lücke. Für Rechnungen, die schon raus sind, besser „Stornieren“ nutzen.'
      : '';
    if (!confirm(`${label} wirklich löschen?${warning}`)) return;
    try {
      await deleteInvoice(invoice.id);
      router.push('/dashboard/rechnungen');
    } catch (err) {
      console.error(err);
      alert('Löschen fehlgeschlagen.');
    }
  };

  /**
   * Rechnung duplizieren: legt einen neuen ENTWURF mit denselben
   * Positionen, MwSt-Einstellung, Kunde und Abschlusstext an.
   * Rechnungsnummer, Zahlungen und Bezahlt-Status werden bewusst
   * NICHT uebernommen — die neue Rechnung startet als Draft ohne
   * Nummer und wird erst durch "Rechnung stellen" buchhaltungs-
   * relevant. invoiceDate = heute, dueDate = heute + default.
   */
  /** Neuer Entwurf mit denselben Positionen, Kunde und Texten. Liefert die ID. */
  const createDraftCopy = async (): Promise<string> => {
      const settings = await getSettings();
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + settings.defaultPaymentDays);
      const items = invoice.items.map((it, idx) => ({
        position: idx + 1,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
        // Position-spezifischer VAT-Satz mit uebernehmen (z.B. 0% fuer
        // durchlaufende Posten wie Werbebudget-Weiterberechnung).
        ...(it.vatRate !== undefined ? { vatRate: it.vatRate } : {}),
      }));
      const totalNet = items.reduce((s, it) => s + it.totalPrice, 0);
      const { id: newId } = await createInvoiceDraft({
        customerId: invoice.customerId,
        invoiceDate: Timestamp.fromDate(today),
        dueDate: Timestamp.fromDate(dueDate),
        status: 'draft',
        paidAmount: 0,
        totalAmount: totalNet,
        vatRate: invoice.vatRate,
        closingText: invoice.closingText,
        pdfUrl: null,
        driveUrl: null,
        sentAt: null,
        paidAt: null,
        items,
      });
      return newId;
  };

  const handleDuplicate = async () => {
    if (duplicating) return;
    setDuplicating(true);
    try {
      const newId = await createDraftCopy();
      router.push(`/dashboard/rechnungen/${newId}`);
    } catch (err) {
      console.error(err);
      alert(`Duplizieren fehlgeschlagen: ${(err as Error).message}`);
      setDuplicating(false);
    }
  };

  const openCancelDialog = () => {
    setCancelReason('');
    setCancelCreateDraft(true);
    setCancelError(null);
    setCancelOpen(true);
  };

  /**
   * Storniert die Rechnung: Stornorechnung mit neuer Nummer, Original auf
   * "Storniert". Danach optional korrigierter Entwurf, Drive-Sicherung der
   * Stornorechnung wie beim Rechnung stellen (best effort).
   */
  const handleCancel = async () => {
    const reason = cancelReason.trim();
    if (!reason) {
      setCancelError('Bitte kurz den Grund angeben, er steht später an beiden Rechnungen.');
      return;
    }
    setCancelling(true);
    setCancelError(null);
    try {
      const { id: stornoId, invoiceNumber: stornoNumber } = await cancelInvoice(
        invoice.id,
        reason,
      );

      let driveNote = '';
      try {
        const auth = await getGoogleAuth();
        const storno = await getInvoice(stornoId);
        if (auth?.refreshToken && storno && customer) {
          const { syncInvoiceToDrive } = await import('@/lib/drive-sync');
          await syncInvoiceToDrive(storno, customer);
          driveNote = ' Auf Drive gesichert.';
        }
      } catch (syncErr) {
        console.warn('Drive-Sync der Stornorechnung fehlgeschlagen:', syncErr);
        driveNote = ' Drive-Sicherung fehlgeschlagen, bitte dort von Hand nachholen.';
      }

      if (cancelCreateDraft) {
        const draftId = await createDraftCopy();
        alert(
          `Rechnung ${invoice.invoiceNumber} ist storniert (Stornorechnung ${stornoNumber}).${driveNote}\n\nDie korrigierte Rechnung ist als Entwurf angelegt. Positionen oder Kundendaten anpassen und dann „Rechnung stellen“.`,
        );
        router.push(`/dashboard/rechnungen/${draftId}/edit`);
      } else {
        router.push(`/dashboard/rechnungen/${stornoId}`);
      }
    } catch (err) {
      console.error(err);
      setCancelError((err as Error).message);
      setCancelling(false);
    }
  };

  /**
   * Rechnung stellen: vergibt atomar die naechste laufende Nummer,
   * setzt Status auf 'sent' und synct das PDF nach Google Drive (falls
   * verbunden). Ab diesem Moment ist die Rechnung buchhaltungsrelevant
   * und darf nicht mehr bearbeitet werden.
   */
  const handleFinalize = async () => {
    if (!customer) return;
    if (
      !confirm(
        'Nummer wird jetzt vergeben und bleibt vergeben. Danach ist die Rechnung verbindlich und wird auf Google Drive gesichert. Fortfahren?',
      )
    )
      return;
    setFinalizing(true);
    setFinalizeMsg(null);
    try {
      const { invoiceNumber } = await finalizeInvoiceWithNumber(invoice.id);
      await updateInvoice(invoice.id, {
        status: 'sent',
        sentAt: Timestamp.fromDate(new Date()),
      });
      await refresh();

      // Drive-Sync im Anschluss — best-effort, blockiert nicht.
      try {
        const auth = await getGoogleAuth();
        if (auth?.refreshToken) {
          setFinalizeMsg('Rechnung gestellt ✓ — synchronisiere mit Drive…');
          const fresh = await getInvoice(invoice.id);
          if (fresh) {
            const { syncInvoiceToDrive } = await import('@/lib/drive-sync');
            await syncInvoiceToDrive(fresh, customer);
            await refresh();
            setFinalizeMsg(
              `Rechnungsnummer ${invoiceNumber} vergeben, auf Drive gesichert ✓`,
            );
          }
        } else {
          setFinalizeMsg(
            `Rechnungsnummer ${invoiceNumber} vergeben. (Kein Drive verbunden — Sync uebersprungen.)`,
          );
        }
      } catch (syncErr) {
        console.warn('Drive-Sync nach Finalisieren fehlgeschlagen:', syncErr);
        setFinalizeMsg(
          `Rechnungsnummer ${invoiceNumber} vergeben. Drive-Sync fehlgeschlagen (${(syncErr as Error).message}) — kannst du manuell nachholen.`,
        );
      }
      setTimeout(() => setFinalizeMsg(null), 6000);
    } catch (err) {
      console.error(err);
      alert(`Rechnung stellen fehlgeschlagen: ${(err as Error).message}`);
    } finally {
      setFinalizing(false);
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

  const recipients = invoiceRecipients(customer);

  /** Daten der Rechnungsmail. Betrag immer brutto, so wie auf der Rechnung. */
  const mailData = customer
    ? {
        customerName:
          [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
          customer.company,
        invoiceNumber: invoice.invoiceNumber ?? '',
        totalAmount: invoiceGrossTotal(invoice),
        dueDate: formatDateDE(invoice.dueDate.toDate()),
        ...(invoice.kind === 'cancellation'
          ? {
              cancellation: {
                originalNumber: invoice.cancelsInvoiceNumber ?? '',
                originalDate: invoice.cancelsInvoiceDate
                  ? formatDateDE(invoice.cancelsInvoiceDate.toDate())
                  : '',
              },
            }
          : {}),
      }
    : null;

  const openMailDialog = () => {
    if (!customer || !recipients.length) {
      alert('Kein E-Mail-Empfänger im Kundenprofil hinterlegt.');
      return;
    }
    setMailNotice(null);
    setMailDialogOpen(true);
  };

  /** test=true: geht nur an yusuf@kolac-digital.de, Status bleibt. */
  const sendInvoiceEmail = async (test: boolean) => {
    if (!customer || !mailData || !recipients.length) return;
    setMailNotice(null);
    if (test) setSendingTest(true);
    else setSendingEmail(true);
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
          to: recipients,
          ...mailData,
          pdfBase64: base64,
          filename,
          test,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Versand fehlgeschlagen');
      }

      if (test) {
        setMailNotice({
          kind: 'ok',
          text: 'Testmail mit PDF ist an yusuf@kolac-digital.de raus. Der Kunde hat nichts bekommen.',
        });
        return;
      }

      await updateInvoice(invoice.id, {
        status: invoice.status === 'draft' ? 'sent' : invoice.status,
        sentAt: invoice.sentAt ?? Timestamp.fromDate(new Date()),
      });
      await refresh();
      setMailDialogOpen(false);
      setFinalizeMsg(`Rechnung ${invoice.invoiceNumber} an ${recipients.join(', ')} gesendet.`);
      setTimeout(() => setFinalizeMsg(null), 6000);
    } catch (err) {
      console.error(err);
      setMailNotice({ kind: 'error', text: `Versand fehlgeschlagen: ${(err as Error).message}` });
    } finally {
      setSendingTest(false);
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

  // Draft = noch keine Rechnungsnummer vergeben. Bewusst NICHT ueber
  // status='draft' pruefen — Status wandert nach Finalisieren auf
  // 'sent', aber solange keine Nummer da ist, ist es ein Entwurf.
  const isDraft = invoice.invoiceNumber === null;
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
            <h1 className="text-3xl font-semibold text-gray-900 flex items-center gap-3 flex-wrap">
              {invoice.invoiceNumber ?? 'Entwurf'}
              {isDraft ? (
                <span className="text-sm font-medium px-2 py-0.5 rounded-sm bg-amber-100 text-amber-800">
                  Entwurf · noch keine Nummer
                </span>
              ) : (
                <span
                  className={`text-sm font-medium px-2 py-0.5 rounded-sm ${invoiceStatusBadgeClass(invoice, computedStatus)}`}
                >
                  {invoiceStatusLabel(invoice, computedStatus)}
                  {computedStatus === 'overdue' && daysLate > 0 && (
                    <span> · {daysLate} Tage</span>
                  )}
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {customer?.company ?? 'Kunde unbekannt'} ·{' '}
              {formatDateDE(invoice.invoiceDate.toDate())}
              {isCancelledOrCancellation(invoice) ? null : (
                <> · zahlbar bis {formatDateDE(dueDate)}</>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isDraft && (
              <>
                <Link
                  href={`/dashboard/rechnungen/${invoice.id}/edit`}
                  className="btn-secondary"
                >
                  Bearbeiten
                </Link>
                <button
                  onClick={handleFinalize}
                  disabled={finalizing || !customer}
                  className="btn-primary"
                >
                  {finalizing ? 'Stelle Rechnung…' : 'Rechnung stellen'}
                </button>
              </>
            )}
            <button
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="btn-secondary"
            >
              {generatingPdf ? 'Generiere PDF…' : 'PDF herunterladen'}
            </button>
            {!isDraft && (invoice.status !== 'cancelled' || invoice.kind === 'cancellation') ? (
              <>
                <button
                  onClick={openMailDialog}
                  disabled={sendingEmail || !recipients.length}
                  className="btn-secondary"
                  title={
                    !recipients.length
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
              </>
            ) : null}
            {invoice.kind !== 'cancellation' && (
              <button
                onClick={handleDuplicate}
                disabled={duplicating}
                className="btn-secondary"
                title="Neue Rechnung als Entwurf mit denselben Positionen anlegen"
              >
                {duplicating ? 'Dupliziere…' : 'Duplizieren'}
              </button>
            )}
            {!isDraft && !isCancelledOrCancellation(invoice) && (
              <button
                onClick={openCancelDialog}
                className="btn-secondary text-red-600 hover:bg-red-50"
                title="Rechnung aufheben: Stornorechnung mit neuer Nummer, das Original bleibt erhalten"
              >
                Stornieren…
              </button>
            )}
            {!isCancelledOrCancellation(invoice) && (
              <button
                onClick={handleDelete}
                className="btn-secondary text-red-600 hover:bg-red-50"
              >
                Löschen
              </button>
            )}
          </div>
        </div>
        {finalizeMsg && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
            {finalizeMsg}
          </div>
        )}
      </header>

      {invoice.status === 'cancelled' && invoice.kind !== 'cancellation' && (
        <section className="card mb-6 border-gray-300 bg-gray-50">
          <h2 className="text-base font-semibold text-gray-900">Diese Rechnung ist storniert</h2>
          <p className="mt-1 text-sm text-gray-700">
            {invoice.cancelledAt ? `Am ${formatDateDE(invoice.cancelledAt.toDate())}` : 'Sie wurde'}{' '}
            durch die Stornorechnung{' '}
            {invoice.cancelledByInvoiceId ? (
              <Link
                href={`/dashboard/rechnungen/${invoice.cancelledByInvoiceId}`}
                className="font-medium text-brand-blue hover:underline"
              >
                {invoice.cancelledByInvoiceNumber ?? 'öffnen'}
              </Link>
            ) : (
              invoice.cancelledByInvoiceNumber
            )}{' '}
            aufgehoben. Sie zählt nicht mehr als offen, es gehen keine Erinnerungen raus.
          </p>
          {invoice.cancelReason && (
            <p className="mt-1 text-sm text-gray-600">Grund: {invoice.cancelReason}</p>
          )}
        </section>
      )}

      {invoice.kind === 'cancellation' && (
        <section className="card mb-6 border-purple-200 bg-purple-50/60">
          <h2 className="text-base font-semibold text-gray-900">Stornorechnung</h2>
          <p className="mt-1 text-sm text-gray-700">
            Hebt die Rechnung{' '}
            {invoice.cancelsInvoiceId ? (
              <Link
                href={`/dashboard/rechnungen/${invoice.cancelsInvoiceId}`}
                className="font-medium text-brand-blue hover:underline"
              >
                {invoice.cancelsInvoiceNumber ?? 'öffnen'}
              </Link>
            ) : (
              invoice.cancelsInvoiceNumber
            )}
            {invoice.cancelsInvoiceDate
              ? ` vom ${formatDateDE(invoice.cancelsInvoiceDate.toDate())}`
              : ''}{' '}
            vollständig auf. Nichts zu bezahlen. Mit „Per E-Mail senden“ bekommt
            der Kunde sie von der Buchhaltung.
          </p>
          {invoice.cancelReason && (
            <p className="mt-1 text-sm text-gray-600">Grund: {invoice.cancelReason}</p>
          )}
        </section>
      )}

      {/* Status-Aktionen */}
      {!isCancelledOrCancellation(invoice) && (
      <section className="card mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Status</h2>
        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <p className="text-sm text-gray-500">
              Solange dieser Entwurf noch keine Nummer hat, ist er nicht
              buchhaltungsrelevant. Klick oben auf <strong>Rechnung
              stellen</strong>, um die Nummer zu vergeben.
            </p>
          )}
          {/* Legacy: Rechnungen aus der Zeit vor dem Draft-Workflow
              koennen Status 'draft' MIT Nummer haben — dort noch
              "versendet markieren" moeglich, damit die auch weiter
              nutzbar bleiben. */}
          {invoice.status === 'draft' && !isDraft && (
            <button
              onClick={markSent}
              disabled={updatingStatus}
              className="btn-primary"
            >
              Als versendet markieren
            </button>
          )}
          {(invoice.status === 'sent' ||
            invoice.status === 'partially_paid') && (
            <>
              <button
                onClick={() => openPaymentDialog()}
                disabled={updatingStatus}
                className="btn-primary"
                title="Als bezahlt markieren und Datum des Zahlungseingangs bestätigen"
              >
                {invoice.status === 'partially_paid'
                  ? 'Weiteren Zahlungseingang erfassen…'
                  : 'Als bezahlt markieren…'}
              </button>
            </>
          )}
          {invoice.status === 'paid' && (
            <button
              onClick={() => openPaymentDialog(0)}
              disabled={updatingStatus}
              className="btn-secondary text-xs"
              title="Weitere Zahlung nachtragen (z.B. Nachzahlung)"
            >
              Weiteren Zahlungseingang erfassen…
            </button>
          )}
        </div>
        {(invoice.status === 'partially_paid' ||
          invoice.status === 'paid') && (
          <p className="mt-3 text-sm text-gray-700">
            Bezahlt:{' '}
            <strong>
              <SensitiveValue>{formatEUR(paidBrutto)}</SensitiveValue>
            </strong>{' '}
            von{' '}
            <SensitiveValue>{formatEUR(bruttoTotal)}</SensitiveValue> brutto
            {invoice.status === 'partially_paid' && (
              <>
                {' '}
                · Rest{' '}
                <strong className="text-orange-700">
                  <SensitiveValue>{formatEUR(openBrutto)}</SensitiveValue>
                </strong>
              </>
            )}
          </p>
        )}
      </section>
      )}

      <DunningPanel invoice={invoice} customer={customer} onChanged={refresh} />

      {/* Zahlungseingaenge */}
      {paymentsList.length > 0 && (
        <section className="card mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Zahlungseingänge
          </h2>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-500 tracking-wider border-b border-gray-100">
              <tr>
                <th className="text-left py-2 w-32">Eingang am</th>
                <th className="text-right py-2 w-32">Betrag brutto</th>
                <th className="text-left py-2">Notiz</th>
                <th className="py-2 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paymentsList.map((p, i) => (
                <tr key={i}>
                  <td className="py-2 text-gray-800">
                    {formatDateDE(p.paidAt.toDate())}
                  </td>
                  <td className="py-2 text-right tabular-nums font-medium text-gray-900">
                    <SensitiveValue>{formatEUR(p.amount)}</SensitiveValue>
                  </td>
                  <td className="py-2 text-gray-600">{p.note ?? ''}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => handleRemovePayment(i)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      entfernen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <Modal
        open={cancelOpen}
        onClose={() => !cancelling && setCancelOpen(false)}
        title={`Rechnung ${invoice.invoiceNumber ?? ''} stornieren?`}
        maxWidth="max-w-lg"
      >
        {paymentsList.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Für diese Rechnung sind Zahlungen erfasst. Stornieren geht nur
              ohne Zahlungseingang, sonst müsste erst Geld zurück. Entferne
              die Zahlung, wenn sie falsch erfasst war, oder kläre die
              Erstattung zuerst.
            </p>
            <div className="flex justify-end">
              <button type="button" className="btn-secondary" onClick={() => setCancelOpen(false)}>
                Schließen
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="text-sm text-gray-700 space-y-1.5 list-disc pl-5">
              <li>
                Es entsteht eine <strong>Stornorechnung</strong> mit der nächsten
                Rechnungsnummer und dem negativen Betrag.
              </li>
              <li>
                Rechnung {invoice.invoiceNumber} bleibt erhalten, steht dann auf{' '}
                <strong>Storniert</strong> und zählt nicht mehr als offen.
                Erinnerungen und Mahnungen stoppen.
              </li>
              <li>Die Stornorechnung schickst du danach per Mail an den Kunden, wenn du willst.</li>
            </ul>
            <div>
              <label className="label" htmlFor="cancel-reason">
                Grund *
              </label>
              <input
                id="cancel-reason"
                className="input"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="z.B. Falsche Rechnungsadresse"
                autoFocus
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={cancelCreateDraft}
                onChange={(e) => setCancelCreateDraft(e.target.checked)}
              />
              <span>
                Danach eine korrigierte Rechnung als Entwurf anlegen (gleiche
                Positionen, neue Nummer erst beim Stellen)
              </span>
            </label>
            {cancelError && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {cancelError}
              </div>
            )}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCancelOpen(false)}
                disabled={cancelling}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="btn-primary bg-red-600 hover:bg-red-700 border-red-600"
                onClick={handleCancel}
                disabled={cancelling}
                aria-busy={cancelling}
              >
                {cancelling ? 'Storniere…' : 'Rechnung stornieren'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment-Dialog */}
      {mailData && (
        <Modal
          open={mailDialogOpen}
          onClose={() => !sendingEmail && !sendingTest && setMailDialogOpen(false)}
          title={`${invoice.kind === 'cancellation' ? 'Stornorechnung' : 'Rechnung'} ${invoice.invoiceNumber ?? ''} per E-Mail senden`}
          maxWidth="max-w-3xl"
        >
          {(() => {
            const mail = mailData.cancellation
              ? buildCancellationEmail({
                  ...mailData,
                  ...mailData.cancellation,
                  totalAmount: Math.abs(mailData.totalAmount),
                })
              : buildInvoiceEmail(mailData);
            const busy = sendingEmail || sendingTest;
            return (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  So kommt die Mail beim Kunden an. Die {invoice.kind === 'cancellation' ? 'Stornorechnung' : 'Rechnung'} hängt als PDF dran.
                  Mit „Testmail an mich“ bekommst du genau diese Mail vorher selbst.
                </p>
                <EmailPreviewFrame
                  html={mail.html}
                  from={mail.from}
                  to={recipients.join(', ')}
                  subject={mail.subject}
                  attachment={
                    customer
                      ? `${invoice.kind === 'cancellation' ? 'Stornorechnung' : 'Rechnung'} als PDF`
                      : undefined
                  }
                />
                {mailNotice && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      mailNotice.kind === 'ok'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}
                  >
                    {mailNotice.text}
                  </div>
                )}
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setMailDialogOpen(false)}
                    disabled={busy}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => sendInvoiceEmail(true)}
                    disabled={busy}
                    aria-busy={sendingTest}
                  >
                    {sendingTest ? 'Sende Test…' : 'Testmail an mich'}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => sendInvoiceEmail(false)}
                    disabled={busy}
                    aria-busy={sendingEmail}
                  >
                    {sendingEmail ? 'Sende…' : `An ${recipients.length === 1 ? 'Kunden' : `${recipients.length} Empfänger`} senden`}
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {payDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
          onClick={() => setPayDialogOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 sm:p-6 modal-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Zahlungseingang bestätigen
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Das Datum ist der Tag, an dem das Geld auf deinem Konto war.
              Meistens heute, kann aber in der Vergangenheit liegen. Nach
              diesem Datum wird die Umsatzsteuer in der UStVA gebucht.
            </p>
            <div className="space-y-3">
              <div>
                <label className="label">Datum des Zahlungseingangs *</label>
                <input
                  type="date"
                  className="input"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Betrag (brutto, EUR) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="input"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="z.B. 1500,00"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Vorschlag: offener Restbetrag{' '}
                  {formatEUR(Math.max(openBrutto, 0))}. Kann auch weniger
                  oder mehr sein (Nachzahlung, Skonto, Rundungen).
                </p>
              </div>
              <div>
                <label className="label">Notiz (optional)</label>
                <input
                  type="text"
                  className="input"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="z.B. Überweisung, Anzahlung"
                />
              </div>
            </div>
            {payError && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {payError}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPayDialogOpen(false)}
                className="btn-secondary"
                disabled={paySubmitting}
              >
                Abbrechen
              </button>
              <button
                onClick={submitPayment}
                className="btn-primary"
                disabled={paySubmitting}
              >
                {paySubmitting ? 'Speichern…' : 'Zahlungseingang speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <td className="py-3 text-gray-900">
                    <ItemDescription text={item.description} />
                  </td>
                  <td className="py-3 text-right text-gray-700">{item.quantity}</td>
                  <td className="py-3 text-right text-gray-700">
                    <SensitiveValue>{formatEUR(item.unitPrice)}</SensitiveValue>
                  </td>
                  <td className="py-3 text-right font-medium text-gray-900">
                    <SensitiveValue>{formatEUR(item.totalPrice)}</SensitiveValue>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {(() => {
                const v = computeInvoiceVat(invoice.items, invoice.vatRate);
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
                  </>
                );
              })()}
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
            title={`Rechnung ${invoice.invoiceNumber ?? 'Entwurf'}`}
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
