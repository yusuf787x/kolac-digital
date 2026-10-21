'use client';

import { useState, type MouseEvent } from 'react';
import { Timestamp } from 'firebase/firestore';
import { addInvoicePayment, updateInvoice } from '@/lib/firestore';
import type { Invoice, InvoiceStatus } from '@/lib/types';
import {
  STATUS_SELECT_CLASSES,
  SETTABLE_STATUSES,
} from '@/lib/invoice-status';
import { effectivePayments, formatEUR, invoiceGrossTotal } from '@/lib/utils';

interface Props {
  invoice: Invoice;
  /** Visual status — same as invoice.status, except 'overdue' if computed. */
  computedStatus: InvoiceStatus;
  /** Days overdue, used for the small "+Nd" suffix. 0 if not overdue. */
  daysLate?: number;
  /** Called after a successful update with the new invoice fields. */
  onUpdated: (patch: Partial<Invoice>) => void;
}

export default function InvoiceStatusSelect({
  invoice,
  computedStatus,
  daysLate = 0,
  onUpdated,
}: Props) {
  const [updating, setUpdating] = useState(false);

  const handleChange = async (rawNew: string) => {
    const newStatus = rawNew as InvoiceStatus;
    if (newStatus === invoice.status && computedStatus !== 'overdue') return;

    // Zahlungen sind immer BRUTTO. `totalAmount` ist netto, deshalb
    // nie direkt als bezahlten Betrag verwenden.
    const bruttoTotal = invoiceGrossTotal(invoice);
    const alreadyPaid =
      Math.round(
        effectivePayments(invoice).reduce((s, p) => s + p.amount, 0) * 100,
      ) / 100;
    const openBrutto = Math.round((bruttoTotal - alreadyPaid) * 100) / 100;

    // "Bezahlt" heisst: der komplette offene Brutto-Betrag ist eingegangen.
    // Wird als Zahlungseingang erfasst, damit die UStVA ihn sieht.
    let paymentAmount: number | null = null;
    let patch: Partial<Invoice> = { status: newStatus };

    if (newStatus === 'paid') {
      if (openBrutto > 0) paymentAmount = openBrutto;
    } else if (newStatus === 'sent') {
      if (!invoice.sentAt) patch.sentAt = Timestamp.fromDate(new Date());
    } else if (newStatus === 'partially_paid') {
      const input = prompt(
        `Eingegangener Betrag brutto (offen: ${formatEUR(openBrutto)} von ${formatEUR(bruttoTotal)}):`,
        '',
      );
      if (input === null) return; // user cancelled — leave status alone
      const amount = parseFloat(input.replace(',', '.'));
      if (isNaN(amount) || amount <= 0) {
        alert('Ungültiger Betrag.');
        return;
      }
      // Status (teilbezahlt oder bezahlt) ergibt sich aus der Summe.
      paymentAmount = amount;
    } else if (newStatus === 'draft') {
      patch.paidAmount = 0;
      patch.paidAt = null;
      patch.payments = [];
      patch.sentAt = null;
    }

    setUpdating(true);
    try {
      if (paymentAmount !== null) {
        const paymentPatch = await addInvoicePayment(invoice.id, {
          paidAt: new Date(),
          amount: paymentAmount,
        });
        onUpdated(paymentPatch);
      } else {
        await updateInvoice(invoice.id, patch);
        onUpdated(patch);
      }
    } catch (err) {
      console.error(err);
      alert(`Status-Änderung fehlgeschlagen: ${(err as Error).message}`);
    } finally {
      setUpdating(false);
    }
  };

  // Stop the click from bubbling up to a parent <Link>/<tr> handler.
  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <div className="flex items-center gap-2">
      <select
        value={invoice.status}
        onChange={(e) => handleChange(e.target.value)}
        onClick={stop}
        disabled={updating}
        className={`text-xs font-medium px-2 py-1 rounded-sm border cursor-pointer outline-hidden focus:ring-2 focus:ring-brand-blue/30 disabled:opacity-50 ${STATUS_SELECT_CLASSES[computedStatus]}`}
      >
        {SETTABLE_STATUSES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {computedStatus === 'overdue' && daysLate > 0 && (
        <span className="text-xs font-medium text-red-700 whitespace-nowrap">
          +{daysLate}d
        </span>
      )}
    </div>
  );
}
