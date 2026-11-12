#!/usr/bin/env node
/**
 * Nachrichten-Entwuerfe in outreach/leads.json uebernehmen.
 *
 *   node scripts/outreach/apply-dms.mjs outreach/dms-<name>.json
 *
 * Die Datei ist ein Objekt { "<lead-id>": { "dm": "...", "followup": "..." } }.
 * Ein leerer Text ("") loescht den Entwurf (Betrieb wird nicht angeschrieben).
 * Bereits gesendete Betriebe werden nicht veraendert.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const STORE = join(ROOT, 'outreach', 'leads.json');
const file = process.argv[2];
if (!file) {
  console.error('Aufruf: node scripts/outreach/apply-dms.mjs outreach/dms-<name>.json');
  process.exit(1);
}

const drafts = JSON.parse(readFileSync(resolve(file), 'utf8'));
const leads = JSON.parse(readFileSync(STORE, 'utf8'));
let applied = 0;
const missing = [];
for (const [id, d] of Object.entries(drafts)) {
  const lead = leads.find((l) => l.id === id);
  if (!lead) {
    missing.push(id);
    continue;
  }
  if (lead.status !== 'neu') continue;
  if (typeof d.dm === 'string') lead.dm = d.dm.trim();
  if (typeof d.followup === 'string') lead.followup = d.followup.trim();
  applied++;
}
writeFileSync(STORE, JSON.stringify(leads, null, 2) + '\n');
console.log(`${applied} Texte übernommen.${missing.length ? ` Unbekannte IDs: ${missing.join(', ')}` : ''}`);
