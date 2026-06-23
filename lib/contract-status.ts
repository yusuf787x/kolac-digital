import type { Contract, ContractStatus } from './types';
import { tsToMillis } from './utils';

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'Entwurf',
  sent: 'Versendet',
  signed: 'Signiert',
  expired: 'Abgelaufen',
  cancelled: 'Storniert',
};

export const CONTRACT_STATUS_BADGE_CLASSES: Record<ContractStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  signed: 'bg-green-100 text-green-700',
  expired: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-red-100 text-red-700',
};

/**
 * Effektiver Status eines Vertrags. Wenn ein versendeter Vertrag das
 * Ablaufdatum überschritten hat, gilt er als abgelaufen — auch wenn das
 * Feld in Firestore noch "sent" sagt.
 */
export function computeContractStatus(c: Contract): ContractStatus {
  if (c.status === 'signed' || c.status === 'cancelled') return c.status;
  if (c.status === 'sent') {
    const exp = tsToMillis(c.signingExpiresAt);
    if (exp && Date.now() > exp) return 'expired';
  }
  return c.status;
}

/**
 * Ist ein versendeter Vertrag überfällig im Sinne der Reminder-Logik?
 * (Mehr als reminderDays vergangen seit Versand, noch nicht signiert.)
 */
export function isContractReminderDue(c: Contract): boolean {
  if (c.status !== 'sent') return false;
  if (!c.reminderEnabled) return false;
  const sent = tsToMillis(c.sentAt);
  if (!sent) return false;
  const due = sent + c.reminderDays * 24 * 60 * 60 * 1000;
  return Date.now() > due;
}
