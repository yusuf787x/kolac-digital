#!/usr/bin/env node
/**
 * Abgleich zwischen outreach/leads.json (Arbeitskopie von Claude Code) und
 * dem Dashboard (Vertrieb → Outreach, Firestore outreachLeads).
 *
 *   node scripts/outreach/sync.mjs pull   Dashboard → leads.json (Status, Notizen, Instagram)
 *   node scripts/outreach/sync.mjs push   leads.json → Dashboard (neue Betriebe, Prüfung, Texte)
 *
 * Das Dashboard ist die Quelle fuer alles, was Yusuf pflegt (Status,
 * Versanddaten, Notizen). Ein Push ueberschreibt das nie, und Texte nur,
 * solange ein Betrieb noch nicht angeschrieben ist. Immer zuerst pull.
 *
 * Schluessel: KOLAC_PORTAL_TOKEN aus .env.local, Adresse aus .kolac-portal.json.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const STORE = join(ROOT, 'outreach', 'leads.json');
const action = process.argv[2];
if (action !== 'pull' && action !== 'push') {
  console.error('Aufruf: node scripts/outreach/sync.mjs pull|push');
  process.exit(1);
}

const portalUrl = String(JSON.parse(readFileSync(join(ROOT, '.kolac-portal.json'), 'utf8')).portalUrl ?? '').replace(/\/$/, '');
let token = process.env.KOLAC_PORTAL_TOKEN;
if (!token && existsSync(join(ROOT, '.env.local'))) {
  const line = readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n').find((l) => l.trim().startsWith('KOLAC_PORTAL_TOKEN='));
  token = line?.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
}
if (!portalUrl || !token) {
  console.error('portalUrl (.kolac-portal.json) oder KOLAC_PORTAL_TOKEN (.env.local) fehlt.');
  process.exit(1);
}

async function call(body) {
  const res = await fetch(`${portalUrl}/api/outreach/agent`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

const local = existsSync(STORE) ? JSON.parse(readFileSync(STORE, 'utf8')) : [];
const MANUAL = ['status', 'sentAt', 'followedUpAt', 'repliedAt', 'note', 'thread'];

try {
  if (action === 'pull') {
    const { leads: remote } = await call({ action: 'pull' });
    const byId = new Map(local.map((l) => [l.id, l]));
    for (const r of remote) {
      const l = byId.get(r.id);
      if (!l) {
        byId.set(r.id, r);
        continue;
      }
      for (const k of MANUAL) {
        if (r[k]) l[k] = r[k];
        else delete l[k];
      }
      if (r.instagram) l.instagram = r.instagram;
    }
    const merged = [...byId.values()];
    mkdirSync(dirname(STORE), { recursive: true });
    writeFileSync(STORE, JSON.stringify(merged, null, 2) + '\n');
    const count = (s) => merged.filter((l) => s.includes(l.status)).length;
    console.log(
      `Geholt: ${remote.length} Betriebe im Dashboard. Gesendet ${count(['gesendet', 'nachgefasst'])}, ` +
        `geantwortet ${count(['geantwortet'])}, Termine ${count(['termin', 'kunde'])}, kein Interesse ${count(['kein-interesse'])}.`,
    );
  } else {
    let created = 0;
    let updated = 0;
    for (let i = 0; i < local.length; i += 200) {
      const chunk = local.slice(i, i + 200).map((l) => Object.fromEntries(Object.entries(l).filter(([k]) => !MANUAL.includes(k))));
      const r = await call({ action: 'push', leads: chunk });
      created += r.created;
      updated += r.updated;
    }
    console.log(`Ins Dashboard übertragen: ${created} neu, ${updated} aktualisiert.`);
  }
} catch (err) {
  console.error(`Fehler beim ${action}: ${err.message}`);
  process.exit(1);
}
