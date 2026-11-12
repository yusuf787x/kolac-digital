/**
 * Betriebe aus Google Maps holen (DataForSEO, Google Maps SERP, Kosten
 * ca. 0,2 bis 0,5 Cent pro Suche) und in outreach/leads.json aufnehmen.
 *
 *   npx tsx scripts/outreach/leads.mts "Kosmetikstudio" "Bielefeld" [--anzahl 40]
 *
 * Doppelte Betriebe (gleiche Maps-ID oder gleiche Website) werden
 * uebersprungen, bereits angeschriebene bleiben unberuehrt.
 */
import { EXCLUDE_NAMES, knownKeys, loadEnv, loadLeads, saveLeads, slug, type Lead } from './store.mts';

interface MapsItem {
  type?: string;
  title?: string;
  category?: string;
  address?: string;
  address_info?: { city?: string };
  phone?: string;
  url?: string;
  domain?: string;
  rating?: { value?: number; votes_count?: number };
  cid?: string;
  place_id?: string;
  is_claimed?: boolean;
}

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const [branche, stadt] = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!branche || !stadt) {
  console.error('Aufruf: npx tsx scripts/outreach/leads.mts "<Branche>" "<Stadt>" [--anzahl 40]');
  process.exit(1);
}
const depth = Math.min(100, Math.max(10, Number(flag('--anzahl') ?? 40)));

loadEnv(['DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD']);
const login = process.env.DATAFORSEO_LOGIN;
const password = process.env.DATAFORSEO_PASSWORD;
if (!login || !password) {
  console.error('DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD fehlen in .env.local.');
  process.exit(1);
}

const keyword = `${branche} ${stadt}`;
const res = await fetch('https://api.dataforseo.com/v3/serp/google/maps/live/advanced', {
  method: 'POST',
  headers: {
    Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify([{ keyword, location_code: 2276, language_code: 'de', depth }]),
});
const json = (await res.json()) as {
  status_code?: number;
  status_message?: string;
  cost?: number;
  tasks?: { status_code?: number; status_message?: string; result?: { items?: MapsItem[] }[] }[];
};
const task = json.tasks?.[0];
if (!res.ok || json.status_code !== 20000 || task?.status_code !== 20000) {
  console.error(`DataForSEO-Fehler: ${task?.status_message ?? json.status_message ?? res.status}`);
  process.exit(1);
}

const items = (task.result?.[0]?.items ?? []).filter((i) => i.type === 'maps_search' && i.title);
const leads = loadLeads();
const known = knownKeys();
const now = new Date().toISOString();
let added = 0;

for (const it of items) {
  const id = it.cid ? `cid-${it.cid}` : `n-${slug(`${it.title}-${it.address ?? stadt}`)}`;
  let host: string | undefined;
  try {
    host = it.url ? new URL(it.url).hostname.replace(/^www\./, '') : undefined;
  } catch {
    host = undefined;
  }
  // Instagram- oder Facebook-Seite als "Website" eingetragen: als Handle merken, nicht als Website
  const social = host && /(^|\.)(instagram|facebook)\.com$/.test(host);
  if (known.has(id) || (host && !social && known.has(host)) || EXCLUDE_NAMES.test(it.title!)) continue;
  const lead: Lead = {
    id,
    name: it.title!,
    category: it.category,
    address: it.address,
    city: it.address_info?.city ?? stadt,
    phone: it.phone,
    website: it.url && !social ? it.url : undefined,
    instagram: social && host?.includes('instagram') ? it.url!.match(/instagram\.com\/([A-Za-z0-9_.]+)/)?.[1] : undefined,
    rating: it.rating?.value,
    reviews: it.rating?.votes_count,
    mapsUrl: it.cid ? `https://maps.google.com/?cid=${it.cid}` : undefined,
    query: keyword,
    foundAt: now,
    status: 'neu',
  };
  leads.push(lead);
  known.add(id);
  if (host && !social) known.add(host);
  added++;
}

saveLeads(leads);
const withSite = items.filter((i) => i.url && !/instagram|facebook/.test(i.url)).length;
console.log(
  `${keyword}: ${items.length} Treffer, ${added} neu aufgenommen (${withSite} mit Website). ` +
    `Gesamt in der Liste: ${leads.length}. Kosten: ${json.cost ?? '?'} $`,
);
