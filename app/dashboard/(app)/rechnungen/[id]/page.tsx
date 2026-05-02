'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Timestamp, serverTimestamp } from 'firebase/firestore';
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

export default function RechnungDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

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
              onClick={() => alert('PDF-Generator wird in Phase 4 aktiviert.')}
              className="btn-secondary"
            >
              PDF
            </button>
            <button
              onClick={() =>
                alert('E-Mail-Versand (Resend) wird in Phase 5 aktiviert.')
              }
              className="btn-secondary"
            >
              Per E-Mail senden
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
                onClick={() =>
                  alert('Erinnerungs-Mails werden in Phase 5 aktiviert.')
                }
                className="btn-secondary"
              >
                Erinnerung senden
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
    </div>
  );
}
