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
} from '@/lib/firestore';
import type { Invoice, Customer, InvoicePayment } from '@/lib/types';
import {
  formatEUR,
  formatDateDE,
  isOverdue,
  daysOverdue,
  computeInvoiceVat,
  effectivePayments,
} from '@/lib/utils';
import { STATUS_LABELS, STATUS_BADGE_CLASSES } from '@/lib/invoice-status';
import SensitiveValue from '@/components/ui/SensitiveValue';
import { authedFetch } from '@/lib/api-client';
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
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeMsg, setFinalizeMsg] = useState<string | null>(null);

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

  // --- Ist-Versteuerung: Zahlungseingaenge ---
  // Brutto-Gesamtbetrag (fuer die Rest-Berechnung)
  const bruttoTotal =
    Math.round(invoice.totalAmount * (1 + (invoice.vatRate ?? 0)) * 100) / 100;
  const openBrutto =
    Math.round((bruttoTotal - invoice.paidAmount) * 100) / 100;

  const paymentsList: InvoicePayment[] = (
    effectivePayments(invoice) as InvoicePayment[]
  )
    .slice()
    .sort((a, b) => a.paidAt.toMillis() - b.paidAt.toMillis());

  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payDate, setPayDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [payAmount, setPayAmount] = useState<string>('');
  const [payNote, setPayNote] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

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
    if (!confirm(`${label} wirklich löschen?`)) return;
    try {
      await deleteInvoice(invoice.id);
      router.push('/dashboard/rechnungen');
    } catch (err) {
      console.error(err);
      alert('Löschen fehlgeschlagen.');
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
                <span className="text-sm font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  Entwurf · noch keine Nummer
                </span>
              ) : (
                <span
                  className={`text-sm font-medium px-2 py-0.5 rounded ${STATUS_BADGE_CLASSES[computedStatus]}`}
                >
                  {STATUS_LABELS[computedStatus]}
                  {computedStatus === 'overdue' && daysLate > 0 && (
                    <span> · {daysLate} Tage</span>
                  )}
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {customer?.company ?? 'Kunde unbekannt'} ·{' '}
              {formatDateDE(invoice.invoiceDate.toDate())} · zahlbar bis{' '}
              {formatDateDE(dueDate)}
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
            {!isDraft && (
              <>
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
              </>
            )}
            <button
              onClick={handleDelete}
              className="btn-secondary text-red-600 hover:bg-red-50"
            >
              Löschen
            </button>
          </div>
        </div>
        {finalizeMsg && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
            {finalizeMsg}
          </div>
        )}
      </header>

      {/* Status-Aktionen */}
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
                title="Zahlungseingang mit tatsaechlichem Datum erfassen (Ist-Versteuerung)"
              >
                Zahlungseingang erfassen…
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
              <SensitiveValue>
                {formatEUR(invoice.paidAmount)}
              </SensitiveValue>
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

      {/* Zahlungseingaenge (Ist-Versteuerung) */}
      {paymentsList.length > 0 && (
        <section className="card mb-6">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">
              Zahlungseingänge
            </h2>
            <span
              className="text-xs text-gray-500"
              title="Ist-Versteuerung (§ 20 UStG): USt wird dem Monat des jeweiligen Zahlungseingangs zugeordnet."
            >
              Ist-Prinzip
            </span>
          </div>
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
          {invoice.payments === undefined && invoice.paidAmount > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              Diese Rechnung wurde noch vor der Ist-Umstellung als bezahlt
              markiert. Der Eintrag oben ist ein Fallback aus dem alten
              paidAt/paidAmount. Sobald du einen weiteren Zahlungseingang
              erfasst oder die Rechnung migrierst, wird das explizit in
              der Historie gespeichert.
            </p>
          )}
        </section>
      )}

      {/* Payment-Dialog */}
      {payDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setPayDialogOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Zahlungseingang erfassen
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Ist-Versteuerung: das Datum ist der Tag, an dem das Geld auf
              dem Konto war. Danach richtet sich die UStVA-Zuordnung.
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
