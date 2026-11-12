/**
 * Gemeinsame Datenhaltung fuer den Instagram-Outreach.
 * Alle Betriebe liegen in outreach/leads.json (per .gitignore ausgeschlossen,
 * enthaelt Kontaktdaten). Die Skripte lesen und schreiben nur diese Datei.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const STORE = join(ROOT, 'outreach', 'leads.json');

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
  instagram?: string;
  /** Woher der Instagram-Name stammt: eigene Website (sicher) oder Suche (wird gegen den Namen geprueft). */
  igSource?: 'website' | 'suche' | 'dashboard';
  /** Oeffentliche Profildaten (ScrapeCreators), siehe profiles.mts. */
  ig?: LeadIg;
  scan?: LeadScan;
  dm?: string;
  followup?: string;
  status: LeadStatus;
  sentAt?: string;
  followedUpAt?: string;
  note?: string;
}

export function loadLeads(): Lead[] {
  if (!existsSync(STORE)) return [];
  return JSON.parse(readFileSync(STORE, 'utf8')) as Lead[];
}

export function saveLeads(leads: Lead[]): void {
  mkdirSync(dirname(STORE), { recursive: true });
  writeFileSync(STORE, JSON.stringify(leads, null, 2) + '\n');
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
