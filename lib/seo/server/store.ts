import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { addMonths, prevMonth } from '../months';
import type {
  PageSpeedResult,
  SeoActivity,
  SeoCheck,
  SeoClient,
  SeoMetrics,
  SeoMonth,
  SeoMonthlyDoc,
  SeoReport,
  SeoRow,
  SeoRowTuple,
} from '../types';
import {
  buildPortalData,
  HISTORY_MONTHS,
  visibleMonths,
  type MonthInput,
  type PortalData,
  type ReportInput,
} from '../view';

/** Zeilen pro Block-Dokument. JSON-String, weil Firestore keine verschachtelten Arrays kann. */
const CHUNK_SIZE = 4000;

export const COL = {
  clients: 'seoClients',
  monthly: 'seoMonthly',
  pagespeed: 'seoPagespeed',
  activities: 'seoActivities',
  checks: 'seoChecks',
  reports: 'seoReports',
  access: 'portalAccess',
  loginEvents: 'portalLoginEvents',
  loginLinks: 'portalLoginLinks',
  rateLimits: 'portalRateLimits',
} as const;

export const monthDocId = (customerId: string, month: SeoMonth) => `${customerId}_${month}`;

// ---------------------------------------------------------------------------
// Kunden
// ---------------------------------------------------------------------------

export async function getSeoClient(customerId: string): Promise<SeoClient | null> {
  const snap = await adminDb().collection(COL.clients).doc(customerId).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as SeoClient) : null;
}

export async function listSeoClients(): Promise<SeoClient[]> {
  const snap = await adminDb().collection(COL.clients).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SeoClient);
}

export async function markFetch(
  customerId: string,
  data: { month?: SeoMonth; error?: string | null },
): Promise<void> {
  await adminDb()
    .collection(COL.clients)
    .doc(customerId)
    .set(
      {
        lastFetchAt: Timestamp.now(),
        ...(data.month ? { lastFetchMonth: data.month } : {}),
        lastFetchError: data.error ?? null,
      },
      { merge: true },
    );
}

// ---------------------------------------------------------------------------
// Monatsdaten
// ---------------------------------------------------------------------------

const toTuples = (rows: SeoRow[]): SeoRowTuple[] =>
  rows.map((r) => [
    r.key,
    r.clicks,
    r.impressions,
    Math.round(r.ctr * 10000) / 10000,
    Math.round(r.position * 100) / 100,
  ]);

const fromTuples = (t: SeoRowTuple[]): SeoRow[] =>
  t.map(([key, clicks, impressions, ctr, position]) => ({ key, clicks, impressions, ctr, position }));

export async function saveMonth(
  customerId: string,
  month: SeoMonth,
  data: { totals: SeoMetrics; queries: SeoRow[]; pages: SeoRow[] },
  source: 'gsc' | 'demo',
): Promise<void> {
  const db = adminDb();
  const ref = db.collection(COL.monthly).doc(monthDocId(customerId, month));
  const rowsCol = ref.collection('rows');

  // Alte Bloecke loeschen, falls der Monat neu abgerufen wird
  const old = await rowsCol.get();
  const del = db.batch();
  old.docs.forEach((d) => del.delete(d.ref));
  if (!old.empty) await del.commit();

  const queries = [...data.queries].sort((a, b) => b.impressions - a.impressions);
  const pages = [...data.pages].sort((a, b) => b.impressions - a.impressions);
  const writes: Array<[string, SeoRow[]]> = [];
  for (let i = 0; i * CHUNK_SIZE < queries.length; i++) {
    writes.push([`queries-${i}`, queries.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)]);
  }
  for (let i = 0; i * CHUNK_SIZE < pages.length; i++) {
    writes.push([`pages-${i}`, pages.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)]);
  }
  // Batches mit hoechstens 20 Dokumenten halten jeden Commit klein
  for (let i = 0; i < writes.length; i += 20) {
    const batch = db.batch();
    for (const [id, rows] of writes.slice(i, i + 20)) {
      batch.set(rowsCol.doc(id), { data: JSON.stringify(toTuples(rows)), count: rows.length });
    }
    await batch.commit();
  }

  const doc: Omit<SeoMonthlyDoc, 'fetchedAt'> & { fetchedAt: Timestamp } = {
    customerId,
    month,
    totals: data.totals,
    queryCount: queries.length,
    pageCount: pages.length,
    chunks: {
      queries: Math.ceil(queries.length / CHUNK_SIZE),
      pages: Math.ceil(pages.length / CHUNK_SIZE),
    },
    source,
    fetchedAt: Timestamp.now(),
  };
  await ref.set(doc);
}

export async function listMonthDocs(customerId: string): Promise<SeoMonthlyDoc[]> {
  const snap = await adminDb()
    .collection(COL.monthly)
    .where('customerId', '==', customerId)
    .get();
  return snap.docs.map((d) => d.data() as SeoMonthlyDoc).sort((a, b) => a.month.localeCompare(b.month));
}

export async function loadMonthRows(
  customerId: string,
  month: SeoMonth,
  kind: 'queries' | 'pages',
): Promise<SeoRow[]> {
  const snap = await adminDb()
    .collection(COL.monthly)
    .doc(monthDocId(customerId, month))
    .collection('rows')
    .get();
  return snap.docs
    .filter((d) => d.id.startsWith(`${kind}-`))
    .flatMap((d) => fromTuples(JSON.parse(d.data().data as string) as SeoRowTuple[]));
}

// ---------------------------------------------------------------------------
// PageSpeed
// ---------------------------------------------------------------------------

export async function savePagespeed(
  customerId: string,
  month: SeoMonth,
  results: PageSpeedResult[],
): Promise<void> {
  await adminDb()
    .collection(COL.pagespeed)
    .doc(monthDocId(customerId, month))
    .set({ customerId, month, results, measuredAt: Timestamp.now() });
}

async function listPagespeed(customerId: string) {
  const snap = await adminDb()
    .collection(COL.pagespeed)
    .where('customerId', '==', customerId)
    .get();
  return snap.docs.map((d) => {
    const x = d.data();
    return { month: x.month as SeoMonth, results: (x.results ?? []) as PageSpeedResult[] };
  });
}

// ---------------------------------------------------------------------------
// Massnahmen, Berichte
// ---------------------------------------------------------------------------

export async function listActivities(customerId: string): Promise<SeoActivity[]> {
  const snap = await adminDb()
    .collection(COL.activities)
    .where('customerId', '==', customerId)
    .get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as SeoActivity)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function listChecks(customerId: string): Promise<SeoCheck[]> {
  const snap = await adminDb()
    .collection(COL.checks)
    .where('customerId', '==', customerId)
    .get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as SeoCheck)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function listReports(customerId: string): Promise<SeoReport[]> {
  const snap = await adminDb()
    .collection(COL.reports)
    .where('customerId', '==', customerId)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SeoReport);
}

export async function getReport(customerId: string, month: SeoMonth): Promise<SeoReport | null> {
  const snap = await adminDb().collection(COL.reports).doc(monthDocId(customerId, month)).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as SeoReport) : null;
}

export async function upsertReport(
  customerId: string,
  month: SeoMonth,
  data: Partial<Omit<SeoReport, 'id' | 'customerId' | 'month'>> & Record<string, unknown>,
): Promise<void> {
  const ref = adminDb().collection(COL.reports).doc(monthDocId(customerId, month));
  const snap = await ref.get();
  await ref.set(
    {
      customerId,
      month,
      ...(snap.exists ? {} : { status: 'draft', assessment: '', createdAt: Timestamp.now() }),
      ...data,
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
}

export const toReportInput = (r: SeoReport): ReportInput => ({
  month: r.month,
  status: r.status,
  assessment: r.assessment ?? '',
  releasedAt: r.releasedAt ? r.releasedAt.toMillis() : null,
  hasPdf: !!r.storagePath,
});

// ---------------------------------------------------------------------------
// Portal-Daten zusammensetzen
// ---------------------------------------------------------------------------

export async function loadPortalData(
  client: SeoClient,
  requestedMonth: SeoMonth | null,
  includeUnreleased: boolean,
): Promise<PortalData> {
  const customerId = client.customerId;
  const [monthDocs, reports, pagespeed, activities, checks] = await Promise.all([
    listMonthDocs(customerId),
    listReports(customerId),
    listPagespeed(customerId),
    listActivities(customerId),
    listChecks(customerId),
  ]);
  const reportInputs = reports.map(toReportInput);

  // Erst bestimmen, welcher Monat gezeigt wird, dann nur dessen Zeilen laden
  const visible = visibleMonths(
    monthDocs.map((m) => m.month),
    reportInputs,
    includeUnreleased,
  );
  const selected =
    requestedMonth && visible.includes(requestedMonth) ? requestedMonth : (visible[0] ?? null);

  const months: MonthInput[] = monthDocs.map((m) => ({ month: m.month, totals: m.totals }));
  if (selected) {
    const window = new Set(
      Array.from({ length: HISTORY_MONTHS }, (_, i) => addMonths(selected, -i)),
    );
    const needPages = new Set([selected, prevMonth(selected)]);
    await Promise.all(
      months
        .filter((m) => window.has(m.month))
        .map(async (m) => {
          m.queries = await loadMonthRows(customerId, m.month, 'queries');
          if (needPages.has(m.month)) m.pages = await loadMonthRows(customerId, m.month, 'pages');
        }),
    );
  }

  return buildPortalData({
    client,
    months,
    requestedMonth: selected,
    includeUnreleased,
    reports: reportInputs,
    pagespeed,
    activities,
    checks,
  });
}

