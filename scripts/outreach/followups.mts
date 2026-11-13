/**
 * Nachfass-Nachrichten fuer alle angeschriebenen Instagram-Betriebe (Status "gesendet")
 * vorschreiben, passend zur DM, die laut Dashboard wirklich rausging.
 *
 *   npx tsx scripts/outreach/followups.mts [--alle] [--probe]
 *
 * Ohne --alle nur Betriebe ohne Nachfass-Text oder mit einem, der vor dem Versand
 * zusammen mit der DM entstand (also alle, die noch nicht nachgefasst sind).
 * Liest und schreibt direkt im Dashboard (Agent-Aktionen "pull" und "followups").
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { draftCost, generateFollowup } from '../../lib/outreach-draft.ts';
import type { OutreachLead } from '../../lib/outreach.ts';
import { loadEnv } from './store.mts';

const probe = process.argv.includes('--probe');
loadEnv(['ANTHROPIC_API_KEY', 'KOLAC_PORTAL_TOKEN']);
const portalUrl = String(JSON.parse(readFileSync(join(process.cwd(), '.kolac-portal.json'), 'utf8')).portalUrl ?? '').replace(/\/$/, '');

async function call<T>(body: unknown): Promise<T> {
  const res = await fetch(`${portalUrl}/api/outreach/agent`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.KOLAC_PORTAL_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

const { leads } = await call<{ leads: OutreachLead[] }>({ action: 'pull' });
const todo = leads.filter((l) => l.status === 'gesendet' && l.channel !== 'mail' && l.instagram && l.dm);
console.log(`${todo.length} Nachfass-Texte zu schreiben.`);
if (probe) process.exit(0);

const updates: { id: string; followup: string }[] = [];
let cost = 0;
const queue = [...todo];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const lead = queue.shift()!;
      try {
        const r = await generateFollowup(lead);
        updates.push({ id: lead.id, followup: r.followup });
        cost += draftCost(r.usage);
        if (r.warnings.length) console.log(`${lead.name}: ${r.warnings.join(' | ')}`);
      } catch (err) {
        console.log(`${lead.name}: ${(err as Error).message}`);
      }
    }
  }),
);
const { changed } = await call<{ changed: number }>({ action: 'followups', updates });
console.log(`Im Dashboard gespeichert: ${changed}. Kosten: ${cost.toFixed(2)} $`);
for (const u of updates.slice(0, 3)) console.log(`\n--- ${todo.find((l) => l.id === u.id)?.name}\n${u.followup}`);
