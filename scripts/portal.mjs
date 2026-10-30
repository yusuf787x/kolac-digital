#!/usr/bin/env node
/**
 * Vollzugriff aus Claude Code auf das Kundenportal eines Kunden
 * (POST /api/seo/agent). Gleiche Konfiguration wie portal-changelog.mjs:
 * .kolac-portal.json und KOLAC_PORTAL_TOKEN in .env des Kundenprojekts.
 *
 * Aufruf im Kundenprojekt:
 *   node …/scripts/portal.mjs status
 *   node …/scripts/portal.mjs data '{"month":"2026-09","keywords":30}'
 *   node …/scripts/portal.mjs fetch '{"month":"2026-09","pagespeed":true}'
 *   node …/scripts/portal.mjs report @bericht.json      (Body aus Datei)
 *   node …/scripts/portal.mjs release '{"month":"2026-09","confirm":true}'
 *   node …/scripts/portal.mjs settings '{"brandTerms":["motorenfachmann"]}'
 *   node …/scripts/portal.mjs items
 *   node …/scripts/portal.mjs visibility '{"type":"activity","id":"…","published":true}'
 *
 * Gibt die JSON-Antwort aus. Ohne Abhaengigkeiten, Node 18+.
 */
import { existsSync, readFileSync } from 'node:fs';

function fail(msg) {
  console.error(`Fehler: ${msg}`);
  process.exit(1);
}

const [action, arg] = process.argv.slice(2);
if (!action) fail('Aktion fehlt, z. B. "status".');

if (!existsSync('.kolac-portal.json')) fail('.kolac-portal.json fehlt im aktuellen Ordner.');
const portalUrl = String(JSON.parse(readFileSync('.kolac-portal.json', 'utf8')).portalUrl ?? '').replace(/\/$/, '');
if (!portalUrl) fail('portalUrl fehlt in .kolac-portal.json.');

let token = process.env.KOLAC_PORTAL_TOKEN;
if (!token && existsSync('.env')) {
  const line = readFileSync('.env', 'utf8').split('\n').find((l) => l.trim().startsWith('KOLAC_PORTAL_TOKEN='));
  token = line?.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
}
if (!token) fail('KOLAC_PORTAL_TOKEN fehlt (Umgebungsvariable oder .env im Projekt).');

let extra = {};
if (arg) {
  try {
    extra = JSON.parse(arg.startsWith('@') ? readFileSync(arg.slice(1), 'utf8') : arg);
  } catch (err) {
    fail(`Argument ist kein gültiges JSON: ${err.message}`);
  }
}

const res = await fetch(`${portalUrl}/api/seo/agent`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ ...extra, action }),
});
const text = await res.text();
let out;
try {
  out = JSON.parse(text);
} catch {
  out = { error: `Antwort ohne JSON (HTTP ${res.status})`, body: text.slice(0, 300) };
}
console.log(JSON.stringify(out, null, 2));
if (!res.ok) process.exit(1);
