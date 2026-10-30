import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { entryKey, type ParsedChangelogEntry } from '../changelog-markdown';
import type { SeoActivity, SeoActivityStatus } from '../types';
import { COL, listActivities } from './store';

/**
 * Gleicht geparste Changelog-Eintraege mit seoActivities ab. Wird von der
 * Claude-Code-Schnittstelle genutzt. Idempotent: dieselbe Datei mehrfach
 * senden aendert nichts. Ein vorhandener Eintrag behaelt seine Sichtbarkeit
 * (was im Admin versteckt wurde, bleibt versteckt).
 */

export interface SyncSummary {
  created: Array<Pick<ParsedChangelogEntry, 'date' | 'area' | 'change' | 'status'> & { published: boolean }>;
  updated: Array<Pick<ParsedChangelogEntry, 'date' | 'area' | 'change' | 'status'>>;
  removed: Array<Pick<SeoActivity, 'area' | 'change'>>;
  unchanged: number;
}

const STATUSES: SeoActivityStatus[] = ['done', 'prepared', 'checked', 'planned'];

/** Einzelne Eintraege aus JSON pruefen und mit Schluessel versehen. */
export function normalizeJsonEntries(raw: unknown): ParsedChangelogEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: ParsedChangelogEntry[] = [];
  for (const r of raw.slice(0, 500)) {
    if (!r || typeof r !== 'object') continue;
    const e = r as Record<string, unknown>;
    const date = typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : null;
    const change = typeof e.change === 'string' ? e.change.trim().slice(0, 1000) : '';
    if (!date || !change) continue;
    const status = STATUSES.includes(e.status as SeoActivityStatus) ? (e.status as SeoActivityStatus) : 'done';
    const area = typeof e.area === 'string' && e.area.trim() ? e.area.trim().slice(0, 120) : 'Allgemein';
    const base = {
      date,
      area,
      change,
      status,
      benefit: typeof e.benefit === 'string' ? e.benefit.trim().slice(0, 1000) || undefined : undefined,
      scope: typeof e.scope === 'string' ? e.scope.trim().slice(0, 300) || undefined : undefined,
    };
    out.push({ ...base, key: entryKey(base) });
  }
  return out;
}

export async function syncChangelog(opts: {
  customerId: string;
  entries: ParsedChangelogEntry[];
  publish: boolean;
  /** Komplette Datei gesendet: geplante Punkte, die fehlen, werden entfernt. */
  fullFile: boolean;
  dryRun: boolean;
}): Promise<SyncSummary> {
  const existing = await listActivities(opts.customerId);
  const byKey = new Map(existing.filter((a) => a.externalKey).map((a) => [a.externalKey!, a]));
  const summary: SyncSummary = { created: [], updated: [], removed: [], unchanged: 0 };
  const db = adminDb();
  const batch = db.batch();
  const now = Timestamp.now();

  for (const e of opts.entries) {
    const cur = byKey.get(e.key);
    if (cur) {
      const changed =
        cur.status !== e.status ||
        (cur.benefit ?? '') !== (e.benefit ?? '') ||
        (cur.scope ?? '') !== (e.scope ?? '');
      if (changed) {
        summary.updated.push({ date: e.date, area: e.area, change: e.change, status: e.status });
        batch.update(db.collection(COL.activities).doc(cur.id), {
          status: e.status,
          benefit: e.benefit ?? null,
          scope: e.scope ?? null,
          updatedAt: now,
        });
      } else {
        summary.unchanged++;
      }
      continue;
    }
    // Offene Punkte werden nie automatisch veroeffentlicht
    const published = opts.publish && e.status !== 'planned';
    summary.created.push({ date: e.date, area: e.area, change: e.change, status: e.status, published });
    batch.set(db.collection(COL.activities).doc(), {
      customerId: opts.customerId,
      date: e.date,
      month: e.date.slice(0, 7),
      area: e.area,
      change: e.change,
      ...(e.benefit ? { benefit: e.benefit } : {}),
      ...(e.scope ? { scope: e.scope } : {}),
      status: e.status,
      published,
      source: 'claude-code',
      externalKey: e.key,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (opts.fullFile) {
    const keys = new Set(opts.entries.map((e) => e.key));
    for (const a of existing) {
      if (
        a.status === 'planned' &&
        (a.source === 'claude-code' || a.source === 'import') &&
        a.externalKey &&
        !keys.has(a.externalKey)
      ) {
        summary.removed.push({ area: a.area, change: a.change });
        batch.delete(db.collection(COL.activities).doc(a.id));
      }
    }
  }

  if (!opts.dryRun) await batch.commit();
  return summary;
}
