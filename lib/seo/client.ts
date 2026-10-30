'use client';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ParsedChangelogEntry } from './changelog-markdown';
import type {
  PortalAccess,
  PortalLoginEvent,
  SeoActivity,
  SeoCheck,
  SeoClient,
  SeoMonthlyDoc,
  SeoReport,
} from './types';

/**
 * Admin-Zugriffe auf SEO-Daten direkt ueber das Client-SDK (die
 * Firestore-Rules lassen nur den Inhaber zu). Alles, was Geheimnisse
 * braucht (Google-APIs, Mails, Firebase-Auth-Admin), laeuft ueber /api/seo.
 */

const byCustomer = async <T>(col: string, customerId: string): Promise<T[]> => {
  const snap = await getDocs(query(collection(db, col), where('customerId', '==', customerId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
};

export async function listSeoClients(): Promise<SeoClient[]> {
  const snap = await getDocs(collection(db, 'seoClients'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SeoClient);
}

export async function getSeoClient(customerId: string): Promise<SeoClient | null> {
  const snap = await getDoc(doc(db, 'seoClients', customerId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as SeoClient) : null;
}

export async function createSeoClient(
  customerId: string,
  data: Pick<SeoClient, 'displayName' | 'domain' | 'gscProperty' | 'brandTerms'>,
): Promise<void> {
  await setDoc(doc(db, 'seoClients', customerId), {
    customerId,
    enabled: true,
    keywordGroups: [],
    pagespeedUrls: [`https://${data.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}/`],
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateSeoClient(
  customerId: string,
  data: Partial<Omit<SeoClient, 'id' | 'customerId' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'seoClients', customerId), { ...data, updatedAt: serverTimestamp() });
}

// --- Massnahmen ---

export async function listActivities(customerId: string): Promise<SeoActivity[]> {
  return (await byCustomer<SeoActivity>('seoActivities', customerId)).sort(
    (a, b) => b.date.localeCompare(a.date) || a.area.localeCompare(b.area),
  );
}

export type ActivityInput = Pick<SeoActivity, 'date' | 'area' | 'change' | 'status' | 'published'> & {
  benefit?: string;
  scope?: string;
  links?: SeoActivity['links'];
};

const clean = (a: ActivityInput) => ({
  date: a.date,
  month: a.date.slice(0, 7),
  area: a.area.trim() || 'Allgemein',
  change: a.change.trim(),
  benefit: a.benefit?.trim() || null,
  scope: a.scope?.trim() || null,
  status: a.status,
  published: a.published,
  links: a.links ?? [],
});

export async function createActivity(customerId: string, a: ActivityInput): Promise<void> {
  await addDoc(collection(db, 'seoActivities'), {
    customerId,
    ...clean(a),
    source: 'manual',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateActivity(id: string, a: Partial<ActivityInput>): Promise<void> {
  // undefined lehnt Firestore ab, leere Texte werden zu null
  const data: Record<string, unknown> = Object.fromEntries(
    Object.entries(a)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, (k === 'benefit' || k === 'scope') && !String(v).trim() ? null : v]),
  );
  data.updatedAt = serverTimestamp();
  if (a.date) data.month = a.date.slice(0, 7);
  await updateDoc(doc(db, 'seoActivities', id), data);
}

export async function deleteActivity(id: string): Promise<void> {
  await deleteDoc(doc(db, 'seoActivities', id));
}

/**
 * Importiert geparste Changelog-Eintraege. Vorhandene Schluessel werden
 * aktualisiert (Status, Nutzen, Umfang), neue angelegt.
 */
export async function importActivities(
  customerId: string,
  entries: Array<ParsedChangelogEntry & { published: boolean }>,
): Promise<{ created: number; updated: number }> {
  const existing = await listActivities(customerId);
  const byKey = new Map(existing.filter((a) => a.externalKey).map((a) => [a.externalKey!, a]));
  let created = 0;
  let updated = 0;
  for (let i = 0; i < entries.length; i += 400) {
    const batch = writeBatch(db);
    for (const e of entries.slice(i, i + 400)) {
      const cur = byKey.get(e.key);
      if (cur) {
        batch.update(doc(db, 'seoActivities', cur.id), {
          status: e.status,
          benefit: e.benefit ?? null,
          scope: e.scope ?? null,
          links: e.links ?? [],
          published: e.published,
          updatedAt: serverTimestamp(),
        });
        updated++;
      } else {
        batch.set(doc(collection(db, 'seoActivities')), {
          customerId,
          ...clean(e),
          source: 'import',
          externalKey: e.key,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        created++;
      }
    }
    await batch.commit();
  }
  return { created, updated };
}

// --- Pruefungen ---

export async function listChecks(customerId: string): Promise<SeoCheck[]> {
  return (await byCustomer<SeoCheck>('seoChecks', customerId)).sort((a, b) => b.date.localeCompare(a.date));
}

export async function setCheckPublished(id: string, published: boolean): Promise<void> {
  await updateDoc(doc(db, 'seoChecks', id), { published, updatedAt: serverTimestamp() });
}

export async function deleteCheck(id: string): Promise<void> {
  await deleteDoc(doc(db, 'seoChecks', id));
}

// --- Berichte, Monate ---

export async function listReports(customerId: string): Promise<SeoReport[]> {
  return (await byCustomer<SeoReport>('seoReports', customerId)).sort((a, b) => b.month.localeCompare(a.month));
}

export async function saveAssessment(customerId: string, month: string, assessment: string): Promise<void> {
  await setDoc(
    doc(db, 'seoReports', `${customerId}_${month}`),
    { customerId, month, assessment, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function listMonths(customerId: string): Promise<SeoMonthlyDoc[]> {
  return (await byCustomer<SeoMonthlyDoc>('seoMonthly', customerId)).sort((a, b) => b.month.localeCompare(a.month));
}

// --- Portal-Zugang ---

export async function listAccess(customerId: string): Promise<PortalAccess[]> {
  const snap = await getDocs(query(collection(db, 'portalAccess'), where('customerId', '==', customerId)));
  return snap.docs.map((d) => ({ ...(d.data() as PortalAccess), email: d.id }));
}

export async function listLoginEvents(customerId: string, max = 30): Promise<PortalLoginEvent[]> {
  return (await byCustomer<PortalLoginEvent>('portalLoginEvents', customerId))
    .sort((a, b) => b.at.toMillis() - a.at.toMillis())
    .slice(0, max);
}

// --- Changelog-Schluessel fuer Claude Code ---

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Erzeugt einen neuen Schluessel. Nur der Hash wird gespeichert, der alte wird ungueltig. */
export async function rotateChangelogToken(customerId: string): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = `kdp_${btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
  await updateSeoClient(customerId, {
    changelogTokenHash: await sha256Hex(token),
    changelogTokenHint: token.slice(-4),
  });
  return token;
}

export async function revokeChangelogToken(customerId: string): Promise<void> {
  await updateDoc(doc(db, 'seoClients', customerId), {
    changelogTokenHash: null,
    changelogTokenHint: null,
    updatedAt: serverTimestamp(),
  });
}
