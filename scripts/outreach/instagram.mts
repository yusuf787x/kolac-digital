/**
 * Fehlende Instagram-Profile ueber die Google-Suche finden
 * (DataForSEO, Google organisch, ca. 0,2 Cent pro Betrieb).
 *
 *   npx tsx scripts/outreach/instagram.mts [--alle]
 *
 * Sucht "<Name> <Stadt> instagram" und uebernimmt nur ein
 * Profil, dessen Name oder Titel zum Betrieb passt. Unsichere Treffer
 * werden nicht eingetragen, die stehen im Dashboard mit "Profil suchen".
 * Ohne --alle nur Betriebe, die einen Text haben (die werden angeschrieben).
 */
import { loadEnv, loadLeads, saveLeads } from './store.mts';

const all = process.argv.includes('--alle');
loadEnv(['DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD']);
const login = process.env.DATAFORSEO_LOGIN;
const password = process.env.DATAFORSEO_PASSWORD;
if (!login || !password) {
  console.error('DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD fehlen in .env.local.');
  process.exit(1);
}
const auth = `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;

const SKIP = new Set(['p', 'reel', 'reels', 'explore', 'stories', 'accounts', 'tv', 'popular', 'about']);
const GENERIC = new Set(['beauty', 'kosmetik', 'kosmetikstudio', 'studio', 'salon', 'bielefeld', 'cosmetic', 'cosmetics', 'lounge', 'care', 'und', 'the', 'by', 'and', 'wellness', 'aesthetic', 'aesthetics']);
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss');
const tokens = (name: string) => norm(name).split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !GENERIC.has(t));

const leads = loadLeads();
const todo = leads.filter((l) => !l.instagram && l.status !== 'ausgeschlossen' && (all || l.dm));
let found = 0;
let cost = 0;

for (const lead of todo) {
  const keyword = `${lead.name.split(/[-–|•/]/)[0].trim()} ${lead.city ?? ''} instagram`.replace(/\s+/g, ' ').trim();
  const search = () => fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify([{ keyword, location_code: 2276, language_code: 'de', depth: 20 }]),
  });
  let res = await search();
  let json = (await res.json()) as {
    cost?: number;
    tasks?: { status_code?: number; status_message?: string; result?: { items?: { type?: string; url?: string; title?: string; website_name?: string }[] }[] }[];
  };
  cost += json.cost ?? 0;
  // Bei "Internal SE Server Error" einmal wiederholen
  if (json.tasks?.[0]?.status_code !== 20000) {
    res = await search();
    json = await res.json();
    cost += json.cost ?? 0;
  }
  const task = json.tasks?.[0];
  if (task?.status_code !== 20000) {
    console.log(`${lead.name}: Suche fehlgeschlagen (${task?.status_message ?? res.status})`);
    continue;
  }
  const want = tokens(lead.name);
  const hit = (task.result?.[0]?.items ?? [])
    .filter((i) => i.type === 'organic')
    // Google liefert Links teils als Umleitung, der Name steht dann in website_name ("Instagram · name")
    .map((i) => ({
      handle:
        i.url?.match(/instagram\.com\/([A-Za-z0-9_.]{2,30})\/?(?:$|\?)/)?.[1] ??
        i.website_name?.match(/^Instagram\s*·\s*([A-Za-z0-9_.]{2,30})$/)?.[1],
      title: i.title ?? '',
    }))
    .filter((i): i is { handle: string; title: string } => !!i.handle && !SKIP.has(i.handle.toLowerCase()))
    .find((i) => want.some((t) => norm(i.handle).includes(t) || norm(i.title).includes(t)));
  if (hit) {
    lead.instagram = hit.handle;
    found++;
    console.log(`${lead.name}: @${hit.handle}`);
  } else {
    console.log(`${lead.name}: kein sicherer Treffer`);
  }
}

saveLeads(leads);
console.log(`${found} von ${todo.length} Profilen gefunden. Kosten: ${cost.toFixed(3)} $`);
