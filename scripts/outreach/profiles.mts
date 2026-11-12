/**
 * Instagram-Profile pruefen und auslesen (ScrapeCreators, 1 Credit pro Abruf).
 *
 *   npx tsx scripts/outreach/profiles.mts [--alle] [--suchen]
 *
 * - Prueft jedes eingetragene Profil: gibt es das, passt es zum Betrieb?
 *   Falsche Treffer werden entfernt.
 * - Liest Bio, Link in der Bio, Follower, Kategorie und den letzten Beitrag
 *   (fuer persoenlichere Nachrichten und neue Funde).
 * - --suchen: fehlende Profile ueber die Google-Suche von ScrapeCreators
 *   finden (1 Credit) und gleich pruefen.
 * - Ohne --alle nur Betriebe mit Text, die noch nicht geprueft sind.
 *
 * Schluessel: SCRAPECREATORS_API_KEY in .env.local (nie ausgeben).
 */
import { loadEnv, loadLeads, saveLeads, type Lead } from './store.mts';

const all = process.argv.includes('--alle');
const searchMissing = process.argv.includes('--suchen');
loadEnv(['SCRAPECREATORS_API_KEY']);
const key = process.env.SCRAPECREATORS_API_KEY;
if (!key) {
  console.error('SCRAPECREATORS_API_KEY fehlt in .env.local.');
  process.exit(1);
}

let credits: number | undefined;
async function sc(path: string): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`https://api.scrapecreators.com${path}`, { headers: { 'x-api-key': key! } });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof json.credits_remaining === 'number') credits = json.credits_remaining;
  return { status: res.status, json };
}

const GENERIC = new Set(['beauty', 'kosmetik', 'kosmetikstudio', 'studio', 'salon', 'bielefeld', 'cosmetic', 'cosmetics', 'lounge', 'care', 'und', 'the', 'and', 'wellness', 'aesthetic', 'aesthetics', 'institut', 'concept', 'store']);
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
const tokens = (s: string) => norm(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !GENERIC.has(t));
const SKIP = new Set(['p', 'reel', 'reels', 'explore', 'stories', 'accounts', 'tv', 'popular', 'about', 'instagram']);

interface IgUser {
  username?: string;
  full_name?: string;
  biography?: string;
  external_url?: string;
  bio_links?: { url?: string }[];
  edge_followed_by?: { count?: number };
  edge_owner_to_timeline_media?: { count?: number; edges?: { node?: { taken_at_timestamp?: number } }[] };
  category_name?: string;
  is_private?: boolean;
}

/** Profil holen und gegen den Betrieb pruefen. null = gibt es nicht oder passt nicht. */
async function fetchProfile(lead: Lead, handle: string): Promise<Lead['ig'] | null> {
  const { status, json } = await sc(`/v1/instagram/profile?handle=${encodeURIComponent(handle)}`);
  const u = ((json.data as { user?: IgUser })?.user ?? null) as IgUser | null;
  if (status !== 200 || !u?.username) return null;
  const hay = norm(`${u.username} ${u.full_name ?? ''} ${u.biography ?? ''}`);
  const want = tokens(lead.name);
  // Handle von der eigenen Website gilt als sicher, Suchtreffer muessen zum Namen passen
  // Besteht der Name nur aus Allerweltswoertern ("Beauty Lounge"), ist ein Suchtreffer nicht pruefbar: verwerfen
  if (lead.igSource === 'suche' && (!want.length || !want.some((t) => hay.includes(t)))) return null;
  const posts = u.edge_owner_to_timeline_media?.edges ?? [];
  const last = Math.max(0, ...posts.map((p) => p.node?.taken_at_timestamp ?? 0));
  const link = u.external_url || u.bio_links?.find((b) => b.url)?.url || undefined;
  return {
    checkedAt: new Date().toISOString(),
    handle: u.username,
    fullName: u.full_name || undefined,
    bio: u.biography || undefined,
    link,
    followers: u.edge_followed_by?.count,
    posts: u.edge_owner_to_timeline_media?.count,
    lastPostAt: last ? new Date(last * 1000).toISOString() : undefined,
    category: u.category_name || undefined,
    private: !!u.is_private,
  };
}

/** Instagram-Namen aus beliebigem JSON fischen (Google-Ergebnisse von ScrapeCreators). */
function handlesIn(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    for (const m of value.matchAll(/instagram\.com\/([A-Za-z0-9_.]{2,30})/g)) {
      const h = m[1].replace(/\.$/, '');
      if (!SKIP.has(h.toLowerCase()) && !out.includes(h)) out.push(h);
    }
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) handlesIn(v, out);
  }
  return out;
}

const DAY = 86_400_000;
const leads = loadLeads();
const relevant = leads.filter((l) => l.status !== 'ausgeschlossen' && l.status !== 'kein-interesse' && (all || l.dm));
let checked = 0;
let removed = 0;
let found = 0;

for (const lead of relevant) {
  if (!lead.instagram && searchMissing) {
    const { json } = await sc(`/v1/google/search?query=${encodeURIComponent(`${lead.name.split(/[-–|•/]/)[0].trim()} ${lead.city ?? ''} instagram`)}`);
    for (const h of handlesIn(json).slice(0, 3)) {
      lead.igSource = 'suche';
      const ig = await fetchProfile(lead, h);
      if (ig) {
        lead.instagram = ig.handle;
        lead.ig = ig;
        found++;
        console.log(`${lead.name}: gefunden @${ig.handle}`);
        break;
      }
    }
    if (!lead.instagram) {
      delete lead.igSource;
      console.log(`${lead.name}: kein passendes Profil`);
    }
    continue;
  }
  if (!lead.instagram || (lead.ig && !all)) continue;
  lead.igSource ??= 'website';
  const ig = await fetchProfile(lead, lead.instagram);
  checked++;
  if (!ig) {
    console.log(`${lead.name}: @${lead.instagram} gibt es nicht oder passt nicht, entfernt`);
    delete lead.instagram;
    delete lead.ig;
    removed++;
    continue;
  }
  lead.instagram = ig.handle;
  lead.ig = ig;
}

// Funde aus Instagram ergaenzen
for (const lead of leads) {
  if (!lead.ig || !lead.scan) continue;
  lead.scan.findings = lead.scan.findings.filter((f) => !f.startsWith('Instagram:'));
  if (!lead.ig.link) lead.scan.findings.push('Instagram: kein Link in der Bio, wer buchen will, muss schreiben');
  const idle = lead.ig.lastPostAt ? (Date.now() - Date.parse(lead.ig.lastPostAt)) / DAY : Infinity;
  if (idle > 180) lead.scan.findings.push(`Instagram: letzter Beitrag ${lead.ig.lastPostAt ? new Date(lead.ig.lastPostAt).toLocaleDateString('de-DE') : 'unbekannt'}, DMs werden evtl. selten gelesen`);
}

saveLeads(leads);
console.log(
  `Geprüft: ${checked}, entfernt: ${removed}${searchMissing ? `, neu gefunden: ${found}` : ''}. ` +
    `Mit Instagram: ${leads.filter((l) => l.instagram).length}. Credits übrig: ${credits ?? '?'}`,
);
