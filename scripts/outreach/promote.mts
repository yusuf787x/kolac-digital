/**
 * Zwischenspeicher → Arbeitskopie. Nur Betriebe mit Instagram-Profil und echtem Bedarf
 * (hasNeed) wandern nach outreach/leads.json, alle anderen nach outreach/verworfen.json,
 * damit sie bei der naechsten Suche nicht wieder auftauchen. Danach sync.mjs push.
 *
 *   OUTREACH_STORE=staging npx tsx scripts/outreach/promote.mts [--probe]   (--probe: nur zaehlen, nichts verschieben)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { MAIN_STORE, REJECTED, STORE, hasNeed, hostOf, loadLeads, saveLeads } from './store.mts';

if (STORE === MAIN_STORE) throw new Error('OUTREACH_STORE=<name> angeben, z. B. staging.');
const STAGING_STORE = STORE;

const probe = process.argv.includes('--probe');
const staging = loadLeads(STAGING_STORE);
const main = loadLeads(MAIN_STORE);
const rejected = new Set<string>(existsSync(REJECTED) ? JSON.parse(readFileSync(REJECTED, 'utf8')) : []);

const ready = staging.filter((l) => l.scan && l.instagram && hasNeed(l));
// Noch nicht geprueft oder Instagram-Suche noch nicht gelaufen (z. B. Guthaben leer): bleibt liegen
const waiting = staging.filter((l) => !l.scan || (hasNeed(l) && !l.instagram && !l.igSearchedAt));
const drop = staging.filter((l) => !ready.includes(l) && !waiting.includes(l));
const reasons = { 'kein Bedarf': drop.filter((l) => !hasNeed(l)).length, 'kein Instagram': drop.filter((l) => hasNeed(l) && !l.instagram).length };
console.log(`Übernehmen: ${ready.length}, verwerfen: ${drop.length} (${Object.entries(reasons).map(([k, v]) => `${k} ${v}`).join(', ')}), noch offen (nicht geprüft oder nicht gesucht): ${waiting.length}`);
if (probe) process.exit(0);

for (const l of ready) l.bedarf = true;
main.push(...ready);
for (const l of drop) {
  rejected.add(l.id);
  const h = hostOf(l.website);
  if (h) rejected.add(h);
}
saveLeads(main, MAIN_STORE);
saveLeads(waiting, STAGING_STORE);
writeFileSync(REJECTED, JSON.stringify([...rejected], null, 2) + '\n');
console.log(`Arbeitskopie jetzt ${main.length} Betriebe. Weiter mit: node scripts/outreach/sync.mjs push`);
