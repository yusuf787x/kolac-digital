/**
 * Alte Cold-Call-Leads (Firestore "leads", Modul entfernt) in den Zwischenspeicher holen.
 *
 *   npx tsx scripts/outreach/import-legacy.mts
 *
 * Liest ueber /api/outreach/agent { action: "legacy" } und schreibt neue Betriebe nach
 * outreach/staging.json. Danach mit OUTREACH_STORE=staging pruefen (scan.mts) und
 * Instagram suchen (instagram.mts --bedarf), dann promote.mts.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXCLUDE_NAMES, ROOT, STAGING_STORE, hostOf, knownKeys, loadEnv, loadLeads, saveLeads, type Lead } from './store.mts';

loadEnv(['KOLAC_PORTAL_TOKEN']);
const portalUrl = String(JSON.parse(readFileSync(join(ROOT, '.kolac-portal.json'), 'utf8')).portalUrl ?? '').replace(/\/$/, '');
const token = process.env.KOLAC_PORTAL_TOKEN;
if (!portalUrl || !token) throw new Error('portalUrl oder KOLAC_PORTAL_TOKEN fehlt.');

type Legacy = {
  id: string;
  company?: string;
  contactName?: string;
  website?: string;
  websiteAge?: string;
  category?: string;
  city?: string;
  street?: string;
  zip?: string;
  rating?: number;
  reviewCount?: number;
  googleMapsUrl?: string;
  status?: string;
};

const cache = join(ROOT, 'outreach', 'legacy-leads.json');
let rows: Legacy[];
if (existsSync(cache) && process.argv.includes('--cache')) {
  rows = JSON.parse(readFileSync(cache, 'utf8'));
} else {
  const res = await fetch(`${portalUrl}/api/outreach/agent`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'legacy' }),
  });
  const json = (await res.json()) as { leads?: Legacy[]; error?: string };
  if (!res.ok || !json.leads) throw new Error(json.error ?? `HTTP ${res.status}`);
  rows = json.leads;
}

// Der alte CSV-Import hat teils Oeffnungszeiten oder Textschnipsel in Stadt und Kategorie geschrieben
const clean = (v?: string) => (v && v.length <= 40 && !/[:\[\]{}=!]|^\d+$/.test(v) ? v : undefined);
// Nicht jede alte Kategorie ist ein Betrieb fuer Website-Outreach
const SKIP_CAT = /supermarket|pharmacy|drug store|radiolog|cancer|pediatric|child health|nursing|museum|wholesaler|supplier|supply store|erotic|psychotherap|speech|obstetric|toy store|organic food/i;

const known = knownKeys();
const staging = loadLeads(STAGING_STORE);
const now = new Date().toISOString();
let added = 0;
let skipped = 0;
for (const r of rows) {
  const name = r.company?.trim();
  if (!name || EXCLUDE_NAMES.test(name) || SKIP_CAT.test(r.category ?? '') || r.status === 'kein_interesse') {
    skipped++;
    continue;
  }
  const cid = r.googleMapsUrl?.match(/[?&]cid=(\d+)/)?.[1];
  const id = cid ? `cid-${cid}` : `legacy-${r.id}`;
  const website = r.website && /^https?:\/\//.test(r.website) && !/instagram|facebook/.test(r.website) ? r.website : undefined;
  const host = hostOf(website);
  if (known.has(id) || (host && known.has(host))) {
    skipped++;
    continue;
  }
  const city = clean(r.city);
  const lead: Lead = {
    id,
    name,
    contact: r.contactName?.trim() || undefined,
    category: clean(r.category),
    address: [r.street, [r.zip, city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || undefined,
    city,
    website,
    instagram: r.website?.match(/instagram\.com\/([A-Za-z0-9_.]+)/)?.[1],
    rating: typeof r.rating === 'number' ? r.rating : undefined,
    reviews: typeof r.reviewCount === 'number' ? r.reviewCount : undefined,
    mapsUrl: r.googleMapsUrl,
    query: `Altbestand ${clean(r.category) ?? ''}`.trim(),
    foundAt: now,
    status: 'neu',
  };
  if (lead.instagram) lead.igSource = 'website';
  staging.push(lead);
  known.add(id);
  if (host) known.add(host);
  added++;
}
saveLeads(staging, STAGING_STORE);
console.log(`Altbestand: ${rows.length} gelesen, ${added} in den Zwischenspeicher, ${skipped} übersprungen (bekannt, Kunde oder unpassend).`);
