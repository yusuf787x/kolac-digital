import { adminDb } from './firebase-admin';
import { emailDomain, type GcCustomer } from './gocardless';

export interface CustomerDoc {
  id: string;
  company: string;
  firstName: string;
  lastName: string;
  email: string;
  street: string;
  zip: string;
  city: string;
  gocardlessCustomerId?: string;
  retainerInvoiceEmail?: string;
  retainerInvoiceTemplate?: string;
}

export type MatchMode = 'hardlink' | 'domain' | 'ambiguous' | 'none';

export interface MatchResult {
  customer: CustomerDoc | null;
  mode: MatchMode;
  /** Wenn ambiguous: alle Kandidaten, die zur Domain passen. */
  candidates?: CustomerDoc[];
}

/**
 * Findet im Dashboard den Kunden, der zum GoCardless-Customer gehört.
 *
 * Reihenfolge:
 *   1. Hardlink: irgendein customer.gocardlessCustomerId === gc.id
 *   2. Domain-Match: Domain aus gc.email mit Domain aus customer.email
 *      (oder retainerInvoiceEmail). Nur eindeutige Treffer zaehlen.
 *   3. Sonst: none — manuelle Zuordnung nötig.
 *
 * "Ambiguous" wird zurueckgegeben, wenn mehrere Kunden die gleiche
 * Domain teilen — sicherer als blind den ersten zu nehmen.
 */
export async function matchCustomer(
  gcCustomer: GcCustomer,
): Promise<MatchResult> {
  const db = adminDb();

  // 1. Hardlink
  const hardlinkSnap = await db
    .collection('customers')
    .where('gocardlessCustomerId', '==', gcCustomer.id)
    .limit(1)
    .get();
  if (!hardlinkSnap.empty) {
    const d = hardlinkSnap.docs[0];
    return {
      customer: { id: d.id, ...(d.data() as Omit<CustomerDoc, 'id'>) },
      mode: 'hardlink',
    };
  }

  // 2. Domain-Match
  const targetDomain = emailDomain(gcCustomer.email);
  if (!targetDomain) {
    return { customer: null, mode: 'none' };
  }

  const allSnap = await db.collection('customers').get();
  const candidates: CustomerDoc[] = [];

  for (const d of allSnap.docs) {
    const data = d.data() as Omit<CustomerDoc, 'id'>;
    const mainDomain = emailDomain(data.email ?? '');
    const altDomain = emailDomain(data.retainerInvoiceEmail ?? '');
    if (mainDomain === targetDomain || altDomain === targetDomain) {
      candidates.push({ id: d.id, ...data });
    }
  }

  if (candidates.length === 1) {
    return { customer: candidates[0], mode: 'domain' };
  }
  if (candidates.length > 1) {
    return {
      customer: null,
      mode: 'ambiguous',
      candidates,
    };
  }
  return { customer: null, mode: 'none' };
}
