/**
 * Erste DM und Nachfass-Text fuer viele Betriebe auf einmal schreiben
 * (Claude Opus 5.5, Branchen-Playbook aus lib/outreach-playbook.ts).
 *
 *   npx tsx scripts/outreach/draft.mts [--max 50] [--alt 60] [--probe] [--neu-schreiben]
 *
 * --vorhandene: nur Betriebe, die schon einen Text haben, neu schreiben (z. B. nach einer Aenderung am Aufbau)
 *
 * --alt N: vom Altbestand (alte Cold-Call-Leads) nur die N mit den meisten Bewertungen
 *
 * Nur Betriebe im Status "neu" mit Instagram-Profil und Bedarf (hasNeed), die
 * noch keinen Text haben (--neu-schreiben: auch vorhandene ersetzen). Danach
 * sync.mjs push. Kosten werden am Ende ausgegeben (ca. 1 bis 2 Cent pro Betrieb).
 */
import Anthropic from '@anthropic-ai/sdk';
import { DraftSkip, draftCost, generateDraft } from '../../lib/outreach-draft.ts';
import type { OutreachLead } from '../../lib/outreach.ts';
import { hasNeed, loadEnv, loadLeads, saveLeads } from './store.mts';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const max = Number(flag('--max') ?? 1000);
const probe = args.includes('--probe');
const rewrite = args.includes('--neu-schreiben');
const onlyExisting = args.includes('--vorhandene');

loadEnv(['ANTHROPIC_API_KEY']);
if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY fehlt in .env.local.');

const leads = loadLeads();
// Mehr Bewertungen zuerst: groessere Betriebe, mehr Kaufkraft
const altMax = Number(flag('--alt') ?? Infinity);
const isAlt = (l: { query: string }) => l.query.startsWith('Altbestand');
const open = leads
  .filter((l) => l.status === 'neu' && l.instagram && hasNeed(l) && (onlyExisting ? !!l.dm : rewrite || !l.dm))
  .sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0));
const todo = [...open.filter((l) => !isAlt(l)), ...open.filter(isAlt).slice(0, altMax)].slice(0, max);
console.log(`${todo.length} Texte zu schreiben.`);
if (probe) process.exit(0);

const client = new Anthropic();
let cost = 0;
let done = 0;
let flagged = 0;
const skipped: { id: string; name: string; reason: string }[] = [];
const queue = [...todo];
async function worker() {
  while (queue.length) {
    const lead = queue.shift()!;
    try {
      const r = await generateDraft(lead as unknown as OutreachLead, client);
      lead.dm = r.dm;
      lead.followup = r.followup;
      cost += draftCost(r.usage);
      if (r.warnings.length) {
        flagged++;
        console.log(`\n${lead.name}: ${r.warnings.join(' | ')}`);
      }
    } catch (err) {
      if (err instanceof DraftSkip) skipped.push({ id: lead.id, name: lead.name, reason: err.message });
      else console.log(`\n${lead.name}: ${(err as Error).message}`);
    }
    if (++done % 10 === 0) saveLeads(leads);
    process.stdout.write(`\r${done}/${todo.length} geschrieben, ${cost.toFixed(2)} $`);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
saveLeads(leads);
console.log(`\nFertig. ${done - skipped.length} Texte, ${flagged} mit Hinweisen, ${skipped.length} unpassend. Kosten: ${cost.toFixed(2)} $`);
for (const s of skipped) console.log(`  übersprungen: ${s.name}: ${s.reason}`);
// Unpassende gleich im Dashboard ausschliessen: node scripts/outreach/sync.mjs exclude <ids> "Grund"
if (skipped.length) console.log(`IDS_UEBERSPRUNGEN=${skipped.map((s) => s.id).join(',')}`);
