import type { Invoice, InvoiceStatus } from './types';

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Entwurf',
  sent: 'Versendet',
  paid: 'Bezahlt',
  partially_paid: 'Teilweise bezahlt',
  overdue: 'Überfällig',
  cancelled: 'Storniert',
};

/** Compact badge — used on the dashboard, kunde detail invoice list, etc. */
export const STATUS_BADGE_CLASSES: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-orange-100 text-orange-800',
  paid: 'bg-green-100 text-green-800',
  partially_paid: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-200 text-gray-600',
};

/** Stronger fill — used for the editable select in the invoice list. */
export const STATUS_SELECT_CLASSES: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 border-gray-300 text-gray-800',
  sent: 'bg-orange-100 border-orange-400 text-orange-900',
  paid: 'bg-green-100 border-green-500 text-green-900 font-semibold',
  partially_paid:
    'bg-yellow-100 border-yellow-500 text-yellow-900 font-semibold',
  overdue: 'bg-red-100 border-red-500 text-red-900 font-semibold',
  cancelled: 'bg-gray-200 border-gray-300 text-gray-600',
};

/** Manually settable statuses (overdue is auto-computed from due date). */
export const SETTABLE_STATUSES: { value: InvoiceStatus; label: string }[] = [
  { value: 'draft', label: STATUS_LABELS.draft },
  { value: 'sent', label: STATUS_LABELS.sent },
  { value: 'paid', label: STATUS_LABELS.paid },
  { value: 'partially_paid', label: STATUS_LABELS.partially_paid },
];

/** Storniert oder Stornorechnung: Status lässt sich nicht mehr von Hand ändern. */
export function isCancelledOrCancellation(inv: Pick<Invoice, 'status' | 'kind'>): boolean {
  return inv.status === 'cancelled' || inv.kind === 'cancellation';
}

/** Anzeige-Label. Die Stornorechnung heißt so, nicht "Storniert". */
export function invoiceStatusLabel(
  inv: Pick<Invoice, 'kind'>,
  status: InvoiceStatus,
): string {
  return inv.kind === 'cancellation' ? 'Stornorechnung' : STATUS_LABELS[status];
}

export function invoiceStatusBadgeClass(
  inv: Pick<Invoice, 'kind'>,
  status: InvoiceStatus,
): string {
  return inv.kind === 'cancellation'
    ? 'bg-purple-100 text-purple-800'
    : STATUS_BADGE_CLASSES[status];
}
