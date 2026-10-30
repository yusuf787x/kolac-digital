import 'server-only';
import { JWT } from 'google-auth-library';
import type { SeoMetrics, SeoRow } from '../types';

/**
 * Google Search Console (Search Analytics API) ueber einen Service
 * Account. Der Account wird beim Kunden in der Search Console als
 * Nutzer mit Leseberechtigung eingetragen. Zugangsdaten als komplette
 * JSON in GSC_SERVICE_ACCOUNT_JSON.
 */

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
/** Hoechstwert der API pro Anfrage. */
const PAGE_SIZE = 25000;
/** Schutz gegen Endlosschleifen bei sehr grossen Properties. */
const MAX_ROWS = 200000;

let client: JWT | null = null;

export function gscServiceAccountEmail(): string | null {
  try {
    const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
    return raw ? (JSON.parse(raw).client_email ?? null) : null;
  } catch {
    return null;
  }
}

function getClient(): JWT {
  if (client) return client;
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      'GSC_SERVICE_ACCOUNT_JSON ist nicht gesetzt. Ohne Service Account kann die Search Console nicht abgefragt werden.',
    );
  }
  let creds: { client_email?: string; private_key?: string };
  try {
    creds = JSON.parse(raw);
  } catch {
    throw new Error('GSC_SERVICE_ACCOUNT_JSON ist kein gültiges JSON.');
  }
  client = new JWT({
    email: creds.client_email,
    key: creds.private_key?.replace(/\\n/g, '\n'),
    scopes: [SCOPE],
  });
  return client;
}

interface ApiRow {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

async function query(
  property: string,
  body: Record<string, unknown>,
): Promise<ApiRow[]> {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    property,
  )}/searchAnalytics/query`;
  try {
    const res = await getClient().request<{ rows?: ApiRow[] }>({
      url,
      method: 'POST',
      data: body,
    });
    return res.data.rows ?? [];
  } catch (err) {
    const e = err as { response?: { status?: number; data?: { error?: { message?: string } } }; message: string };
    const status = e.response?.status;
    const msg = e.response?.data?.error?.message ?? e.message;
    if (status === 403) {
      throw new Error(
        `Kein Zugriff auf ${property}. Ist ${gscServiceAccountEmail() ?? 'der Service Account'} in der Search Console als Nutzer eingetragen? (${msg})`,
      );
    }
    if (status === 404) {
      throw new Error(`Property ${property} nicht gefunden. Schreibweise prüfen, z. B. sc-domain:beispiel.de (${msg})`);
    }
    throw new Error(`Search Console: ${msg}`);
  }
}

/** Alle Zeilen einer Dimension, ueber startRow paginiert. */
async function queryAll(
  property: string,
  start: string,
  end: string,
  dimension: 'query' | 'page',
): Promise<SeoRow[]> {
  const out: SeoRow[] = [];
  for (let startRow = 0; startRow < MAX_ROWS; startRow += PAGE_SIZE) {
    const rows = await query(property, {
      startDate: start,
      endDate: end,
      dimensions: [dimension],
      type: 'web',
      dataState: 'final',
      rowLimit: PAGE_SIZE,
      startRow,
    });
    for (const r of rows) {
      out.push({
        key: r.keys?.[0] ?? '',
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      });
    }
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

export interface GscMonth {
  totals: SeoMetrics;
  queries: SeoRow[];
  pages: SeoRow[];
}

export async function fetchGscMonth(
  property: string,
  start: string,
  end: string,
): Promise<GscMonth> {
  // Summen ohne Dimension enthalten auch anonymisierte Suchanfragen und
  // sind deshalb hoeher als die Summe der Keyword-Zeilen.
  const [totalRows, queries, pages] = await Promise.all([
    query(property, { startDate: start, endDate: end, type: 'web', dataState: 'final' }),
    queryAll(property, start, end, 'query'),
    queryAll(property, start, end, 'page'),
  ]);
  const t = totalRows[0];
  return {
    totals: t
      ? { clicks: t.clicks, impressions: t.impressions, ctr: t.ctr, position: t.position }
      : { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    queries,
    pages,
  };
}
