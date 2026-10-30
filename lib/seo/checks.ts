import { normalizeText } from './analysis';
import { stableHash } from './changelog-markdown';
import { normalizeLinks, safeUrl } from './links';
import type {
  SeoCheck,
  SeoCheckFinding,
  SeoCheckKind,
  SeoCheckMetric,
  SeoFindingStatus,
} from './types';

/**
 * Pruefungen (Scans) und Links aus Claude Code. Rein, ohne Firebase, damit
 * Server-Schnittstelle, Admin und Tests dieselben Regeln nutzen.
 */

const KINDS: SeoCheckKind[] = ['ladezeit', 'technik', 'inhalte', 'sichtbarkeit', 'lokal', 'sonstiges'];
const FINDING: SeoFindingStatus[] = ['ok', 'warn', 'fail'];

/**
 * Sieht ein Text nach Interna aus? Dann wird der Eintrag nicht automatisch
 * veroeffentlicht, sondern wartet im Admin. Lieber einmal zu oft als ein
 * Zugangsname oder Schluessel beim Kunden.
 */
const SENSITIVE = [
  /passw(or)?t|kennwort|password/i,
  /\b(s?ftp|ssh)\b/i,
  /zugangsdaten|login-?daten|benutzername/i,
  /api[-_ ]?(key|schl[uü]ssel)|secret|token/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(kdp|sk_live|sk_test|rk_live)_[A-Za-z0-9_-]{6,}/,
  /AIza[0-9A-Za-z_-]{20,}/,
  /\b\d{1,3}(\.\d{1,3}){3}\b/,
];

export function looksSensitive(...texts: Array<string | undefined>): boolean {
  const t = texts.filter(Boolean).join(' ');
  return SENSITIVE.some((re) => re.test(t));
}

export function checkKey(c: Pick<SeoCheck, 'date' | 'kind' | 'title'>): string {
  return stableHash(`check|${c.date}|${c.kind}|${normalizeText(c.title)}`);
}

export type CheckInput = Omit<SeoCheck, 'id' | 'customerId' | 'month' | 'published' | 'source' | 'createdAt' | 'updatedAt'> & {
  externalKey: string;
};

/** Pruefung aus JSON pruefen und bereinigen. null, wenn Pflichtfelder fehlen. */
export function normalizeCheckInput(raw: unknown): CheckInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const date = typeof o.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : null;
  const title = typeof o.title === 'string' ? o.title.trim().slice(0, 160) : '';
  const summary = typeof o.summary === 'string' ? o.summary.trim().slice(0, 1500) : '';
  if (!date || !title || !summary) return null;
  const kind = KINDS.includes(o.kind as SeoCheckKind) ? (o.kind as SeoCheckKind) : 'sonstiges';

  const metrics: SeoCheckMetric[] = [];
  for (const m of Array.isArray(o.metrics) ? o.metrics.slice(0, 20) : []) {
    if (!m || typeof m !== 'object') continue;
    const r = m as Record<string, unknown>;
    const value = typeof r.value === 'number' ? r.value : Number(r.value);
    const label = typeof r.label === 'string' ? r.label.trim().slice(0, 80) : '';
    if (!label || !Number.isFinite(value)) continue;
    metrics.push({
      key: typeof r.key === 'string' && r.key.trim() ? r.key.trim().slice(0, 60) : normalizeText(label),
      label,
      value,
      ...(typeof r.unit === 'string' && r.unit ? { unit: r.unit.slice(0, 12) } : {}),
      better: r.better === 'higher' || r.better === 'lower' ? r.better : null,
      ...(typeof r.explain === 'string' && r.explain.trim() ? { explain: r.explain.trim().slice(0, 300) } : {}),
    });
  }

  const findings: SeoCheckFinding[] = [];
  for (const f of Array.isArray(o.findings) ? o.findings.slice(0, 40) : []) {
    if (!f || typeof f !== 'object') continue;
    const r = f as Record<string, unknown>;
    const text = typeof r.text === 'string' ? r.text.trim().slice(0, 400) : '';
    if (!text) continue;
    const url = safeUrl(r.url);
    findings.push({
      status: FINDING.includes(r.status as SeoFindingStatus) ? (r.status as SeoFindingStatus) : 'warn',
      text,
      ...(url ? { url } : {}),
    });
  }

  const base = { date, kind, title };
  return {
    ...base,
    summary,
    metrics,
    findings,
    links: normalizeLinks(o.links),
    externalKey: typeof o.key === 'string' && o.key.trim() ? o.key.trim().slice(0, 80) : checkKey(base),
  };
}

/** Text einer Pruefung, der auf Interna geprueft wird. */
export function checkText(c: Pick<SeoCheck, 'title' | 'summary' | 'findings' | 'metrics'>): string {
  return [c.title, c.summary, ...c.findings.map((f) => f.text), ...c.metrics.map((m) => `${m.label} ${m.explain ?? ''}`)].join(' ');
}
