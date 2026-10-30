#!/usr/bin/env node
/**
 * Uebertraegt die CHANGELOG.md eines Kundenprojekts ins Kundenportal
 * (POST /api/seo/changelog). Wird vom Claude-Code-Skill
 * "kolac-portal-changelog" aufgerufen, funktioniert aber auch von Hand.
 *
 * Im Kundenprojekt noetig:
 *   .kolac-portal.json   { "portalUrl": "https://www.kolac-digital.de", "customer": "Name" }
 *   .env                 KOLAC_PORTAL_TOKEN=kdp_...   (aus dem Admin, Tab Massnahmen)
 *
 * Optional:
 *   portal-pruefungen/*.json   Pruefungen (Scans, Kennzahlen), je Datei ein
 *                              Objekt oder eine Liste. Format siehe Skill
 *                              kolac-portal-changelog bzw. lib/seo/checks.ts
 *
 * Aufruf im Kundenprojekt:
 *   node ~/Documents/Code/internal/kolac-digital-web/scripts/portal-changelog.mjs --dry-run
 *   node ~/Documents/Code/internal/kolac-digital-web/scripts/portal-changelog.mjs
 *
 * Optionen:
 *   --dry-run      nur anzeigen, was sich aendern wuerde
 *   --no-publish   neue Eintraege nicht sofort fuer den Kunden sichtbar machen
 *   --file <pfad>  andere Datei als CHANGELOG.md
 *
 * Ohne Abhaengigkeiten, Node 18+.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const publish = !args.includes('--no-publish');
const fileIdx = args.indexOf('--file');
const file = resolve(fileIdx >= 0 ? args[fileIdx + 1] : 'CHANGELOG.md');

function fail(msg) {
  console.error(`Fehler: ${msg}`);
  process.exit(1);
}

if (!existsSync('.kolac-portal.json')) {
  fail('.kolac-portal.json fehlt im aktuellen Ordner. Inhalt siehe Admin, SEO-Kunde, Tab Maßnahmen.');
}
const config = JSON.parse(readFileSync('.kolac-portal.json', 'utf8'));
const portalUrl = String(config.portalUrl ?? '').replace(/\/$/, '');
if (!portalUrl) fail('portalUrl fehlt in .kolac-portal.json.');

let token = process.env.KOLAC_PORTAL_TOKEN;
if (!token && existsSync('.env')) {
  const line = readFileSync('.env', 'utf8')
    .split('\n')
    .find((l) => l.trim().startsWith('KOLAC_PORTAL_TOKEN='));
  token = line?.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
}
if (!token) fail('KOLAC_PORTAL_TOKEN fehlt (Umgebungsvariable oder .env im Projekt).');
const markdown = existsSync(file) ? readFileSync(file, 'utf8') : undefined;

const checks = [];
if (existsSync('portal-pruefungen')) {
  for (const name of readdirSync('portal-pruefungen').filter((n) => n.endsWith('.json')).sort()) {
    try {
      const data = JSON.parse(readFileSync(join('portal-pruefungen', name), 'utf8'));
      checks.push(...(Array.isArray(data) ? data : [data]));
    } catch (err) {
      fail(`portal-pruefungen/${name} ist kein gültiges JSON: ${err.message}`);
    }
  }
}
if (!markdown && !checks.length) fail(`Weder ${file} noch portal-pruefungen/*.json gefunden.`);
const res = await fetch(`${portalUrl}/api/seo/changelog`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ ...(markdown ? { markdown } : {}), checks, publish, dryRun }),
});
const body = await res.json().catch(() => ({}));
if (!res.ok) fail(`${res.status} ${body.error ?? res.statusText}`);

const line = (e) => `  ${e.date ?? ''} [${e.area}] ${e.change}${e.status ? ` (${e.status})` : ''}`;
console.log(`${dryRun ? 'PROBELAUF für' : 'Übertragen an'} Portal von ${body.customer}`);
console.log(`Neu: ${body.created.length}, aktualisiert: ${body.updated.length}, entfernt (erledigte offene Punkte): ${body.removed.length}, unverändert: ${body.unchanged}`);
if (body.created.length) {
  console.log('\nNeu:');
  for (const e of body.created) console.log(`${line(e)}${e.published ? '' : '  [nicht sichtbar]'}`);
}
if (body.updated.length) {
  console.log('\nAktualisiert:');
  body.updated.forEach((e) => console.log(line(e)));
}
if (body.removed.length) {
  console.log('\nEntfernt:');
  body.removed.forEach((e) => console.log(line(e)));
}
const ck = body.checks ?? { created: [], updated: 0, unchanged: 0 };
console.log(`\nPrüfungen: neu ${ck.created.length}, aktualisiert ${ck.updated}, unverändert ${ck.unchanged}`);
for (const c of ck.created) console.log(`  ${c.date} ${c.title}${c.published ? '' : '  [nicht sichtbar]'}`);
if (body.held?.length) {
  console.log('\nZurückgehalten (sieht nach Interna aus, im Admin prüfen und ggf. freigeben):');
  for (const h of body.held) console.log(`  ${h}`);
}
for (const w of body.warnings ?? []) console.log(`\nHinweis: ${w}`);
