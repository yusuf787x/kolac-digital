import {
  expectedCtr,
  clickPotential,
  makeBrandMatcher,
  compileGroups,
  matchGroups,
  sumRows,
  countBuckets,
  buildKeywordRows,
  pickMovers,
  findOpportunities,
  sumGroups,
  pctChange,
  UNGROUPED_ID,
} from '../seo/analysis';
import { parseChangelogMarkdown, entryKey } from '../seo/changelog-markdown';
import { addMonths, monthRange, lastCompleteMonths } from '../seo/months';
import type { SeoRow } from '../seo/types';
import { readFileSync } from 'node:fs';

// Ausfuehren: npx tsx lib/__tests__/seo-analysis.test.ts

let failed = 0;
const check = (label: string, ok: boolean, detail?: unknown) => {
  if (!ok) failed++;
  console.log(label.padEnd(52), ok ? 'OK' : `FEHLER ${detail ?? ''}`);
};
const row = (key: string, clicks: number, impressions: number, position: number): SeoRow => ({
  key,
  clicks,
  impressions,
  ctr: impressions ? clicks / impressions : 0,
  position,
});

console.log('--- Monate ---');
check('addMonths ueber Jahresgrenze', addMonths('2026-01', -1) === '2025-12');
check('monthRange Februar Schaltjahr', monthRange('2028-02').end === '2028-02-29');
check(
  'letzte 16 Monate ab 30.10.2026',
  (() => {
    const m = lastCompleteMonths(16, new Date('2026-10-30T12:00:00Z'));
    return m[0] === '2026-09' && m[15] === '2025-06' && m.length === 16;
  })(),
);

console.log('\n--- CTR-Kurve ---');
check('Platz 1 = 28 %', expectedCtr(1) === 0.28);
check('Platz 3 = 10 %', expectedCtr(3) === 0.1);
check('Platz 3,5 interpoliert', Math.abs(expectedCtr(3.5) - 0.085) < 1e-9);
check('Platz 40 = Restwert', expectedCtr(40) === 0.003);
check('Potenzial 1000 Impr, 20 Klicks = 80', clickPotential({ impressions: 1000, clicks: 20 }) === 80);
check('Potenzial nie negativ', clickPotential({ impressions: 100, clicks: 50 }) === 0);

console.log('\n--- Marke ---');
const isBrand = makeBrandMatcher(['motorenfachmann']);
check('"motoren fachmann lage" ist Marke', isBrand('motoren fachmann lage'));
check('"Motorenfachmann.de" ist Marke', isBrand('Motorenfachmann.de'));
check('"motorinstandsetzung" ist keine Marke', !isBrand('motorinstandsetzung'));
check('leere Markenliste matcht nichts', !makeBrandMatcher([])('irgendwas'));

console.log('\n--- Gruppen ---');
const groups = compileGroups([
  { id: 'codes', name: 'Motorcodes', patterns: ['\\b(n47|om651|ea189)\\b'] },
  { id: 'staedte', name: 'Städte', patterns: ['münchen|muenchen', 'bielefeld'] },
  { id: 'kaputt', name: 'Kaputt', patterns: ['(ungueltig'] },
]);
check('N47 in Motorcodes', matchGroups('BMW N47 Steuerkette', groups).includes('codes'));
check('"muenchen" trifft "münchen"', matchGroups('austauschmotor münchen', groups).includes('staedte'));
check('mehrere Gruppen gleichzeitig', matchGroups('om651 bielefeld', groups).length === 2);
check('ungueltiger Ausdruck wird ignoriert', compileGroups([{ id: 'x', name: 'x', patterns: ['('] }])[0].regexes.length === 0);
const gs = sumGroups([row('n47 kette', 5, 100, 4), row('xyz', 1, 10, 30)], groups);
check('Gruppensumme Motorcodes', gs.codes.clicks === 5);
check('ohne Gruppe gesammelt', gs[UNGROUPED_ID].impressions === 10);

console.log('\n--- Summen, Verteilung ---');
const s = sumRows([row('a', 10, 100, 2), row('b', 0, 300, 10)]);
check('Klicks summiert', s.clicks === 10);
check('Position nach Impressionen gewichtet', s.position === 8);
const b = countBuckets([row('a', 0, 1, 1.4), row('b', 0, 1, 3.6), row('c', 0, 1, 15), row('d', 0, 1, 33), row('e', 0, 0, 2)]);
check('Buckets 1/1/1/1, ohne Impression ignoriert', b.top3 === 1 && b.top10 === 1 && b.top20 === 1 && b.rest === 1);
check('pctChange 120 vs 100 = +20 %', Math.abs((pctChange(120, 100) ?? 0) - 0.2) < 1e-9);
check('pctChange gegen 0 = null', pctChange(5, 0) === null);

console.log('\n--- Gewinner, Chancen ---');
const prev = [row('n47 steuerkette', 3, 200, 9), row('austauschmotor', 10, 500, 5), row('weg', 6, 50, 4)];
const cur = [row('n47 steuerkette', 15, 260, 4), row('austauschmotor', 4, 480, 8.2), row('motorenfachmann', 50, 80, 1)];
const kw = buildKeywordRows(cur, prev, isBrand, groups);
const mv = pickMovers(kw, prev);
check('Positionsgewinner n47', mv.positionWinners[0]?.query === 'n47 steuerkette');
check('Positionsverlierer austauschmotor', mv.positionLosers[0]?.query === 'austauschmotor');
check('verschwundenes Keyword ist Klick-Verlierer', mv.clickLosers.some((r) => r.query === 'weg'));
check('neues Keyword ohne Vormonatsposition', kw.find((k) => k.query === 'motorenfachmann')?.prevPosition === null);
const opp = findOpportunities(kw);
check('Chance austauschmotor (Platz 8, 480 Impr.)', opp[0]?.query === 'austauschmotor' && opp[0].potential === 44, opp[0]?.potential);
check('Marke ist keine Chance', !opp.some((o) => o.query === 'motorenfachmann'));

console.log('\n--- Changelog-Import ---');
const md = `# Änderungsprotokoll

## 28.10.2026

### Sicherheit

| Status | Änderung | Nutzen |
|---|---|---|
| ✅ | Passwort neu gesetzt | Kein fremder Zugriff |
| 🟡 | Sitemap angelegt | Google findet alles |

### Inhalte

| Status | Änderung | Wo |
|---|---|---|
| ✅ | **Gewährleistung** auf 24 Monate | 26 Seiten |

## Offene Punkte

- [ ] **Formulare:** Testanfrage schicken
- [x] **E-Mail:** SPF prüfen
`;
const parsed = parseChangelogMarkdown(md, { fallbackDate: '2026-10-30' });
check('5 Eintraege erkannt', parsed.entries.length === 5, parsed.entries.length);
const sitemap = parsed.entries.find((e) => e.change === 'Sitemap angelegt');
check('🟡 = vorbereitet', sitemap?.status === 'prepared');
check('Spalte "Wo" landet in scope', parsed.entries.find((e) => e.scope === '26 Seiten')?.area === 'Inhalte');
const open = parsed.entries.find((e) => e.change === 'Testanfrage schicken');
check('offener Punkt geplant mit Bereich', open?.status === 'planned' && open.area === 'Formulare');
check('erledigter offener Punkt = done', parsed.entries.find((e) => e.area === 'E-Mail')?.status === 'done');
check(
  'Statuswechsel aendert Schluessel nicht',
  sitemap !== undefined && entryKey({ ...sitemap, status: 'done' }) === sitemap.key,
);

if (process.env.CHANGELOG_FILE) {
  const real = parseChangelogMarkdown(readFileSync(process.env.CHANGELOG_FILE, 'utf8'), {
    fallbackDate: '2026-10-30',
  });
  console.log(`\nEchtes Protokoll: ${real.entries.length} Eintraege`);
  for (const e of real.entries) {
    console.log(`  ${e.date} ${e.status.padEnd(8)} [${e.area}] ${e.change.slice(0, 60)}`);
  }
}

console.log(failed ? `\n${failed} FEHLER` : '\nAlle Pruefungen OK');
if (failed) process.exit(1);
