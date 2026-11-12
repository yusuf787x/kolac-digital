/**
 * Websites der Betriebe pruefen: Handy-Ansicht, HTTPS, Copyright-Jahr,
 * Online-Buchung, Baukasten, Antwortzeit, Instagram-Profil. Kostenlos.
 *
 *   NODE_OPTIONS=--conditions=react-server npx tsx scripts/outreach/scan.mts [--alle] [--full <id,id>]
 *
 * --alle   auch schon gepruefte Betriebe neu pruefen
 * --full   zusaetzlich den kompletten SEO-Check mit Google-Daten fuer diese
 *          IDs (DataForSEO, ca. 2 Cent pro Betrieb)
 */
import { detectPlatform, parsePage } from '../../lib/seo-check/html.ts';
import { safeFetch } from '../../lib/seo-check/safe-fetch.ts';
import { loadEnv, loadLeads, saveLeads, type Lead, type LeadScan } from './store.mts';

const args = process.argv.slice(2);
const all = args.includes('--alle');
const fullIdx = args.indexOf('--full');
const fullIds = new Set(fullIdx >= 0 ? (args[fullIdx + 1] ?? '').split(',').filter(Boolean) : []);

const BOOKING: [RegExp, string][] = [
  [/treatwell\./i, 'Treatwell'],
  [/shore\.com|shore-booking/i, 'Shore'],
  [/planity\./i, 'Planity'],
  [/salonized\./i, 'Salonized'],
  [/timify\./i, 'Timify'],
  [/studiobookr\./i, 'Studiobookr'],
  [/booksy\./i, 'Booksy'],
  [/fresha\./i, 'Fresha'],
  [/calendly\./i, 'Calendly'],
  [/doctolib\./i, 'Doctolib'],
  [/etermin\./i, 'eTermin'],
  [/simplybook\./i, 'SimplyBook'],
  [/terminland\./i, 'Terminland'],
  [/phorest\./i, 'Phorest'],
  [/bookingkit|termin-direkt|setmore\./i, 'Online-Buchung'],
];
const IG_SKIP = new Set(['p', 'reel', 'reels', 'explore', 'stories', 'accounts', 'tv', 'share', 'instagram']);

function instagramHandle(html: string): string | undefined {
  for (const m of html.matchAll(/instagram\.com\/([A-Za-z0-9_.]{2,30})/gi)) {
    const h = m[1].replace(/\.$/, '');
    if (!IG_SKIP.has(h.toLowerCase())) return h;
  }
  return undefined;
}

function copyrightYear(text: string): number | undefined {
  const years = [...text.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(20\d{2})/gi)].map((m) => Number(m[1]));
  return years.length ? Math.max(...years) : undefined;
}

async function quickScan(lead: Lead): Promise<LeadScan> {
  const at = new Date().toISOString();
  if (!lead.website) {
    return { at, ok: false, error: 'keine Website', findings: ['Keine eigene Website, nur Google- oder Instagram-Profil'], priority: 7 };
  }
  // Google verlinkt manchmal nur einen Verzeichnis-Eintrag: tiefer Pfad und kein Namensteil in der Domain
  const u = new URL(lead.website);
  const tokens = lead.name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !['beauty', 'kosmetik', 'studio', 'bielefeld', 'salon'].includes(t));
  if (u.pathname.replace(/\/$/, '').length > 1 && !tokens.some((t) => u.hostname.includes(t))) {
    return {
      at,
      ok: false,
      error: 'fremder Eintrag',
      findings: [`Keine eigene Website, Google verlinkt nur auf einen Eintrag bei ${u.hostname.replace(/^www\./, '')}`],
      priority: 7,
    };
  }
  try {
    const res = await safeFetch(lead.website, { timeoutMs: 15_000, maxBytes: 2_000_000 });
    if (res.status >= 400) {
      // 403/429 heisst meist nur "keine automatischen Abrufe", ein 5xx kann voruebergehend sein.
      // In beiden Faellen nichts behaupten, Yusuf schaut selbst.
      return { at, ok: false, error: `selbst ansehen (Antwort ${res.status} bei der automatischen Prüfung)`, findings: [], priority: 0 };
    }
    const html = res.body;
    const page = parsePage(html, res.finalUrl);
    const platform = detectPlatform(html, page, res.headers);
    const https = res.finalUrl.startsWith('https://');
    const year = copyrightYear(html);

    // Buchung, Formular und Telefon liegen oft auf einer Unterseite: bis zu 3 passende mitpruefen
    const subUrls = page.internalLinks.filter((u) => /termin|buch|booking|kontakt|contact|reserv|preis/i.test(u)).slice(0, 3);
    const subs = await Promise.all(
      subUrls.map((u) =>
        safeFetch(u, { timeoutMs: 8000, maxBytes: 1_000_000 })
          .then((r) => (r.status < 400 ? { html: r.body, page: parsePage(r.body, r.finalUrl) } : null))
          .catch(() => null),
      ),
    );
    const pages = [{ html, page }, ...subs.filter((s): s is { html: string; page: typeof page } => !!s)];
    const booking =
      pages.map((p) => BOOKING.find(([re]) => re.test(p.html))?.[1]).find(Boolean) ??
      (pages.some((p) => /online\s*(termin|buchen)|termin\s*(online\s*)?buchen|jetzt\s*buchen/i.test(p.page.text)) ? 'Online-Buchung' : undefined);
    const anyForm = pages.some((p) => p.page.hasForm);
    const anyTel = pages.some((p) => p.page.telLinks.length > 0);
    const thisYear = new Date().getFullYear();

    const findings: string[] = [];
    let priority = 0;
    if (!page.viewport) {
      findings.push('Seite ist nicht fürs Handy gemacht, man muss zoomen');
      priority += 4;
    }
    if (!https) {
      findings.push('Browser zeigt „Nicht sicher“ an (kein HTTPS)');
      priority += 3;
    }
    if (!booking) {
      findings.push('Keine Online-Buchung, man muss anrufen oder schreiben');
      priority += 2;
    }
    if (year && year <= thisYear - 3) {
      findings.push(`Im Fuß steht noch © ${year}, wirkt nicht gepflegt`);
      priority += 2;
    }
    if (platform && /Jimdo|IONOS|Wix|Joomla/.test(platform)) {
      findings.push(`Gebaut mit ${platform}, oft langsam und schwer bei Google zu finden`);
      priority += 1;
    }
    if (res.ms > 2000) {
      findings.push(`Server braucht ${(res.ms / 1000).toFixed(1).replace('.', ',')} Sekunden bis zur ersten Antwort`);
      priority += 1;
    }
    if (!page.description) {
      findings.push('Kein Beschreibungstext für Google hinterlegt');
      priority += 1;
    }
    if (!anyForm && !booking && !anyTel) {
      findings.push('Kein Kontaktformular und keine anklickbare Telefonnummer');
      priority += 1;
    }
    if (!lead.instagram) lead.instagram = instagramHandle(html);

    return {
      at,
      ok: true,
      finalUrl: res.finalUrl,
      https,
      viewport: page.viewport,
      platform,
      copyrightYear: year,
      booking,
      hasForm: anyForm,
      responseMs: res.ms,
      title: page.title,
      findings,
      priority: Math.min(10, priority),
    };
  } catch (err) {
    return { at, ok: false, error: (err as Error).message, findings: ['Website lädt nicht oder bricht ab'], priority: 8 };
  }
}

const leads = loadLeads();
const todo = leads.filter((l) => l.status !== 'ausgeschlossen' && (all || !l.scan || fullIds.has(l.id)));
let n = 0;
// 4 gleichzeitig: schnell genug, ohne fremde Server zu belasten
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (todo.length) {
      const lead = todo.shift()!;
      lead.scan = await quickScan(lead);
      n++;
      process.stdout.write(`\r${n} geprüft`);
    }
  }),
);
process.stdout.write('\n');

if (fullIds.size) {
  loadEnv(['DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD', 'PAGESPEED_API_KEY']);
  const { runSeoCheck } = await import('../../lib/seo-check/run.ts');
  for (const lead of leads.filter((l) => fullIds.has(l.id) && l.website && l.scan)) {
    try {
      const r = await runSeoCheck(lead.website!);
      lead.scan!.seoScore = r.score;
      lead.scan!.top10 = r.rankings.available ? r.rankings.top10 : undefined;
      if (r.rankings.available && r.rankings.top10 === 0) {
        lead.scan!.findings.unshift('Bei Google für keinen einzigen Suchbegriff auf Seite 1');
      }
      console.log(`${lead.name}: SEO-Check ${r.score}/100, Seite-1-Begriffe ${r.rankings.top10 ?? '?'}`);
    } catch (err) {
      console.log(`${lead.name}: SEO-Check fehlgeschlagen (${(err as Error).message})`);
    }
  }
}

saveLeads(leads);
const scanned = leads.filter((l) => l.scan);
console.log(
  `Fertig. ${scanned.length} geprüft, ${scanned.filter((l) => l.scan!.priority >= 4).length} mit deutlichem Handlungsbedarf, ` +
    `${leads.filter((l) => l.instagram).length} mit Instagram-Profil.`,
);
