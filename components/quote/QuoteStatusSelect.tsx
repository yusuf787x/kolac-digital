'use client';

import { useState, type MouseEvent } from 'react';
import { Timestamp } from 'firebase/firestore';
import { updateQuote } from '@/lib/firestore';
import type { Quote, QuoteStatus } from '@/lib/types';
import {
  QUOTE_STATUS_SELECT_CLASSES,
  SETTABLE_QUOTE_STATUSES,
} from '@/lib/quote-status';

interface Props {
  quote: Quote;
  computedStatus: QuoteStatus;
  onUpdated: (patch: Partial<Quote>) => void;
}

export default function QuoteStatusSelect({
  quote,
  computedStatus,
  onUpdated,
}: Props) {
  const [updating, setUpdating] = useState(false);

  const handleChange = async (rawNew: string) => {
    const newStatus = rawNew as QuoteStatus;
    if (newStatus === quote.status && computedStatus !== 'expired') return;

    // Don't allow changing 'invoiced' quotes from this dropdown — they're
    // locked to the converted invoice.
    if (quote.status === 'invoiced') {
      alert('Dieses Angebot wurde bereits in eine Rechnung umgewandelt und kann nicht mehr geändert werden.');
      return;
    }

    let patch: Partial<Quote> = { status: newStatus };

    if (newStatus === 'sent' && !quote.sentAt) {
      patch.sentAt = Timestamp.fromDate(new Date());
    } else if (newStatus === 'accepted') {
      patch.acceptedAt = Timestamp.fromDate(new Date());
    } else if (newStatus === 'rejected') {
      patch.rejectedAt = Timestamp.fromDate(new Date());
    } else if (newStatus === 'draft') {
      patch.sentAt = null;
      patch.acceptedAt = null;
      patch.rejectedAt = null;
    }

    setUpdating(true);
    try {
      await updateQuote(quote.id, patch);
      onUpdated(patch);
    } catch (err) {
      console.error(err);
      alert(`Status-Änderung fehlgeschlagen: ${(err as Error).message}`);
    } finally {
      setUpdating(false);
    }
  };

  const stop = (e: MouseEvent) => e.stopPropagation();

  // 'invoiced' quotes are locked — show as read-only badge
  if (quote.status === 'invoiced') {
    return (
      <span
        className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded border ${QUOTE_STATUS_SELECT_CLASSES.invoiced}`}
      >
        Abgerechnet
      </span>
    );
  }

  return (
    <select
      value={quote.status}
      onChange={(e) => handleChange(e.target.value)}
      onClick={stop}
      disabled={updating}
      className={`text-xs font-medium px-2 py-1 rounded border cursor-pointer outline-none focus:ring-2 focus:ring-brand-blue/30 disabled:opacity-50 ${QUOTE_STATUS_SELECT_CLASSES[computedStatus]}`}
    >
      {SETTABLE_QUOTE_STATUSES.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
