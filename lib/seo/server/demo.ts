import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { revokeAccess } from '@/lib/portal/login';
import { entryKey } from '../changelog-markdown';
import { DEMO_ACTIVITIES, DEMO_CONFIG, demoMonths, generateDemoMonth, generateDemoPagespeed } from '../demo-data';
import { addMonths, lastCompleteMonth } from '../months';
import type { SeoClient } from '../types';
import { generateReport } from './report';
import { COL, getSeoClient, saveMonth, savePagespeed, upsertReport } from './store';

/**
 * Testkunde mit erzeugten Zahlen. Legt einen Kunden in "customers" an
 * (Firma endet auf "(Demo)"), dazu 16 Monate Daten, PageSpeed vorher und
 * nachher, Massnahmen, zwei freigegebene Berichte und einen Entwurf.
 */
export async function createDemoClient(): Promise<string> {
  const db = adminDb();
  const existing = await db.collection(COL.clients).where('demo', '==', true).limit(1).get();
  if (!existing.empty) return existing.docs[0].id;

  const now = Timestamp.now();
  const customerRef = await db.collection('customers').add({
    company: DEMO_CONFIG.company,
    salutation: 'Herr',
    firstName: 'Max',
    lastName: 'Muster',
    street: 'Musterstraße 1',
    zip: '32791',
    city: 'Lage',
    email: '',
    phone: '',
    notes: 'Testkunde für das SEO-Kundenportal. Kann unter SEO-Kunden komplett gelöscht werden.',
    createdAt: now,
    updatedAt: now,
  });
  const customerId = customerRef.id;

  const client: Omit<SeoClient, 'id'> = {
    customerId,
    displayName: DEMO_CONFIG.displayName,
    domain: DEMO_CONFIG.domain,
    enabled: true,
    demo: true,
    gscProperty: DEMO_CONFIG.gscProperty,
    brandTerms: DEMO_CONFIG.brandTerms,
    keywordGroups: DEMO_CONFIG.keywordGroups,
    pagespeedUrls: DEMO_CONFIG.pagespeedUrls,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection(COL.clients).doc(customerId).set(client);

  const months = demoMonths();
  for (const m of months) {
    await saveMonth(customerId, m, generateDemoMonth(m), 'demo');
  }
  const last = lastCompleteMonth();
  await savePagespeed(customerId, addMonths(last, -3), generateDemoPagespeed(false));
  await savePagespeed(customerId, last, generateDemoPagespeed(true));

  const batch = db.batch();
  for (const a of DEMO_ACTIVITIES) {
    const month = addMonths(last, a.monthOffset);
    const date = `${month}-${String(a.day).padStart(2, '0')}`;
    batch.set(db.collection(COL.activities).doc(), {
      customerId,
      date,
      month,
      area: a.area,
      change: a.change,
      ...(a.benefit ? { benefit: a.benefit } : {}),
      ...(a.scope ? { scope: a.scope } : {}),
      status: a.status,
      published: true,
      source: 'demo',
      externalKey: entryKey({ date, area: a.area, change: a.change, status: a.status }),
      createdAt: now,
      updatedAt: now,
    });
  }
  await batch.commit();

  const full = (await getSeoClient(customerId))!;
  // Zwei aeltere Berichte gelten als freigegeben, der neueste wartet auf Pruefung
  for (const offset of [-2, -1]) {
    const m = addMonths(last, offset);
    await upsertReport(customerId, m, { status: 'released', releasedAt: Timestamp.now(), sentTo: [] });
    await generateReport(full, m);
  }
  await generateReport(full, last);

  return customerId;
}

/** Loescht alle SEO- und Portaldaten eines Kunden. Fuer den Demo-Kunden auch den Kunden selbst. */
export async function deleteSeoClientData(customerId: string, opts: { deleteCustomer: boolean }): Promise<void> {
  const db = adminDb();

  const access = await db.collection(COL.access).where('customerId', '==', customerId).get();
  for (const d of access.docs) {
    await revokeAccess(d.id);
    await d.ref.delete();
  }

  const monthly = await db.collection(COL.monthly).where('customerId', '==', customerId).get();
  for (const d of monthly.docs) {
    await db.recursiveDelete(d.ref);
  }

  for (const col of [COL.pagespeed, COL.activities, COL.reports, COL.loginEvents]) {
    const snap = await db.collection(col).where('customerId', '==', customerId).get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = db.batch();
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  await adminStorage()
    .bucket()
    .deleteFiles({ prefix: `seo-reports/${customerId}/` })
    .catch(() => undefined);

  await db.collection(COL.clients).doc(customerId).delete();
  if (opts.deleteCustomer) await db.collection('customers').doc(customerId).delete();
}
