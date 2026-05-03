'use client';

import { useState, type MouseEvent } from 'react';
import { Timestamp } from 'firebase/firestore';
import { updateInvoice } from '@/lib/firestore';
import type { Invoice, InvoiceStatus } from '@/lib/types';
import {
  STATUS_SELECT_CLASSES,
  SETTABLE_STATUSES,
} from '@/lib/invoice-status';
import { formatEUR } from '@/lib/utils';

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

    let patch: Partial<Invoice> = { status: newStatus };

    if (newStatus === 'paid') {
      patch.paidAmount = invoice.totalAmount;
      patch.paidAt = Timestamp.fromDate(new Date());
    } else if (newStatus === 'sent') {
      if (!invoice.sentAt) patch.sentAt = Timestamp.fromDate(new Date());
    } else if (newStatus === 'partially_paid') {
      const input = prompt(
        `Bezahlter Betrag (von ${formatEUR(invoice.totalAmount)}):`,
        invoice.paidAmount > 0 ? invoice.paidAmount.toString() : '',
      );
      if (input === null) return; // user cancelled — leave status alone
      const amount = parseFloat(input.replace(',', '.'));
      if (isNaN(amount) || amount <= 0) {
        alert('Ungültiger Betrag.');
        return;
      }
      if (amount >= invoice.totalAmount) {
        // full amount entered — promote to "paid"
        patch.status = 'paid';
        patch.paidAmount = invoice.totalAmount;
        patch.paidAt = Timestamp.fromDate(new Date());
      } else {
        patch.paidAmount = amount;
      }
    } else if (newStatus === 'draft') {
      patch.paidAmount = 0;
      patch.paidAt = null;
      patch.sentAt = null;
    }

    setUpdating(true);
    try {
      await updateInvoice(invoice.id, patch);
      onUpdated(patch);
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
        className={`text-xs font-medium px-2 py-1 rounded border cursor-pointer outline-none focus:ring-2 focus:ring-brand-blue/30 disabled:opacity-50 ${STATUS_SELECT_CLASSES[computedStatus]}`}
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
