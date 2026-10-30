import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { entryKey, type ParsedChangelogEntry } from '../changelog-markdown';
import { checkText, looksSensitive, type CheckInput } from '../checks';
import { normalizeLinks } from '../links';
import type { SeoActivity, SeoActivityStatus, SeoCheck } from '../types';
import { COL, listActivities, listChecks } from './store';

/**
 * Gleicht Eintraege aus Claude Code mit seoActivities und seoChecks ab.
 * Idempotent: dieselbe Datei mehrfach senden aendert nichts. Ein
 * vorhandener Eintrag behaelt seine Sichtbarkeit (was im Admin versteckt
 * wurde, bleibt versteckt).
 *
 * Sicherheitsnetz: Neue Eintraege, die nach Interna aussehen (Passwort,
 * Zugang, Schluessel, IP), werden nie automatisch veroeffentlicht.
 */

type Brief = Pick<ParsedChangelogEntry, 'date' | 'area' | 'change' | 'status'>;

export interface SyncSummary {
  created: Array<Brief & { published: boolean }>;
  updated: Brief[];
  removed: Array<Pick<SeoActivity, 'area' | 'change'>>;
  unchanged: number;
  checks: { created: Array<{ date: string; title: string; published: boolean }>; updated: number; unchanged: number };
  /** Neue Eintraege, die wegen moeglicher Interna versteckt bleiben. */
  held: string[];
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
    const links = normalizeLinks(e.links);
    const base = {
      date,
      area,
      change,
      status,
      benefit: typeof e.benefit === 'string' ? e.benefit.trim().slice(0, 1000) || undefined : undefined,
      scope: typeof e.scope === 'string' ? e.scope.trim().slice(0, 300) || undefined : undefined,
      ...(links.length ? { links } : {}),
    };
    out.push({ ...base, key: entryKey(base) });
  }
  return out;
}

const linksEqual = (a?: { url: string; label: string }[], b?: { url: string; label: string }[]) =>
  JSON.stringify(a ?? []) === JSON.stringify(b ?? []);

export async function syncChangelog(opts: {
  customerId: string;
  entries: ParsedChangelogEntry[];
  checks: CheckInput[];
  publish: boolean;
  /** Komplette Datei gesendet: geplante Punkte, die fehlen, werden entfernt. */
  fullFile: boolean;
  dryRun: boolean;
}): Promise<SyncSummary> {
  const [existing, existingChecks] = await Promise.all([
    listActivities(opts.customerId),
    listChecks(opts.customerId),
  ]);
  const byKey = new Map(existing.filter((a) => a.externalKey).map((a) => [a.externalKey!, a]));
  const summary: SyncSummary = {
    created: [],
    updated: [],
    removed: [],
    unchanged: 0,
    checks: { created: [], updated: 0, unchanged: 0 },
    held: [],
  };
  const db = adminDb();
  const batch = db.batch();
  const now = Timestamp.now();

  for (const e of opts.entries) {
    const cur = byKey.get(e.key);
    if (cur) {
      const changed =
        cur.status !== e.status ||
        (cur.benefit ?? '') !== (e.benefit ?? '') ||
        (cur.scope ?? '') !== (e.scope ?? '') ||
        !linksEqual(cur.links, e.links);
      if (changed) {
        summary.updated.push({ date: e.date, area: e.area, change: e.change, status: e.status });
        batch.update(db.collection(COL.activities).doc(cur.id), {
          status: e.status,
          benefit: e.benefit ?? null,
          scope: e.scope ?? null,
          links: e.links ?? [],
          updatedAt: now,
        });
      } else {
        summary.unchanged++;
      }
      continue;
    }
    const sensitive = looksSensitive(e.area, e.change, e.benefit, e.scope);
    if (sensitive) summary.held.push(e.change);
    // Offene Punkte und moegliche Interna werden nie automatisch veroeffentlicht
    const published = opts.publish && e.status !== 'planned' && !sensitive;
    summary.created.push({ date: e.date, area: e.area, change: e.change, status: e.status, published });
    batch.set(db.collection(COL.activities).doc(), {
      customerId: opts.customerId,
      date: e.date,
      month: e.date.slice(0, 7),
      area: e.area,
      change: e.change,
      ...(e.benefit ? { benefit: e.benefit } : {}),
      ...(e.scope ? { scope: e.scope } : {}),
      ...(e.links?.length ? { links: e.links } : {}),
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

  // Pruefungen
  const checksByKey = new Map(existingChecks.filter((c) => c.externalKey).map((c) => [c.externalKey!, c]));
  for (const c of opts.checks) {
    const data = {
      date: c.date,
      month: c.date.slice(0, 7),
      kind: c.kind,
      title: c.title,
      summary: c.summary,
      metrics: c.metrics,
      findings: c.findings,
      links: c.links,
    };
    const cur = checksByKey.get(c.externalKey);
    if (cur) {
      const same = JSON.stringify(pickComparable(cur)) === JSON.stringify(pickComparable(data));
      if (same) {
        summary.checks.unchanged++;
      } else {
        summary.checks.updated++;
        batch.update(db.collection(COL.checks).doc(cur.id), { ...data, updatedAt: now });
      }
      continue;
    }
    const sensitive = looksSensitive(checkText(c));
    if (sensitive) summary.held.push(c.title);
    const published = opts.publish && !sensitive;
    summary.checks.created.push({ date: c.date, title: c.title, published });
    batch.set(db.collection(COL.checks).doc(), {
      customerId: opts.customerId,
      ...data,
      published,
      source: 'claude-code',
      externalKey: c.externalKey,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (!opts.dryRun) await batch.commit();
  return summary;
}

function pickComparable(c: Pick<SeoCheck, 'summary' | 'metrics' | 'findings' | 'links' | 'title' | 'kind' | 'date'>) {
  return [c.date, c.kind, c.title, c.summary, c.metrics, c.findings, c.links];
}
