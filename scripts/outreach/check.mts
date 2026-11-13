/**
 * Die ersten N Betriebe der Dashboard-Liste „Schreiben“ gruendlich pruefen und neu texten.
 *
 *   node scripts/outreach/sync.mjs pull
 *   NODE_OPTIONS=--conditions=react-server npx tsx scripts/outreach/check.mts [--top 20] [--ab 0] [--probe]
 *   node scripts/outreach/sync.mjs push && node scripts/outreach/sync.mjs pull
 *
 * Je Betrieb:
 * 1. Instagram nur behalten, wenn Yusuf es eingetragen hat oder die Website des
 *    Betriebs genau dieses Profil verlinkt. Verlinkt sie ein anderes, gilt das.
 *    Sonst wie „Kein Instagram“: Ansprache per Mail (direkt per API, Aktion "instagram").
 * 2. SEO-Check mit Google-Daten (lib/seo-check, ca. 2 Cent): Punktzahl, Ladezeit,
 *    Platzierungen, HTTPS richtig geprueft. Die Funde ersetzen die grobe Schaetzung.
 * 3. DM und Nachfassen neu schreiben (nur wenn Instagram bleibt).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { draftCost, DraftSkip, generateDraft } from '../../lib/outreach-draft.ts';
import type { OutreachLead } from '../../lib/outreach.ts';
import { branchOf, type Branch } from '../../lib/outreach-playbook.ts';
import { parsePage } from '../../lib/seo-check/html.ts';
import { safeFetch } from '../../lib/seo-check/safe-fetch.ts';
import type { SeoCheckResult } from '../../lib/seo-check/types.ts';
import { loadEnv, loadLeads, saveLeads, type Lead } from './store.mts';

const args = process.argv.slice(2);
const flag = (n: string) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};
const top = Number(flag('--top') ?? 20);
const from = Number(flag('--ab') ?? 0);
const probe = args.includes('--probe');

// Gleiche Reihenfolge wie die Ansicht „Schreiben“ im Dashboard
const HIGH_TICKET = new Set<Branch>(['kueche', 'bad', 'galabau', 'tischlerei', 'ausbau', 'hochzeitslocation', 'brautmode', 'aufbereitung', 'kfz', 'juwelier', 'aesthetik']);
const inSchreiben = (l: Lead) => l.status === 'neu' && l.channel !== 'mail' && (!!l.dm || (!!l.bedarf && !!l.instagram));
const rank = (l: Lead) => (l.dm ? 100 : 0) + (HIGH_TICKET.has(branchOf(l as never)) ? 50 : 0) + (l.instagram ? 20 : 0) + (l.scan?.priority ?? 0);

const leads = loadLeads();
const list = leads.filter(inSchreiben).sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name, 'de'));
const todo = list.slice(from, from + top);
console.log(`${todo.length} Betriebe: ${todo.map((l) => l.name).join(' · ')}`);
if (probe) process.exit(0);

loadEnv(['ANTHROPIC_API_KEY', 'DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD', 'PAGESPEED_API_KEY', 'KOLAC_PORTAL_TOKEN']);
const { runSeoCheck } = await import('../../lib/seo-check/run.ts');

// --- Instagram von der Website ---
const IG_SKIP = new Set(['p', 'reel', 'reels', 'explore', 'stories', 'accounts', 'tv', 'share', 'instagram', 'wix', 'legal', 'jimdo', 'ionos', 'strato', 'squarespace', 'wordpress', 'shopify', 'about', 'help', 'developer', 'popular']);
const handlesIn = (html: string) =>
  [...html.matchAll(/instagram\.com\/([A-Za-z0-9_.]{2,30})/gi)]
    .map((m) => m[1].replace(/\.$/, ''))
    .filter((h) => !IG_SKIP.has(h.toLowerCase()) && !/\.(php|js|css|html?)$/i.test(h));

const httpsFirst = async (url: string, timeoutMs = 12_000) => {
  const s = url.replace(/^http:\/\//i, 'https://');
  if (s !== url) {
    try {
      const r = await safeFetch(s, { timeoutMs, maxBytes: 2_000_000 });
      if (r.status < 400) return r;
    } catch {
      /* dann http */
    }
  }
  return safeFetch(url, { timeoutMs, maxBytes: 2_000_000 });
};

async function websiteHandles(url: string): Promise<{ handles: string[]; finalUrl?: string }> {
  try {
    const home = await httpsFirst(url);
    if (home.status >= 400) return { handles: [] };
    const page = parsePage(home.body, home.finalUrl);
    const subs = page.internalLinks.filter((u) => /kontakt|contact|impressum|about|ueber|über|team|social/i.test(u)).slice(0, 3);
    const bodies = await Promise.all(subs.map((u) => safeFetch(u, { timeoutMs: 8000, maxBytes: 1_000_000 }).then((r) => r.body).catch(() => '')));
    return { handles: [...new Set([home.body, ...bodies].flatMap(handlesIn))], finalUrl: home.finalUrl };
  } catch {
    return { handles: [] };
  }
}

// --- Funde aus dem SEO-Check, wichtigster zuerst ---
function findingsFrom(r: SeoCheckResult, lead: Lead): string[] {
  const st = (id: string) => r.checks.find((c) => c.id === id)?.status;
  const out: string[] = [];
  if (st('https') === 'fail') out.push('Browser zeigt „Nicht sicher“ an (kein HTTPS)');
  if (st('viewport') === 'fail') out.push('Seite ist nicht fürs Handy gemacht, man muss zoomen');
  const ps = r.pagespeed;
  if (ps.available && typeof ps.score === 'number' && ps.score < 50) {
    const lcp = typeof ps.lcpSeconds === 'number' && ps.lcpSeconds >= 4 ? `, Hauptinhalt erst nach ${ps.lcpSeconds.toFixed(1).replace('.', ',')} Sekunden` : '';
    out.push(`Google bewertet die Ladezeit am Handy mit ${ps.score} von 100${lcp}`);
  }
  if (r.rankings.available && r.rankings.top10 === 0) out.push('Bei Google für keinen einzigen Suchbegriff auf Seite 1');
  if (lead.scan?.ok && !lead.scan.booking) out.push('Keine Online-Buchung, man muss anrufen oder schreiben');
  if (st('city-title') === 'fail') out.push('Der Ort steht nicht im Seitentitel, bei Suchen mit Ort schwer zu finden');
  if (st('description') === 'fail') out.push('Kein Beschreibungstext für Google hinterlegt');
  if (st('phone') === 'fail') out.push('Keine anklickbare Telefonnummer');
  if (st('words') === 'fail') out.push('Sehr wenig Text, Google erkennt kaum, was angeboten wird');
  if (st('broken') === 'fail') out.push('Links auf der Seite führen ins Leere');
  const year = lead.scan?.copyrightYear;
  if (year && year <= new Date().getFullYear() - 3) out.push(`Im Fuß steht noch © ${year}, wirkt nicht gepflegt`);
  return out;
}

// --- Dashboard-API fuer Instagram-Korrekturen ---
const portalUrl = String(JSON.parse(readFileSync(join(process.cwd(), '.kolac-portal.json'), 'utf8')).portalUrl ?? '').replace(/\/$/, '');
async function setInstagram(updates: { id: string; instagram: string | null }[]) {
  if (!updates.length) return 0;
  const res = await fetch(`${portalUrl}/api/outreach/agent`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.KOLAC_PORTAL_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'instagram', updates }),
  });
  const json = (await res.json().catch(() => ({}))) as { changed?: number; error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.changed ?? 0;
}

const igUpdates: { id: string; instagram: string | null }[] = [];
const report: string[] = [];
let cost = 0;
const queue = [...todo];

async function one(lead: Lead) {
  const notes: string[] = [];
  // 1. Instagram
  if (lead.website && lead.instagram && lead.igSource !== 'dashboard') {
    const { handles } = await websiteHandles(lead.website);
    const same = handles.find((h) => h.toLowerCase() === lead.instagram!.toLowerCase());
    if (same) {
      lead.igSource = 'website';
      notes.push(`Instagram @${lead.instagram} auf der Website bestätigt`);
    } else if (handles.length) {
      notes.push(`Instagram @${lead.instagram} → @${handles[0]} (so auf der Website verlinkt)`);
      lead.instagram = handles[0];
      lead.igSource = 'website';
      delete lead.ig;
      igUpdates.push({ id: lead.id, instagram: handles[0] });
    } else {
      notes.push(`Instagram @${lead.instagram} nicht auf der Website, raus → per Mail`);
      igUpdates.push({ id: lead.id, instagram: null });
      lead.igRejected = lead.instagram;
      delete lead.instagram;
      delete lead.ig;
      delete lead.dm;
      delete lead.followup;
    }
  } else if (!lead.website && lead.instagram && lead.igSource === 'suche') {
    // Ohne Website laesst sich nichts gegenpruefen: lieber raus
    notes.push(`Instagram @${lead.instagram} nur aus der Google-Suche, ohne Website nicht prüfbar, raus → per Mail`);
    igUpdates.push({ id: lead.id, instagram: null });
    lead.igRejected = lead.instagram;
    delete lead.instagram;
    delete lead.ig;
    delete lead.dm;
    delete lead.followup;
  }

  // 2. SEO-Check
  if (lead.website && lead.scan) {
    try {
      const url = lead.scan.finalUrl ?? lead.website;
      const r = await runSeoCheck(url.replace(/^http:\/\//i, 'https://')).catch(() => runSeoCheck(url));
      lead.scan.seoScore = r.score;
      lead.scan.top10 = r.rankings.available ? r.rankings.top10 : undefined;
      lead.scan.https = r.checks.find((c) => c.id === 'https')?.status !== 'fail';
      lead.scan.findings = findingsFrom(r, lead);
      notes.push(`SEO-Check ${r.score}/100${r.pagespeed.score !== undefined ? `, Ladezeit Handy ${r.pagespeed.score}` : ''}${lead.scan.top10 !== undefined ? `, Seite 1: ${lead.scan.top10}` : ''}`);
    } catch (err) {
      notes.push(`SEO-Check fehlgeschlagen (${(err as Error).message}), alte Funde ohne „Nicht sicher“`);
      lead.scan.findings = lead.scan.findings.filter((f) => !/Nicht sicher|HTTPS/i.test(f));
    }
  }

  // 3. Text
  if (lead.instagram) {
    try {
      const d = await generateDraft(lead as unknown as OutreachLead);
      lead.dm = d.dm;
      lead.followup = d.followup;
      cost += draftCost(d.usage);
      notes.push(`Text neu (${d.dm.length} Zeichen${d.warnings.length ? `, ${d.warnings.join('; ')}` : ''})`);
    } catch (err) {
      notes.push(err instanceof DraftSkip ? `übersprungen: ${err.message}` : `Text fehlgeschlagen: ${(err as Error).message}`);
    }
  }
  report.push(`${lead.name} (${lead.city ?? '?'}): ${notes.join(' | ')}`);
}

await Promise.all(
  Array.from({ length: 3 }, async () => {
    while (queue.length) await one(queue.shift()!);
  }),
);
saveLeads(leads);
const changed = await setInstagram(igUpdates);
console.log(report.join('\n'));
console.log(`\nInstagram im Dashboard geändert: ${changed}. Texte: ${cost.toFixed(2)} $ (+ SEO-Check ca. ${(todo.length * 0.02).toFixed(2)} $). Jetzt: sync.mjs push, dann pull.`);
