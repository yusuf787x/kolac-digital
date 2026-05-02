import type { InvoiceStatus } from './types';

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Entwurf',
  sent: 'Versendet',
  paid: 'Bezahlt',
  partially_paid: 'Teilweise bezahlt',
  overdue: 'Überfällig',
};

export const STATUS_BADGE_CLASSES: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-orange-100 text-orange-800',
  paid: 'bg-green-100 text-green-800',
  partially_paid: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
};

export const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: 'draft', label: STATUS_LABELS.draft },
  { value: 'sent', label: STATUS_LABELS.sent },
  { value: 'paid', label: STATUS_LABELS.paid },
  { value: 'partially_paid', label: STATUS_LABELS.partially_paid },
  { value: 'overdue', label: STATUS_LABELS.overdue },
];
