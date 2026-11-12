/**
 * Gemeinsame Datenhaltung fuer den Instagram-Outreach.
 * Alle Betriebe liegen in outreach/leads.json (per .gitignore ausgeschlossen,
 * enthaelt Kontaktdaten). Die Skripte lesen und schreiben nur diese Datei.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const MAIN_STORE = join(ROOT, 'outreach', 'leads.json');
/** OUTREACH_STORE=<name> (z. B. staging): Kandidaten in outreach/<name>.json erst pruefen und suchen, ins Dashboard kommt nur, was promote.mts uebernimmt. */
export const STAGING_STORE = join(ROOT, 'outreach', 'staging.json');
const storeName = process.env.OUTREACH_STORE?.replace(/[^a-z0-9-]/gi, '');
export const STORE = storeName ? join(ROOT, 'outreach', `${storeName}.json`) : MAIN_STORE;
/** Verworfene Betriebe (kein Instagram oder kein Bedarf): ids und Domains, damit leads.mts sie nicht wieder holt. */
export const REJECTED = join(ROOT, 'outreach', 'verworfen.json');

export type LeadStatus = 'neu' | 'gesendet' | 'nachgefasst' | 'geantwortet' | 'termin' | 'kein-interesse' | 'ausgeschlossen';

export interface LeadScan {
  at: string;
  ok: boolean;
  error?: string;
  finalUrl?: string;
  https?: boolean;
  viewport?: boolean;
  platform?: string;
  copyrightYear?: number;
  booking?: string;
  hasForm?: boolean;
  responseMs?: number;
  title?: string;
  /** Laienverstaendliche Funde, wichtigster zuerst. */
  findings: string[];
  /** 0 bis 10: wie lohnend die Ansprache ist (mehr Funde = mehr Hebel). */
  priority: number;
  /** Nur mit --full (DataForSEO, ca. 2 Cent): SEO-Check-Note und Seite-1-Begriffe. */
  seoScore?: number;
  top10?: number;
}

export interface LeadIg {
  checkedAt: string;
  handle: string;
  fullName?: string;
  bio?: string;
  link?: string;
  followers?: number;
  posts?: number;
  lastPostAt?: string;
  category?: string;
  private?: boolean;
}

export interface Lead {
  id: string;
  name: string;
  category?: string;
  address?: string;
  city?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviews?: number;
  mapsUrl?: string;
  query: string;
  foundAt: string;
  contact?: string;
  instagram?: string;
  /** Woher der Instagram-Name stammt: eigene Website (sicher) oder Suche (wird gegen den Namen geprueft). */
  igSource?: 'website' | 'suche' | 'dashboard';
  /** Wann die Instagram-Suche wirklich gelaufen ist (auch ohne Treffer). Fehlt: noch nicht gesucht. */
  igSearchedAt?: string;
  /** Oeffentliche Profildaten (ScrapeCreators), siehe profiles.mts. */
  ig?: LeadIg;
  scan?: LeadScan;
  dm?: string;
  followup?: string;
  /** Von promote.mts gesetzt: Bedarf geprueft und Instagram gefunden, darf angeschrieben werden. */
  bedarf?: boolean;
  status: LeadStatus;
  sentAt?: string;
  followedUpAt?: string;
  note?: string;
}

export function loadLeads(file = STORE): Lead[] {
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, 'utf8')) as Lead[];
}

export function saveLeads(leads: Lead[], file = STORE): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(leads, null, 2) + '\n');
}

export const hostOf = (url?: string) => {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : undefined;
  } catch {
    return undefined;
  }
};

/** Alles, was schon bekannt ist (Dashboard-Kopie, Zwischenspeicher, verworfen): ids und Domains. */
export function knownKeys(): Set<string> {
  const keys = new Set<string>();
  for (const l of [...loadLeads(MAIN_STORE), ...loadLeads(STAGING_STORE), ...(STORE !== MAIN_STORE && STORE !== STAGING_STORE ? loadLeads(STORE) : [])]) {
    keys.add(l.id);
    const h = hostOf(l.website);
    if (h) keys.add(h);
  }
  if (existsSync(REJECTED)) for (const k of JSON.parse(readFileSync(REJECTED, 'utf8')) as string[]) keys.add(k);
  return keys;
}

/** Bestandskunden und laufende Interessenten nie anschreiben. */
export const EXCLUDE_NAMES = /bacara|paderpuls|pader\s*automobil|acko/i;

/**
 * Hat der Betrieb echten Bedarf? Keine eigene Website zaehlt immer. Bei Terminbranchen
 * (Beauty, Friseur, Wellness) reicht die fehlende Online-Buchung, sonst braucht es mehr.
 */
export function hasNeed(l: Lead): boolean {
  if (!l.scan || l.scan.priority <= 0) return false;
  if (!l.scan.ok && /keine Website|fremder Eintrag/.test(l.scan.error ?? '')) return true;
  const termin = /kosmetik|beaut|friseur|barbier|nagel|wimpern|lash|spa|massage|wellness|haar|waxing|sugaring|tattoo|permanent|fuss|fuß|podolog|nail|brow|make-up/i.test(`${l.category ?? ''} ${l.query}`);
  return l.scan.priority >= (termin ? 2 : 3);
}

/** Nur die benoetigten Schluessel aus .env.local laden, nie ausgeben. */
export function loadEnv(keys: string[]): void {
  const file = join(ROOT, '.env.local');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || !keys.includes(m[1]) || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
