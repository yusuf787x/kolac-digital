import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import type { SeoEstimatePoint } from '../types';
import { COL } from './store';

/**
 * Vorher-Kurve: geschaetzte Google-Besucher pro Monat von DataForSEO
 * (Labs, Historical Rank Overview). Google liefert Search-Console-Daten erst
 * ab der Einrichtung, fuer die Zeit davor gibt es nur diese Schaetzung aus
 * Suchbegriffen und Platzierungen. Kostet ca. 0,15 $ pro Abruf, deshalb nur
 * auf Anforderung (Agent-Aktion "estimate") und gespeichert am Kunden.
 */

const MONTHS_BACK = 24;
const EARLIEST = '2020-10-01';

export function estimateConfigured(): boolean {
  return !!process.env.DATAFORSEO_LOGIN?.trim() && !!process.env.DATAFORSEO_PASSWORD?.trim();
}

export function bareDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}

function dateFrom(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - MONTHS_BACK, 1));
  const iso = d.toISOString().slice(0, 10);
  return iso < EARLIEST ? EARLIEST : iso;
}

interface DfsOrganic {
  pos_1?: number;
  pos_2_3?: number;
  pos_4_10?: number;
  etv?: number;
}

export interface EstimateResult {
  points: SeoEstimatePoint[];
  /** Kosten laut DataForSEO in US-Dollar. */
  cost: number | null;
}

export async function fetchEstimate(domain: string): Promise<EstimateResult> {
  if (!estimateConfigured()) throw new Error('DataForSEO ist nicht eingerichtet (DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD).');
  const login = (process.env.DATAFORSEO_LOGIN ?? '').trim().replace(/^["']|["']$/g, '');
  const password = (process.env.DATAFORSEO_PASSWORD ?? '').trim().replace(/^["']|["']$/g, '');
  const auth = Buffer.from(`${login}:${password}`).toString('base64');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/historical_rank_overview/live', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { target: bareDomain(domain), location_code: 2276, language_code: 'de', correlate: true, date_from: dateFrom() },
      ]),
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => null)) as {
      status_code?: number;
      status_message?: string;
      tasks?: {
        status_code?: number;
        status_message?: string;
        cost?: number;
        result?: { items?: { year?: number; month?: number; metrics?: { organic?: DfsOrganic } }[] | null }[] | null;
      }[];
    } | null;
    const task = json?.tasks?.[0];
    if (!res.ok || !json || json.status_code !== 20000 || !task || task.status_code !== 20000) {
      const msg = task?.status_message ?? json?.status_message ?? `HTTP ${res.status}`;
      throw new Error(`DataForSEO-Fehler: ${msg}`);
    }
    const points: SeoEstimatePoint[] = (task.result?.[0]?.items ?? [])
      .filter((it) => it.year && it.month)
      .map((it) => {
        const o = it.metrics?.organic ?? {};
        return {
          month: `${it.year}-${String(it.month).padStart(2, '0')}`,
          visitors: Math.round(o.etv ?? 0),
          top10: (o.pos_1 ?? 0) + (o.pos_2_3 ?? 0) + (o.pos_4_10 ?? 0),
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
    return { points, cost: typeof task.cost === 'number' ? task.cost : null };
  } finally {
    clearTimeout(timer);
  }
}

export async function saveEstimate(customerId: string, points: SeoEstimatePoint[]): Promise<void> {
  await adminDb()
    .collection(COL.clients)
    .doc(customerId)
    .set({ estimate: { source: 'dataforseo', fetchedAt: Timestamp.now(), points } }, { merge: true });
}
