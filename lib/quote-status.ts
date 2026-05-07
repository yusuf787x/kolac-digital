import type { QuoteStatus } from './types';

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Entwurf',
  sent: 'Versendet',
  accepted: 'Angenommen',
  rejected: 'Abgelehnt',
  invoiced: 'Abgerechnet',
  expired: 'Abgelaufen',
};

/** Compact badge — used on lists and detail headers. */
export const QUOTE_STATUS_BADGE_CLASSES: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-orange-100 text-orange-800',
  accepted: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  invoiced: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-500',
};

/** Stronger fill — used for the editable select in the quote list. */
export const QUOTE_STATUS_SELECT_CLASSES: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 border-gray-300 text-gray-800',
  sent: 'bg-orange-100 border-orange-400 text-orange-900',
  accepted: 'bg-blue-100 border-blue-500 text-blue-900 font-semibold',
  rejected: 'bg-red-100 border-red-500 text-red-900 font-semibold',
  invoiced: 'bg-green-100 border-green-500 text-green-900 font-semibold',
  expired: 'bg-gray-100 border-gray-400 text-gray-600',
};

/** Manually settable statuses. 'invoiced' is set by the convert-flow,
 * 'expired' is computed from validUntil. */
export const SETTABLE_QUOTE_STATUSES: { value: QuoteStatus; label: string }[] = [
  { value: 'draft', label: QUOTE_STATUS_LABELS.draft },
  { value: 'sent', label: QUOTE_STATUS_LABELS.sent },
  { value: 'accepted', label: QUOTE_STATUS_LABELS.accepted },
  { value: 'rejected', label: QUOTE_STATUS_LABELS.rejected },
];

/** Compute display status: 'expired' overrides sent/draft if validUntil is past. */
export function computeQuoteStatus(
  status: QuoteStatus,
  validUntil: Date,
  now: Date = new Date(),
): QuoteStatus {
  if (status === 'accepted' || status === 'rejected' || status === 'invoiced') {
    return status;
  }
  if (validUntil.getTime() < now.getTime()) {
    return 'expired';
  }
  return status;
}
